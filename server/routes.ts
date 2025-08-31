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
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

      const recipeData = await analyzeRecipeFromUrl(url);
      const recipe = await storage.createRecipe({ ...recipeData, userId });
      
      // Create ingredients and steps
      if (recipeData.ingredients) {
        for (const ingredient of recipeData.ingredients) {
          await storage.createIngredient({ ...ingredient, recipeId: recipe.id });
        }
      }
      
      if (recipeData.steps) {
        for (let i = 0; i < recipeData.steps.length; i++) {
          await storage.createStep({
            recipeId: recipe.id,
            position: i + 1,
            text: recipeData.steps[i]
          });
        }
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error importing recipe from URL:", error);
      res.status(500).json({ message: "Failed to import recipe from URL" });
    }
  });

  app.post('/api/recipes/import/photo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      const recipeData = await analyzeRecipeFromImage(imageUrl);
      const recipe = await storage.createRecipe({ ...recipeData, userId, imageUrl });
      
      // Create ingredients and steps
      if (recipeData.ingredients) {
        for (const ingredient of recipeData.ingredients) {
          await storage.createIngredient({ ...ingredient, recipeId: recipe.id });
        }
      }
      
      if (recipeData.steps) {
        for (let i = 0; i < recipeData.steps.length; i++) {
          await storage.createStep({
            recipeId: recipe.id,
            position: i + 1,
            text: recipeData.steps[i]
          });
        }
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error importing recipe from photo:", error);
      res.status(500).json({ message: "Failed to import recipe from photo" });
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
      const { transcript, conversationStep, preferences } = req.body;
      
      console.log('Voice planning request:', { transcript, conversationStep, userId });
      
      const user = await storage.getUser(userId);
      const userName = user?.firstName || 'there';
      
      // Handle guided conversation flow
      let response = '';
      let nextStep = conversationStep;
      let mealPlans = [];
      let recipes = [];
      
      if (conversationStep === 1) {
        // Dietary preferences and serving size
        response = `Thanks for sharing! I understand you're planning meals. Based on what you've told me, let me ask: what types of meals are you in the mood for this week? Any specific cuisines, comfort foods, or healthy options you'd like to focus on?`;
        nextStep = 2;
      } else if (conversationStep === 2) {
        // Meal preferences
        response = `Great choices! Now, to help me suggest the perfect recipes, are there any specific ingredients you want to use up, or any cooking methods you prefer? For example, quick 30-minute meals, slow cooker recipes, or something you can prep ahead?`;
        nextStep = 3;
      } else if (conversationStep === 3) {
        // Recipe suggestions - Actually generate meal plans and recipes
        console.log('Generating meal suggestions for:', transcript);
        const suggestions = await generateMealSuggestions(transcript, preferences);
        console.log('Generated suggestions:', suggestions);
        
        response = `Perfect! Based on everything you've told me, I've created a personalized meal plan for you. ${suggestions.response || "I've added several meal options to your weekly schedule and created new recipes for your library!"}`;
        
        // Extract meal plans and recipes from suggestions
        if (suggestions.mealPlans) {
          mealPlans = suggestions.mealPlans;
        }
        if (suggestions.recipes) {
          recipes = suggestions.recipes;
        }
        
        nextStep = 4;
      } else {
        // General conversation - still try to generate content
        console.log('General conversation, generating suggestions for:', transcript);
        const suggestions = await generateMealSuggestions(transcript, preferences);
        console.log('General suggestions:', suggestions);
        
        response = suggestions.response || "I'm here to help with your meal planning. What would you like to know?";
        
        // Still extract content if available
        if (suggestions.mealPlans) {
          mealPlans = suggestions.mealPlans;
        }
        if (suggestions.recipes) {
          recipes = suggestions.recipes;
        }
      }
      
      console.log('Sending response:', { response, mealPlans, recipes, nextStep });
      
      res.json({ 
        response, 
        nextStep: nextStep < 4 ? nextStep : undefined,
        conversationStep,
        mealPlans,
        recipes
      });
    } catch (error) {
      console.error("Error generating meal suggestions:", error);
      res.status(500).json({ message: "Failed to generate meal suggestions", response: "Sorry, I encountered an error. Please try again." });
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
