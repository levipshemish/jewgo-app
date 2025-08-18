#!/usr/bin/env python3
"""Test suite for error handling decorators.

Tests the unified error handling decorators to ensure they provide
consistent error handling across the codebase.

Author: JewGo Development Team
Version: 1.0
"""

import pytest
from unittest.mock import patch, MagicMock
from typing import Optional, Dict, Any

from utils.error_handler import (
    handle_database_operation,
    handle_api_operation,
    handle_google_places_operation,
    handle_file_operation,
    handle_validation_operation,
    handle_cache_operation,
    handle_operation_with_fallback,
    DatabaseError,
    ExternalServiceError,
    ValidationError,
    APIError,
)


class TestDatabaseOperationDecorator:
    """Test the handle_database_operation decorator."""

    def test_successful_operation(self):
        """Test successful database operation."""
        @handle_database_operation
        def mock_db_operation(restaurant_id: int) -> Optional[Dict[str, Any]]:
            return {"id": restaurant_id, "name": "Test Restaurant"}

        result = mock_db_operation(123)
        assert result == {"id": 123, "name": "Test Restaurant"}

    def test_database_error_raises_database_error(self):
        """Test that database errors are re-raised as DatabaseError."""
        @handle_database_operation
        def mock_db_operation(restaurant_id: int) -> Optional[Dict[str, Any]]:
            raise Exception("Connection failed")

        with pytest.raises(DatabaseError) as exc_info:
            mock_db_operation(123)

        assert "Database operation failed: Connection failed" in str(exc_info.value)
        assert exc_info.value.details["function"] == "mock_db_operation"
        assert exc_info.value.details["error_type"] == "Exception"

    def test_preserves_function_signature(self):
        """Test that decorator preserves function signature."""
        @handle_database_operation
        def mock_db_operation(restaurant_id: int, include_hours: bool = True) -> Optional[Dict[str, Any]]:
            return {"id": restaurant_id, "include_hours": include_hours}

        # Test that function signature is preserved
        assert mock_db_operation.__name__ == "mock_db_operation"
        assert mock_db_operation.__doc__ is not None


class TestAPIOperationDecorator:
    """Test the handle_api_operation decorator."""

    def test_successful_operation(self):
        """Test successful API operation."""
        @handle_api_operation
        def mock_api_operation(place_id: str) -> Optional[Dict[str, Any]]:
            return {"place_id": place_id, "name": "Test Place"}

        result = mock_api_operation("test_place_id")
        assert result == {"place_id": "test_place_id", "name": "Test Place"}

    def test_api_error_raises_external_service_error(self):
        """Test that API errors are re-raised as ExternalServiceError."""
        @handle_api_operation
        def mock_api_operation(place_id: str) -> Optional[Dict[str, Any]]:
            raise Exception("API timeout")

        with pytest.raises(ExternalServiceError) as exc_info:
            mock_api_operation("test_place_id")

        assert "API operation failed: API timeout" in str(exc_info.value)
        assert exc_info.value.details["service"] == "mock_api_operation"
        assert exc_info.value.details["error_type"] == "Exception"


class TestGooglePlacesOperationDecorator:
    """Test the handle_google_places_operation decorator."""

    def test_successful_operation(self):
        """Test successful Google Places operation."""
        @handle_google_places_operation
        def mock_places_operation(name: str, address: str) -> Optional[str]:
            return "place_id_123"

        result = mock_places_operation("Test Restaurant", "123 Main St")
        assert result == "place_id_123"

    def test_places_error_raises_external_service_error(self):
        """Test that Google Places errors are re-raised as ExternalServiceError."""
        @handle_google_places_operation
        def mock_places_operation(name: str, address: str) -> Optional[str]:
            raise Exception("Quota exceeded")

        with pytest.raises(ExternalServiceError) as exc_info:
            mock_places_operation("Test Restaurant", "123 Main St")

        assert "Google Places operation failed: Quota exceeded" in str(exc_info.value)
        assert exc_info.value.details["service"] == "google_places"
        assert exc_info.value.details["error_type"] == "Exception"


class TestFileOperationDecorator:
    """Test the handle_file_operation decorator."""

    def test_successful_operation(self):
        """Test successful file operation."""
        @handle_file_operation
        def mock_file_operation(file_path: str) -> Dict[str, Any]:
            return {"path": file_path, "content": "test content"}

        result = mock_file_operation("/test/path")
        assert result == {"path": "/test/path", "content": "test content"}

    def test_file_error_raises_api_error(self):
        """Test that file errors are re-raised as APIError."""
        @handle_file_operation
        def mock_file_operation(file_path: str) -> Dict[str, Any]:
            raise FileNotFoundError("File not found")

        with pytest.raises(APIError) as exc_info:
            mock_file_operation("/nonexistent/path")

        assert "File operation failed: File not found" in str(exc_info.value)
        assert exc_info.value.error_code == "FILE_OPERATION_ERROR"
        assert exc_info.value.status_code == 500


class TestValidationOperationDecorator:
    """Test the handle_validation_operation decorator."""

    def test_successful_operation(self):
        """Test successful validation operation."""
        @handle_validation_operation
        def mock_validation_operation(data: Dict[str, Any]) -> bool:
            return data.get("name") is not None

        result = mock_validation_operation({"name": "Test Restaurant"})
        assert result is True

    def test_validation_error_raises_validation_error(self):
        """Test that validation errors are re-raised as ValidationError."""
        @handle_validation_operation
        def mock_validation_operation(data: Dict[str, Any]) -> bool:
            raise ValueError("Invalid data format")

        with pytest.raises(ValidationError) as exc_info:
            mock_validation_operation({})

        assert "Validation failed: Invalid data format" in str(exc_info.value)
        assert exc_info.value.status_code == 400


class TestCacheOperationDecorator:
    """Test the handle_cache_operation decorator."""

    def test_successful_operation(self):
        """Test successful cache operation."""
        @handle_cache_operation
        def mock_cache_operation(key: str) -> Optional[Dict[str, Any]]:
            return {"key": key, "value": "cached_data"}

        result = mock_cache_operation("test_key")
        assert result == {"key": "test_key", "value": "cached_data"}

    def test_cache_error_returns_none(self):
        """Test that cache errors return None instead of raising."""
        @handle_cache_operation
        def mock_cache_operation(key: str) -> Optional[Dict[str, Any]]:
            raise Exception("Redis connection failed")

        result = mock_cache_operation("test_key")
        assert result is None


class TestOperationWithFallbackDecorator:
    """Test the handle_operation_with_fallback decorator."""

    def test_successful_operation(self):
        """Test successful operation with fallback."""
        @handle_operation_with_fallback(fallback_value={})
        def mock_operation(data: Dict[str, Any]) -> Dict[str, Any]:
            return {"processed": data}

        result = mock_operation({"test": "data"})
        assert result == {"processed": {"test": "data"}}

    def test_failed_operation_returns_fallback(self):
        """Test that failed operation returns fallback value."""
        @handle_operation_with_fallback(fallback_value={"error": "fallback"})
        def mock_operation(data: Dict[str, Any]) -> Dict[str, Any]:
            raise Exception("Operation failed")

        result = mock_operation({"test": "data"})
        assert result == {"error": "fallback"}

    def test_custom_fallback_value(self):
        """Test custom fallback value."""
        @handle_operation_with_fallback(fallback_value=[])
        def mock_operation() -> list:
            raise Exception("Operation failed")

        result = mock_operation()
        assert result == []

    def test_fallback_without_logging(self):
        """Test fallback without error logging."""
        @handle_operation_with_fallback(fallback_value=None, log_error=False)
        def mock_operation() -> str:
            raise Exception("Operation failed")

        result = mock_operation()
        assert result is None


class TestDecoratorIntegration:
    """Test integration of multiple decorators."""

    def test_multiple_decorators(self):
        """Test using multiple decorators together."""
        @handle_database_operation
        @handle_operation_with_fallback(fallback_value={})
        def mock_integrated_operation(restaurant_id: int) -> Dict[str, Any]:
            if restaurant_id == 0:
                raise Exception("Database error")
            return {"id": restaurant_id, "name": "Test Restaurant"}

        # Test successful operation
        result = mock_integrated_operation(123)
        assert result == {"id": 123, "name": "Test Restaurant"}

        # Test failed operation with fallback
        result = mock_integrated_operation(0)
        assert result == {}

    def test_decorator_preserves_metadata(self):
        """Test that decorators preserve function metadata."""
        @handle_database_operation
        def mock_function(restaurant_id: int) -> Optional[Dict[str, Any]]:
            """Test function with docstring."""
            return {"id": restaurant_id}

        assert mock_function.__name__ == "mock_function"
        assert mock_function.__doc__ == "Test function with docstring."


class TestErrorLogging:
    """Test error logging functionality."""

    @patch('utils.error_handler.logger')
    def test_database_error_logging(self, mock_logger):
        """Test that database errors are properly logged."""
        @handle_database_operation
        def mock_db_operation(restaurant_id: int) -> Optional[Dict[str, Any]]:
            raise Exception("Connection failed")

        with pytest.raises(DatabaseError):
            mock_db_operation(123)

        # Verify error was logged
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        assert "Database operation failed" in call_args[1]["error_message"]

    @patch('utils.error_handler.logger')
    def test_cache_error_logging(self, mock_logger):
        """Test that cache errors are properly logged."""
        @handle_cache_operation
        def mock_cache_operation(key: str) -> Optional[Dict[str, Any]]:
            raise Exception("Redis connection failed")

        result = mock_cache_operation("test_key")

        # Verify warning was logged
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        assert "Cache operation failed, continuing without cache" in call_args[1]["error"]


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_decorator_with_no_args_function(self):
        """Test decorator with function that takes no arguments."""
        @handle_database_operation
        def mock_no_args_function() -> str:
            return "success"

        result = mock_no_args_function()
        assert result == "success"

    def test_decorator_with_kwargs_only_function(self):
        """Test decorator with function that takes only keyword arguments."""
        @handle_database_operation
        def mock_kwargs_function(*, restaurant_id: int) -> Dict[str, Any]:
            return {"id": restaurant_id}

        result = mock_kwargs_function(restaurant_id=123)
        assert result == {"id": 123}

    def test_decorator_with_complex_return_type(self):
        """Test decorator with complex return type."""
        @handle_database_operation
        def mock_complex_function() -> tuple[list, dict]:
            return ([1, 2, 3], {"status": "success"})

        result = mock_complex_function()
        assert result == ([1, 2, 3], {"status": "success"})

    def test_decorator_with_none_return(self):
        """Test decorator with None return value."""
        @handle_database_operation
        def mock_none_function() -> None:
            return None

        result = mock_none_function()
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__])
