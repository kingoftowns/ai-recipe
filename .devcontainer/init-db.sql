-- Initialize the recipe database with basic setup
-- This script runs when the PostgreSQL container starts for the first time

-- Grant all privileges to the recipe_user
GRANT ALL PRIVILEGES ON DATABASE recipe_db TO recipe_user;

-- Connect to the recipe database
\c recipe_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO recipe_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO recipe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO recipe_user;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO recipe_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO recipe_user;

-- Note: Tables will be created by Flask-Migrate migrations
-- Run `flask db upgrade` to create the application tables