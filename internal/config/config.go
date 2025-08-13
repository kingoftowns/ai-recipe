package config

import (
	"os"
)

type Config struct {
	DatabaseURL     string
	AnthropicAPIKey string
	ClaudeModel     string
	SecretKey       string
	Environment     string
}

func Load() *Config {
	return &Config{
		DatabaseURL:     getEnv("DATABASE_URL", "postgresql://recipe_user:recipe_dev_password@localhost:5432/recipe_db?sslmode=disable"),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", "some-api-key"),
		ClaudeModel:     getEnv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
		SecretKey:       getEnv("SECRET_KEY", "dev-secret-key-change-in-production"),
		Environment:     getEnv("GIN_MODE", "debug"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}