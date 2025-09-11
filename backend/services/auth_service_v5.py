"""
V5 Authentication Service

Provides centralized authentication and authorization services
with consistent patterns, caching, and monitoring.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets
from backend.utils.logging_config import get_logger
from backend.cache.redis_manager_v5 import get_redis_manager_v5
from backend.database.connection_manager import get_connection_manager
from backend.utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

class AuthServiceV5:
    """V5 Authentication Service with Redis caching and feature flags."""
    
    def __init__(self, redis_manager=None, connection_manager=None, feature_flags=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.connection_manager = connection_manager or get_connection_manager()
        self.feature_flags = feature_flags or FeatureFlagsV5()
        
        # JWT configuration
        self.jwt_secret = self._get_jwt_secret()
        self.jwt_algorithm = 'HS256'
        self.access_token_expiry = timedelta(hours=1)
        self.refresh_token_expiry = timedelta(days=30)
        
        logger.info("AuthServiceV5 initialized")
    
    def _get_jwt_secret(self) -> str:
        """Get JWT secret from environment or generate a default one."""
        import os
        secret = os.getenv('JWT_SECRET')
        if not secret:
            logger.warning("JWT_SECRET not set, using default (not recommended for production)")
            secret = "default-jwt-secret-change-in-production"
        return secret
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User data if authentication successful, None otherwise
        """
        try:
            # Hash password for comparison
            password_hash = self._hash_password(password)
            
            # Check cache first
            cache_key = f"auth:user:{email}"
            cached_user = await self.redis_manager.get(cache_key, prefix='auth')
            
            if cached_user:
                logger.debug(f"User {email} found in cache")
                # Verify password
                if cached_user.get('password_hash') == password_hash:
                    return self._sanitize_user_data(cached_user)
                else:
                    logger.warning(f"Invalid password for user {email}")
                    return None
            
            # Query database
            with self.connection_manager.get_session() as session:
                # This would be replaced with actual database query
                # For now, return a stub response
                user_data = {
                    'id': 'stub_user_id',
                    'email': email,
                    'password_hash': password_hash,
                    'roles': ['user'],
                    'permissions': ['read'],
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                # Cache user data
                await self.redis_manager.set(
                    cache_key, 
                    user_data, 
                    ttl=3600,  # 1 hour
                    prefix='auth'
                )
                
                logger.info(f"User {email} authenticated successfully")
                return self._sanitize_user_data(user_data)
                
        except Exception as e:
            logger.error(f"Authentication error for user {email}: {e}")
            return None
    
    async def generate_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate access and refresh tokens for user.
        
        Args:
            user_data: User data dictionary
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        try:
            user_id = user_data['id']
            now = datetime.utcnow()
            
            # Access token payload
            access_payload = {
                'user_id': user_id,
                'email': user_data['email'],
                'roles': user_data.get('roles', []),
                'permissions': user_data.get('permissions', []),
                'type': 'access',
                'iat': now,
                'exp': now + self.access_token_expiry
            }
            
            # Refresh token payload
            refresh_payload = {
                'user_id': user_id,
                'type': 'refresh',
                'iat': now,
                'exp': now + self.refresh_token_expiry
            }
            
            # Generate tokens
            access_token = jwt.encode(access_payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            refresh_token = jwt.encode(refresh_payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            # Store refresh token in cache
            refresh_key = f"auth:refresh:{user_id}"
            await self.redis_manager.set(
                refresh_key,
                refresh_token,
                ttl=int(self.refresh_token_expiry.total_seconds()),
                prefix='auth'
            )
            
            logger.info(f"Tokens generated for user {user_id}")
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': int(self.access_token_expiry.total_seconds())
            }
            
        except Exception as e:
            logger.error(f"Token generation error: {e}")
            raise
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token and return user data.
        
        Args:
            token: JWT token to validate
            
        Returns:
            User data if token is valid, None otherwise
        """
        try:
            # Decode token
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            # Check token type
            if payload.get('type') != 'access':
                logger.warning("Invalid token type")
                return None
            
            # Check expiration
            if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
                logger.warning("Token expired")
                return None
            
            # Return user data
            return {
                'user_id': payload['user_id'],
                'email': payload['email'],
                'roles': payload.get('roles', []),
                'permissions': payload.get('permissions', [])
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New access token data if successful, None otherwise
        """
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            # Check token type
            if payload.get('type') != 'refresh':
                logger.warning("Invalid refresh token type")
                return None
            
            user_id = payload['user_id']
            
            # Verify refresh token is in cache
            refresh_key = f"auth:refresh:{user_id}"
            cached_refresh = await self.redis_manager.get(refresh_key, prefix='auth')
            
            if cached_refresh != refresh_token:
                logger.warning(f"Refresh token mismatch for user {user_id}")
                return None
            
            # Get user data
            user_data = await self._get_user_by_id(user_id)
            if not user_data:
                logger.warning(f"User {user_id} not found")
                return None
            
            # Generate new access token
            tokens = await self.generate_tokens(user_data)
            
            logger.info(f"Access token refreshed for user {user_id}")
            return tokens
            
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid refresh token")
            return None
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    async def revoke_token(self, user_id: str) -> bool:
        """
        Revoke all tokens for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Remove refresh token from cache
            refresh_key = f"auth:refresh:{user_id}"
            await self.redis_manager.delete(refresh_key, prefix='auth')
            
            # Remove user from cache
            user_key = f"auth:user:{user_id}"
            await self.redis_manager.delete(user_key, prefix='auth')
            
            logger.info(f"Tokens revoked for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Token revocation error for user {user_id}: {e}")
            return False
    
    async def check_permission(self, user_id: str, permission: str) -> bool:
        """
        Check if user has specific permission.
        
        Args:
            user_id: User ID
            permission: Permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        try:
            # Get user data
            user_data = await self._get_user_by_id(user_id)
            if not user_data:
                return False
            
            # Check permission
            user_permissions = user_data.get('permissions', [])
            return permission in user_permissions
            
        except Exception as e:
            logger.error(f"Permission check error for user {user_id}: {e}")
            return False
    
    async def check_role(self, user_id: str, role: str) -> bool:
        """
        Check if user has specific role.
        
        Args:
            user_id: User ID
            role: Role to check
            
        Returns:
            True if user has role, False otherwise
        """
        try:
            # Get user data
            user_data = await self._get_user_by_id(user_id)
            if not user_data:
                return False
            
            # Check role
            user_roles = user_data.get('roles', [])
            return role in user_roles
            
        except Exception as e:
            logger.error(f"Role check error for user {user_id}: {e}")
            return False
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _sanitize_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from user object."""
        sanitized = user_data.copy()
        sanitized.pop('password_hash', None)
        return sanitized
    
    async def _get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by ID from cache or database."""
        try:
            # Check cache first
            cache_key = f"auth:user:{user_id}"
            cached_user = await self.redis_manager.get(cache_key, prefix='auth')
            
            if cached_user:
                return cached_user
            
            # Query database
            with self.connection_manager.get_session() as session:
                # This would be replaced with actual database query
                # For now, return a stub response
                user_data = {
                    'id': user_id,
                    'email': f'user{user_id}@example.com',
                    'roles': ['user'],
                    'permissions': ['read'],
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                # Cache user data
                await self.redis_manager.set(
                    cache_key, 
                    user_data, 
                    ttl=3600,  # 1 hour
                    prefix='auth'
                )
                
                return user_data
                
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None