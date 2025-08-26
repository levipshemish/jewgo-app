"""
Enhanced Error Handling Utility v2

This module provides standardized error handling patterns to replace broad
exception handling with specific exception types and proper logging.
"""

import logging
import traceback
from typing import Any, Callable, Dict, Optional, Type, TypeVar, Union

from sqlalchemy.exc import (
    DatabaseError,
    IntegrityError,
    OperationalError,
    SQLAlchemyError,
)
from requests.exceptions import (
    ConnectionError,
    HTTPError,
    RequestException,
    Timeout,
    TooManyRedirects,
)

logger = logging.getLogger(__name__)

# Type variable for return type
T = TypeVar('T')

# Custom exception types
class ServiceError(Exception):
    """Base exception for service layer errors."""
    pass

class DatabaseServiceError(ServiceError):
    """Database-related service errors."""
    pass

class ExternalAPIError(ServiceError):
    """External API call errors."""
    pass

class ValidationServiceError(ServiceError):
    """Validation-related service errors."""
    pass

class ConfigurationError(ServiceError):
    """Configuration-related errors."""
    pass


def handle_database_operation(
    operation: Callable[[], T],
    operation_name: str,
    context: Optional[Dict[str, Any]] = None,
    default_return: Optional[T] = None,
    log_level: int = logging.ERROR,
) -> Optional[T]:
    """
    Handle database operations with specific exception handling.
    
    Args:
        operation: Database operation function
        operation_name: Name of the operation for logging
        context: Additional context for logging
        default_return: Value to return on error (if None, raises exception)
        log_level: Logging level for errors
        
    Returns:
        Result of operation or default_return on error
        
    Raises:
        DatabaseServiceError: If database operation fails and default_return is None
    """
    try:
        return operation()
    except IntegrityError as e:
        error_msg = f"Database integrity error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise DatabaseServiceError(error_msg) from e
    except OperationalError as e:
        error_msg = f"Database operational error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise DatabaseServiceError(error_msg) from e
    except DatabaseError as e:
        error_msg = f"Database error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise DatabaseServiceError(error_msg) from e
    except SQLAlchemyError as e:
        error_msg = f"SQLAlchemy error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise DatabaseServiceError(error_msg) from e
    except Exception as e:
        error_msg = f"Unexpected error in database operation {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {}, exc_info=True)
        if default_return is not None:
            return default_return
        raise DatabaseServiceError(error_msg) from e


def handle_external_api_call(
    operation: Callable[[], T],
    operation_name: str,
    context: Optional[Dict[str, Any]] = None,
    default_return: Optional[T] = None,
    log_level: int = logging.ERROR,
) -> Optional[T]:
    """
    Handle external API calls with specific exception handling.
    
    Args:
        operation: API call function
        operation_name: Name of the operation for logging
        context: Additional context for logging
        default_return: Value to return on error (if None, raises exception)
        log_level: Logging level for errors
        
    Returns:
        Result of operation or default_return on error
        
    Raises:
        ExternalAPIError: If API call fails and default_return is None
    """
    try:
        return operation()
    except Timeout as e:
        error_msg = f"API timeout in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e
    except ConnectionError as e:
        error_msg = f"API connection error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e
    except HTTPError as e:
        error_msg = f"API HTTP error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e
    except TooManyRedirects as e:
        error_msg = f"API redirect error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e
    except RequestException as e:
        error_msg = f"API request error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e
    except Exception as e:
        error_msg = f"Unexpected error in API call {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {}, exc_info=True)
        if default_return is not None:
            return default_return
        raise ExternalAPIError(error_msg) from e


def handle_validation_operation(
    operation: Callable[[], T],
    operation_name: str,
    context: Optional[Dict[str, Any]] = None,
    default_return: Optional[T] = None,
    log_level: int = logging.ERROR,
) -> Optional[T]:
    """
    Handle validation operations with specific exception handling.
    
    Args:
        operation: Validation operation function
        operation_name: Name of the operation for logging
        context: Additional context for logging
        default_return: Value to return on error (if None, raises exception)
        log_level: Logging level for errors
        
    Returns:
        Result of operation or default_return on error
        
    Raises:
        ValidationServiceError: If validation fails and default_return is None
    """
    try:
        return operation()
    except ValueError as e:
        error_msg = f"Validation error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ValidationServiceError(error_msg) from e
    except TypeError as e:
        error_msg = f"Type error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {})
        if default_return is not None:
            return default_return
        raise ValidationServiceError(error_msg) from e
    except Exception as e:
        error_msg = f"Unexpected error in validation {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {}, exc_info=True)
        if default_return is not None:
            return default_return
        raise ValidationServiceError(error_msg) from e


def safe_execute(
    operation: Callable[[], T],
    operation_name: str,
    context: Optional[Dict[str, Any]] = None,
    default_return: Optional[T] = None,
    log_level: int = logging.ERROR,
    exception_types: Optional[tuple] = None,
) -> Optional[T]:
    """
    Generic safe execution wrapper with configurable exception handling.
    
    Args:
        operation: Function to execute
        operation_name: Name of the operation for logging
        context: Additional context for logging
        default_return: Value to return on error (if None, raises exception)
        log_level: Logging level for errors
        exception_types: Tuple of exception types to catch specifically
        
    Returns:
        Result of operation or default_return on error
        
    Raises:
        ServiceError: If operation fails and default_return is None
    """
    try:
        return operation()
    except exception_types or (Exception,) as e:
        error_msg = f"Error in {operation_name}: {e}"
        logger.log(log_level, error_msg, extra=context or {}, exc_info=True)
        if default_return is not None:
            return default_return
        raise ServiceError(error_msg) from e


def log_and_raise(
    exception: Exception,
    operation_name: str,
    context: Optional[Dict[str, Any]] = None,
    log_level: int = logging.ERROR,
) -> None:
    """
    Log an exception and re-raise it with context.
    
    Args:
        exception: Exception to log and raise
        operation_name: Name of the operation for logging
        context: Additional context for logging
        log_level: Logging level for errors
    """
    error_msg = f"Error in {operation_name}: {exception}"
    logger.log(log_level, error_msg, extra=context or {}, exc_info=True)
    raise exception


def create_error_context(**kwargs) -> Dict[str, Any]:
    """
    Create a standardized error context dictionary.
    
    Args:
        **kwargs: Context key-value pairs
        
    Returns:
        Dictionary with error context
    """
    return {
        "timestamp": logging.Formatter().formatTime(logging.LogRecord("", 0, "", 0, "", (), None)),
        **kwargs
    }
