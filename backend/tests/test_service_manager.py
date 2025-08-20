from typing import Any, Dict
from unittest.mock import Mock, patch

import pytest
from services.base_service import BaseService
from services.service_manager import ServiceManager, initialize_service_manager
from utils.error_handler import APIError, ValidationError

#!/usr/bin/env python3
"""Tests for Service Manager and Base Service functionality."""


class MockService(BaseService):
    """Mock service for testing."""

    def __init__(self, db_manager=None, config=None, cache_manager=None):
        super().__init__(db_manager, config, cache_manager)
        self.test_operation_called = False

    def test_operation(self, value: str) -> str:
        """Test operation that can be called safely."""
        self.test_operation_called = True
        return f"processed_{value}"

    def failing_operation(self) -> None:
        """Operation that always fails."""
        raise ValueError("Test error")


class TestBaseService:
    """Test BaseService functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.db_manager = Mock()
        self.config = Mock()
        self.cache_manager = Mock()
        self.service = MockService(
            db_manager=self.db_manager,
            config=self.config,
            cache_manager=self.cache_manager,
        )

    def test_validate_required_fields_success(self):
        """Test successful field validation."""
        data = {"field1": "value1", "field2": "value2"}
        required_fields = ["field1", "field2"]

        # Should not raise an exception
        self.service.validate_required_fields(data, required_fields)

    def test_validate_required_fields_missing(self):
        """Test field validation with missing fields."""
        data = {"field1": "value1"}
        required_fields = ["field1", "field2"]

        with pytest.raises(ValidationError) as exc_info:
            self.service.validate_required_fields(data, required_fields)

        assert "Missing required fields: field2" in str(exc_info.value)
        assert exc_info.value.details["missing_fields"] == ["field2"]

    def test_safe_execute_success(self):
        """Test successful safe execution."""
        result = self.service.safe_execute(
            "test_operation", self.service.test_operation, "test_value"
        )

        assert result == "processed_test_value"
        assert self.service.test_operation_called

    def test_safe_execute_failure(self):
        """Test safe execution with failure."""
        with pytest.raises(APIError) as exc_info:
            self.service.safe_execute(
                "failing_operation", self.service.failing_operation
            )

        assert "Unexpected error during failing_operation" in str(exc_info.value)
        assert exc_info.value.details["operation"] == "failing_operation"
        assert exc_info.value.details["error_type"] == "ValueError"

    def test_handle_external_service_error(self):
        """Test external service error handling."""
        original_error = ValueError("External service failed")

        with pytest.raises(Exception) as exc_info:
            self.service.handle_external_service_error(
                original_error, "test_service", "test_operation", user_id=123
            )

        # Should be wrapped in ExternalServiceError
        assert "test_service service error" in str(exc_info.value)
        assert exc_info.value.details["service"] == "test_service"
        assert exc_info.value.details["operation"] == "test_operation"
        assert exc_info.value.details["user_id"] == 123

    def test_get_health_status(self):
        """Test health status reporting."""
        health_status = self.service.get_health_status()

        assert health_status["service"] == "MockService"
        assert health_status["healthy"] is True
        assert health_status["error_count"] == 0
        assert health_status["dependencies"]["database"] is True
        assert health_status["dependencies"]["cache"] is True
        assert health_status["dependencies"]["config"] is True


class TestServiceManager:
    """Test ServiceManager functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.db_manager = Mock()
        self.config = Mock()
        self.cache_manager = Mock()
        self.service_manager = ServiceManager(
            db_manager=self.db_manager,
            config=self.config,
            cache_manager=self.cache_manager,
        )

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_get_service_creates_instance(self, mock_registry):
        """Test that get_service creates service instances."""
        mock_registry.__contains__.return_value = True
        mock_registry.__getitem__.return_value = MockService

        service = self.service_manager.get_service("test_service")

        assert isinstance(service, MockService)
        assert service.db_manager == self.db_manager
        assert service.config == self.config
        assert service.cache_manager == self.cache_manager

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_get_service_caches_instances(self, mock_registry):
        """Test that service instances are cached."""
        mock_registry.__contains__.return_value = True
        mock_registry.__getitem__.return_value = MockService

        service1 = self.service_manager.get_service("test_service")
        service2 = self.service_manager.get_service("test_service")

        assert service1 is service2  # Same instance

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_get_service_unknown_service(self, mock_registry):
        """Test error handling for unknown services."""
        mock_registry.__contains__.return_value = False

        with pytest.raises(ValueError) as exc_info:
            self.service_manager.get_service("unknown_service")

        assert "Service 'unknown_service' not found in registry" in str(exc_info.value)

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_get_all_services(self, mock_registry):
        """Test getting all registered services."""
        mock_registry.items.return_value = [
            ("service1", MockService),
            ("service2", MockService),
        ]
        mock_registry.__contains__.return_value = True
        mock_registry.__getitem__.side_effect = lambda x: MockService

        services = self.service_manager.get_all_services()

        assert len(services) == 2
        assert "service1" in services
        assert "service2" in services
        assert isinstance(services["service1"], MockService)
        assert isinstance(services["service2"], MockService)

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_get_health_status(self, mock_registry):
        """Test health status reporting."""
        mock_registry.items.return_value = [("test_service", MockService)]
        mock_registry.__contains__.return_value = True
        mock_registry.__getitem__.return_value = MockService

        health_status = self.service_manager.get_health_status()

        assert health_status["manager_healthy"] is True
        assert health_status["summary"]["total_services"] == 1
        assert health_status["summary"]["healthy_services"] == 1
        assert health_status["summary"]["unhealthy_services"] == 0
        assert "test_service" in health_status["services"]

    def test_reset_all_services(self):
        """Test service reset functionality."""
        # Add a service to the cache
        self.service_manager._services["test"] = Mock()

        self.service_manager.reset_all_services()

        assert len(self.service_manager._services) == 0


class TestServiceManagerIntegration:
    """Integration tests for service manager."""

    def setup_method(self):
        """Set up test fixtures."""
        self.db_manager = Mock()
        self.config = Mock()
        self.cache_manager = Mock()

    @patch("services.service_manager.SERVICE_REGISTRY")
    def test_initialize_service_manager(self, mock_registry):
        """Test global service manager initialization."""
        mock_registry.items.return_value = [("test_service", MockService)]
        mock_registry.__contains__.return_value = True
        mock_registry.__getitem__.return_value = MockService

        service_manager = initialize_service_manager(
            db_manager=self.db_manager,
            config=self.config,
            cache_manager=self.cache_manager,
        )

        assert isinstance(service_manager, ServiceManager)
        assert service_manager.db_manager == self.db_manager
        assert service_manager.config == self.config
        assert service_manager.cache_manager == self.cache_manager


if __name__ == "__main__":
    pytest.main([__file__])
