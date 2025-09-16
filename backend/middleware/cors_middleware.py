"""
CORS Middleware for Flask application.

Provides proper CORS handling with dynamic origin validation,
credentials support, and preflight request handling.
"""

from flask import request, make_response
from typing import List, Optional
import os
import re
from utils.logging_config import get_logger

logger = get_logger(__name__)


class CORSMiddleware:
    """CORS middleware with dynamic origin validation."""
    
    def __init__(self, app=None):
        self.app = app
        self.allowed_origins = self._get_allowed_origins()
        self.allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
        self.allowed_headers = [
            "Authorization", 
            "Content-Type", 
            "X-Requested-With", 
            "X-CSRF-Token", 
            "Accept", 
            "Origin"
        ]
        
        if app:
            self.init_app(app)
    
    def _get_allowed_origins(self) -> List[str]:
        """Get allowed origins from environment or defaults."""
        origins_env = os.getenv("CORS_ORIGINS", "")
        if origins_env:
            origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
        else:
            # Default origins
            origins = [
                "https://jewgo.app",
                "https://www.jewgo.app", 
                "https://app.jewgo.app",
                "https://staging.jewgo.app",
                "https://app-staging.jewgo.app",
            ]
            
            # Add development origins if not in production
            if os.getenv("FLASK_ENV") != "production":
                origins.extend([
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:3001",
                    "http://127.0.0.1:3001",
                    "https://localhost:3000",
                    "https://127.0.0.1:3000",
                ])
        
        logger.info(f"CORS allowed origins: {origins}")
        return origins
    
    def _is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed."""
        if not origin:
            return False
        
        # Exact match
        if origin in self.allowed_origins:
            return True
        
        # Wildcard patterns for Vercel/Netlify deployments
        for allowed_origin in self.allowed_origins:
            if "*" in allowed_origin:
                pattern = allowed_origin.replace("*", ".*")
                if re.match(pattern, origin):
                    return True
        
        return False
    
    def _add_cors_headers(self, response, origin: Optional[str] = None):
        """Add CORS headers to response."""
        # Check if Nginx is already handling CORS (avoid duplicates)
        if 'Access-Control-Allow-Origin' in response.headers:
            logger.debug("Nginx already handling CORS, skipping Flask CORS headers")
            return response
        
        if origin and self._is_origin_allowed(origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        else:
            # Don't set origin if not allowed
            response.headers['Access-Control-Allow-Credentials'] = 'false'
        
        response.headers['Access-Control-Allow-Methods'] = ', '.join(self.allowed_methods)
        response.headers['Access-Control-Allow-Headers'] = ', '.join(self.allowed_headers)
        response.headers['Access-Control-Max-Age'] = '86400'
        response.headers['Vary'] = 'Origin'
        
        return response
    
    def init_app(self, app):
        """Initialize CORS middleware with Flask app."""
        
        @app.before_request
        def handle_preflight():
            """Handle preflight OPTIONS requests."""
            if request.method == 'OPTIONS':
                origin = request.headers.get('Origin')
                response = make_response('', 204)
                # Only add CORS headers if Nginx isn't already handling them
                if 'Access-Control-Allow-Origin' not in response.headers:
                    response = self._add_cors_headers(response, origin)
                return response
        
        @app.after_request
        def add_cors_headers(response):
            """Add CORS headers to all responses."""
            origin = request.headers.get('Origin')
            response = self._add_cors_headers(response, origin)
            return response
        
        logger.info("CORS middleware initialized")


def create_cors_middleware(app) -> CORSMiddleware:
    """Create and initialize CORS middleware."""
    return CORSMiddleware(app)
