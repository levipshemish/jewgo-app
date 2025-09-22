"""
Consolidated Authentication Service
===================================

This module consolidates all authentication services into a single, unified
service that eliminates code duplication and provides a consistent interface.
"""

import os
import time
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from sqlalchemy import text
from utils.logging_config import get_logger
from database.connection_manager import get_connection_manager
from cache.redis_manager_v5 import get_redis_manager_v5

# Import consolidated services
from services.auth.unified_session_manager import UnifiedSessionManager
from services.auth.secure_password_handler import SecurePasswordHandler
from services.auth.webauthn_manager import WebAuthnManager
from services.auth.token_manager_v5 import TokenManagerV5
from utils.secure_error_handler import SecureErrorHandler

logger = get_logger(__name__)


class ConsolidatedAuthService:
    """Consolidated authentication service with unified interface."""
    
    def __init__(self, db_manager=None, redis_manager=None):
        self.db_manager = db_manager or get_connection_manager()
        self.redis_manager = redis_manager or get_redis_manager_v5()
        
        # Initialize consolidated services
        self.session_manager = UnifiedSessionManager(db_manager, redis_manager)
        self.password_handler = SecurePasswordHandler()
        self.webauthn_manager = WebAuthnManager(db_manager, redis_manager)
        self.token_manager = TokenManagerV5()
        self.error_handler = SecureErrorHandler()
        
        # Configuration
        self.max_failed_attempts = int(os.getenv('MAX_FAILED_LOGIN_ATTEMPTS', '5'))
        self.lockout_duration_minutes = int(os.getenv('ACCOUNT_LOCKOUT_MINUTES', '15'))
        
        logger.info("ConsolidatedAuthService initialized")
    
    # Authentication Methods
    
    def authenticate_user(self, email: str, password: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: User password
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Tuple of (success, user_data)
        """
        try:
            # Validate inputs
            if not email or not password:
                return False, None
            
            email = email.lower().strip()
            
            # Check account lockout
            if self._is_account_locked(email):
                logger.warning(f"Account locked for user {email}")
                return False, None
            
            # Get user data
            user_data = self._get_user_by_email(email)
            if not user_data:
                self._record_failed_attempt(email, ip_address)
                return False, None
            
            # Verify password
            if not self.password_handler.verify_password(password, user_data['password_hash']):
                self._record_failed_attempt(email, ip_address)
                return False, None
            
            # Clear failed attempts on successful login
            self._clear_failed_attempts(email)
            
            # Update last login
            self._update_last_login(user_data['id'], ip_address)
            
            # Return user data
            return True, {
                'id': user_data['id'],
                'email': user_data['email'],
                'name': user_data.get('name'),
                'roles': user_data.get('roles', []),
                'permissions': self._get_permissions_from_roles(user_data.get('roles', [])),
                'email_verified': user_data.get('email_verified', False),
                'last_login': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Authentication error for user {email}: {e}")
            return False, None
    
    def register_user(self, email: str, password: str, name: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Any]:
        """
        Register new user.
        
        Args:
            email: User email
            password: User password
            name: User name
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Tuple of (success, user_data_or_error_message)
        """
        try:
            # Validate inputs
            if not email or not password or not name:
                return False, "Email, password, and name are required"
            
            email = email.lower().strip()
            name = name.strip()
            
            # Check if user already exists
            if self._get_user_by_email(email):
                return False, "User already exists with this email"
            
            # Hash password
            password_hash = self.password_handler.hash_password(password)
            
            # Create user
            user_id = self._create_user(email, password_hash, name)
            if not user_id:
                return False, "Failed to create user"
            
            # Create initial session
            session_id, family_id = self.session_manager.create_session(
                user_id, user_agent or "Unknown", ip_address or "Unknown"
            )
            
            # Return user data
            return True, {
                'id': user_id,
                'email': email,
                'name': name,
                'roles': [{'role': 'user', 'level': 1}],
                'permissions': ['read'],
                'email_verified': False,
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Registration error for user {email}: {e}")
            return False, "Registration failed"
    
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
            
            # Create session
            session_id, family_id = self.session_manager.create_session(
                user_id, "Token Generation", "System"
            )
            
            # Generate tokens
            access_token, access_ttl = self.token_manager.mint_access_token(
                user_id, email, roles, sid=session_id
            )
            
            refresh_token, refresh_ttl = self.token_manager.mint_refresh_token(
                user_id, session_id, family_id
            )
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': access_ttl
            }
            
        except Exception as e:
            logger.error(f"Token generation error: {e}")
            raise
    
    def refresh_access_token(self, refresh_token: str, ip_address: str = None, user_agent: str = None) -> Tuple[bool, Optional[Dict[str, str]]]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Tuple of (success, new_tokens)
        """
        try:
            # Verify refresh token
            payload = self.token_manager.verify_token(refresh_token)
            if not payload or payload.get('type') != 'refresh':
                return False, None
            
            user_id = payload.get('uid')
            session_id = payload.get('sid')
            family_id = payload.get('fid')
            
            if not user_id or not session_id or not family_id:
                return False, None
            
            # Get user data
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                return False, None
            
            # Generate new tokens
            new_access_token, access_ttl = self.token_manager.mint_access_token(
                user_id, user_data['email'], user_data.get('roles', []), sid=session_id
            )
            
            new_refresh_token, refresh_ttl = self.token_manager.mint_refresh_token(
                user_id, session_id, family_id
            )
            
            return True, {
                'access_token': new_access_token,
                'refresh_token': new_refresh_token,
                'expires_in': access_ttl
            }
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return False, None
    
    def logout_user(self, access_token: str, refresh_token: str = None) -> bool:
        """
        Logout user and invalidate tokens.
        
        Args:
            access_token: Access token to invalidate
            refresh_token: Refresh token to invalidate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Verify access token to get user info
            payload = self.token_manager.verify_token(access_token)
            if not payload:
                return False
            
            user_id = payload.get('uid')
            session_id = payload.get('sid')
            
            if user_id and session_id:
                # Revoke session
                self.session_manager.revoke_session(session_id, user_id)
            
            # Invalidate tokens
            self._invalidate_token(access_token)
            if refresh_token:
                self._invalidate_token(refresh_token)
            
            return True
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    # User Management Methods
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID."""
        try:
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                return None
            
            return {
                'id': user_data['id'],
                'email': user_data['email'],
                'name': user_data.get('name'),
                'roles': user_data.get('roles', []),
                'permissions': self._get_permissions_from_roles(user_data.get('roles', [])),
                'email_verified': user_data.get('email_verified', False),
                'created_at': user_data.get('created_at'),
                'updated_at': user_data.get('updated_at'),
                'last_login': user_data.get('last_login')
            }
            
        except Exception as e:
            logger.error(f"Error getting user profile {user_id}: {e}")
            return None
    
    def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile."""
        try:
            # Validate allowed fields
            allowed_fields = ['name', 'email', 'phone', 'address', 'preferences']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return {'success': False, 'error': 'No valid fields to update'}
            
            # Update in database
            with self.db_manager.session_scope() as session:
                set_clauses = []
                params = {'user_id': user_id}
                
                for field, value in update_data.items():
                    set_clauses.append(f"{field} = :{field}")
                    params[field] = value
                
                params['updated_at'] = datetime.utcnow()
                set_clauses.append("updated_at = :updated_at")
                
                session.execute(
                    text(f"""
                        UPDATE users 
                        SET {', '.join(set_clauses)}
                        WHERE id = :user_id
                    """),
                    params
                )
            
            # Get updated profile
            updated_profile = self.get_user_profile(user_id)
            
            return {'success': True, 'profile': updated_profile}
            
        except Exception as e:
            logger.error(f"Error updating user profile {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> Tuple[bool, str]:
        """Change user password."""
        try:
            # Get current user
            user_data = self._get_user_by_id(user_id)
            if not user_data:
                return False, "User not found"
            
            # Verify current password
            if not self.password_handler.verify_password(current_password, user_data['password_hash']):
                return False, "Current password is incorrect"
            
            # Hash new password
            new_password_hash = self.password_handler.hash_password(new_password)
            
            # Update password
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE users 
                        SET password_hash = :password_hash, updated_at = NOW()
                        WHERE id = :user_id
                    """),
                    {"password_hash": new_password_hash, "user_id": user_id}
                )
            
            # Revoke all sessions except current one
            self.session_manager.revoke_user_sessions(user_id)
            
            logger.info(f"Password changed for user {user_id}")
            return True, "Password changed successfully"
            
        except Exception as e:
            logger.error(f"Error changing password for user {user_id}: {e}")
            return False, "Password change failed"
    
    # Session Management Methods
    
    def list_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """List user sessions."""
        try:
            sessions = self.session_manager.list_user_sessions(user_id)
            return [
                {
                    'id': session.session_id,
                    'family_id': session.family_id,
                    'user_agent': session.user_agent,
                    'ip_address': session.ip_address,
                    'created_at': session.created_at.isoformat(),
                    'last_used': session.last_used.isoformat() if session.last_used else None,
                    'expires_at': session.expires_at.isoformat(),
                    'is_active': session.is_active
                }
                for session in sessions
            ]
        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {e}")
            return []
    
    def revoke_session(self, user_id: str, session_id: str) -> bool:
        """Revoke a specific session."""
        return self.session_manager.revoke_session(session_id, user_id)
    
    def revoke_all_sessions(self, user_id: str, except_session_id: Optional[str] = None) -> int:
        """Revoke all sessions for a user."""
        return self.session_manager.revoke_user_sessions(user_id, except_session_id)
    
    # WebAuthn Methods
    
    def create_webauthn_registration_challenge(self, user_id: str, user_name: str, user_display_name: str) -> Dict[str, Any]:
        """Create WebAuthn registration challenge."""
        return self.webauthn_manager.create_registration_challenge(user_id, user_name, user_display_name)
    
    def create_webauthn_authentication_challenge(self, user_id: str) -> Dict[str, Any]:
        """Create WebAuthn authentication challenge."""
        return self.webauthn_manager.create_authentication_challenge(user_id)
    
    def verify_webauthn_registration(self, challenge: str, credential_data: Dict[str, Any]) -> bool:
        """Verify WebAuthn registration."""
        return self.webauthn_manager.verify_registration(challenge, credential_data)
    
    def verify_webauthn_authentication(self, challenge: str, credential_data: Dict[str, Any]) -> Optional[str]:
        """Verify WebAuthn authentication."""
        return self.webauthn_manager.verify_authentication(challenge, credential_data)
    
    # Helper Methods
    
    def _get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.password_hash, u.email_verified,
                               u.failed_login_attempts, u.locked_until, u.last_login,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role, 
                                           'level', ur.level, 
                                           'granted_at', ur.granted_at
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'::json
                               ) AS roles
                        FROM users u 
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.email = :email AND u.is_active = TRUE
                        GROUP BY u.id, u.name, u.email, u.password_hash, u.email_verified,
                                 u.failed_login_attempts, u.locked_until, u.last_login
                    """),
                    {'email': email}
                ).fetchone()
                
                if not result:
                    return None
                
                import json as _json
                roles = _json.loads(result.roles) if result.roles else []
                
                return {
                    'id': result.id,
                    'email': result.email,
                    'name': result.name,
                    'password_hash': result.password_hash,
                    'email_verified': result.email_verified,
                    'failed_login_attempts': result.failed_login_attempts,
                    'locked_until': result.locked_until,
                    'last_login': result.last_login,
                    'roles': roles
                }
                
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    def _get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.password_hash, u.email_verified,
                               u.created_at, u.updated_at, u.last_login,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role, 
                                           'level', ur.level, 
                                           'granted_at', ur.granted_at
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'::json
                               ) AS roles
                        FROM users u 
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :user_id AND u.is_active = TRUE
                        GROUP BY u.id, u.name, u.email, u.password_hash, u.email_verified,
                                 u.created_at, u.updated_at, u.last_login
                    """),
                    {'user_id': user_id}
                ).fetchone()
                
                if not result:
                    return None
                
                import json as _json
                roles = _json.loads(result.roles) if result.roles else []
                
                return {
                    'id': result.id,
                    'email': result.email,
                    'name': result.name,
                    'password_hash': result.password_hash,
                    'email_verified': result.email_verified,
                    'created_at': result.created_at,
                    'updated_at': result.updated_at,
                    'last_login': result.last_login,
                    'roles': roles
                }
                
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    def _create_user(self, email: str, password_hash: str, name: str) -> Optional[str]:
        """Create new user."""
        try:
            import secrets
            user_id = secrets.token_hex(16)
            
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        INSERT INTO users (id, email, password_hash, name, email_verified, is_active, created_at, updated_at)
                        VALUES (:id, :email, :password_hash, :name, FALSE, TRUE, NOW(), NOW())
                    """),
                    {
                        'id': user_id,
                        'email': email,
                        'password_hash': password_hash,
                        'name': name
                    }
                )
                
                # Create default user role
                session.execute(
                    text("""
                        INSERT INTO user_roles (user_id, role, level, is_active, created_at)
                        VALUES (:user_id, 'user', 1, TRUE, NOW())
                    """),
                    {'user_id': user_id}
                )
                
                return user_id
                
        except Exception as e:
            logger.error(f"Error creating user {email}: {e}")
            return None
    
    def _get_permissions_from_roles(self, roles: List[Dict[str, Any]]) -> List[str]:
        """Get permissions from user roles."""
        permissions = []
        role_hierarchy = {
            'super_admin': ['admin', 'moderator', 'user'],
            'admin': ['moderator', 'user'],
            'moderator': ['user'],
            'user': []
        }
        
        for role_data in roles:
            role_name = role_data.get('role') if isinstance(role_data, dict) else role_data
            if role_name in role_hierarchy:
                permissions.extend(role_hierarchy[role_name])
        
        return list(set(permissions))
    
    def _is_account_locked(self, email: str) -> bool:
        """Check if account is locked."""
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT locked_until FROM users 
                        WHERE email = :email AND locked_until > NOW()
                    """),
                    {'email': email}
                ).fetchone()
                
                return result is not None
                
        except Exception as e:
            logger.error(f"Error checking account lock for {email}: {e}")
            return False
    
    def _record_failed_attempt(self, email: str, ip_address: str = None):
        """Record failed login attempt."""
        try:
            with self.db_manager.session_scope() as session:
                # Increment failed attempts
                session.execute(
                    text("""
                        UPDATE users 
                        SET failed_login_attempts = failed_login_attempts + 1,
                            updated_at = NOW()
                        WHERE email = :email
                    """),
                    {'email': email}
                )
                
                # Check if should lock account
                result = session.execute(
                    text("""
                        SELECT failed_login_attempts FROM users WHERE email = :email
                    """),
                    {'email': email}
                ).fetchone()
                
                if result and result.failed_login_attempts >= self.max_failed_attempts:
                    # Lock account
                    session.execute(
                        text("""
                            UPDATE users 
                            SET locked_until = NOW() + INTERVAL :minutes MINUTE
                            WHERE email = :email
                        """),
                        {'email': email, 'minutes': self.lockout_duration_minutes}
                    )
                    
                    logger.warning(f"Account locked for user {email} due to failed attempts")
                
        except Exception as e:
            logger.error(f"Error recording failed attempt for {email}: {e}")
    
    def _clear_failed_attempts(self, email: str):
        """Clear failed login attempts."""
        try:
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE users 
                        SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
                        WHERE email = :email
                    """),
                    {'email': email}
                )
                
        except Exception as e:
            logger.error(f"Error clearing failed attempts for {email}: {e}")
    
    def _update_last_login(self, user_id: str, ip_address: str = None):
        """Update last login timestamp."""
        try:
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE users 
                        SET last_login = NOW(), updated_at = NOW()
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
        except Exception as e:
            logger.error(f"Error updating last login for {user_id}: {e}")
    
    def _invalidate_token(self, token: str):
        """Invalidate token by adding to blacklist."""
        try:
            # Decode token to get expiration
            payload = self.token_manager.verify_token(token)
            if not payload:
                return
            
            exp = payload.get('exp')
            if not exp:
                return
            
            # Calculate TTL
            current_time = int(time.time())
            ttl = max(0, exp - current_time)
            
            if ttl <= 0:
                return
            
            # Store in blacklist
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
            blacklist_key = f"auth:blacklist:{token_hash}"
            
            self.redis_manager.set(
                blacklist_key,
                {'invalidated_at': time.time(), 'reason': 'logout'},
                ttl=ttl,
                prefix='auth'
            )
            
        except Exception as e:
            logger.error(f"Error invalidating token: {e}")


# Global consolidated auth service instance
consolidated_auth_service = ConsolidatedAuthService()


def get_consolidated_auth_service() -> ConsolidatedAuthService:
    """Get the global consolidated auth service instance."""
    return consolidated_auth_service