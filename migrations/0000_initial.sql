-- Initial migration for MealBuilder

-- Sessions table (required for express-session)
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" VARCHAR PRIMARY KEY,
  "sess" JSONB NOT NULL,
  "expire" TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR UNIQUE,
  "first_name" VARCHAR,
  "last_name" VARCHAR,
  "profile_image_url" VARCHAR,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Recipes table
CREATE TABLE IF NOT EXISTS "recipes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "servings" INTEGER DEFAULT 4,
  "prep_minutes" INTEGER DEFAULT 0,
  "cook_minutes" INTEGER DEFAULT 0,
  "source_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS "ingredients" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipe_id" VARCHAR NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "raw" TEXT NOT NULL,
  "quantity" NUMERIC,
  "unit" VARCHAR,
  "item" TEXT NOT NULL,
  "notes" TEXT,
  "aisle" VARCHAR
);

-- Steps table
CREATE TABLE IF NOT EXISTS "steps" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipe_id" VARCHAR NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "text" TEXT NOT NULL
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipe_id" VARCHAR REFERENCES "recipes"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "meal_slot" VARCHAR NOT NULL,
  "servings_override" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Shopping lists table
CREATE TABLE IF NOT EXISTS "shopping_lists" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "week_start" DATE NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Shopping list items table
CREATE TABLE IF NOT EXISTS "shopping_list_items" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "list_id" VARCHAR NOT NULL REFERENCES "shopping_lists"("id") ON DELETE CASCADE,
  "ingredient_id" VARCHAR REFERENCES "ingredients"("id"),
  "item" TEXT NOT NULL,
  "quantity" NUMERIC,
  "unit" VARCHAR,
  "aisle" VARCHAR,
  "checked" BOOLEAN DEFAULT FALSE
);

-- User preferences table
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "default_servings" INTEGER DEFAULT 4,
  "voice_enabled" BOOLEAN DEFAULT TRUE,
  "store_mappings" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Collaboration groups table
CREATE TABLE IF NOT EXISTS "collaboration_groups" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "owner_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" VARCHAR NOT NULL REFERENCES "collaboration_groups"("id") ON DELETE CASCADE,
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" VARCHAR DEFAULT 'member',
  "joined_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("group_id", "user_id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_recipes_user_id" ON "recipes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ingredients_recipe_id" ON "ingredients"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_steps_recipe_id" ON "steps"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_meal_plans_user_id" ON "meal_plans"("user_id");
CREATE INDEX IF NOT EXISTS "idx_meal_plans_date" ON "meal_plans"("date");
CREATE INDEX IF NOT EXISTS "idx_shopping_lists_user_id" ON "shopping_lists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_shopping_list_items_list_id" ON "shopping_list_items"("list_id");
CREATE INDEX IF NOT EXISTS "idx_group_members_group_id" ON "group_members"("group_id");
CREATE INDEX IF NOT EXISTS "idx_group_members_user_id" ON "group_members"("user_id");
