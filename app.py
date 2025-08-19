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
from wsgi import app

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('ENVIRONMENT', 'development') != 'production',
    )
