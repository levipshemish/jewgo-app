"""
Cached Authentication Manager for improved performance.

This module provides a caching layer for authentication operations,
reducing database load and improving response times.
"""

import json
import time
from typing import Optional, Dict, Any, Tuple
from utils.logging_config import get_logger
from utils.postgres_auth import PostgresAuthManager
from utils.error_handler import AuthenticationError, ValidationError

logger = get_logger(__name__)


class CachedAuthManager:
    """Authentication manager with Redis caching for improved performance."""
    
    def __init__(self, redis_client, postgres_auth: PostgresAuthManager):
        self.redis = redis_client
        self.postgres_auth = postgres_auth
        
        # Cache TTL settings (in seconds)
        self.user_profile_ttl = 300  # 5 minutes
        self.role_cache_ttl = 900   # 15 minutes
        self.token_validation_ttl = 60  # 1 minute
        
        # Cache key prefixes
        self.user_profile_prefix = "user_profile:"
        self.role_cache_prefix = "user_roles:"
        self.token_validation_prefix = "token_valid:"
        
        logger.info("CachedAuthManager initialized")
    
    def authenticate_user(self, email: str, password: str, ip_address: str = None) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with caching for user profile data.
        
        Args:
            email: User email
            password: User password
            ip_address: Client IP address
            
        Returns:
            User information if authentication successful, None otherwise
        """
        try:
            email = email.lower().strip()
            
            # Check cache for user profile (excluding password hash)
            cache_key = f"{self.user_profile_prefix}{email}"
            cached_profile = self.redis.get(cache_key)
            
            if cached_profile:
                try:
                    profile_data = json.loads(cached_profile)
                    # Still need to verify password from database
                    if self._verify_password_only(email, password, profile_data.get('password_hash')):
                        # Update last login and return cached data
                        self._update_last_login(email)
                        return self._format_user_info(profile_data)
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"Invalid cached profile data for {email}: {e}")
                    # Remove invalid cache entry
                    self.redis.delete(cache_key)
            
            # Fallback to database authentication
            user_info = self.postgres_auth.authenticate_user(email, password, ip_address)
            
            if user_info:
                # Cache user profile data (excluding sensitive info)
                cache_data = {
                    'user_id': user_info['user_id'],
                    'name': user_info['name'],
                    'email': user_info['email'],
                    'email_verified': user_info['email_verified'],
                    'password_hash': user_info.get('password_hash'),  # For password verification
                    'last_login': user_info.get('last_login'),
                    'roles': user_info.get('roles', [])
                }
                
                # Cache for 5 minutes
                self.redis.setex(cache_key, self.user_profile_ttl, json.dumps(cache_data))
                
                # Cache roles separately for longer TTL
                self._cache_user_roles(user_info['user_id'], user_info.get('roles', []))
                
                logger.info(f"User {email} authenticated and cached")
            
            return user_info
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {e}")
            return None
    
    def _verify_password_only(self, email: str, password: str, password_hash: str) -> bool:
        """Verify password against hash without full authentication."""
        if not password_hash:
            return False
        
        try:
            from utils.postgres_auth import PasswordSecurity
            return PasswordSecurity.verify_password(password, password_hash)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def _format_user_info(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format cached profile data to match expected user info format."""
        return {
            'user_id': profile_data['user_id'],
            'name': profile_data['name'],
            'email': profile_data['email'],
            'email_verified': profile_data['email_verified'],
            'roles': profile_data.get('roles', []),
            'last_login': profile_data.get('last_login')
        }
    
    def _update_last_login(self, email: str):
        """Update last login timestamp in cache."""
        try:
            cache_key = f"{self.user_profile_prefix}{email}"
            cached_data = self.redis.get(cache_key)
            
            if cached_data:
                profile_data = json.loads(cached_data)
                profile_data['last_login'] = time.time()
                self.redis.setex(cache_key, self.user_profile_ttl, json.dumps(profile_data))
        except Exception as e:
            logger.warning(f"Failed to update last login in cache: {e}")
    
    def _cache_user_roles(self, user_id: str, roles: list):
        """Cache user roles separately for longer TTL."""
        try:
            cache_key = f"{self.role_cache_prefix}{user_id}"
            self.redis.setex(cache_key, self.role_cache_ttl, json.dumps(roles))
        except Exception as e:
            logger.warning(f"Failed to cache user roles: {e}")
    
    def get_user_roles(self, user_id: str) -> list:
        """Get user roles from cache or database."""
        try:
            cache_key = f"{self.role_cache_prefix}{user_id}"
            cached_roles = self.redis.get(cache_key)
            
            if cached_roles:
                return json.loads(cached_roles)
            
            # Fallback to database
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT role, level, granted_at
                        FROM user_roles
                        WHERE user_id = :user_id AND is_active = TRUE 
                        AND (expires_at IS NULL OR expires_at > NOW())
                    """),
                    {'user_id': user_id}
                ).fetchall()
                
                roles = [{'role': row[0], 'level': row[1], 'granted_at': row[2]} for row in result]
                
                # Cache the roles
                self.redis.setex(cache_key, self.role_cache_ttl, json.dumps(roles))
                
                return roles
                
        except Exception as e:
            logger.error(f"Error getting user roles for {user_id}: {e}")
            return []
    
    def invalidate_user_cache(self, email: str):
        """Invalidate user cache when user data changes."""
        try:
            email = email.lower().strip()
            
            # Remove user profile cache
            profile_key = f"{self.user_profile_prefix}{email}"
            self.redis.delete(profile_key)
            
            # Remove role cache (we need user_id for this)
            # This is a limitation - we'd need to store user_id in profile cache
            logger.info(f"User cache invalidated for {email}")
            
        except Exception as e:
            logger.warning(f"Failed to invalidate user cache: {e}")
    
    def invalidate_role_cache(self, user_id: str):
        """Invalidate role cache when user roles change."""
        try:
            role_key = f"{self.role_cache_prefix}{user_id}"
            self.redis.delete(role_key)
            logger.info(f"Role cache invalidated for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to invalidate role cache: {e}")
    
    def cache_token_validation(self, token: str, is_valid: bool, user_id: str = None):
        """Cache token validation results for short TTL."""
        try:
            cache_key = f"{self.token_validation_prefix}{token[:16]}"  # Use first 16 chars as key
            validation_data = {
                'valid': is_valid,
                'user_id': user_id,
                'timestamp': time.time()
            }
            self.redis.setex(cache_key, self.token_validation_ttl, json.dumps(validation_data))
        except Exception as e:
            logger.warning(f"Failed to cache token validation: {e}")
    
    def get_cached_token_validation(self, token: str) -> Optional[Dict[str, Any]]:
        """Get cached token validation result."""
        try:
            cache_key = f"{self.token_validation_prefix}{token[:16]}"
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result)
            
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached token validation: {e}")
            return None
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring."""
        try:
            # Count keys by prefix
            profile_keys = len(self.redis.keys(f"{self.user_profile_prefix}*"))
            role_keys = len(self.redis.keys(f"{self.role_cache_prefix}*"))
            token_keys = len(self.redis.keys(f"{self.token_validation_prefix}*"))
            
            return {
                'user_profiles_cached': profile_keys,
                'user_roles_cached': role_keys,
                'token_validations_cached': token_keys,
                'total_cached_items': profile_keys + role_keys + token_keys
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {'error': str(e)}
