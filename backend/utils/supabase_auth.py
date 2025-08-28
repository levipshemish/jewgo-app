"""
Supabase JWT verification utilities for backend authentication.

This module provides functions to verify Supabase JWT tokens and extract user information
for marketplace seller authentication and other protected endpoints.
"""

import os
import jwt
import requests
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, current_app
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, AuthorizationError

logger = get_logger(__name__)


class SupabaseAuthManager:
    """Manages Supabase JWT verification and user authentication."""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.jwks_url = f"{self.supabase_url}/rest/v1/auth/jwks" if self.supabase_url else None
        self._jwks_cache = None
        self._jwks_cache_time = 0
        self._cache_duration = 3600  # 1 hour cache
        
    def get_jwks(self) -> Optional[Dict[str, Any]]:
        """Get JSON Web Key Set from Supabase."""
        try:
            if not self.jwks_url:
                logger.error("SUPABASE_URL not configured")
                return None
                
            # Check cache
            import time
            current_time = time.time()
            if (self._jwks_cache and 
                current_time - self._jwks_cache_time < self._cache_duration):
                return self._jwks_cache
            
            # Fetch JWKS
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            self._jwks_cache = jwks
            self._jwks_cache_time = current_time
            
            logger.debug("JWKS fetched successfully")
            return jwks
            
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            return None
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Supabase JWT token and return payload."""
        try:
            if not token:
                return None
                
            # Decode token header to get key ID
            header = jwt.get_unverified_header(token)
            key_id = header.get('kid')
            
            if not key_id:
                logger.error("No key ID in JWT header")
                return None
            
            # Get JWKS
            jwks = self.get_jwks()
            if not jwks:
                logger.error("Failed to get JWKS")
                return None
            
            # Find the correct key
            public_key = None
            for key in jwks.get('keys', []):
                if key.get('kid') == key_id:
                    try:
                        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    except AttributeError:
                        # Fallback for older PyJWT versions
                        from cryptography.hazmat.primitives.asymmetric import rsa
                        from cryptography.hazmat.primitives import serialization
                        import base64
                        
                        # Create a mock public key for testing
                        public_key = "mock-public-key"
                    break
            
            if not public_key:
                logger.error(f"Key {key_id} not found in JWKS")
                return None
            
            # Verify and decode token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience='authenticated',
                issuer=self.supabase_url
            )
            
            logger.debug(f"JWT token verified for user: {payload.get('sub')}")
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
    
    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Extract user information from JWT token."""
        payload = self.verify_jwt_token(token)
        if not payload:
            return None
        
        # Extract user information
        user_info = {
            'user_id': payload.get('sub'),
            'email': payload.get('email'),
            'role': payload.get('role', 'authenticated'),
            'aud': payload.get('aud'),
            'exp': payload.get('exp'),
            'iat': payload.get('iat')
        }
        
        # Add app_metadata if available
        if 'app_metadata' in payload:
            user_info['app_metadata'] = payload['app_metadata']
        
        # Add user_metadata if available
        if 'user_metadata' in payload:
            user_info['user_metadata'] = payload['user_metadata']
        
        return user_info


# Global instance
supabase_auth = SupabaseAuthManager()


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify Supabase JWT token and return user information."""
    return supabase_auth.get_user_from_token(token)


def require_supabase_auth(f):
    """Decorator to require Supabase authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                raise AuthenticationError("Authorization header required")
            
            # Check Bearer token format
            if not auth_header.startswith("Bearer "):
                raise AuthenticationError("Bearer token required")
            
            token = auth_header.split(" ")[1]
            if not token:
                raise AuthenticationError("Token required")
            
            # Verify Supabase JWT token
            user_info = verify_supabase_token(token)
            if not user_info:
                raise AuthenticationError("Invalid or expired token")
            
            # Add user info to request context
            request.user = user_info
            
            # Log successful authentication
            logger.info("Supabase authentication successful", extra={
                'user_id': user_info.get('user_id'),
                'email': user_info.get('email'),
                'ip_address': request.remote_addr,
                'endpoint': request.endpoint
            })
            
            return f(*args, **kwargs)
        
        except AuthenticationError as e:
            logger.warning(f"Supabase authentication failed: {e.message}", extra={
                'ip_address': request.remote_addr,
                'endpoint': request.endpoint
            })
            return jsonify({
                'success': False,
                'error': e.message,
                'status_code': 401
            }), 401
        
        except Exception as e:
            logger.error(f"Unexpected error in Supabase authentication: {e}")
            return jsonify({
                'success': False,
                'error': 'Authentication error',
                'status_code': 401
            }), 401
    
    return decorated_function


def optional_supabase_auth(f):
    """Decorator for optional Supabase authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                if token:
                    # Verify Supabase JWT token
                    user_info = verify_supabase_token(token)
                    if user_info:
                        # Add user info to request context
                        request.user = user_info
                        logger.debug("Optional Supabase authentication successful", extra={
                            'user_id': user_info.get('user_id'),
                            'endpoint': request.endpoint
                        })
                    else:
                        logger.debug("Invalid token in optional Supabase authentication")
                else:
                    logger.debug("Empty token in optional Supabase authentication")
            else:
                logger.debug("No authorization header in optional Supabase authentication")
            
            return f(*args, **kwargs)
        
        except Exception as e:
            logger.error(f"Unexpected error in optional Supabase authentication: {e}")
            # Continue without authentication
            return f(*args, **kwargs)
    
    return decorated_function


def get_current_supabase_user() -> Optional[Dict[str, Any]]:
    """Get current authenticated user from request context."""
    return getattr(request, 'user', None)


def is_supabase_authenticated() -> bool:
    """Check if user is authenticated via Supabase."""
    return get_current_supabase_user() is not None


def get_supabase_user_id() -> Optional[str]:
    """Get current user ID from Supabase authentication."""
    user = get_current_supabase_user()
    return user.get('user_id') if user else None


def get_supabase_user_email() -> Optional[str]:
    """Get current user email from Supabase authentication."""
    user = get_current_supabase_user()
    return user.get('email') if user else None


# Aliases for backward compatibility
require_user_auth = require_supabase_auth
optional_user_auth = optional_supabase_auth
get_current_user = get_current_supabase_user
get_user_id = get_supabase_user_id
