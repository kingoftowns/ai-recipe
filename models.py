from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    recipe_content = db.Column(db.Text, nullable=False)
    ingredients_used = db.Column(db.Text, nullable=False)
    dietary_restrictions = db.Column(db.String(100))
    cuisine_preference = db.Column(db.String(100))
    serving_size = db.Column(db.Integer, default=4)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert recipe to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'title': self.title,
            'recipe': self.recipe_content,
            'ingredients_used': self.ingredients_used,
            'dietary_restrictions': self.dietary_restrictions,
            'cuisine_preference': self.cuisine_preference,
            'serving_size': self.serving_size,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def extract_title_from_content(content):
        """Extract recipe title from the recipe content"""
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('Recipe Generated'):
                # Remove common prefixes and clean up
                prefixes = ['Recipe Name:', 'Recipe:', 'Title:', '**', '#', '*']
                for prefix in prefixes:
                    if line.startswith(prefix):
                        line = line[len(prefix):].strip()
                # Take first meaningful line as title
                if len(line) > 3 and len(line) < 100:
                    return line
        
        # Fallback to first 50 chars if no clear title found
        first_line = lines[0] if lines else "Untitled Recipe"
        return first_line[:50] + "..." if len(first_line) > 50 else first_line

    def __repr__(self):
        return f'<Recipe {self.id}: {self.title}>'