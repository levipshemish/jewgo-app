#!/usr/bin/env python3
"""Unified Logging Configuration Module.
====================================

This module provides a centralized logging configuration for the entire JewGo backend.
It eliminates the need for duplicated structlog.configure calls across multiple files
and provides consistent logging behavior throughout the application.

Features:
- Unified structlog configuration
- Environment-aware logging levels
- Request context integration
- Performance monitoring
- Error tracking
- Structured logging with JSON output

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
from contextlib import contextmanager
from typing import Optional

import structlog
from structlog.processors import (
    CallsiteParameter,
    CallsiteParameterAdder,
    JSONRenderer,
    StackInfoRenderer,
    TimeStamper,
    UnicodeDecoder,
    format_exc_info,
)
from structlog.stdlib import BoundLogger, LoggerFactory

# Global logger instance
_logger: Optional[BoundLogger] = None


class LoggingConfig:
    """Centralized logging configuration manager."""

    _configured = False

    @classmethod
    def configure(
        cls,
        environment: Optional[str] = None,
        log_level: Optional[str] = None,
        include_callsite: bool = True,
        include_contextvars: bool = True,
    ) -> None:
        """
        Configure structured logging for the application.

        Args:
            environment: Environment name (dev, staging, prod)
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            include_callsite: Whether to include callsite information
            include_contextvars: Whether to include context variables
        """
        if cls._configured:
            return

        # Determine environment and log level
        env = environment or os.getenv("FLASK_ENV", "development")
        level = log_level or os.getenv(
            "LOG_LEVEL", "INFO" if env == "production" else "DEBUG"
        )

        # Base processors
        processors = [
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
        ]

        # Add context variables if available and enabled
        if include_contextvars:
            try:
                # Merge contextvars (e.g., request_id) bound during the request lifecycle
                if hasattr(structlog, "contextvars"):
                    processors.append(structlog.contextvars.merge_contextvars)
                else:
                    # Fallback for older structlog versions
                    processors.append(lambda logger, name, event_dict: event_dict)
            except ImportError:
                # contextvars not available
                pass

        # Add timestamp
        processors.append(TimeStamper(fmt="iso"))

        # Add callsite information if enabled
        if include_callsite:
            processors.append(
                CallsiteParameterAdder(
                    parameters=[
                        CallsiteParameter.PATHNAME,
                        CallsiteParameter.LINENO,
                        CallsiteParameter.FUNC_NAME,
                    ]
                )
            )

        # Add stack info and exception formatting
        processors.extend(
            [
                StackInfoRenderer(),
                format_exc_info,
                UnicodeDecoder(),
                JSONRenderer(),
            ]
        )

        # Configure structlog
        structlog.configure(
            processors=processors,
            context_class=dict,
            logger_factory=LoggerFactory(),
            wrapper_class=BoundLogger,
            cache_logger_on_first_use=True,
        )

        cls._configured = True

        # Log configuration completion
        logger = structlog.get_logger()
        logger.info(
            "Logging configuration completed",
            environment=env,
            log_level=level,
            include_callsite=include_callsite,
            include_contextvars=include_contextvars,
        )

    @classmethod
    def get_logger(cls, name: Optional[str] = None) -> BoundLogger:
        """
        Get a configured logger instance.

        Args:
            name: Logger name (optional)

        Returns:
            Configured structlog logger
        """
        if not cls._configured:
            cls.configure()

        return structlog.get_logger(name)

    @classmethod
    def configure_for_development(cls) -> None:
        """Configure logging for development environment."""
        cls.configure(
            environment="development",
            log_level="DEBUG",
            include_callsite=True,
            include_contextvars=True,
        )

    @classmethod
    def configure_for_production(cls) -> None:
        """Configure logging for production environment."""
        cls.configure(
            environment="production",
            log_level="INFO",
            include_callsite=False,  # Reduce overhead in production
            include_contextvars=True,
        )

    @classmethod
    def configure_for_testing(cls) -> None:
        """Configure logging for testing environment."""
        cls.configure(
            environment="testing",
            log_level="WARNING",  # Reduce noise during tests
            include_callsite=False,
            include_contextvars=False,
        )

    @classmethod
    @contextmanager
    def temporary_config(cls, **kwargs):
        """
        Context manager for temporary logging configuration.

        Args:
            **kwargs: Configuration parameters to override

        Yields:
            Configured logger
        """
        original_configured = cls._configured
        cls._configured = False

        try:
            cls.configure(**kwargs)
            yield cls.get_logger()
        finally:
            cls._configured = original_configured


def get_logger(name: Optional[str] = None) -> BoundLogger:
    """
    Convenience function to get a configured logger.

    Args:
        name: Logger name (optional)

    Returns:
        Configured structlog logger
    """
    return LoggingConfig.get_logger(name)


def configure_logging(environment: Optional[str] = None, **kwargs) -> None:
    """
    Convenience function to configure logging.

    Args:
        environment: Environment name
        **kwargs: Additional configuration parameters
    """
    LoggingConfig.configure(environment=environment, **kwargs)


# Auto-configure based on environment
def _auto_configure():
    """Auto-configure logging based on environment variables."""
    env = os.getenv("FLASK_ENV", "development")

    if env == "production":
        LoggingConfig.configure_for_production()
    elif env == "testing":
        LoggingConfig.configure_for_testing()
    else:
        LoggingConfig.configure_for_development()


# Initialize logging when module is imported
_auto_configure()

# Export commonly used functions
__all__ = ["LoggingConfig", "get_logger", "configure_logging", "structlog"]
