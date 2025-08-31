import express from "express";
import { generateMealSuggestions, provideCookingAssistance } from "./openai";

const router = express.Router();

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

// Voice meal planning endpoint
router.post("/api/voice/plan-meal", async (req, res) => {
  try {
    const { transcript, preferences, clientState } = req.body;

    const result = await generateMealSuggestions(transcript, preferences || {});

    // Normalize into reply + actions for the frontend
    const reply = result.response || "Here’s your meal plan!";
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

    const reply = result.response || "Here’s some cooking advice.";
    res.json({ reply, actions: [] });
  } catch (e: any) {
    console.error("cooking-assistance error:", e);
    res.status(500).json({ error: "Failed to provide cooking assistance" });
  }
});

export default router;
