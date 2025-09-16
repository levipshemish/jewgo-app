#!/usr/bin/env python3
"""
Abuse Control Service
Provides per-username rate limiting with exponential backoff and CAPTCHA integration.
"""

import time
import hashlib
import os
from typing import Dict, Optional
from dataclasses import dataclass
import redis
import requests
from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class AbuseControlResult:
    """Result of abuse control check."""
    allowed: bool
    requires_captcha: bool
    backoff_seconds: int
    attempts_remaining: int
    message: str
    captcha_site_key: Optional[str] = None


class AbuseControlService:
    """Service for controlling abuse with per-username rate limiting and CAPTCHA."""
    
    def __init__(self, redis_url: str = None):
        """Initialize the abuse control service."""
        try:
            if redis_url:
                self.redis = redis.from_url(redis_url)
            else:
                # Use environment variables
                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", 6379))
                redis_password = os.getenv("REDIS_PASSWORD")
                redis_db = int(os.getenv("REDIS_DB", 0))
                
                self.redis = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    db=redis_db,
                    decode_responses=True
                )
            
            # Test connection
            self.redis.ping()
            self.connected = True
            logger.info("Abuse control service initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis not available for abuse control: {e}")
            self.redis = None
            self.connected = False
        
        # Configuration
        self.max_attempts = int(os.getenv('ABUSE_MAX_ATTEMPTS', '5'))
        self.window_minutes = int(os.getenv('ABUSE_WINDOW_MINUTES', '15'))
        self.backoff_base_minutes = int(os.getenv('ABUSE_BACKOFF_BASE_MINUTES', '5'))
        self.captcha_threshold = int(os.getenv('ABUSE_CAPTCHA_THRESHOLD', '3'))
        
        # CAPTCHA configuration
        self.captcha_enabled = os.getenv('CAPTCHA_ENABLED', 'false').lower() == 'true'
        self.turnstile_secret = os.getenv('TURNSTILE_SECRET_KEY')
        self.turnstile_site_key = os.getenv('TURNSTILE_SITE_KEY')
        self.recaptcha_secret = os.getenv('RECAPTCHA_SECRET_KEY')
        self.recaptcha_site_key = os.getenv('RECAPTCHA_SITE_KEY')
        
        # Use Turnstile by default if configured, fallback to reCAPTCHA
        self.captcha_provider = 'turnstile' if self.turnstile_secret else 'recaptcha'
    
    def _get_user_key(self, username: str) -> str:
        """Generate Redis key for user abuse tracking."""
        # Hash username to avoid exposing usernames in Redis keys
        username_hash = hashlib.sha256(username.lower().encode()).hexdigest()[:16]
        return f"abuse:user:{username_hash}"
    
    def _get_captcha_key(self, username: str) -> str:
        """Generate Redis key for CAPTCHA requirement."""
        username_hash = hashlib.sha256(username.lower().encode()).hexdigest()[:16]
        return f"abuse:captcha:{username_hash}"
    
    def _calculate_backoff(self, attempt_count: int) -> int:
        """Calculate exponential backoff in seconds."""
        if attempt_count <= 1:
            return 0
        
        # Exponential backoff: base_minutes * (2 ^ (attempts - 1))
        backoff_minutes = self.backoff_base_minutes * (2 ** (attempt_count - 2))
        # Cap at 60 minutes (1 hour)
        backoff_minutes = min(backoff_minutes, 60)
        return int(backoff_minutes * 60)
    
    def check_login_abuse(self, username: str, ip_address: str = None) -> AbuseControlResult:
        """
        Check if login attempt is allowed based on abuse control rules.
        
        Args:
            username: Username attempting to log in
            ip_address: IP address of the request
            
        Returns:
            AbuseControlResult with decision and details
        """
        if not self.connected:
            # If Redis is not available, allow all requests
            return AbuseControlResult(
                allowed=True,
                requires_captcha=False,
                backoff_seconds=0,
                attempts_remaining=self.max_attempts,
                message="Abuse control unavailable"
            )
        
        try:
            user_key = self._get_user_key(username)
            captcha_key = self._get_captcha_key(username)
            
            # Get current attempt count
            current_attempts = self.redis.get(user_key)
            if current_attempts is None:
                current_attempts = 0
            else:
                current_attempts = int(current_attempts)
            
            # Check if user is in backoff period
            backoff_seconds = self._calculate_backoff(current_attempts)
            if backoff_seconds > 0:
                # Check if backoff period has expired
                last_attempt = self.redis.get(f"{user_key}:last_attempt")
                if last_attempt:
                    last_attempt_time = float(last_attempt)
                    time_since_attempt = time.time() - last_attempt_time
                    if time_since_attempt < backoff_seconds:
                        remaining_backoff = int(backoff_seconds - time_since_attempt)
                        return AbuseControlResult(
                            allowed=False,
                            requires_captcha=False,
                            backoff_seconds=remaining_backoff,
                            attempts_remaining=0,
                            message=f"Too many failed attempts. Try again in {remaining_backoff // 60 + 1} minutes."
                        )
            
            # Check if CAPTCHA is required
            requires_captcha = self.redis.get(captcha_key) == 'true'
            if requires_captcha:
                captcha_site_key = self.turnstile_site_key or self.recaptcha_site_key
                return AbuseControlResult(
                    allowed=False,
                    requires_captcha=True,
                    backoff_seconds=0,
                    attempts_remaining=max(0, self.max_attempts - current_attempts),
                    message="CAPTCHA verification required",
                    captcha_site_key=captcha_site_key
                )
            
            # Check if max attempts exceeded
            if current_attempts >= self.max_attempts:
                return AbuseControlResult(
                    allowed=False,
                    requires_captcha=False,
                    backoff_seconds=backoff_seconds,
                    attempts_remaining=0,
                    message=f"Maximum attempts exceeded. Try again in {backoff_seconds // 60 + 1} minutes."
                )
            
            # Allow the attempt
            attempts_remaining = max(0, self.max_attempts - current_attempts - 1)
            return AbuseControlResult(
                allowed=True,
                requires_captcha=False,
                backoff_seconds=0,
                attempts_remaining=attempts_remaining,
                message="Login attempt allowed"
            )
            
        except Exception as e:
            logger.error(f"Abuse control check error: {e}")
            # On error, allow the request
            return AbuseControlResult(
                allowed=True,
                requires_captcha=False,
                backoff_seconds=0,
                attempts_remaining=self.max_attempts,
                message="Abuse control error - allowing request"
            )
    
    def record_failed_login(self, username: str, ip_address: str = None) -> None:
        """Record a failed login attempt."""
        if not self.connected:
            return
        
        try:
            user_key = self._get_user_key(username)
            captcha_key = self._get_captcha_key(username)
            
            # Increment attempt count
            current_attempts = self.redis.incr(user_key)
            self.redis.expire(user_key, self.window_minutes * 60)
            
            # Record last attempt time
            self.redis.set(f"{user_key}:last_attempt", time.time(), ex=self.window_minutes * 60)
            
            # Set CAPTCHA requirement if threshold reached
            if current_attempts >= self.captcha_threshold and self.captcha_enabled:
                self.redis.set(captcha_key, 'true', ex=self.window_minutes * 60)
                logger.warning(f"CAPTCHA required for user {username} after {current_attempts} attempts")
            
            # Log abuse attempt
            logger.warning(
                f"Failed login attempt recorded for user {username}",
                username=username,
                ip_address=ip_address,
                attempt_count=current_attempts,
                max_attempts=self.max_attempts
            )
            
        except Exception as e:
            logger.error(f"Failed to record failed login: {e}")
    
    def record_successful_login(self, username: str, ip_address: str = None) -> None:
        """Record a successful login and clear abuse tracking."""
        if not self.connected:
            return
        
        try:
            user_key = self._get_user_key(username)
            captcha_key = self._get_captcha_key(username)
            
            # Clear abuse tracking for successful login
            self.redis.delete(user_key)
            self.redis.delete(f"{user_key}:last_attempt")
            self.redis.delete(captcha_key)
            
            logger.info(f"Successful login for user {username} - abuse tracking cleared")
            
        except Exception as e:
            logger.error(f"Failed to clear abuse tracking: {e}")
    
    def verify_captcha(self, captcha_response: str, ip_address: str = None) -> bool:
        """
        Verify CAPTCHA response.
        
        Args:
            captcha_response: CAPTCHA response token
            ip_address: IP address of the request
            
        Returns:
            True if CAPTCHA is valid, False otherwise
        """
        if not self.captcha_enabled:
            return True
        
        if not captcha_response:
            return False
        
        try:
            if self.captcha_provider == 'turnstile':
                return self._verify_turnstile(captcha_response, ip_address)
            else:
                return self._verify_recaptcha(captcha_response, ip_address)
                
        except Exception as e:
            logger.error(f"CAPTCHA verification error: {e}")
            return False
    
    def _verify_turnstile(self, captcha_response: str, ip_address: str = None) -> bool:
        """Verify Turnstile CAPTCHA response."""
        if not self.turnstile_secret:
            logger.warning("Turnstile secret not configured")
            return False
        
        try:
            data = {
                'secret': self.turnstile_secret,
                'response': captcha_response,
                'remoteip': ip_address
            }
            
            response = requests.post(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                data=data,
                timeout=10
            )
            
            result = response.json()
            
            if result.get('success'):
                logger.info("Turnstile CAPTCHA verification successful")
                return True
            else:
                logger.warning(f"Turnstile CAPTCHA verification failed: {result.get('error-codes', [])}")
                return False
                
        except Exception as e:
            logger.error(f"Turnstile verification error: {e}")
            return False
    
    def _verify_recaptcha(self, captcha_response: str, ip_address: str = None) -> bool:
        """Verify reCAPTCHA response."""
        if not self.recaptcha_secret:
            logger.warning("reCAPTCHA secret not configured")
            return False
        
        try:
            data = {
                'secret': self.recaptcha_secret,
                'response': captcha_response,
                'remoteip': ip_address
            }
            
            response = requests.post(
                'https://www.google.com/recaptcha/api/siteverify',
                data=data,
                timeout=10
            )
            
            result = response.json()
            
            if result.get('success'):
                logger.info("reCAPTCHA verification successful")
                return True
            else:
                logger.warning(f"reCAPTCHA verification failed: {result.get('error-codes', [])}")
                return False
                
        except Exception as e:
            logger.error(f"reCAPTCHA verification error: {e}")
            return False
    
    def clear_captcha_requirement(self, username: str) -> None:
        """Clear CAPTCHA requirement for a user."""
        if not self.connected:
            return
        
        try:
            captcha_key = self._get_captcha_key(username)
            self.redis.delete(captcha_key)
            logger.info(f"CAPTCHA requirement cleared for user {username}")
            
        except Exception as e:
            logger.error(f"Failed to clear CAPTCHA requirement: {e}")
    
    def get_abuse_stats(self) -> Dict[str, any]:
        """Get abuse control statistics."""
        if not self.connected:
            return {
                'redis_connected': False,
                'captcha_enabled': self.captcha_enabled,
                'captcha_provider': self.captcha_provider
            }
        
        try:
            # Get all abuse keys
            abuse_keys = self.redis.keys('abuse:user:*')
            captcha_keys = self.redis.keys('abuse:captcha:*')
            
            return {
                'redis_connected': True,
                'captcha_enabled': self.captcha_enabled,
                'captcha_provider': self.captcha_provider,
                'active_abuse_tracking': len(abuse_keys),
                'captcha_required_users': len(captcha_keys),
                'max_attempts': self.max_attempts,
                'window_minutes': self.window_minutes,
                'captcha_threshold': self.captcha_threshold
            }
            
        except Exception as e:
            logger.error(f"Failed to get abuse stats: {e}")
            return {
                'redis_connected': False,
                'error': str(e)
            }


# Global abuse control service instance
abuse_control = AbuseControlService()
