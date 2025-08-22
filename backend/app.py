#!/usr/bin/env python3
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
from utils.config_manager import ConfigManager

# Create the Flask application instance
app, socketio = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8082,  # Use port 8082 to avoid conflicts
        debug=not ConfigManager.is_production(),
    )
