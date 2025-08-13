package config

import (
	"os"
	"strings"
)

type Config struct {
	DatabaseURL     string
	AnthropicAPIKey string
	ClaudeModel     string
	SecretKey       string
	Environment     string
	AllowedOrigins  []string
	Port            string
}

func Load() *Config {
	return &Config{
		DatabaseURL:     getEnv("DATABASE_URL", "postgresql://recipe_user:recipe_dev_password@localhost:5432/recipe_db?sslmode=disable"),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		ClaudeModel:     getEnv("CLAUDE_MODEL", "claude-3-haiku-20240307"),
		SecretKey:       getEnv("SECRET_KEY", ""),
		Environment:     getEnv("GIN_MODE", "debug"),
		AllowedOrigins:  getAllowedOrigins(),
		Port:            getEnv("PORT", "8000"),
	}
}

func getAllowedOrigins() []string {
	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
	if origins == "" {
		return []string{}
	}

	var result []string
	for _, origin := range splitAndTrim(origins, ",") {
		if origin != "" {
			result = append(result, origin)
		}
	}
	return result
}

func splitAndTrim(s, sep string) []string {
	parts := strings.Split(s, sep)
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
