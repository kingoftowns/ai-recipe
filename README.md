# Recipe AI Generator

An intelligent recipe generator powered by Claude AI that creates custom recipes based on available ingredients, dietary preferences, and cuisine styles.

## Features

- 🤖 **AI-Powered Recipe Generation**: Uses Claude API to generate creative and detailed recipes
- 🥗 **Dietary Restrictions Support**: Accommodates various dietary needs (vegetarian, vegan, gluten-free, etc.)
- 🌍 **Cuisine Preferences**: Generate recipes from different cuisines (Italian, Mexican, Chinese, etc.)
- 👥 **Adjustable Serving Sizes**: Scale recipes for 1-12 servings
- 💾 **Save & Export**: Save recipes locally or export as JSON/TXT files
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ✅ **Input Validation**: Real-time ingredient validation with helpful feedback
- ⏳ **Loading Indicators**: Visual feedback during recipe generation

## Prerequisites

- Docker Desktop (for devcontainer)
- VS Code with Remote-Containers extension
- Anthropic API key

## Quick Start with DevContainer

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd recipe-ai
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

3. **Open in VS Code with DevContainer**:
   - Open VS Code
   - Press `F1` and select "Remote-Containers: Open Folder in Container"
   - Select the `recipe-ai` folder
   - VS Code will build and start the devcontainer

4. **Run the application**:
   Once the container is running, open a terminal in VS Code and run:
   ```bash
   flask run
   ```
   The application will be available at `http://localhost:5000`

## Manual Setup (Without DevContainer)

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Claude Code CLI** (optional):
   ```bash
   npm install -g @anthropic-ai/claude-cli
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Anthropic API key.

5. **Run the application**:
   ```bash
   flask run
   ```

## Project Structure

```
recipe-ai/
├── .devcontainer/
│   └── devcontainer.json    # DevContainer configuration
├── app/
│   ├── templates/           # HTML templates
│   │   ├── base.html
│   │   └── index.html
│   └── static/
│       ├── css/
│       │   └── style.css    # Application styles
│       └── js/
│           └── main.js      # Frontend JavaScript
├── saved_recipes/           # Directory for saved recipes (auto-created)
├── app.py                   # Main Flask application
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
└── README.md               # This file
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `SECRET_KEY`: Flask secret key for sessions
- `FLASK_ENV`: Flask environment (development/production)
- `FLASK_DEBUG`: Enable/disable debug mode
- `MAX_INGREDIENTS`: Maximum number of ingredients allowed (default: 20)
- `DEFAULT_SERVING_SIZE`: Default serving size (default: 4)

### DevContainer Features

The devcontainer includes:
- Python 3.11
- Claude Code CLI pre-installed
- All required Python packages
- VS Code extensions for Python development
- Git and GitHub CLI
- Auto-formatting with Black
- Linting with Flake8

## Usage

1. **Enter Ingredients**: List available ingredients separated by commas
2. **Select Preferences**: Choose dietary restrictions and cuisine type
3. **Set Serving Size**: Adjust the number of servings needed
4. **Generate Recipe**: Click "Generate Recipe" to create your custom recipe
5. **Save/Export**: Save the recipe locally or export as JSON/TXT

## API Endpoints

- `GET /`: Main application interface
- `POST /generate_recipe`: Generate a new recipe
- `POST /validate_ingredients`: Validate ingredient input
- `POST /save_recipe`: Save recipe to server
- `POST /export_recipe/<format>`: Export recipe (json/txt)

## Development

### Running in Development Mode

```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
flask run
```

### Adding New Features

1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Update documentation
5. Submit pull request

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your Anthropic API key is correctly set in `.env`
2. **Port Already in Use**: Change the port in `app.py` or use `flask run --port=5001`
3. **Module Not Found**: Ensure all dependencies are installed with `pip install -r requirements.txt`
4. **DevContainer Issues**: Rebuild the container with "Remote-Containers: Rebuild Container"

### Debug Mode

Enable debug mode for detailed error messages:
```bash
export FLASK_DEBUG=1
flask run
```

## Security Notes

- Never commit `.env` file with real API keys
- Use strong secret keys in production
- Validate and sanitize all user inputs
- Keep dependencies updated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is for educational and personal use.

## Support

For issues or questions:
- Check the troubleshooting section
- Review existing issues on GitHub
- Create a new issue with detailed information

## Acknowledgments

- Powered by Claude AI from Anthropic
- Built with Flask framework
- Styled with modern CSS
- Enhanced with vanilla JavaScript