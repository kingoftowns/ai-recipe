import os

CLAUDE_API_KEY = os.getenv('ANTHROPIC_API_KEY', "some-api-key")
CLAUDE_MODEL = os.getenv('CLAUDE_MODEL', "claude-3-haiku-20240307")

APP_SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/recipe_db')
SQLALCHEMY_DATABASE_URI = DATABASE_URL
SQLALCHEMY_TRACK_MODIFICATIONS = False
