#!/usr/bin/env python3
"""
JewGo Backend API Server - Root Entry Point
===========================================

This module serves as the root entry point for the Flask application.
It imports the Flask app from the backend and exposes it for Gunicorn.

Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import the Flask app from the backend
try:
    from wsgi import app
    print("Successfully imported Flask app from backend")
except ImportError as e:
    print(f"Error importing Flask app: {e}")
    # Create a simple Flask app as fallback
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def health_check():
        return {'status': 'ok', 'message': 'JewGo Backend is running'}

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('ENVIRONMENT', 'development') != 'production',
    )
