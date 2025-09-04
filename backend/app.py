# !/usr/bin/env python3
"""
JewGo Backend API Server - Application Entry Point
=================================================
This module serves as the entry point for the Flask application.
It imports the Flask app from app_factory_full and exposes it for Gunicorn.
Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""
from app_factory import create_app
from utils.config_manager import config_manager

# Create the Flask application instance
app = create_app()
if __name__ == "__main__":
    # Get environment configuration
    is_production = config_manager.get("environment.production", False)
    environment_name = config_manager.get("environment.name", "development")
    app.run(
        host="0.0.0.0",
        port=8083,  # Use port 8083 to avoid conflicts
        debug=not is_production,  # Debug mode for non-production environments
    )
