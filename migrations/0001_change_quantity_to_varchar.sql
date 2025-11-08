-- Change quantity columns from numeric to varchar to support fractional quantities like "1/2"

ALTER TABLE ingredients ALTER COLUMN quantity TYPE varchar USING quantity::varchar;
ALTER TABLE shopping_list_items ALTER COLUMN quantity TYPE varchar USING quantity::varchar;
