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
import os
from app_factory_full import create_app
from utils.config_manager import config_manager

# Create the Flask application instance
app, socketio = create_app()  # Unpack the tuple returned by create_app

if __name__ == "__main__":
    # Get environment configuration
    is_production = config_manager.get("environment.production", False)
    environment_name = config_manager.get("environment.name", "development")
    
    # Get port from environment variable, fallback to 8082
    port = int(os.environ.get("PORT", 8082))
    
    print(f"Starting JewGo backend on port {port}")
    app.run(
        host="0.0.0.0",
        port=port,  # Use environment variable PORT
        debug=not is_production,  # Debug mode for non-production environments
    )
