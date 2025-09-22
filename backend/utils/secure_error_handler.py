"""
Secure Error Handler
===================

This module provides secure error handling that prevents information disclosure
while maintaining useful debugging information for developers.
"""

import os
import traceback
from typing import Dict, Any, Optional
from flask import request, jsonify, g
from utils.logging_config import get_logger
from utils.error_handler import APIError, DatabaseError, ValidationError

logger = get_logger(__name__)


class SecureErrorHandler:
    """Secure error handler that prevents information disclosure."""
    
    def __init__(self):
        self.environment = os.getenv("FLASK_ENV", "development")
        self.is_production = self.environment == "production"
        self.is_development = self.environment == "development"
        
        # Error codes mapping
        self.error_codes = {
            "validation_error": "VALIDATION_FAILED",
            "authentication_error": "AUTHENTICATION_FAILED",
            "authorization_error": "AUTHORIZATION_FAILED",
            "database_error": "DATABASE_ERROR",
            "network_error": "NETWORK_ERROR",
            "rate_limit_error": "RATE_LIMIT_EXCEEDED",
            "csrf_error": "CSRF_TOKEN_INVALID",
            "session_error": "SESSION_INVALID",
            "token_error": "TOKEN_INVALID",
            "permission_error": "PERMISSION_DENIED",
            "not_found_error": "RESOURCE_NOT_FOUND",
            "conflict_error": "RESOURCE_CONFLICT",
            "server_error": "INTERNAL_SERVER_ERROR"
        }
        
        logger.info("SecureErrorHandler initialized")
    
    def handle_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> tuple:
        """
        Handle an error securely and return appropriate response.
        
        Args:
            error: The exception that occurred
            context: Additional context information
            
        Returns:
            Tuple of (response_data, status_code)
        """
        try:
            # Determine error type and get appropriate response
            error_type = self._classify_error(error)
            response_data, status_code = self._create_error_response(error, error_type, context)
            
            # Log error securely
            self._log_error(error, error_type, context)
            
            return response_data, status_code
            
        except Exception as e:
            # Fallback error handling
            logger.error(f"Error in error handler: {e}")
            return self._create_fallback_response()
    
    def _classify_error(self, error: Exception) -> str:
        """Classify the error type."""
        if isinstance(error, ValidationError):
            return "validation_error"
        elif isinstance(error, DatabaseError):
            return "database_error"
        elif isinstance(error, APIError):
            return "server_error"
        elif "authentication" in str(error).lower():
            return "authentication_error"
        elif "authorization" in str(error).lower() or "permission" in str(error).lower():
            return "authorization_error"
        elif "csrf" in str(error).lower():
            return "csrf_error"
        elif "session" in str(error).lower():
            return "session_error"
        elif "token" in str(error).lower():
            return "token_error"
        elif "rate limit" in str(error).lower():
            return "rate_limit_error"
        elif "not found" in str(error).lower():
            return "not_found_error"
        elif "conflict" in str(error).lower():
            return "conflict_error"
        else:
            return "server_error"
    
    def _create_error_response(self, error: Exception, error_type: str, context: Optional[Dict[str, Any]]) -> tuple:
        """Create appropriate error response based on error type."""
        error_code = self.error_codes.get(error_type, "INTERNAL_SERVER_ERROR")
        
        # Base response structure
        response_data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": self._get_user_friendly_message(error_type),
                "timestamp": self._get_timestamp()
            }
        }
        
        # Add correlation ID if available
        if hasattr(g, 'correlation_id'):
            response_data["error"]["correlation_id"] = g.correlation_id
        
        # Add request ID if available
        if hasattr(g, 'request_id'):
            response_data["error"]["request_id"] = g.request_id
        
        # Determine status code
        status_code = self._get_status_code(error_type)
        
        # Add development-specific information
        if self.is_development:
            response_data["error"]["details"] = {
                "type": type(error).__name__,
                "message": str(error),
                "context": context or {}
            }
            
            # Add stack trace in development
            if hasattr(error, '__traceback__'):
                response_data["error"]["traceback"] = traceback.format_exc()
        
        # Add specific information for certain error types
        if error_type == "validation_error" and isinstance(error, ValidationError):
            response_data["error"]["validation_errors"] = getattr(error, 'validation_errors', [])
        
        elif error_type == "rate_limit_error":
            response_data["error"]["retry_after"] = getattr(error, 'retry_after', 60)
        
        elif error_type == "authentication_error":
            response_data["error"]["auth_required"] = True
        
        return response_data, status_code
    
    def _get_user_friendly_message(self, error_type: str) -> str:
        """Get user-friendly error message."""
        messages = {
            "validation_error": "The provided data is invalid. Please check your input and try again.",
            "authentication_error": "Authentication is required to access this resource.",
            "authorization_error": "You don't have permission to perform this action.",
            "database_error": "A database error occurred. Please try again later.",
            "network_error": "A network error occurred. Please check your connection and try again.",
            "rate_limit_error": "Too many requests. Please wait before trying again.",
            "csrf_error": "Invalid security token. Please refresh the page and try again.",
            "session_error": "Your session has expired. Please log in again.",
            "token_error": "Invalid or expired token. Please log in again.",
            "permission_error": "You don't have permission to access this resource.",
            "not_found_error": "The requested resource was not found.",
            "conflict_error": "The operation conflicts with existing data.",
            "server_error": "An internal server error occurred. Please try again later."
        }
        
        return messages.get(error_type, "An unexpected error occurred.")
    
    def _get_status_code(self, error_type: str) -> int:
        """Get appropriate HTTP status code for error type."""
        status_codes = {
            "validation_error": 400,
            "authentication_error": 401,
            "authorization_error": 403,
            "database_error": 500,
            "network_error": 503,
            "rate_limit_error": 429,
            "csrf_error": 403,
            "session_error": 401,
            "token_error": 401,
            "permission_error": 403,
            "not_found_error": 404,
            "conflict_error": 409,
            "server_error": 500
        }
        
        return status_codes.get(error_type, 500)
    
    def _log_error(self, error: Exception, error_type: str, context: Optional[Dict[str, Any]]):
        """Log error securely without exposing sensitive information."""
        log_data = {
            "error_type": error_type,
            "error_class": type(error).__name__,
            "endpoint": request.endpoint if request else None,
            "method": request.method if request else None,
            "path": request.path if request else None,
            "ip": self._get_client_ip(),
            "user_agent": self._get_user_agent(),
            "correlation_id": getattr(g, 'correlation_id', None),
            "context": self._sanitize_context(context or {})
        }
        
        # Add user information if available
        if hasattr(g, 'user_id'):
            log_data["user_id"] = g.user_id
        
        # Log based on error severity
        if error_type in ["validation_error", "authentication_error", "authorization_error"]:
            logger.warning(f"Client error: {error_type}", extra=log_data)
        elif error_type in ["database_error", "server_error"]:
            logger.error(f"Server error: {error_type}", extra=log_data, exc_info=True)
        else:
            logger.error(f"Error: {error_type}", extra=log_data)
    
    def _sanitize_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize context data to remove sensitive information."""
        sanitized = {}
        sensitive_keys = {
            "password", "token", "secret", "key", "auth", "credential",
            "ssn", "social_security", "credit_card", "cvv", "pin"
        }
        
        for key, value in context.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, str) and len(value) > 100:
                sanitized[key] = value[:100] + "..."
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _get_client_ip(self) -> str:
        """Get client IP address safely."""
        if not request:
            return "unknown"
        
        # Check X-Forwarded-For header
        xff = request.headers.get('X-Forwarded-For')
        if xff:
            return xff.split(',')[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.remote_addr or "unknown"
    
    def _get_user_agent(self) -> str:
        """Get user agent safely."""
        if not request:
            return "unknown"
        
        ua = request.headers.get('User-Agent', 'unknown')
        # Truncate long user agents
        return ua[:200] if len(ua) > 200 else ua
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"
    
    def _create_fallback_response(self) -> tuple:
        """Create fallback response for error handler failures."""
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred.",
                "timestamp": self._get_timestamp()
            }
        }, 500


# Global error handler instance
error_handler = SecureErrorHandler()


def get_error_handler() -> SecureErrorHandler:
    """Get the global error handler instance."""
    return error_handler


def handle_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> tuple:
    """Convenience function to handle errors."""
    return error_handler.handle_error(error, context)