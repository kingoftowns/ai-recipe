# Recipe AI

A production-ready Go-based recipe generation application using Anthropic's Claude AI.

## Features

- 🤖 AI-powered recipe generation using Claude API
- 🥗 Support for dietary restrictions and cuisine preferences
- 💾 Save and manage recipes in PostgreSQL database
- 📤 Export recipes to JSON and text formats
- ✅ Real-time ingredient validation
- 🔄 RESTful API for recipe management
- 🎨 Modern Material Design web interface
- 🛡️ Production-ready security features
- 📊 Health checks and observability endpoints
- ⚡ Rate limiting and input validation

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

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `SECRET_KEY`: Application secret key (required for production)

### Optional Environment Variables

- `CLAUDE_MODEL`: Claude model to use (default: claude-3-haiku-20240307)
- `GIN_MODE`: Gin framework mode (debug/release)
- `PORT`: Server port (default: 8000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: http://localhost:3000,http://localhost:8000)

### Security Features

- **CORS Protection**: Configurable allowed origins
- **Rate Limiting**: 
  - Recipe generation: 5 requests/minute per IP
  - API endpoints: 100 requests/minute per IP
- **Input Validation**: All endpoints have comprehensive validation
- **Error Recovery**: Graceful panic recovery with logging
- **Structured Logging**: JSON logging in production, human-readable in development

## API Endpoints

### Public Endpoints
- `GET /health`: Health check endpoint
- `GET /ready`: Readiness check (includes database connectivity)
- `GET /metrics`: Application metrics
- `GET /`: Web interface

### Recipe Management
- `POST /generate_recipe`: Generate a new recipe (rate-limited)
- `POST /save_recipe`: Save a recipe to database
- `POST /export_recipe/:format`: Export recipe (json/txt)
- `POST /validate_ingredients`: Validate ingredient list

### API Routes
- `GET /api/recipes`: List all recipes (with pagination and search)
- `GET /api/recipes/:id`: Get specific recipe
- `DELETE /api/recipes/:id`: Delete recipe

All API routes have rate limiting (100 req/min) and input validation.

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
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o recipe-ai main.go

# Set required environment variables
export GIN_MODE=release
export DATABASE_URL="your-production-db-url"
export ANTHROPIC_API_KEY="your-production-api-key"
export SECRET_KEY="your-secure-secret-key"
export ALLOWED_ORIGINS="https://yourdomain.com"

# Optional production settings
export CLAUDE_MODEL="claude-3-haiku-20240307"
export PORT="8000"

# Run migrations
./migrate -direction=up

# Run application
./recipe-ai
```

## Kubernetes Deployment

The application includes Helm charts for Kubernetes deployment:

```bash
# Deploy with Helm
helm install recipe-ai ./helm \
  --set secrets.anthropicApiKey="your-api-key" \
  --set secrets.secretKey="your-secret-key" \
  --set ingress.hosts[0].host="your-domain.com"
```

### Production Checklist

- ✅ Environment variables configured
- ✅ Database migrations applied
- ✅ CORS origins restricted to your domain
- ✅ Rate limiting configured
- ✅ Logging level set to INFO
- ✅ Health checks responding
- ✅ SSL/TLS certificates configured