"""
Admin Authentication Module (DEPRECATED)
This legacy module is deprecated in favor of Supabase JWT + role-based auth.
Use utils.security.require_admin for new endpoints.
"""

import os
import jwt
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify
from utils.logging_config import get_logger

# Import the new role manager
try:
    from utils.supabase_role_manager import get_role_manager

    ROLE_MANAGER_AVAILABLE = True
except ImportError:
    ROLE_MANAGER_AVAILABLE = False
    logger = get_logger(__name__)
    logger.warning("SupabaseRoleManager not available - admin roles disabled")
logger = get_logger(__name__)
logger.warning("DEPRECATION: utils.admin_auth is deprecated. Use utils.security.require_admin.")

# Legacy admin auth kill-switch configuration
REMOVAL_DAYS = int(os.getenv('LEGACY_REMOVE_AFTER_DAYS', '90'))
REMOVAL_DATE = datetime.now() + timedelta(days=REMOVAL_DAYS)


class DeprecationError(Exception):
    """Raised when deprecated functionality is accessed after removal date."""
    pass


def _check_removal_date():
    """Check if legacy admin auth should be removed based on date."""
    if datetime.now() > REMOVAL_DATE:
        logger.error(f"Legacy admin auth removal date passed: {REMOVAL_DATE.isoformat()}")
        raise DeprecationError(f"Legacy admin authentication was removed on {REMOVAL_DATE.isoformat()}. Use Supabase admin roles instead.")


class AdminAuthError(Exception):
    """Raised when admin authentication fails."""


class AdminAuthManager:
    """Manages admin authentication and authorization."""

    def __init__(self):
        # Legacy admin auth may be disabled; enforce guardrails
        enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
        if not enable_legacy:
            logger.warning("Legacy admin auth disabled - use Supabase roles (see utils.security)")
        if os.getenv("NODE_ENV") == "production" and enable_legacy:
            logger.error("CRITICAL: Legacy admin auth cannot be enabled in production")
            raise RuntimeError("Legacy admin auth cannot be enabled in production")
        self.secret_key = os.getenv(
            "ADMIN_JWT_SECRET", os.getenv("JWT_SECRET", "fallback-secret")
        )
        self.token_expiry = int(os.getenv("ADMIN_TOKEN_EXPIRY", 3600))  # 1 hour default
        self.admin_users = self._load_admin_users()

    def _load_admin_users(self) -> Dict[str, Dict[str, Any]]:
        """Load admin users from environment or configuration."""
        # In production, this should come from a secure database
        admin_users = {}
        # Load from environment variables
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password_hash = os.getenv("ADMIN_PASSWORD_HASH")
        if admin_email and admin_password_hash:
            admin_users[admin_email] = {
                "email": admin_email,
                "password_hash": admin_password_hash,
                "role": "admin",
                "permissions": ["read", "write", "delete", "migrate"],
            }
        # Add additional admin users if configured
        additional_admins = os.getenv("ADDITIONAL_ADMIN_EMAILS", "").split(",")
        for email in additional_admins:
            email = email.strip()
            if email:
                admin_users[email] = {
                    "email": email,
                    "password_hash": os.getenv(
                        f"ADMIN_PASSWORD_HASH_{email.upper().replace('@', '_').replace('.', '_')}",
                        "",
                    ),
                    "role": "admin",
                    "permissions": ["read", "write", "delete", "migrate"],
                }
        return admin_users

    def generate_admin_token(self, email: str, password: str) -> Optional[str]:
        """Generate an admin JWT token if credentials are valid."""
        enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
        if not enable_legacy:
            raise RuntimeError("Legacy admin authentication is disabled. Use Supabase roles.")
        if email not in self.admin_users:
            # Mask email for security - only log first 2 characters + domain
            masked_email = email[:2] + "*****@" + email.split("@")[-1] if "@" in email else "***"
            logger.warning(f"Admin login attempt with unknown email: {masked_email}")
            return None
        user = self.admin_users[email]
        # In production, use proper password hashing (bcrypt, etc.)
        if password != user.get("password_hash", ""):
            # Mask email for security - only log first 2 characters + domain
            masked_email = email[:2] + "*****@" + email.split("@")[-1] if "@" in email else "***"
            logger.warning(f"Admin login attempt with invalid password for: {masked_email}")
            return None
        # Generate JWT token
        payload = {
            "email": email,
            "role": user["role"],
            "permissions": user["permissions"],
            "exp": time.time() + self.token_expiry,
            "iat": time.time(),
            "type": "admin",
        }
        try:
            token = jwt.encode(payload, self.secret_key, algorithm="HS256")
            # Mask email for security - only log first 2 characters + domain
            masked_email = email[:2] + "*****@" + email.split("@")[-1] if "@" in email else "***"
            logger.info(f"Admin token generated for: {masked_email}")
            return token
        except Exception as e:
            logger.error(f"Error generating admin token: {e}")
            return None

    def generate_supabase_admin_token(
        self, user_id: str, role_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        Generate an admin JWT token for Supabase user with admin role.
        Args:
            user_id: Supabase user ID
            role_data: Admin role data from Supabase
        Returns:
            JWT token or None on failure
        """
        try:
            payload = {
                "sub": user_id,
                "role": role_data.get("role"),
                "level": role_data.get("level", 0),
                "exp": time.time() + self.token_expiry,
                "iat": time.time(),
                "type": "supabase_admin",
            }
            token = jwt.encode(payload, self.secret_key, algorithm="HS256")
            logger.info(f"Supabase admin token generated for user: {user_id}")
            return token
        except Exception as e:
            logger.error(f"Error generating Supabase admin token: {e}")
            return None

    def verify_admin_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify an admin JWT token and return user info."""
        enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
        if not enable_legacy:
            logger.warning("Legacy admin token verification disabled - use Supabase JWT")
            return None
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            # Check if token is expired
            if payload.get("exp", 0) < time.time():
                logger.warning("Admin token expired")
                return None
            # Check if it's an admin token
            token_type = payload.get("type")
            if token_type not in ["admin", "supabase_admin"]:
                logger.warning(f"Non-admin token used for admin endpoint: {token_type}")
                return None
            # Handle Supabase admin tokens
            if token_type == "supabase_admin":
                # For Supabase admin tokens, we trust the role data in the token
                # but we should verify the role is still valid in Supabase
                if ROLE_MANAGER_AVAILABLE:
                    try:
                        role_manager = get_role_manager()
                        # We would need the original Supabase token to verify
                        # For now, we trust the JWT payload
                        logger.debug(
                            f"Supabase admin token verified for user: {payload.get('sub')}"
                        )
                        return payload
                    except Exception as e:
                        logger.warning(f"Failed to verify Supabase admin role: {e}")
                        return None
                else:
                    logger.warning(
                        "Supabase role manager not available for admin token verification"
                    )
                    return None
            # Handle legacy admin tokens
            if token_type == "admin":
                # Verify user still exists
                email = payload.get("email")
                if email not in self.admin_users:
                    # Mask email for security - only log first 2 characters + domain
                    masked_email = email[:2] + "*****@" + email.split("@")[-1] if "@" in email and email else "***"
                    logger.warning(f"Admin token for non-existent user: {masked_email}")
                    return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Admin token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid admin token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying admin token: {e}")
            return None

    def has_permission(self, user_info: Dict[str, Any], permission: str) -> bool:
        """Check if user has a specific permission."""
        permissions = user_info.get("permissions", [])
        return permission in permissions


# Global admin auth manager instance
admin_auth_manager = AdminAuthManager()


class AdminAuthDecorator:
    """Class-based decorator to avoid Flask endpoint naming conflicts."""

    def __init__(self, permission: str = "read"):
        self.permission = permission
        # Add __name__ attribute to avoid conflicts with other decorators
        self.__name__ = f"admin_auth_{permission}"

    def __call__(self, f):
        @wraps(f)
        def auth_wrapper(*args, **kwargs):
            try:
                # Check removal date first
                _check_removal_date()
                
                # Check if legacy admin auth is enabled (mirroring require_legacy_admin_auth behavior)
                enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
                if not enable_legacy:
                    logger.warning("DEPRECATED: Legacy admin auth disabled - use Supabase admin roles")
                    return jsonify({"error": "Legacy admin authentication is disabled. Use Supabase admin roles instead."}), 401
                
                # Production safety check
                if os.getenv("NODE_ENV") == "production" and enable_legacy:
                    logger.error("CRITICAL: Legacy admin authentication cannot be enabled in production")
                    return jsonify({"error": "Legacy admin authentication is disabled in production"}), 401
                
                # Get token from Authorization header
                auth_header = request.headers.get("Authorization")
                if not auth_header:
                    return jsonify({"error": "Authorization header required"}), 401
                
                # Require AdminBearer header pattern (not Bearer)
                if not auth_header.startswith("AdminBearer "):
                    logger.warning("DEPRECATED: Legacy admin auth requires AdminBearer header")
                    return jsonify({"error": "AdminBearer token required"}), 401
                
                token = auth_header.split(" ")[1]
                # Verify token
                user_info = admin_auth_manager.verify_admin_token(token)
                if not user_info:
                    return jsonify({"error": "Invalid or expired token"}), 401
                # Check permission
                if not admin_auth_manager.has_permission(user_info, self.permission):
                    return jsonify({"error": "Insufficient permissions"}), 403
                # Add user info to request context
                request.admin_user = user_info
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Admin authentication error: {e}")
                return jsonify({"error": "Authentication failed"}), 500

        # Ensure the wrapper has the same name as the original function
        auth_wrapper.__name__ = f.__name__
        auth_wrapper.__module__ = f.__module__
        return auth_wrapper


def require_legacy_admin_auth(permission: str = "read"):
    """
    Legacy decorator to require admin authentication with specific permission.
    
    DEPRECATED: This function is deprecated and will be removed in a future release.
    Use Supabase admin roles instead.
    
    This function is gated by ENABLE_LEGACY_ADMIN_AUTH environment variable.
    Default: disabled (false)
    Runtime removal date: 90 days from first use
    
    Args:
        permission: Required permission level
    """
    # Check removal date first
    _check_removal_date()
    
    # Check if legacy admin auth is enabled
    enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
    if not enable_legacy:
        logger.warning("DEPRECATED: Legacy admin auth disabled - use Supabase admin roles")
        raise RuntimeError("Legacy admin authentication is disabled. Use Supabase admin roles instead.")
    
    logger.warning("DEPRECATED: Using legacy admin auth - migrate to Supabase admin roles")
    return AdminAuthDecorator(permission)


def require_admin_migrate():
    """Decorator specifically for migration endpoints."""
    return require_legacy_admin_auth("migrate")


def require_admin_write():
    """Decorator for write operations."""
    return require_legacy_admin_auth("write")


def require_admin_delete():
    """Decorator for delete operations."""
    return require_legacy_admin_auth("delete")


class SimpleAdminTokenDecorator:
    """Class-based decorator for simple token authentication."""

    def __init__(self):
        # Add __name__ attribute to avoid conflicts with other decorators
        self.__name__ = "simple_admin_token"

    def __call__(self, f):
        @wraps(f)
        def simple_auth_wrapper(*args, **kwargs):
            try:
                # Check removal date first
                _check_removal_date()
                
                # Check if legacy admin auth is enabled (mirroring require_legacy_admin_auth behavior)
                enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
                if not enable_legacy:
                    logger.warning("DEPRECATED: Legacy simple admin auth disabled - use Supabase admin roles")
                    return jsonify({"error": "Legacy simple admin authentication is disabled. Use Supabase admin roles instead."}), 401
                
                # Production safety check
                if os.getenv("NODE_ENV") == "production" and enable_legacy:
                    logger.error("CRITICAL: Legacy admin authentication cannot be enabled in production")
                    return jsonify({"error": "Legacy admin authentication is disabled in production"}), 401
                
                auth_header = request.headers.get("Authorization")
                if not auth_header:
                    return jsonify({"error": "Authorization header required"}), 401
                
                # Require AdminBearer header pattern (not Bearer)
                if not auth_header.startswith("AdminBearer "):
                    logger.warning("DEPRECATED: Legacy admin auth requires AdminBearer header")
                    return jsonify({"error": "AdminBearer token required"}), 401
                
                token = auth_header.split(" ")[1]
                admin_token = os.getenv("ADMIN_TOKEN")
                if not admin_token or token != admin_token:
                    return jsonify({"error": "Invalid admin token"}), 401
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Simple admin authentication error: {e}")
                return jsonify({"error": "Authentication failed"}), 500

        # Ensure the wrapper has the same name as the original function
        simple_auth_wrapper.__name__ = f.__name__
        simple_auth_wrapper.__module__ = f.__module__
        return simple_auth_wrapper


# Legacy compatibility - simple token check for backward compatibility
def require_simple_admin_token():
    """
    Legacy decorator for simple token-based authentication.
    
    DEPRECATED: This function is deprecated and will be removed in a future release.
    Use Supabase admin roles instead.
    
    This function is gated by ENABLE_LEGACY_ADMIN_AUTH environment variable.
    Default: disabled (false)
    Runtime removal date: 90 days from first use
    """
    # Check removal date first
    _check_removal_date()
    
    # Check if legacy admin auth is enabled
    enable_legacy = os.getenv("ENABLE_LEGACY_ADMIN_AUTH", "false").lower() == "true"
    if not enable_legacy:
        logger.warning("DEPRECATED: Legacy simple admin auth disabled - use Supabase admin roles")
        raise RuntimeError("Legacy simple admin authentication is disabled. Use Supabase admin roles instead.")
    
    logger.warning("DEPRECATED: Using legacy simple admin auth - migrate to Supabase admin roles")
    return SimpleAdminTokenDecorator()


# Import require_admin_auth from security module for compatibility
try:
    from utils.security import require_admin_auth
    logger.debug("Successfully imported require_admin_auth from utils.security")
except ImportError:
    # Fallback: create a basic admin auth decorator if security module not available
    def require_admin_auth(f):
        """Fallback admin auth decorator when security module not available."""
        @wraps(f)
        def wrapper(*args, **kwargs):
            logger.warning("require_admin_auth fallback used - security module not available")
            return f(*args, **kwargs)
        return wrapper
    logger.warning("Using fallback require_admin_auth - security module not available")

# Backward compatibility alias - will be removed in future release
def require_legacy_admin_auth_compat(permission: str = "read"):
    """
    DEPRECATED: Backward compatibility alias for require_legacy_admin_auth.
    This function will be removed in a future release.
    Use Supabase admin roles instead.
    """
    logger.warning("DEPRECATED: require_admin_auth is deprecated - use require_legacy_admin_auth or migrate to Supabase admin roles")
    return require_legacy_admin_auth(permission)
