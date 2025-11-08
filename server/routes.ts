import express from "express";
import multer from "multer";
import { generateMealSuggestions, provideCookingAssistance, extractRecipeFromUrl, extractRecipeFromImage } from "./openai";
import { storage } from "./storage";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Optional authentication middleware - allows through even without auth
const optionalAuth: express.RequestHandler = async (req, res, next) => {
  // If Replit Auth is configured, use it
  if (process.env.REPLIT_DOMAINS && process.env.REPL_ID) {
    try {
      const { isAuthenticated } = await import("./replitAuth.js");
      return isAuthenticated(req, res, next);
    } catch (error) {
      // If auth fails, continue as anonymous user
      console.warn("Auth check failed, continuing as anonymous");
      return next();
    }
  }
  // No auth configured, allow through
  next();
};

// Utility to get user ID from request
function getUserId(req: express.Request): string {
  const user = req.user as any;
  return user?.claims?.sub || user?.id || 'anonymous';
}

// Helper to check resource ownership
async function checkOwnership(resourceUserId: string, requestUserId: string, res: express.Response): Promise<boolean> {
  if (resourceUserId !== requestUserId) {
    res.status(403).json({ error: "Access denied" });
    return false;
  }
  return true;
}

// API Health check
router.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    node: process.version,
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    env: process.env.NODE_ENV || "unknown",
    ts: Date.now(),
  });
});

// Get current authenticated user
router.get("/api/auth/user", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.json({ user: null });
    }

    const user = req.user as any;
    const userId = user?.claims?.sub || user?.id;

    if (!userId) {
      return res.json({ user: null });
    }

    const dbUser = await storage.getUser(userId);
    res.json({ user: dbUser });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ========== RECIPE ENDPOINTS ==========

// Get all recipes for authenticated user
router.get("/api/recipes", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const recipes = await storage.getRecipesByUser(userId);

    // Fetch ingredients and steps for each recipe
    const recipesWithDetails = await Promise.all(
      recipes.map(async (recipe) => {
        const [ingredients, steps] = await Promise.all([
          storage.getIngredientsByRecipe(recipe.id),
          storage.getStepsByRecipe(recipe.id),
        ]);
        return { ...recipe, ingredients, steps };
      })
    );

    res.json(recipesWithDetails);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// Get single recipe by ID
router.get("/api/recipes/:id", optionalAuth, async (req, res) => {
  try {
    const recipe = await storage.getRecipe(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const [ingredients, steps] = await Promise.all([
      storage.getIngredientsByRecipe(recipe.id),
      storage.getStepsByRecipe(recipe.id),
    ]);

    res.json({ ...recipe, ingredients, steps });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

// Create new recipe
router.post("/api/recipes", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, description, imageUrl, servings, prepMinutes, cookMinutes, sourceUrl, ingredients, steps } = req.body;

    const recipe = await storage.createRecipe({
      userId,
      title,
      description,
      imageUrl,
      servings,
      prepMinutes,
      cookMinutes,
      sourceUrl,
    });

    // Create ingredients and steps
    if (ingredients && Array.isArray(ingredients)) {
      await Promise.all(
        ingredients.map((ing: any, index: number) =>
          storage.createIngredient({
            recipeId: recipe.id,
            raw: ing.raw || ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            item: ing.item,
            notes: ing.notes,
            aisle: ing.aisle,
          })
        )
      );
    }

    if (steps && Array.isArray(steps)) {
      await Promise.all(
        steps.map((step: any, index: number) =>
          storage.createStep({
            recipeId: recipe.id,
            position: step.position ?? index + 1,
            text: step.text,
          })
        )
      );
    }

    // Fetch complete recipe with ingredients and steps
    const [recipeIngredients, recipeSteps] = await Promise.all([
      storage.getIngredientsByRecipe(recipe.id),
      storage.getStepsByRecipe(recipe.id),
    ]);

    res.status(201).json({ ...recipe, ingredients: recipeIngredients, steps: recipeSteps });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

// Update recipe
router.put("/api/recipes/:id", optionalAuth, async (req, res) => {
  try {
    const { title, description, imageUrl, servings, prepMinutes, cookMinutes, sourceUrl, ingredients, steps } = req.body;

    const updatedRecipe = await storage.updateRecipe(req.params.id, {
      title,
      description,
      imageUrl,
      servings,
      prepMinutes,
      cookMinutes,
      sourceUrl,
    });

    // Update ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      // Delete existing ingredients
      const existingIngredients = await storage.getIngredientsByRecipe(req.params.id);
      await Promise.all(existingIngredients.map((ing) => storage.deleteIngredient(ing.id)));

      // Create new ingredients
      await Promise.all(
        ingredients.map((ing: any) =>
          storage.createIngredient({
            recipeId: req.params.id,
            raw: ing.raw || ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            item: ing.item,
            notes: ing.notes,
            aisle: ing.aisle,
          })
        )
      );
    }

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      const existingSteps = await storage.getStepsByRecipe(req.params.id);
      await Promise.all(existingSteps.map((step) => storage.deleteStep(step.id)));

      // Create new steps
      await Promise.all(
        steps.map((step: any, index: number) =>
          storage.createStep({
            recipeId: req.params.id,
            position: step.position ?? index + 1,
            text: step.text,
          })
        )
      );
    }

    // Fetch complete recipe
    const [recipeIngredients, recipeSteps] = await Promise.all([
      storage.getIngredientsByRecipe(req.params.id),
      storage.getStepsByRecipe(req.params.id),
    ]);

    res.json({ ...updatedRecipe, ingredients: recipeIngredients, steps: recipeSteps });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({ error: "Failed to update recipe" });
  }
});

// Delete recipe
router.delete("/api/recipes/:id", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const recipe = await storage.getRecipe(req.params.id);

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    if (!await checkOwnership(recipe.userId, userId, res)) {
      return;
    }

    await storage.deleteRecipe(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

// Import recipe from URL
router.post("/api/recipes/import/url", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const extractedRecipe = await extractRecipeFromUrl(url);

    // Create recipe in database
    const recipe = await storage.createRecipe({
      userId,
      title: extractedRecipe.title,
      description: extractedRecipe.description,
      imageUrl: extractedRecipe.imageUrl,
      servings: extractedRecipe.servings,
      prepMinutes: extractedRecipe.prepMinutes,
      cookMinutes: extractedRecipe.cookMinutes,
      sourceUrl: url,
    });

    // Create ingredients and steps
    if (extractedRecipe.ingredients) {
      await Promise.all(
        extractedRecipe.ingredients.map((ing: any) =>
          storage.createIngredient({
            recipeId: recipe.id,
            raw: ing.raw || ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            item: ing.item,
            notes: ing.notes,
            aisle: ing.aisle,
          })
        )
      );
    }

    if (extractedRecipe.steps) {
      await Promise.all(
        extractedRecipe.steps.map((step: any, index: number) =>
          storage.createStep({
            recipeId: recipe.id,
            position: index + 1,
            text: step.text || step,
          })
        )
      );
    }

    // Fetch complete recipe
    const [ingredients, steps] = await Promise.all([
      storage.getIngredientsByRecipe(recipe.id),
      storage.getStepsByRecipe(recipe.id),
    ]);

    res.status(201).json({ ...recipe, ingredients, steps });
  } catch (error) {
    console.error("Error importing recipe from URL:", error);
    res.status(500).json({ error: "Failed to import recipe from URL" });
  }
});

// Import recipe from photo
router.post("/api/recipes/import/photo", optionalAuth, upload.single('image'), async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const extractedRecipe = await extractRecipeFromImage(req.file.buffer);

    // Create recipe in database
    const recipe = await storage.createRecipe({
      userId,
      title: extractedRecipe.title,
      description: extractedRecipe.description,
      imageUrl: extractedRecipe.imageUrl,
      servings: extractedRecipe.servings,
      prepMinutes: extractedRecipe.prepMinutes,
      cookMinutes: extractedRecipe.cookMinutes,
      sourceUrl: extractedRecipe.sourceUrl,
    });

    // Create ingredients and steps
    if (extractedRecipe.ingredients) {
      await Promise.all(
        extractedRecipe.ingredients.map((ing: any) =>
          storage.createIngredient({
            recipeId: recipe.id,
            raw: ing.raw || ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            item: ing.item,
            notes: ing.notes,
            aisle: ing.aisle,
          })
        )
      );
    }

    if (extractedRecipe.steps) {
      await Promise.all(
        extractedRecipe.steps.map((step: any, index: number) =>
          storage.createStep({
            recipeId: recipe.id,
            position: index + 1,
            text: step.text || step,
          })
        )
      );
    }

    // Fetch complete recipe
    const [ingredients, steps] = await Promise.all([
      storage.getIngredientsByRecipe(recipe.id),
      storage.getStepsByRecipe(recipe.id),
    ]);

    res.status(201).json({ ...recipe, ingredients, steps });
  } catch (error) {
    console.error("Error importing recipe from photo:", error);
    res.status(500).json({ error: "Failed to import recipe from photo" });
  }
});

// ========== MEAL PLAN ENDPOINTS ==========

// Get meal plans for a date range
router.get("/api/meal-plans", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const mealPlans = await storage.getMealPlansByUserAndDateRange(
      userId,
      startDate as string,
      endDate as string
    );

    res.json(mealPlans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    res.status(500).json({ error: "Failed to fetch meal plans" });
  }
});

// Create meal plan
router.post("/api/meal-plans", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { recipeId, date, mealSlot, servingsOverride } = req.body;

    const mealPlan = await storage.createMealPlan({
      userId,
      recipeId,
      date,
      mealSlot,
      servingsOverride,
    });

    res.status(201).json(mealPlan);
  } catch (error) {
    console.error("Error creating meal plan:", error);
    res.status(500).json({ error: "Failed to create meal plan" });
  }
});

// Update meal plan
router.put("/api/meal-plans/:id", optionalAuth, async (req, res) => {
  try {
    const { recipeId, date, mealSlot, servingsOverride } = req.body;

    const updatedMealPlan = await storage.updateMealPlan(req.params.id, {
      recipeId,
      date,
      mealSlot,
      servingsOverride,
    });

    res.json(updatedMealPlan);
  } catch (error) {
    console.error("Error updating meal plan:", error);
    res.status(500).json({ error: "Failed to update meal plan" });
  }
});

// Delete meal plan
router.delete("/api/meal-plans/:id", optionalAuth, async (req, res) => {
  try {
    await storage.deleteMealPlan(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json({ error: "Failed to delete meal plan" });
  }
});

// ========== SHOPPING LIST ENDPOINTS ==========

// Get shopping list for a specific week
router.get("/api/shopping-lists/week", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({ error: "weekStart is required" });
    }

    const shoppingList = await storage.getShoppingListByUserAndWeek(userId, weekStart as string);

    if (!shoppingList) {
      return res.json(null);
    }

    const items = await storage.getShoppingListItems(shoppingList.id);
    res.json({ ...shoppingList, items });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    res.status(500).json({ error: "Failed to fetch shopping list" });
  }
});

// Create shopping list
router.post("/api/shopping-lists", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, weekStart } = req.body;

    const shoppingList = await storage.createShoppingList({
      userId,
      title,
      weekStart,
    });

    res.status(201).json(shoppingList);
  } catch (error) {
    console.error("Error creating shopping list:", error);
    res.status(500).json({ error: "Failed to create shopping list" });
  }
});

// Generate shopping list from meal plans
router.post("/api/shopping-lists/generate", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    console.log('[Shopping List Generate] Request body:', JSON.stringify(req.body));
    console.log('[Shopping List Generate] userId:', userId);

    const { weekStart, weekEnd, title } = req.body;
    console.log('[Shopping List Generate] Extracted values:', { weekStart, weekEnd, title });

    if (!weekStart || !weekEnd) {
      console.error('[Shopping List Generate] Missing parameters:', { weekStart, weekEnd });
      return res.status(400).json({ error: "weekStart and weekEnd are required" });
    }

    // Get meal plans for the week
    const mealPlans = await storage.getMealPlansByUserAndDateRange(userId, weekStart, weekEnd);

    // Get unique recipe IDs
    const recipeIds = Array.from(new Set(mealPlans.map(mp => mp.recipeId).filter(Boolean)));

    // Fetch all ingredients for these recipes
    const allIngredients = await Promise.all(
      recipeIds.map(recipeId => storage.getIngredientsByRecipe(recipeId!))
    );

    // Create or get existing shopping list
    let shoppingList = await storage.getShoppingListByUserAndWeek(userId, weekStart);

    if (!shoppingList) {
      shoppingList = await storage.createShoppingList({
        userId,
        title: `Shopping List for ${weekStart}`,
        weekStart,
      });
    }

    // Add ingredients as shopping list items
    const flatIngredients = allIngredients.flat();
    await Promise.all(
      flatIngredients.map(ing =>
        storage.createShoppingListItem({
          listId: shoppingList!.id,
          ingredientId: ing.id,
          item: ing.item,
          quantity: ing.quantity,
          unit: ing.unit,
          aisle: ing.aisle,
          checked: false,
        })
      )
    );

    const items = await storage.getShoppingListItems(shoppingList.id);
    res.json({ ...shoppingList, items });
  } catch (error) {
    console.error("Error generating shopping list:", error);
    res.status(500).json({ error: "Failed to generate shopping list" });
  }
});

// Add item to shopping list
router.post("/api/shopping-lists/items", optionalAuth, async (req, res) => {
  try {
    const { listId, item, quantity, unit, aisle, ingredientId } = req.body;

    const shoppingListItem = await storage.createShoppingListItem({
      listId,
      ingredientId,
      item,
      quantity,
      unit,
      aisle,
      checked: false,
    });

    res.status(201).json(shoppingListItem);
  } catch (error) {
    console.error("Error adding shopping list item:", error);
    res.status(500).json({ error: "Failed to add shopping list item" });
  }
});

// Update shopping list item
router.put("/api/shopping-lists/:listId/items/:itemId", optionalAuth, async (req, res) => {
  try {
    const { item, quantity, unit, aisle, checked } = req.body;

    const updatedItem = await storage.updateShoppingListItem(req.params.itemId, {
      item,
      quantity,
      unit,
      aisle,
      checked,
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating shopping list item:", error);
    res.status(500).json({ error: "Failed to update shopping list item" });
  }
});

// Delete shopping list item
router.delete("/api/shopping-lists/items/:itemId", optionalAuth, async (req, res) => {
  try {
    await storage.deleteShoppingListItem(req.params.itemId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ error: "Failed to delete shopping list item" });
  }
});

// ========== USER PREFERENCES / SETTINGS ENDPOINTS ==========

// Get user preferences
router.get("/api/settings", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const preferences = await storage.getUserPreferences(userId);

    res.json(preferences || {
      userId,
      defaultServings: 4,
      voiceEnabled: true,
      storeMap: {},
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update user preferences
router.put("/api/settings", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { defaultServings, voiceEnabled, storeMappings } = req.body;

    const preferences = await storage.upsertUserPreferences({
      userId,
      defaultServings,
      voiceEnabled,
      storeMap: storeMappings,
    });

    res.json(preferences);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Voice meal planning endpoint
router.post("/api/voice/plan-meal", async (req, res) => {
  try {
    const { transcript, preferences, clientState } = req.body;

    const result = await generateMealSuggestions(transcript, preferences || {});

    // Normalize into reply + actions for the frontend
    const reply = result.response || "Here's your meal plan!";
    const actions: any[] = [];

    if (result.mealPlans) {
      actions.push({ type: "BUILD_CALENDAR", data: result.mealPlans });
    }
    if (result.recipes) {
      actions.push({ type: "ADD_MEALS", data: result.recipes });
      // also generate groceries list
      const groceries = result.recipes.flatMap((r: any) => r.ingredients || []);
      actions.push({ type: "UPDATE_GROCERIES", data: groceries });
    }

    res.json({ reply, actions });
  } catch (e: any) {
    console.error("plan-meal error:", e);
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

// Voice cooking assistance endpoint
router.post("/api/voice/cooking-assistance", async (req, res) => {
  try {
    const { question, recipeContext, currentStep } = req.body;
    const result = await provideCookingAssistance(
      question,
      recipeContext,
      currentStep,
    );

    const reply = result.response || "Here's some cooking advice.";
    res.json({ reply, actions: [] });
  } catch (e: any) {
    console.error("cooking-assistance error:", e);
    res.status(500).json({ error: "Failed to provide cooking assistance" });
  }
});

export default router;
