#!/usr/bin/env python3
"""Base service class with common functionality and proper error handling."""

import os
import sys
import traceback
from typing import Any, Dict, Optional, Type

import structlog
from utils.logging_config import get_logger

try:
    from utils.error_handler import (
        APIError,
        DatabaseError,
        ExternalServiceError,
        NotFoundError,
        ValidationError,
    )
except ImportError:
    try:
        from ..utils.error_handler import (
            APIError,
            DatabaseError,
            ExternalServiceError,
            NotFoundError,
            ValidationError,
        )
    except ImportError:
        sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
        from utils.error_handler import (
            APIError,
            DatabaseError,
            ExternalServiceError,
            NotFoundError,
            ValidationError,
        )

logger = get_logger(__name__)


class BaseService:
    """Base service class with common utilities and proper error handling."""

    def __init__(self, db_manager=None, config=None, cache_manager=None) -> None:
        """Initialize service with dependencies.

        Args:
            db_manager: Database manager instance
            config: Configuration object
            cache_manager: Cache manager instance
        """
        self.db_manager = db_manager
        self.config = config
        self.cache_manager = cache_manager
        self.logger = logger.bind(service=self.__class__.__name__)

        # Service health tracking
        self._is_healthy = True
        self._last_error = None
        self._error_count = 0

    def validate_required_fields(
        self,
        data: dict[str, Any],
        required_fields: list,
    ) -> None:
        """Validate that required fields are present in data.

        Raises:
            ValidationError: If required fields are missing
        """
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            msg = f"Missing required fields: {', '.join(missing_fields)}"
            raise ValidationError(msg, {"missing_fields": missing_fields})

    def log_operation(self, operation: str, **kwargs) -> None:
        """Log service operation with context."""
        self.logger.info("Service operation", operation=operation, **kwargs)

    def log_error(self, error: Exception, operation: str, **context) -> None:
        """Log service error with full context and stack trace.

        Args:
            error: The exception that occurred
            operation: Name of the operation that failed
            **context: Additional context for the error
        """
        self._error_count += 1
        self._last_error = {
            "error": str(error),
            "operation": operation,
            "timestamp": structlog.processors.TimeStamper(fmt="iso")(None, None, {}),
            "context": context,
        }

        self.logger.error(
            "Service error",
            operation=operation,
            error=str(error),
            error_type=type(error).__name__,
            traceback=traceback.format_exc(),
            **context,
        )

    def handle_external_service_error(
        self, error: Exception, service_name: str, operation: str, **context
    ) -> None:
        """Handle external service errors with proper logging and re-raising.

        Args:
            error: The original exception
            service_name: Name of the external service
            operation: Operation that failed
            **context: Additional context

        Raises:
            ExternalServiceError: Wrapped error with service context
        """
        self.log_error(error, operation, service=service_name, **context)

        # Re-raise as ExternalServiceError for proper API handling
        raise ExternalServiceError(
            f"{service_name} service error: {str(error)}",
            service=service_name,
            details={
                "operation": operation,
                "original_error": str(error),
                **context,
            },
        )

    def handle_database_error(
        self, error: Exception, operation: str, **context
    ) -> None:
        """Handle database errors with proper logging and re-raising.

        Args:
            error: The original exception
            operation: Operation that failed
            **context: Additional context

        Raises:
            DatabaseError: Wrapped error with database context
        """
        self.log_error(error, operation, **context)

        # Re-raise as DatabaseError for proper API handling
        raise DatabaseError(
            f"Database error during {operation}: {str(error)}",
            details={
                "operation": operation,
                "original_error": str(error),
                **context,
            },
        )

    def safe_execute(self, operation: str, func, *args, **kwargs):
        """Safely execute a function with proper error handling and logging.

        Args:
            operation: Name of the operation for logging
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result if successful

        Raises:
            APIError: If the function fails
        """
        try:
            self.log_operation(operation, args=args, kwargs=kwargs)
            result = func(*args, **kwargs)
            self.logger.info("Operation completed", operation=operation)
            return result
        except (ValidationError, NotFoundError, DatabaseError, ExternalServiceError):
            # Re-raise known API errors
            raise
        except Exception as error:
            # Log and wrap unknown errors
            self.log_error(error, operation, args=args, kwargs=kwargs)
            raise APIError(
                f"Unexpected error during {operation}: {str(error)}",
                details={
                    "operation": operation,
                    "error_type": type(error).__name__,
                },
            )

    def get_health_status(self) -> Dict[str, Any]:
        """Get service health status for monitoring.

        Returns:
            Dictionary with health information
        """
        return {
            "service": self.__class__.__name__,
            "healthy": self._is_healthy,
            "error_count": self._error_count,
            "last_error": self._last_error,
            "dependencies": {
                "database": self.db_manager is not None,
                "cache": self.cache_manager is not None,
                "config": self.config is not None,
            },
        }

    def reset_health_status(self) -> None:
        """Reset service health status (useful for testing)."""
        self._is_healthy = True
        self._last_error = None
        self._error_count = 0
