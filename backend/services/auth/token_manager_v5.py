"""
TokenManagerV5 - Enhanced JWT token management with leeway support.

This module provides enhanced JWT token management with configurable leeway
for clock skew tolerance, JTI tracking for revocation, and performance optimizations.
"""

import os
import jwt
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, List
from utils.logging_config import get_logger

logger = get_logger(__name__)


class TokenManagerV5:
    """Enhanced JWT token manager with leeway support and JTI tracking."""
    
    def __init__(self, leeway: int = 60):
        """
        Initialize TokenManagerV5.
        
        Args:
            leeway: Clock skew tolerance in seconds (default: 60)
        """
        self.secret = self._get_secret()
        self.algorithm = 'HS256'  # Will be upgraded to RS256/ES256 in task 3.3
        self.leeway = leeway
        self.default_access_ttl = int(os.getenv('ACCESS_TTL_SECONDS', '3600'))  # 1 hour
        self.default_refresh_ttl = int(os.getenv('REFRESH_TTL_SECONDS', '2592000'))  # 30 days
        
        logger.info(f"TokenManagerV5 initialized with {leeway}s leeway")
    
    def _get_secret(self) -> str:
        """Get JWT secret from environment."""
        secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
        if not secret:
            raise RuntimeError("JWT_SECRET_KEY environment variable is required")
        return secret
    
    def _now_utc(self) -> datetime:
        """Get current UTC datetime."""
        return datetime.now(timezone.utc)
    
    def verify_token(self, token: str, leeway: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token with configurable leeway.
        
        Args:
            token: JWT token to verify
            leeway: Override default leeway (optional)
            
        Returns:
            Token payload if valid, None otherwise
        """
        start_time = time.perf_counter()
        
        try:
            effective_leeway = leeway if leeway is not None else self.leeway
            
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                leeway=timedelta(seconds=effective_leeway),
                options={
                    'verify_signature': True,
                    'verify_exp': True,
                    'verify_iat': True,
                    'require_exp': True,
                    'require_iat': True
                }
            )
            
            # Validate required fields
            if not payload.get('jti'):
                logger.warning("Token missing JTI")
                return None
            
            if not payload.get('type'):
                logger.warning("Token missing type")
                return None
            
            # Log performance metrics
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.debug(f"Token verification took {duration_ms:.2f}ms")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.debug("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None
    
    def mint_access_token(self, user_id: str, email: str, roles: Optional[List[Dict[str, Any]]] = None, 
                         ttl: Optional[int] = None, auth_time: Optional[datetime] = None) -> Tuple[str, int]:
        """
        Mint access token with JTI and enhanced claims.
        
        Args:
            user_id: User ID
            email: User email
            roles: User roles (optional)
            ttl: Token TTL in seconds (optional, uses default if not provided)
            auth_time: Authentication time for step-up auth (optional)
            
        Returns:
            Tuple of (token, ttl_seconds)
        """
        try:
            effective_ttl = ttl or self.default_access_ttl
            now = self._now_utc()
            exp_time = now + timedelta(seconds=effective_ttl)
            
            payload = {
                'type': 'access',
                'uid': user_id,
                'email': email,
                'iat': int(now.timestamp()),
                'exp': int(exp_time.timestamp()),
                'jti': secrets.token_hex(16),  # JWT ID for tracking
                'iss': os.getenv('JWT_ISSUER', 'jewgo.app'),
                'aud': os.getenv('JWT_AUDIENCE', 'jewgo.app')
            }
            
            # Add roles if provided
            if roles:
                payload['roles'] = roles
            
            # Add auth_time for step-up authentication
            if auth_time:
                payload['auth_time'] = int(auth_time.timestamp())
            
            token = jwt.encode(payload, self.secret, algorithm=self.algorithm)
            
            logger.debug(f"Access token minted for user {user_id} with JTI {payload['jti']}")
            return token, effective_ttl
            
        except Exception as e:
            logger.error(f"Access token minting error: {e}")
            raise
    
    def mint_refresh_token(self, user_id: str, session_id: str, family_id: str, 
                          ttl: Optional[int] = None) -> Tuple[str, int]:
        """
        Mint refresh token with session binding.
        
        Args:
            user_id: User ID
            session_id: Session ID
            family_id: Session family ID for rotation tracking
            ttl: Token TTL in seconds (optional)
            
        Returns:
            Tuple of (token, ttl_seconds)
        """
        try:
            effective_ttl = ttl or self.default_refresh_ttl
            now = self._now_utc()
            exp_time = now + timedelta(seconds=effective_ttl)
            
            payload = {
                'type': 'refresh',
                'uid': user_id,
                'sid': session_id,
                'fid': family_id,
                'iat': int(now.timestamp()),
                'exp': int(exp_time.timestamp()),
                'jti': secrets.token_hex(16),
                'iss': os.getenv('JWT_ISSUER', 'jewgo.app'),
                'aud': os.getenv('JWT_AUDIENCE', 'jewgo.app')
            }
            
            token = jwt.encode(payload, self.secret, algorithm=self.algorithm)
            
            logger.debug(f"Refresh token minted for user {user_id} with JTI {payload['jti']}")
            return token, effective_ttl
            
        except Exception as e:
            logger.error(f"Refresh token minting error: {e}")
            raise
    
    def extract_jti(self, token: str) -> Optional[str]:
        """
        Extract JTI from token without full verification.
        
        Args:
            token: JWT token
            
        Returns:
            JTI if present, None otherwise
        """
        try:
            # Decode without verification to extract JTI
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False}
            )
            return payload.get('jti')
        except Exception:
            return None
    
    def extract_user_id(self, token: str) -> Optional[str]:
        """
        Extract user ID from token without full verification.
        
        Args:
            token: JWT token
            
        Returns:
            User ID if present, None otherwise
        """
        try:
            # Decode without verification to extract user ID
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False}
            )
            return payload.get('uid')
        except Exception:
            return None
    
    def is_token_expired(self, token: str, leeway: Optional[int] = None) -> bool:
        """
        Check if token is expired considering leeway.
        
        Args:
            token: JWT token
            leeway: Override default leeway (optional)
            
        Returns:
            True if expired, False otherwise
        """
        try:
            effective_leeway = leeway if leeway is not None else self.leeway
            
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            
            exp = payload.get('exp')
            if not exp:
                return True
            
            now = datetime.now(timezone.utc)
            exp_time = datetime.fromtimestamp(exp, timezone.utc)
            
            # Apply leeway
            return now > (exp_time + timedelta(seconds=effective_leeway))
            
        except Exception:
            return True
    
    def get_token_claims(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Get token claims without verification (for debugging/logging).
        
        Args:
            token: JWT token
            
        Returns:
            Token claims if decodable, None otherwise
        """
        try:
            return jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False}
            )
        except Exception:
            return None
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check for token manager.
        
        Returns:
            Health status dictionary
        """
        try:
            # Test token creation and verification
            test_user_id = "health_check_user"
            test_email = "health@check.com"
            
            # Mint test token
            token, ttl = self.mint_access_token(test_user_id, test_email)
            
            # Verify test token
            payload = self.verify_token(token)
            
            is_healthy = (
                payload is not None and
                payload.get('uid') == test_user_id and
                payload.get('email') == test_email and
                payload.get('jti') is not None
            )
            
            return {
                'status': 'healthy' if is_healthy else 'unhealthy',
                'secret_configured': bool(self.secret),
                'algorithm': self.algorithm,
                'leeway_seconds': self.leeway,
                'default_access_ttl': self.default_access_ttl,
                'default_refresh_ttl': self.default_refresh_ttl,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"TokenManagerV5 health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }