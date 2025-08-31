import OpenAI from "openai";
import * as cheerio from "cheerio";

// Initialize OpenAI client with required API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
if (!openai.apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}

interface RecipeData {
  title: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  imageUrl?: string;
  ingredients?: Array<{
    raw: string;
    quantity?: string;
    unit?: string;
    item: string;
    notes?: string;
    aisle?: string;
  }>;
  steps?: string[];
}

export async function analyzeRecipeFromUrl(url: string): Promise<RecipeData> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    let imageUrl = null;
    const possibleImages = [
      $('meta[property="og:image"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
      $('.recipe-image img, .hero-image img, [class*="recipe"] img')
        .first()
        .attr("src"),
      $('img[alt*="recipe" i], img[alt*="dish" i]').first().attr("src"),
      $("picture img, figure img").first().attr("src"),
    ].filter(Boolean);

    if (possibleImages.length > 0) {
      imageUrl = possibleImages[0];
      if (imageUrl && !imageUrl.startsWith("http")) {
        const baseUrl = new URL(url);
        imageUrl = new URL(imageUrl, baseUrl.origin).href;
      }
    }

    const jsonLdScript = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScript.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScript[i]).html() || "");
        if (jsonData["@type"] === "Recipe" || jsonData.recipe) {
          const recipe = jsonData.recipe || jsonData;
          const recipeData = parseStructuredRecipe(recipe);
          recipeData.imageUrl = imageUrl || recipeData.imageUrl;
          return recipeData;
        }
      } catch {}
    }

    const textContent = $("body").text().substring(0, 4000);

    const response2 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a recipe extraction expert...",
        },
        {
          role: "user",
          content: `Extract recipe information from this webpage content:\n\n${textContent}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response2.choices[0].message.content || "{}");
    const recipeData = normalizeRecipeData(result);
    recipeData.imageUrl = imageUrl;
    return recipeData;
  } catch (error) {
    console.error("Error analyzing recipe from URL:", error);
    throw new Error("Failed to analyze recipe from URL");
  }
}

export async function analyzeRecipeFromImage(
  imageUrl: string,
): Promise<RecipeData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a recipe extraction expert..." },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract recipe information from this image...",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return normalizeRecipeData(result);
  } catch (error) {
    console.error("Error analyzing recipe from image:", error);
    throw new Error("Failed to analyze recipe from image");
  }
}

export async function generateMealSuggestions(
  transcript: string,
  preferences?: any,
): Promise<any> {
  try {
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a meal planning assistant...` },
        { role: "user", content: `User said: "${transcript}"...` },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    if (result.mealPlans) {
      result.mealPlans = result.mealPlans.map((plan: any, index: number) => {
        const planDate = new Date(weekStart);
        planDate.setDate(weekStart.getDate() + Math.floor(index / 3));
        return { ...plan, date: planDate.toISOString().split("T")[0] };
      });
    }
    return result;
  } catch (error) {
    console.error("Error generating meal suggestions:", error);
    throw new Error("Failed to generate meal suggestions");
  }
}

export async function provideCookingAssistance(
  question: string,
  recipeContext?: any,
  currentStep?: any,
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a cooking assistant..." },
        { role: "user", content: `Question: "${question}"...` },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error providing cooking assistance:", error);
    throw new Error("Failed to provide cooking assistance");
  }
}

export async function parseRecipeFromText(text: string): Promise<RecipeData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Parse the recipe text and return structured JSON...",
        },
        { role: "user", content: `Parse this recipe text:\n\n${text}` },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return normalizeRecipeData(result);
  } catch (error) {
    console.error("Error parsing recipe from text:", error);
    throw new Error("Failed to parse recipe from text");
  }
}

// ... keep your helper functions (parseStructuredRecipe, parseIngredient, etc.) unchanged
