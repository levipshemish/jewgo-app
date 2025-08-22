from app_factory import create_app

# Import ConfigManager with fallback
try:
    from utils.config_manager import ConfigManager
except ImportError:
    # Fallback ConfigManager if the module is not available
    class ConfigManager:
        @staticmethod
        def get_port():
            import os
            return int(os.getenv("PORT", 5000))

        @staticmethod
        def is_production():
            import os
            return os.getenv("ENVIRONMENT", "development") == "production"

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
