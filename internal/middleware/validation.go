package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ValidationMiddleware struct{}

func NewValidationMiddleware() *ValidationMiddleware {
	return &ValidationMiddleware{}
}

func (v *ValidationMiddleware) ValidateRecipeRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != "POST" {
			c.Next()
			return
		}

		var req struct {
			Ingredients         string `json:"ingredients"`
			DietaryRestrictions string `json:"dietary_restrictions"`
			CuisinePreference   string `json:"cuisine_preference"`
			ServingSize         int    `json:"serving_size"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if strings.TrimSpace(req.Ingredients) == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Ingredients field is required",
			})
			c.Abort()
			return
		}

		ingredients := strings.Split(req.Ingredients, ",")
		if len(ingredients) > 20 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Too many ingredients (maximum 20)",
			})
			c.Abort()
			return
		}

		if req.ServingSize < 1 || req.ServingSize > 12 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Serving size must be between 1 and 12",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func (v *ValidationMiddleware) ValidateIDParam() gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		if idStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
			c.Abort()
			return
		}

		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil || id == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
			c.Abort()
			return
		}

		c.Set("id", uint(id))
		c.Next()
	}
}

func (v *ValidationMiddleware) ValidatePagination() gin.HandlerFunc {
	return func(c *gin.Context) {
		pageStr := c.DefaultQuery("page", "1")
		perPageStr := c.DefaultQuery("per_page", "10")

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}

		perPage, err := strconv.Atoi(perPageStr)
		if err != nil || perPage < 1 || perPage > 100 {
			perPage = 10
		}

		c.Set("page", page)
		c.Set("per_page", perPage)
		c.Next()
	}
}