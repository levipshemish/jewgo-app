"""
Security Headers Middleware
==========================

This middleware applies comprehensive security headers to all HTTP responses,
including CSP, HSTS, and other security-related headers.
"""

from flask import g, request, jsonify
from utils.logging_config import get_logger
from config.security_config import get_security_config

logger = get_logger(__name__)


class SecurityHeadersMiddleware:
    """Middleware for applying security headers to HTTP responses."""
    
    def __init__(self, app=None):
        self.app = app
        self.security_config = get_security_config()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        self.app = app
        self._register_hooks()
        logger.info("Security headers middleware initialized")
    
    def _register_hooks(self):
        """Register before/after request hooks."""
        
        @self.app.after_request
        def add_security_headers(response):
            """Add security headers to all responses."""
            try:
                # Add security headers
                for header, value in self.security_config.get_security_headers().items():
                    response.headers[header] = value
                
                # Add environment-specific headers
                self._add_environment_headers(response)
                
                # Add request-specific headers
                self._add_request_headers(response)
                
                # Log security header application (debug only)
                if self.security_config.is_debug_enabled():
                    logger.debug(f"Applied security headers to {request.method} {request.path}")
                
            except Exception as e:
                logger.error(f"Error applying security headers: {e}")
            
            return response
        
        @self.app.before_request
        def validate_request_security():
            """Validate request security before processing."""
            try:
                # Check for suspicious patterns
                self._check_suspicious_patterns()
                
                # Validate content type for POST/PUT requests
                self._validate_content_type()
                
            except Exception as e:
                logger.error(f"Error in request security validation: {e}")
    
    def _add_environment_headers(self, response):
        """Add environment-specific headers."""
        if self.security_config.is_production:
            # Production-specific headers
            response.headers["Server"] = "JewGo-API"  # Hide server details
            response.headers["X-Powered-By"] = ""  # Remove X-Powered-By header
        else:
            # Development headers
            response.headers["X-Environment"] = "development"
    
    def _add_request_headers(self, response):
        """Add request-specific headers."""
        # Add correlation ID for request tracing
        if hasattr(g, 'correlation_id'):
            response.headers["X-Correlation-ID"] = g.correlation_id
        
        # Add response time header
        if hasattr(g, 'request_start_time'):
            import time
            response_time = time.time() - g.request_start_time
            response.headers["X-Response-Time"] = f"{response_time:.3f}s"
    
    def _check_suspicious_patterns(self):
        """Check for suspicious patterns in the request."""
        suspicious_patterns = [
            "union select", "drop table", "insert into", "delete from",
            "<script", "javascript:", "onload=", "onerror=",
            "../", "..\\", "/etc/passwd", "\\windows\\system32"
        ]
        
        request_data = str(request.get_json() or {}) + str(request.args) + str(request.form)
        request_data = request_data.lower()
        
        for pattern in suspicious_patterns:
            if pattern in request_data:
                logger.warning(
                    f"Suspicious pattern detected: {pattern}",
                    extra={
                        "pattern": pattern,
                        "path": request.path,
                        "method": request.method,
                        "ip": request.remote_addr,
                        "user_agent": request.headers.get("User-Agent", "")
                    }
                )
                break
    
    def _validate_content_type(self):
        """Validate content type for POST/PUT requests."""
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("Content-Type", "")
            
            # Allow JSON and form data
            if not any(content_type.startswith(ct) for ct in [
                "application/json",
                "application/x-www-form-urlencoded",
                "multipart/form-data"
            ]):
                logger.warning(
                    f"Invalid content type for {request.method} request: {content_type}",
                    extra={
                        "content_type": content_type,
                        "path": request.path,
                        "ip": request.remote_addr
                    }
                )


def register_security_headers_middleware(app):
    """Register security headers middleware with Flask app."""
    middleware = SecurityHeadersMiddleware(app)
    logger.info("Security headers middleware registered successfully")
    return middleware