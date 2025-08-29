from app_factory import create_app
import os

# Import config_manager with fallback
try:
    from utils.config_manager import config_manager
except ImportError:
    # Fallback config if the module is not available
    config_manager = type(
        "ConfigManager",
        (),
        {
            "get": lambda self, key, default=None: os.getenv(
                key.upper().replace(".", "_"), default
            )
        },
    )()

"""
WSGI Entry Point for JewGo Backend
==================================

This module provides a clean WSGI entry point for production servers like Gunicorn.

Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""

# Create the Flask application instance
app = create_app()

if __name__ == "__main__":
    # Get environment configuration
    is_production = config_manager.get("environment.production", False)
    server_port = int(config_manager.get("server.port", 5000))

    app.run(
        host="0.0.0.0",
        port=server_port,
        debug=not is_production,  # Debug mode for non-production environments
    )
