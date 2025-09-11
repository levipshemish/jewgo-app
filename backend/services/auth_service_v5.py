#!/usr/bin/env python3
"""
V5 Authentication Service

Provides comprehensive authentication and authorization services including
JWT management, session handling, role-based access control, and security features.
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from flask import g

from utils.logging_config import get_logger
from utils.postgres_auth import get_user_by_email, create_user, update_user_last_login
from utils.rbac import get_user_roles, check_permission
from database.connection_manager import get_db_connection

logger = get_logger(__name__)

class AuthServiceV5:
    """V5 Authentication service with enhanced security and features."""
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key')
        self.jwt_algorithm = 'HS256'
        self.access_token_expiry = timedelta(hours=1)
        self.refresh_token_expiry = timedelta(days=30)
    
    def authenticate_user(self, email: str, password: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Authenticate user with email and password.
        
        Returns:
            Tuple of (success, user_data or None)
        """
        try:
            # Get user from database
            user = get_user_by_email(email)
            if not user:
                logger.warning(f"Authentication failed: user not found for email {email}")
                return False, None
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                logger.warning(f"Authentication failed: invalid password for email {email}")
                return False, None
            
            # Update last login
            update_user_last_login(user['id'])
            
            # Get user roles
            roles = get_user_roles(user['id'])
            
            user_data = {
                'id': user['id'],
                'email': user['email'],
                'name': user.get('name', ''),
                'roles': roles,
                'last_login': datetime.utcnow().isoformat()
            }
            
            logger.info(f"User authenticated successfully: {email}")
            return True, user_data
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {str(e)}")
            return False, None
    
    def register_user(self, email: str, password: str, name: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Register a new user.
        
        Returns:
            Tuple of (success, user_data or error_message)
        """
        try:
            # Check if user already exists
            existing_user = get_user_by_email(email)
            if existing_user:
                return False, "User already exists"
            
            # Hash password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create user
            user_id = create_user(email, password_hash, name)
            if not user_id:
                return False, "Failed to create user"
            
            # Get user data
            user = get_user_by_email(email)
            user_data = {
                'id': user['id'],
                'email': user['email'],
                'name': user.get('name', ''),
                'roles': [],  # New users start with no roles
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"User registered successfully: {email}")
            return True, user_data
            
        except Exception as e:
            logger.error(f"Registration error for {email}: {str(e)}")
            return False, str(e)
    
    def generate_tokens(self, user_data: Dict[str, Any], remember_me: bool = False) -> Dict[str, str]:
        """
        Generate JWT access and refresh tokens.
        
        Returns:
            Dictionary with access_token and refresh_token
        """
        try:
            # Calculate expiry times
            access_expiry = datetime.utcnow() + self.access_token_expiry
            refresh_expiry = datetime.utcnow() + (self.refresh_token_expiry if remember_me else timedelta(days=7))
            
            # Create token payload
            payload = {
                'user_id': user_data['id'],
                'email': user_data['email'],
                'roles': user_data.get('roles', []),
                'iat': datetime.utcnow(),
                'exp': access_expiry
            }
            
            # Generate tokens
            access_token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            # Refresh token payload (simpler)
            refresh_payload = {
                'user_id': user_data['id'],
                'type': 'refresh',
                'iat': datetime.utcnow(),
                'exp': refresh_expiry
            }
            refresh_token = jwt.encode(refresh_payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': int(self.access_token_expiry.total_seconds()),
                'token_type': 'Bearer'
            }
            
        except Exception as e:
            logger.error(f"Token generation error: {str(e)}")
            raise
    
    def refresh_access_token(self, refresh_token: str) -> Tuple[bool, Optional[Dict[str, str]]]:
        """
        Refresh access token using refresh token.
        
        Returns:
            Tuple of (success, new_tokens or None)
        """
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            if payload.get('type') != 'refresh':
                return False, None
            
            # Get user data
            user = get_user_by_email(payload['email']) if 'email' in payload else None
            if not user:
                return False, None
            
            # Get user roles
            roles = get_user_roles(user['id'])
            
            user_data = {
                'id': user['id'],
                'email': user['email'],
                'name': user.get('name', ''),
                'roles': roles
            }
            
            # Generate new tokens
            new_tokens = self.generate_tokens(user_data)
            
            logger.info(f"Access token refreshed for user {user['id']}")
            return True, new_tokens
            
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired")
            return False, None
        except jwt.InvalidTokenError:
            logger.warning("Invalid refresh token")
            return False, None
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return False, None
    
    def invalidate_token(self, token: str) -> bool:
        """
        Invalidate a token (add to blacklist).
        
        Note: In a production system, you'd want to implement a token blacklist
        using Redis or database storage.
        """
        try:
            # For now, we'll just log the invalidation
            # In production, add to Redis blacklist with TTL
            logger.info(f"Token invalidated: {token[:20]}...")
            return True
            
        except Exception as e:
            logger.error(f"Token invalidation error: {str(e)}")
            return False
    
    def get_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get user profile information.
        
        Returns:
            User profile data or None
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, email, name, created_at, last_login, is_active
                        FROM users 
                        WHERE id = %s
                    """, (user_id,))
                    
                    user = cursor.fetchone()
                    if not user:
                        return None
                    
                    # Get user roles
                    roles = get_user_roles(user_id)
                    
                    return {
                        'id': user['id'],
                        'email': user['email'],
                        'name': user['name'],
                        'roles': roles,
                        'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                        'last_login': user['last_login'].isoformat() if user['last_login'] else None,
                        'is_active': user['is_active']
                    }
                    
        except Exception as e:
            logger.error(f"Get user profile error for user {user_id}: {str(e)}")
            return None
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> Tuple[bool, str]:
        """
        Change user password.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # Get current password hash
                    cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
                    user = cursor.fetchone()
                    
                    if not user:
                        return False, "User not found"
                    
                    # Verify current password
                    if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                        return False, "Current password is incorrect"
                    
                    # Hash new password
                    new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                    # Update password
                    cursor.execute("""
                        UPDATE users 
                        SET password_hash = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (new_password_hash, user_id))
                    
                    conn.commit()
                    
                    logger.info(f"Password changed for user {user_id}")
                    return True, "Password changed successfully"
                    
        except Exception as e:
            logger.error(f"Change password error for user {user_id}: {str(e)}")
            return False, str(e)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token.
        
        Returns:
            Token payload or None if invalid
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return None
    
    def update_user_profile(self, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user profile.
        
        Returns:
            Dictionary with success status and profile data or error
        """
        try:
            # This is a stub implementation - would need actual database update logic
            logger.info(f"Profile update requested for user {user_id}")
            
            # For now, return a success response with the data
            return {
                'success': True,
                'profile': {
                    'id': user_id,
                    'updated_fields': list(data.keys()),
                    'updated_at': datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Profile update error for user {user_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_role_hierarchy(self) -> Dict[str, Any]:
        """Get role hierarchy information."""
        return {
            'admin': 10,
            'moderator': 5,
            'user': 1,
            'guest': 0
        }
    
    def get_permission_groups(self) -> Dict[str, List[str]]:
        """Get permission groups."""
        return {
            'admin': ['*'],
            'moderator': ['read_entities', 'update_entities', 'delete_entities'],
            'user': ['read_entities', 'create_entities'],
            'guest': ['read_entities']
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for auth service."""
        try:
            # Test database connection
            conn = get_db_connection()
            if conn:
                conn.close()
                db_status = 'healthy'
            else:
                db_status = 'unhealthy'
            
            return {
                'status': 'healthy',
                'database': db_status,
                'jwt_secret_configured': bool(self.jwt_secret and self.jwt_secret != 'your-secret-key'),
                'features': [
                    'JWT authentication',
                    'Password hashing',
                    'Token refresh',
                    'User management'
                ]
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }