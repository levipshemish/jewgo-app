"""
Authentication service for PostgreSQL-based authentication system.
This replaces Supabase authentication with a custom PostgreSQL solution.
"""

import os
import jwt
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash

from database.auth_models_v2 import JewGoUser, JewGoRole, JewGoUserSession, JewGoPasswordResetToken, JewGoAdminRole, JEWGO_DEFAULT_ROLES
from utils.logging_config import get_logger

logger = get_logger(__name__)

class AuthService:
    """Authentication service for user management and JWT tokens."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.jwt_secret = os.getenv("JWT_SECRET_KEY") or os.getenv("FLASK_SECRET_KEY")
        self.jwt_algorithm = "HS256"
        self.access_token_expiry = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))  # 1 hour
        self.refresh_token_expiry = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "604800"))  # 7 days
        
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET_KEY or FLASK_SECRET_KEY must be configured")
    
    def create_user(self, email: str, password: str, **kwargs) -> Optional[JewGoUser]:
        """Create a new user account."""
        try:
            # Check if user already exists
            if self.get_user_by_email(email):
                logger.warning(f"User with email {email} already exists")
                return None
            
            # Create user
            user = JewGoUser(
                email=email.lower(),
                password_hash=generate_password_hash(password),
                **kwargs
            )
            
            # Add default user role
            default_role = self.db.query(JewGoRole).filter(JewGoRole.name == 'user').first()
            if default_role:
                user.roles.append(default_role)
            
            self.db.add(user)
            self.db.commit()
            
            logger.info(f"Created user account for {email}")
            return user
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Failed to create user {email}: {e}")
            return None
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error creating user {email}: {e}")
            return None
    
    def authenticate_user(self, email: str, password: str, ip_address: str = None, user_agent: str = None) -> Optional[Dict[str, Any]]:
        """Authenticate user and return JWT tokens."""
        try:
            user = self.get_user_by_email(email)
            if not user:
                logger.warning(f"Authentication failed: user {email} not found")
                return None
            
            # Check if account is locked
            if user.is_locked:
                logger.warning(f"Authentication failed: account {email} is locked")
                return None
            
            # Check if account is active
            if not user.is_active:
                logger.warning(f"Authentication failed: account {email} is inactive")
                return None
            
            # Verify password
            if not check_password_hash(user.password_hash, password):
                # Increment failed login attempts
                user.failed_login_attempts += 1
                
                # Lock account after 5 failed attempts
                if user.failed_login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                    logger.warning(f"Account {email} locked due to multiple failed attempts")
                
                self.db.commit()
                logger.warning(f"Authentication failed: invalid password for {email}")
                return None
            
            # Reset failed login attempts on successful login
            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_login_at = datetime.utcnow()
            
            # Create session first with placeholder tokens
            session = self._create_user_session(user, "placeholder", "placeholder", ip_address, user_agent)
            session_id = session.id
            
            # Generate tokens with the actual session ID
            access_token = self._generate_access_token(user, session_id)
            refresh_token = self._generate_refresh_token(user, session_id)
            
            # Update session with actual token hashes
            session.token_hash = hashlib.sha256(access_token.encode()).hexdigest()
            session.refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            
            self.db.commit()
            
            logger.info(f"User {email} authenticated successfully with session {session_id}")
            
            return {
                'user': self._user_to_dict(user),
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': self.access_token_expiry,
                'refresh_expires_in': self.refresh_token_expiry
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Authentication error for {email}: {e}")
            return None
    
    def refresh_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh access token using refresh token."""
        try:
            # Verify refresh token
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get('sub')
            session_id = payload.get('session_id')
            
            if not user_id or not session_id:
                logger.warning("Invalid refresh token payload")
                return None
            
            # Get session
            session = self.db.query(JewGoUserSession).filter(
                JewGoUserSession.id == session_id,
                JewGoUserSession.user_id == user_id,
                JewGoUserSession.is_active == True
            ).first()
            
            if not session or session.is_refresh_expired:
                logger.warning("Invalid or expired refresh token")
                return None
            
            # Get user
            user = self.get_user_by_id(user_id)
            if not user or not user.is_active:
                logger.warning("User not found or inactive")
                return None
            
            # Generate new access token
            new_access_token = self._generate_access_token(user, session_id)
            
            # Update session
            session.last_used_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Refreshed token for user {user.email}")
            
            return {
                'access_token': new_access_token,
                'expires_in': self.access_token_expiry
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return user information."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get('sub')
            session_id = payload.get('session_id')
            
            logger.info(f"Verifying token for user {user_id}, session {session_id}")
            
            if not user_id or not session_id:
                logger.warning("Invalid token payload - missing user_id or session_id")
                return None
            
            # Get session with detailed logging
            logger.info(f"Looking up session {session_id} for user {user_id}")
            
            # CRITICAL: Use the existing database session but ensure it's fresh
            # The issue is that we're reusing a session from a previous transaction
            # Let's ensure we're using the current session properly
            
            # First, let's check if we have any pending transactions and commit them
            if self.db.is_active:
                logger.info("Database session is active, committing any pending transactions")
                self.db.commit()
            
            # Now let's try to get the session with populate_existing to bypass cache
            user_session = (
                self.db.query(JewGoUserSession)
                .execution_options(populate_existing=True)  # bypass cached state
                .filter(
                    JewGoUserSession.id == session_id,
                    JewGoUserSession.user_id == user_id,
                    JewGoUserSession.is_active == True
                )
                .first()
            )
            
            if not user_session:
                logger.warning(f"Session not found: {session_id} for user {user_id}")
                
                # Debug: Check what sessions exist for this user
                all_sessions = (
                    self.db.query(JewGoUserSession)
                    .execution_options(populate_existing=True)
                    .filter(JewGoUserSession.user_id == user_id)
                    .all()
                )
                logger.info(f"User {user_id} has {len(all_sessions)} total sessions:")
                for s in all_sessions:
                    logger.info(f"  Session {s.id}: active={s.is_active}, expires={s.expires_at}")
                
                return None
            
            logger.info(f"Session found: {session_id}, active: {user_session.is_active}, expires: {user_session.expires_at}")
            logger.info(f"Current time (UTC): {datetime.utcnow()}")
            logger.info(f"Session expired: {user_session.is_expired}")
            
            if user_session.is_expired:
                logger.warning(f"Session expired: {session_id}")
                return None
            
            logger.info(f"Session verified successfully: {session_id}")
            
            # Get user
            user = self.get_user_by_id(user_id)
            if not user or not user.is_active:
                logger.warning("User not found or inactive")
                return None
            
            # Update session last used
            user_session.last_used_at = datetime.utcnow()
            self.db.commit()
            
            return self._user_to_dict(user)
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def logout(self, token: str) -> bool:
        """Logout user by invalidating session."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            session_id = payload.get('session_id')
            
            if session_id:
                session = self.db.query(JewGoUserSession).filter(JewGoUserSession.id == session_id).first()
                if session:
                    session.is_active = False
                    self.db.commit()
                    logger.info(f"User logged out, session {session_id} invalidated")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    def get_user_by_email(self, email: str) -> Optional[JewGoUser]:
        """Get user by email address."""
        return self.db.query(JewGoUser).filter(JewGoUser.email == email.lower()).first()
    
    def get_user_by_id(self, user_id: str) -> Optional[JewGoUser]:
        """Get user by ID."""
        return self.db.query(JewGoUser).filter(JewGoUser.id == user_id).first()
    
    def get_user_roles(self, user_id: str) -> List[str]:
        """Get user's role names."""
        user = self.db.query(JewGoUser).filter(JewGoUser.id == user_id).first()
        if user:
            return [role.name for role in user.roles]
        return []
    
    def has_role(self, user_id: str, role_name: str) -> bool:
        """Check if user has a specific role."""
        return role_name in self.get_user_roles(user_id)
    
    def is_admin(self, user_id: str) -> bool:
        """Check if user has admin privileges."""
        admin_roles = ['admin', 'super_admin', 'moderator']
        return any(self.has_role(user_id, role) for role in admin_roles)
    
    def _generate_access_token(self, user: JewGoUser, session_id: str = None) -> str:
        """Generate access JWT token."""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Use UTC time for JWT
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.access_token_expiry)
        
        payload = {
            'sub': user.id,
            'email': user.email,
            'session_id': session_id,
            'iat': int(now.timestamp()),
            'exp': int(expires_at.timestamp()),
            'type': 'access'
        }
        
        logger.info(f"Generating access token for user {user.email}, expires at {expires_at} (UTC), session_id: {session_id}")
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _generate_refresh_token(self, user: JewGoUser, session_id: str = None) -> str:
        """Generate refresh JWT token."""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Use UTC time for JWT
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.refresh_token_expiry)
        
        payload = {
            'sub': user.id,
            'session_id': session_id,
            'iat': int(now.timestamp()),
            'exp': int(expires_at.timestamp()),
            'type': 'refresh'
        }
        
        logger.info(f"Generating refresh token for user {user.email}, expires at {expires_at} (UTC), session_id: {session_id}")
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _create_user_session(self, user: JewGoUser, access_token: str, refresh_token: str, ip_address: str = None, user_agent: str = None) -> JewGoUserSession:
        """Create user session record."""
        session_id = str(uuid.uuid4())
        
        session = JewGoUserSession(
            id=session_id,
            user_id=user.id,
            token_hash=hashlib.sha256(access_token.encode()).hexdigest(),
            refresh_token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
            expires_at=datetime.utcnow() + timedelta(seconds=self.access_token_expiry),
            refresh_expires_at=datetime.utcnow() + timedelta(seconds=self.refresh_token_expiry),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(session)
        return session
    
    def _user_to_dict(self, user: JewGoUser) -> Dict[str, Any]:
        """Convert user object to dictionary."""
        return {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'is_verified': user.is_verified,
            'roles': [role.name for role in user.roles],
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None
        }
    
    def initialize_roles(self) -> bool:
        """Initialize default roles in the database."""
        try:
            for role_data in JEWGO_DEFAULT_ROLES:
                existing_role = self.db.query(JewGoRole).filter(JewGoRole.name == role_data['name']).first()
                if not existing_role:
                    role = JewGoRole(**role_data)
                    self.db.add(role)
                    logger.info(f"Created role: {role_data['name']}")
            
            self.db.commit()
            logger.info("Default roles initialized successfully")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to initialize roles: {e}")
            return False
    
    def create_admin_user(self, email: str, password: str, role: str = 'admin', **kwargs) -> Optional[JewGoUser]:
        """Create an admin user account."""
        try:
            # Create user
            user = self.create_user(email, password, **kwargs)
            if not user:
                return None
            
            # Add admin role
            admin_role = self.db.query(JewGoRole).filter(JewGoRole.name == role).first()
            if admin_role:
                user.roles.append(admin_role)
            
            # Create admin role record for backward compatibility
            admin_record = JewGoAdminRole(
                user_id=user.id,
                role=role,
                is_active=True
            )
            self.db.add(admin_record)
            
            self.db.commit()
            logger.info(f"Created admin user {email} with role {role}")
            return user
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create admin user {email}: {e}")
            return None
