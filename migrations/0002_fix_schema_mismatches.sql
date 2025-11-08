-- Fix critical schema mismatches found between migrations and schema.ts

-- 1. Add missing 'store' column to shopping_list_items
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS store VARCHAR;

-- 2. Rename store_mappings to store_map in user_preferences
ALTER TABLE user_preferences RENAME COLUMN store_mappings TO store_map;

-- 3. Remove the unnecessary 'id' column from user_preferences and make user_id the primary key
-- This requires dropping the existing primary key and creating a new one
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS id;
ALTER TABLE user_preferences ADD PRIMARY KEY (user_id);

-- 4. Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_steps_recipe_position ON steps(recipe_id, position);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_ingredient_id ON shopping_list_items(ingredient_id);

-- 5. Add unique constraint to group_members
ALTER TABLE group_members ADD CONSTRAINT IF NOT EXISTS unique_group_user UNIQUE(group_id, user_id);
