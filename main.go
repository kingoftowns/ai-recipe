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

	middleware.InitializeLogger(cfg.Environment)

	db, err := database.Initialize(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer func() {
		sqlDB, err := db.DB()
		if err == nil {
			sqlDB.Close()
		}
	}()

	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()
	router.Use(middleware.Recovery())
	router.Use(middleware.CORS(cfg.AllowedOrigins))
	router.Use(middleware.Logger())

	metricsMiddleware := middleware.NewMetricsMiddleware()
	router.Use(metricsMiddleware.Handler())

	router.Static("/static", "./app/static")
	router.LoadHTMLGlob("app/templates/*")

	h := handlers.New(db, cfg)
	v := middleware.NewValidationMiddleware()

	router.GET("/health", h.Health)
	router.GET("/ready", h.Ready)
	router.GET("/metrics", h.Metrics)
	router.GET("/", h.Index)
	router.POST("/generate_recipe", middleware.GenerateRateLimitMiddleware(), h.GenerateRecipe)
	router.POST("/save_recipe", middleware.APIRateLimitMiddleware(), h.SaveRecipe)
	router.POST("/export_recipe/:format", middleware.APIRateLimitMiddleware(), h.ExportRecipe)
	router.POST("/validate_ingredients", middleware.APIRateLimitMiddleware(), h.ValidateIngredients)

	api := router.Group("/api", middleware.APIRateLimitMiddleware())
	{
		api.GET("/recipes", v.ValidatePagination(), h.GetRecipes)
		api.GET("/recipes/:id", v.ValidateIDParam(), h.GetRecipe)
		api.DELETE("/recipes/:id", v.ValidateIDParam(), h.DeleteRecipe)
	}

	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
