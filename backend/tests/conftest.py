#!/usr/bin/env python3
"""Pytest configuration and fixtures for JewGo backend tests."""

import os
import sys
import tempfile
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
import structlog
from database.database_manager_v3 import EnhancedDatabaseManager
from utils.feature_flags import FeatureFlag, FeatureFlagManager

from app import app as flask_app

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def app():
    """Create and configure a new app instance for each test session."""
    # Configure app for testing
    flask_app.config.update(
        {
            "TESTING": True,
            "DATABASE_URL": os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:"),
            "SECRET_KEY": "test-secret-key",
            "WTF_CSRF_ENABLED": False,
        },
    )

    return flask_app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the Flask app."""
    return app.test_cli_runner()


@pytest.fixture
def db_manager():
    """Create a database manager for testing."""
    manager = EnhancedDatabaseManager()
    manager.connect()
    yield manager
    manager.close()


@pytest.fixture
def mock_db_manager():
    """Create a mocked database manager for testing."""
    with patch("database.database_manager_v3.EnhancedDatabaseManager") as mock:
        manager = Mock()
        mock.return_value = manager
        yield manager


@pytest.fixture
def sample_restaurant_data():
    """Sample restaurant data for testing."""
    return {
        "name": "Test Kosher Restaurant",
        "address": "123 Test Street",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "phone_number": "305-555-0123",
        "website": "https://testrestaurant.com",
        "kosher_category": "dairy",
        "certifying_agency": "ORB",
        "is_cholov_yisroel": True,
        "is_pas_yisroel": False,
        "hours_of_operation": "Mon-Fri: 9AM-5PM",
        "latitude": 25.7617,
        "longitude": -80.1918,
    }


@pytest.fixture
def sample_restaurants(sample_restaurant_data):
    """Multiple sample restaurants for testing."""
    restaurants = []

    # Dairy restaurant
    dairy_restaurant = sample_restaurant_data.copy()
    dairy_restaurant["name"] = "Dairy Delight"
    dairy_restaurant["kosher_category"] = "dairy"
    restaurants.append(dairy_restaurant)

    # Meat restaurant
    meat_restaurant = sample_restaurant_data.copy()
    meat_restaurant["name"] = "Meat Master"
    meat_restaurant["kosher_category"] = "meat"
    restaurants.append(meat_restaurant)

    # Pareve restaurant
    pareve_restaurant = sample_restaurant_data.copy()
    pareve_restaurant["name"] = "Pareve Paradise"
    pareve_restaurant["kosher_category"] = "pareve"
    restaurants.append(pareve_restaurant)

    return restaurants


@pytest.fixture
def mock_feature_flags():
    """Mock feature flags for testing."""
    flags = {
        "advanced_search": FeatureFlag(
            name="advanced_search",
            enabled=True,
            description="Advanced search with fuzzy matching",
            version="1.0",
            rollout_percentage=100.0,
        ),
        "reviews_system": FeatureFlag(
            name="reviews_system",
            enabled=False,
            description="Restaurant reviews system",
            version="0.1",
            rollout_percentage=0.0,
        ),
        "loyalty_program": FeatureFlag(
            name="loyalty_program",
            enabled=False,
            description="Loyalty program",
            version="0.1",
            rollout_percentage=0.0,
        ),
    }

    with patch("utils.feature_flags.feature_flag_manager.flags", flags):
        yield flags


@pytest.fixture
def mock_auth_token():
    """Mock authentication token for testing."""
    return {
        "user_id": "test_user_123",
        "role": "admin",
        "permissions": ["read", "write", "admin"],
    }


@pytest.fixture
def mock_request_context(app, mock_auth_token):
    """Mock request context with authentication."""
    with app.test_request_context() as ctx:
        ctx.token_info = mock_auth_token
        yield ctx


@pytest.fixture
def mock_ip_whitelist():
    """Mock IP whitelist for testing."""
    return ["127.0.0.1", "192.168.1.1", "10.0.0.1"]


@pytest.fixture
def mock_google_places_response():
    """Mock Google Places API response."""
    return {
        "results": [
            {
                "place_id": "test_place_id",
                "name": "Test Restaurant",
                "formatted_address": "123 Test St, Miami, FL 33101",
                "formatted_phone_number": "305-555-0123",
                "website": "https://testrestaurant.com",
                "opening_hours": {
                    "open_now": True,
                    "weekday_text": [
                        "Monday: 9:00 AM – 5:00 PM",
                        "Tuesday: 9:00 AM – 5:00 PM",
                        "Wednesday: 9:00 AM – 5:00 PM",
                        "Thursday: 9:00 AM – 5:00 PM",
                        "Friday: 9:00 AM – 5:00 PM",
                        "Saturday: Closed",
                        "Sunday: Closed",
                    ],
                },
                "geometry": {
                    "location": {
                        "lat": 25.7617,
                        "lng": -80.1918,
                    },
                },
            },
        ],
        "status": "OK",
    }


@pytest.fixture
def mock_cloudinary_response():
    """Mock Cloudinary upload response."""
    return {
        "public_id": "test_public_id",
        "secure_url": "https://res.cloudinary.com/test/image/upload/test_public_id.jpg",
        "url": "http://res.cloudinary.com/test/image/upload/test_public_id.jpg",
        "format": "jpg",
        "width": 800,
        "height": 600,
        "bytes": 50000,
    }


@pytest.fixture
def temp_file():
    """Create a temporary file for testing."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        f.write(b"test image data")
        temp_path = f.name

    yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_logger():
    """Mock logger for testing."""
    with patch("structlog.get_logger") as mock:
        logger = Mock()
        mock.return_value = logger
        yield logger


@pytest.fixture
def mock_requests():
    """Mock requests library for testing."""
    with (
        patch("requests.get") as mock_get,
        patch("requests.post") as mock_post,
        patch("requests.put") as mock_put,
        patch("requests.delete") as mock_delete,
    ):
        # Configure default responses
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {}
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = {}
        mock_put.return_value.status_code = 200
        mock_put.return_value.json.return_value = {}
        mock_delete.return_value.status_code = 204

        yield {
            "get": mock_get,
            "post": mock_post,
            "put": mock_put,
            "delete": mock_delete,
        }


@pytest.fixture
def mock_time():
    """Mock time for testing."""
    with patch("datetime.datetime") as mock_datetime:
        # Set a fixed time
        fixed_time = datetime(2024, 1, 1, 12, 0, 0)
        mock_datetime.utcnow.return_value = fixed_time
        mock_datetime.now.return_value = fixed_time
        yield mock_datetime


@pytest.fixture
def sample_specials_data():
    """Sample specials data for testing."""
    return [
        {
            "id": "special_1",
            "title": "Lunch Special",
            "description": "20% off all lunch items",
            "valid_from": "2024-01-01",
            "valid_until": "2024-12-31",
            "days_active": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "time_start": "11:00",
            "time_end": "15:00",
        },
        {
            "id": "special_2",
            "title": "Weekend Brunch",
            "description": "Free coffee with any brunch item",
            "valid_from": "2024-01-01",
            "valid_until": "2024-12-31",
            "days_active": ["saturday", "sunday"],
            "time_start": "10:00",
            "time_end": "14:00",
        },
    ]


@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing."""
    with patch("flask_limiter.util.get_remote_address") as mock:
        mock.return_value = "127.0.0.1"
        yield mock


# Test markers
def pytest_configure(config) -> None:
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers",
        "unit: mark test as a unit test",
    )
    config.addinivalue_line(
        "markers",
        "integration: mark test as an integration test",
    )
    config.addinivalue_line(
        "markers",
        "slow: mark test as slow running",
    )
    config.addinivalue_line(
        "markers",
        "api: mark test as an API test",
    )
    config.addinivalue_line(
        "markers",
        "database: mark test as a database test",
    )
    config.addinivalue_line(
        "markers",
        "feature_flags: mark test as a feature flag test",
    )
    config.addinivalue_line(
        "markers",
        "security: mark test as a security test",
    )
    config.addinivalue_line(
        "markers",
        "performance: mark test as a performance test",
    )
    config.addinivalue_line(
        "markers",
        "e2e: mark test as an end-to-end test",
    )


# Test collection hooks
def pytest_collection_modifyitems(config, items) -> None:
    """Modify test collection to add markers based on test names."""
    for item in items:
        # Add markers based on test file names
        if "test_api_" in item.nodeid:
            item.add_marker(pytest.mark.api)
        if "test_database_" in item.nodeid:
            item.add_marker(pytest.mark.database)
        if "test_security_" in item.nodeid:
            item.add_marker(pytest.mark.security)
        if "test_performance_" in item.nodeid:
            item.add_marker(pytest.mark.performance)
        if "test_e2e_" in item.nodeid:
            item.add_marker(pytest.mark.e2e)
        if "test_feature_flags_" in item.nodeid:
            item.add_marker(pytest.mark.feature_flags)


# Test reporting
def pytest_terminal_summary(terminalreporter, exitstatus, config) -> None:
    """Add custom summary information."""
    if hasattr(terminalreporter, "_numcollected"):
        terminalreporter.write_sep("=", "Test Summary")
        terminalreporter.write_line(
            f"Total tests collected: {terminalreporter._numcollected}",
        )

        if hasattr(terminalreporter, "stats"):
            for category, tests in terminalreporter.stats.items():
                if category in ["passed", "failed", "skipped", "error"]:
                    terminalreporter.write_line(
                        f"{category.capitalize()}: {len(tests)}",
                    )
