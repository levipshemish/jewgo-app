"""
Security utilities for the Flask application (PostgreSQL RBAC based).
Provides decorators for admin authorization via server-side roles.
"""

from functools import wraps
from flask import jsonify
from utils.logging_config import get_logger
from utils.rbac import require_auth, require_role_level

logger = get_logger(__name__)


def _map_min_level(min_level):
    if isinstance(min_level, int):
        return min_level
    name = str(min_level).lower()
    mapping = {
        'moderator': 5,
        'data_admin': 10,
        'system_admin': 10,
        'admin': 10,
        'super_admin': 99,
    }
    return mapping.get(name, 10)


def require_admin(min_level="system_admin"):
    """Require authenticated user with at least the given role level.

    min_level: string role alias or numeric level.
    """

    level = _map_min_level(min_level)

    def admin_decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            protected = require_auth(require_role_level(level)(f))
            return protected(*args, **kwargs)

        return decorated

    return admin_decorator


def require_admin_auth(f):
    """Alias for require_admin with system_admin level via RBAC."""
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
