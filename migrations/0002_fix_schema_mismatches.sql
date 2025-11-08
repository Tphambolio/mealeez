-- Fix critical schema mismatches found between migrations and schema.ts

-- 1. Add missing store column to shopping_list_items
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS store VARCHAR;

-- 2. Rename store_mappings to store_map in user_preferences
-- Will fail gracefully if column doesn't exist or was already renamed
ALTER TABLE user_preferences RENAME COLUMN store_mappings TO store_map;

-- 3. Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_steps_recipe_position ON steps(recipe_id, position);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_ingredient_id ON shopping_list_items(ingredient_id);

-- 4. Add unique index to group_members (instead of constraint for idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id);
