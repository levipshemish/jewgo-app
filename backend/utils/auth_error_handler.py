"""
Comprehensive error handling for authentication system.

This module provides standardized error handling, logging, and user-friendly
error messages for authentication operations.
"""

import os
import traceback
from typing import Dict, Any, Optional, Tuple
from flask import jsonify, request
from utils.logging_config import get_logger
from utils.error_handler import ValidationError, AuthenticationError

logger = get_logger(__name__)


class AuthErrorHandler:
    """Centralized error handling for authentication operations."""
    
    # Error codes for different types of authentication failures
    ERROR_CODES = {
        'INVALID_CREDENTIALS': 'invalid_credentials',
        'ACCOUNT_LOCKED': 'account_locked',
        'ACCOUNT_NOT_VERIFIED': 'account_not_verified',
        'PASSWORD_TOO_WEAK': 'password_too_weak',
        'EMAIL_ALREADY_EXISTS': 'email_already_exists',
        'INVALID_EMAIL_FORMAT': 'invalid_email_format',
        'TOKEN_EXPIRED': 'token_expired',
        'TOKEN_INVALID': 'token_invalid',
        'RATE_LIMIT_EXCEEDED': 'rate_limit_exceeded',
        'CSRF_VALIDATION_FAILED': 'csrf_validation_failed',
        'RECAPTCHA_VALIDATION_FAILED': 'recaptcha_validation_failed',
        'SESSION_EXPIRED': 'session_expired',
        'INSUFFICIENT_PERMISSIONS': 'insufficient_permissions',
        'ACCOUNT_SUSPENDED': 'account_suspended',
        'TWO_FACTOR_REQUIRED': 'two_factor_required',
        'TWO_FACTOR_INVALID': 'two_factor_invalid',
        'PASSWORD_RESET_EXPIRED': 'password_reset_expired',
        'PASSWORD_RESET_INVALID': 'password_reset_invalid',
        'EMAIL_VERIFICATION_EXPIRED': 'email_verification_expired',
        'EMAIL_VERIFICATION_INVALID': 'email_verification_invalid',
        'OAUTH_PROVIDER_ERROR': 'oauth_provider_error',
        'OAUTH_ACCOUNT_LINKED': 'oauth_account_linked',
        'OAUTH_ACCOUNT_NOT_FOUND': 'oauth_account_not_found',
        'GUEST_UPGRADE_FAILED': 'guest_upgrade_failed',
        'INTERNAL_ERROR': 'internal_error',
    }
    
    # User-friendly error messages
    ERROR_MESSAGES = {
        'invalid_credentials': 'Invalid email or password. Please check your credentials and try again.',
        'account_locked': 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
        'account_not_verified': 'Please verify your email address before signing in. Check your inbox for a verification link.',
        'password_too_weak': 'Password does not meet security requirements. Please choose a stronger password.',
        'email_already_exists': 'An account with this email address already exists. Please sign in or use a different email.',
        'invalid_email_format': 'Please enter a valid email address.',
        'token_expired': 'Your session has expired. Please sign in again.',
        'token_invalid': 'Invalid or corrupted authentication token. Please sign in again.',
        'rate_limit_exceeded': 'Too many attempts. Please wait a moment before trying again.',
        'csrf_validation_failed': 'Security validation failed. Please refresh the page and try again.',
        'recaptcha_validation_failed': 'Security verification failed. Please try again.',
        'session_expired': 'Your session has expired. Please sign in again.',
        'insufficient_permissions': 'You do not have permission to perform this action.',
        'account_suspended': 'Your account has been suspended. Please contact support for assistance.',
        'two_factor_required': 'Two-factor authentication is required. Please enter your verification code.',
        'two_factor_invalid': 'Invalid verification code. Please try again.',
        'password_reset_expired': 'Password reset link has expired. Please request a new one.',
        'password_reset_invalid': 'Invalid password reset link. Please request a new one.',
        'email_verification_expired': 'Email verification link has expired. Please request a new one.',
        'email_verification_invalid': 'Invalid email verification link. Please request a new one.',
        'oauth_provider_error': 'Authentication with external provider failed. Please try again.',
        'oauth_account_linked': 'This account is already linked to another user.',
        'oauth_account_not_found': 'No account found with this provider. Please sign up first.',
        'guest_upgrade_failed': 'Failed to upgrade guest account. Please try again or contact support.',
        'internal_error': 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    }
    
    @classmethod
    def handle_auth_error(
        cls,
        error: Exception,
        operation: str = "authentication",
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], int]:
        """
        Handle authentication errors with proper logging and user-friendly responses.
        
        Args:
            error: The exception that occurred
            operation: Description of the operation being performed
            user_id: ID of the user (if known)
            ip_address: Client IP address
            additional_context: Additional context for logging
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Determine error type and code
        error_code, status_code, log_level = cls._classify_error(error)
        
        # Prepare context for logging
        log_context = {
            'operation': operation,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'user_id': user_id,
            'ip_address': ip_address or cls._get_client_ip(),
            'user_agent': request.headers.get('User-Agent') if request else None,
        }
        
        if additional_context:
            log_context.update(additional_context)
        
        # Log the error
        if log_level == 'error':
            logger.error(f"Authentication error in {operation}", extra=log_context)
        elif log_level == 'warning':
            logger.warning(f"Authentication warning in {operation}", extra=log_context)
        else:
            logger.info(f"Authentication info in {operation}", extra=log_context)
        
        # Log stack trace for internal errors
        if error_code == 'internal_error':
            logger.error(f"Stack trace for {operation}: {traceback.format_exc()}")
        
        # Return user-friendly response
        response = {
            'error': cls.ERROR_MESSAGES.get(error_code, 'An unexpected error occurred'),
            'code': error_code,
            'success': False
        }
        
        # Add additional details for certain error types
        if error_code in ['rate_limit_exceeded']:
            response['retry_after'] = cls._get_retry_after()
        elif error_code in ['account_locked']:
            response['unlock_time'] = cls._get_unlock_time()
        
        return response, status_code
    
    @classmethod
    def _classify_error(cls, error: Exception) -> Tuple[str, int, str]:
        """Classify error type and determine appropriate response."""
        error_str = str(error).lower()
        
        # Authentication errors
        if isinstance(error, AuthenticationError):
            if 'invalid' in error_str or 'incorrect' in error_str:
                return cls.ERROR_CODES['INVALID_CREDENTIALS'], 401, 'warning'
            elif 'locked' in error_str or 'blocked' in error_str:
                return cls.ERROR_CODES['ACCOUNT_LOCKED'], 423, 'warning'
            elif 'expired' in error_str:
                return cls.ERROR_CODES['TOKEN_EXPIRED'], 401, 'info'
            elif 'invalid' in error_str and 'token' in error_str:
                return cls.ERROR_CODES['TOKEN_INVALID'], 401, 'warning'
            else:
                return cls.ERROR_CODES['INVALID_CREDENTIALS'], 401, 'warning'
        
        # Validation errors
        elif isinstance(error, ValidationError):
            if 'password' in error_str and ('weak' in error_str or 'requirements' in error_str):
                return cls.ERROR_CODES['PASSWORD_TOO_WEAK'], 400, 'info'
            elif 'email' in error_str and 'format' in error_str:
                return cls.ERROR_CODES['INVALID_EMAIL_FORMAT'], 400, 'info'
            elif 'email' in error_str and 'exists' in error_str:
                return cls.ERROR_CODES['EMAIL_ALREADY_EXISTS'], 409, 'info'
            else:
                return cls.ERROR_CODES['INVALID_EMAIL_FORMAT'], 400, 'info'
        
        # Rate limiting
        elif 'rate limit' in error_str or 'too many' in error_str:
            return cls.ERROR_CODES['RATE_LIMIT_EXCEEDED'], 429, 'warning'
        
        # CSRF errors
        elif 'csrf' in error_str:
            return cls.ERROR_CODES['CSRF_VALIDATION_FAILED'], 403, 'warning'
        
        # reCAPTCHA errors
        elif 'recaptcha' in error_str:
            return cls.ERROR_CODES['RECAPTCHA_VALIDATION_FAILED'], 429, 'warning'
        
        # OAuth errors
        elif 'oauth' in error_str or 'provider' in error_str:
            return cls.ERROR_CODES['OAUTH_PROVIDER_ERROR'], 400, 'warning'
        
        # Default to internal error
        else:
            return cls.ERROR_CODES['INTERNAL_ERROR'], 500, 'error'
    
    @classmethod
    def _get_client_ip(cls) -> Optional[str]:
        """Get client IP address from request headers."""
        if not request:
            return None
        
        # Check for X-Forwarded-For header (common in proxy setups)
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        # Check for X-Real-IP header (common in nginx setups)
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        # Fall back to remote address
        else:
            return request.remote_addr
    
    @classmethod
    def _get_retry_after(cls) -> Optional[int]:
        """Get retry-after time for rate limiting."""
        # This would typically come from rate limiting middleware
        return 60  # Default 1 minute
    
    @classmethod
    def _get_unlock_time(cls) -> Optional[str]:
        """Get account unlock time."""
        # This would typically come from the database
        return None
    
    @classmethod
    def create_error_response(
        cls,
        error_code: str,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], int]:
        """
        Create a standardized error response.
        
        Args:
            error_code: Error code from ERROR_CODES
            message: Custom error message (optional)
            details: Additional error details (optional)
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        response = {
            'error': message or cls.ERROR_MESSAGES.get(error_code, 'An unexpected error occurred'),
            'code': error_code,
            'success': False
        }
        
        if details:
            response['details'] = details
        
        # Determine status code based on error type
        status_code = 500  # Default
        if error_code in ['invalid_credentials', 'token_expired', 'token_invalid']:
            status_code = 401
        elif error_code in ['account_locked', 'account_suspended']:
            status_code = 423
        elif error_code in ['insufficient_permissions']:
            status_code = 403
        elif error_code in ['rate_limit_exceeded']:
            status_code = 429
        elif error_code in ['email_already_exists']:
            status_code = 409
        elif error_code in ['password_too_weak', 'invalid_email_format']:
            status_code = 400
        
        return response, status_code


def handle_auth_exception(error: Exception, operation: str = "authentication") -> Tuple[Dict[str, Any], int]:
    """
    Convenience function for handling authentication exceptions.
    
    Args:
        error: The exception that occurred
        operation: Description of the operation being performed
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    return AuthErrorHandler.handle_auth_error(error, operation)


def create_auth_error_response(error_code: str, message: Optional[str] = None) -> Tuple[Dict[str, Any], int]:
    """
    Convenience function for creating authentication error responses.
    
    Args:
        error_code: Error code from AuthErrorHandler.ERROR_CODES
        message: Custom error message (optional)
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    return AuthErrorHandler.create_error_response(error_code, message)
