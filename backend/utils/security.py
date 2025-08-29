"""
Security utilities for the Flask application.
This module provides authentication and authorization decorators
to replace simple token checking throughout the application.
"""

import os
import time
import uuid
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, AuthorizationError

# Import Supabase auth and role manager
try:
    from utils.supabase_auth import verify_supabase_admin_role, RoleLookupDependencyError

    SUPABASE_ROLES_ENABLED = True
except ImportError:
    SUPABASE_ROLES_ENABLED = False
    logger = get_logger(__name__)
    logger.warning("Supabase roles not available - falling back to legacy auth")
logger = get_logger(__name__)


def verify_admin_token(token: str) -> bool:
    """Verify admin token against environment variable (DEPRECATED - use Supabase auth instead)."""
    # Check if legacy admin auth is enabled
    enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
    if not enable_legacy:
        logger.warning("DEPRECATED: Legacy admin token verification disabled - use Supabase auth")
        raise RuntimeError("Legacy admin authentication is disabled. Use Supabase admin roles instead.")
    
    # Production safety check
    if os.getenv("NODE_ENV") == "production" and enable_legacy:
        logger.error("CRITICAL: Legacy authentication cannot be enabled in production")
        raise RuntimeError("Legacy authentication cannot be enabled in production")
    
    logger.warning("DEPRECATED: Using legacy admin token verification - migrate to Supabase auth")
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        logger.error("ADMIN_TOKEN not configured")
        return False
    return token == admin_token


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return payload (DEPRECATED - use Supabase auth instead)."""
    # Check if legacy auth is enabled (default to true temporarily to avoid breaking non-admin endpoints)
    enable_legacy = os.getenv("ENABLE_LEGACY_USER_AUTH", "true").lower() == "true"
    if not enable_legacy:
        logger.warning("DEPRECATED: Legacy JWT verification disabled - use Supabase auth")
        raise RuntimeError("Legacy user authentication is disabled. Use Supabase auth instead.")
    
    # Production safety check
    if os.getenv("NODE_ENV") == "production" and enable_legacy:
        logger.error("CRITICAL: Legacy authentication cannot be enabled in production")
        raise RuntimeError("Legacy authentication cannot be enabled in production")
    
    logger.warning("DEPRECATED: Using legacy HS256 JWT verification - migrate to Supabase auth")
    
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


def require_admin(min_level='system_admin'):
    """
    Decorator to require admin authentication with specified minimum level.
    
    Args:
        min_level: Minimum required admin role level ('moderator', 'data_admin', 'system_admin', 'super_admin')
    
    This function accepts only Supabase RS256 JWTs with admin roles.
    Legacy token fallback is disabled - pure fail-closed policy.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Check for Authorization header
                auth_header = request.headers.get("Authorization")
                if not auth_header:
                    raise AuthenticationError("Authorization header required")

                # Check Bearer token format - only Supabase JWTs accepted
                if not auth_header.startswith("Bearer "):
                    raise AuthenticationError("Bearer token required")

                token = auth_header.split(" ")[1]
                if not token:
                    raise AuthenticationError("Token required")

                # Try Supabase role-based authentication
                if SUPABASE_ROLES_ENABLED:
                    try:
                        result = verify_supabase_admin_role(token, min_level)
                        if result:
                            # Extract payload and role data from result
                            payload = result["payload"]
                            role_data = result["role_data"]
                            
                            # Add role info to Flask g context
                            from flask import g

                            g.admin_role = role_data
                            
                            # Build user info from the already-verified payload
                            user_info = {
                                "user_id": payload.get("sub"),
                                "email": payload.get("email"),
                                "jwt_role": payload.get("role", "authenticated"),
                                "aud": payload.get("aud"),
                                "exp": payload.get("exp"),
                                "iat": payload.get("iat"),
                                "admin_role": role_data.get('role'),
                                "admin_level": role_data.get('level', 0)
                            }
                            # Add metadata if available
                            if "app_metadata" in payload:
                                user_info["app_metadata"] = payload["app_metadata"]
                            if "user_metadata" in payload:
                                user_info["user_metadata"] = payload["user_metadata"]
                            
                            g.user = user_info
                            
                            # Log successful Supabase admin authentication
                            req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                            logger.info(
                                "AUTH_SUCCESS",
                                extra={
                                    "endpoint": request.endpoint,
                                    "role": role_data.get("role"),
                                    "level": role_data.get("level"),
                                    "request_id": req_id
                                },
                            )

                            return f(*args, **kwargs)
                        else:
                            req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                            logger.warning("AUTH_403_ROLE", extra={
                                "endpoint": request.endpoint,
                                "request_id": req_id
                            })
                            raise AuthorizationError("Insufficient admin privileges")
                    except AuthenticationError as e:
                        req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                        logger.warning(
                            f"AUTH_401_SIG: {e.message}", extra={"endpoint": request.endpoint, "request_id": req_id}
                        )
                        raise
                    except RoleLookupDependencyError as e:
                        req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                        logger.error(
                            f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint, "request_id": req_id}
                        )
                        raise
                    except Exception as e:
                        req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                        logger.error(
                            f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint, "request_id": req_id}
                        )
                        raise

                # No legacy fallback - pure fail-closed policy
                logger.warning("AUTH_401_NO_LEGACY", extra={"endpoint": request.endpoint})
                raise AuthenticationError("Legacy admin authentication disabled")

            except AuthenticationError as e:
                req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                logger.warning(
                    f"AUTH_401_SIG: {e.message}", extra={"endpoint": request.endpoint, "request_id": req_id}
                )
                response = jsonify({"error": "unauthorized"})
                response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
                return response, 401

            except AuthorizationError as e:
                req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                logger.warning(
                    f"AUTH_403_ROLE: {e.message}", extra={"endpoint": request.endpoint, "request_id": req_id}
                )
                return jsonify({"error": "forbidden"}), 403

            except Exception as e:
                req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
                logger.error(f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint, "request_id": req_id})
                return jsonify({"error": "unavailable"}), 503

        return decorated_function
    return decorator


def require_admin_auth(f):
    """
    Decorator to require admin authentication (alias for require_admin with system_admin level).
    
    This function accepts only Supabase RS256 JWTs with admin roles.
    Legacy token fallback is disabled - pure fail-closed policy.
    """
    return require_admin('system_admin')(f)


def require_user_auth(f):
    """Decorator to require user authentication via JWT (DEPRECATED - use Supabase auth instead)."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if legacy auth is enabled (default to true temporarily to avoid breaking non-admin endpoints)
        enable_legacy = os.getenv("ENABLE_LEGACY_USER_AUTH", "true").lower() == "true"
        if not enable_legacy:
            logger.warning("DEPRECATED: Legacy user auth disabled - use Supabase auth")
            return jsonify({"error": "legacy auth disabled"}), 401
        
        # Production safety check
        if os.getenv("NODE_ENV") == "production" and enable_legacy:
            logger.error("CRITICAL: Legacy authentication cannot be enabled in production")
            return jsonify({"error": "legacy auth disabled in production"}), 401
        
        logger.warning("DEPRECATED: Using legacy user auth - migrate to Supabase auth")
        
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
            # Add user info to Flask g context
            from flask import g

            g.user = payload
            # Log successful user authentication
            logger.info(
                "AUTH_SUCCESS",
                extra={
                    "endpoint": request.endpoint,
                },
            )
            return f(*args, **kwargs)
        except AuthenticationError as e:
            logger.warning(
                f"AUTH_401_SIG: {e.message}",
                extra={"endpoint": request.endpoint},
            )
            response = jsonify({"error": "unauthorized"})
            response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
            return response, 401
        except Exception as e:
            logger.error(f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint})
            return jsonify({"error": "unavailable"}), 503

    return decorated_function


def optional_user_auth(f):
    """Decorator for optional user authentication via JWT (DEPRECATED - use Supabase auth instead)."""

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
                        # Add user info to Flask g context
                        from flask import g
                        g.user = payload
                        logger.debug("AUTH_OPTIONAL_SUCCESS", extra={
                            "endpoint": request.endpoint,
                        })
                    else:
                        logger.debug("AUTH_OPTIONAL_INVALID", extra={
                            "endpoint": request.endpoint,
                        })
                else:
                    logger.debug("AUTH_OPTIONAL_EMPTY", extra={
                        "endpoint": request.endpoint,
                    })
            else:
                logger.debug("AUTH_OPTIONAL_NO_HEADER", extra={
                    "endpoint": request.endpoint,
                })
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"AUTH_OPTIONAL_ERROR: {e}", extra={
                "endpoint": request.endpoint,
            })
            # Continue without authentication
            return f(*args, **kwargs)

    return decorated_function


def require_super_admin(f):
    """Decorator to require super admin privileges (DEPRECATED - use Supabase admin roles instead)."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if legacy admin auth is enabled
        enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
        if not enable_legacy:
            logger.warning("DEPRECATED: Legacy super admin auth disabled - use Supabase admin roles")
            raise RuntimeError("Legacy super admin authentication is disabled. Use Supabase admin roles instead.")
        
        # Production safety check
        if os.getenv("NODE_ENV") == "production" and enable_legacy:
            logger.error("CRITICAL: Legacy authentication cannot be enabled in production")
            raise RuntimeError("Legacy authentication cannot be enabled in production")
        
        logger.warning("DEPRECATED: Using legacy super admin auth - migrate to Supabase admin roles")
        
        try:
            # Require AdminBearer header pattern: Authorization: AdminBearer <token>
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("AdminBearer "):
                raise AuthenticationError("AdminBearer token required")
            
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
            logger.info(
                "Super admin authentication successful",
                extra={
                    "ip_address": request.remote_addr,
                    "user_agent": request.headers.get("User-Agent"),
                    "endpoint": request.endpoint,
                },
            )
            return f(*args, **kwargs)
        except (AuthenticationError, AuthorizationError) as e:
            logger.warning(
                f"Super admin authentication failed: {e.message}",
                extra={
                    "ip_address": request.remote_addr,
                    "user_agent": request.headers.get("User-Agent"),
                    "endpoint": request.endpoint,
                },
            )
            return (
                jsonify(
                    {"success": False, "error": e.message, "status_code": e.status_code}
                ),
                e.status_code,
            )
        except Exception as e:
            logger.error(f"Unexpected error in super admin authentication: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Authentication error",
                        "status_code": 401,
                    }
                ),
                401,
            )

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
                        host=os.getenv("REDIS_HOST", "localhost"),
                        port=int(os.getenv("REDIS_PORT", 6379)),
                        db=int(os.getenv("REDIS_DB", 0)),
                        password=os.getenv("REDIS_PASSWORD"),
                        decode_responses=True,
                    )
                    # Create rate limit key
                    key = f"rate_limit:{client_ip}:{request.endpoint}"
                    # Check current request count
                    current_count = redis_client.get(key)
                    if current_count and int(current_count) >= max_requests:
                        logger.warning(
                            f"Rate limit exceeded for {client_ip}",
                            extra={
                                "client_ip": client_ip,
                                "endpoint": request.endpoint,
                                "max_requests": max_requests,
                                "window_seconds": window_seconds,
                            },
                        )
                        return (
                            jsonify(
                                {
                                    "success": False,
                                    "error": "Rate limit exceeded",
                                    "status_code": 429,
                                    "retry_after": window_seconds,
                                }
                            ),
                            429,
                        )
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
    """Get current user from Flask g context."""
    from flask import g

    return getattr(g, "user", None)


def get_user_id() -> Optional[str]:
    """Get current user ID from request context."""
    user = get_current_user()
    return user.get("user_id") if user else None


def is_authenticated() -> bool:
    """Check if user is authenticated."""
    return get_current_user() is not None


def is_admin() -> bool:
    """Check if user has admin privileges."""
    return bool((u:=get_current_user()) and u.get('admin_level',0) >= 2)


def is_super_admin() -> bool:
    """Check if user has super admin privileges."""
    return bool((u:=get_current_user()) and u.get('admin_role')=='super_admin')


def clear_user_context(_):
    """Clear user context from Flask g to prevent context leakage across requests."""
    from flask import g
    for attr in ("user", "admin_role"):
        try:
            delattr(g, attr)
        except Exception:
            pass
