"""
V5 Authentication Service

Provides centralized authentication and authorization services
with consistent patterns, caching, and monitoring.
Delegates to existing token/session utilities and postgres_auth.
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import os
import secrets
from sqlalchemy import text
from utils.logging_config import get_logger
from utils.error_handler import ValidationError
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager
from utils.feature_flags_v5 import FeatureFlagsV5
from utils.postgres_auth import PostgresAuthManager, TokenManager, PasswordSecurity
from services.auth.token_manager_v5 import TokenManagerV5
from services.auth.sessions import persist_initial, new_session_id, new_family_id, rotate_or_reject
from services.auth.tokens import verify
from services.auth.performance_monitor import timed_auth_operation
from flask import request

logger = get_logger(__name__)

class AuthServiceV5:
    """V5 Authentication Service with Redis caching and feature flags."""
    
    def __init__(self, redis_manager=None, connection_manager=None, feature_flags=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.connection_manager = connection_manager or get_connection_manager()
        self.db_manager = connection_manager or get_connection_manager()
        self.feature_flags = feature_flags or FeatureFlagsV5()
        
        # Initialize existing auth utilities with connection reuse
        self._postgres_auth = None
        self._cached_auth = None
        self._connection_health_check_interval = 300  # 5 minutes
        self._last_health_check = 0
        self.token_manager = TokenManager()
        self.token_manager_v5 = TokenManagerV5()
        
        logger.info("AuthServiceV5 initialized with connection reuse and caching")
    
    def _get_postgres_auth(self):
        """Get PostgresAuthManager with connection health checks and reuse."""
        import time
        
        now = time.time()
        if (not self._postgres_auth or 
            now - self._last_health_check > self._connection_health_check_interval):
            
            # Check if existing connection is healthy
            if self._postgres_auth and not self._is_connection_healthy():
                logger.warning("PostgresAuthManager connection unhealthy, recreating")
                self._postgres_auth = None
                
            # Create new connection if needed
            if not self._postgres_auth:
                self._postgres_auth = PostgresAuthManager(self.db_manager)
                logger.info("Created new PostgresAuthManager instance")
                
            self._last_health_check = now
            
        return self._postgres_auth
    
    def _get_cached_auth(self):
        """Get CachedAuthManager for improved performance."""
        if not self._cached_auth:
            try:
                from services.auth.cached_auth_manager import CachedAuthManager
                postgres_auth = self._get_postgres_auth()
                redis_client = self.redis_manager.get_client()
                self._cached_auth = CachedAuthManager(redis_client, postgres_auth)
                logger.info("Created CachedAuthManager instance")
            except Exception as e:
                logger.warning(f"Failed to create CachedAuthManager, falling back to direct auth: {e}")
                return self._get_postgres_auth()
        
        return self._cached_auth
    
    def _is_connection_healthy(self):
        """Check if the database connection is healthy."""
        try:
            # Simple health check - try to execute a basic query
            with self.db_manager.session_scope() as session:
                session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.warning(f"Database connection health check failed: {e}")
            return False
    
    @timed_auth_operation('login')
    def authenticate_user(self, email: str, password: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Authenticate user with email and password with enhanced logging.
        
        Args:
            email: User email
            password: User password
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, user_data) - user_data is None if authentication failed
        """
        auth_context = {
            'email': email,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'timestamp': datetime.utcnow().isoformat(),
            'method': 'password'
        }
        
        try:
            # Input validation
            if not email or not email.strip():
                logger.warning("Authentication attempt with empty email", extra=auth_context)
                return False, None
            
            if not password:
                logger.warning("Authentication attempt with empty password", extra=auth_context)
                return False, None
            
            # Normalize email
            email = email.lower().strip()
            auth_context['email'] = email
            
            logger.info(f"Authentication attempt for user {email}", extra=auth_context)
            
            # Use cached authentication for better performance
            cached_auth = self._get_cached_auth()
            user_info = cached_auth.authenticate_user(email, password, ip_address)
            
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
                
                # Log successful authentication with details
                success_context = auth_context.copy()
                success_context.update({
                    'user_id': user_data['id'],
                    'email_verified': user_data['email_verified'],
                    'roles': [role.get('role') if isinstance(role, dict) else role for role in user_data['roles']],
                    'success': True
                })
                logger.info(f"Authentication successful for user {email}", extra=success_context)
                
                return True, user_data
            else:
                # Log failed authentication with potential reasons
                failure_context = auth_context.copy()
                failure_context.update({
                    'success': False,
                    'failure_reason': 'invalid_credentials_or_account_locked'
                })
                logger.warning(f"Authentication failed for user {email} - invalid credentials or account locked", extra=failure_context)
                return False, None
                
        except ValidationError as e:
            # Log validation errors (e.g., invalid email format)
            validation_context = auth_context.copy()
            validation_context.update({
                'success': False,
                'failure_reason': 'validation_error',
                'error_details': str(e)
            })
            logger.warning(f"Authentication validation error for user {email}: {e}", extra=validation_context)
            return False, None
            
        except Exception as e:
            # Log unexpected errors with full context
            error_context = auth_context.copy()
            error_context.update({
                'success': False,
                'failure_reason': 'system_error',
                'error_type': type(e).__name__,
                'error_details': str(e)
            })
            logger.error(f"Authentication system error for user {email}: {e}", extra=error_context, exc_info=True)
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
            
            # Convert roles to serializable format (remove datetime objects)
            serializable_roles = []
            for role in roles:
                if isinstance(role, dict):
                    serializable_role = {
                        'role': role.get('role'),
                        'level': role.get('level')
                    }
                    serializable_roles.append(serializable_role)
                else:
                    # Handle simple string roles
                    serializable_roles.append(role)
            roles = serializable_roles
            
            # Create session family for refresh rotation/reuse detection
            session_id = new_session_id()
            family_id = new_family_id()
            refresh_token, refresh_ttl = self.token_manager_v5.mint_refresh_token(user_id, session_id, family_id)

            # Mint access token including session id to support step-up checks
            access_token, access_ttl = self.token_manager_v5.mint_access_token(user_id, email, roles, sid=session_id)

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
    
    def refresh_access_token(self, refresh_token: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Optional[Dict[str, str]]]:
        """
        Refresh access token using refresh token with enhanced logging.
        
        Args:
            refresh_token: Refresh token
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, new_tokens) - new_tokens is None if refresh failed
        """
        refresh_context = {
            'ip_address': ip_address,
            'user_agent': user_agent,
            'timestamp': datetime.utcnow().isoformat(),
            'operation': 'token_refresh'
        }
        
        try:
            # Verify refresh token using v5 manager
            payload = self.token_manager_v5.verify_token(refresh_token)
            if not payload or payload.get('type') != 'refresh':
                refresh_context.update({
                    'success': False,
                    'failure_reason': 'invalid_refresh_token',
                    'token_valid': payload is not None,
                    'token_type': payload.get('type') if payload else None
                })
                logger.warning("Invalid refresh token provided", extra=refresh_context)
                return False, None

            user_id = payload.get('uid')
            sid = payload.get('sid')
            fid = payload.get('fid')
            
            refresh_context['user_id'] = user_id
            refresh_context['session_id'] = sid
            refresh_context['family_id'] = fid
            
            if not user_id or not sid or not fid:
                refresh_context.update({
                    'success': False,
                    'failure_reason': 'missing_token_claims',
                    'has_user_id': bool(user_id),
                    'has_session_id': bool(sid),
                    'has_family_id': bool(fid)
                })
                logger.warning("Refresh token missing required claims", extra=refresh_context)
                return False, None

            logger.info(f"Token refresh attempt for user {user_id}", extra=refresh_context)

            # Get user data
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                refresh_context.update({
                    'success': False,
                    'failure_reason': 'user_not_found'
                })
                logger.warning(f"User {user_id} not found during token refresh", extra=refresh_context)
                return False, None

            refresh_context['user_email'] = user_data.get('email')

            # Rotate or revoke on reuse
            try:
                # Use provided values or fallback to request headers
                current_user_agent = user_agent
                current_ip = ip_address
                
                if not current_user_agent and request:
                    current_user_agent = request.headers.get('User-Agent')
                
                if not current_ip and request:
                    xff = request.headers.get('X-Forwarded-For')
                    if xff:
                        current_ip = xff.split(',')[0].strip()
                    if not current_ip:
                        current_ip = request.headers.get('X-Real-IP') or request.remote_addr
                
                rotate_res = rotate_or_reject(
                    self.db_manager,
                    user_id=user_id,
                    provided_refresh=refresh_token,
                    sid=sid,
                    fid=fid,
                    user_agent=current_user_agent,
                    ip=current_ip,
                    ttl_seconds=int(os.getenv('REFRESH_TTL_SECONDS', str(45 * 24 * 3600)))
                )
                
                if not rotate_res:
                    refresh_context.update({
                        'success': False,
                        'failure_reason': 'token_reuse_detected',
                        'security_action': 'family_revoked'
                    })
                    logger.warning(f"Refresh token reuse detected; family revoked for user {user_id}", extra=refresh_context)
                    return False, None
                
                new_sid, new_refresh, new_refresh_ttl = rotate_res
                refresh_context.update({
                    'new_session_id': new_sid,
                    'rotation_successful': True
                })
                
            except Exception as e:
                refresh_context.update({
                    'success': False,
                    'failure_reason': 'token_rotation_error',
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                })
                logger.error(f"Token rotation error for user {user_id}: {e}", extra=refresh_context, exc_info=True)
                return False, None

            # Mint new access token
            try:
                new_access, access_ttl = self.token_manager_v5.mint_access_token(
                    user_id, user_data['email'], user_data.get('roles', []), sid=new_sid
                )
                
                refresh_context.update({
                    'success': True,
                    'new_access_token_ttl': access_ttl,
                    'new_refresh_token_ttl': new_refresh_ttl
                })
                
                logger.info(f"Access token refreshed successfully for user {user_id}", extra=refresh_context)
                
                return True, {
                    'access_token': new_access,
                    'refresh_token': new_refresh,
                    'expires_in': access_ttl,
                }
                
            except Exception as e:
                refresh_context.update({
                    'success': False,
                    'failure_reason': 'token_minting_error',
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                })
                logger.error(f"Token minting error for user {user_id}: {e}", extra=refresh_context, exc_info=True)
                return False, None

        except Exception as e:
            refresh_context.update({
                'success': False,
                'failure_reason': 'system_error',
                'error_type': type(e).__name__,
                'error_details': str(e)
            })
            logger.error(f"Token refresh system error: {e}", extra=refresh_context, exc_info=True)
            return False, None
    
    def get_user_profile(self, user_id: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
        """
        Get user profile by ID with retry logic for transient failures.
        
        Args:
            user_id: User ID
            max_retries: Maximum number of retry attempts for transient failures
            
        Returns:
            User profile data or None if not found
        """
        import time
        
        for attempt in range(max_retries + 1):
            try:
                # Use postgres_auth for consistency with registration
                postgres_auth = self._get_postgres_auth()
                user_data = postgres_auth.get_user_by_id(user_id)
            
                if not user_data:
                    # Fallback to AuthServiceV5 database lookup
                    user_data = self._get_user_by_id(user_id)
                    if not user_data:
                        return None
                
                # Return sanitized profile data in consistent format (both snake_case and camelCase for compatibility)
                created_at = user_data.get('created_at') or user_data.get('createdAt')
                updated_at = user_data.get('updated_at') or user_data.get('updatedAt')
                
                # Determine authentication provider
                provider = 'email'  # default
                if user_data.get('oauth_provider'):
                    provider = user_data.get('oauth_provider')
                elif user_data.get('provider'):
                    provider = user_data.get('provider')

                return {
                    'id': user_data.get('user_id') or user_data.get('id'),
                    'email': user_data['email'],
                    'name': user_data.get('name'),
                    'provider': provider,  # Add provider information
                    'oauth_provider': user_data.get('oauth_provider'),  # Keep OAuth provider info
                    'roles': user_data.get('roles', [{'role': 'user', 'level': 1}]),
                    'permissions': user_data.get('permissions', []),
                    'email_verified': user_data.get('email_verified', False),
                    # Include both formats for frontend compatibility
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'createdAt': created_at,  # camelCase for frontend
                    'updatedAt': updated_at,  # camelCase for frontend
                    'last_login': user_data.get('last_login')
                }
                
            except Exception as e:
                import traceback
                
                # Check if this is a transient error that should be retried
                is_transient = self._is_transient_error(e)
                is_final_attempt = attempt == max_retries
                
                logger.error(
                    f"Error getting user profile {user_id} (attempt {attempt + 1}/{max_retries + 1}): {e}",
                    extra={
                        'user_id': user_id,
                        'service': 'AuthServiceV5',
                        'method': 'get_user_profile',
                        'attempt': attempt + 1,
                        'max_retries': max_retries + 1,
                        'is_transient': is_transient,
                        'is_final_attempt': is_final_attempt,
                        'exception_type': type(e).__name__,
                        'traceback': traceback.format_exc()
                    },
                    exc_info=True
                )
                
                # If it's not a transient error or final attempt, don't retry
                if not is_transient or is_final_attempt:
                    return None
                    
                # Wait before retrying (exponential backoff)
                wait_time = (2 ** attempt) * 0.1  # 0.1s, 0.2s, 0.4s
                logger.info(f"Retrying user profile fetch for {user_id} in {wait_time}s")
                time.sleep(wait_time)
                continue
        
        # This should never be reached, but included for completeness
        return None
    
    def _is_transient_error(self, error: Exception) -> bool:
        """
        Determine if an error is transient and should be retried.
        
        Args:
            error: The exception to check
            
        Returns:
            True if the error is likely transient, False otherwise
        """
        import psycopg2
        
        # Database connection errors that might be transient
        transient_db_errors = (
            'connection refused',
            'connection reset',
            'connection lost',
            'timeout',
            'deadlock',
            'lock timeout',
            'connection pool exhausted',
            'temporary failure',
            'network error'
        )
        
        # Redis connection errors that might be transient
        transient_redis_errors = (
            'connection error',
            'redis connection',
            'timeout error',
            'connection refused'
        )
        
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # Check for database-related transient errors
        if any(db_error in error_str for db_error in transient_db_errors):
            return True
            
        # Check for Redis-related transient errors
        if any(redis_error in error_str for redis_error in transient_redis_errors):
            return True
            
        # Check for specific exception types that are often transient
        if 'operationalerror' in error_type:  # SQLAlchemy operational errors
            return True
            
        if 'connectionerror' in error_type:  # General connection errors
            return True
            
        # psycopg2 specific transient errors
        if hasattr(error, 'pgcode'):
            # PostgreSQL error codes for transient conditions
            transient_pg_codes = [
                '08000',  # connection_exception
                '08003',  # connection_does_not_exist
                '08006',  # connection_failure
                '53300',  # too_many_connections
                '57P01',  # admin_shutdown
            ]
            if error.pgcode in transient_pg_codes:
                return True
        
        return False
    
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
            with self.db_manager.session_scope() as session:
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
    
    @timed_auth_operation('register')
    def register_user(self, email: str, password: str, name: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Any]:
        """
        Register new user with enhanced logging.
        
        Args:
            email: User email
            password: User password
            name: User name
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, user_data_or_error_message)
        """
        registration_context = {
            'email': email,
            'name': name,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'timestamp': datetime.utcnow().isoformat(),
            'operation': 'user_registration'
        }
        
        try:
            # Input validation with detailed logging
            if not email or not email.strip():
                logger.warning("Registration attempt with empty email", extra=registration_context)
                return False, "Email is required"
            
            if not password:
                logger.warning("Registration attempt with empty password", extra=registration_context)
                return False, "Password is required"
            
            if not name or not name.strip():
                logger.warning("Registration attempt with empty name", extra=registration_context)
                return False, "Name is required"
            
            # Normalize inputs
            email = email.lower().strip()
            name = name.strip()
            registration_context.update({'email': email, 'name': name})
            
            logger.info(f"Registration attempt for user {email}", extra=registration_context)
            
            # Use connection reuse with health checks for better performance
            postgres_auth = self._get_postgres_auth()
            user_data = postgres_auth.create_user(email, password, name)
            
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
                
                # Log user creation after successful database transaction
                try:
                    postgres_auth._log_auth_event(
                        user_data['user_id'], 
                        'user_created', 
                        True, 
                        {'email': email, 'ip_address': ip_address, 'user_agent': user_agent}
                    )
                except Exception as log_error:
                    logger.warning(f"Failed to log user creation event: {log_error}")
                
                # Log successful registration with details
                success_context = registration_context.copy()
                success_context.update({
                    'user_id': formatted_user['id'],
                    'success': True,
                    'default_role': 'user',
                    'email_verified': False
                })
                logger.info(f"User registered successfully: {email}", extra=success_context)
                
                return True, formatted_user
            else:
                # Log failed registration
                failure_context = registration_context.copy()
                failure_context.update({
                    'success': False,
                    'failure_reason': 'postgres_auth_returned_none'
                })
                logger.warning(f"Registration failed for user {email} - postgres auth returned None", extra=failure_context)
                return False, "Registration failed"
                
        except ValidationError as e:
            # Log validation errors with context
            validation_context = registration_context.copy()
            validation_context.update({
                'success': False,
                'failure_reason': 'validation_error',
                'error_details': str(e),
                'error_type': 'ValidationError'
            })
            logger.warning(f"Registration validation error for user {email}: {e}", extra=validation_context)
            return False, str(e)
            
        except Exception as e:
            # Log unexpected errors with full context and stack trace
            error_context = registration_context.copy()
            error_context.update({
                'success': False,
                'failure_reason': 'system_error',
                'error_type': type(e).__name__,
                'error_details': str(e),
                'error_args': str(e.args) if hasattr(e, 'args') else None
            })
            logger.error(f"Registration system error for user {email}: {e}", extra=error_context, exc_info=True)
            
            # Return detailed error message for debugging while being security-conscious
            if isinstance(e, (ValidationError, ValueError)):
                return False, str(e)
            else:
                # Don't expose internal system errors to the user
                return False, "Registration failed due to system error. Please try again later."
    
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
            db_healthy = self._is_connection_healthy()
            
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

            # Query database for real user data with active roles
            from sqlalchemy import text
            with self.db_manager.session_scope() as session:
                row = session.execute(
                    text(
                        """
                        SELECT u.id, u.name, u.email, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role,
                                           'level', ur.level,
                                           'granted_at', ur.granted_at
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid
                        GROUP BY u.id, u.name, u.email, u.email_verified
                        """
                    ),
                    {"uid": user_id},
                ).fetchone()

                if not row:
                    return None

                import json as _json
                roles = _json.loads(row.roles) if row.roles else []

                user_data = {
                    'id': row.id,
                    'email': row.email,
                    'name': row.name,
                    'roles': roles,
                    'permissions': self._get_permissions_from_roles(roles),
                    'email_verified': row.email_verified,
                }

            # Cache user data
            self.redis_manager.set(cache_key, user_data, ttl=3600, prefix='auth')

            return user_data

        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None

    # Session management helpers
    def list_sessions(self, user_id: str) -> list[Dict[str, Any]]:
        """List active and recent sessions for a user."""
        try:
            from sqlalchemy import text
            with self.db_manager.session_scope() as session:
                rows = session.execute(
                    text(
                        """
                        SELECT id, family_id, user_agent, ip, created_at, last_used, expires_at, revoked_at
                        FROM auth_sessions
                        WHERE user_id = :uid
                        ORDER BY COALESCE(last_used, created_at) DESC
                        LIMIT 100
                        """
                    ),
                    {"uid": user_id},
                ).fetchall()
                return [
                    {
                        'id': r.id,
                        'family_id': r.family_id,
                        'user_agent': r.user_agent,
                        'ip': r.ip,
                        'created_at': r.created_at.isoformat() if r.created_at else None,
                        'last_used': r.last_used.isoformat() if r.last_used else None,
                        'expires_at': r.expires_at.isoformat() if r.expires_at else None,
                        'revoked': r.revoked_at is not None,
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"Error listing sessions for {user_id}: {e}")
            return []

    def revoke_session(self, user_id: str, session_id: str) -> bool:
        """Revoke a single session for this user."""
        try:
            from sqlalchemy import text
            with self.db_manager.session_scope() as session:
                res = session.execute(
                    text("UPDATE auth_sessions SET revoked_at = NOW() WHERE id = :sid AND user_id = :uid AND revoked_at IS NULL"),
                    {"sid": session_id, "uid": user_id},
                )
                return res.rowcount > 0
        except Exception as e:
            logger.error(f"Error revoking session {session_id} for {user_id}: {e}")
            return False

    def revoke_all_sessions(self, user_id: str, except_sid: Optional[str] = None) -> int:
        """Revoke all sessions for this user; optionally keep one active session id."""
        try:
            from sqlalchemy import text
            with self.db_manager.session_scope() as session:
                if except_sid:
                    res = session.execute(
                        text("UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = :uid AND id <> :sid AND revoked_at IS NULL"),
                        {"uid": user_id, "sid": except_sid},
                    )
                else:
                    res = session.execute(
                        text("UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = :uid AND revoked_at IS NULL"),
                        {"uid": user_id},
                    )
                return res.rowcount or 0
        except Exception as e:
            logger.error(f"Error revoking all sessions for {user_id}: {e}")
            return 0
    
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
    
    def upload_user_avatar(self, user_id: str, file_data: str, file_name: str, file_type: str) -> Dict[str, Any]:
        """
        Upload user avatar image.
        
        Args:
            user_id: User ID
            file_data: Base64 encoded file data
            file_name: Original file name
            file_type: MIME type of the file
            
        Returns:
            Dictionary with success status and avatar URL
        """
        try:
            import base64
            import uuid
            from pathlib import Path
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
            if file_type.lower() not in allowed_types:
                return {
                    'success': False,
                    'error': 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed'
                }
            
            # Decode base64 data
            try:
                file_bytes = base64.b64decode(file_data)
            except Exception as e:
                logger.error(f"Failed to decode base64 file data: {e}")
                return {
                    'success': False,
                    'error': 'Invalid file data format'
                }
            
            # Generate unique filename
            file_extension = Path(file_name).suffix or '.jpg'
            unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_extension}"
            
            # Create uploads directory if it doesn't exist
            uploads_dir = Path("uploads/avatars")
            uploads_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file to disk
            file_path = uploads_dir / unique_filename
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
            
            # Generate avatar URL (full backend URL for frontend access)
            backend_url = os.getenv('NEXT_PUBLIC_BACKEND_URL', os.getenv('BACKEND_URL', 'http://localhost:5000')).rstrip('/')
            avatar_url = f"{backend_url}/api/v5/auth/avatar/{unique_filename}"
            
            # Update user profile with new avatar URL
            postgres_auth = self._get_postgres_auth()
            update_success = postgres_auth.update_user_profile(user_id, {'avatar_url': avatar_url})
            
            if not update_success:
                # Clean up uploaded file if database update failed
                try:
                    file_path.unlink()
                except:
                    pass
                return {
                    'success': False,
                    'error': 'Failed to update user profile with avatar URL'
                }
            
            logger.info(f"Avatar uploaded successfully for user {user_id}: {avatar_url}")
            
            return {
                'success': True,
                'avatar_url': avatar_url,
                'message': 'Avatar uploaded successfully'
            }
            
        except Exception as e:
            logger.error(f"Avatar upload error for user {user_id}: {e}")
            return {
                'success': False,
                'error': 'Avatar upload service unavailable'
            }
    
    def delete_user_avatar(self, user_id: str, avatar_url: str = None) -> Dict[str, Any]:
        """
        Delete user avatar image.
        
        Args:
            user_id: User ID
            avatar_url: Optional specific avatar URL to delete
            
        Returns:
            Dictionary with success status
        """
        try:
            postgres_auth = self._get_postgres_auth()
            
            # Get current user profile to find avatar URL if not provided
            if not avatar_url:
                user_profile = postgres_auth.get_user_by_id(user_id)
                if not user_profile:
                    return {
                        'success': False,
                        'error': 'User not found'
                    }
                avatar_url = user_profile.get('avatar_url')
            
            if not avatar_url:
                return {
                    'success': True,
                    'message': 'No avatar to delete'
                }
            
            # Remove avatar URL from user profile
            update_success = postgres_auth.update_user_profile(user_id, {'avatar_url': None})
            
            if not update_success:
                return {
                    'success': False,
                    'error': 'Failed to update user profile'
                }
            
            # Try to delete the physical file (best effort)
            try:
                from pathlib import Path
                import re
                
                # Extract filename from full URL or relative path
                if '/api/v5/auth/avatar/' in avatar_url:
                    filename = avatar_url.split('/api/v5/auth/avatar/')[-1]
                elif avatar_url.startswith('/uploads/avatars/'):
                    filename = avatar_url.split('/uploads/avatars/')[-1]
                else:
                    filename = avatar_url
                
                # Validate filename (security check)
                if re.match(r'^[a-zA-Z0-9_\-\.]+$', filename):
                    file_path = Path(f"uploads/avatars/{filename}")
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Deleted avatar file: {file_path}")
                else:
                    logger.warning(f"Invalid filename format, skipping file deletion: {filename}")
                    
            except Exception as e:
                logger.warning(f"Failed to delete avatar file {avatar_url}: {e}")
                # Don't fail the operation if file deletion fails
            
            logger.info(f"Avatar deleted successfully for user {user_id}")
            
            return {
                'success': True,
                'message': 'Avatar deleted successfully'
            }
            
        except Exception as e:
            logger.error(f"Avatar deletion error for user {user_id}: {e}")
            return {
                'success': False,
                'error': 'Avatar deletion service unavailable'
            }