"""
Comprehensive Security Headers Middleware for v5 API.

Implements security headers, correlation ID generation, and cache control
for authentication endpoints according to security hardening requirements.
"""

from __future__ import annotations

import uuid
import time
from typing import Dict, Any, Optional
from flask import Flask, request, g, Response
from utils.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersV5Middleware:
    """Comprehensive security headers middleware with correlation ID support."""
    
    # Security headers to apply to all responses
    SECURITY_HEADERS = {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-XSS-Protection': '1; mode=block',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }
    
    # Cache control headers for auth endpoints
    AUTH_CACHE_HEADERS = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
    }
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask) -> None:
        """Initialize the middleware with Flask app."""
        self.app = app
        self._register_middleware()
        logger.info("Security headers v5 middleware initialized")
    
    def _register_middleware(self) -> None:
        """Register before/after request hooks for security headers."""
        
        @self.app.before_request
        def _generate_correlation_id():
            """Generate correlation ID for request tracing."""
            try:
                # Generate correlation ID if not already present
                correlation_id = request.headers.get('X-Correlation-ID')
                if not correlation_id:
                    correlation_id = str(uuid.uuid4())
                
                # Store in Flask g for use throughout request
                g.correlation_id = correlation_id
                g.request_start_time = time.time()
                
                logger.debug(f"Correlation ID generated: {correlation_id}")
                
            except Exception as e:
                logger.error(f"Error generating correlation ID: {e}")
                # Fallback correlation ID
                g.correlation_id = f"fallback-{int(time.time())}"
        
        @self.app.after_request
        def _add_security_headers(response: Response) -> Response:
            """Add comprehensive security headers to all responses."""
            try:
                # Add standard security headers
                for header, value in self.SECURITY_HEADERS.items():
                    response.headers[header] = value
                
                # Add correlation ID header for tracing
                if hasattr(g, 'correlation_id'):
                    response.headers['X-Correlation-ID'] = g.correlation_id
                
                # Add request timing header for debugging
                if hasattr(g, 'request_start_time'):
                    request_time = (time.time() - g.request_start_time) * 1000
                    response.headers['X-Response-Time'] = f"{request_time:.2f}ms"
                
                # Add cache control headers for auth endpoints
                if self._is_auth_endpoint(request.path):
                    for header, value in self.AUTH_CACHE_HEADERS.items():
                        response.headers[header] = value
                    
                    logger.debug(f"Auth cache headers applied to {request.path}")
                
                # Add HSTS header only for HTTPS requests
                if request.is_secure:
                    response.headers['Strict-Transport-Security'] = self.SECURITY_HEADERS['Strict-Transport-Security']
                
                # Add CSP header for HTML responses
                if response.content_type and 'text/html' in response.content_type:
                    response.headers['Content-Security-Policy'] = (
                        "default-src 'self'; "
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                        "style-src 'self' 'unsafe-inline'; "
                        "img-src 'self' data: https:; "
                        "font-src 'self' data:; "
                        "connect-src 'self'; "
                        "frame-ancestors 'none';"
                    )
                
                return response
                
            except Exception as e:
                logger.error(f"Error adding security headers: {e}")
                return response
    
    def _is_auth_endpoint(self, path: str) -> bool:
        """Check if the request path is an authentication endpoint."""
        auth_patterns = [
            '/api/v5/auth/',
            '/api/auth/',
            '/auth/',
            '/login',
            '/logout',
            '/register',
            '/verify-token',
            '/refresh-token',
            '/csrf',
        ]
        
        return any(pattern in path for pattern in auth_patterns)
    
    def get_correlation_id(self) -> Optional[str]:
        """Get the current request's correlation ID."""
        return getattr(g, 'correlation_id', None)
    
    def get_security_headers_config(self) -> Dict[str, str]:
        """Get the current security headers configuration."""
        return self.SECURITY_HEADERS.copy()
    
    def get_auth_cache_headers_config(self) -> Dict[str, str]:
        """Get the auth cache headers configuration."""
        return self.AUTH_CACHE_HEADERS.copy()


def register_security_headers_v5_middleware(app: Flask) -> SecurityHeadersV5Middleware:
    """Register security headers v5 middleware with Flask app."""
    middleware = SecurityHeadersV5Middleware(app)
    logger.info("Security headers v5 middleware registered successfully")
    return middleware


def get_correlation_id() -> Optional[str]:
    """Get the current request's correlation ID from Flask g."""
    return getattr(g, 'correlation_id', None)


def add_correlation_id_to_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Add correlation ID to a dictionary for logging/response purposes."""
    correlation_id = get_correlation_id()
    if correlation_id:
        data['correlation_id'] = correlation_id
    return data


def create_security_response(data: Dict[str, Any], status_code: int = 200) -> Response:
    """Create a response with security headers and correlation ID."""
    from flask import jsonify
    
    # Add correlation ID to response data
    response_data = add_correlation_id_to_dict(data.copy())
    
    # Create response
    response = jsonify(response_data)
    response.status_code = status_code
    
    return response