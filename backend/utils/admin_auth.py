"""
Admin Authentication Module

This module provides robust authentication for admin endpoints, replacing
the simple token-based authentication with a more secure system.
"""

import os
import jwt
import time
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, current_app
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AdminAuthError(Exception):
    """Raised when admin authentication fails."""
    pass


class AdminAuthManager:
    """Manages admin authentication and authorization."""
    
    def __init__(self):
        self.secret_key = os.getenv("ADMIN_JWT_SECRET", os.getenv("JWT_SECRET", "fallback-secret"))
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
                "permissions": ["read", "write", "delete", "migrate"]
            }
        
        # Add additional admin users if configured
        additional_admins = os.getenv("ADDITIONAL_ADMIN_EMAILS", "").split(",")
        for email in additional_admins:
            email = email.strip()
            if email:
                admin_users[email] = {
                    "email": email,
                    "password_hash": os.getenv(f"ADMIN_PASSWORD_HASH_{email.upper().replace('@', '_').replace('.', '_')}", ""),
                    "role": "admin",
                    "permissions": ["read", "write", "delete", "migrate"]
                }
        
        return admin_users
    
    def generate_admin_token(self, email: str, password: str) -> Optional[str]:
        """Generate an admin JWT token if credentials are valid."""
        if email not in self.admin_users:
            logger.warning(f"Admin login attempt with unknown email: {email}")
            return None
        
        user = self.admin_users[email]
        
        # In production, use proper password hashing (bcrypt, etc.)
        if password != user.get("password_hash", ""):
            logger.warning(f"Admin login attempt with invalid password for: {email}")
            return None
        
        # Generate JWT token
        payload = {
            "email": email,
            "role": user["role"],
            "permissions": user["permissions"],
            "exp": time.time() + self.token_expiry,
            "iat": time.time(),
            "type": "admin"
        }
        
        try:
            token = jwt.encode(payload, self.secret_key, algorithm="HS256")
            logger.info(f"Admin token generated for: {email}")
            return token
        except Exception as e:
            logger.error(f"Error generating admin token: {e}")
            return None
    
    def verify_admin_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify an admin JWT token and return user info."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            
            # Check if token is expired
            if payload.get("exp", 0) < time.time():
                logger.warning("Admin token expired")
                return None
            
            # Check if it's an admin token
            if payload.get("type") != "admin":
                logger.warning("Non-admin token used for admin endpoint")
                return None
            
            # Verify user still exists
            email = payload.get("email")
            if email not in self.admin_users:
                logger.warning(f"Admin token for non-existent user: {email}")
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


def require_admin_auth(permission: str = "read"):
    """Decorator to require admin authentication with specific permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get token from Authorization header
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    return jsonify({"error": "Authorization header required"}), 401
                
                token = auth_header.split(" ")[1]
                
                # Verify token
                user_info = admin_auth_manager.verify_admin_token(token)
                if not user_info:
                    return jsonify({"error": "Invalid or expired token"}), 401
                
                # Check permission
                if not admin_auth_manager.has_permission(user_info, permission):
                    return jsonify({"error": "Insufficient permissions"}), 403
                
                # Add user info to request context
                request.admin_user = user_info
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Admin authentication error: {e}")
                return jsonify({"error": "Authentication failed"}), 500
        
        return decorated_function
    return decorator


def require_admin_migrate():
    """Decorator specifically for migration endpoints."""
    return require_admin_auth("migrate")


def require_admin_write():
    """Decorator for write operations."""
    return require_admin_auth("write")


def require_admin_delete():
    """Decorator for delete operations."""
    return require_admin_auth("delete")


# Legacy compatibility - simple token check for backward compatibility
def require_simple_admin_token():
    """Legacy decorator for simple token-based authentication."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    return jsonify({"error": "Unauthorized"}), 401
                
                token = auth_header.split(" ")[1]
                admin_token = os.getenv("ADMIN_TOKEN")
                
                if not admin_token or token != admin_token:
                    return jsonify({"error": "Invalid admin token"}), 401
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Simple admin authentication error: {e}")
                return jsonify({"error": "Authentication failed"}), 500
        
        return decorated_function
    return decorator
