"""
Role-Based Access Control (RBAC) system for PostgreSQL authentication.

This module provides comprehensive role and permission management using
PostgreSQL as the source of truth.
"""

from typing import Dict, List, Set, Optional, Any
from functools import wraps
from flask import request, jsonify, g
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError
from utils.postgres_auth import get_postgres_auth
from services.auth.token_manager_v5 import TokenManagerV5

logger = get_logger(__name__)


class RoleBasedAccessControl:
    """Role-based access control system with hierarchical permissions."""
    
    # Define system roles and their hierarchical levels
    ROLES = {
        'guest': {
            'level': 0,
            'permissions': [
                'read_restaurants',
                'view_public_content'
            ],
            'description': 'Guest user with read-only public access'
        },
        'user': {
            'level': 1,
            'permissions': [
                'read_restaurants',
                'create_reviews',
                'manage_own_profile',
                'view_public_content'
            ],
            'description': 'Standard user with basic access'
        },
        'premium_user': {
            'level': 2,
            'permissions': [
                'read_restaurants',
                'create_reviews',
                'manage_own_profile',
                'view_public_content',
                'access_premium_features',
                'unlimited_reviews'
            ],
            'description': 'Premium user with enhanced features'
        },
        'moderator': {
            'level': 5,
            'permissions': [
                'read_restaurants',
                'create_reviews',
                'manage_own_profile',
                'view_public_content',
                'moderate_reviews',
                'edit_restaurant_hours',
                'view_reported_content',
                'manage_user_reports'
            ],
            'description': 'Content moderator with review management access'
        },
        'restaurant_owner': {
            'level': 6,
            'permissions': [
                'read_restaurants',
                'create_reviews',
                'manage_own_profile',
                'view_public_content',
                'manage_own_restaurant',
                'respond_to_reviews',
                'update_restaurant_info',
                'view_restaurant_analytics'
            ],
            'description': 'Restaurant owner with business management access'
        },
        'admin': {
            'level': 10,
            'permissions': [
                'read_restaurants',
                'create_reviews',
                'manage_own_profile',
                'view_public_content',
                'moderate_reviews',
                'edit_restaurant_hours',
                'view_reported_content',
                'manage_user_reports',
                'manage_users',
                'manage_restaurants',
                'access_admin_panel',
                'view_analytics',
                'system_configuration'
            ],
            'description': 'System administrator with full management access'
        },
        'super_admin': {
            'level': 99,
            'permissions': ['all'],
            'description': 'Super administrator with unrestricted access'
        }
    }
    
    # Special permissions that require specific handling
    SPECIAL_PERMISSIONS = {
        'all': 'Grants access to all system functions',
        'system_admin': 'Administrative access to system functions',
        'database_admin': 'Database administration access',
        'security_admin': 'Security configuration access'
    }
    
    @classmethod
    def get_role_permissions(cls, role: str) -> Set[str]:
        """Get all permissions for a given role."""
        role_config = cls.ROLES.get(role, {})
        permissions = role_config.get('permissions', [])
        
        # Handle 'all' permission
        if 'all' in permissions:
            all_permissions = set()
            for r in cls.ROLES.values():
                if r.get('permissions') != ['all']:
                    all_permissions.update(r.get('permissions', []))
            return all_permissions
        
        return set(permissions)
    
    @classmethod
    def get_user_permissions(cls, user_roles: List[Dict[str, Any]]) -> Set[str]:
        """Get all permissions for a user based on their roles."""
        permissions = set()
        
        for role_data in user_roles:
            role_name = role_data.get('role')
            if role_name in cls.ROLES:
                permissions.update(cls.get_role_permissions(role_name))
        
        return permissions
    
    @classmethod
    def check_permission(cls, user_roles: List[Dict[str, Any]], required_permission: str) -> bool:
        """Check if user has required permission."""
        user_permissions = cls.get_user_permissions(user_roles)
        
        # Check for 'all' permission
        if 'all' in user_permissions:
            return True
        
        return required_permission in user_permissions
    
    @classmethod
    def check_role_level(cls, user_roles: List[Dict[str, Any]], required_level: int) -> bool:
        """Check if user has minimum role level."""
        if not user_roles:
            return False
        
        max_level = max(role.get('level', 0) for role in user_roles)
        return max_level >= required_level
    
    @classmethod
    def check_specific_role(cls, user_roles: List[Dict[str, Any]], required_role: str) -> bool:
        """Check if user has specific role."""
        user_role_names = {role.get('role') for role in user_roles}
        return required_role in user_role_names
    
    @classmethod
    def get_max_role_level(cls, user_roles: List[Dict[str, Any]]) -> int:
        """Get maximum role level for user."""
        if not user_roles:
            return 0
        
        return max(role.get('level', 0) for role in user_roles)
    
    @classmethod
    def is_admin(cls, user_roles: List[Dict[str, Any]]) -> bool:
        """Check if user has admin-level access."""
        return cls.check_role_level(user_roles, 10)  # Admin level or higher
    
    @classmethod
    def is_moderator(cls, user_roles: List[Dict[str, Any]]) -> bool:
        """Check if user has moderator-level access."""
        return cls.check_role_level(user_roles, 5)  # Moderator level or higher
    
    @classmethod
    def get_role_hierarchy(cls) -> Dict[str, int]:
        """Get role hierarchy mapping."""
        return {role: config['level'] for role, config in cls.ROLES.items()}


def require_auth(f):
    """Decorator to require valid authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Extract token from Authorization header or cookies
            from utils.auth_helpers import extract_token_from_request
            token = extract_token_from_request(request)
            if not token:
                raise AuthenticationError("Authentication required")
            
            # Verify with TokenManagerV5 then load user from DB
            tm = TokenManagerV5()
            payload = tm.verify_token(token)
            if not payload or payload.get('type') != 'access':
                raise AuthenticationError("Invalid or expired token")

            uid = payload.get('uid')
            if not uid:
                raise AuthenticationError("Invalid token payload")

            auth_manager = get_postgres_auth()
            with auth_manager.db.session_scope() as session:
                from sqlalchemy import text
                row = session.execute(
                    text(
                        """
                        SELECT u.id, u.email, u.name, u.email_verified,
                               COALESCE(
                                   JSON_AGG(JSON_BUILD_OBJECT('role', ur.role, 'level', ur.level))
                                   FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid AND u.is_active = TRUE
                        GROUP BY u.id, u.email, u.name, u.email_verified
                        """
                    ),
                    {"uid": uid},
                ).fetchone()
            if not row:
                raise AuthenticationError("User not found")
            import json as _json
            roles = _json.loads(row.roles) if row.roles else []
            user_info = {
                'user_id': row.id,
                'email': row.email,
                'name': row.name,
                'email_verified': row.email_verified,
                'roles': roles,
                'token_payload': payload,
            }
            
            # Add user info to Flask g context
            g.user = user_info
            g.user_id = user_info['user_id']
            g.user_roles = user_info.get('roles', [])
            
            logger.debug(f"User authenticated: {user_info['email']}")
            return f(*args, **kwargs)
            
        except AuthenticationError as e:
            logger.warning(f"Authentication failed: {e}")
            return jsonify({'error': 'Authentication required', 'message': str(e)}), 401
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return jsonify({'error': 'Authentication failed'}), 500
    
    return decorated_function


def require_permission(permission: str):
    """Decorator to require specific permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user_roles = getattr(g, 'user_roles', [])
            if not user_roles:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check permission
            rbac = RoleBasedAccessControl()
            if not rbac.check_permission(user_roles, permission):
                logger.warning(
                    f"Permission denied: user {g.get('user_id')} lacks permission '{permission}'"
                )
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_permission': permission
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_role(role: str):
    """Decorator to require specific role."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user_roles = getattr(g, 'user_roles', [])
            if not user_roles:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check role
            rbac = RoleBasedAccessControl()
            if not rbac.check_specific_role(user_roles, role):
                logger.warning(
                    f"Role check failed: user {g.get('user_id')} lacks role '{role}'"
                )
                return jsonify({
                    'error': 'Insufficient privileges',
                    'required_role': role
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_role_level(level: int):
    """Decorator to require minimum role level."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check if user is authenticated
            user_roles = getattr(g, 'user_roles', [])
            if not user_roles:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check role level
            rbac = RoleBasedAccessControl()
            if not rbac.check_role_level(user_roles, level):
                logger.warning(
                    f"Role level check failed: user {g.get('user_id')} lacks level {level}"
                )
                return jsonify({
                    'error': 'Insufficient role level',
                    'required_level': level
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_admin(f):
    """Decorator to require admin role (level 10+)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check if user is authenticated
        user_roles = getattr(g, 'user_roles', [])
        if not user_roles:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check admin role
        rbac = RoleBasedAccessControl()
        if not rbac.is_admin(user_roles):
            logger.warning(
                f"Admin access denied for user {g.get('user_id')}"
            )
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def require_moderator(f):
    """Decorator to require moderator role (level 5+)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check if user is authenticated
        user_roles = getattr(g, 'user_roles', [])
        if not user_roles:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check moderator role
        rbac = RoleBasedAccessControl()
        if not rbac.is_moderator(user_roles):
            logger.warning(
                f"Moderator access denied for user {g.get('user_id')}"
            )
            return jsonify({'error': 'Moderator access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def optional_auth(f):
    """Decorator for optional authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Extract token from header or cookies (optional)
            from utils.auth_helpers import extract_token_from_request
            token = extract_token_from_request(request)
            if token:
                tm = TokenManagerV5()
                payload = tm.verify_token(token)
                if payload and payload.get('type') == 'access':
                    uid = payload.get('uid')
                    if uid:
                        auth_manager = get_postgres_auth()
                        with auth_manager.db.session_scope() as session:
                            from sqlalchemy import text
                            row = session.execute(
                                text(
                                    """
                                    SELECT u.id, u.email,
                                           COALESCE(
                                               JSON_AGG(JSON_BUILD_OBJECT('role', ur.role, 'level', ur.level))
                                               FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                               '[]'
                                           ) AS roles
                                    FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
                                    WHERE u.id = :uid AND u.is_active = TRUE
                                    GROUP BY u.id, u.email
                                    """
                                ),
                                {"uid": uid},
                            ).fetchone()
                        if row:
                            import json as _json
                            roles = _json.loads(row.roles) if row.roles else []
                            user_info = {'user_id': row.id, 'email': row.email, 'roles': roles, 'token_payload': payload}
                            g.user = user_info
                            g.user_id = user_info['user_id']
                            g.user_roles = user_info.get('roles', [])
                            logger.debug(f"Optional auth successful: {user_info['email']}")
                    g.user = user_info
                    g.user_id = user_info['user_id']
                    g.user_roles = user_info.get('roles', [])
                    logger.debug(f"Optional auth successful: {user_info['email']}")
        except Exception as e:
            logger.debug(f"Optional auth failed (ignored): {e}")
        
        # Continue regardless of auth status
        return f(*args, **kwargs)
    
    return decorated_function


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current authenticated user from Flask g context."""
    return getattr(g, 'user', None)


def get_current_user_id() -> Optional[str]:
    """Get current user ID from Flask g context."""
    return getattr(g, 'user_id', None)


def get_current_user_roles() -> List[Dict[str, Any]]:
    """Get current user roles from Flask g context."""
    return getattr(g, 'user_roles', [])


def check_user_permission(permission: str) -> bool:
    """Check if current user has specific permission."""
    user_roles = get_current_user_roles()
    if not user_roles:
        return False
    
    rbac = RoleBasedAccessControl()
    return rbac.check_permission(user_roles, permission)


def check_user_role_level(level: int) -> bool:
    """Check if current user has minimum role level."""
    user_roles = get_current_user_roles()
    if not user_roles:
        return False
    
    rbac = RoleBasedAccessControl()
    return rbac.check_role_level(user_roles, level)


def is_current_user_admin() -> bool:
    """Check if current user is admin."""
    user_roles = get_current_user_roles()
    if not user_roles:
        return False
    
    rbac = RoleBasedAccessControl()
    return rbac.is_admin(user_roles)


def is_current_user_moderator() -> bool:
    """Check if current user is moderator."""
    user_roles = get_current_user_roles()
    if not user_roles:
        return False
    
    rbac = RoleBasedAccessControl()
    return rbac.is_moderator(user_roles)


# Backward compatibility aliases for existing code
require_user_auth = require_auth
optional_user_auth = optional_auth
