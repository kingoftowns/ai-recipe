package models

import (
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

type Recipe struct {
	ID                  uint      `json:"id" gorm:"primary_key"`
	Title               string    `json:"title" gorm:"not null;size:200"`
	RecipeContent       string    `json:"recipe" gorm:"not null;type:text"`
	IngredientsUsed     string    `json:"ingredients_used" gorm:"not null;type:text"`
	DietaryRestrictions *string   `json:"dietary_restrictions" gorm:"size:100"`
	CuisinePreference   *string   `json:"cuisine_preference" gorm:"size:100"`
	ServingSize         int       `json:"serving_size" gorm:"default:4"`
	CreatedAt           time.Time `json:"timestamp"`
	UpdatedAt           time.Time `json:"-"`
}

func (Recipe) TableName() string {
	return "recipes"
}

func (r *Recipe) BeforeCreate(tx *gorm.DB) error {
	if r.Title == "" {
		r.Title = ExtractTitleFromContent(r.RecipeContent)
	}
	return nil
}

func ExtractTitleFromContent(content string) string {
	lines := strings.Split(strings.TrimSpace(content), "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Recipe Generated") {
			continue
		}

		prefixes := []string{"Recipe Name:", "Recipe:", "Title:", "**", "#", "*"}
		for _, prefix := range prefixes {
			if strings.HasPrefix(line, prefix) {
				line = strings.TrimSpace(line[len(prefix):])
			}
		}

		line = regexp.MustCompile(`\*+`).ReplaceAllString(line, "")
		line = strings.TrimSpace(line)

		if len(line) > 3 && len(line) < 100 {
			return line
		}
	}

	if len(lines) > 0 {
		firstLine := lines[0]
		if len(firstLine) > 50 {
			return firstLine[:50] + "..."
		}
		return firstLine
	}

	return "Untitled Recipe"
}
