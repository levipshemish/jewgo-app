#!/usr/bin/env python3
"""
JewGo Backend API Server - Application Entry Point
=================================================

This module serves as the entry point for the Flask application.
It imports the Flask app from app_factory and exposes it for Gunicorn.

Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""

from app_factory import create_app
from utils.config_manager import ConfigManager

# Create the Flask application instance
app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=ConfigManager.get_port(),
        debug=not ConfigManager.is_production(),
    )
