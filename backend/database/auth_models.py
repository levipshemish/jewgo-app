"""
Authentication models for PostgreSQL-based authentication system.
This replaces Supabase authentication with a custom PostgreSQL solution.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid

Base = declarative_base()

# Association table for user roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String(36), ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

class User(Base):
    """User model for authentication."""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    phone_verified_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    sessions = relationship('UserSession', back_populates='user', cascade='all, delete-orphan')
    password_reset_tokens = relationship('PasswordResetToken', back_populates='user', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    @property
    def is_locked(self):
        """Check if user account is locked."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    @property
    def full_name(self):
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.username:
            return self.username
        return self.email

class Role(Base):
    """Role model for user permissions."""
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    permissions = Column(Text, nullable=True)  # JSON string of permissions
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')
    
    def __repr__(self):
        return f'<Role {self.name}>'

class UserSession(Base):
    """User session model for JWT token management."""
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    refresh_token_hash = Column(String(255), nullable=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    refresh_expires_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_used_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='sessions')
    
    def __repr__(self):
        return f'<UserSession {self.id}>'
    
    @property
    def is_expired(self):
        """Check if session is expired."""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_refresh_expired(self):
        """Check if refresh token is expired."""
        if not self.refresh_expires_at:
            return True
        return datetime.utcnow() > self.refresh_expires_at

class PasswordResetToken(Base):
    """Password reset token model."""
    __tablename__ = 'password_reset_tokens'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='password_reset_tokens')
    
    def __repr__(self):
        return f'<PasswordResetToken {self.id}>'
    
    @property
    def is_expired(self):
        """Check if token is expired."""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_used(self):
        """Check if token has been used."""
        return self.used_at is not None

class AdminRole(Base):
    """Admin role model for backward compatibility."""
    __tablename__ = 'admin_roles'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    role = Column(String(100), nullable=False, index=True)  # super_admin, admin, moderator
    is_active = Column(Boolean, default=True, nullable=False)
    granted_by = Column(String(36), ForeignKey('users.id'), nullable=True)
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f'<AdminRole {self.user_id}:{self.role}>'
    
    @property
    def is_expired(self):
        """Check if admin role is expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

# Default roles to create
DEFAULT_ROLES = [
    {
        'name': 'user',
        'description': 'Standard user with basic access',
        'permissions': '["read:restaurants", "write:reviews", "read:marketplace"]'
    },
    {
        'name': 'moderator',
        'description': 'Moderator with content management permissions',
        'permissions': '["read:restaurants", "write:reviews", "moderate:reviews", "read:admin"]'
    },
    {
        'name': 'admin',
        'description': 'Administrator with full access',
        'permissions': '["*"]'
    },
    {
        'name': 'super_admin',
        'description': 'Super administrator with system-wide access',
        'permissions': '["*"]'
    }
]
