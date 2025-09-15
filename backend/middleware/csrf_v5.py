"""
CSRF Protection Middleware for JewGo Authentication System

Provides comprehensive CSRF protection with blueprint-wide before_request hooks,
secure token validation, and environment-aware cookie management.
"""

import os
from typing import Optional, Set
from functools import wraps
from flask import request, jsonify, g, make_response, Blueprint

from utils.csrf_manager import get_csrf_manager
from utils.logging_config import get_logger

logger = get_logger(__name__)


class CSRFMiddleware:
    """
    CSRF Protection Middleware for Flask applications.
    
    Features:
    - Blueprint-wide before_request hooks for mutating HTTP methods
    - Secure CSRF token validation with timing attack protection
    - Environment-aware cookie configuration
    - Integration with existing authentication system
    """
    
    # HTTP methods that require CSRF protection
    PROTECTED_METHODS: Set[str] = {'POST', 'PUT', 'PATCH', 'DELETE'}
    
    # Endpoints that are exempt from CSRF protection
    EXEMPT_ENDPOINTS: Set[str] = {
        'auth_api.csrf_token',  # CSRF token endpoint itself
        'monitoring_v5.health',  # Health check endpoints
        'monitoring_v5.metrics',  # Metrics endpoints
    }
    
    def __init__(self, app=None):
        self.app = app
        self.csrf_manager = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize CSRF middleware with Flask app."""
        self.app = app
        self.csrf_manager = get_csrf_manager()
        
        # Register global before_request hook
        app.before_request(self._csrf_protect)
        
        logger.info("CSRF middleware initialized successfully")
    
    def _csrf_protect(self):
        """
        Main CSRF protection hook that runs before each request.
        
        Validates CSRF tokens for mutating HTTP methods and returns
        403 Forbidden for missing or invalid tokens.
        """
        # Skip non-mutating methods
        if request.method not in self.PROTECTED_METHODS:
            return
        
        # Skip exempt endpoints
        if request.endpoint in self.EXEMPT_ENDPOINTS:
            return
        
        # Skip if route is marked as CSRF exempt
        if self._is_csrf_exempt():
            return
        
        # Skip non-API endpoints (only protect /api/ routes)
        if not request.path.startswith('/api/'):
            return
        
        try:
            # Get session ID from authenticated user or generate anonymous session
            session_id = self._get_session_id()
            if not session_id:
                logger.warning(f"CSRF protection failed: No session ID for {request.method} {request.path}")
                return self._create_csrf_error_response("No session available for CSRF protection")
            
            # Extract CSRF token from request
            csrf_token = self._extract_csrf_token()
            if not csrf_token:
                logger.warning(f"CSRF protection failed: Missing token for {request.method} {request.path}")
                return self._create_csrf_error_response("CSRF token required")
            
            # Validate CSRF token
            user_agent = request.headers.get('User-Agent', '')
            logger.debug(f"CSRF validation: session_id={session_id}, user_agent={repr(user_agent)}, token={csrf_token[:50]}...")
            is_valid = self.csrf_manager.validate_token(csrf_token, session_id, user_agent)
            
            if not is_valid:
                logger.warning(f"CSRF protection failed: Invalid token for {request.method} {request.path}")
                return self._create_csrf_error_response("Invalid CSRF token")
            
            # Store validation success in request context
            g.csrf_validated = True
            logger.debug(f"CSRF token validated successfully for {request.method} {request.path}")
            
        except Exception as e:
            logger.error(f"CSRF protection error: {e}")
            return self._create_csrf_error_response("CSRF validation failed")
    
    def _get_session_id(self) -> Optional[str]:
        """
        Get session ID for CSRF token validation.
        
        Returns:
            Session ID from authenticated user or anonymous session
        """
        from utils.request_utils import get_session_id
        return get_session_id()
    
    def _extract_csrf_token(self) -> Optional[str]:
        """
        Extract CSRF token from request.
        
        Checks multiple sources in order of preference:
        1. X-CSRF-Token header
        2. X-CSRFToken header (alternative name)
        3. csrf_token form field
        4. _csrf_token cookie (double-submit pattern)
        
        Returns:
            CSRF token string or None if not found
        """
        # Check headers first (preferred method)
        token = request.headers.get('X-CSRF-Token')
        if token:
            return token
        
        token = request.headers.get('X-CSRFToken')
        if token:
            return token
        
        # Check form data for non-JSON requests
        if request.form:
            token = request.form.get('csrf_token')
            if token:
                return token
        
        # Check JSON body for JSON requests
        if request.is_json and request.json:
            token = request.json.get('csrf_token')
            if token:
                return token
        
        # Check cookies (double-submit pattern)
        token = request.cookies.get('_csrf_token')
        if token:
            return token
        
        return None
    
    def _get_client_ip(self) -> str:
        """Get client IP address with proxy support."""
        # Check X-Forwarded-For header
        xff = request.headers.get('X-Forwarded-For')
        if xff:
            # Get first IP from comma-separated list
            ip = xff.split(',')[0].strip()
            return ip
        
        # Check X-Real-IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fallback to remote_addr
        return request.remote_addr or 'unknown'
    
    def _create_csrf_error_response(self, message: str):
        """
        Create standardized CSRF error response.
        
        Args:
            message: Error message
            
        Returns:
            Flask response with 403 status code
        """
        correlation_id = getattr(g, 'correlation_id', None)
        
        error_response = {
            'success': False,
            'error': {
                'type': 'CSRF_PROTECTION_FAILED',
                'message': message,
                'code': 403,
                'correlation_id': correlation_id
            },
            'timestamp': self._get_current_timestamp()
        }
        
        response = make_response(jsonify(error_response), 403)
        
        # Add security headers
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        
        return response
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
    
    def _is_csrf_exempt(self) -> bool:
        """Check if the current route is exempt from CSRF protection."""
        try:
            # Get the view function for the current endpoint
            if request.endpoint:
                view_func = self.app.view_functions.get(request.endpoint)
                if view_func and hasattr(view_func, '_csrf_exempt'):
                    return view_func._csrf_exempt
            return False
        except Exception:
            return False


def register_csrf_middleware(app) -> None:
    """
    Register CSRF middleware with Flask app.
    
    Args:
        app: Flask application instance
    """
    csrf_middleware = CSRFMiddleware(app)
    logger.info("CSRF middleware registered successfully")


def register_csrf_blueprint_protection(blueprint: Blueprint) -> None:
    """
    Register CSRF protection for a specific blueprint.
    
    This provides blueprint-specific CSRF protection in addition to
    the global middleware protection.
    
    Args:
        blueprint: Flask blueprint to protect
    """
    csrf_manager = get_csrf_manager()
    
    @blueprint.before_request
    def _blueprint_csrf_protect():
        """Blueprint-specific CSRF protection."""
        # Skip if already validated by global middleware
        if getattr(g, 'csrf_validated', False):
            return
        
        # Skip non-mutating methods
        if request.method not in CSRFMiddleware.PROTECTED_METHODS:
            return
        
        # Skip exempt endpoints
        if request.endpoint in CSRFMiddleware.EXEMPT_ENDPOINTS:
            return
        
        try:
            # Get session ID
            if hasattr(g, 'user') and g.user:
                user_id = g.user.get('user_id')
                session_id = f"user:{user_id}" if user_id else f"anon:{request.remote_addr}"
            else:
                session_id = f"anon:{request.remote_addr}"
            
            # Extract and validate CSRF token
            csrf_token = (
                request.headers.get('X-CSRF-Token') or
                request.headers.get('X-CSRFToken') or
                (request.form.get('csrf_token') if request.form else None) or
                (request.json.get('csrf_token') if request.is_json and request.json else None) or
                request.cookies.get('_csrf_token')
            )
            
            if not csrf_token:
                logger.warning(f"Blueprint CSRF: Missing token for {request.method} {request.path}")
                return jsonify({
                    'success': False,
                    'error': {
                        'type': 'CSRF_TOKEN_MISSING',
                        'message': 'CSRF token required',
                        'code': 403
                    }
                }), 403
            
            user_agent = request.headers.get('User-Agent', '')
            is_valid = csrf_manager.validate_token(csrf_token, session_id, user_agent)
            
            if not is_valid:
                logger.warning(f"Blueprint CSRF: Invalid token for {request.method} {request.path}")
                return jsonify({
                    'success': False,
                    'error': {
                        'type': 'CSRF_TOKEN_INVALID',
                        'message': 'Invalid CSRF token',
                        'code': 403
                    }
                }), 403
            
            # Mark as validated
            g.csrf_validated = True
            
        except Exception as e:
            logger.error(f"Blueprint CSRF protection error: {e}")
            return jsonify({
                'success': False,
                'error': {
                    'type': 'CSRF_VALIDATION_ERROR',
                    'message': 'CSRF validation failed',
                    'code': 403
                }
            }), 403
    
    logger.info(f"CSRF protection registered for blueprint: {blueprint.name}")


def csrf_exempt(f):
    """
    Decorator to exempt a route from CSRF protection.
    
    Usage:
        @app.route('/api/webhook', methods=['POST'])
        @csrf_exempt
        def webhook():
            return 'OK'
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    
    # Mark the function as CSRF exempt
    decorated_function._csrf_exempt = True
    return decorated_function


def require_csrf(f):
    """
    Decorator to explicitly require CSRF protection for a route.
    
    This can be used to ensure CSRF protection even if the route
    might otherwise be exempt.
    
    Usage:
        @app.route('/api/sensitive', methods=['POST'])
        @require_csrf
        def sensitive_operation():
            return 'OK'
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if CSRF was validated
        if not getattr(g, 'csrf_validated', False):
            return jsonify({
                'success': False,
                'error': {
                    'type': 'CSRF_REQUIRED',
                    'message': 'CSRF token validation required',
                    'code': 403
                }
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function