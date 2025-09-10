"""
Consolidated authentication utilities for the JewGo application.

This module provides a unified interface for all authentication-related operations,
consolidating functionality from various auth modules into a single, well-organized
utility module.
"""

import os
import re
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from flask import request, jsonify
from utils.logging_config import get_logger
from utils.error_handler import ValidationError, AuthenticationError

logger = get_logger(__name__)


class AuthUtils:
    """Consolidated authentication utilities."""
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    PASSWORD_REQUIREMENTS = {
        'min_length': MIN_PASSWORD_LENGTH,
        'require_lowercase': True,
        'require_uppercase': True,
        'require_digits': True,
        'require_special_chars': False,  # Optional for better UX
    }
    
    # Account lockout settings
    MAX_FAILED_ATTEMPTS = int(os.getenv('MAX_FAILED_LOGIN_ATTEMPTS', '5'))
    LOCKOUT_DURATION_MINUTES = int(os.getenv('ACCOUNT_LOCKOUT_MINUTES', '15'))
    
    # Token settings
    ACCESS_TOKEN_EXPIRY_HOURS = int(os.getenv('ACCESS_TOKEN_EXPIRY_HOURS', '1'))
    REFRESH_TOKEN_EXPIRY_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRY_DAYS', '7'))
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        Validate email format using a comprehensive regex pattern.
        
        Args:
            email: Email address to validate
            
        Returns:
            True if email is valid, False otherwise
        """
        if not email or not isinstance(email, str):
            return False
        
        # Comprehensive email regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email.strip()))
    
    @staticmethod
    def normalize_email(email: str) -> str:
        """
        Normalize email address for consistent storage and comparison.
        
        Args:
            email: Email address to normalize
            
        Returns:
            Normalized email address
        """
        if not email:
            return ''
        
        # Convert to lowercase and strip whitespace
        normalized = email.lower().strip()
        
        # Remove any extra whitespace
        normalized = re.sub(r'\s+', '', normalized)
        
        return normalized
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength against security requirements.
        
        Args:
            password: Password to validate
            
        Returns:
            Dictionary with validation results and details
        """
        if not password or not isinstance(password, str):
            return {
                'is_valid': False,
                'score': 0,
                'issues': ['Password is required'],
                'suggestions': []
            }
        
        issues = []
        suggestions = []
        score = 0
        
        # Length check
        if len(password) < AuthUtils.MIN_PASSWORD_LENGTH:
            issues.append(f'Password must be at least {AuthUtils.MIN_PASSWORD_LENGTH} characters long')
            suggestions.append('Use a longer password for better security')
        else:
            score += 1
        
        # Character variety checks
        if AuthUtils.PASSWORD_REQUIREMENTS['require_lowercase'] and not re.search(r'[a-z]', password):
            issues.append('Password must contain at least one lowercase letter')
            suggestions.append('Add lowercase letters (a-z)')
        else:
            score += 1
        
        if AuthUtils.PASSWORD_REQUIREMENTS['require_uppercase'] and not re.search(r'[A-Z]', password):
            issues.append('Password must contain at least one uppercase letter')
            suggestions.append('Add uppercase letters (A-Z)')
        else:
            score += 1
        
        if AuthUtils.PASSWORD_REQUIREMENTS['require_digits'] and not re.search(r'\d', password):
            issues.append('Password must contain at least one number')
            suggestions.append('Add numbers (0-9)')
        else:
            score += 1
        
        # Optional special characters
        if AuthUtils.PASSWORD_REQUIREMENTS['require_special_chars'] and not re.search(r'[^a-zA-Z0-9]', password):
            issues.append('Password must contain at least one special character')
            suggestions.append('Add special characters (!@#$%^&*)')
        else:
            score += 1
        
        # Additional length bonus
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        # Determine strength level
        if score <= 2:
            strength = 'weak'
        elif score <= 4:
            strength = 'medium'
        else:
            strength = 'strong'
        
        return {
            'is_valid': len(issues) == 0,
            'score': score,
            'strength': strength,
            'issues': issues,
            'suggestions': suggestions
        }
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure random token.
        
        Args:
            length: Length of the token in bytes
            
        Returns:
            URL-safe base64 encoded token
        """
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_user_id() -> str:
        """
        Generate a unique user ID.
        
        Returns:
            Unique user identifier
        """
        return secrets.token_hex(16)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """
        Hash a token for secure storage.
        
        Args:
            token: Token to hash
            
        Returns:
            SHA-256 hash of the token
        """
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
    
    @staticmethod
    def get_client_ip() -> str:
        """
        Get client IP address from request headers.
        
        Returns:
            Client IP address
        """
        if not request:
            return 'unknown'
        
        # Check for X-Forwarded-For header (common in proxy setups)
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        
        # Check for X-Real-IP header (common in nginx setups)
        if request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        
        # Fall back to remote address
        return request.remote_addr or 'unknown'
    
    @staticmethod
    def get_user_agent() -> str:
        """
        Get user agent string from request.
        
        Returns:
            User agent string
        """
        if not request:
            return 'unknown'
        
        return request.headers.get('User-Agent', 'unknown')
    
    @staticmethod
    def is_account_locked(locked_until: Optional[datetime]) -> bool:
        """
        Check if an account is currently locked.
        
        Args:
            locked_until: Lockout expiry time
            
        Returns:
            True if account is locked, False otherwise
        """
        if not locked_until:
            return False
        
        return datetime.utcnow() < locked_until
    
    @staticmethod
    def calculate_lockout_time() -> datetime:
        """
        Calculate lockout expiry time.
        
        Returns:
            Lockout expiry datetime
        """
        return datetime.utcnow() + timedelta(minutes=AuthUtils.LOCKOUT_DURATION_MINUTES)
    
    @staticmethod
    def should_lock_account(failed_attempts: int) -> bool:
        """
        Check if account should be locked based on failed attempts.
        
        Args:
            failed_attempts: Number of failed login attempts
            
        Returns:
            True if account should be locked, False otherwise
        """
        return failed_attempts >= AuthUtils.MAX_FAILED_ATTEMPTS
    
    @staticmethod
    def sanitize_input(input_str: str, max_length: int = 255) -> str:
        """
        Sanitize user input for security.
        
        Args:
            input_str: Input string to sanitize
            max_length: Maximum allowed length
            
        Returns:
            Sanitized input string
        """
        if not input_str or not isinstance(input_str, str):
            return ''
        
        # Strip whitespace and limit length
        sanitized = input_str.strip()[:max_length]
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\']', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def validate_name(name: str) -> bool:
        """
        Validate user name format.
        
        Args:
            name: Name to validate
            
        Returns:
            True if name is valid, False otherwise
        """
        if not name or not isinstance(name, str):
            return False
        
        # Allow letters, spaces, hyphens, and apostrophes
        pattern = r"^[a-zA-Z\s\-']+$"
        return bool(re.match(pattern, name.strip())) and len(name.strip()) >= 1
    
    @staticmethod
    def format_user_display_name(first_name: str = None, last_name: str = None, 
                                username: str = None, email: str = None) -> str:
        """
        Format user display name from available information.
        
        Args:
            first_name: User's first name
            last_name: User's last name
            username: Username
            email: Email address
            
        Returns:
            Formatted display name
        """
        if first_name and last_name:
            return f"{first_name} {last_name}"
        elif first_name:
            return first_name
        elif last_name:
            return last_name
        elif username:
            return username
        elif email:
            return email.split('@')[0]  # Use email prefix
        else:
            return 'User'
    
    @staticmethod
    def create_audit_log_entry(user_id: str = None, action: str = None, 
                              success: bool = True, details: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a standardized audit log entry.
        
        Args:
            user_id: User ID (optional for anonymous actions)
            action: Action performed
            success: Whether action was successful
            details: Additional details
            
        Returns:
            Audit log entry dictionary
        """
        return {
            'user_id': user_id,
            'action': action,
            'ip_address': AuthUtils.get_client_ip(),
            'user_agent': AuthUtils.get_user_agent(),
            'success': success,
            'details': details or {},
            'timestamp': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def is_development_mode() -> bool:
        """
        Check if application is running in development mode.
        
        Returns:
            True if in development mode, False otherwise
        """
        env = os.getenv('ENVIRONMENT', 'development').lower()
        return env in ['development', 'dev', 'local']
    
    @staticmethod
    def is_production_mode() -> bool:
        """
        Check if application is running in production mode.
        
        Returns:
            True if in production mode, False otherwise
        """
        env = os.getenv('ENVIRONMENT', 'development').lower()
        return env in ['production', 'prod']
    
    @staticmethod
    def get_auth_config() -> Dict[str, Any]:
        """
        Get authentication configuration from environment variables.
        
        Returns:
            Dictionary with auth configuration
        """
        return {
            'max_failed_attempts': AuthUtils.MAX_FAILED_ATTEMPTS,
            'lockout_duration_minutes': AuthUtils.LOCKOUT_DURATION_MINUTES,
            'access_token_expiry_hours': AuthUtils.ACCESS_TOKEN_EXPIRY_HOURS,
            'refresh_token_expiry_days': AuthUtils.REFRESH_TOKEN_EXPIRY_DAYS,
            'password_requirements': AuthUtils.PASSWORD_REQUIREMENTS,
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'recaptcha_enabled': bool(os.getenv('RECAPTCHA_SECRET_KEY')),
            'csrf_enabled': bool(os.getenv('CSRF_SECRET_KEY')),
        }


# Convenience functions for common operations
def validate_email(email: str) -> bool:
    """Convenience function for email validation."""
    return AuthUtils.validate_email(email)


def validate_password(password: str) -> Dict[str, Any]:
    """Convenience function for password validation."""
    return AuthUtils.validate_password_strength(password)


def generate_token(length: int = 32) -> str:
    """Convenience function for token generation."""
    return AuthUtils.generate_secure_token(length)


def get_client_ip() -> str:
    """Convenience function for getting client IP."""
    return AuthUtils.get_client_ip()


def sanitize_input(input_str: str, max_length: int = 255) -> str:
    """Convenience function for input sanitization."""
    return AuthUtils.sanitize_input(input_str, max_length)
