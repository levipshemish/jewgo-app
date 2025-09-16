"""
CORS Handler for Authentication API.

Provides environment-aware CORS handling with multiple origin support,
preflight request handling, and proper credentials support.
"""
import re
from typing import List, Optional, Dict, Any
from flask import Request, Response, make_response
from services.auth.cookies import CookiePolicyManager


class CORSHandler:
    """
    Handles CORS (Cross-Origin Resource Sharing) for authentication endpoints.
    
    Features:
    - Exact origin matching from FRONTEND_ORIGINS environment variable
    - Support for multiple origins including wildcard patterns
    - Preflight request handling with proper credentials support
    - Vary: Origin header for proper caching
    - HEAD method support in preflight responses
    """
    
    def __init__(self, allowed_origins: Optional[List[str]] = None):
        """
        Initialize CORS Handler.
        
        Args:
            allowed_origins: List of allowed origins. If None, will be detected from environment
        """
        if allowed_origins is None:
            # Use CookiePolicyManager to get environment-aware CORS origins
            policy_manager = CookiePolicyManager()
            self.allowed_origins = policy_manager.get_cors_origins()
        else:
            self.allowed_origins = allowed_origins
        
        # Compile regex patterns for wildcard origins
        self._compiled_patterns = []
        self._exact_origins = []
        
        for origin in self.allowed_origins:
            if '*' in origin:
                # Convert wildcard pattern to regex
                pattern = origin.replace('*', '[^.]+')  # Match any subdomain
                pattern = pattern.replace('.', r'\.')   # Escape dots
                pattern = f'^{pattern}$'
                self._compiled_patterns.append(re.compile(pattern))
            else:
                self._exact_origins.append(origin)
    
    def is_origin_allowed(self, origin: str) -> bool:
        """
        Check if an origin is allowed.
        
        Args:
            origin: The origin to check
            
        Returns:
            True if origin is allowed, False otherwise
        """
        if not origin:
            return False
        
        # Check exact matches first
        if origin in self._exact_origins:
            return True
        
        # Check wildcard patterns
        for pattern in self._compiled_patterns:
            if pattern.match(origin):
                return True
        
        return False
    
    def handle_preflight(self, request: Request, origin: str) -> Optional[Response]:
        """
        Handle CORS preflight requests (OPTIONS method).
        
        Args:
            request: Flask request object
            origin: Origin header value
            
        Returns:
            Response object for preflight request, or None if not a preflight request
        """
        if request.method != 'OPTIONS':
            return None
        
        # Check if this is a CORS preflight request
        if not request.headers.get('Access-Control-Request-Method'):
            return None
        
        if not self.is_origin_allowed(origin):
            # Return 403 for disallowed origins
            response = make_response('', 403)
            return response
        
        # Create preflight response
        response = make_response('', 204)  # No Content
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Vary'] = 'Origin'
        
        # Allow common HTTP methods including HEAD
        allowed_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
        response.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
        
        # Allow common headers
        allowed_headers = [
            'Content-Type',
            'Authorization',
            'X-CSRF-Token',
            'X-Requested-With',
            'Accept',
            'Origin',
            'Cache-Control',
            'Pragma'
        ]
        
        # Include requested headers
        requested_headers = request.headers.get('Access-Control-Request-Headers')
        if requested_headers:
            # Add requested headers to allowed headers
            for header in requested_headers.split(','):
                header = header.strip()
                if header not in allowed_headers:
                    allowed_headers.append(header)
        
        response.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
        
        # Set max age for preflight cache
        response.headers['Access-Control-Max-Age'] = '86400'  # 24 hours
        
        return response
    
    def add_cors_headers(self, response: Response, origin: str) -> Response:
        """
        Add CORS headers to a response.
        
        Args:
            response: Flask response object
            origin: Origin header value
            
        Returns:
            Response object with CORS headers added
        """
        if not self.is_origin_allowed(origin):
            return response
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Vary'] = 'Origin'
        
        return response
    
    def get_cors_config(self) -> Dict[str, Any]:
        """
        Get current CORS configuration.
        
        Returns:
            Dictionary with CORS configuration details
        """
        return {
            'allowed_origins': self.allowed_origins,
            'exact_origins_count': len(self._exact_origins),
            'wildcard_patterns_count': len(self._compiled_patterns),
            'supports_credentials': True,
            'max_age': 86400,
            'allowed_methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            'default_allowed_headers': [
                'Content-Type',
                'Authorization', 
                'X-CSRF-Token',
                'X-Requested-With',
                'Accept',
                'Origin',
                'Cache-Control',
                'Pragma'
            ]
        }
    
    def validate_configuration(self) -> Dict[str, Any]:
        """
        Validate CORS configuration.
        
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'origins_configured': len(self.allowed_origins),
            'exact_origins': self._exact_origins,
            'wildcard_patterns': [pattern.pattern for pattern in self._compiled_patterns]
        }
        
        # Validation checks
        if not self.allowed_origins:
            validation_result['errors'].append("No CORS origins configured")
            validation_result['valid'] = False
        
        # Check for overly permissive patterns
        for origin in self.allowed_origins:
            if origin == '*':
                validation_result['errors'].append("Wildcard '*' origin is not secure")
                validation_result['valid'] = False
            elif origin.startswith('http://') and not origin.startswith('http://localhost'):
                validation_result['warnings'].append(f"HTTP origin detected: {origin} (consider HTTPS)")
        
        # Check for localhost in production
        policy_manager = CookiePolicyManager()
        if policy_manager.environment == 'production':
            for origin in self.allowed_origins:
                if 'localhost' in origin or '127.0.0.1' in origin:
                    validation_result['warnings'].append(f"Localhost origin in production: {origin}")
        
        return validation_result


def create_cors_middleware(cors_handler: CORSHandler):
    """
    Create a Flask middleware function for CORS handling.
    
    Args:
        cors_handler: CORSHandler instance
        
    Returns:
        Middleware function that can be used with Flask
    """
    def cors_middleware(app):
        @app.before_request
        def handle_cors_preflight():
            from flask import request
            origin = request.headers.get('Origin')
            if origin:
                preflight_response = cors_handler.handle_preflight(request, origin)
                if preflight_response:
                    return preflight_response
        
        @app.after_request
        def add_cors_headers(response):
            from flask import request
            origin = request.headers.get('Origin')
            if origin:
                response = cors_handler.add_cors_headers(response, origin)
            return response
        
        return app
    
    return cors_middleware