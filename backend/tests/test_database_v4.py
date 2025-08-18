import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from database.database_manager_v4 import DatabaseManager
from database.connection_manager import DatabaseConnectionManager
from database.repositories.restaurant_repository import RestaurantRepository
from database.repositories.review_repository import ReviewRepository
from database.repositories.user_repository import UserRepository
from database.repositories.image_repository import ImageRepository
from database.models import Restaurant, Review, User, RestaurantImage






#!/usr/bin/env python3
"""Comprehensive tests for DatabaseManager v4 and repositories."""

# Import the new database components
class TestDatabaseManagerV4:
    """Test cases for DatabaseManager v4."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.connect.return_value = True
        mock_cm.health_check.return_value = True
        return mock_cm

    @pytest.fixture
    def db_manager(self, mock_connection_manager):
        """Create a DatabaseManager instance with mocked dependencies."""
        with patch('database.database_manager_v4.DatabaseConnectionManager', return_value=mock_connection_manager):
            manager = DatabaseManager()
            manager.connection_manager = mock_connection_manager
            return manager

    def test_initialization(self, db_manager):
        """Test DatabaseManager initialization."""
        assert db_manager.connection_manager is not None
        assert db_manager.restaurant_repo is not None
        assert db_manager.review_repo is not None
        assert db_manager.user_repo is not None
        assert db_manager.image_repo is not None

    def test_connect(self, db_manager, mock_connection_manager):
        """Test database connection."""
        result = db_manager.connect()
        assert result is True
        mock_connection_manager.connect.assert_called_once()

    def test_health_check(self, db_manager, mock_connection_manager):
        """Test health check."""
        result = db_manager.health_check()
        assert result is True
        mock_connection_manager.health_check.assert_called_once()

    def test_disconnect(self, db_manager, mock_connection_manager):
        """Test database disconnection."""
        db_manager.disconnect()
        mock_connection_manager.disconnect.assert_called_once()


class TestRestaurantRepository:
    """Test cases for RestaurantRepository."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.get_session.return_value = Mock()
        mock_cm.session_scope.return_value.__enter__ = Mock(return_value=Mock())
        mock_cm.session_scope.return_value.__exit__ = Mock(return_value=None)
        return mock_cm

    @pytest.fixture
    def restaurant_repo(self, mock_connection_manager):
        """Create a RestaurantRepository instance."""
        return RestaurantRepository(mock_connection_manager)

    def test_get_restaurants_with_filters(self, restaurant_repo, mock_connection_manager):
        """Test getting restaurants with filters."""
        # Mock session and query
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_restaurant = Mock(spec=Restaurant)
        mock_restaurant.id = 1
        mock_restaurant.name = "Test Restaurant"
        mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.offset.return_value.all.return_value = [mock_restaurant]

        # Test with filters
        result = restaurant_repo.get_restaurants_with_filters(
            kosher_type="dairy",
            status="active",
            limit=10,
            offset=0,
            filters={"search": "test"}
        )

        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].name == "Test Restaurant"

    def test_search_restaurants(self, restaurant_repo, mock_connection_manager):
        """Test searching restaurants."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_restaurant = Mock(spec=Restaurant)
        mock_restaurant.id = 1
        mock_restaurant.name = "Test Restaurant"
        mock_session.query.return_value.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.offset.return_value.all.return_value = [mock_restaurant]

        result = restaurant_repo.search_restaurants("test", limit=10, offset=0)

        assert len(result) == 1
        assert result[0].name == "Test Restaurant"

    def test_get_restaurant_by_name(self, restaurant_repo, mock_connection_manager):
        """Test getting restaurant by name."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_restaurant = Mock(spec=Restaurant)
        mock_restaurant.id = 1
        mock_restaurant.name = "Test Restaurant"
        mock_session.query.return_value.filter.return_value.first.return_value = mock_restaurant

        result = restaurant_repo.get_restaurant_by_name("Test Restaurant")

        assert result is not None
        assert result.name == "Test Restaurant"

    def test_get_statistics(self, restaurant_repo, mock_connection_manager):
        """Test getting restaurant statistics."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        # Mock statistics queries
        mock_session.query.return_value.filter.return_value.count.return_value = 100
        mock_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = [("dairy", 50), ("meat", 30), ("pareve", 20)]

        result = restaurant_repo.get_statistics()

        assert "total_restaurants" in result
        assert "kosher_categories" in result


class TestReviewRepository:
    """Test cases for ReviewRepository."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.get_session.return_value = Mock()
        mock_cm.session_scope.return_value.__enter__ = Mock(return_value=Mock())
        mock_cm.session_scope.return_value.__exit__ = Mock(return_value=None)
        return mock_cm

    @pytest.fixture
    def review_repo(self, mock_connection_manager):
        """Create a ReviewRepository instance."""
        return ReviewRepository(mock_connection_manager)

    def test_get_reviews(self, review_repo, mock_connection_manager):
        """Test getting reviews."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_review = Mock(spec=Review)
        mock_review.id = "rev_123"
        mock_review.restaurant_id = 1
        mock_review.user_id = "user_123"
        mock_review.rating = 5
        mock_review.content = "Great food!"
        mock_session.query.return_value.filter.return_value.order_by.return_value.limit.return_value.offset.return_value.all.return_value = [mock_review]

        result = review_repo.get_reviews(restaurant_id=1, status="approved")

        assert len(result) == 1
        assert result[0].id == "rev_123"
        assert result[0].rating == 5

    def test_create_review(self, review_repo, mock_connection_manager):
        """Test creating a review."""
        mock_session = Mock()
        mock_connection_manager.session_scope.return_value.__enter__ = Mock(return_value=mock_session)
        mock_connection_manager.session_scope.return_value.__exit__ = Mock(return_value=None)
        
        review_data = {
            "restaurant_id": 1,
            "user_id": "user_123",
            "user_name": "Test User",
            "rating": 5,
            "content": "Great food!"
        }

        result = review_repo.create_review(review_data)

        assert result is not None
        assert result.startswith("rev_")

    def test_update_review_status(self, review_repo, mock_connection_manager):
        """Test updating review status."""
        mock_session = Mock()
        mock_connection_manager.session_scope.return_value.__enter__ = Mock(return_value=mock_session)
        mock_connection_manager.session_scope.return_value.__exit__ = Mock(return_value=None)
        
        mock_session.query.return_value.filter.return_value.first.return_value = Mock(spec=Review)

        result = review_repo.update_review_status("rev_123", "approved", "Good review")

        assert result is True

    def test_get_review_statistics(self, review_repo, mock_connection_manager):
        """Test getting review statistics."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        # Mock statistics queries
        mock_session.query.return_value.count.return_value = 100
        mock_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = [("approved", 80), ("pending", 15), ("rejected", 5)]

        result = review_repo.get_review_statistics()

        assert "total_reviews" in result
        assert "status_distribution" in result


class TestUserRepository:
    """Test cases for UserRepository."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.get_session.return_value = Mock()
        mock_cm.session_scope.return_value.__enter__ = Mock(return_value=Mock())
        mock_cm.session_scope.return_value.__exit__ = Mock(return_value=None)
        return mock_cm

    @pytest.fixture
    def user_repo(self, mock_connection_manager):
        """Create a UserRepository instance."""
        return UserRepository(mock_connection_manager)

    def test_get_users(self, user_repo, mock_connection_manager):
        """Test getting users."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_user = Mock(spec=User)
        mock_user.id = "user_123"
        mock_user.name = "Test User"
        mock_user.email = "test@example.com"
        mock_user.isSuperAdmin = False
        mock_session.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_user]

        result = user_repo.get_users(limit=10, offset=0)

        assert len(result) == 1
        assert result[0].id == "user_123"
        assert result[0].name == "Test User"

    def test_update_user_role(self, user_repo, mock_connection_manager):
        """Test updating user role."""
        mock_session = Mock()
        mock_connection_manager.session_scope.return_value.__enter__ = Mock(return_value=mock_session)
        mock_connection_manager.session_scope.return_value.__exit__ = Mock(return_value=None)
        
        mock_session.query.return_value.filter.return_value.first.return_value = Mock(spec=User)

        result = user_repo.update_user_role("user_123", True)

        assert result is True

    def test_get_user_statistics(self, user_repo, mock_connection_manager):
        """Test getting user statistics."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        # Mock statistics queries
        mock_session.query.return_value.count.return_value = 100
        mock_session.query.return_value.filter.return_value.count.return_value = 10

        result = user_repo.get_user_statistics()

        assert "total_users" in result
        assert "admin_users" in result


class TestImageRepository:
    """Test cases for ImageRepository."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.get_session.return_value = Mock()
        mock_cm.session_scope.return_value.__enter__ = Mock(return_value=Mock())
        mock_cm.session_scope.return_value.__exit__ = Mock(return_value=None)
        return mock_cm

    @pytest.fixture
    def image_repo(self, mock_connection_manager):
        """Create an ImageRepository instance."""
        return ImageRepository(mock_connection_manager)

    def test_get_restaurant_images(self, image_repo, mock_connection_manager):
        """Test getting restaurant images."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        mock_image = Mock(spec=RestaurantImage)
        mock_image.id = 1
        mock_image.restaurant_id = 1
        mock_image.image_url = "https://example.com/image.jpg"
        mock_image.image_order = 1
        mock_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_image]

        result = image_repo.get_restaurant_images(1)

        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].image_url == "https://example.com/image.jpg"

    def test_add_restaurant_image(self, image_repo, mock_connection_manager):
        """Test adding a restaurant image."""
        mock_session = Mock()
        mock_connection_manager.session_scope.return_value.__enter__ = Mock(return_value=mock_session)
        mock_connection_manager.session_scope.return_value.__exit__ = Mock(return_value=None)
        
        # Mock the max order query
        mock_session.query.return_value.filter.return_value.scalar.return_value = 0

        result = image_repo.add_restaurant_image(
            restaurant_id=1,
            image_url="https://example.com/image.jpg",
            image_order=1
        )

        assert result is not None

    def test_get_image_statistics(self, image_repo, mock_connection_manager):
        """Test getting image statistics."""
        mock_session = Mock()
        mock_connection_manager.get_session.return_value = mock_session
        
        # Mock statistics queries
        mock_session.query.return_value.count.return_value = 50
        mock_session.query.return_value.filter.return_value.count.return_value = 40
        mock_session.query.return_value.distinct.return_value.count.return_value = 25

        result = image_repo.get_image_statistics()

        assert "total_images" in result
        assert "restaurants_with_images" in result


class TestDatabaseManagerV4Integration:
    """Integration tests for DatabaseManager v4."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.connect.return_value = True
        mock_cm.health_check.return_value = True
        mock_cm.get_session.return_value = Mock()
        mock_cm.session_scope.return_value.__enter__ = Mock(return_value=Mock())
        mock_cm.session_scope.return_value.__exit__ = Mock(return_value=None)
        return mock_cm

    @pytest.fixture
    def db_manager(self, mock_connection_manager):
        """Create a DatabaseManager instance with mocked dependencies."""
        with patch('database.database_manager_v4.DatabaseConnectionManager', return_value=mock_connection_manager):
            manager = DatabaseManager()
            manager.connection_manager = mock_connection_manager
            return manager

    def test_restaurant_operations(self, db_manager):
        """Test restaurant operations through DatabaseManager."""
        # Mock restaurant data
        restaurant_data = {
            "id": 1,
            "name": "Test Restaurant",
            "address": "123 Test St",
            "city": "Test City",
            "state": "FL",
            "zip_code": "12345",
            "phone_number": "555-1234",
            "kosher_category": "dairy",
            "listing_type": "restaurant",
            "status": "active"
        }

        # Mock the repository methods
        db_manager.restaurant_repo.get_by_id = Mock(return_value=Mock(**restaurant_data))
        db_manager.image_repo.get_restaurant_images = Mock(return_value=[])

        # Test getting restaurant by ID
        result = db_manager.get_restaurant_by_id(1)

        assert result is not None
        assert result["name"] == "Test Restaurant"
        assert result["kosher_category"] == "dairy"

    def test_review_operations(self, db_manager):
        """Test review operations through DatabaseManager."""
        # Mock review data
        review_data = {
            "id": "rev_123",
            "restaurant_id": 1,
            "user_id": "user_123",
            "user_name": "Test User",
            "rating": 5,
            "content": "Great food!",
            "status": "approved"
        }

        # Mock the repository methods
        db_manager.review_repo.get_by_id = Mock(return_value=Mock(**review_data))

        # Test getting review by ID
        result = db_manager.get_review_by_id("rev_123")

        assert result is not None
        assert result["id"] == "rev_123"
        assert result["rating"] == 5

    def test_user_operations(self, db_manager):
        """Test user operations through DatabaseManager."""
        # Mock user data
        user_data = {
            "id": "user_123",
            "name": "Test User",
            "email": "test@example.com",
            "isSuperAdmin": False
        }

        # Mock the repository methods
        db_manager.user_repo.get_by_id = Mock(return_value=Mock(**user_data))

        # Test getting user by ID
        result = db_manager.get_user_by_id("user_123")

        assert result is not None
        assert result["id"] == "user_123"
        assert result["name"] == "Test User"

    def test_image_operations(self, db_manager):
        """Test image operations through DatabaseManager."""
        # Mock image data
        image_data = {
            "id": 1,
            "restaurant_id": 1,
            "image_url": "https://example.com/image.jpg",
            "image_order": 1
        }

        # Mock the repository methods
        db_manager.image_repo.get_restaurant_images = Mock(return_value=[Mock(**image_data)])

        # Test getting restaurant images
        result = db_manager.get_restaurant_images(1)

        assert len(result) == 1
        assert result[0]["id"] == 1
        assert result[0]["image_url"] == "https://example.com/image.jpg"


class TestErrorHandling:
    """Test error handling in DatabaseManager v4."""

    @pytest.fixture
    def mock_connection_manager(self):
        """Create a mock connection manager that raises exceptions."""
        mock_cm = Mock(spec=DatabaseConnectionManager)
        mock_cm.connect.side_effect = Exception("Connection failed")
        mock_cm.health_check.side_effect = Exception("Health check failed")
        return mock_cm

    @pytest.fixture
    def db_manager(self, mock_connection_manager):
        """Create a DatabaseManager instance with error-prone dependencies."""
        with patch('database.database_manager_v4.DatabaseConnectionManager', return_value=mock_connection_manager):
            manager = DatabaseManager()
            manager.connection_manager = mock_connection_manager
            return manager

    def test_connection_failure(self, db_manager, mock_connection_manager):
        """Test handling of connection failures."""
        result = db_manager.connect()
        assert result is False

    def test_health_check_failure(self, db_manager, mock_connection_manager):
        """Test handling of health check failures."""
        result = db_manager.health_check()
        assert result is False

    def test_repository_error_handling(self, db_manager):
        """Test error handling in repositories."""
        # Mock repository to raise exception
        db_manager.restaurant_repo.get_by_id = Mock(side_effect=Exception("Database error"))

        # Test that exceptions are properly handled
        result = db_manager.get_restaurant_by_id(1)
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__])
