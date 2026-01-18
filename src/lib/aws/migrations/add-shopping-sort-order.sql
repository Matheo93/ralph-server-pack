-- ============================================================
-- MIGRATION: Add sort_order column to shopping_items
-- Date: 2026-01-18
-- Description: Allows drag & drop reordering of shopping items
-- ============================================================

-- Add sort_order column with default value based on creation order
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing items to have sequential sort_order based on created_at
WITH numbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at) as rn
    FROM shopping_items
)
UPDATE shopping_items
SET sort_order = numbered.rn
FROM numbered
WHERE shopping_items.id = numbered.id;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_shopping_items_sort_order
ON shopping_items(list_id, sort_order);

-- ============================================================
-- ROLLBACK (if needed):
-- ALTER TABLE shopping_items DROP COLUMN IF EXISTS sort_order;
-- DROP INDEX IF EXISTS idx_shopping_items_sort_order;
-- ============================================================
