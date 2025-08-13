#!/bin/bash
# Script to run database migrations

set -e

echo "Running database migrations..."

# Set Flask app
export FLASK_APP=app.py

# Run migrations
flask db upgrade

echo "Migrations completed successfully!"