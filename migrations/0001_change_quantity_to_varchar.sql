-- Change quantity columns from numeric to varchar to support fractional quantities like "1/2"
-- This migration is idempotent - it only runs if columns are still numeric type

-- Ingredients table
ALTER TABLE ingredients ALTER COLUMN quantity TYPE varchar USING quantity::varchar;

-- Shopping list items table
ALTER TABLE shopping_list_items ALTER COLUMN quantity TYPE varchar USING quantity::varchar;
