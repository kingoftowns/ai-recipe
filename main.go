package main

import (
	"log"
	"os"

	"recipe-ai/internal/config"
	"recipe-ai/internal/database"
	"recipe-ai/internal/handlers"
	"recipe-ai/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	if os.Getenv("ANTHROPIC_API_KEY") == "" {
		log.Fatal("ANTHROPIC_API_KEY environment variable is required")
	}
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	cfg := config.Load()

	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())

	router.Static("/static", "./app/static")
	router.LoadHTMLGlob("app/templates/*")

	h := handlers.New(db, cfg)

	router.GET("/", h.Index)
	router.POST("/generate_recipe", h.GenerateRecipe)
	router.POST("/save_recipe", h.SaveRecipe)
	router.POST("/export_recipe/:format", h.ExportRecipe)
	router.POST("/validate_ingredients", h.ValidateIngredients)

	api := router.Group("/api")
	{
		api.GET("/recipes", h.GetRecipes)
		api.GET("/recipes/:id", h.GetRecipe)
		api.DELETE("/recipes/:id", h.DeleteRecipe)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
