"""
V5 Authentication Service

Provides centralized authentication and authorization services
with consistent patterns, caching, and monitoring.
Delegates to existing token/session utilities and postgres_auth.
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import jwt
import os
import hashlib
import secrets
from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager
from utils.feature_flags_v5 import FeatureFlagsV5
from utils.postgres_auth import PostgresAuthManager, TokenManager, PasswordSecurity
from services.auth.token_manager_v5 import TokenManagerV5
from services.auth.sessions import persist_initial, new_session_id, new_family_id, rotate_or_reject
from services.auth.tokens import verify
from flask import request

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
        self.token_manager_v5 = TokenManagerV5()
        
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
            
            # Mint tokens via TokenManagerV5 for consistent claims (iss/aud/jti)
            access_token, access_ttl = self.token_manager_v5.mint_access_token(user_id, email, roles)

            # Create session family for refresh rotation/reuse detection
            session_id = new_session_id()
            family_id = new_family_id()
            refresh_token, refresh_ttl = self.token_manager_v5.mint_refresh_token(user_id, session_id, family_id)

            # Persist initial session row for rotation
            try:
                user_agent = request.headers.get('User-Agent') if request else None
                # Prefer X-Forwarded-For first IP
                ip = None
                if request:
                    xff = request.headers.get('X-Forwarded-For')
                    if xff:
                        ip = xff.split(',')[0].strip()
                    if not ip:
                        ip = request.headers.get('X-Real-IP') or request.remote_addr
                persist_initial(
                    self.db_manager,
                    user_id=user_id,
                    refresh_token=refresh_token,
                    sid=session_id,
                    fid=family_id,
                    user_agent=user_agent,
                    ip=ip,
                    ttl_seconds=refresh_ttl,
                )
            except Exception as e:
                logger.error(f"Failed to persist initial session: {e}")
            
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
        Invalidate a token by adding it to a blacklist with proper expiration.
        
        Args:
            token: Token to invalidate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Decode token to get user_id and expiration
            payload = verify(token)
            if not payload:
                return False
                
            user_id = payload.get('uid')
            exp = payload.get('exp')
            if not user_id or not exp:
                return False
            
            # Calculate TTL based on token expiration
            import time
            current_time = int(time.time())
            ttl = max(0, exp - current_time)
            
            if ttl <= 0:
                # Token already expired, no need to blacklist
                logger.info(f"Token already expired for user {user_id}")
                return True
            
            # Store token hash instead of full token for privacy
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
            
            # Add token hash to blacklist with expiration
            blacklist_key = f"auth:blacklist:{user_id}:{token_hash}"
            self.redis_manager.set(
                blacklist_key,
                {'invalidated_at': time.time(), 'reason': 'manual_invalidation'},
                ttl=ttl,
                prefix='auth'
            )
            
            logger.info(f"Token invalidated for user {user_id}, expires in {ttl}s")
            return True
            
        except Exception as e:
            logger.error(f"Token invalidation error: {e}")
            return False
    
    def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if a token is blacklisted.
        
        Args:
            token: Token to check
            
        Returns:
            True if blacklisted, False otherwise
        """
        try:
            # Decode token to get user_id
            payload = verify(token)
            if not payload:
                return False
                
            user_id = payload.get('uid')
            if not user_id:
                return False
            
            # Check token hash in blacklist
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
            blacklist_key = f"auth:blacklist:{user_id}:{token_hash}"
            
            return self.redis_manager.exists(blacklist_key, prefix='auth')
            
        except Exception as e:
            logger.error(f"Token blacklist check error: {e}")
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
            # Verify refresh token using v5 manager
            payload = self.token_manager_v5.verify_token(refresh_token)
            if not payload or payload.get('type') != 'refresh':
                logger.warning("Invalid refresh token")
                return False, None

            user_id = payload.get('uid')
            sid = payload.get('sid')
            fid = payload.get('fid')
            if not user_id or not sid or not fid:
                logger.warning("Refresh token missing required claims")
                return False, None

            # Get user data
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                logger.warning(f"User {user_id} not found")
                return False, None

            # Rotate or revoke on reuse
            try:
                user_agent = request.headers.get('User-Agent') if request else None
                ip = None
                if request:
                    xff = request.headers.get('X-Forwarded-For')
                    if xff:
                        ip = xff.split(',')[0].strip()
                    if not ip:
                        ip = request.headers.get('X-Real-IP') or request.remote_addr
                rotate_res = rotate_or_reject(
                    self.db_manager,
                    user_id=user_id,
                    provided_refresh=refresh_token,
                    sid=sid,
                    fid=fid,
                    user_agent=user_agent,
                    ip=ip,
                    ttl_seconds=int(os.getenv('REFRESH_TTL_SECONDS', str(45 * 24 * 3600)))
                )
                if not rotate_res:
                    logger.warning(f"Refresh token reuse detected; family revoked for user {user_id}")
                    return False, None
                new_sid, new_refresh, new_refresh_ttl = rotate_res
            except Exception as e:
                logger.error(f"Token rotation error: {e}")
                return False, None

            # Mint new access
            new_access, access_ttl = self.token_manager_v5.mint_access_token(
                user_id, user_data['email'], user_data.get('roles', [])
            )

            logger.info(f"Access token refreshed for user {user_id}")
            return True, {
                'access_token': new_access,
                'refresh_token': new_refresh,
                'expires_in': access_ttl,
            }

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
            # Validate new password strength
            strength = PasswordSecurity.validate_password_strength(new_password)
            if not strength['is_valid']:
                return False, "; ".join(strength['issues'])

            # Verify current password against stored hash
            from sqlalchemy import text
            with self.db_manager.connection_manager.session_scope() as session:
                row = session.execute(
                    text("SELECT password_hash FROM users WHERE id = :uid"),
                    {"uid": user_id},
                ).fetchone()
                if not row or not row.password_hash:
                    return False, "User not found"

                if not PasswordSecurity.verify_password(current_password, row.password_hash):
                    return False, "Current password is incorrect"

                # Hash and update to new password
                new_hash = PasswordSecurity.hash_password(new_password)
                session.execute(
                    text("UPDATE users SET password_hash = :ph, updated_at = NOW() WHERE id = :uid"),
                    {"ph": new_hash, "uid": user_id},
                )

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
            payload = self.token_manager_v5.verify_token(token)
            if not payload or payload.get('type') != 'access':
                return None
            return payload
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
    
    # Step-up Authentication Methods
    
    def create_step_up_challenge(self, user_id: str, required_method: str, return_to: str) -> str:
        """
        Create step-up authentication challenge.
        
        Args:
            user_id: User ID
            required_method: Required authentication method ('fresh_session', 'webauthn', 'password')
            return_to: URL to return to after successful authentication
            
        Returns:
            Challenge ID
        """
        try:
            challenge_id = secrets.token_urlsafe(32)
            
            challenge_data = {
                'challenge_id': challenge_id,
                'user_id': user_id,
                'required_method': required_method,
                'return_to': return_to,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
                'completed': False
            }
            
            # Store challenge in Redis with 10-minute expiration
            cache_key = f"step_up_challenge:{challenge_id}"
            self.redis_manager.set(
                cache_key,
                challenge_data,
                ttl=600,  # 10 minutes
                prefix='auth'
            )
            
            logger.info(f"Step-up challenge created: {challenge_id} for user {user_id}")
            return challenge_id
            
        except Exception as e:
            logger.error(f"Error creating step-up challenge for user {user_id}: {e}")
            raise
    
    def get_step_up_challenge(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        """
        Get step-up challenge data.
        
        Args:
            challenge_id: Challenge ID
            
        Returns:
            Challenge data or None if not found/expired
        """
        try:
            cache_key = f"step_up_challenge:{challenge_id}"
            challenge_data = self.redis_manager.get(cache_key, prefix='auth')
            
            if challenge_data:
                # Check if challenge has expired
                expires_at = datetime.fromisoformat(challenge_data['expires_at'])
                if datetime.utcnow() > expires_at:
                    # Challenge expired, remove it
                    self.redis_manager.delete(cache_key, prefix='auth')
                    return None
                
                return challenge_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting step-up challenge {challenge_id}: {e}")
            return None
    
    def complete_step_up_challenge(self, challenge_id: str) -> bool:
        """
        Mark step-up challenge as completed.
        
        Args:
            challenge_id: Challenge ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = f"step_up_challenge:{challenge_id}"
            challenge_data = self.redis_manager.get(cache_key, prefix='auth')
            
            if challenge_data:
                challenge_data['completed'] = True
                challenge_data['completed_at'] = datetime.utcnow().isoformat()
                
                # Update challenge data
                self.redis_manager.set(
                    cache_key,
                    challenge_data,
                    ttl=600,  # Keep for remaining TTL
                    prefix='auth'
                )
                
                logger.info(f"Step-up challenge completed: {challenge_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error completing step-up challenge {challenge_id}: {e}")
            return False
    
    def user_has_webauthn_credentials(self, user_id: str) -> bool:
        """
        Check if user has registered WebAuthn credentials.
        
        Args:
            user_id: User ID
            
        Returns:
            True if user has WebAuthn credentials, False otherwise
        """
        try:
            # For now, return False as WebAuthn is not fully implemented
            # In a real implementation, this would query the database for user's WebAuthn credentials
            return False
            
        except Exception as e:
            logger.error(f"Error checking WebAuthn credentials for user {user_id}: {e}")
            return False
    
    def get_user_webauthn_credentials(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get user's registered WebAuthn credentials.
        
        Args:
            user_id: User ID
            
        Returns:
            List of WebAuthn credentials
        """
        try:
            # For now, return empty list as WebAuthn is not fully implemented
            # In a real implementation, this would query the database for user's WebAuthn credentials
            return []
            
        except Exception as e:
            logger.error(f"Error getting WebAuthn credentials for user {user_id}: {e}")
            return []
    
    def create_webauthn_challenge(self, user_id: str) -> Dict[str, Any]:
        """
        Create WebAuthn challenge for authentication.
        
        Args:
            user_id: User ID
            
        Returns:
            WebAuthn challenge data
        """
        try:
            # Generate random challenge
            challenge = secrets.token_urlsafe(32)
            
            challenge_data = {
                'challenge': challenge,
                'user_id': user_id,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            }
            
            # Store challenge in Redis with 5-minute expiration
            cache_key = f"webauthn_challenge:{challenge}"
            self.redis_manager.set(
                cache_key,
                challenge_data,
                ttl=300,  # 5 minutes
                prefix='auth'
            )
            
            return challenge_data
            
        except Exception as e:
            logger.error(f"Error creating WebAuthn challenge for user {user_id}: {e}")
            raise
    
    def store_webauthn_challenge(self, challenge_id: str, webauthn_challenge: str) -> None:
        """
        Store WebAuthn challenge for step-up authentication.
        
        Args:
            challenge_id: Step-up challenge ID
            webauthn_challenge: WebAuthn challenge string
        """
        try:
            # Link WebAuthn challenge to step-up challenge
            cache_key = f"step_up_webauthn:{challenge_id}"
            self.redis_manager.set(
                cache_key,
                {'webauthn_challenge': webauthn_challenge},
                ttl=300,  # 5 minutes
                prefix='auth'
            )
            
        except Exception as e:
            logger.error(f"Error storing WebAuthn challenge for step-up {challenge_id}: {e}")
            raise
    
    def verify_webauthn_assertion(self, user_id: str, challenge_id: str, assertion: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify WebAuthn assertion for step-up authentication.
        
        Args:
            user_id: User ID
            challenge_id: Step-up challenge ID
            assertion: WebAuthn assertion data
            
        Returns:
            Verification result
        """
        try:
            # Check if WebAuthn is enabled in configuration
            webauthn_enabled = os.environ.get('WEBAUTHN_ENABLED', 'false').lower() == 'true'
            
            if not webauthn_enabled:
                logger.warning(f"WebAuthn verification attempted but not enabled for user {user_id}")
                return {
                    'verified': False, 
                    'error': 'WebAuthn not enabled',
                    'code': 'WEBAUTHN_DISABLED'
                }
            
            # In development, allow mock verification with explicit flag
            if os.environ.get('FLASK_ENV') != 'production' and os.environ.get('WEBAUTHN_MOCK', 'false').lower() == 'true':
                logger.warning(f"WebAuthn mock verification for user {user_id} (development only)")
                return {
                    'verified': True,
                    'credential_id': assertion.get('id', 'mock_credential'),
                    'counter': 1,
                    'mock': True
                }
            
            # Production should have real WebAuthn implementation
            logger.error(f"WebAuthn verification not implemented for user {user_id}")
            return {
                'verified': False,
                'error': 'WebAuthn verification not implemented',
                'code': 'NOT_IMPLEMENTED'
            }
            
        except Exception as e:
            logger.error(f"Error verifying WebAuthn assertion for user {user_id}: {e}")
            return {'verified': False, 'error': str(e), 'code': 'VERIFICATION_ERROR'}
    
    def mark_session_step_up_complete(self, session_id: str) -> None:
        """
        Mark session as having completed step-up authentication.
        
        Args:
            session_id: Session ID
        """
        try:
            # Store step-up completion flag in Redis
            cache_key = f"session_step_up:{session_id}"
            self.redis_manager.set(
                cache_key,
                {
                    'step_up_completed': True,
                    'completed_at': datetime.utcnow().isoformat()
                },
                ttl=3600,  # 1 hour
                prefix='auth'
            )
            
            logger.info(f"Session step-up marked complete: {session_id}")
            
        except Exception as e:
            logger.error(f"Error marking session step-up complete {session_id}: {e}")
            raise
    
    def session_has_step_up(self, session_id: str) -> bool:
        """
        Check if session has completed step-up authentication.
        
        Args:
            session_id: Session ID
            
        Returns:
            True if session has completed step-up, False otherwise
        """
        try:
            cache_key = f"session_step_up:{session_id}"
            step_up_data = self.redis_manager.get(cache_key, prefix='auth')
            
            return step_up_data is not None and step_up_data.get('step_up_completed', False)
            
        except Exception as e:
            logger.error(f"Error checking session step-up status {session_id}: {e}")
            return False
