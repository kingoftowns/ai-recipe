-- Remove updated_at column from recipes table
ALTER TABLE recipes DROP COLUMN IF EXISTS updated_at;