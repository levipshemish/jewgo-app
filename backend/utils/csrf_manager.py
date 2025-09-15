#!/usr/bin/env python3
"""
CSRF Protection Manager

Provides HMAC-based CSRF token generation and validation with timing attack protection.
Implements the double-submit cookie pattern for CSRF protection.
"""

import os
import hmac
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from utils.logging_config import get_logger

logger = get_logger(__name__)


class CSRFManager:
    """CSRF protection manager with HMAC-based token validation."""
    
    def __init__(self, secret_key: str = None):
        """Initialize CSRF manager."""
        self.secret_key = secret_key or os.getenv('CSRF_SECRET_KEY', 'default-csrf-secret')
        if not self.secret_key or self.secret_key == 'default-csrf-secret':
            logger.warning("Using default CSRF secret - not secure for production")
        
        # Token configuration
        self.token_length = 32
        self.day_bucket_format = '%Y-%m-%d'
        # TTL (seconds) used by routes for response hints and cookie max-age
        # Keep default reasonable; allow override via environment.
        try:
            self.token_ttl = int(os.getenv('CSRF_TOKEN_TTL', '3600'))
        except ValueError:
            self.token_ttl = 3600
    
    def generate_token(self, session_id: str, user_agent: str) -> str:
        """
        Generate HMAC-based CSRF token with day bucket.
        
        Args:
            session_id: Session identifier
            user_agent: User agent string
            
        Returns:
            CSRF token string
        """
        try:
            # Create day bucket for token rotation
            day_bucket = datetime.utcnow().strftime(self.day_bucket_format)
            
            # Generate random nonce
            nonce = secrets.token_urlsafe(self.token_length)
            
            # Create message to sign
            message = f"{session_id}:{user_agent}:{day_bucket}:{nonce}"
            
            # Generate HMAC signature
            signature = hmac.new(
                self.secret_key.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Combine nonce and signature
            token = f"{nonce}:{signature}"
            
            logger.debug(f"CSRF token generated for session {session_id[:8]}...")
            return token
            
        except Exception as e:
            logger.error(f"CSRF token generation error: {e}")
            raise
    
    def validate_token(self, token: str, session_id: str, user_agent: str) -> bool:
        """
        Validate CSRF token with timing attack protection.
        
        Args:
            token: CSRF token to validate
            session_id: Session identifier
            user_agent: User agent string
            
        Returns:
            True if token is valid, False otherwise
        """
        try:
            # Use constant-time comparison to prevent timing attacks
            start_time = time.time()
            
            # Parse token
            if ':' not in token:
                return self._constant_time_false(start_time)
            
            nonce, provided_signature = token.split(':', 1)
            if len(nonce) < 20 or len(provided_signature) != 64:  # SHA256 hex length
                return self._constant_time_false(start_time)
            
            # Try current day bucket first
            day_bucket = datetime.utcnow().strftime(self.day_bucket_format)
            is_valid = self._validate_token_for_bucket(
                nonce, provided_signature, session_id, user_agent, day_bucket
            )
            
            if is_valid:
                return self._constant_time_true(start_time)
            
            # Try previous day bucket (for clock skew tolerance)
            prev_day = (datetime.utcnow() - timedelta(days=1)).strftime(self.day_bucket_format)
            is_valid = self._validate_token_for_bucket(
                nonce, provided_signature, session_id, user_agent, prev_day
            )
            
            return self._constant_time_true(start_time) if is_valid else self._constant_time_false(start_time)
            
        except Exception as e:
            logger.error(f"CSRF token validation error: {e}")
            return False
    
    def _validate_token_for_bucket(self, nonce: str, provided_signature: str, 
                                 session_id: str, user_agent: str, day_bucket: str) -> bool:
        """Validate token for a specific day bucket."""
        try:
            # Recreate message
            message = f"{session_id}:{user_agent}:{day_bucket}:{nonce}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                self.secret_key.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison
            return hmac.compare_digest(provided_signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Token bucket validation error: {e}")
            return False
    
    def _constant_time_true(self, start_time: float) -> bool:
        """Return True with constant timing."""
        elapsed = time.time() - start_time
        if elapsed < 0.01:  # Ensure minimum timing
            time.sleep(0.01 - elapsed)
        return True
    
    def _constant_time_false(self, start_time: float) -> bool:
        """Return False with constant timing."""
        elapsed = time.time() - start_time
        if elapsed < 0.01:  # Ensure minimum timing
            time.sleep(0.01 - elapsed)
        return False
    
    def get_csrf_cookie_config(self) -> Dict[str, Any]:
        """
        Get environment-aware cookie configuration.
        
        Returns:
            Cookie configuration dictionary
        """
        environment = os.getenv('ENVIRONMENT', 'development')
        
        if environment == 'production':
            return {
                'name': 'csrf_token',
                'secure': True,
                'httponly': False,  # CSRF tokens need to be accessible to JavaScript
                'samesite': 'None',
                'domain': '.jewgo.app',
                'max_age': 3600,  # 1 hour
                'path': '/'
            }
        elif environment == 'preview':
            return {
                'name': 'csrf_token',
                'secure': True,
                'httponly': False,
                'samesite': 'None',
                'domain': None,  # host-only
                'max_age': 3600,
                'path': '/'
            }
        else:  # development
            return {
                'name': 'csrf_token',
                'secure': False,
                'httponly': False,
                'samesite': 'Lax',
                'domain': None,
                'max_age': 3600,
                'path': '/'
            }
    
    def extract_session_id_from_request(self, request) -> Optional[str]:
        """
        Extract session ID from request.
        
        Args:
            request: Flask request object
            
        Returns:
            Session ID or None
        """
        try:
            # Try to get session ID from various sources
            session_id = None
            
            # 1. From session cookie
            if hasattr(request, 'cookies'):
                session_id = request.cookies.get('session_id')
            
            # 2. From Authorization header (if it contains session info)
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                # For now, use a hash of the token as session ID
                token = auth_header.split(' ', 1)[1]
                session_id = hashlib.sha256(token.encode()).hexdigest()[:16]
            
            # 3. From custom header
            if not session_id:
                session_id = request.headers.get('X-Session-ID')
            
            return session_id
            
        except Exception as e:
            logger.error(f"Error extracting session ID: {e}")
            return None
    
    def extract_user_agent_from_request(self, request) -> str:
        """
        Extract user agent from request.
        
        Args:
            request: Flask request object
            
        Returns:
            User agent string
        """
        try:
            user_agent = request.headers.get('User-Agent', 'Unknown')
            # Hash user agent to prevent information leakage
            return hashlib.sha256(user_agent.encode()).hexdigest()[:16]
        except Exception as e:
            logger.error(f"Error extracting user agent: {e}")
            return 'unknown'
    
    def is_mutating_method(self, method: str) -> bool:
        """
        Check if HTTP method is mutating (requires CSRF protection).
        
        Args:
            method: HTTP method
            
        Returns:
            True if method requires CSRF protection
        """
        return method.upper() in ['POST', 'PUT', 'PATCH', 'DELETE']
    
    def validate_request(self, request) -> Dict[str, Any]:
        """
        Validate CSRF token for a request.
        
        Args:
            request: Flask request object
            
        Returns:
            Validation result dictionary
        """
        try:
            # Check if method requires CSRF protection
            if not self.is_mutating_method(request.method):
                return {
                    'valid': True,
                    'reason': 'Non-mutating method'
                }
            
            # Extract session ID and user agent
            session_id = self.extract_session_id_from_request(request)
            if not session_id:
                return {
                    'valid': False,
                    'reason': 'No session ID found'
                }
            
            user_agent = self.extract_user_agent_from_request(request)
            
            # Get CSRF token from header
            csrf_token = request.headers.get('X-CSRF-Token')
            if not csrf_token:
                return {
                    'valid': False,
                    'reason': 'No CSRF token provided'
                }
            
            # Validate token
            is_valid = self.validate_token(csrf_token, session_id, user_agent)
            
            return {
                'valid': is_valid,
                'reason': 'Token validation' if is_valid else 'Invalid CSRF token'
            }
            
        except Exception as e:
            logger.error(f"CSRF request validation error: {e}")
            return {
                'valid': False,
                'reason': f'Validation error: {str(e)}'
            }


# Global CSRF manager instance
csrf_manager = CSRFManager()


def get_csrf_manager() -> CSRFManager:
    """
    Get the global CSRF manager instance.
    
    Returns:
        CSRFManager instance
    """
    return csrf_manager


def init_csrf_manager(secret_key: Optional[str] = None, token_ttl: Optional[int] = None) -> CSRFManager:
    """(Re)initialize the global CSRF manager with optional overrides.

    Useful for tests and controlled reconfiguration without restarting the app.

    Args:
        secret_key: Optional override for the CSRF secret key
        token_ttl: Optional override for token TTL in seconds

    Returns:
        The initialized CSRFManager instance.
    """
    global csrf_manager
    csrf_manager = CSRFManager(secret_key=secret_key)
    if token_ttl is not None:
        csrf_manager.token_ttl = int(token_ttl)
    return csrf_manager
