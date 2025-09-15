"""
CSRF Protection Manager for JewGo Authentication System

Provides HMAC-based CSRF token generation and validation with timing attack protection.
Implements environment-aware cookie configuration for production, preview, and development.
"""

import hmac
import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os
from flask import request
from utils.logging_config import get_logger

logger = get_logger(__name__)


class CSRFManager:
    """
    CSRF Protection Manager with HMAC-based token generation.
    
    Features:
    - HMAC-based token generation using session_id, user_agent, and day bucket
    - Timing attack protection using constant-time comparison
    - Environment-aware cookie configuration
    - Day bucket rotation for token validity
    """
    
    def __init__(self, secret_key: str):
        """
        Initialize CSRF Manager.
        
        Args:
            secret_key: Secret key for HMAC generation
        """
        if not secret_key:
            raise ValueError("CSRF secret key is required")
        
        self.secret_key = secret_key.encode('utf-8')
        self.token_ttl = 24 * 60 * 60  # 24 hours in seconds
        
        logger.info("CSRFManager initialized")
    
    def generate_token(self, session_id: str, user_agent: str = None) -> str:
        """
        Generate HMAC-based CSRF token with day bucket.
        
        Args:
            session_id: Session identifier
            user_agent: User agent string (optional)
            
        Returns:
            Base64-encoded CSRF token
        """
        try:
            # Get current day bucket (YYYY-MM-DD format)
            day_bucket = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            
            # Use provided user_agent or get from request
            if user_agent is None:
                user_agent = request.headers.get('User-Agent', '') if request else ''
            
            # Create user agent hash for privacy
            user_agent_hash = hashlib.sha256(user_agent.encode('utf-8')).hexdigest()[:16]
            
            # Create token payload
            token_data = f"{session_id}:{user_agent_hash}:{day_bucket}"
            
            # Generate HMAC signature
            signature = hmac.new(
                self.secret_key,
                token_data.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Combine token data and signature
            full_token = f"{token_data}:{signature}"
            
            # Base64 encode for safe transport
            import base64
            encoded_token = base64.b64encode(full_token.encode('utf-8')).decode('utf-8')
            
            logger.debug(f"CSRF token generated for session {session_id[:8]}...")
            return encoded_token
            
        except Exception as e:
            logger.error(f"CSRF token generation error: {e}")
            raise
    
    def validate_token(self, token: str, session_id: str, user_agent: str = None) -> bool:
        """
        Validate CSRF token with timing attack protection.
        
        Args:
            token: Base64-encoded CSRF token
            session_id: Session identifier
            user_agent: User agent string (optional)
            
        Returns:
            True if token is valid, False otherwise
        """
        try:
            if not token or not session_id:
                return False
            
            # Decode token
            import base64
            try:
                decoded_token = base64.b64decode(token.encode('utf-8')).decode('utf-8')
            except Exception:
                logger.warning("Invalid CSRF token encoding")
                return False
            
            # Parse token components
            token_parts = decoded_token.split(':')
            if len(token_parts) < 4:
                logger.warning("Invalid CSRF token format")
                return False
            
            # Handle case where session_id might contain colons (e.g., "anon:127.0.0.1")
            if len(token_parts) == 4:
                token_session_id, token_user_agent_hash, token_day_bucket, token_signature = token_parts
            else:
                # Reconstruct session_id from multiple parts
                token_signature = token_parts[-1]
                token_day_bucket = token_parts[-2]
                token_user_agent_hash = token_parts[-3]
                token_session_id = ':'.join(token_parts[:-3])
            
            # Use provided user_agent or get from request
            if user_agent is None:
                user_agent = request.headers.get('User-Agent', '') if request else ''
            
            # Create user agent hash
            user_agent_hash = hashlib.sha256(user_agent.encode('utf-8')).hexdigest()[:16]
            
            # Validate session ID match
            if not self._constant_time_compare(token_session_id, session_id):
                logger.warning("CSRF token session ID mismatch")
                return False
            
            # Validate user agent hash match
            if not self._constant_time_compare(token_user_agent_hash, user_agent_hash):
                logger.warning("CSRF token user agent mismatch")
                return False
            
            # Validate day bucket (current day or previous day for clock skew)
            current_day = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            previous_day = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
            
            if token_day_bucket not in [current_day, previous_day]:
                logger.warning(f"CSRF token expired: {token_day_bucket}")
                return False
            
            # Validate HMAC signature
            expected_token_data = f"{token_session_id}:{token_user_agent_hash}:{token_day_bucket}"
            expected_signature = hmac.new(
                self.secret_key,
                expected_token_data.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not self._constant_time_compare(token_signature, expected_signature):
                logger.warning("CSRF token signature invalid")
                return False
            
            logger.debug(f"CSRF token validated for session {session_id[:8]}...")
            return True
            
        except Exception as e:
            logger.error(f"CSRF token validation error: {e}")
            return False
    
    def get_csrf_cookie_config(self) -> Dict[str, Any]:
        """
        Get environment-aware cookie configuration for CSRF tokens.
        
        Returns:
            Dictionary with cookie configuration
        """
        environment = os.getenv('ENVIRONMENT', 'development').lower()
        
        if environment == 'production':
            return {
                'secure': True,
                'httponly': False,  # CSRF tokens need to be accessible to JavaScript
                'samesite': 'None',
                'domain': '.jewgo.app',
                'max_age': self.token_ttl,
                'path': '/'
            }
        elif environment in ['preview', 'staging']:
            return {
                'secure': True,  # HTTPS required for Vercel
                'httponly': False,
                'samesite': 'None',
                'domain': None,  # Host-only cookies for *.vercel.app
                'max_age': self.token_ttl,
                'path': '/'
            }
        else:  # development
            return {
                'secure': False,  # Allow HTTP for local development
                'httponly': False,
                'samesite': 'Lax',
                'domain': None,
                'max_age': self.token_ttl,
                'path': '/'
            }
    
    def _constant_time_compare(self, a: str, b: str) -> bool:
        """
        Constant-time string comparison to prevent timing attacks.
        
        Args:
            a: First string
            b: Second string
            
        Returns:
            True if strings are equal, False otherwise
        """
        if len(a) != len(b):
            return False
        
        result = 0
        for x, y in zip(a, b):
            result |= ord(x) ^ ord(y)
        
        return result == 0


# Global CSRF manager instance
_csrf_manager = None


def get_csrf_manager() -> CSRFManager:
    """
    Get global CSRF manager instance.
    
    Returns:
        CSRFManager instance
    """
    global _csrf_manager
    
    if _csrf_manager is None:
        secret_key = os.getenv('CSRF_SECRET_KEY') or os.getenv('SECRET_KEY')
        if not secret_key:
            raise ValueError("CSRF_SECRET_KEY or SECRET_KEY environment variable is required")
        
        _csrf_manager = CSRFManager(secret_key)
    
    return _csrf_manager


def init_csrf_manager(secret_key: str) -> CSRFManager:
    """
    Initialize global CSRF manager with custom secret key.
    
    Args:
        secret_key: Secret key for HMAC generation
        
    Returns:
        CSRFManager instance
    """
    global _csrf_manager
    _csrf_manager = CSRFManager(secret_key)
    return _csrf_manager