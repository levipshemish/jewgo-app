"""
PostgreSQL-based authentication manager.

This module provides comprehensive authentication services using PostgreSQL.
It includes user management, JWT token handling, session management, and
role-based access control.
"""

import os
import secrets
import jwt
import bcrypt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import text, bindparam
from sqlalchemy.types import JSON
from sqlalchemy.exc import IntegrityError
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, ValidationError

logger = get_logger(__name__)


class PasswordSecurity:
    """Password security utilities for hashing and validation."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt."""
        if not password or len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        # Generate salt and hash password with configurable cost factor
        import os
        cost_factor = int(os.getenv('BCRYPT_ROUNDS', '10'))  # Default to 10 for performance
        if os.getenv('FLASK_ENV') == 'development':
            cost_factor = max(8, cost_factor - 2)  # Reduce for development
        
        salt = bcrypt.gensalt(rounds=cost_factor)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
        return password_hash.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """Validate password strength and return feedback."""
        issues = []
        score = 0
        
        if len(password) >= 8:
            score += 1
        else:
            issues.append("Password must be at least 8 characters long")
        
        if any(c.isupper() for c in password):
            score += 1
        else:
            issues.append("Password must contain at least one uppercase letter")
        
        if any(c.islower() for c in password):
            score += 1
        else:
            issues.append("Password must contain at least one lowercase letter")
        
        if any(c.isdigit() for c in password):
            score += 1
        else:
            issues.append("Password must contain at least one number")
        
        if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            score += 1
        else:
            issues.append("Password must contain at least one special character")
        
        return {
            'is_valid': len(issues) == 0,
            'score': score,
            'max_score': 5,
            'issues': issues
        }


class TokenManager:
    """JWT token management for authentication."""
    
    def __init__(self):
        self.secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
        if not self.secret:
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        
        self.algorithm = 'HS256'
        self.access_token_expire_hours = float(os.getenv('JWT_ACCESS_EXPIRE_HOURS', '0.25'))  # 15 minutes
        self.refresh_token_expire_days = int(os.getenv('JWT_REFRESH_EXPIRE_DAYS', '30'))
    
    def generate_access_token(self, user_id: str, email: str, roles: List[Dict[str, Any]] = None) -> str:
        """Generate JWT access token."""
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'access',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=self.access_token_expire_hours),
            'jti': secrets.token_hex(16)  # JWT ID for token tracking
        }
        
        if roles:
            payload['roles'] = [{
                'role': role['role'],
                'level': role['level']
            } for role in roles]
        
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def generate_refresh_token(self, user_id: str) -> str:
        """Generate JWT refresh token."""
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=self.refresh_token_expire_days),
            'jti': secrets.token_hex(16)
        }
        
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = 'access') -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload."""
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options={
                    'verify_signature': True,
                    'verify_exp': True,
                    'verify_iat': True
                }
            )
            
            # Verify token type
            if payload.get('type') != token_type:
                logger.warning(f"Invalid token type: expected {token_type}, got {payload.get('type')}")
                return None
            
            return payload
        
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None


class PostgresAuthManager:
    """PostgreSQL-based authentication manager."""
    
    def __init__(self, db_manager):
        self.db = db_manager
        self.password_security = PasswordSecurity()
        self.token_manager = TokenManager()
        self.max_failed_attempts = int(os.getenv('MAX_FAILED_LOGIN_ATTEMPTS', '5'))
        self.lockout_duration_minutes = int(os.getenv('ACCOUNT_LOCKOUT_MINUTES', '15'))
    
    def create_user(self, email: str, password: str, name: str = None) -> Dict[str, Any]:
        """Create new user with hashed password."""
        try:
            # Validate email format
            if not email or '@' not in email:
                raise ValidationError("Valid email address is required")
            
            email = email.lower().strip()
            
            # Validate password strength
            password_validation = self.password_security.validate_password_strength(password)
            if not password_validation['is_valid']:
                raise ValidationError(f"Password requirements not met: {'; '.join(password_validation['issues'])}")
            
            # Hash password
            password_hash = self.password_security.hash_password(password)
            
            # Generate user ID and verification token
            user_id = secrets.token_hex(16)
            verification_token = secrets.token_urlsafe(32)
            
            with self.db.session_scope() as session:
                # Check if email already exists
                logger.info(f"Checking email uniqueness for: '{email}'")
                
                # First, let's see what emails exist in the database
                all_emails = session.execute(
                    text("SELECT email FROM users ORDER BY email")
                ).fetchall()
                logger.info(f"Existing emails in database: {[row[0] for row in all_emails]}")
                
                result = session.execute(
                    text("SELECT id FROM users WHERE email = :email"),
                    {'email': email}
                ).fetchone()
                
                logger.info(f"Email check for '{email}': result = {result}")
                logger.info(f"Query executed: SELECT id FROM users WHERE email = '{email}'")
                
                if result:
                    logger.warning(f"Email '{email}' already exists with ID: {result[0]}")
                    # For debugging, let's return more detailed error information
                    error_msg = f"Email address is already registered. Existing emails: {[row[0] for row in all_emails]}"
                    raise ValidationError(error_msg)
                
                # Insert new user with all required fields
                session.execute(
                    text("""
                        INSERT INTO users (
                            id, name, email, password_hash, email_verified,
                            verification_token, verification_expires,
                            "isSuperAdmin", "createdAt", "updatedAt", "emailVerified", image
                        ) VALUES (
                            :user_id, :name, :email, :password_hash, FALSE,
                            :verification_token, :verification_expires,
                            FALSE, NOW(), NOW(), NULL, NULL
                        )
                    """),
                    {
                        'user_id': user_id,
                        'name': name,
                        'email': email,
                        'password_hash': password_hash,
                        'verification_token': verification_token,
                        'verification_expires': datetime.utcnow() + timedelta(hours=24)
                    }
                )
                
                # Assign default user role (id is auto-increment)
                # Create user role (handle granted_by constraint issue)
                try:
                    session.execute(
                        text("""
                            INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active, created_at, updated_at)
                            VALUES (:user_id, 'user', 1, NOW(), :user_id, TRUE, NOW(), NOW())
                        """),
                        {'user_id': user_id}
                    )
                    logger.info(f"Successfully created user role for user {user_id}")
                except Exception as role_error:
                    logger.warning(f"Could not create user role with self-granted: {role_error}")
                    # Try without granted_by if it's causing issues
                    try:
                        session.execute(
                            text("""
                                INSERT INTO user_roles (user_id, role, level, granted_at, is_active, created_at, updated_at)
                                VALUES (:user_id, 'user', 1, NOW(), TRUE, NOW(), NOW())
                            """),
                            {'user_id': user_id}
                        )
                        logger.info(f"Successfully created user role without granted_by for user {user_id}")
                    except Exception as role_error2:
                        logger.warning(f"Could not create user role even without granted_by: {role_error2}")
                        # Continue without role creation - user can still be created
                
                # Send email verification email
                try:
                    from services.email_service import send_email_verification
                    
                    email_sent = send_email_verification(email, verification_token, name or "User")
                    
                    if email_sent:
                        logger.info(f"Verification email sent to {email}")
                    else:
                        logger.warning(f"Failed to send verification email to {email}")
                        
                except Exception as e:
                    logger.error(f"Error sending verification email: {e}")
                
                logger.info(f"User created successfully: {email}")
                
                # Store user data for logging after transaction
                user_creation_data = {
                    'user_id': user_id,
                    'email': email,
                    'name': name,
                    'email_verified': False,
                    'verification_token': verification_token,
                    'created_at': datetime.utcnow().isoformat()
                }
                
                return user_creation_data
                
        except ValidationError as ve:
            logger.info(f"ValidationError caught: {ve}")
            raise
        except IntegrityError as ie:
            logger.info(f"IntegrityError caught: {ie}")
            logger.info(f"IntegrityError details: {ie.orig}")
            raise ValidationError(f"Email address is already registered (IntegrityError: {ie})")
        except Exception as e:
            logger.error(f"User creation error: {e}")
            logger.error(f"User creation error details - email: {email}, error type: {type(e).__name__}, error args: {e.args}")
            # Re-raise the original error with more details for debugging
            raise AuthenticationError(f"Failed to create user account: {str(e)}")
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID from database."""
        try:
            with self.db.session_scope() as session:
                row = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.email_verified, u.image,
                               u."createdAt", u."updatedAt", u.oauth_provider, u.oauth_provider_id
                        FROM users u
                        WHERE u.id = :user_id
                    """),
                    {"user_id": user_id},
                ).fetchone()

                if not row:
                    return None

                return {
                    'user_id': row.id,
                    'id': row.id,
                    'email': row.email,
                    'name': row.name,
                    'email_verified': row.email_verified,
                    'image': row.image,  # Include profile image
                    'avatar_url': row.image,  # Alias for frontend compatibility
                    'created_at': row.createdAt.isoformat() if row.createdAt else None,
                    'updated_at': row.updatedAt.isoformat() if row.updatedAt else None,
                    'oauth_provider': row.oauth_provider,  # Include OAuth provider
                    'oauth_provider_id': row.oauth_provider_id,  # Include OAuth provider ID
                    'roles': [{'role': 'user', 'level': 1}],  # Default role
                    'permissions': []
                }
                
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    def authenticate_user(self, email: str, password: str, ip_address: str = None) -> Optional[Dict[str, Any]]:
        """Authenticate user with email/password."""
        try:
            email = email.lower().strip()
            
            with self.db.session_scope() as session:
                # Get user details with role information
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Looking up user with email: '{email[:3]}***@{email.split('@')[1]}'")
                
                # Optimized single query with LEFT JOIN for roles
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
                        WHERE u.email = :email
                        GROUP BY u.id, u.name, u.email, u.password_hash, u.email_verified,
                                 u.failed_login_attempts, u.locked_until, u.last_login
                    """),
                    {'email': email}
                ).fetchone()
                
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Database query result: {'Found' if result else 'Not found'}")
                
                if not result:
                    self._log_auth_event(None, 'login_failed', False, {'email': email, 'reason': 'user_not_found'}, ip_address)
                    return None
                
                user_data = dict(result._mapping)
                user_id = user_data['id']
                
                # Check if account is locked
                if user_data['locked_until'] and user_data['locked_until'] > datetime.utcnow():
                    self._log_auth_event(user_id, 'login_failed', False, {'reason': 'account_locked'}, ip_address)
                    return None
                
                # Verify password
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Authenticating user {email[:3]}***@{email.split('@')[1]}")
                
                password_verified = self.password_security.verify_password(password, user_data['password_hash'])
                
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Password verification result: {password_verified}")
                
                if not password_verified:
                    # Increment failed attempts
                    failed_attempts = (user_data['failed_login_attempts'] or 0) + 1
                    locked_until = None
                    
                    if failed_attempts >= self.max_failed_attempts:
                        locked_until = datetime.utcnow() + timedelta(minutes=self.lockout_duration_minutes)
                    
                    session.execute(
                        text("""
                            UPDATE users SET 
                                failed_login_attempts = :attempts,
                                locked_until = :locked_until
                            WHERE id = :user_id
                        """),
                        {
                            'user_id': user_id,
                            'attempts': failed_attempts,
                            'locked_until': locked_until
                        }
                    )
                    
                    self._log_auth_event(user_id, 'login_failed', False, {
                        'reason': 'invalid_password',
                        'failed_attempts': failed_attempts
                    }, ip_address)
                    
                    return None
                
                # Successful authentication - reset failed attempts and update last login
                session.execute(
                    text("""
                        UPDATE users SET 
                            failed_login_attempts = 0,
                            locked_until = NULL,
                            last_login = NOW()
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
                # Roles are now included in the main query
                import json
                roles = user_data.get('roles', [])
                if isinstance(roles, str):
                    roles = json.loads(roles)
                
                user_info = {
                    'user_id': user_id,
                    'name': user_data['name'],
                    'email': user_data['email'],
                    'email_verified': user_data['email_verified'],
                    'roles': roles,
                    'last_login': datetime.utcnow().isoformat()
                }
                
                self._log_auth_event(user_id, 'login_success', True, {'email': email}, ip_address)
                logger.info(f"User authenticated successfully: {email}")
                
                return user_info
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    def generate_tokens(self, user_info: Dict[str, Any]) -> Dict[str, str]:
        """Generate access and refresh tokens for authenticated user."""
        access_token = self.token_manager.generate_access_token(
            user_info['user_id'],
            user_info['email'],
            user_info.get('roles', [])
        )
        
        refresh_token = self.token_manager.generate_refresh_token(user_info['user_id'])
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': self.token_manager.access_token_expire_hours * 3600
        }
    
    def verify_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT access token and return user data."""
        payload = self.token_manager.verify_token(token, 'access')
        if not payload:
            return None
        
        # Get fresh user data from database
        try:
            with self.db.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role,
                                           'level', ur.level
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) as roles
                        FROM users u
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :user_id
                        GROUP BY u.id, u.name, u.email, u.email_verified
                    """),
                    {'user_id': payload['user_id']}
                ).fetchone()
                
                if not result:
                    return None
                
                user_data = dict(result._mapping)
                
                # Parse roles from JSON
                import json
                roles = json.loads(user_data['roles']) if user_data['roles'] else []
                
                return {
                    'user_id': user_data['id'],
                    'name': user_data['name'],
                    'email': user_data['email'],
                    'email_verified': user_data['email_verified'],
                    'roles': roles,
                    'token_payload': payload
                }
                
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """Refresh access token using refresh token."""
        payload = self.token_manager.verify_token(refresh_token, 'refresh')
        if not payload:
            return None
        
        # Get user data for new access token
        try:
            with self.db.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role,
                                           'level', ur.level
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) as roles
                        FROM users u
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :user_id
                        GROUP BY u.id, u.name, u.email, u.email_verified
                    """),
                    {'user_id': payload['user_id']}
                ).fetchone()
                
                if not result:
                    return None
                
                user_data = dict(result._mapping)
                
                # Parse roles from JSON
                import json
                roles = json.loads(user_data['roles']) if user_data['roles'] else []
                
                # Generate new tokens
                new_access_token = self.token_manager.generate_access_token(
                    user_data['id'],
                    user_data['email'],
                    roles
                )
                
                new_refresh_token = self.token_manager.generate_refresh_token(user_data['id'])
                
                return {
                    'access_token': new_access_token,
                    'refresh_token': new_refresh_token,
                    'token_type': 'Bearer',
                    'expires_in': self.token_manager.access_token_expire_hours * 3600
                }
                
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    def get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active user roles."""
        try:
            with self.db.session_scope() as session:
                rows = session.execute(
                    text("""
                        SELECT role, level, granted_at, expires_at
                        FROM user_roles
                        WHERE user_id = :user_id 
                        AND is_active = TRUE 
                        AND (expires_at IS NULL OR expires_at > NOW())
                        ORDER BY level DESC
                    """),
                    {'user_id': user_id}
                ).mappings().all()
                
                return list(rows)  # already list[dict]
                
        except Exception as e:
            logger.error(f"Error getting user roles: {e}")
            return []
    
    def assign_user_role(self, user_id: str, role: str, level: int, granted_by: str = None, expires_at: datetime = None) -> bool:
        """Assign role to user."""
        try:
            with self.db.session_scope() as session:
                # Check if role already exists
                existing = session.execute(
                    text("SELECT id FROM user_roles WHERE user_id = :user_id AND role = :role"),
                    {'user_id': user_id, 'role': role}
                ).fetchone()
                
                if existing:
                    # Update existing role
                    session.execute(
                        text("""
                            UPDATE user_roles SET
                                level = :level,
                                granted_by = :granted_by,
                                granted_at = NOW(),
                                expires_at = :expires_at,
                                is_active = TRUE
                            WHERE user_id = :user_id AND role = :role
                        """),
                        {
                            'user_id': user_id,
                            'role': role,
                            'level': level,
                            'granted_by': granted_by,
                            'expires_at': expires_at
                        }
                    )
                else:
                    # Insert new role
                    session.execute(
                        text("""
                            INSERT INTO user_roles (user_id, role, level, granted_by, granted_at, expires_at, is_active)
                            VALUES (:user_id, :role, :level, :granted_by, NOW(), :expires_at, TRUE)
                        """),
                        {
                            'user_id': user_id,
                            'role': role,
                            'level': level,
                            'granted_by': granted_by,
                            'expires_at': expires_at
                        }
                    )
                
                logger.info(f"Role '{role}' assigned to user {user_id} (level {level})")
                return True
                
        except Exception as e:
            logger.error(f"Error assigning user role: {e}")
            return False
    
    def revoke_user_role(self, user_id: str, role: str) -> bool:
        """Revoke role from user."""
        try:
            with self.db.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE user_roles SET is_active = FALSE
                        WHERE user_id = :user_id AND role = :role
                    """),
                    {'user_id': user_id, 'role': role}
                )
                logger.info(f"Role '{role}' revoked from user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error revoking user role: {e}")
            return False
    
    def verify_email(self, verification_token: str) -> bool:
        """Verify user email with verification token."""
        try:
            with self.db.session_scope() as session:
                # Find user with valid verification token
                result = session.execute(
                    text("""
                        SELECT id FROM users 
                        WHERE verification_token = :token 
                        AND verification_expires > NOW()
                        AND email_verified = FALSE
                    """),
                    {'token': verification_token}
                ).fetchone()
                
                if not result:
                    return False
                
                user_id = result.id
                
                # Mark email as verified
                session.execute(
                    text("""
                        UPDATE users SET 
                            email_verified = TRUE,
                            verification_token = NULL,
                            verification_expires = NULL
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
                # Get user details for welcome email
                user_details = session.execute(
                    text("SELECT email, name FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                # Send welcome email
                try:
                    from services.email_service import send_welcome_email
                    
                    if user_details:
                        email_sent = send_welcome_email(user_details.email, user_details.name or "User")
                        
                        if email_sent:
                            logger.info(f"Welcome email sent to {user_details.email}")
                        else:
                            logger.warning(f"Failed to send welcome email to {user_details.email}")
                            
                except Exception as e:
                    logger.error(f"Error sending welcome email: {e}")
                
                self._log_auth_event(user_id, 'email_verified', True)
                logger.info(f"Email verified for user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Email verification error: {e}")
            return False
    
    def create_guest_user(self, ip_address: str = None) -> Dict[str, Any]:
        """Create a guest user account with minimal permissions."""
        try:
            # Generate unique guest user ID and email
            user_id = secrets.token_hex(16)
            guest_email = f"guest-{user_id}@guest.local"
            
            with self.db.session_scope() as session:
                # Insert new guest user with all required fields
                session.execute(
                    text("""
                        INSERT INTO users (
                            id, name, email, email_verified,
                            "isSuperAdmin", "createdAt", "updatedAt", "emailVerified", image
                        ) VALUES (
                            :user_id, :name, :email, TRUE,
                            FALSE, NOW(), NOW(), NOW(), NULL
                        )
                    """),
                    {
                        'user_id': user_id,
                        'name': 'Guest User',
                        'email': guest_email
                    }
                )
                
                # Assign guest role with level 0
                session.execute(
                    text("""
                        INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active, created_at, updated_at)
                        VALUES (:user_id, 'guest', 0, NOW(), :user_id, TRUE, NOW(), NOW())
                    """),
                    {'user_id': user_id}
                )
                
                # Log guest user creation
                self._log_auth_event(user_id, 'guest_created', True, {'ip_address': ip_address}, ip_address)
                
                logger.info(f"Guest user created: {user_id}")
                
                return {
                    'user_id': user_id,
                    'email': guest_email,
                    'name': 'Guest User',
                    'email_verified': True,
                    'is_guest': True,  # Legacy field for compatibility
                    'roles': [{'role': 'guest', 'level': 0, 'granted_at': datetime.utcnow().isoformat()}],
                    'created_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Guest user creation error: {e}")
            raise AuthenticationError("Failed to create guest user account")

    def initiate_password_reset(self, email: str, ip_address: str = None) -> bool:
        """Initiate password reset process by generating reset token."""
        try:
            email = email.lower().strip()
            
            with self.db.session_scope() as session:
                # Check if user exists (don't reveal existence in response)
                result = session.execute(
                    text("SELECT id FROM users WHERE email = :email AND email NOT LIKE '%@guest.local'"),
                    {'email': email}
                ).fetchone()
                
                if not result:
                    # Log attempt for monitoring but return success
                    self._log_auth_event(None, 'password_reset_requested', False, 
                                       {'email': email, 'reason': 'user_not_found'}, ip_address)
                    return True  # Don't reveal user existence
                
                user_id = result.id
                
                # Generate secure reset token
                reset_token = secrets.token_urlsafe(32)
                reset_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
                
                # Clear any existing reset tokens and set new one
                session.execute(
                    text("""
                        UPDATE users SET 
                            reset_token = :reset_token,
                            reset_expires = :reset_expires
                        WHERE id = :user_id
                    """),
                    {
                        'user_id': user_id,
                        'reset_token': reset_token,
                        'reset_expires': reset_expires
                    }
                )
                
                # Log successful request
                self._log_auth_event(user_id, 'password_reset_requested', True, 
                                   {'email': email}, ip_address)
                
                logger.info(f"Password reset token generated for user {user_id}")
                
                # Send password reset email
                try:
                    from services.email_service import send_password_reset_email
                    
                    # Get user name from database
                    name_result = session.execute(
                        text("SELECT name FROM users WHERE id = :user_id"),
                        {'user_id': user_id}
                    ).fetchone()
                    user_name = name_result.name if name_result else "User"
                    
                    # Send the email
                    email_sent = send_password_reset_email(email, reset_token, user_name)
                    
                    if email_sent:
                        logger.info(f"Password reset email sent to {email}")
                    else:
                        logger.warning(f"Failed to send password reset email to {email}")
                        
                except Exception as e:
                    logger.error(f"Error sending password reset email: {e}")
                
                # Never log sensitive reset tokens in production
                if os.getenv('ENVIRONMENT', 'development').lower() != 'production':
                    logger.info(f"[DEV ONLY] Reset token for {email}: {reset_token}")
                
                return True
                
        except Exception as e:
            logger.error(f"Password reset initiation error: {e}")
            return False

    def reset_password_with_token(self, reset_token: str, new_password: str, ip_address: str = None) -> bool:
        """Reset user password using valid reset token."""
        try:
            # Validate new password strength
            password_validation = self.password_security.validate_password_strength(new_password)
            if not password_validation['is_valid']:
                raise ValidationError(f"Password requirements not met: {'; '.join(password_validation['issues'])}")
            
            with self.db.session_scope() as session:
                # Find user with valid reset token
                result = session.execute(
                    text("""
                        SELECT id, email FROM users 
                        WHERE reset_token = :token 
                        AND reset_expires > NOW()
                        AND email NOT LIKE '%@guest.local'
                    """),
                    {'token': reset_token}
                ).fetchone()
                
                if not result:
                    self._log_auth_event(None, 'password_reset_failed', False, 
                                       {'reason': 'invalid_token'}, ip_address)
                    return False
                
                user_id = result.id
                email = result.email
                
                # Hash new password
                new_password_hash = self.password_security.hash_password(new_password)
                
                # Update password and clear reset token
                session.execute(
                    text("""
                        UPDATE users SET 
                            password_hash = :password_hash,
                            reset_token = NULL,
                            reset_expires = NULL,
                            failed_login_attempts = 0,
                            locked_until = NULL
                        WHERE id = :user_id
                    """),
                    {
                        'user_id': user_id,
                        'password_hash': new_password_hash
                    }
                )
                
                # Log successful password reset
                self._log_auth_event(user_id, 'password_reset_completed', True, 
                                   {'email': email}, ip_address)
                
                logger.info(f"Password reset completed for user {user_id}")
                return True
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return False

    def upgrade_guest_to_email(self, user_id: str, email: str, password: str, name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Convert a guest account into a full email/password account.

        - Ensures the current user is a guest.
        - Validates email and password strength.
        - Atomically updates user record to set email/password and upgrade from guest status.
        - Deactivates guest role and ensures 'user' role is active at level 1.
        Returns updated user dict on success, None on failure.
        """
        try:
            if not email or '@' not in email:
                raise ValidationError("Valid email address is required")
            email = email.lower().strip()

            # Validate password
            pw = self.password_security.validate_password_strength(password)
            if not pw['is_valid']:
                raise ValidationError(f"Password requirements not met: {'; '.join(pw['issues'])}")

            password_hash = self.password_security.hash_password(password)

            with self.db.session_scope() as session:
                # Verify the current user is a guest (check by email pattern)
                row = session.execute(
                    text("SELECT id, email FROM users WHERE id = :uid"),
                    { 'uid': user_id }
                ).fetchone()
                if not row:
                    raise ValidationError("User not found")
                if not row.email.endswith("@guest.local"):
                    raise ValidationError("Only guest accounts can be upgraded")

                # Ensure email not taken by non-guest
                existing = session.execute(
                    text("SELECT id FROM users WHERE email = :email AND id <> :uid"),
                    { 'email': email, 'uid': user_id }
                ).fetchone()
                if existing:
                    raise ValidationError("Email address is already registered")

                # Perform the upgrade
                session.execute(
                    text(
                        """
                        UPDATE users
                        SET email = :email,
                            name = COALESCE(:name, name),
                            password_hash = :password_hash,
                            email_verified = FALSE,
                            verification_token = :verification_token,
                            verification_expires = :verification_expires,
                            "updatedAt" = NOW()
                        WHERE id = :uid
                        """
                    ),
                    {
                        'email': email,
                        'name': name,
                        'password_hash': password_hash,
                        'verification_token': secrets.token_urlsafe(32),
                        'verification_expires': datetime.utcnow() + timedelta(hours=24),
                        'uid': user_id,
                    }
                )

                # Deactivate guest role; ensure user role present and active
                session.execute(
                    text("UPDATE user_roles SET is_active = FALSE WHERE user_id = :uid AND role = 'guest' AND is_active = TRUE"),
                    { 'uid': user_id }
                )
                session.execute(
                    text(
                        """
                        INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active, created_at, updated_at)
                        VALUES (:uid, 'user', 1, NOW(), :uid, TRUE, NOW(), NOW())
                        ON CONFLICT (user_id, role)
                        DO UPDATE SET is_active = TRUE, level = EXCLUDED.level, updated_at = NOW()
                        """
                    ),
                    { 'uid': user_id }
                )

                # Fetch updated basic info + roles
                res = session.execute(
                    text(
                        """
                        SELECT u.id, u.name, u.email, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT('role', ur.role, 'level', ur.level)
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid
                        GROUP BY u.id, u.name, u.email, u.email_verified
                        """
                    ),
                    { 'uid': user_id }
                ).fetchone()

                import json as _json
                roles = _json.loads(res.roles) if res and res.roles else []

                # Send verification email best-effort
                try:
                    from services.email_service import send_email_verification
                    send_email_verification(email, None, name or "User")
                except Exception:
                    pass

                self._log_auth_event(user_id, 'guest_upgraded', True, {'email': email})

                return {
                    'user_id': res.id,
                    'name': res.name,
                    'email': res.email,
                    'email_verified': res.email_verified,
                    'roles': roles,
                }
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Guest upgrade error: {e}")
            return None

    def _log_auth_event(self, user_id: str, action: str, success: bool, details: Dict[str, Any] = None, ip_address: str = None):
        """Log authentication events for audit purposes."""
        try:
            with self.db.session_scope() as session:
                stmt = text("""
                    INSERT INTO auth_audit_log (user_id, action, ip_address, success, details, created_at)
                    VALUES (:user_id, :action, :ip_address, :success, :details, NOW())
                """).bindparams(bindparam("details", type_=JSON))
                
                session.execute(stmt, {
                    'user_id': user_id,
                    'action': action,
                    'ip_address': ip_address,
                    'success': success,
                    'details': details or {}
                })
                
        except Exception as e:
            logger.error(f"Failed to log auth event: {e}")


# Global instance - will be initialized by app factory
postgres_auth: Optional[PostgresAuthManager] = None


def get_postgres_auth() -> PostgresAuthManager:
    """Get global PostgreSQL auth manager instance."""
    if postgres_auth is None:
        # Try to initialize auth manager if not already done
        try:
            from database.connection_manager import get_connection_manager
            logger.warning("PostgreSQL auth manager not initialized, attempting automatic initialization")
            cm = get_connection_manager()
            initialize_postgres_auth(cm)
            logger.info("PostgreSQL auth manager auto-initialized successfully")
        except Exception as e:
            logger.error(f"Failed to auto-initialize PostgreSQL auth manager: {e}")
            raise RuntimeError("PostgreSQL auth manager not initialized and auto-initialization failed")
    return postgres_auth


def initialize_postgres_auth(db_manager) -> PostgresAuthManager:
    """Initialize PostgreSQL auth manager."""
    global postgres_auth
    postgres_auth = PostgresAuthManager(db_manager)
    logger.info("PostgreSQL authentication manager initialized")
    return postgres_auth
