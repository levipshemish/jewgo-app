import functools
import logging
import traceback
from datetime import datetime
from typing import Any, Callable, TypeVar, Union

from flask import Response, g, jsonify
from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Error Handling Utilities for JewGo Backend.
==========================================

Provides standardized error handling, logging, and response formatting
for consistent API error responses across all endpoints.

Author: JewGo Development Team
Version: 2.0
"""

# Type variable for function return types
T = TypeVar("T")


class APIError(Exception):
    """Base class for API errors with standardized error handling."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"ERR_{status_code}"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(APIError):
    """Raised when input validation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, 400, "VALIDATION_ERROR", details)


class NotFoundError(APIError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str, resource_type: str = "Resource") -> None:
        super().__init__(message, 404, "NOT_FOUND", {"resource_type": resource_type})


class DatabaseError(APIError):
    """Raised when database operations fail."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, 500, "DATABASE_ERROR", details)


class ExternalServiceError(APIError):
    """Raised when external service calls fail."""

    def __init__(
        self, message: str, service: str, details: dict[str, Any] | None = None
    ) -> None:
        super().__init__(
            message,
            502,
            "EXTERNAL_SERVICE_ERROR",
            {"service": service, **(details or {})},
        )


def handle_api_error(error: APIError) -> Response:
    """Handle API errors and return standardized JSON response."""
    # Log the error with structured logging
    logger.error(
        "API Error occurred",
        error_code=error.error_code,
        status_code=error.status_code,
        message=error.message,
        details=error.details,
        traceback=traceback.format_exc(),
    )

    # Use consistent API response format
    # Correlation/request ID for supportability
    try:
        request_id = getattr(g, "request_id", None)
    except RuntimeError:
        # Flask application context not available
        request_id = None

    response_data = {
        "success": False,
        "message": error.message,
        "status_code": error.status_code,
        "timestamp": datetime.utcnow().isoformat(),
    }

    # Add error details to meta field for consistency
    if error.details:
        response_data["meta"] = {
            "error_code": error.error_code,
            "error_details": error.details,
            **({"request_id": request_id} if request_id else {}),
        }
    else:
        response_data["meta"] = {
            "error_code": error.error_code,
            **({"request_id": request_id} if request_id else {}),
        }

    return jsonify(response_data), error.status_code


def handle_generic_error(error: Exception) -> Response:
    """Handle generic exceptions and return standardized error response."""
    # Log the error with structured logging
    logger.error(
        "Unexpected error occurred",
        error_type=type(error).__name__,
        message=str(error),
        traceback=traceback.format_exc(),
    )

    # Use consistent API response format
    try:
        request_id = getattr(g, "request_id", None)
    except RuntimeError:
        # Flask application context not available
        request_id = None
    response_data = {
        "success": False,
        "message": "An unexpected error occurred",
        "status_code": 500,
        "timestamp": datetime.utcnow().isoformat(),
        "meta": {
            "error_code": "INTERNAL_SERVER_ERROR",
            **({"request_id": request_id} if request_id else {}),
        },
    }

    # In development, include more details
    try:
        if logger.isEnabledFor(logging.DEBUG):
            response_data["meta"]["error_details"] = {
                "error_type": type(error).__name__,
                "message": str(error),
            }
    except Exception:
        # Fallback if logging level check fails
        pass

    return jsonify(response_data), 500


def validate_required_params(params: dict[str, Any], required_keys: list) -> None:
    """Validate that required parameters are present and not empty."""
    missing_params = []

    for key in required_keys:
        if key not in params or params[key] is None or params[key] == "":
            missing_params.append(key)

    if missing_params:
        msg = f"Missing required parameters: {', '.join(missing_params)}"
        raise ValidationError(
            msg,
            {"missing_parameters": missing_params},
        )


def validate_param_types(
    params: dict[str, Any],
    type_validations: dict[str, type],
) -> None:
    """Validate parameter types."""
    type_errors = []

    for param_name, expected_type in type_validations.items():
        if param_name in params and params[param_name] is not None:
            if not isinstance(params[param_name], expected_type):
                type_errors.append(f"{param_name} must be {expected_type.__name__}")

    if type_errors:
        msg = f"Invalid parameter types: {'; '.join(type_errors)}"
        raise ValidationError(
            msg,
            {"type_errors": type_errors},
        )


def safe_int_conversion(
    value: Any,
    default: int | None = None,
    param_name: str | None = None,
) -> int | None:
    """Safely convert a value to integer with error handling."""
    if value is None:
        return default

    try:
        return int(value)
    except (ValueError, TypeError):
        if param_name:
            msg = f"{param_name} must be a valid integer"
            raise ValidationError(msg)
        return default


def safe_float_conversion(
    value: Any,
    default: float | None = None,
    param_name: str | None = None,
) -> float | None:
    """Safely convert a value to float with error handling."""
    if value is None:
        return default

    try:
        return float(value)
    except (ValueError, TypeError):
        if param_name:
            msg = f"{param_name} must be a valid number"
            raise ValidationError(msg)
        return default


def log_api_request(
    endpoint: str,
    method: str,
    params: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> None:
    """Log API request details for monitoring and debugging."""
    logger.info(
        "API Request",
        endpoint=endpoint,
        method=method,
        params=params,
        user_id=user_id,
    )


def log_api_response(
    endpoint: str,
    method: str,
    status_code: int,
    response_time: float,
    user_id: str | None = None,
) -> None:
    """Log API response details for monitoring and debugging."""
    logger.info(
        "API Response",
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=round(response_time * 1000, 2),
        user_id=user_id,
    )


def register_error_handlers(app) -> None:
    """Register error handlers with Flask app."""
    app.register_error_handler(APIError, handle_api_error)
    app.register_error_handler(Exception, handle_generic_error)

    # Register HTTP error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Bad request",
                    "status_code": 400,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "BAD_REQUEST",
                    },
                },
            ),
            400,
        )

    @app.errorhandler(401)
    def unauthorized(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Unauthorized",
                    "status_code": 401,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "UNAUTHORIZED",
                    },
                },
            ),
            401,
        )

    @app.errorhandler(403)
    def forbidden(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Forbidden",
                    "status_code": 403,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "FORBIDDEN",
                    },
                },
            ),
            403,
        )

    @app.errorhandler(404)
    def not_found(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Resource not found",
                    "status_code": 404,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "NOT_FOUND",
                    },
                },
            ),
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Method not allowed",
                    "status_code": 405,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "METHOD_NOT_ALLOWED",
                    },
                },
            ),
            405,
        )

    @app.errorhandler(500)
    def internal_server_error(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Internal server error",
                    "status_code": 500,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "INTERNAL_SERVER_ERROR",
                    },
                },
            ),
            500,
        )


class ErrorHandler:
    """Flask application error handler for centralized error management."""

    def __init__(self, app) -> None:
        """Initialize error handler with Flask app."""
        self.app = app
        self.register_error_handlers()

    def register_error_handlers(self) -> None:
        """Register error handlers with Flask app."""
        self.app.register_error_handler(APIError, handle_api_error)
        self.app.register_error_handler(Exception, handle_generic_error)

        # Register HTTP error handlers
        self.app.register_error_handler(400, self.bad_request)
        self.app.register_error_handler(401, self.unauthorized)
        self.app.register_error_handler(403, self.forbidden)
        self.app.register_error_handler(404, self.not_found)
        self.app.register_error_handler(405, self.method_not_allowed)
        self.app.register_error_handler(500, self.internal_server_error)

    def bad_request(self, error):
        """Handle 400 Bad Request errors."""
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Bad request",
                    "status_code": 400,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "BAD_REQUEST",
                    },
                },
            ),
            400,
        )

    def unauthorized(self, error):
        """Handle 401 Unauthorized errors."""
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Unauthorized",
                    "status_code": 401,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "UNAUTHORIZED",
                    },
                },
            ),
            401,
        )

    def forbidden(self, error):
        """Handle 403 Forbidden errors."""
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Forbidden",
                    "status_code": 403,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "FORBIDDEN",
                    },
                },
            ),
            403,
        )

    def not_found(self, error):
        """Handle 404 Not Found errors."""
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Resource not found",
                    "status_code": 404,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "NOT_FOUND",
                    },
                },
            ),
            404,
        )

    def method_not_allowed(self, error):
        """Handle 405 Method Not Allowed errors."""
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Method not allowed",
                    "status_code": 405,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "METHOD_NOT_ALLOWED",
                    },
                },
            ),
            405,
        )

    def internal_server_error(self, error):
        """Handle 500 Internal Server Error."""
        logger.error("Internal server error", error=str(error))
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Internal server error",
                    "status_code": 500,
                    "timestamp": datetime.utcnow().isoformat(),
                    "meta": {
                        "error_code": "INTERNAL_SERVER_ERROR",
                    },
                },
            ),
            500,
        )


def handle_database_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for database operations with standardized error handling.

    Provides consistent error handling for database operations including:
    - Connection errors
    - Query execution errors
    - Transaction rollback
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_database_operation
        def get_restaurant_by_id(restaurant_id: int) -> Optional[dict]:
            # Database operation code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "Database operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "Database operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # Re-raise as DatabaseError for consistent handling
            raise DatabaseError(
                f"Database operation failed: {str(e)}",
                details={
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "original_error": str(e),
                },
            )

    return wrapper


def handle_api_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for API operations with standardized error handling.

    Provides consistent error handling for external API calls including:
    - Network timeouts
    - HTTP errors
    - JSON parsing errors
    - Rate limiting
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_api_operation
        def fetch_google_places_data(place_id: str) -> Optional[dict]:
            # API call code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "API operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "API operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # Re-raise as ExternalServiceError for consistent handling
            raise ExternalServiceError(
                f"API operation failed: {str(e)}",
                service=func.__name__,
                details={
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "original_error": str(e),
                },
            )

    return wrapper


def handle_google_places_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for Google Places API operations with specialized error handling.

    Provides consistent error handling for Google Places API calls including:
    - API key validation
    - Rate limiting
    - Quota exceeded errors
    - Place not found errors
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_google_places_operation
        def search_place(name: str, address: str) -> Optional[str]:
            # Google Places API call code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "Google Places operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "Google Places operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # Re-raise as ExternalServiceError for consistent handling
            raise ExternalServiceError(
                f"Google Places operation failed: {str(e)}",
                service="google_places",
                details={
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "original_error": str(e),
                },
            )

    return wrapper


def handle_file_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for file operations with standardized error handling.

    Provides consistent error handling for file operations including:
    - File not found errors
    - Permission errors
    - Disk space errors
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_file_operation
        def read_config_file(file_path: str) -> dict:
            # File operation code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "File operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "File operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # Re-raise as APIError for consistent handling
            raise APIError(
                f"File operation failed: {str(e)}",
                status_code=500,
                error_code="FILE_OPERATION_ERROR",
                details={
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "original_error": str(e),
                },
            )

    return wrapper


def handle_validation_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for validation operations with standardized error handling.

    Provides consistent error handling for data validation including:
    - Input validation errors
    - Schema validation errors
    - Type validation errors
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_validation_operation
        def validate_restaurant_data(data: dict) -> bool:
            # Validation code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "Validation operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "Validation operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # Re-raise as ValidationError for consistent handling
            raise ValidationError(
                f"Validation failed: {str(e)}",
                {
                    "function": func.__name__,
                    "error_type": type(e).__name__,
                    "original_error": str(e),
                },
            )

    return wrapper


def handle_cache_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator for cache operations with standardized error handling.

    Provides consistent error handling for cache operations including:
    - Redis connection errors
    - Cache miss handling
    - Serialization errors
    - Structured logging

    Args:
        func: Function to decorate

    Returns:
        Decorated function with error handling

    Example:
        @handle_cache_operation
        def get_cached_data(key: str) -> Optional[dict]:
            # Cache operation code
            pass
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "Cache operation completed successfully",
                function=func.__name__,
                args=args,
                kwargs=kwargs,
            )
            return result

        except Exception as e:
            # Log the error with context
            logger.error(
                "Cache operation failed",
                function=func.__name__,
                error_type=type(e).__name__,
                error_message=str(e),
                args=args,
                kwargs=kwargs,
                traceback=traceback.format_exc(),
            )

            # For cache operations, we often want to return None instead of raising
            # This allows the application to continue without cache
            logger.warning(
                "Cache operation failed, continuing without cache",
                function=func.__name__,
                error=str(e),
            )
            return None

    return wrapper


def handle_operation_with_fallback(
    fallback_value: Any = None, log_error: bool = True
) -> Callable[[Callable[..., T]], Callable[..., Union[T, Any]]]:
    """Decorator for operations that should return a fallback value on error.

    Provides consistent error handling for operations that should not fail
    the entire request, but instead return a fallback value.

    Args:
        fallback_value: Value to return on error
        log_error: Whether to log the error (default: True)

    Returns:
        Decorator function

    Example:
        @handle_operation_with_fallback(fallback_value={})
        def get_optional_data() -> dict:
            # Operation that might fail
            pass
    """

    def decorator(func: Callable[..., T]) -> Callable[..., Union[T, Any]]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Union[T, Any]:
            try:
                result = func(*args, **kwargs)
                return result

            except Exception as e:
                if log_error:
                    logger.warning(
                        "Operation failed, using fallback value",
                        function=func.__name__,
                        error_type=type(e).__name__,
                        error_message=str(e),
                        fallback_value=fallback_value,
                    )

                return fallback_value

        return wrapper

    return decorator
