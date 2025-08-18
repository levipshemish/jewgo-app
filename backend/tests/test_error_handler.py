#!/usr/bin/env python3
"""Unit Tests for Error Handling System.
====================================

Tests for the error handling utilities and API response formatting.

Author: JewGo Development Team
Version: 1.0
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask, jsonify

from utils.api_response import (
    created_response,
    kosher_types_response,
    not_found_response,
    paginated_response,
    restaurant_response,
    restaurants_response,
    search_response,
    statistics_response,
    success_response,
    validation_error_response,
)
from utils.error_handler import (
    APIError,
    DatabaseError,
    ExternalServiceError,
    NotFoundError,
    ValidationError,
    handle_api_error,
    handle_generic_error,
    safe_float_conversion,
    safe_int_conversion,
    validate_param_types,
    validate_required_params,
)


class TestErrorHandler(unittest.TestCase):
    """Test cases for error handling utilities."""

    def setUp(self) -> None:
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.client = self.app.test_client()

    def test_api_error_creation(self) -> None:
        """Test APIError creation with different parameters."""
        # Test basic error
        error = APIError("Test error", 400, "TEST_ERROR")
        assert error.message == "Test error"
        assert error.status_code == 400
        assert error.error_code == "TEST_ERROR"
        assert error.details == {}

        # Test error with details
        details = {"field": "name", "value": "invalid"}
        error = APIError("Validation failed", 422, "VALIDATION_ERROR", details)
        assert error.details == details

    def test_validation_error(self) -> None:
        """Test ValidationError creation."""
        error = ValidationError("Invalid input", {"field": "email"})
        assert error.message == "Invalid input"
        assert error.status_code == 400
        assert error.error_code == "VALIDATION_ERROR"
        assert error.details == {"field": "email"}

    def test_not_found_error(self) -> None:
        """Test NotFoundError creation."""
        error = NotFoundError("Restaurant not found", "Restaurant")
        assert error.message == "Restaurant not found"
        assert error.status_code == 404
        assert error.error_code == "NOT_FOUND"
        assert error.details == {"resource_type": "Restaurant"}

    def test_database_error(self) -> None:
        """Test DatabaseError creation."""
        error = DatabaseError("Connection failed", {"db": "postgresql"})
        assert error.message == "Connection failed"
        assert error.status_code == 500
        assert error.error_code == "DATABASE_ERROR"
        assert error.details == {"db": "postgresql"}

    def test_external_service_error(self) -> None:
        """Test ExternalServiceError creation."""
        error = ExternalServiceError("API timeout", "google_places", {"timeout": 30})
        assert error.message == "API timeout"
        assert error.status_code == 502
        assert error.error_code == "EXTERNAL_SERVICE_ERROR"
        assert error.details == {"service": "google_places", "timeout": 30}

    @patch("utils.error_handler.logger")
    def test_handle_api_error(self, mock_logger) -> None:
        """Test API error handling."""
        with self.app.app_context():
            error = ValidationError("Invalid input", {"field": "email"})
            response, status_code = handle_api_error(error)

        # Check response structure
        data = json.loads(response.get_data(as_text=True))
        assert status_code == 400
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert data["error"]["message"] == "Invalid input"
        assert data["error"]["status_code"] == 400
        assert data["error"]["details"] == {"field": "email"}

        # Check logging
        mock_logger.error.assert_called_once()

    @patch("utils.error_handler.logger")
    def test_handle_generic_error(self, mock_logger) -> None:
        """Test generic error handling."""
        with self.app.app_context():
            error = Exception("Unexpected error")
            response, status_code = handle_generic_error(error)

        # Check response structure
        data = json.loads(response.get_data(as_text=True))
        assert status_code == 500
        assert "error" in data
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
        assert data["error"]["message"] == "An unexpected error occurred"
        assert data["error"]["status_code"] == 500

        # Check logging
        mock_logger.error.assert_called_once()

    def test_validate_required_params(self) -> None:
        """Test parameter validation."""
        # Test valid parameters
        params = {"name": "test", "email": "test@example.com"}
        required = ["name", "email"]
        validate_required_params(params, required)  # Should not raise

        # Test missing parameters
        params = {"name": "test"}
        required = ["name", "email"]
        with pytest.raises(ValidationError) as context:
            validate_required_params(params, required)

        error = context.value
        assert error.status_code == 400
        assert "email" in error.details["missing_parameters"]

        # Test empty parameters
        params = {"name": "", "email": None}
        required = ["name", "email"]
        with pytest.raises(ValidationError) as context:
            validate_required_params(params, required)

        error = context.value
        assert len(error.details["missing_parameters"]) == 2

    def test_validate_param_types(self) -> None:
        """Test parameter type validation."""
        # Test valid types
        params = {"age": 25, "name": "test", "active": True}
        type_validations = {"age": int, "name": str, "active": bool}
        validate_param_types(params, type_validations)  # Should not raise

        # Test invalid types
        params = {"age": "25", "name": "test"}
        type_validations = {"age": int, "name": str}
        with pytest.raises(ValidationError) as context:
            validate_param_types(params, type_validations)

        error = context.value
        assert error.status_code == 400
        assert "age must be int" in error.details["type_errors"]

    def test_safe_int_conversion(self) -> None:
        """Test safe integer conversion."""
        # Test valid conversions
        assert safe_int_conversion("123") == 123
        assert safe_int_conversion(456) == 456
        assert safe_int_conversion(None, default=0) == 0

        # Test invalid conversions
        assert safe_int_conversion("invalid") is None
        assert safe_int_conversion("invalid", default=0) == 0

        # Test with param name for error
        with pytest.raises(ValidationError):
            safe_int_conversion("invalid", param_name="age")

    def test_safe_float_conversion(self) -> None:
        """Test safe float conversion."""
        # Test valid conversions
        assert safe_float_conversion("123.45") == 123.45
        assert safe_float_conversion(456.78) == 456.78
        assert safe_float_conversion(None, default=0.0) == 0.0

        # Test invalid conversions
        assert safe_float_conversion("invalid") is None
        assert safe_float_conversion("invalid", default=0.0) == 0.0

        # Test with param name for error
        with pytest.raises(ValidationError):
            safe_float_conversion("invalid", param_name="price")


class TestAPIResponse(unittest.TestCase):
    """Test cases for API response utilities."""

    def setUp(self) -> None:
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.client = self.app.test_client()

    def test_success_response(self) -> None:
        """Test success response creation."""
        with self.app.app_context():
            data = {"message": "Success"}
            response, status_code = success_response(data, "Operation completed")

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 200
        assert response_data["success"]
        assert response_data["data"] == data
        assert response_data["message"] == "Operation completed"
        assert "timestamp" in response_data

    def test_created_response(self) -> None:
        """Test created response creation."""
        with self.app.app_context():
            data = {"id": 123, "name": "New Restaurant"}
            response, status_code = created_response(data, "Restaurant created")

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 201
        assert response_data["success"]
        assert response_data["data"] == data
        assert response_data["message"] == "Restaurant created"

    def test_paginated_response(self) -> None:
        """Test paginated response creation."""
        with self.app.app_context():
            data = [{"id": 1}, {"id": 2}, {"id": 3}]
            response, status_code = paginated_response(data, total=10, page=1, limit=3)

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 200
        assert response_data["data"] == data
        assert "pagination" in response_data["meta"]
        pagination = response_data["meta"]["pagination"]
        assert pagination["page"] == 1
        assert pagination["limit"] == 3
        assert pagination["total"] == 10
        assert pagination["total_pages"] == 4

    def test_restaurants_response(self) -> None:
        """Test restaurants response creation."""
        with self.app.app_context():
            restaurants = [
                {"id": 1, "name": "Restaurant 1"},
                {"id": 2, "name": "Restaurant 2"},
            ]
            response, status_code = restaurants_response(
                restaurants,
                total=2,
                limit=10,
                offset=0,
                filters={"kosher_category": "dairy"},
            )

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 200
        assert response_data["data"]["restaurants"] == restaurants
        assert response_data["meta"]["count"] == 2
        assert response_data["meta"]["total"] == 2
        assert response_data["meta"]["filters"]["kosher_category"] == "dairy"

    def test_restaurant_response(self) -> None:
        """Test single restaurant response creation."""
        with self.app.app_context():
            restaurant = {"id": 1, "name": "Test Restaurant"}
            response, status_code = restaurant_response(restaurant)

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 200
        assert response_data["data"]["restaurant"] == restaurant
        assert response_data["message"] == "Restaurant retrieved successfully"

    def test_not_found_response(self) -> None:
        """Test not found response creation."""
        with self.app.app_context():
            response, status_code = not_found_response(
                "Restaurant not found",
                "Restaurant",
            )

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 404
        assert not response_data["success"]
        assert response_data["message"] == "Restaurant not found"
        assert response_data["meta"]["resource_type"] == "Restaurant"

    def test_validation_error_response(self) -> None:
        """Test validation error response creation."""
        with self.app.app_context():
            errors = ["Name is required", "Email is invalid"]
            response, status_code = validation_error_response(
                "Validation failed",
                errors,
            )

        # Check response structure
        response_data = json.loads(response.get_data(as_text=True))
        assert status_code == 400
        assert not response_data["success"]
        assert response_data["message"] == "Validation failed"
        assert response_data["meta"]["validation_errors"] == errors


if __name__ == "__main__":
    unittest.main()
