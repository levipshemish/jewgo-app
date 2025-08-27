"""
Error handling utilities for the Flask application.

This module provides specific exception classes and error handling patterns
to replace broad Exception catches throughout the application.
"""

import logging
from typing import Any, Dict, Optional, Union, Callable
from werkzeug.exceptions import HTTPException
from functools import wraps

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base class for API-related errors."""
    
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ValidationError(APIError):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)
        self.field = field


class NotFoundError(APIError):
    """Raised when a requested resource is not found."""
    
    def __init__(self, message: str, resource_type: Optional[str] = None):
        super().__init__(message, status_code=404)
        self.resource_type = resource_type


class DatabaseError(APIError):
    """Raised when database operations fail."""
    
    def __init__(self, message: str, operation: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=503, details=details)
        self.operation = operation


class ExternalServiceError(APIError):
    """Raised when external service calls fail."""
    
    def __init__(self, message: str, service: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=502, details=details)
        self.service = service


class AuthenticationError(APIError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401)


class AuthorizationError(APIError):
    """Raised when authorization fails."""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class RateLimitError(APIError):
    """Raised when rate limits are exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


def handle_api_error(error: APIError) -> tuple[Dict[str, Any], int]:
    """Handle API errors and return standardized response."""
    logger.error(f"API Error: {error.message}", extra={
        'status_code': error.status_code,
        'details': error.details,
        'error_type': error.__class__.__name__
    })
    
    response = {
        'success': False,
        'error': error.message,
        'status_code': error.status_code
    }
    
    if error.details:
        response['details'] = error.details
    
    return response, error.status_code


def handle_validation_error(error: ValidationError) -> tuple[Dict[str, Any], int]:
    """Handle validation errors with field-specific details."""
    logger.warning(f"Validation Error: {error.message}", extra={
        'field': error.field,
        'details': error.details
    })
    
    response = {
        'success': False,
        'error': error.message,
        'status_code': 400,
        'validation_errors': error.details or {}
    }
    
    if error.field:
        response['field'] = error.field
    
    return response, 400


def handle_database_error(error: DatabaseError) -> tuple[Dict[str, Any], int]:
    """Handle database errors with operation context."""
    logger.error(f"Database Error: {error.message}", extra={
        'operation': error.operation,
        'details': error.details
    })
    
    response = {
        'success': False,
        'error': 'Database operation failed',
        'status_code': 503
    }
    
    # Don't expose internal database details in production
    if logger.isEnabledFor(logging.DEBUG):
        response['details'] = error.details
    
    return response, 503


def handle_external_service_error(error: ExternalServiceError) -> tuple[Dict[str, Any], int]:
    """Handle external service errors."""
    logger.error(f"External Service Error: {error.message}", extra={
        'service': error.service,
        'details': error.details
    })
    
    response = {
        'success': False,
        'error': 'External service temporarily unavailable',
        'status_code': 502
    }
    
    # Don't expose external service details in production
    if logger.isEnabledFor(logging.DEBUG):
        response['details'] = error.details
    
    return response, 502


def handle_generic_error(error: Exception) -> tuple[Dict[str, Any], int]:
    """Handle unexpected errors."""
    logger.exception(f"Unexpected error: {str(error)}")
    
    response = {
        'success': False,
        'error': 'Internal server error',
        'status_code': 500
    }
    
    # Only include error details in debug mode
    if logger.isEnabledFor(logging.DEBUG):
        response['debug_info'] = {
            'error_type': error.__class__.__name__,
            'error_message': str(error)
        }
    
    return response, 500


def handle_http_exception(error: HTTPException) -> tuple[Dict[str, Any], int]:
    """Handle Werkzeug HTTP exceptions."""
    logger.warning(f"HTTP Exception: {error.description}", extra={
        'status_code': error.code
    })
    
    response = {
        'success': False,
        'error': error.description,
        'status_code': error.code
    }
    
    return response, error.code


def handle_database_operation(operation_name: str = "database operation"):
    """Decorator to handle database operations with proper error handling."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Database operation failed: {operation_name}", exc_info=True)
                raise DatabaseError(
                    message=f"Database operation failed: {operation_name}",
                    operation=operation_name,
                    details={'original_error': str(e)}
                )
        return wrapper
    return decorator


def handle_cache_operation(operation_name: str = "cache operation"):
    """Decorator to handle cache operations with proper error handling."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Cache operation failed: {operation_name}", exc_info=True)
                raise ExternalServiceError(
                    message=f"Cache operation failed: {operation_name}",
                    service="cache",
                    details={'original_error': str(e)}
                )
        return wrapper
    return decorator


def create_error_response(
    message: str, 
    status_code: int = 500, 
    details: Optional[Dict[str, Any]] = None
) -> tuple[Dict[str, Any], int]:
    """Create a standardized error response."""
    response = {
        'success': False,
        'error': message,
        'status_code': status_code
    }
    
    if details:
        response['details'] = details
    
    return response, status_code


def create_success_response(
    data: Any, 
    message: str = "Success", 
    status_code: int = 200
) -> tuple[Dict[str, Any], int]:
    """Create a standardized success response."""
    response = {
        'success': True,
        'message': message,
        'data': data,
        'status_code': status_code
    }
    
    return response, status_code
