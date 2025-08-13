# Recipe AI

A Go-based recipe generation application using Anthropic's Claude API.

## Features

- Generate recipes based on ingredients, dietary restrictions, and cuisine preferences
- Save and manage recipes in PostgreSQL database
- Export recipes to JSON and text formats
- Validate ingredient lists
- RESTful API for recipe management
- Modern web interface

## Development Setup

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Docker (for devcontainer)
- VS Code (recommended)

### Using DevContainer (Recommended)

1. Open the project in VS Code
2. Install the "Dev Containers" extension
3. Run "Dev Containers: Reopen in Container"
4. The environment will automatically set up with Go, PostgreSQL, and all dependencies

### Manual Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your settings
3. Install Go dependencies: `go mod download`
4. Start PostgreSQL and create the database
5. Run migrations: `go run cmd/migrate/main.go -direction=up`
6. Start the application: `go run main.go`

## Configuration

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `CLAUDE_MODEL`: Claude model to use (default: claude-sonnet-4-20250514)
- `SECRET_KEY`: Application secret key
- `GIN_MODE`: Gin framework mode (debug/release)
- `PORT`: Server port (default: 8000)

## API Endpoints

- `GET /`: Web interface
- `POST /generate_recipe`: Generate a new recipe
- `POST /save_recipe`: Save a recipe to database
- `POST /export_recipe/:format`: Export recipe (json/txt)
- `POST /validate_ingredients`: Validate ingredient list
- `GET /api/recipes`: List all recipes (with pagination and search)
- `GET /api/recipes/:id`: Get specific recipe
- `DELETE /api/recipes/:id`: Delete recipe

## Debugging

The project includes VS Code debug configurations:

1. **Launch Recipe AI Go**: Run the application normally
2. **Debug Recipe AI Go**: Run with debugger attached
3. **Attach to Process**: Attach debugger to running process

Set breakpoints in VS Code and use F5 to start debugging.

## Database Migrations

Run migrations manually:

```bash
# Run all up migrations
go run cmd/migrate/main.go -direction=up

# Run specific number of migrations
go run cmd/migrate/main.go -direction=up -steps=1

# Rollback migrations
go run cmd/migrate/main.go -direction=down -steps=1
```

## Building for Production

```bash
# Build binary
go build -o recipe-ai main.go

# Set production environment
export GIN_MODE=release
export DATABASE_URL="your-production-db-url"
export ANTHROPIC_API_KEY="your-production-api-key"

# Run
./recipe-ai
```