import OpenAI from "openai";
import * as cheerio from "cheerio";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

interface RecipeData {
  title: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
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
    // First, try to fetch and parse the webpage
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try to find JSON-LD structured data first
    const jsonLdScript = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScript.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScript[i]).html() || '');
        if (jsonData['@type'] === 'Recipe' || jsonData.recipe) {
          const recipe = jsonData.recipe || jsonData;
          return parseStructuredRecipe(recipe);
        }
      } catch (e) {
        // Continue trying other JSON-LD blocks
      }
    }
    
    // Fallback to OpenAI analysis
    const textContent = $('body').text().substring(0, 4000); // Limit content length
    
    const response2 = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a recipe extraction expert. Extract recipe information from the provided text and return it in JSON format with fields: title, description, servings, prepMinutes, cookMinutes, ingredients (array with raw, quantity, unit, item, aisle fields), and steps (array of strings)."
        },
        {
          role: "user",
          content: `Extract recipe information from this webpage content:\n\n${textContent}`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response2.choices[0].message.content || '{}');
    return normalizeRecipeData(result);
  } catch (error) {
    console.error('Error analyzing recipe from URL:', error);
    throw new Error('Failed to analyze recipe from URL');
  }
}

export async function analyzeRecipeFromImage(imageUrl: string): Promise<RecipeData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a recipe extraction expert. Analyze the recipe image and extract all visible recipe information. Return JSON with fields: title, description, servings, prepMinutes, cookMinutes, ingredients (array with raw, quantity, unit, item, aisle fields), and steps (array of strings)."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the complete recipe information from this image, including all ingredients with quantities and cooking steps."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return normalizeRecipeData(result);
  } catch (error) {
    console.error('Error analyzing recipe from image:', error);
    throw new Error('Failed to analyze recipe from image');
  }
}

export async function generateMealSuggestions(transcript: string, preferences?: any): Promise<any> {
  try {
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of current week (Sunday)
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a meal planning assistant. Based on the user's voice input and preferences, create specific meal plans and recipes for this week. 

IMPORTANT: Return JSON with this exact structure:
{
  "response": "Your conversational response to the user",
  "mealPlans": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "breakfast|lunch|dinner|snack",
      "recipeName": "Recipe Name",
      "servings": 4,
      "notes": "Any specific notes"
    }
  ],
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "servings": 4,
      "prepMinutes": 15,
      "cookMinutes": 30,
      "ingredients": [
        {
          "raw": "2 cups flour",
          "quantity": "2",
          "unit": "cups",
          "item": "flour",
          "aisle": "baking"
        }
      ],
      "steps": ["Step 1", "Step 2"]
    }
  ]
}

Current week starts on ${weekStart.toISOString().split('T')[0]}. Create meal plans for the next 7 days.`
        },
        {
          role: "user",
          content: `User said: "${transcript}"\nUser preferences: ${JSON.stringify(preferences || {})}\n\nCreate specific meal plans and recipes for this week based on what I mentioned.`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure proper date formatting for meal plans
    if (result.mealPlans) {
      result.mealPlans = result.mealPlans.map((plan: any, index: number) => {
        const planDate = new Date(weekStart);
        planDate.setDate(weekStart.getDate() + Math.floor(index / 3)); // Distribute across week
        
        return {
          ...plan,
          date: planDate.toISOString().split('T')[0]
        };
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error generating meal suggestions:', error);
    throw new Error('Failed to generate meal suggestions');
  }
}

export async function provideCookingAssistance(question: string, recipeContext?: any, currentStep?: any): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a cooking assistant helping users while they cook. Provide helpful, practical advice based on their questions and current cooking context. Return JSON with your response and any additional tips."
        },
        {
          role: "user",
          content: `Question: "${question}"\nRecipe context: ${JSON.stringify(recipeContext || {})}\nCurrent step: ${JSON.stringify(currentStep || {})}\n\nProvide cooking assistance.`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error providing cooking assistance:', error);
    throw new Error('Failed to provide cooking assistance');
  }
}

export async function parseRecipeFromText(text: string): Promise<RecipeData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Parse the recipe text and return structured JSON with fields: title, description, servings, prepMinutes, cookMinutes, ingredients (array with raw, quantity, unit, item, aisle fields), and steps (array of strings)."
        },
        {
          role: "user",
          content: `Parse this recipe text:\n\n${text}`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return normalizeRecipeData(result);
  } catch (error) {
    console.error('Error parsing recipe from text:', error);
    throw new Error('Failed to parse recipe from text');
  }
}

function parseStructuredRecipe(recipe: any): RecipeData {
  const ingredients = (recipe.recipeIngredient || []).map((ingredient: string) => {
    return parseIngredient(ingredient);
  });
  
  const steps = (recipe.recipeInstructions || []).map((instruction: any) => {
    if (typeof instruction === 'string') return instruction;
    return instruction.text || instruction.name || '';
  }).filter(Boolean);
  
  return {
    title: recipe.name || 'Untitled Recipe',
    description: recipe.description,
    servings: parseInt(recipe.recipeYield) || 4,
    prepMinutes: parseDuration(recipe.prepTime),
    cookMinutes: parseDuration(recipe.cookTime),
    ingredients,
    steps
  };
}

function parseIngredient(raw: string) {
  // Basic ingredient parsing - could be enhanced with more sophisticated parsing
  const match = raw.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(\w+)?\s+(.+)/);
  
  if (match) {
    return {
      raw,
      quantity: match[1],
      unit: match[2] || '',
      item: match[3].trim(),
      aisle: mapToAisle(match[3])
    };
  }
  
  return {
    raw,
    item: raw,
    aisle: mapToAisle(raw)
  };
}

function parseDuration(duration?: string): number {
  if (!duration) return 0;
  
  const match = duration.match(/PT(\d+)M/); // ISO 8601 duration format
  if (match) return parseInt(match[1]);
  
  const minuteMatch = duration.match(/(\d+)\s*min/i);
  if (minuteMatch) return parseInt(minuteMatch[1]);
  
  return 0;
}

function mapToAisle(item: string): string {
  const aisleMap: Record<string, string> = {
    'milk': 'Dairy',
    'cheese': 'Dairy',
    'yogurt': 'Dairy',
    'butter': 'Dairy',
    'bread': 'Bakery',
    'flour': 'Baking',
    'sugar': 'Baking',
    'salt': 'Baking',
    'pepper': 'Spices',
    'onion': 'Produce',
    'tomato': 'Produce',
    'chicken': 'Meat',
    'beef': 'Meat',
    'fish': 'Seafood',
    'rice': 'Pantry',
    'pasta': 'Pantry'
  };
  
  const itemLower = item.toLowerCase();
  for (const [keyword, aisle] of Object.entries(aisleMap)) {
    if (itemLower.includes(keyword)) {
      return aisle;
    }
  }
  
  return 'Other';
}

function normalizeRecipeData(data: any): RecipeData {
  return {
    title: data.title || 'Untitled Recipe',
    description: data.description,
    servings: data.servings || 4,
    prepMinutes: data.prepMinutes || 0,
    cookMinutes: data.cookMinutes || 0,
    ingredients: (data.ingredients || []).map((ing: any) => ({
      raw: ing.raw || ing.item || '',
      quantity: ing.quantity,
      unit: ing.unit,
      item: ing.item || ing.raw || '',
      notes: ing.notes,
      aisle: ing.aisle || mapToAisle(ing.item || ing.raw || '')
    })),
    steps: data.steps || []
  };
}
