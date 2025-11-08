-- Change quantity columns from numeric to varchar to support fractional quantities like "1/2"

-- Only alter if column type is numeric
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ingredients'
        AND column_name = 'quantity'
        AND data_type = 'numeric'
    ) THEN
        ALTER TABLE ingredients ALTER COLUMN quantity TYPE varchar USING quantity::varchar;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'shopping_list_items'
        AND column_name = 'quantity'
        AND data_type = 'numeric'
    ) THEN
        ALTER TABLE shopping_list_items ALTER COLUMN quantity TYPE varchar USING quantity::varchar;
    END IF;
END $$;
