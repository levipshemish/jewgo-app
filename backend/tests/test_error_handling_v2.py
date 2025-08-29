"""
Integration tests for enhanced error handling and timeout features.
These tests verify that the new error handling patterns work correctly
and that timeout protection is functioning as expected.
"""

import pytest
import time
from datetime import timedelta
from utils.error_handler_v2 import (
    handle_database_operation,
    handle_external_api_call,
    handle_validation_operation,
    create_error_context,
    DatabaseServiceError,
    ExternalAPIError,
)
from utils.http_client import get_http_client
from utils.monitoring_v2 import get_metrics, clear_old_data


class TestErrorHandlerV2:
    """Test enhanced error handling utilities."""

    def test_handle_database_operation_success(self):
        """Test successful database operation."""

        def mock_operation():
            return {"id": 1, "name": "Test Restaurant"}

        result = handle_database_operation(
            operation=mock_operation,
            operation_name="test_operation",
            context=create_error_context(test_id=1),
        )
        assert result == {"id": 1, "name": "Test Restaurant"}

    def test_handle_database_operation_with_default_return(self):
        """Test database operation with default return on error."""

        def mock_operation():
            raise Exception("Database connection failed")

        result = handle_database_operation(
            operation=mock_operation,
            operation_name="test_operation",
            context=create_error_context(test_id=1),
            default_return=[],
        )
        assert result == []

    def test_handle_database_operation_raises_exception(self):
        """Test database operation raises specific exception."""

        def mock_operation():
            raise Exception("Database connection failed")

        with pytest.raises(DatabaseServiceError):
            handle_database_operation(
                operation=mock_operation,
                operation_name="test_operation",
                context=create_error_context(test_id=1),
            )

    def test_handle_external_api_call_success(self):
        """Test successful external API call."""

        def mock_operation():
            return {"status": "success", "data": "test"}

        result = handle_external_api_call(
            operation=mock_operation,
            operation_name="test_api_call",
            context=create_error_context(api_endpoint="/test"),
        )
        assert result == {"status": "success", "data": "test"}

    def test_handle_external_api_call_timeout(self):
        """Test external API call timeout handling."""

        def mock_operation():
            from requests.exceptions import Timeout

            raise Timeout("Request timed out")

        # When default_return is None, the function should raise an exception
        with pytest.raises(ExternalAPIError):
            handle_external_api_call(
                operation=mock_operation,
                operation_name="test_timeout",
                context=create_error_context(api_endpoint="/test"),
                default_return=None,
            )

    def test_handle_validation_operation_success(self):
        """Test successful validation operation."""

        def mock_operation():
            return True

        result = handle_validation_operation(
            operation=mock_operation,
            operation_name="test_validation",
            context=create_error_context(field="name"),
        )
        assert result is True

    def test_handle_validation_operation_value_error(self):
        """Test validation operation with ValueError."""

        def mock_operation():
            raise ValueError("Invalid input")

        result = handle_validation_operation(
            operation=mock_operation,
            operation_name="test_validation",
            context=create_error_context(field="name"),
            default_return=False,
        )
        assert result is False

    def test_create_error_context(self):
        """Test error context creation."""
        context = create_error_context(
            user_id=123, operation="test", timestamp="2025-08-26T10:30:00Z"
        )
        assert "user_id" in context
        assert "operation" in context
        assert "timestamp" in context
        assert context["user_id"] == 123


class TestHTTPClient:
    """Test HTTP client with timeout and monitoring."""

    def test_http_client_timeout(self):
        """Test HTTP client timeout behavior."""
        client = get_http_client()
        # Test with a URL that will timeout
        with pytest.raises(Exception) as exc_info:
            client.get(
                "http://httpbin.org/delay/15",  # 15 second delay
                timeout=(1, 1),  # 1 second timeout
                operation_name="test_timeout",
            )
        assert "timeout" in str(exc_info.value).lower()

    def test_http_client_success(self):
        """Test successful HTTP client request."""
        client = get_http_client()
        response = client.get("http://httpbin.org/get", operation_name="test_success")
        assert response.status_code == 200
        data = response.json()
        assert "url" in data

    def test_http_client_with_params(self):
        """Test HTTP client with query parameters."""
        client = get_http_client()
        response = client.get(
            "http://httpbin.org/get",
            params={"test": "value", "number": 123},
            operation_name="test_params",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["args"]["test"] == "value"
        assert data["args"]["number"] == "123"


class TestMonitoring:
    """Test monitoring and alerting functionality."""

    def setup_method(self):
        """Clear monitoring data before each test."""
        clear_old_data(timedelta(seconds=0))

    def test_monitoring_metrics(self):
        """Test monitoring metrics collection."""
        from utils.monitoring_v2 import record_api_call, record_error, record_timeout

        # Record some test events
        record_api_call("test_operation", 1.5, 200, {"test": True})
        record_error(
            "test_operation", "TestError", "Test error message", {"test": True}
        )
        record_timeout("test_operation", 5.0, {"test": True})
        # Get metrics
        metrics = get_metrics("test_operation")
        assert "api_calls" in metrics
        assert "errors" in metrics
        assert "timeouts" in metrics
        # Check API calls
        api_calls = metrics["api_calls"].get("test_operation", {})
        assert api_calls.get("count", 0) >= 1
        # Check errors
        errors = metrics["errors"].get("test_operation", {})
        assert errors.get("count", 0) >= 1
        # Check timeouts
        timeouts = metrics["timeouts"].get("test_operation", {})
        assert timeouts.get("count", 0) >= 1

    def test_monitoring_alert_thresholds(self):
        """Test monitoring alert thresholds."""
        from utils.monitoring_v2 import record_api_call, record_error

        # Record multiple errors to trigger alert
        for i in range(10):
            record_api_call("test_operation", 1.0, 200, {"test": True})
            record_error("test_operation", "TestError", f"Error {i}", {"test": True})
        # Get metrics
        metrics = get_metrics("test_operation")
        # Should have recorded events
        assert metrics["api_calls"]["test_operation"]["count"] >= 10
        assert metrics["errors"]["test_operation"]["count"] >= 10


class TestIntegration:
    """Integration tests for error handling and monitoring."""

    def test_service_error_handling_integration(self):
        """Test error handling integration with service layer."""
        from utils.error_handler_v2 import (
            handle_database_operation,
            create_error_context,
        )

        # Simulate a service operation
        def mock_service_operation():
            # Simulate database operation
            if time.time() % 2 == 0:  # Simulate intermittent failure
                raise Exception("Database connection failed")
            return {"success": True}

        # Test with error handling
        context = create_error_context(
            service="test_service", operation="test_operation"
        )
        result = handle_database_operation(
            operation=mock_service_operation,
            operation_name="service_operation",
            context=context,
            default_return={"success": False, "error": "Operation failed"},
        )
        # Should return either success or default
        assert "success" in result

    def test_http_client_monitoring_integration(self):
        """Test HTTP client integration with monitoring."""
        client = get_http_client()
        # Make a request that should succeed
        response = client.get(
            "http://httpbin.org/get", operation_name="integration_test"
        )
        # Check that monitoring data was recorded
        metrics = get_metrics("integration_test")
        api_calls = metrics["api_calls"].get("integration_test", {})
        assert api_calls.get("count", 0) >= 1
        assert api_calls.get("avg_duration", 0) > 0

    def test_error_context_propagation(self):
        """Test error context propagation through the stack."""
        from utils.error_handler_v2 import (
            handle_database_operation,
            create_error_context,
        )

        captured_context = None

        def mock_operation():
            nonlocal captured_context
            # Simulate capturing context in logs
            captured_context = create_error_context(
                operation="nested_operation", nested=True
            )
            return {"success": True}

        # Create initial context
        initial_context = create_error_context(user_id=123, operation="main_operation")
        result = handle_database_operation(
            operation=mock_operation,
            operation_name="test_context_propagation",
            context=initial_context,
        )
        # Verify context was created
        assert captured_context is not None
        assert captured_context["operation"] == "nested_operation"
        assert captured_context["nested"] is True


if __name__ == "__main__":
    pytest.main([__file__])
