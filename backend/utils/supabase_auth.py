"""
Supabase Authentication Integration for Backend API

This module provides authentication decorators and utilities to integrate
Supabase user authentication with Flask backend endpoints.
"""

import os
import jwt
import requests
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, current_app
from utils.logging_config import get_logger

logger = get_logger(__name__)


class SupabaseAuthError(Exception):
    """Custom exception for Supabase authentication errors"""
    pass


class SupabaseAuthManager:
    """Manages Supabase authentication for backend API endpoints"""
    
    def __init__(self):
        self.supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_anon_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        self.jwt_secret = os.environ.get('SUPABASE_JWT_SECRET')
        
        if not all([self.supabase_url, self.supabase_anon_key]):
            logger.warning("Supabase configuration incomplete - auth will be disabled")
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a JWT token from Supabase
        
        Args:
            token: JWT token from Authorization header
            
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            if not self.jwt_secret:
                logger.warning("JWT secret not configured - using public key verification")
                return self._verify_with_public_key(token)
            
            # Verify with JWT secret
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=['HS256'],
                audience='authenticated'
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying JWT token: {e}")
            return None
    
    def _verify_with_public_key(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token using Supabase's public key (fallback method)
        """
        try:
            # Get Supabase's JWKS (JSON Web Key Set)
            jwks_url = f"{self.supabase_url}/rest/v1/auth/jwks"
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            
            # Decode token header to get key ID
            header = jwt.get_unverified_header(token)
            key_id = header.get('kid')
            
            if not key_id:
                logger.warning("No key ID in JWT header")
                return None
            
            # Find the public key
            public_key = None
            for key in jwks.get('keys', []):
                if key.get('kid') == key_id:
                    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break
            
            if not public_key:
                logger.warning(f"Public key not found for key ID: {key_id}")
                return None
            
            # Verify token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience='authenticated'
            )
            return payload
            
        except Exception as e:
            logger.error(f"Error verifying with public key: {e}")
            return None
    
    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from JWT token
        
        Args:
            token: JWT token from Authorization header
            
        Returns:
            User information if token is valid, None otherwise
        """
        payload = self.verify_jwt_token(token)
        if not payload:
            return None
        
        # Extract user information from token payload
        user_info = {
            'id': payload.get('sub'),
            'email': payload.get('email'),
            'role': payload.get('role', 'authenticated'),
            'aud': payload.get('aud'),
            'exp': payload.get('exp'),
            'iat': payload.get('iat'),
            'iss': payload.get('iss'),
            'user_metadata': payload.get('user_metadata', {}),
            'app_metadata': payload.get('app_metadata', {})
        }
        
        return user_info
    
    def extract_token_from_request(self) -> Optional[str]:
        """
        Extract JWT token from request headers
        
        Returns:
            JWT token if found, None otherwise
        """
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        # Check for Bearer token
        if auth_header.startswith('Bearer '):
            return auth_header[7:]  # Remove 'Bearer ' prefix
        
        return None


# Global instance
auth_manager = SupabaseAuthManager()


def require_user_auth(f):
    """
    Decorator to require user authentication for API endpoints
    
    Usage:
        @app.route('/api/user/profile')
        @require_user_auth
        def get_user_profile():
            user = request.user  # Access authenticated user
            return jsonify(user)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip auth if Supabase is not configured
        if not auth_manager.supabase_url:
            logger.warning("Supabase not configured - skipping auth check")
            return f(*args, **kwargs)
        
        # Extract token from request
        token = auth_manager.extract_token_from_request()
        if not token:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        # Verify token and get user
        user = auth_manager.get_user_from_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user to request context
        request.user = user
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_user_role(required_role: str):
    """
    Decorator to require specific user role
    
    Usage:
        @app.route('/api/admin/users')
        @require_user_role('admin')
        def get_users():
            return jsonify(users)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check user authentication
            token = auth_manager.extract_token_from_request()
            if not token:
                return jsonify({'error': 'No authorization token provided'}), 401
            
            user = auth_manager.get_user_from_token(token)
            if not user:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Check role
            user_role = user.get('role', 'authenticated')
            if user_role != required_role:
                return jsonify({'error': f'Insufficient permissions. Required role: {required_role}'}), 403
            
            request.user = user
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def optional_user_auth(f):
    """
    Decorator for optional user authentication
    
    Usage:
        @app.route('/api/public/data')
        @optional_user_auth
        def get_data():
            user = getattr(request, 'user', None)  # May be None
            return jsonify(data)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip auth if Supabase is not configured
        if not auth_manager.supabase_url:
            return f(*args, **kwargs)
        
        # Try to get user, but don't require it
        token = auth_manager.extract_token_from_request()
        if token:
            user = auth_manager.get_user_from_token(token)
            if user:
                request.user = user
        
        return f(*args, **kwargs)
    
    return decorated_function


# Utility functions for use in route handlers
def get_current_user() -> Optional[Dict[str, Any]]:
    """Get the current authenticated user from request context"""
    return getattr(request, 'user', None)


def is_user_authenticated() -> bool:
    """Check if user is authenticated"""
    return get_current_user() is not None


def get_user_id() -> Optional[str]:
    """Get the current user's ID"""
    user = get_current_user()
    return user.get('id') if user else None


def get_user_email() -> Optional[str]:
    """Get the current user's email"""
    user = get_current_user()
    return user.get('email') if user else None
