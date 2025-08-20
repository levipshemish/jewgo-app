"""
Unified Test Utilities
======================

Centralized test utility functions to eliminate code duplication.
This module consolidates common test helper functions, fixtures, and utilities
used across the backend test suite.

Author: JewGo Development Team
Version: 1.0
"""

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from unittest.mock import MagicMock, Mock, patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

try:
    from utils.api_response import (
        created_response,
        kosher_types_response,
        not_found_response,
        restaurant_response,
        restaurants_response,
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
    )
except ImportError:
    # Fallback for test environment
    pass


class TestUtils:
    """Utility class for common test operations."""

    @staticmethod
    def create_mock_restaurant(
        restaurant_id: int = 1,
        name: str = "Test Restaurant",
        address: str = "123 Test St, Miami, FL 33101",
        phone: str = "305-555-0123",
        website: str = "https://testrestaurant.com",
        kosher_type: str = "Dairy",
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a mock restaurant dictionary for testing.

        Args:
            restaurant_id: Restaurant ID
            name: Restaurant name
            address: Restaurant address
            phone: Restaurant phone number
            website: Restaurant website
            kosher_type: Kosher certification type
            **kwargs: Additional restaurant fields

        Returns:
            Mock restaurant dictionary
        """
        base_restaurant = {
            "id": restaurant_id,
            "name": name,
            "address": address,
            "phone": phone,
            "website": website,
            "kosher_type": kosher_type,
            "latitude": 25.7617,
            "longitude": -80.1918,
            "city": "Miami",
            "state": "FL",
            "zip_code": "33101",
            "hours_open": json.dumps(
                {
                    "mon": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
                    "tue": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
                    "wed": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
                    "thu": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
                    "fri": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
                    "sat": {"open": "12:00 PM", "close": "11:00 PM", "is_open": True},
                    "sun": {"open": "12:00 PM", "close": "9:00 PM", "is_open": True},
                }
            ),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "is_approved": True,
            "is_active": True,
        }
        base_restaurant.update(kwargs)
        return base_restaurant

    @staticmethod
    def create_mock_review(
        review_id: int = 1,
        restaurant_id: int = 1,
        user_name: str = "Test User",
        rating: int = 5,
        comment: str = "Great food!",
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a mock review dictionary for testing.

        Args:
            review_id: Review ID
            restaurant_id: Associated restaurant ID
            user_name: Reviewer name
            rating: Review rating (1-5)
            comment: Review comment
            **kwargs: Additional review fields

        Returns:
            Mock review dictionary
        """
        base_review = {
            "id": review_id,
            "restaurant_id": restaurant_id,
            "user_name": user_name,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "is_approved": True,
            "is_active": True,
        }
        base_review.update(kwargs)
        return base_review

    @staticmethod
    def create_mock_user(
        user_id: int = 1,
        email: str = "test@example.com",
        name: str = "Test User",
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a mock user dictionary for testing.

        Args:
            user_id: User ID
            email: User email
            name: User name
            **kwargs: Additional user fields

        Returns:
            Mock user dictionary
        """
        base_user = {
            "id": user_id,
            "email": email,
            "name": name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "is_active": True,
            "is_admin": False,
        }
        base_user.update(kwargs)
        return base_user

    @staticmethod
    def create_mock_db_manager() -> MagicMock:
        """Create a mock database manager for testing.

        Returns:
            Mock database manager
        """
        mock_db = MagicMock()

        # Mock common database operations
        mock_db.get_all_restaurants.return_value = []
        mock_db.get_restaurant_by_id.return_value = None
        mock_db.create_restaurant.return_value = TestUtils.create_mock_restaurant()
        mock_db.update_restaurant.return_value = True
        mock_db.delete_restaurant.return_value = True

        mock_db.get_all_reviews.return_value = []
        mock_db.get_review_by_id.return_value = None
        mock_db.create_review.return_value = TestUtils.create_mock_review()
        mock_db.update_review.return_value = True
        mock_db.delete_review.return_value = True

        mock_db.get_all_users.return_value = []
        mock_db.get_user_by_id.return_value = None
        mock_db.create_user.return_value = TestUtils.create_mock_user()
        mock_db.update_user.return_value = True
        mock_db.delete_user.return_value = True

        return mock_db

    @staticmethod
    def create_mock_cache_manager() -> MagicMock:
        """Create a mock cache manager for testing.

        Returns:
            Mock cache manager
        """
        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_cache.set.return_value = True
        mock_cache.delete.return_value = True
        mock_cache.clear.return_value = True
        mock_cache.exists.return_value = False
        return mock_cache

    @staticmethod
    def create_mock_config() -> MagicMock:
        """Create a mock configuration object for testing.

        Returns:
            Mock configuration
        """
        mock_config = MagicMock()
        mock_config.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb"
        mock_config.REDIS_URL = "redis://localhost:6379/0"
        mock_config.GOOGLE_MAPS_API_KEY = "test_api_key"
        mock_config.SENTRY_DSN = "https://test@sentry.io/test"
        mock_config.LOG_LEVEL = "INFO"
        return mock_config

    @staticmethod
    def create_test_app() -> Flask:
        """Create a test Flask application.

        Returns:
            Test Flask application
        """
        app = Flask(__name__)
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-secret-key"
        return app

    @staticmethod
    def create_test_client(app: Flask) -> FlaskClient:
        """Create a test client for Flask application.

        Args:
            app: Flask application

        Returns:
            Flask test client
        """
        return app.test_client()

    @staticmethod
    def mock_external_service_response(
        status_code: int = 200,
        data: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> MagicMock:
        """Create a mock external service response.

        Args:
            status_code: HTTP status code
            data: Response data
            headers: Response headers

        Returns:
            Mock response object
        """
        mock_response = MagicMock()
        mock_response.status_code = status_code
        mock_response.json.return_value = data or {}
        mock_response.headers = headers or {}
        mock_response.ok = 200 <= status_code < 300
        return mock_response

    @staticmethod
    def create_temp_file(content: str = "", suffix: str = ".txt") -> str:
        """Create a temporary file for testing.

        Args:
            content: File content
            suffix: File suffix

        Returns:
            Path to temporary file
        """
        temp_file = tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False)
        temp_file.write(content)
        temp_file.close()
        return temp_file.name

    @staticmethod
    def cleanup_temp_file(file_path: str) -> None:
        """Clean up a temporary file.

        Args:
            file_path: Path to temporary file
        """
        try:
            os.unlink(file_path)
        except OSError:
            pass

    @staticmethod
    def assert_restaurant_data(restaurant: Dict[str, Any]) -> None:
        """Assert that restaurant data has required fields.

        Args:
            restaurant: Restaurant data to validate
        """
        required_fields = ["id", "name", "address", "phone", "kosher_type"]
        for field in required_fields:
            assert field in restaurant, f"Missing required field: {field}"
        assert isinstance(restaurant["id"], int), "ID must be an integer"
        assert isinstance(restaurant["name"], str), "Name must be a string"
        assert len(restaurant["name"]) > 0, "Name cannot be empty"

    @staticmethod
    def assert_review_data(review: Dict[str, Any]) -> None:
        """Assert that review data has required fields.

        Args:
            review: Review data to validate
        """
        required_fields = ["id", "restaurant_id", "user_name", "rating", "comment"]
        for field in required_fields:
            assert field in review, f"Missing required field: {field}"
        assert isinstance(review["id"], int), "ID must be an integer"
        assert isinstance(review["rating"], int), "Rating must be an integer"
        assert 1 <= review["rating"] <= 5, "Rating must be between 1 and 5"

    @staticmethod
    def assert_api_response(
        response_data: Dict[str, Any], expected_status: str = "success"
    ) -> None:
        """Assert that API response has expected structure.

        Args:
            response_data: API response data
            expected_status: Expected response status
        """
        assert isinstance(response_data, dict), "Response must be a dictionary"
        if expected_status == "success":
            assert (
                "success" in response_data
            ), "Success response must have 'success' field"
            assert response_data["success"] is True, "Success response must be True"
        elif expected_status == "error":
            assert "error" in response_data, "Error response must have 'error' field"

    @staticmethod
    def mock_database_connection() -> MagicMock:
        """Create a mock database connection.

        Returns:
            Mock database connection
        """
        mock_conn = MagicMock()
        mock_conn.execute.return_value = MagicMock()
        mock_conn.commit.return_value = None
        mock_conn.rollback.return_value = None
        mock_conn.close.return_value = None
        return mock_conn

    @staticmethod
    def mock_redis_connection() -> MagicMock:
        """Create a mock Redis connection.

        Returns:
            Mock Redis connection
        """
        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = True
        mock_redis.exists.return_value = False
        mock_redis.ping.return_value = True
        return mock_redis

    @staticmethod
    def create_test_data_set(size: int = 10) -> List[Dict[str, Any]]:
        """Create a test data set of restaurants.

        Args:
            size: Number of restaurants to create

        Returns:
            List of mock restaurants
        """
        restaurants = []
        for i in range(size):
            restaurant = TestUtils.create_mock_restaurant(
                restaurant_id=i + 1,
                name=f"Test Restaurant {i + 1}",
                address=f"{100 + i} Test St, Miami, FL 33101",
                phone=f"305-555-{i:04d}",
            )
            restaurants.append(restaurant)
        return restaurants

    @staticmethod
    def mock_time(monkeypatch, timestamp: Optional[datetime] = None) -> None:
        """Mock the current time for testing.

        Args:
            monkeypatch: Pytest monkeypatch fixture
            timestamp: Specific timestamp to mock
        """
        if timestamp is None:
            timestamp = datetime(2024, 1, 1, 12, 0, 0)

        def mock_now():
            return timestamp

        monkeypatch.setattr("datetime.datetime.now", mock_now)

    @staticmethod
    def assert_error_response(
        response_data: Dict[str, Any], expected_error: str
    ) -> None:
        """Assert that error response contains expected error.

        Args:
            response_data: Error response data
            expected_error: Expected error message
        """
        assert "error" in response_data, "Error response must have 'error' field"
        assert (
            expected_error in response_data["error"]
        ), f"Error response must contain '{expected_error}'"

    @staticmethod
    def create_mock_feature_flag(
        name: str = "test_flag",
        enabled: bool = True,
        description: str = "Test feature flag",
        **kwargs,
    ) -> Dict[str, Any]:
        """Create a mock feature flag for testing.

        Args:
            name: Feature flag name
            enabled: Whether flag is enabled
            description: Feature flag description
            **kwargs: Additional feature flag fields

        Returns:
            Mock feature flag dictionary
        """
        base_flag = {
            "name": name,
            "enabled": enabled,
            "description": description,
            "version": "1.0",
            "rollout_percentage": 100,
            "target_environments": ["development", "testing"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        base_flag.update(kwargs)
        return base_flag


# Pytest fixtures
@pytest.fixture
def mock_restaurant():
    """Fixture for creating a mock restaurant."""
    return TestUtils.create_mock_restaurant()


@pytest.fixture
def mock_review():
    """Fixture for creating a mock review."""
    return TestUtils.create_mock_review()


@pytest.fixture
def mock_user():
    """Fixture for creating a mock user."""
    return TestUtils.create_mock_user()


@pytest.fixture
def mock_db_manager():
    """Fixture for creating a mock database manager."""
    return TestUtils.create_mock_db_manager()


@pytest.fixture
def mock_cache_manager():
    """Fixture for creating a mock cache manager."""
    return TestUtils.create_mock_cache_manager()


@pytest.fixture
def mock_config():
    """Fixture for creating a mock configuration."""
    return TestUtils.create_mock_config()


@pytest.fixture
def test_app():
    """Fixture for creating a test Flask application."""
    return TestUtils.create_test_app()


@pytest.fixture
def test_client(test_app):
    """Fixture for creating a test client."""
    return TestUtils.create_test_client(test_app)


@pytest.fixture
def mock_feature_flag():
    """Fixture for creating a mock feature flag."""
    return TestUtils.create_mock_feature_flag()


@pytest.fixture
def test_data_set():
    """Fixture for creating a test data set."""
    return TestUtils.create_test_data_set()


# Test decorators
def skip_if_no_database(func):
    """Decorator to skip tests if database is not available."""

    def wrapper(*args, **kwargs):
        try:
            import psycopg2

            return func(*args, **kwargs)
        except ImportError:
            pytest.skip("Database not available")

    return wrapper


def skip_if_no_redis(func):
    """Decorator to skip tests if Redis is not available."""

    def wrapper(*args, **kwargs):
        try:
            import redis

            return func(*args, **kwargs)
        except ImportError:
            pytest.skip("Redis not available")

    return wrapper


def mock_external_api(func):
    """Decorator to mock external API calls."""

    def wrapper(*args, **kwargs):
        with patch("requests.get") as mock_get, patch(
            "requests.post"
        ) as mock_post, patch("requests.put") as mock_put, patch(
            "requests.delete"
        ) as mock_delete:
            # Set up default mock responses
            mock_get.return_value = TestUtils.mock_external_service_response()
            mock_post.return_value = TestUtils.mock_external_service_response(201)
            mock_put.return_value = TestUtils.mock_external_service_response()
            mock_delete.return_value = TestUtils.mock_external_service_response(204)

            return func(*args, **kwargs)

    return wrapper


# Test base classes
class BaseTestCase(unittest.TestCase):
    """Base test case with common utilities."""

    def setUp(self):
        """Set up test case."""
        self.test_utils = TestUtils()

    def tearDown(self):
        """Tear down test case."""
        pass

    def assert_restaurant_data(self, restaurant):
        """Assert restaurant data validity."""
        self.test_utils.assert_restaurant_data(restaurant)

    def assert_review_data(self, review):
        """Assert review data validity."""
        self.test_utils.assert_review_data(review)

    def assert_api_response(self, response_data, expected_status="success"):
        """Assert API response structure."""
        self.test_utils.assert_api_response(response_data, expected_status)


class FlaskTestCase(BaseTestCase):
    """Base test case for Flask applications."""

    def setUp(self):
        """Set up Flask test case."""
        super().setUp()
        self.app = self.test_utils.create_test_app()
        self.client = self.test_utils.create_test_client(self.app)
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Tear down Flask test case."""
        self.app_context.pop()
        super().tearDown()

    def get_json(self, url, **kwargs):
        """Make GET request and return JSON response."""
        response = self.client.get(url, **kwargs)
        return response.get_json()

    def post_json(self, url, data=None, **kwargs):
        """Make POST request and return JSON response."""
        if data is None:
            data = {}
        response = self.client.post(url, json=data, **kwargs)
        return response.get_json()

    def put_json(self, url, data=None, **kwargs):
        """Make PUT request and return JSON response."""
        if data is None:
            data = {}
        response = self.client.put(url, json=data, **kwargs)
        return response.get_json()

    def delete_json(self, url, **kwargs):
        """Make DELETE request and return JSON response."""
        response = self.client.delete(url, **kwargs)
        return response.get_json()
