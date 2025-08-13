import io
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file
from flask_cors import CORS
from flask_migrate import Migrate

import config as cfg
from models import db, Recipe

load_dotenv()

app = Flask(__name__, template_folder='app/templates',
            static_folder='app/static')
CORS(app)
app.config['SECRET_KEY'] = cfg.APP_SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = cfg.SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = cfg.SQLALCHEMY_TRACK_MODIFICATIONS

# Initialize database
db.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Lazy load the anthropic client to avoid initialization issues
client = None


def get_anthropic_client():
    global client
    if client is None:
        import anthropic

        # Get just the API key, no other parameters
        api_key = cfg.CLAUDE_API_KEY
        client = anthropic.Anthropic(api_key=api_key)
    return client


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/generate_recipe', methods=['POST'])
def generate_recipe():
    try:
        data = request.json
        ingredients = data.get('ingredients', '')
        dietary_restrictions = data.get('dietary_restrictions', '')
        cuisine_preference = data.get('cuisine_preference', '')
        serving_size = data.get('serving_size', 4)

        if not ingredients:
            return jsonify({'error': 'Please provide at least one ingredient'}), 400

        prompt = f"""Generate a detailed recipe using the following ingredients: {ingredients}

        Dietary restrictions: {dietary_restrictions if dietary_restrictions else 'None'}
        Cuisine preference: {cuisine_preference if cuisine_preference else 'Any'}
        Serving size: {serving_size} people

        Please provide:
        1. Recipe name
        2. Total prep time and cooking time
        3. Complete list of ingredients with measurements
        4. Step-by-step cooking instructions
        5. Nutritional information (approximate)
        6. Tips or variations

        Format the response in a clear, structured way."""

        response = get_anthropic_client().messages.create(
            model=cfg.CLAUDE_MODEL,
            max_tokens=2000,
            temperature=0.7,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        recipe_text = response.content[0].text

        recipe_data = {
            'recipe': recipe_text,
            'timestamp': datetime.now().isoformat(),
            'ingredients_used': ingredients,
            'dietary_restrictions': dietary_restrictions,
            'cuisine_preference': cuisine_preference,
            'serving_size': serving_size
        }

        return jsonify(recipe_data)

    except Exception as e:
        error_msg = str(e)
        if 'APIError' in str(type(e).__name__):
            return jsonify({'error': f'API Error: {error_msg}'}), 500
        else:
            return jsonify({'error': f'An error occurred: {error_msg}'}), 500


@app.route('/save_recipe', methods=['POST'])
def save_recipe():
    try:
        data = request.json
        recipe_data = data.get('recipe_data')

        if not recipe_data:
            return jsonify({'error': 'No recipe data provided'}), 400

        # Extract title from recipe content
        title = Recipe.extract_title_from_content(recipe_data.get('recipe', ''))
        
        # Create new recipe
        recipe = Recipe(
            title=title,
            recipe_content=recipe_data.get('recipe', ''),
            ingredients_used=recipe_data.get('ingredients_used', ''),
            dietary_restrictions=recipe_data.get('dietary_restrictions'),
            cuisine_preference=recipe_data.get('cuisine_preference'),
            serving_size=recipe_data.get('serving_size', 4)
        )
        
        db.session.add(recipe)
        db.session.commit()

        return jsonify({
            'message': 'Recipe saved successfully', 
            'recipe_id': recipe.id,
            'title': recipe.title
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to save recipe: {str(e)}'}), 500


@app.route('/export_recipe/<format>', methods=['POST'])
def export_recipe(format):
    try:
        data = request.json
        recipe_data = data.get('recipe_data')

        if not recipe_data:
            return jsonify({'error': 'No recipe data provided'}), 400

        if format == 'json':
            output = io.BytesIO()
            output.write(json.dumps(recipe_data, indent=2).encode('utf-8'))
            output.seek(0)

            return send_file(
                output,
                mimetype='application/json',
                as_attachment=True,
                download_name=f"recipe_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )

        elif format == 'txt':
            output = io.BytesIO()
            recipe_text = f"""Recipe Generated on {recipe_data.get('timestamp', '')}

Ingredients Used: {recipe_data.get('ingredients_used', '')}
Dietary Restrictions: {recipe_data.get('dietary_restrictions', 'None')}
Cuisine Preference: {recipe_data.get('cuisine_preference', 'Any')}
Serving Size: {recipe_data.get('serving_size', 4)}

{recipe_data.get('recipe', '')}
"""
            output.write(recipe_text.encode('utf-8'))
            output.seek(0)

            return send_file(
                output,
                mimetype='text/plain',
                as_attachment=True,
                download_name=f"recipe_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            )

        else:
            return jsonify({'error': 'Invalid export format'}), 400

    except Exception as e:
        return jsonify({'error': f'Failed to export recipe: {str(e)}'}), 500


@app.route('/validate_ingredients', methods=['POST'])
def validate_ingredients():
    try:
        data = request.json
        ingredients = data.get('ingredients', '')

        if not ingredients:
            return jsonify({'valid': False, 'message': 'No ingredients provided'})

        ingredients_list = [i.strip()
                            for i in ingredients.split(',') if i.strip()]

        if len(ingredients_list) == 0:
            return jsonify({'valid': False, 'message': 'Please provide at least one ingredient'})

        if len(ingredients_list) > 20:
            return jsonify({'valid': False, 'message': 'Too many ingredients (maximum 20)'})

        return jsonify({
            'valid': True,
            'message': f'Valid: {len(ingredients_list)} ingredient(s) provided',
            'count': len(ingredients_list),
            'ingredients': ingredients_list
        })

    except Exception as e:
        return jsonify({'valid': False, 'message': f'Validation error: {str(e)}'})


@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Get all saved recipes with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '', type=str)
        
        query = Recipe.query
        
        # Filter by search term if provided
        if search:
            query = query.filter(
                db.or_(
                    Recipe.title.contains(search),
                    Recipe.ingredients_used.contains(search),
                    Recipe.dietary_restrictions.contains(search),
                    Recipe.cuisine_preference.contains(search)
                )
            )
        
        # Order by most recent
        query = query.order_by(Recipe.created_at.desc())
        
        # Paginate
        recipes = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'recipes': [recipe.to_dict() for recipe in recipes.items],
            'total': recipes.total,
            'pages': recipes.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch recipes: {str(e)}'}), 500


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """Get a specific recipe by ID"""
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        return jsonify(recipe.to_dict())
    except Exception as e:
        return jsonify({'error': f'Recipe not found: {str(e)}'}), 404


@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    """Delete a specific recipe"""
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete recipe: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
