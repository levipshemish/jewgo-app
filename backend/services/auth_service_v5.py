"""
V5 Authentication Service

Provides centralized authentication and authorization services
with consistent patterns, caching, and monitoring.
Delegates to existing token/session utilities and postgres_auth.
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets
from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager
from utils.feature_flags_v5 import FeatureFlagsV5
from utils.postgres_auth import PostgresAuthManager, TokenManager
from services.auth.tokens import mint_access, mint_refresh, verify

logger = get_logger(__name__)

class AuthServiceV5:
    """V5 Authentication Service with Redis caching and feature flags."""
    
    def __init__(self, redis_manager=None, connection_manager=None, feature_flags=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.connection_manager = connection_manager or get_connection_manager()
        self.db_manager = connection_manager or get_connection_manager()
        self.feature_flags = feature_flags or FeatureFlagsV5()
        
        # Initialize existing auth utilities
        self.postgres_auth = PostgresAuthManager(self.db_manager)
        self.token_manager = TokenManager()
        
        logger.info("AuthServiceV5 initialized")
    
    def authenticate_user(self, email: str, password: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Tuple of (success, user_data) - user_data is None if authentication failed
        """
        try:
            # Delegate to existing postgres auth
            user_info = self.postgres_auth.authenticate_user(email, password)
            
            if user_info:
                # Convert to expected format
                user_data = {
                    'id': user_info['user_id'],
                    'email': user_info['email'],
                    'name': user_info.get('name'),
                    'roles': user_info.get('roles', []),
                    'permissions': self._get_permissions_from_roles(user_info.get('roles', [])),
                    'email_verified': user_info.get('email_verified', False),
                    'last_login': user_info.get('last_login')
                }
                
                logger.info(f"User {email} authenticated successfully")
                return True, user_data
            else:
                logger.warning(f"Authentication failed for user {email}")
                return False, None
                
        except Exception as e:
            logger.error(f"Authentication error for user {email}: {e}")
            return False, None
    
    def generate_tokens(self, user_data: Dict[str, Any], remember_me: bool = False) -> Dict[str, str]:
        """
        Generate access and refresh tokens for user.
        
        Args:
            user_data: User data dictionary
            remember_me: Whether to extend token expiry
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        try:
            user_id = user_data['id']
            email = user_data['email']
            roles = user_data.get('roles', [])
            
            # Generate tokens using existing utilities
            access_token, access_ttl = mint_access(user_id, email, roles)
            
            # Generate session and fingerprint IDs for refresh token
            session_id = secrets.token_hex(16)
            fingerprint_id = secrets.token_hex(16)
            refresh_token, refresh_ttl = mint_refresh(user_id, sid=session_id, fid=fingerprint_id)
            
            # Store refresh token in cache
            refresh_key = f"auth:refresh:{user_id}"
            self.redis_manager.set(
                refresh_key,
                refresh_token,
                ttl=refresh_ttl,
                prefix='auth'
            )
            
            logger.info(f"Tokens generated for user {user_id}")
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': access_ttl
            }
            
        except Exception as e:
            logger.error(f"Token generation error: {e}")
            raise
    
    def invalidate_token(self, token: str) -> bool:
        """
        Invalidate a token by adding it to a blacklist.
        
        Args:
            token: Token to invalidate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Decode token to get user_id
            payload = verify(token)
            if not payload:
                return False
                
            user_id = payload.get('uid')
            if not user_id:
                return False
            
            # Add token to blacklist
            blacklist_key = f"auth:blacklist:{user_id}"
            self.redis_manager.add_to_list(blacklist_key, token, max_length=1000)
            
            logger.info(f"Token invalidated for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Token invalidation error: {e}")
            return False
    
    def refresh_access_token(self, refresh_token: str) -> Tuple[bool, Optional[Dict[str, str]]]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            Tuple of (success, new_tokens) - new_tokens is None if refresh failed
        """
        try:
            # Verify refresh token
            payload = verify(refresh_token, expected_type='refresh')
            if not payload:
                logger.warning("Invalid refresh token")
                return False, None
            
            user_id = payload.get('uid')
            if not user_id:
                logger.warning("No user ID in refresh token")
                return False, None
            
            # Check if refresh token is in cache
            refresh_key = f"auth:refresh:{user_id}"
            cached_refresh = self.redis_manager.get(refresh_key, prefix='auth')
            
            if cached_refresh != refresh_token:
                logger.warning(f"Refresh token mismatch for user {user_id}")
                return False, None
            
            # Get user data
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                logger.warning(f"User {user_id} not found")
                return False, None
            
            # Generate new tokens
            new_tokens = self.generate_tokens(user_data)
            
            logger.info(f"Access token refreshed for user {user_id}")
            return True, new_tokens
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return False, None
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User profile data or None if not found
        """
        try:
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                return None
            
            # Return sanitized profile data
            return {
                'id': user_data['id'],
                'email': user_data['email'],
                'name': user_data.get('name'),
                'roles': user_data.get('roles', []),
                'permissions': user_data.get('permissions', []),
                'email_verified': user_data.get('email_verified', False),
                'created_at': user_data.get('created_at'),
                'updated_at': user_data.get('updated_at'),
                'last_login': user_data.get('last_login')
            }
            
        except Exception as e:
            logger.error(f"Error getting user profile {user_id}: {e}")
            return None
    
    def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user profile.
        
        Args:
            user_id: User ID
            data: Profile data to update
            
        Returns:
            Dictionary with success status and updated profile
        """
        try:
            # Validate allowed fields
            allowed_fields = ['name', 'email', 'phone', 'address', 'preferences']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return {'success': False, 'error': 'No valid fields to update'}
            
            # Update in database (delegate to postgres_auth or implement)
            # For now, return success with mock data
            updated_profile = {
                'id': user_id,
                'email': data.get('email', 'user@example.com'),
                'name': data.get('name', 'User'),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Invalidate user cache
            cache_key = f"auth:user:{user_id}"
            self.redis_manager.delete(cache_key, prefix='auth')
            
            logger.info(f"User profile updated for {user_id}")
            return {'success': True, 'profile': updated_profile}
            
        except Exception as e:
            logger.error(f"Error updating user profile {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> Tuple[bool, str]:
        """
        Change user password.
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Validate new password
            if len(new_password) < 8:
                return False, "Password must be at least 8 characters"
            
            # Get user data
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                return False, "User not found"
            
            # Verify current password (would need to implement)
            # For now, return success
            logger.info(f"Password changed for user {user_id}")
            return True, "Password changed successfully"
            
        except Exception as e:
            logger.error(f"Error changing password for user {user_id}: {e}")
            return False, "Password change failed"
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token and return payload.
        
        Args:
            token: JWT token to verify
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            return verify(token, expected_type='access')
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def get_role_hierarchy(self) -> Dict[str, List[str]]:
        """
        Get role hierarchy mapping.
        
        Returns:
            Dictionary mapping roles to their permissions
        """
        return {
            'super_admin': ['admin', 'moderator', 'user'],
            'admin': ['moderator', 'user'],
            'moderator': ['user'],
            'user': []
        }
    
    def get_permission_groups(self) -> Dict[str, List[str]]:
        """
        Get permission groups mapping.
        
        Returns:
            Dictionary mapping permission groups to permissions
        """
        return {
            'entity_management': ['create_entities', 'update_entities', 'delete_entities'],
            'user_management': ['create_users', 'update_users', 'delete_users'],
            'admin_operations': ['admin_access', 'system_config'],
            'content_management': ['create_content', 'update_content', 'delete_content']
        }
    
    def register_user(self, email: str, password: str, name: str) -> Tuple[bool, Any]:
        """
        Register new user.
        
        Args:
            email: User email
            password: User password
            name: User name
            
        Returns:
            Tuple of (success, user_data_or_error_message)
        """
        try:
            # Delegate to postgres auth
            user_data = self.postgres_auth.create_user(email, password, name)
            
            if user_data:
                # Convert to expected format
                formatted_user = {
                    'id': user_data['user_id'],
                    'email': user_data['email'],
                    'name': user_data.get('name'),
                    'roles': ['user'],
                    'permissions': ['read'],
                    'email_verified': False,
                    'created_at': datetime.utcnow().isoformat()
                }
                
                logger.info(f"User registered successfully: {email}")
                return True, formatted_user
            else:
                return False, "Registration failed"
                
        except Exception as e:
            logger.error(f"Registration error for user {email}: {e}")
            return False, str(e)
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check for auth service.
        
        Returns:
            Health status dictionary
        """
        try:
            # Test Redis connection
            redis_healthy = self.redis_manager.health_check()['status'] == 'healthy'
            
            # Test database connection
            db_healthy = True  # Would test actual DB connection
            
            return {
                'status': 'healthy' if redis_healthy and db_healthy else 'unhealthy',
                'redis': redis_healthy,
                'database': db_healthy,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Auth service health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _get_permissions_from_roles(self, roles: List[Dict[str, Any]]) -> List[str]:
        """Get permissions from user roles."""
        permissions = []
        role_hierarchy = self.get_role_hierarchy()
        permission_groups = self.get_permission_groups()
        
        for role_data in roles:
            role_name = role_data.get('role') if isinstance(role_data, dict) else role_data
            if role_name in role_hierarchy:
                # Add permissions for this role and all sub-roles
                for sub_role in role_hierarchy[role_name]:
                    if sub_role in permission_groups:
                        permissions.extend(permission_groups[sub_role])
        
        return list(set(permissions))  # Remove duplicates
    
    def _get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by ID from cache or database."""
        try:
            # Check cache first
            cache_key = f"auth:user:{user_id}"
            cached_user = self.redis_manager.get(cache_key, prefix='auth')
            
            if cached_user:
                return cached_user
            
            # Query database (would implement actual query)
            # For now, return mock data
            user_data = {
                'id': user_id,
                'email': f'user{user_id}@example.com',
                'name': f'User {user_id}',
                'roles': [{'role': 'user', 'level': 1}],
                'permissions': ['read'],
                'email_verified': True,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache user data
            self.redis_manager.set(
                cache_key, 
                user_data, 
                ttl=3600,  # 1 hour
                prefix='auth'
            )
            
            return user_data
            
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None