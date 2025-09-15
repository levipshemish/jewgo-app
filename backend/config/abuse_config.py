#!/usr/bin/env python3
"""
Abuse Control Configuration
Configures rate limiting, CAPTCHA, and abuse prevention settings.
"""

import os
from typing import Dict, Any

class AbuseConfig:
    """Configuration for abuse control and rate limiting."""
    
    def __init__(self):
        """Initialize abuse control configuration."""
        
        # Rate limiting settings
        self.max_attempts = int(os.getenv('ABUSE_MAX_ATTEMPTS', '5'))
        self.window_minutes = int(os.getenv('ABUSE_WINDOW_MINUTES', '15'))
        self.backoff_base_minutes = int(os.getenv('ABUSE_BACKOFF_BASE_MINUTES', '5'))
        self.captcha_threshold = int(os.getenv('ABUSE_CAPTCHA_THRESHOLD', '3'))
        
        # CAPTCHA settings
        self.captcha_enabled = os.getenv('CAPTCHA_ENABLED', 'false').lower() == 'true'
        self.turnstile_secret = os.getenv('TURNSTILE_SECRET_KEY')
        self.turnstile_site_key = os.getenv('TURNSTILE_SITE_KEY')
        self.recaptcha_secret = os.getenv('RECAPTCHA_SECRET_KEY')
        self.recaptcha_site_key = os.getenv('RECAPTCHA_SITE_KEY')
        
        # Determine CAPTCHA provider
        if self.turnstile_secret:
            self.captcha_provider = 'turnstile'
            self.captcha_secret = self.turnstile_secret
            self.captcha_site_key = self.turnstile_site_key
        elif self.recaptcha_secret:
            self.captcha_provider = 'recaptcha'
            self.captcha_secret = self.recaptcha_secret
            self.captcha_site_key = self.recaptcha_site_key
        else:
            self.captcha_provider = None
            self.captcha_secret = None
            self.captcha_site_key = None
        
        # Registration CAPTCHA (mandatory)
        self.registration_captcha_enabled = os.getenv('REGISTRATION_CAPTCHA_ENABLED', 'true').lower() == 'true'
        
        # Login CAPTCHA (optional after failed attempts)
        self.login_captcha_enabled = os.getenv('LOGIN_CAPTCHA_ENABLED', 'true').lower() == 'true'
        
        # Email verification settings
        self.email_verification_required = os.getenv('EMAIL_VERIFICATION_REQUIRED', 'true').lower() == 'true'
        
        # Account lockout settings
        self.account_lockout_enabled = os.getenv('ACCOUNT_LOCKOUT_ENABLED', 'true').lower() == 'true'
        self.max_lockout_attempts = int(os.getenv('MAX_LOCKOUT_ATTEMPTS', '10'))
        self.lockout_duration_minutes = int(os.getenv('LOCKOUT_DURATION_MINUTES', '30'))
        
        # IP-based blocking
        self.ip_blocking_enabled = os.getenv('IP_BLOCKING_ENABLED', 'true').lower() == 'true'
        self.max_ip_attempts = int(os.getenv('MAX_IP_ATTEMPTS', '20'))
        self.ip_block_duration_minutes = int(os.getenv('IP_BLOCK_DURATION_MINUTES', '60'))
        
        # Suspicious activity detection
        self.suspicious_activity_enabled = os.getenv('SUSPICIOUS_ACTIVITY_ENABLED', 'true').lower() == 'true'
        self.max_concurrent_sessions = int(os.getenv('MAX_CONCURRENT_SESSIONS', '5'))
        self.geo_location_check = os.getenv('GEO_LOCATION_CHECK', 'false').lower() == 'true'
        
        # Notification settings
        self.admin_notifications_enabled = os.getenv('ADMIN_NOTIFICATIONS_ENABLED', 'true').lower() == 'true'
        self.admin_email = os.getenv('ADMIN_EMAIL')
        self.slack_webhook = os.getenv('SLACK_WEBHOOK')
        
        # Logging settings
        self.abuse_logging_enabled = os.getenv('ABUSE_LOGGING_ENABLED', 'true').lower() == 'true'
        self.log_level = os.getenv('ABUSE_LOG_LEVEL', 'WARNING')
        
        # Development settings
        self.development_mode = os.getenv('NODE_ENV', 'production').lower() == 'development'
        
        # Validate configuration
        self._validate_config()
    
    def _validate_config(self) -> None:
        """Validate configuration settings."""
        errors = []
        
        # Validate numeric settings
        if self.max_attempts <= 0:
            errors.append("ABUSE_MAX_ATTEMPTS must be greater than 0")
        
        if self.window_minutes <= 0:
            errors.append("ABUSE_WINDOW_MINUTES must be greater than 0")
        
        if self.captcha_threshold > self.max_attempts:
            errors.append("ABUSE_CAPTCHA_THRESHOLD cannot be greater than ABUSE_MAX_ATTEMPTS")
        
        # Validate CAPTCHA configuration
        if self.captcha_enabled and not self.captcha_secret:
            errors.append("CAPTCHA is enabled but no secret key is configured")
        
        if self.captcha_enabled and not self.captcha_site_key:
            errors.append("CAPTCHA is enabled but no site key is configured")
        
        # Validate admin notifications
        if self.admin_notifications_enabled and not self.admin_email and not self.slack_webhook:
            errors.append("Admin notifications enabled but no admin email or Slack webhook configured")
        
        if errors:
            raise ValueError(f"Abuse control configuration errors: {'; '.join(errors)}")
    
    def get_rate_limit_config(self) -> Dict[str, Any]:
        """Get rate limiting configuration."""
        return {
            'max_attempts': self.max_attempts,
            'window_minutes': self.window_minutes,
            'backoff_base_minutes': self.backoff_base_minutes,
            'captcha_threshold': self.captcha_threshold
        }
    
    def get_captcha_config(self) -> Dict[str, Any]:
        """Get CAPTCHA configuration."""
        return {
            'enabled': self.captcha_enabled,
            'provider': self.captcha_provider,
            'site_key': self.captcha_site_key,
            'registration_enabled': self.registration_captcha_enabled,
            'login_enabled': self.login_captcha_enabled
        }
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration."""
        return {
            'email_verification_required': self.email_verification_required,
            'account_lockout_enabled': self.account_lockout_enabled,
            'max_lockout_attempts': self.max_lockout_attempts,
            'lockout_duration_minutes': self.lockout_duration_minutes,
            'ip_blocking_enabled': self.ip_blocking_enabled,
            'max_ip_attempts': self.max_ip_attempts,
            'ip_block_duration_minutes': self.ip_block_duration_minutes,
            'suspicious_activity_enabled': self.suspicious_activity_enabled,
            'max_concurrent_sessions': self.max_concurrent_sessions,
            'geo_location_check': self.geo_location_check
        }
    
    def get_notification_config(self) -> Dict[str, Any]:
        """Get notification configuration."""
        return {
            'admin_notifications_enabled': self.admin_notifications_enabled,
            'admin_email': self.admin_email,
            'slack_webhook': bool(self.slack_webhook),
            'abuse_logging_enabled': self.abuse_logging_enabled,
            'log_level': self.log_level
        }
    
    def is_development_mode(self) -> bool:
        """Check if running in development mode."""
        return self.development_mode
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            'rate_limiting': self.get_rate_limit_config(),
            'captcha': self.get_captcha_config(),
            'security': self.get_security_config(),
            'notifications': self.get_notification_config(),
            'development_mode': self.development_mode
        }


# Global configuration instance
abuse_config = AbuseConfig()


def get_abuse_config() -> AbuseConfig:
    """Get the global abuse control configuration."""
    return abuse_config
