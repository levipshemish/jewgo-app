"""
Authentication models for PostgreSQL-based authentication system (Version 2).
This version works alongside existing NextAuth tables without conflicts.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid

Base = declarative_base()

# Association table for user roles (new system)
jewgo_user_roles = Table(
    'jewgo_user_roles',
    Base.metadata,
    Column('user_id', String(36), ForeignKey('jewgo_users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('jewgo_roles.id'), primary_key=True)
)

class JewGoUser(Base):
    """JewGo User model for authentication (separate from existing NextAuth users)."""
    __tablename__ = 'jewgo_users'
    
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
    roles = relationship('JewGoRole', secondary=jewgo_user_roles, back_populates='users')
    sessions = relationship('JewGoUserSession', back_populates='user', cascade='all, delete-orphan')
    password_reset_tokens = relationship('JewGoPasswordResetToken', back_populates='user', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<JewGoUser {self.email}>'
    
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

class JewGoRole(Base):
    """JewGo Role model for user permissions."""
    __tablename__ = 'jewgo_roles'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    permissions = Column(Text, nullable=True)  # JSON string of permissions
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    users = relationship('JewGoUser', secondary=jewgo_user_roles, back_populates='roles')
    
    def __repr__(self):
        return f'<JewGoRole {self.name}>'

class JewGoUserSession(Base):
    """JewGo User session model for JWT token management."""
    __tablename__ = 'jewgo_user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('jewgo_users.id'), nullable=False, index=True)
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
    user = relationship('JewGoUser', back_populates='sessions')
    
    def __repr__(self):
        return f'<JewGoUserSession {self.id}>'
    
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

class JewGoPasswordResetToken(Base):
    """JewGo Password reset token model."""
    __tablename__ = 'jewgo_password_reset_tokens'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('jewgo_users.id'), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship('JewGoUser', back_populates='password_reset_tokens')
    
    def __repr__(self):
        return f'<JewGoPasswordResetToken {self.id}>'
    
    @property
    def is_expired(self):
        """Check if token is expired."""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_used(self):
        """Check if token has been used."""
        return self.used_at is not None

class JewGoAdminRole(Base):
    """JewGo Admin role model for backward compatibility."""
    __tablename__ = 'jewgo_admin_roles'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('jewgo_users.id'), nullable=False, index=True)
    role = Column(String(100), nullable=False, index=True)  # super_admin, admin, moderator
    is_active = Column(Boolean, default=True, nullable=False)
    granted_by = Column(String(36), ForeignKey('jewgo_users.id'), nullable=True)
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f'<JewGoAdminRole {self.user_id}:{self.role}>'
    
    @property
    def is_expired(self):
        """Check if admin role is expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

# Default roles to create
JEWGO_DEFAULT_ROLES = [
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
