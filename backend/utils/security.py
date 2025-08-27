"""
Security utilities for the Flask application.

This module provides authentication and authorization decorators
to replace simple token checking throughout the application.
"""

import os
import time
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, current_app
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, AuthorizationError

logger = get_logger(__name__)


def verify_admin_token(token: str) -> bool:
    """Verify admin token against environment variable."""
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        logger.error("ADMIN_TOKEN not configured")
        return False
    
    return token == admin_token


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return payload."""
    try:
        # Import JWT handling here to avoid circular imports
        import jwt
        
        jwt_secret = os.getenv("JWT_SECRET")
        if not jwt_secret:
            logger.error("JWT_SECRET not configured")
            return None
        
        # Decode and verify the token
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        
        # Check if token is expired
        if "exp" in payload and payload["exp"] < time.time():
            logger.warning("JWT token expired")
            return None
        
        return payload
    
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None
    except Exception as e:
        logger.error(f"Error verifying JWT token: {e}")
        return None


def require_admin_auth(f):
    """Decorator to require admin authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                raise AuthenticationError("Authorization header required")
            
            # Check Bearer token format
            if not auth_header.startswith("Bearer "):
                raise AuthenticationError("Bearer token required")
            
            token = auth_header.split(" ")[1]
            if not token:
                raise AuthenticationError("Token required")
            
            # Verify admin token
            if not verify_admin_token(token):
                raise AuthenticationError("Invalid admin token")
            
            # Log successful admin authentication
            logger.info("Admin authentication successful", extra={
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'endpoint': request.endpoint
            })
            
            return f(*args, **kwargs)
        
        except AuthenticationError as e:
            logger.warning(f"Admin authentication failed: {e.message}", extra={
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'endpoint': request.endpoint
            })
            return jsonify({
                'success': False,
                'error': e.message,
                'status_code': 401
            }), 401
        
        except Exception as e:
            logger.error(f"Unexpected error in admin authentication: {e}")
            return jsonify({
                'success': False,
                'error': 'Authentication error',
                'status_code': 401
            }), 401
    
    return decorated_function


def require_user_auth(f):
    """Decorator to require user authentication via JWT."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                raise AuthenticationError("Authorization header required")
            
            # Check Bearer token format
            if not auth_header.startswith("Bearer "):
                raise AuthenticationError("Bearer token required")
            
            token = auth_header.split(" ")[1]
            if not token:
                raise AuthenticationError("Token required")
            
            # Verify JWT token
            payload = verify_jwt_token(token)
            if not payload:
                raise AuthenticationError("Invalid or expired token")
            
            # Add user info to request context
            request.user = payload
            
            # Log successful user authentication
            logger.info("User authentication successful", extra={
                'user_id': payload.get('user_id'),
                'ip_address': request.remote_addr,
                'endpoint': request.endpoint
            })
            
            return f(*args, **kwargs)
        
        except AuthenticationError as e:
            logger.warning(f"User authentication failed: {e.message}", extra={
                'ip_address': request.remote_addr,
                'endpoint': request.endpoint
            })
            return jsonify({
                'success': False,
                'error': e.message,
                'status_code': 401
            }), 401
        
        except Exception as e:
            logger.error(f"Unexpected error in user authentication: {e}")
            return jsonify({
                'success': False,
                'error': 'Authentication error',
                'status_code': 401
            }), 401
    
    return decorated_function


def optional_user_auth(f):
    """Decorator for optional user authentication via JWT."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                if token:
                    # Verify JWT token
                    payload = verify_jwt_token(token)
                    if payload:
                        # Add user info to request context
                        request.user = payload
                        logger.debug("Optional user authentication successful", extra={
                            'user_id': payload.get('user_id'),
                            'endpoint': request.endpoint
                        })
                    else:
                        logger.debug("Invalid token in optional authentication")
                else:
                    logger.debug("Empty token in optional authentication")
            else:
                logger.debug("No authorization header in optional authentication")
            
            return f(*args, **kwargs)
        
        except Exception as e:
            logger.error(f"Unexpected error in optional authentication: {e}")
            # Continue without authentication
            return f(*args, **kwargs)
    
    return decorated_function


def require_super_admin(f):
    """Decorator to require super admin privileges."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # First require admin authentication
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise AuthenticationError("Authorization header required")
            
            token = auth_header.split(" ")[1]
            if not verify_admin_token(token):
                raise AuthenticationError("Invalid admin token")
            
            # Check for super admin token specifically
            super_admin_token = os.getenv("SUPER_ADMIN_TOKEN")
            if not super_admin_token:
                logger.error("SUPER_ADMIN_TOKEN not configured")
                raise AuthorizationError("Super admin access not configured")
            
            if token != super_admin_token:
                raise AuthorizationError("Super admin privileges required")
            
            # Log successful super admin authentication
            logger.info("Super admin authentication successful", extra={
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'endpoint': request.endpoint
            })
            
            return f(*args, **kwargs)
        
        except (AuthenticationError, AuthorizationError) as e:
            logger.warning(f"Super admin authentication failed: {e.message}", extra={
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'endpoint': request.endpoint
            })
            return jsonify({
                'success': False,
                'error': e.message,
                'status_code': e.status_code
            }), e.status_code
        
        except Exception as e:
            logger.error(f"Unexpected error in super admin authentication: {e}")
            return jsonify({
                'success': False,
                'error': 'Authentication error',
                'status_code': 401
            }), 401
    
    return decorated_function


def rate_limit(max_requests: int = 100, window_seconds: int = 3600):
    """Decorator to implement rate limiting."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get client identifier (IP address)
                client_ip = request.remote_addr
                
                # Import Redis here to avoid circular imports
                try:
                    import redis
                    redis_client = redis.Redis(
                        host=os.getenv('REDIS_HOST', 'localhost'),
                        port=int(os.getenv('REDIS_PORT', 6379)),
                        db=int(os.getenv('REDIS_DB', 0)),
                        password=os.getenv('REDIS_PASSWORD'),
                        decode_responses=True
                    )
                    
                    # Create rate limit key
                    key = f"rate_limit:{client_ip}:{request.endpoint}"
                    
                    # Check current request count
                    current_count = redis_client.get(key)
                    if current_count and int(current_count) >= max_requests:
                        logger.warning(f"Rate limit exceeded for {client_ip}", extra={
                            'client_ip': client_ip,
                            'endpoint': request.endpoint,
                            'max_requests': max_requests,
                            'window_seconds': window_seconds
                        })
                        return jsonify({
                            'success': False,
                            'error': 'Rate limit exceeded',
                            'status_code': 429,
                            'retry_after': window_seconds
                        }), 429
                    
                    # Increment request count
                    pipe = redis_client.pipeline()
                    pipe.incr(key)
                    pipe.expire(key, window_seconds)
                    pipe.execute()
                    
                except Exception as e:
                    logger.warning(f"Rate limiting not available: {e}")
                    # Continue without rate limiting if Redis is not available
                
                return f(*args, **kwargs)
            
            except Exception as e:
                logger.error(f"Error in rate limiting: {e}")
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current user from request context."""
    return getattr(request, 'user', None)


def get_user_id() -> Optional[str]:
    """Get current user ID from request context."""
    user = get_current_user()
    return user.get('user_id') if user else None


def is_authenticated() -> bool:
    """Check if user is authenticated."""
    return get_current_user() is not None


def is_admin() -> bool:
    """Check if user has admin privileges."""
    user = get_current_user()
    return user and user.get('role') == 'admin' if user else False


def is_super_admin() -> bool:
    """Check if user has super admin privileges."""
    user = get_current_user()
    return user and user.get('role') == 'super_admin' if user else False
