-- Fix critical schema mismatches found between migrations and schema.ts

-- 1. Add missing 'store' column to shopping_list_items
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS store VARCHAR;

-- 2. Rename store_mappings to store_map in user_preferences (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'store_mappings'
  ) THEN
    ALTER TABLE user_preferences RENAME COLUMN store_mappings TO store_map;
  END IF;
END $$;

-- 3. Skip the primary key change for now - keep both id and user_id columns
-- The schema will continue to work with the id column as primary key
-- user_id already has a UNIQUE constraint from the initial migration

-- 4. Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_steps_recipe_position ON steps(recipe_id, position);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_ingredient_id ON shopping_list_items(ingredient_id);

-- 5. Add unique constraint to group_members (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_group_user'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT unique_group_user UNIQUE(group_id, user_id);
  END IF;
END $$;
