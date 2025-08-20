#!/usr/bin/env python3
"""Tests for Unified Logging Configuration Module.
===============================================

This module tests the LoggingConfig class and related functionality
to ensure proper logging configuration across different environments.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import json
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import structlog
from structlog.stdlib import BoundLogger
from utils.logging_config import (
    LoggingConfig,
    _auto_configure,
    configure_logging,
    get_logger,
)

logger = get_logger(__name__)

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestLoggingConfig:
    """Test cases for LoggingConfig class."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        # Reset structlog configuration
        structlog.reset_defaults()
        # Reset LoggingConfig state
        LoggingConfig._configured = False

    def test_configure_basic(self):
        """Test basic logging configuration."""
        LoggingConfig.configure()

        assert LoggingConfig._configured is True

        # Verify logger can be created
        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_environment_aware(self):
        """Test environment-aware configuration."""
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            LoggingConfig.configure()

            assert LoggingConfig._configured is True

            # Verify production settings
            logger = LoggingConfig.get_logger("test")
            assert isinstance(logger, BoundLogger)

    def test_configure_with_custom_level(self):
        """Test configuration with custom log level."""
        LoggingConfig.configure(log_level="DEBUG")

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_without_callsite(self):
        """Test configuration without callsite information."""
        LoggingConfig.configure(include_callsite=False)

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_without_contextvars(self):
        """Test configuration without context variables."""
        LoggingConfig.configure(include_contextvars=False)

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_idempotent(self):
        """Test that configure is idempotent."""
        LoggingConfig.configure()
        first_config = LoggingConfig._configured

        LoggingConfig.configure()
        second_config = LoggingConfig._configured

        assert first_config == second_config is True

    def test_get_logger_auto_configure(self):
        """Test that get_logger auto-configures if needed."""
        assert LoggingConfig._configured is False

        logger = LoggingConfig.get_logger("test")

        assert LoggingConfig._configured is True
        assert isinstance(logger, BoundLogger)

    def test_get_logger_with_name(self):
        """Test get_logger with specific name."""
        logger = LoggingConfig.get_logger("test_logger")

        assert isinstance(logger, BoundLogger)
        # Verify logger name is set correctly
        assert logger.name == "test_logger"

    def test_configure_for_development(self):
        """Test development environment configuration."""
        LoggingConfig.configure_for_development()

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_for_production(self):
        """Test production environment configuration."""
        LoggingConfig.configure_for_production()

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_configure_for_testing(self):
        """Test testing environment configuration."""
        LoggingConfig.configure_for_testing()

        assert LoggingConfig._configured is True

        logger = LoggingConfig.get_logger("test")
        assert isinstance(logger, BoundLogger)

    def test_temporary_config_context_manager(self):
        """Test temporary configuration context manager."""
        # Initial configuration
        LoggingConfig.configure(log_level="INFO")
        assert LoggingConfig._configured is True

        # Use temporary configuration
        with LoggingConfig.temporary_config(log_level="DEBUG") as logger:
            assert isinstance(logger, BoundLogger)
            # Configuration should be temporarily changed
            assert LoggingConfig._configured is True

        # Should be back to original state
        assert LoggingConfig._configured is True

    def test_temporary_config_exception_handling(self):
        """Test temporary configuration handles exceptions properly."""
        LoggingConfig.configure()

        with pytest.raises(ValueError):
            with LoggingConfig.temporary_config():
                raise ValueError("Test exception")

        # Should still be configured after exception
        assert LoggingConfig._configured is True


class TestConvenienceFunctions:
    """Test cases for convenience functions."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        structlog.reset_defaults()
        LoggingConfig._configured = False

    def test_get_logger_function(self):
        """Test get_logger convenience function."""
        logger = get_logger("test")

        assert isinstance(logger, BoundLogger)
        assert LoggingConfig._configured is True

    def test_get_logger_function_without_name(self):
        """Test get_logger convenience function without name."""
        logger = get_logger()

        assert isinstance(logger, BoundLogger)
        assert LoggingConfig._configured is True

    def test_configure_logging_function(self):
        """Test configure_logging convenience function."""
        configure_logging(environment="development", log_level="DEBUG")

        assert LoggingConfig._configured is True

        logger = get_logger("test")
        assert isinstance(logger, BoundLogger)


class TestAutoConfiguration:
    """Test cases for auto-configuration functionality."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        structlog.reset_defaults()
        LoggingConfig._configured = False

    def test_auto_configure_development(self):
        """Test auto-configuration for development environment."""
        with patch.dict(os.environ, {"FLASK_ENV": "development"}):
            _auto_configure()

            assert LoggingConfig._configured is True

    def test_auto_configure_production(self):
        """Test auto-configuration for production environment."""
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            _auto_configure()

            assert LoggingConfig._configured is True

    def test_auto_configure_testing(self):
        """Test auto-configuration for testing environment."""
        with patch.dict(os.environ, {"FLASK_ENV": "testing"}):
            _auto_configure()

            assert LoggingConfig._configured is True

    def test_auto_configure_default(self):
        """Test auto-configuration with no environment set."""
        with patch.dict(os.environ, {}, clear=True):
            _auto_configure()

            assert LoggingConfig._configured is True


class TestLoggingOutput:
    """Test cases for actual logging output."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        structlog.reset_defaults()
        LoggingConfig._configured = False

    def test_logging_output_structure(self):
        """Test that logging output has correct structure."""
        with tempfile.NamedTemporaryFile(mode="w+", delete=False) as temp_file:
            # Configure logging to write to file
            LoggingConfig.configure()

            logger = get_logger("test_logger")
            logger.info("Test message", test_field="test_value")

            # Read the log output
            temp_file.seek(0)
            log_line = temp_file.readline()

            # Parse JSON output
            log_data = json.loads(log_line)

            # Verify structure
            assert "timestamp" in log_data
            assert "level" in log_data
            assert "logger" in log_data
            assert "event" in log_data
            assert log_data["event"] == "Test message"
            assert log_data["test_field"] == "test_value"

    def test_logging_with_exception(self):
        """Test logging with exception information."""
        with tempfile.NamedTemporaryFile(mode="w+", delete=False) as temp_file:
            LoggingConfig.configure()

            logger = get_logger("test_logger")

            try:
                raise ValueError("Test exception")
            except ValueError:
                logger.exception("Exception occurred")

            # Read the log output
            temp_file.seek(0)
            log_line = temp_file.readline()

            # Parse JSON output
            log_data = json.loads(log_line)

            # Verify exception information
            assert "exception" in log_data
            assert "ValueError" in log_data["exception"]
            assert "Test exception" in log_data["exception"]


class TestIntegration:
    """Integration tests for logging configuration."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        structlog.reset_defaults()
        LoggingConfig._configured = False

    def test_multiple_loggers(self):
        """Test that multiple loggers work correctly."""
        LoggingConfig.configure()

        logger1 = get_logger("logger1")
        logger2 = get_logger("logger2")

        assert isinstance(logger1, BoundLogger)
        assert isinstance(logger2, BoundLogger)
        assert logger1.name == "logger1"
        assert logger2.name == "logger2"

    def test_logger_reuse(self):
        """Test that logger instances are reused correctly."""
        LoggingConfig.configure()

        logger1 = get_logger("test_logger")
        logger2 = get_logger("test_logger")

        # Should be the same logger instance
        assert logger1 is logger2

    def test_environment_variable_override(self):
        """Test that environment variables override defaults."""
        with patch.dict(os.environ, {"FLASK_ENV": "production", "LOG_LEVEL": "ERROR"}):
            LoggingConfig.configure()

            assert LoggingConfig._configured is True

            logger = get_logger("test")
            assert isinstance(logger, BoundLogger)


if __name__ == "__main__":
    pytest.main([__file__])
