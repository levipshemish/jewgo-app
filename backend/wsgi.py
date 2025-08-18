from app_factory import create_app

    from utils.config_manager import ConfigManager




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
    app.run(
        host="0.0.0.0",
        port=ConfigManager.get_port(),
        debug=not ConfigManager.is_production(),
    )
