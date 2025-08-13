package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"recipe-ai/internal/config"
	"recipe-ai/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Handler struct {
	db            *gorm.DB
	cfg           *config.Config
	totalRecipes  prometheus.Gauge
	dbConnections prometheus.GaugeVec
}

type AnthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AnthropicRequest struct {
	Model       string             `json:"model"`
	MaxTokens   int                `json:"max_tokens"`
	Temperature float64            `json:"temperature"`
	Messages    []AnthropicMessage `json:"messages"`
}

type AnthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
		Type string `json:"type"`
	} `json:"content"`
}

type RecipeRequest struct {
	Ingredients         string `json:"ingredients"`
	DietaryRestrictions string `json:"dietary_restrictions"`
	CuisinePreference   string `json:"cuisine_preference"`
	ServingSize         int    `json:"serving_size"`
}

type RecipeData struct {
	Recipe              string `json:"recipe"`
	Timestamp           string `json:"timestamp"`
	IngredientsUsed     string `json:"ingredients_used"`
	DietaryRestrictions string `json:"dietary_restrictions"`
	CuisinePreference   string `json:"cuisine_preference"`
	ServingSize         int    `json:"serving_size"`
}

type SaveRecipeRequest struct {
	RecipeData RecipeData `json:"recipe_data"`
}

type ExportRecipeRequest struct {
	RecipeData RecipeData `json:"recipe_data"`
}

type ValidateIngredientsRequest struct {
	Ingredients string `json:"ingredients"`
}

func New(db *gorm.DB, cfg *config.Config) *Handler {
	h := &Handler{
		db:  db,
		cfg: cfg,
	}

	h.totalRecipes = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "recipe_ai_total_recipes",
		Help: "Total number of recipes in the database",
	})

	h.dbConnections = *prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "recipe_ai_db_connections",
		Help: "Database connection statistics",
	}, []string{"state"})

	prometheus.MustRegister(h.totalRecipes)
	prometheus.MustRegister(&h.dbConnections)

	return h
}

func (h *Handler) Index(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", nil)
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) Ready(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "error",
			"message": "database connection error",
		})
		return
	}

	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "error",
			"message": "database ping failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"database":  "connected",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) Metrics(c *gin.Context) {
	var totalRecipes int64
	h.db.Model(&models.Recipe{}).Count(&totalRecipes)
	h.totalRecipes.Set(float64(totalRecipes))

	sqlDB, _ := h.db.DB()
	stats := sqlDB.Stats()
	h.dbConnections.WithLabelValues("open").Set(float64(stats.OpenConnections))
	h.dbConnections.WithLabelValues("in_use").Set(float64(stats.InUse))
	h.dbConnections.WithLabelValues("idle").Set(float64(stats.Idle))

	promhttp.Handler().ServeHTTP(c.Writer, c.Request)
}

func (h *Handler) GenerateRecipe(c *gin.Context) {
	logrus.WithFields(logrus.Fields{
		"endpoint": "generate_recipe",
		"ip":       c.ClientIP(),
	}).Info("Recipe generation started")

	var req RecipeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logrus.WithError(err).Warn("Invalid request format for recipe generation")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if req.Ingredients == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide at least one ingredient"})
		return
	}

	if req.ServingSize == 0 {
		req.ServingSize = 4
	}

	dietaryText := "None"
	if req.DietaryRestrictions != "" {
		dietaryText = req.DietaryRestrictions
	}

	cuisineText := "Any"
	if req.CuisinePreference != "" {
		cuisineText = req.CuisinePreference
	}

	prompt := fmt.Sprintf(`Generate a detailed recipe using the following ingredients: %s

Dietary restrictions: %s
Cuisine preference: %s
Serving size: %d people

Please provide:
1. Recipe name
2. Total prep time and cooking time
3. Complete list of ingredients with measurements
4. Step-by-step cooking instructions
5. Nutritional information (approximate)
6. Tips or variations

Format the response in a clear, structured way.`, req.Ingredients, dietaryText, cuisineText, req.ServingSize)

	logrus.WithFields(logrus.Fields{
		"ingredients_count": len(strings.Split(req.Ingredients, ",")),
		"serving_size":      req.ServingSize,
		"cuisine":           req.CuisinePreference,
		"dietary":           req.DietaryRestrictions,
	}).Info("Calling Anthropic API for recipe generation")

	recipeText, err := h.callAnthropicAPI(prompt)
	if err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"model": h.cfg.ClaudeModel,
			"ip":    c.ClientIP(),
		}).Error("Failed to generate recipe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate recipe: %v", err)})
		return
	}

	logrus.WithFields(logrus.Fields{
		"response_length": len(recipeText),
		"ip":              c.ClientIP(),
	}).Info("Recipe generated successfully")

	recipeData := RecipeData{
		Recipe:              recipeText,
		Timestamp:           time.Now().Format(time.RFC3339),
		IngredientsUsed:     req.Ingredients,
		DietaryRestrictions: req.DietaryRestrictions,
		CuisinePreference:   req.CuisinePreference,
		ServingSize:         req.ServingSize,
	}

	c.JSON(http.StatusOK, recipeData)
}

func (h *Handler) SaveRecipe(c *gin.Context) {
	logrus.WithFields(logrus.Fields{
		"endpoint": "save_recipe",
		"ip":       c.ClientIP(),
	}).Info("Recipe save started")

	var req SaveRecipeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logrus.WithError(err).Warn("Invalid request format for recipe save")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if req.RecipeData.Recipe == "" {
		logrus.WithField("ip", c.ClientIP()).Warn("Empty recipe data provided")
		c.JSON(http.StatusBadRequest, gin.H{"error": "No recipe data provided"})
		return
	}

	recipe := models.Recipe{
		RecipeContent:   req.RecipeData.Recipe,
		IngredientsUsed: req.RecipeData.IngredientsUsed,
		ServingSize:     req.RecipeData.ServingSize,
	}

	if req.RecipeData.DietaryRestrictions != "" {
		recipe.DietaryRestrictions = &req.RecipeData.DietaryRestrictions
	}

	if req.RecipeData.CuisinePreference != "" {
		recipe.CuisinePreference = &req.RecipeData.CuisinePreference
	}

	if err := h.db.Create(&recipe).Error; err != nil {
		logrus.WithError(err).WithField("ip", c.ClientIP()).Error("Failed to save recipe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save recipe"})
		return
	}

	logrus.WithFields(logrus.Fields{
		"recipe_id": recipe.ID,
		"title":     recipe.Title,
		"ip":        c.ClientIP(),
	}).Info("Recipe saved successfully")

	c.JSON(http.StatusOK, gin.H{
		"message":   "Recipe saved successfully",
		"recipe_id": recipe.ID,
		"title":     recipe.Title,
	})
}

func (h *Handler) ExportRecipe(c *gin.Context) {
	format := c.Param("format")

	var req ExportRecipeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if req.RecipeData.Recipe == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No recipe data provided"})
		return
	}

	timestamp := time.Now().Format("20060102_150405")

	switch format {
	case "json":
		jsonData, err := json.MarshalIndent(req.RecipeData, "", "  ")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export recipe"})
			return
		}

		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="recipe_%s.json"`, timestamp))
		c.Data(http.StatusOK, "application/json", jsonData)

	case "txt":
		textContent := fmt.Sprintf(`Recipe Generated on %s

Ingredients Used: %s
Dietary Restrictions: %s
Cuisine Preference: %s
Serving Size: %d

%s
`, req.RecipeData.Timestamp, req.RecipeData.IngredientsUsed,
			getStringValue(req.RecipeData.DietaryRestrictions, "None"),
			getStringValue(req.RecipeData.CuisinePreference, "Any"),
			req.RecipeData.ServingSize, req.RecipeData.Recipe)

		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="recipe_%s.txt"`, timestamp))
		c.Data(http.StatusOK, "text/plain", []byte(textContent))

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid export format"})
	}
}

func (h *Handler) ValidateIngredients(c *gin.Context) {
	var req ValidateIngredientsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"valid": false, "message": "Invalid request format"})
		return
	}

	if req.Ingredients == "" {
		c.JSON(http.StatusOK, gin.H{"valid": false, "message": "No ingredients provided"})
		return
	}

	ingredientsList := make([]string, 0)
	for _, ingredient := range strings.Split(req.Ingredients, ",") {
		ingredient = strings.TrimSpace(ingredient)
		if ingredient != "" {
			ingredientsList = append(ingredientsList, ingredient)
		}
	}

	if len(ingredientsList) == 0 {
		c.JSON(http.StatusOK, gin.H{"valid": false, "message": "Please provide at least one ingredient"})
		return
	}

	if len(ingredientsList) > 20 {
		c.JSON(http.StatusOK, gin.H{"valid": false, "message": "Too many ingredients (maximum 20)"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":       true,
		"message":     fmt.Sprintf("Valid: %d ingredient(s) provided", len(ingredientsList)),
		"count":       len(ingredientsList),
		"ingredients": ingredientsList,
	})
}

func (h *Handler) GetRecipes(c *gin.Context) {
	page, exists := c.Get("page")
	if !exists {
		page = 1
	}
	perPage, exists := c.Get("per_page")
	if !exists {
		perPage = 10
	}
	search := c.Query("search")
	minRating := c.Query("min_rating")

	offset := (page.(int) - 1) * perPage.(int)

	query := h.db.Model(&models.Recipe{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR recipe_content ILIKE ?",
			searchPattern, searchPattern)
	}

	if minRating != "" {
		query = query.Where("rating >= ?", minRating)
	}

	var total int64
	query.Count(&total)

	var recipes []models.Recipe
	if err := query.Order("created_at DESC").Offset(offset).Limit(perPage.(int)).Find(&recipes).Error; err != nil {
		logrus.WithError(err).Error("Failed to fetch recipes")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recipes"})
		return
	}

	pages := (int(total) + perPage.(int) - 1) / perPage.(int)

	c.JSON(http.StatusOK, gin.H{
		"recipes":      recipes,
		"total":        total,
		"pages":        pages,
		"current_page": page,
		"per_page":     perPage,
	})
}

func (h *Handler) GetRecipe(c *gin.Context) {
	id, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recipe ID"})
		return
	}

	var recipe models.Recipe
	if err := h.db.First(&recipe, id.(uint)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
		} else {
			logrus.WithError(err).Error("Failed to fetch recipe")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recipe"})
		}
		return
	}

	c.JSON(http.StatusOK, recipe)
}

func (h *Handler) DeleteRecipe(c *gin.Context) {
	id, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recipe ID"})
		return
	}

	if err := h.db.Delete(&models.Recipe{}, id.(uint)).Error; err != nil {
		logrus.WithError(err).Error("Failed to delete recipe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete recipe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Recipe deleted successfully"})
}

func (h *Handler) UpdateRecipeRating(c *gin.Context) {
	id, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recipe ID"})
		return
	}

	var req struct {
		Rating int `json:"rating"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rating must be between 1 and 5 stars"})
		return
	}

	// Update only the rating field
	if err := h.db.Model(&models.Recipe{}).Where("id = ?", id.(uint)).Update("rating", req.Rating).Error; err != nil {
		logrus.WithError(err).Error("Failed to update recipe rating")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update recipe rating"})
		return
	}

	logrus.WithFields(logrus.Fields{
		"recipe_id": id.(uint),
		"rating":    req.Rating,
		"ip":        c.ClientIP(),
	}).Info("Recipe rating updated successfully")

	c.JSON(http.StatusOK, gin.H{
		"message": "Recipe rating updated successfully",
		"rating":  req.Rating,
	})
}

func (h *Handler) callAnthropicAPI(prompt string) (string, error) {
	reqBody := AnthropicRequest{
		Model:       h.cfg.ClaudeModel,
		MaxTokens:   2000,
		Temperature: 0.7,
		Messages: []AnthropicMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", h.cfg.AnthropicAPIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var anthropicResp AnthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(anthropicResp.Content) == 0 {
		return "", fmt.Errorf("no content in response")
	}

	return anthropicResp.Content[0].Text, nil
}

func getStringValue(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}
