CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    recipe_content TEXT NOT NULL,
    ingredients_used TEXT NOT NULL,
    dietary_restrictions VARCHAR(100),
    cuisine_preference VARCHAR(100),
    serving_size INTEGER DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);