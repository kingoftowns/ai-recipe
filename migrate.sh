#!/bin/sh

# Migration script for Recipe AI Go
# Usage: ./migrate.sh [up|down] [steps]

direction="${1:-up}"
steps="${2:-0}"

echo "Running database migrations..."
go run cmd/migrate/main.go -direction="$direction" -steps="$steps"