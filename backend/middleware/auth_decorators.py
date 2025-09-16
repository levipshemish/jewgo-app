"""
Authentication and authorization decorators for API endpoints.
Provides secure, reusable decorators for protecting routes.
"""

from functools import wraps
from typing import List, Optional, Callable
from flask import request, jsonify, g
from utils.logging_config import get_logger
from services.auth_service_v5 import AuthServiceV5
from utils.auth_helpers import extract_token_from_request

logger = get_logger(__name__)

# Initialize auth service
auth_service = AuthServiceV5()

def auth_required(f: Callable) -> Callable:
    """
    Decorator to require valid authentication for an endpoint.
    Sets g.current_user with authenticated user data.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_request()
        
        if not token:
            logger.warning("Missing authentication token", 
                         endpoint=request.endpoint, 
                         ip=request.remote_addr)
            return jsonify({
                'error': 'Authentication required',
                'code': 'MISSING_TOKEN'
            }), 401
        
        # Verify token
        try:
            payload = auth_service.verify_token(token)
        except Exception as e:
            logger.error(
                f"Token verification error: {e}",
                extra={
                    'endpoint': request.endpoint,
                    'exception_type': type(e).__name__,
                    'ip': request.remote_addr,
                    'token_length': len(token) if token else 0
                },
                exc_info=True
            )
            return jsonify({
                'error': 'Token verification failed',
                'code': 'TOKEN_VERIFICATION_ERROR'
            }), 401
            
        if not payload:
            logger.warning("Invalid authentication token", 
                         endpoint=request.endpoint, 
                         ip=request.remote_addr)
            return jsonify({
                'error': 'Invalid or expired token',
                'code': 'INVALID_TOKEN'
            }), 401
        
        # Get user data
        user_id = payload.get('uid')
        if not user_id:
            logger.error("Token missing user ID", payload=payload)
            return jsonify({
                'error': 'Invalid token format',
                'code': 'MALFORMED_TOKEN'
            }), 401
        
        try:
            user_data = auth_service.get_user_profile(user_id)
        except Exception as e:
            logger.error(
                f"Auth service error while getting user profile: {e}",
                extra={
                    'user_id': user_id,
                    'endpoint': request.endpoint,
                    'exception_type': type(e).__name__,
                    'ip': request.remote_addr
                },
                exc_info=True
            )
            return jsonify({
                'error': 'Authentication service temporarily unavailable',
                'code': 'AUTH_SERVICE_ERROR'
            }), 503
            
        if not user_data:
            logger.warning("User not found for valid token", user_id=user_id)
            return jsonify({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 401
        
        # Set current user in request context
        g.current_user = user_data
        g.user_id = user_id  # Add this line to fix profile endpoint
        g.token_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated_function

def admin_required(f: Callable) -> Callable:
    """
    Decorator to require admin role for an endpoint.
    Must be used after @auth_required.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user'):
            logger.error("admin_required used without auth_required")
            return jsonify({
                'error': 'Authentication required',
                'code': 'MISSING_AUTH'
            }), 401
        
        user_roles = g.current_user.get('roles', [])
        admin_roles = ['admin', 'super_admin']
        
        has_admin_role = any(
            role.get('role') if isinstance(role, dict) else role 
            in admin_roles 
            for role in user_roles
        )
        
        if not has_admin_role:
            logger.warning("Insufficient permissions for admin endpoint", 
                         user_id=g.current_user.get('id'),
                         roles=user_roles,
                         endpoint=request.endpoint)
            return jsonify({
                'error': 'Admin access required',
                'code': 'INSUFFICIENT_PERMISSIONS'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def role_required(required_roles: List[str]) -> Callable:
    """
    Decorator to require specific roles for an endpoint.
    Must be used after @auth_required.
    
    Args:
        required_roles: List of roles that can access the endpoint
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                logger.error("role_required used without auth_required")
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'MISSING_AUTH'
                }), 401
            
            user_roles = g.current_user.get('roles', [])
            user_role_names = [
                role.get('role') if isinstance(role, dict) else role 
                for role in user_roles
            ]
            
            has_required_role = any(role in required_roles for role in user_role_names)
            
            if not has_required_role:
                logger.warning("Insufficient role permissions", 
                             user_id=g.current_user.get('id'),
                             user_roles=user_role_names,
                             required_roles=required_roles,
                             endpoint=request.endpoint)
                return jsonify({
                    'error': f'Required roles: {", ".join(required_roles)}',
                    'code': 'INSUFFICIENT_ROLE'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def permission_required(required_permissions: List[str]) -> Callable:
    """
    Decorator to require specific permissions for an endpoint.
    Must be used after @auth_required.
    
    Args:
        required_permissions: List of permissions required to access the endpoint
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                logger.error("permission_required used without auth_required")
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'MISSING_AUTH'
                }), 401
            
            user_permissions = g.current_user.get('permissions', [])
            
            has_required_permission = any(
                perm in user_permissions 
                for perm in required_permissions
            )
            
            if not has_required_permission:
                logger.warning("Insufficient permissions", 
                             user_id=g.current_user.get('id'),
                             user_permissions=user_permissions,
                             required_permissions=required_permissions,
                             endpoint=request.endpoint)
                return jsonify({
                    'error': f'Required permissions: {", ".join(required_permissions)}',
                    'code': 'INSUFFICIENT_PERMISSIONS'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def step_up_required(required_method: str = 'fresh_session') -> Callable:
    """
    Decorator to require step-up authentication for sensitive operations.
    Must be used after @auth_required.
    
    Args:
        required_method: Required step-up method ('fresh_session', 'webauthn', 'password')
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                logger.error("step_up_required used without auth_required")
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'MISSING_AUTH'
                }), 401
            
            # Check if session has completed step-up authentication
            session_id = g.token_payload.get('sid')
            if not session_id:
                logger.warning("No session ID in token for step-up check")
                return jsonify({
                    'error': 'Step-up authentication required',
                    'code': 'STEP_UP_REQUIRED',
                    'required_method': required_method
                }), 403
            
            has_step_up = auth_service.session_has_step_up(session_id)
            if not has_step_up:
                # Create step-up challenge
                user_id = g.current_user.get('id')
                return_to = request.url
                
                challenge_id = auth_service.create_step_up_challenge(
                    user_id, required_method, return_to
                )
                
                logger.info("Step-up authentication required", 
                          user_id=user_id,
                          challenge_id=challenge_id,
                          required_method=required_method)
                
                return jsonify({
                    'error': 'Step-up authentication required',
                    'code': 'STEP_UP_REQUIRED',
                    'challenge_id': challenge_id,
                    'required_method': required_method,
                    'step_up_url': f'/auth/step-up?challenge={challenge_id}'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def optional_auth(f: Callable) -> Callable:
    """
    Decorator for endpoints that work with or without authentication.
    Sets g.current_user if token is valid, but doesn't require it.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_request()
        
        if token:
            payload = auth_service.verify_token(token)
            if payload:
                user_id = payload.get('uid')
                if user_id:
                    user_data = auth_service.get_user_profile(user_id)
                    if user_data:
                        g.current_user = user_data
                        g.token_payload = payload
        
        # Set default if no valid auth
        if not hasattr(g, 'current_user'):
            g.current_user = None
            g.token_payload = None
        
        return f(*args, **kwargs)
    
    return decorated_function

def rate_limit_by_user(max_requests: int = 100, window_minutes: int = 60) -> Callable:
    """
    Decorator to rate limit requests by authenticated user.
    Must be used after @auth_required.
    
    Args:
        max_requests: Maximum requests allowed in the window
        window_minutes: Time window in minutes
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # In development, be more lenient with rate limits
            import os
            is_development = os.getenv('FLASK_ENV', 'development') == 'development'
            effective_max_requests = max_requests * (10 if is_development else 1)  # 10x more lenient in dev
            
            # Determine principal: user ID if authenticated, else client IP
            endpoint = request.endpoint or f.__name__
            if hasattr(g, 'current_user') and g.current_user:
                principal = f"user:{g.current_user.get('id')}"
            else:
                # Fallback to IP-based limiting for unauthenticated endpoints
                ip = request.headers.get('X-Forwarded-For')
                client_ip = ip.split(',')[0].strip() if ip else request.headers.get('X-Real-IP') or request.remote_addr or 'unknown'
                principal = f"ip:{client_ip}"
            # Create rate limit key
            rate_limit_key = f"rate_limit:{principal}:{endpoint}"
            
            # Check current count
            try:
                from cache.redis_manager_v5 import get_redis_manager_v5
                redis_manager = get_redis_manager_v5()
                
                current_count = redis_manager.get(rate_limit_key, prefix='rate_limit') or 0
                
                if int(current_count) >= effective_max_requests:
                    user_id = None
                    if hasattr(g, 'current_user') and g.current_user:
                        user_id = g.current_user.get('id')
                    logger.warning("Rate limit exceeded", 
                                 user_id=user_id,
                                 endpoint=endpoint,
                                 current_count=current_count,
                                 max_requests=effective_max_requests,
                                 is_development=is_development)
                    
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'retry_after': window_minutes * 60,
                        'message': f'Too many requests for {principal}'
                    }), 429
                
                # Increment counter
                redis_manager.incr(rate_limit_key, prefix='rate_limit')
                redis_manager.expire(rate_limit_key, window_minutes * 60, prefix='rate_limit')
                
            except Exception as e:
                logger.error(f"Rate limiting error: {e}")
                # Continue without rate limiting if Redis fails
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
