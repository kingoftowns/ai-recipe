-- Add updated_at column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipes' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        -- Update existing records to have updated_at = created_at
        UPDATE recipes SET updated_at = created_at WHERE updated_at IS NULL;
    END IF;
END $$;