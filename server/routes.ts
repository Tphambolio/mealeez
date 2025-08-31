import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { 
  insertRecipeSchema, 
  insertIngredientSchema, 
  insertStepSchema,
  insertMealPlanSchema,
  insertShoppingListSchema,
  insertShoppingListItemSchema,
  insertUserPreferencesSchema,
  insertCollaborationGroupSchema,
  insertGroupMemberSchema
} from "@shared/schema";
import { 
  analyzeRecipeFromUrl, 
  analyzeRecipeFromImage, 
  generateMealSuggestions,
  parseRecipeFromText,
  provideCookingAssistance
} from "./openai";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";
import multer from "multer";

const upload = multer();

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Health check endpoint
  app.get("/api/health", (_, res) => {
    res.json({
      ok: true,
      node: process.version,
      hasKey: Boolean(process.env.OPENAI_API_KEY),
      env: process.env.NODE_ENV || "unknown",
      ts: Date.now()
    });
  });

  // STT fallback route for Android compatibility
  app.post("/api/stt", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const formData = new FormData();
      formData.append("file", new Blob([req.file.buffer]), "audio.webm");
      formData.append("model", "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}` 
        },
        body: formData as any
      });
      
      const result = await response.json();
      if (!response.ok) {
        console.error("OpenAI STT error:", result);
        return res.status(500).json(result);
      }
      
      res.json({ text: result.text || "" });
    } catch (error: any) {
      console.error("STT fallback error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // User auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage routes for recipe images
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Recipe routes
  app.post('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeData = insertRecipeSchema.parse({ ...req.body, userId });
      const recipe = await storage.createRecipe(recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(400).json({ message: "Failed to create recipe" });
    }
  });

  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipes = await storage.getRecipesByUser(userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const [ingredients, steps] = await Promise.all([
        storage.getIngredientsByRecipe(recipe.id),
        storage.getStepsByRecipe(recipe.id)
      ]);
      
      res.json({ ...recipe, ingredients, steps });
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const recipeData = insertRecipeSchema.partial().parse(req.body);
      const recipe = await storage.updateRecipe(req.params.id, recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteRecipe(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Recipe import routes
  app.post('/api/recipes/import/url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`Starting recipe import from URL: ${url}`);
      const recipeData = await analyzeRecipeFromUrl(url);
      console.log(`Extracted recipe data:`, recipeData);
      
      // Create the recipe with enhanced data
      const recipe = await storage.createRecipe({ 
        ...recipeData, 
        userId,
        // Preserve image URL if available from recipe data
        imageUrl: recipeData.imageUrl || null
      });
      
      console.log(`Created recipe with ID: ${recipe.id}`);
      
      // Create ingredients and steps
      if (recipeData.ingredients) {
        console.log(`Creating ${recipeData.ingredients.length} ingredients`);
        for (const ingredient of recipeData.ingredients) {
          await storage.createIngredient({ ...ingredient, recipeId: recipe.id });
        }
      }
      
      if (recipeData.steps) {
        console.log(`Creating ${recipeData.steps.length} steps`);
        for (let i = 0; i < recipeData.steps.length; i++) {
          await storage.createStep({
            recipeId: recipe.id,
            position: i + 1,
            text: recipeData.steps[i]
          });
        }
      }
      
      console.log(`Successfully imported recipe: ${recipe.title}`);
      
      // Enhanced response with acknowledgment
      res.json({ 
        ...recipe,
        success: true,
        message: `Successfully imported "${recipe.title}" with ${recipeData.ingredients?.length || 0} ingredients and ${recipeData.steps?.length || 0} steps.`,
        importedFrom: url,
        hasImage: !!recipe.imageUrl
      });
    } catch (error) {
      console.error("Error importing recipe from URL:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to import recipe from URL", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post('/api/recipes/import/photo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      console.log(`Starting recipe import from image: ${imageUrl}`);
      const recipeData = await analyzeRecipeFromImage(imageUrl);
      console.log(`Extracted recipe data from image:`, recipeData);
      
      const recipe = await storage.createRecipe({ 
        ...recipeData, 
        userId, 
        imageUrl 
      });
      
      console.log(`Created recipe from image with ID: ${recipe.id}`);
      
      // Create ingredients and steps
      if (recipeData.ingredients) {
        console.log(`Creating ${recipeData.ingredients.length} ingredients from image`);
        for (const ingredient of recipeData.ingredients) {
          await storage.createIngredient({ ...ingredient, recipeId: recipe.id });
        }
      }
      
      if (recipeData.steps) {
        console.log(`Creating ${recipeData.steps.length} steps from image`);
        for (let i = 0; i < recipeData.steps.length; i++) {
          await storage.createStep({
            recipeId: recipe.id,
            position: i + 1,
            text: recipeData.steps[i]
          });
        }
      }
      
      console.log(`Successfully imported recipe from image: ${recipe.title}`);
      
      // Enhanced response with acknowledgment
      res.json({ 
        ...recipe,
        success: true,
        message: `Successfully imported "${recipe.title}" from image with ${recipeData.ingredients?.length || 0} ingredients and ${recipeData.steps?.length || 0} steps.`,
        importedFrom: 'photo',
        hasImage: true
      });
    } catch (error) {
      console.error("Error importing recipe from photo:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to import recipe from photo", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Meal plan routes
  app.post('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealPlanData = insertMealPlanSchema.parse({ ...req.body, userId });
      const mealPlan = await storage.createMealPlan(mealPlanData);
      res.json(mealPlan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(400).json({ message: "Failed to create meal plan" });
    }
  });

  app.get('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const mealPlans = await storage.getMealPlansByUserAndDateRange(
        userId, 
        startDate as string, 
        endDate as string
      );
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.delete('/api/meal-plans/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMealPlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Shopping list routes
  app.post('/api/shopping-lists/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart, title } = req.body;
      
      // Get or create shopping list for the week
      let shoppingList = await storage.getShoppingListByUserAndWeek(userId, weekStart);
      if (!shoppingList) {
        shoppingList = await storage.createShoppingList({
          userId,
          title: title || `Shopping List - Week of ${weekStart}`,
          weekStart
        });
      }
      
      // Get meal plans for the week
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      const mealPlans = await storage.getMealPlansByUserAndDateRange(
        userId, 
        weekStart, 
        endDate.toISOString().split('T')[0]
      );
      
      // Aggregate ingredients from all recipes in meal plans
      const ingredientMap = new Map<string, any>();
      
      for (const mealPlan of mealPlans) {
        if (mealPlan.recipeId) {
          const ingredients = await storage.getIngredientsByRecipe(mealPlan.recipeId);
          for (const ingredient of ingredients) {
            const key = `${ingredient.item}_${ingredient.unit || ''}`;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity = (parseFloat(existing.quantity || '0') + parseFloat(ingredient.quantity || '0')).toString();
            } else {
              ingredientMap.set(key, { ...ingredient });
            }
          }
        }
      }
      
      // Create shopping list items
      for (const ingredient of Array.from(ingredientMap.values())) {
        await storage.createShoppingListItem({
          listId: shoppingList.id,
          ingredientId: ingredient.id,
          item: ingredient.item,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          aisle: ingredient.aisle
        });
      }
      
      const items = await storage.getShoppingListItems(shoppingList.id);
      res.json({ ...shoppingList, items });
    } catch (error) {
      console.error("Error generating shopping list:", error);
      res.status(500).json({ message: "Failed to generate shopping list" });
    }
  });

  app.get('/api/shopping-lists/:id', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getShoppingListItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list items:", error);
      res.status(500).json({ message: "Failed to fetch shopping list items" });
    }
  });

  app.put('/api/shopping-lists/:listId/items/:itemId', isAuthenticated, async (req, res) => {
    try {
      const itemData = insertShoppingListItemSchema.partial().parse(req.body);
      const item = await storage.updateShoppingListItem(req.params.itemId, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      res.status(400).json({ message: "Failed to update shopping list item" });
    }
  });

  // Voice assistant routes
  app.post('/api/voice/plan-meal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transcript, clientState = {} } = req.body;
      
      console.log('Voice planning request (streaming):', { transcript, userId, clientState });
      
      const user = await storage.getUser(userId);
      const userName = user?.firstName || 'there';

      // Set up streaming response headers
      const systemPrompt = `
You are MealBuilder, a proactive meal-planning assistant for ${userName}. Talk naturally, then end EACH turn with ONE JSON object ONLY:
{"reply":"<what you say to the user in natural language>", "actions":[
  {"type":"ADD_MEALS","data":[{"day":"Mon","slot":"dinner","recipe":"Turkey Chili","ingredients":[{"name":"ground turkey", "qty":900, "unit":"g"},{"name":"black beans", "qty":2, "unit":"cans"}]}]},
  {"type":"UPDATE_GROCERIES","data":[{"name":"ground turkey", "qty":900, "unit":"g", "category":"Meat"},{"name":"black beans", "qty":2, "unit":"cans", "category":"Canned"}]},
  {"type":"BUILD_CALENDAR","data":[{"date":"2025-08-31","slot":"dinner","recipe":"Turkey Chili"}]}
]}
No code fences. Metric units. If still clarifying, return actions: [].
`.trim();

      const body = {
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        stream: true,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({
            utterance: transcript,
            state: clientState || {}
          })}
        ]
      };

      // Set streaming headers before making request
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(body)
      });

      if (!response.ok || !response.body) {
        const errTxt = await response.text().catch(() => "");
        console.error("OpenAI upstream error:", response.status, errTxt);
        res.status(502).end(`upstream_error:${response.status}`);
        return;
      }

      // Stream the response directly
      for await (const chunk of response.body as any) {
        res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error("Error generating meal suggestions:", error);
      res.status(500).end(`error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  app.post('/api/voice/cooking-assistance', isAuthenticated, async (req, res) => {
    try {
      const { question, recipeContext, currentStep } = req.body;
      
      const assistance = await provideCookingAssistance(question, recipeContext, currentStep);
      res.json(assistance);
    } catch (error) {
      console.error("Error providing cooking assistance:", error);
      res.status(500).json({ message: "Failed to provide cooking assistance" });
    }
  });

  // User preferences routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferencesData = insertUserPreferencesSchema.parse({ ...req.body, userId });
      const preferences = await storage.upsertUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ message: "Failed to update settings" });
    }
  });

  // Collaboration routes
  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const groupData = insertCollaborationGroupSchema.parse({ ...req.body, ownerId });
      const group = await storage.createCollaborationGroup(groupData);
      
      // Add owner as admin member
      await storage.addGroupMember({
        groupId: group.id,
        userId: ownerId,
        role: 'admin'
      });
      
      res.json(group);
    } catch (error) {
      console.error("Error creating collaboration group:", error);
      res.status(400).json({ message: "Failed to create collaboration group" });
    }
  });

  app.post('/api/groups/:groupId/members', isAuthenticated, async (req, res) => {
    try {
      const memberData = insertGroupMemberSchema.parse({ ...req.body, groupId: req.params.groupId });
      const member = await storage.addGroupMember(memberData);
      res.json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(400).json({ message: "Failed to add group member" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Broadcast collaboration events to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
