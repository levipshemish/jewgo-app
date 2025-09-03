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

# Supabase admin roles are always enabled in the modern system

# Import Supabase auth and role manager
try:
    from utils.supabase_auth import (
        verify_supabase_admin_role,
        RoleLookupDependencyError,
    )

    SUPABASE_ROLES_ENABLED = True
except ImportError:
    SUPABASE_ROLES_ENABLED = False
    logger = get_logger(__name__)
    logger.error("Supabase roles not available - no authentication fallback")
logger = get_logger(__name__)


# Legacy authentication functions have been removed


def require_admin(min_level="system_admin"):
    """
    Decorator to require admin authentication with specified minimum level.

    Args:
        min_level: Minimum required admin role level ('moderator', 'data_admin', 'system_admin', 'super_admin')

    This function accepts only Supabase RS256 JWTs with admin roles.
    Legacy token fallback is disabled - pure fail-closed policy.
    """

    def admin_decorator(f):
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

                # Check if Supabase roles are available before calling verify_supabase_admin_role
                if not SUPABASE_ROLES_ENABLED:
                    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                    logger.error(
                        "AUTH_503_DEP: supabase-roles-unavailable",
                        extra={"endpoint": request.endpoint, "request_id": req_id},
                    )
                    return jsonify({"error": "unavailable"}), 503

                # Try Supabase role-based authentication
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
                            "admin_role": role_data.get("role"),
                            "admin_level": role_data.get("level", 0),
                        }
                        # Add metadata if available
                        if "app_metadata" in payload:
                            user_info["app_metadata"] = payload["app_metadata"]
                        if "user_metadata" in payload:
                            user_info["user_metadata"] = payload["user_metadata"]

                        g.user = user_info

                        # Log successful Supabase admin authentication
                        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                        logger.info(
                            "AUTH_SUCCESS",
                            extra={
                                "endpoint": request.endpoint,
                                "role": role_data.get("role"),
                                "level": role_data.get("level"),
                                "request_id": req_id,
                            },
                        )

                        return f(*args, **kwargs)
                    else:
                        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                        logger.warning(
                            "AUTH_403_ROLE",
                            extra={"endpoint": request.endpoint, "request_id": req_id},
                        )
                        raise AuthorizationError("Insufficient admin privileges")
                except AuthenticationError as e:
                    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                    logger.warning(
                        "AUTH_401_SIG: %s",
                        getattr(e, "message", str(e)),
                        extra={"endpoint": request.endpoint, "request_id": req_id},
                    )
                    raise
                except RoleLookupDependencyError as e:
                    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                    logger.error(
                        "AUTH_503_DEP: %s",
                        e,
                        extra={"endpoint": request.endpoint, "request_id": req_id},
                    )
                    raise
                except Exception as e:
                    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                    logger.error(
                        f"AUTH_503_DEP: {e}",
                        extra={"endpoint": request.endpoint, "request_id": req_id},
                    )
                    raise

                # All control paths above return or raise; no legacy fallback

            except AuthenticationError as e:
                req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                logger.warning(
                    "AUTH_401_SIG: %s",
                    getattr(e, "message", str(e)),
                    extra={"endpoint": request.endpoint, "request_id": req_id},
                )
                response = jsonify({"success": False, "error": "unauthorized"})
                response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
                return response, 401

            except AuthorizationError as e:
                req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                logger.warning(
                    "AUTH_403_ROLE: %s",
                    getattr(e, "message", str(e)),
                    extra={"endpoint": request.endpoint, "request_id": req_id},
                )
                return jsonify({"success": False, "error": "forbidden"}), 403

            except Exception as e:
                req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
                logger.error(
                    "AUTH_503_DEP: %s",
                    e,
                    extra={"endpoint": request.endpoint, "request_id": req_id},
                )
                return jsonify({"success": False, "error": "unavailable"}), 503

        return decorated_function

    return admin_decorator


def require_admin_auth(f):
    """
    Decorator to require admin authentication (alias for require_admin with system_admin level).

    This function accepts only Supabase RS256 JWTs with admin roles.
    Legacy token fallback is disabled - pure fail-closed policy.
    """
    return require_admin("system_admin")(f)


# require_user_auth decorator has been removed - use require_supabase_auth instead


# optional_user_auth decorator has been removed - use optional_supabase_auth instead


# REMOVED: require_super_admin decorator - no longer used
# All admin authentication now uses Supabase JWT-based roles


def rate_limit(max_requests: int = 100, window_seconds: int = 3600):
    """Decorator to implement rate limiting."""

    def rate_limit_decorator(f):
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

    return rate_limit_decorator


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
    return bool((u := get_current_user()) and u.get("admin_level", 0) >= 2)


def is_super_admin() -> bool:
    """Check if user has super admin privileges."""
    return bool((u := get_current_user()) and u.get("admin_role") == "super_admin")


def clear_user_context(_):
    """Clear user context from Flask g to prevent context leakage across requests."""
    from flask import g

    for attr in ("user", "admin_role"):
        try:
            delattr(g, attr)
        except Exception:
            pass


# Simple SecurityManager class for compatibility with app_factory_full.py
class SecurityManager:
    """Simple security manager class for compatibility."""

    def __init__(self):
        self.admin_tokens = {}

    def get_admin_token(self, token_id):
        """Get admin token."""
        return self.admin_tokens.get(token_id)

    def set_admin_token(self, token_id, token_data):
        """Set admin token."""
        self.admin_tokens[token_id] = token_data


# Create a global instance
security_manager = SecurityManager()
