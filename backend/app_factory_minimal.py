# !/usr/bin/env python3
"""
Minimal working version of app_factory.py for testing Docker setup
"""
from flask import Flask, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    # Configure CORS
    CORS(
        app,
        origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "https://jewgo.com",
            "https://www.jewgo.com",
            "https://app.jewgo.com",
            "jewgo.app",
        ],
    )

    # Health check endpoint
    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        try:
            return (
                jsonify(
                    {
                        "status": "healthy",
                        "message": "JewGo Backend is running",
                        "version": "1.0.0",
                    }
                ),
                200,
            )
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return jsonify({"status": "unhealthy", "error": str(e)}), 500

    # Root endpoint
    @app.route("/", methods=["GET"])
    def root():
        """Root endpoint"""
        return (
            jsonify(
                {
                    "message": "JewGo Backend API",
                    "version": "1.0.0",
                    "status": "running",
                }
            ),
            200,
        )

    # API info endpoint
    @app.route("/api", methods=["GET"])
    def api_info():
        """API information endpoint"""
        return (
            jsonify(
                {
                    "name": "JewGo Backend API",
                    "version": "1.0.0",
                    "description": "Kosher Restaurant Discovery Platform API",
                    "endpoints": {"health": "/health", "api_info": "/api", "root": "/"},
                }
            ),
            200,
        )

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return (
            jsonify(
                {
                    "error": "Not found",
                    "message": "The requested resource was not found",
                }
            ),
            404,
        )

    @app.errorhandler(500)
    def internal_error(error):
        return (
            jsonify(
                {
                    "error": "Internal server error",
                    "message": "An unexpected error occurred",
                }
            ),
            500,
        )

    logger.info("JewGo Backend application created successfully")
    return app


# For development
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
