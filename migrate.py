#!/usr/bin/env python3
"""
Database migration script for Kubernetes deployments.
This script should be run as a Kubernetes Job before the main application starts.
"""
import os
import sys
from flask_migrate import upgrade
from app import app

def run_migrations():
    """Run database migrations"""
    print("Starting database migrations...")
    
    try:
        with app.app_context():
            # Run migrations
            upgrade()
            print("Database migrations completed successfully!")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_migrations()