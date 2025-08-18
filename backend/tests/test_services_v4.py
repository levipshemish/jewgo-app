import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from services.restaurant_service_v4 import RestaurantServiceV4
from services.review_service_v4 import ReviewServiceV4
from services.user_service_v4 import UserServiceV4
from utils.error_handler import NotFoundError, ValidationError






#!/usr/bin/env python3
"""Comprehensive tests for Service Layer v4."""

# Import the new service components
class TestRestaurantServiceV4:
    """Test cases for RestaurantServiceV4."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        mock_db = Mock()
        mock_db.get_restaurants.return_value = []
        mock_db.get_restaurant_by_id.return_value = None
        mock_db.search_restaurants.return_value = []
        mock_db.search_restaurants_near_location.return_value = []
        mock_db.add_restaurant.return_value = True
        mock_db.update_restaurant_data.return_value = True
        mock_db.delete_restaurant.return_value = True
        mock_db.get_restaurant_statistics.return_value = {}
        mock_db.get_restaurant_images.return_value = []
        mock_db.add_restaurant_image.return_value = {}
        return mock_db

    @pytest.fixture
    def restaurant_service(self, mock_db_manager):
        """Create a RestaurantServiceV4 instance."""
        return RestaurantServiceV4(db_manager=mock_db_manager)

    def test_get_all_restaurants(self, restaurant_service, mock_db_manager):
        """Test getting all restaurants."""
        # Mock restaurant data
        mock_restaurants = [
            {
                "id": 1,
                "name": "Test Restaurant 1",
                "address": "123 Test St",
                "city": "Test City",
                "state": "FL",
                "zip_code": "12345",
                "phone_number": "555-1234",
                "kosher_category": "dairy",
                "listing_type": "restaurant",
                "status": "active"
            },
            {
                "id": 2,
                "name": "Test Restaurant 2",
                "address": "456 Test Ave",
                "city": "Test City",
                "state": "FL",
                "zip_code": "12346",
                "phone_number": "555-5678",
                "kosher_category": "meat",
                "listing_type": "restaurant",
                "status": "active"
            }
        ]
        mock_db_manager.get_restaurants.return_value = mock_restaurants

        result = restaurant_service.get_all_restaurants()

        assert len(result) == 2
        assert result[0]["name"] == "Test Restaurant 1"
        assert result[1]["name"] == "Test Restaurant 2"
        mock_db_manager.get_restaurants.assert_called_once()

    def test_get_all_restaurants_with_filters(self, restaurant_service, mock_db_manager):
        """Test getting all restaurants with filters."""
        mock_restaurants = [
            {
                "id": 1,
                "name": "Test Restaurant",
                "kosher_category": "dairy"
            }
        ]
        mock_db_manager.get_restaurants.return_value = mock_restaurants

        filters = {"location": "Miami", "cuisine_type": "dairy"}
        result = restaurant_service.get_all_restaurants(filters=filters)

        assert len(result) == 1
        # Verify filters were processed correctly
        mock_db_manager.get_restaurants.assert_called_once()
        call_args = mock_db_manager.get_restaurants.call_args
        assert call_args[1]["filters"]["search"] == "Miami"
        assert call_args[1]["filters"]["kosher_category"] == "dairy"

    def test_get_restaurant_by_id_success(self, restaurant_service, mock_db_manager):
        """Test getting restaurant by ID successfully."""
        mock_restaurant = {
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
        mock_db_manager.get_restaurant_by_id.return_value = mock_restaurant

        result = restaurant_service.get_restaurant_by_id(1)

        assert result is not None
        assert result["id"] == 1
        assert result["name"] == "Test Restaurant"
        mock_db_manager.get_restaurant_by_id.assert_called_once_with(1)

    def test_get_restaurant_by_id_not_found(self, restaurant_service, mock_db_manager):
        """Test getting restaurant by ID when not found."""
        mock_db_manager.get_restaurant_by_id.return_value = None

        with pytest.raises(NotFoundError):
            restaurant_service.get_restaurant_by_id(999)

    def test_get_restaurant_by_id_invalid_id(self, restaurant_service):
        """Test getting restaurant by invalid ID."""
        with pytest.raises(ValidationError):
            restaurant_service.get_restaurant_by_id(0)

        with pytest.raises(ValidationError):
            restaurant_service.get_restaurant_by_id(-1)

        with pytest.raises(ValidationError):
            restaurant_service.get_restaurant_by_id("invalid")

    def test_search_restaurants(self, restaurant_service, mock_db_manager):
        """Test searching restaurants."""
        mock_restaurants = [
            {
                "id": 1,
                "name": "Test Restaurant",
                "kosher_category": "dairy"
            }
        ]
        mock_db_manager.search_restaurants.return_value = mock_restaurants

        result = restaurant_service.search_restaurants("test", limit=10, offset=0)

        assert len(result) == 1
        assert result[0]["name"] == "Test Restaurant"
        mock_db_manager.search_restaurants.assert_called_once_with(
            query="test",
            limit=10,
            offset=0
        )

    def test_search_restaurants_near_location(self, restaurant_service, mock_db_manager):
        """Test searching restaurants near location."""
        mock_restaurants = [
            {
                "id": 1,
                "name": "Test Restaurant",
                "latitude": 25.7617,
                "longitude": -80.1918
            }
        ]
        mock_db_manager.search_restaurants_near_location.return_value = mock_restaurants

        result = restaurant_service.search_restaurants_near_location(
            latitude=25.7617,
            longitude=-80.1918,
            radius_miles=5.0,
            limit=10
        )

        assert len(result) == 1
        assert result[0]["name"] == "Test Restaurant"
        mock_db_manager.search_restaurants_near_location.assert_called_once_with(
            latitude=25.7617,
            longitude=-80.1918,
            radius_miles=5.0,
            limit=10
        )

    def test_create_restaurant_success(self, restaurant_service, mock_db_manager):
        """Test creating restaurant successfully."""
        restaurant_data = {
            "name": "New Restaurant",
            "address": "789 New St",
            "city": "New City",
            "state": "FL",
            "zip_code": "12347",
            "phone_number": "555-9999",
            "kosher_category": "pareve",
            "listing_type": "restaurant"
        }

        result = restaurant_service.create_restaurant(restaurant_data)

        assert result is not None
        mock_db_manager.add_restaurant.assert_called_once()

    def test_create_restaurant_missing_fields(self, restaurant_service):
        """Test creating restaurant with missing required fields."""
        restaurant_data = {
            "name": "New Restaurant"
            # Missing required fields
        }

        with pytest.raises(ValidationError):
            restaurant_service.create_restaurant(restaurant_data)

    def test_update_restaurant_success(self, restaurant_service, mock_db_manager):
        """Test updating restaurant successfully."""
        update_data = {
            "name": "Updated Restaurant",
            "phone_number": "555-8888"
        }

        # Mock the updated restaurant
        updated_restaurant = {
            "id": 1,
            "name": "Updated Restaurant",
            "phone_number": "555-8888"
        }
        mock_db_manager.get_restaurant_by_id.return_value = updated_restaurant

        result = restaurant_service.update_restaurant(1, update_data)

        assert result is not None
        assert result["name"] == "Updated Restaurant"
        mock_db_manager.update_restaurant_data.assert_called_once_with(1, update_data)

    def test_update_restaurant_not_found(self, restaurant_service, mock_db_manager):
        """Test updating restaurant that doesn't exist."""
        mock_db_manager.update_restaurant_data.return_value = False

        with pytest.raises(NotFoundError):
            restaurant_service.update_restaurant(999, {"name": "Updated"})

    def test_delete_restaurant_success(self, restaurant_service, mock_db_manager):
        """Test deleting restaurant successfully."""
        result = restaurant_service.delete_restaurant(1)

        assert result is True
        mock_db_manager.delete_restaurant.assert_called_once_with(1)

    def test_delete_restaurant_not_found(self, restaurant_service, mock_db_manager):
        """Test deleting restaurant that doesn't exist."""
        mock_db_manager.delete_restaurant.return_value = False

        with pytest.raises(NotFoundError):
            restaurant_service.delete_restaurant(999)

    def test_get_restaurant_statistics(self, restaurant_service, mock_db_manager):
        """Test getting restaurant statistics."""
        mock_stats = {
            "total_restaurants": 100,
            "kosher_categories": {
                "dairy": 40,
                "meat": 35,
                "pareve": 25
            }
        }
        mock_db_manager.get_restaurant_statistics.return_value = mock_stats

        result = restaurant_service.get_restaurant_statistics()

        assert result == mock_stats
        mock_db_manager.get_restaurant_statistics.assert_called_once()

    def test_get_restaurant_images(self, restaurant_service, mock_db_manager):
        """Test getting restaurant images."""
        mock_images = [
            {
                "id": 1,
                "restaurant_id": 1,
                "image_url": "https://example.com/image1.jpg",
                "image_order": 1
            },
            {
                "id": 2,
                "restaurant_id": 1,
                "image_url": "https://example.com/image2.jpg",
                "image_order": 2
            }
        ]
        mock_db_manager.get_restaurant_images.return_value = mock_images

        result = restaurant_service.get_restaurant_images(1)

        assert len(result) == 2
        assert result[0]["image_url"] == "https://example.com/image1.jpg"
        mock_db_manager.get_restaurant_images.assert_called_once_with(1)

    def test_add_restaurant_image(self, restaurant_service, mock_db_manager):
        """Test adding restaurant image."""
        mock_image = {
            "id": 3,
            "restaurant_id": 1,
            "image_url": "https://example.com/image3.jpg",
            "image_order": 3
        }
        mock_db_manager.add_restaurant_image.return_value = mock_image

        result = restaurant_service.add_restaurant_image(
            restaurant_id=1,
            image_url="https://example.com/image3.jpg",
            image_order=3
        )

        assert result == mock_image
        mock_db_manager.add_restaurant_image.assert_called_once_with(
            restaurant_id=1,
            image_url="https://example.com/image3.jpg",
            image_order=3,
            cloudinary_public_id=None
        )

    def test_add_restaurant_image_missing_url(self, restaurant_service):
        """Test adding restaurant image without URL."""
        with pytest.raises(ValidationError):
            restaurant_service.add_restaurant_image(restaurant_id=1, image_url="")

    def test_process_restaurant_data_with_hours(self, restaurant_service):
        """Test processing restaurant data with hours JSON."""
        restaurant_data = {
            "id": 1,
            "name": "Test Restaurant",
            "hours_json": '{"monday": {"open": "09:00", "close": "17:00"}}'
        }

        result = restaurant_service._process_restaurant_data(restaurant_data)

        assert result["hours_parsed"] == {"monday": {"open": "09:00", "close": "17:00"}}

    def test_process_restaurant_data_without_hours(self, restaurant_service):
        """Test processing restaurant data without hours JSON."""
        restaurant_data = {
            "id": 1,
            "name": "Test Restaurant"
        }

        result = restaurant_service._process_restaurant_data(restaurant_data)

        assert "hours_parsed" not in result


class TestReviewServiceV4:
    """Test cases for ReviewServiceV4."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        mock_db = Mock()
        mock_db.get_reviews.return_value = []
        mock_db.get_reviews_count.return_value = 0
        mock_db.get_review_by_id.return_value = None
        mock_db.create_review.return_value = "rev_123"
        mock_db.update_review.return_value = True
        mock_db.delete_review.return_value = True
        mock_db.get_review_statistics.return_value = {}
        return mock_db

    @pytest.fixture
    def review_service(self, mock_db_manager):
        """Create a ReviewServiceV4 instance."""
        return ReviewServiceV4(db_manager=mock_db_manager)

    def test_get_reviews(self, review_service, mock_db_manager):
        """Test getting reviews."""
        mock_reviews = [
            {
                "id": "rev_123",
                "restaurant_id": 1,
                "user_id": "user_123",
                "user_name": "Test User",
                "rating": 5,
                "content": "Great food!",
                "status": "approved"
            }
        ]
        mock_db_manager.get_reviews.return_value = mock_reviews

        result = review_service.get_reviews(restaurant_id=1, status="approved")

        assert len(result) == 1
        assert result[0]["id"] == "rev_123"
        assert result[0]["rating"] == 5
        mock_db_manager.get_reviews.assert_called_once()

    def test_get_reviews_count(self, review_service, mock_db_manager):
        """Test getting reviews count."""
        mock_db_manager.get_reviews_count.return_value = 50

        result = review_service.get_reviews_count(restaurant_id=1, status="approved")

        assert result == 50
        mock_db_manager.get_reviews_count.assert_called_once()

    def test_get_review_by_id_success(self, review_service, mock_db_manager):
        """Test getting review by ID successfully."""
        mock_review = {
            "id": "rev_123",
            "restaurant_id": 1,
            "user_id": "user_123",
            "rating": 5,
            "content": "Great food!"
        }
        mock_db_manager.get_review_by_id.return_value = mock_review

        result = review_service.get_review_by_id("rev_123")

        assert result is not None
        assert result["id"] == "rev_123"
        mock_db_manager.get_review_by_id.assert_called_once_with("rev_123")

    def test_get_review_by_id_not_found(self, review_service, mock_db_manager):
        """Test getting review by ID when not found."""
        mock_db_manager.get_review_by_id.return_value = None

        result = review_service.get_review_by_id("rev_999")

        assert result is None

    def test_get_review_by_id_invalid_id(self, review_service):
        """Test getting review by invalid ID."""
        with pytest.raises(ValidationError):
            review_service.get_review_by_id("")

    def test_create_review_success(self, review_service, mock_db_manager):
        """Test creating review successfully."""
        review_data = {
            "restaurant_id": 1,
            "user_id": "user_123",
            "user_name": "Test User",
            "rating": 5,
            "content": "Great food!"
        }

        result = review_service.create_review(review_data)

        assert result == "rev_123"
        mock_db_manager.create_review.assert_called_once()

    def test_create_review_missing_fields(self, review_service):
        """Test creating review with missing required fields."""
        review_data = {
            "restaurant_id": 1,
            "rating": 5
            # Missing required fields
        }

        with pytest.raises(ValidationError):
            review_service.create_review(review_data)

    def test_create_review_invalid_rating(self, review_service):
        """Test creating review with invalid rating."""
        review_data = {
            "restaurant_id": 1,
            "user_id": "user_123",
            "user_name": "Test User",
            "rating": 6,  # Invalid rating
            "content": "Great food!"
        }

        with pytest.raises(ValidationError):
            review_service.create_review(review_data)

    def test_update_review_success(self, review_service, mock_db_manager):
        """Test updating review successfully."""
        update_data = {
            "rating": 4,
            "content": "Updated review"
        }

        result = review_service.update_review("rev_123", update_data)

        assert result is True
        mock_db_manager.update_review.assert_called_once_with("rev_123", update_data)

    def test_update_review_not_found(self, review_service, mock_db_manager):
        """Test updating review that doesn't exist."""
        mock_db_manager.update_review.return_value = False

        with pytest.raises(NotFoundError):
            review_service.update_review("rev_999", {"rating": 4})

    def test_delete_review_success(self, review_service, mock_db_manager):
        """Test deleting review successfully."""
        result = review_service.delete_review("rev_123")

        assert result is True
        mock_db_manager.delete_review.assert_called_once_with("rev_123")

    def test_delete_review_not_found(self, review_service, mock_db_manager):
        """Test deleting review that doesn't exist."""
        mock_db_manager.delete_review.return_value = False

        with pytest.raises(NotFoundError):
            review_service.delete_review("rev_999")

    def test_update_review_status(self, review_service, mock_db_manager):
        """Test updating review status."""
        result = review_service.update_review_status(
            review_id="rev_123",
            status="approved",
            moderator_notes="Good review"
        )

        assert result is True
        mock_db_manager.update_review.assert_called_once_with(
            "rev_123",
            {"status": "approved", "moderator_notes": "Good review"}
        )

    def test_update_review_status_missing_status(self, review_service):
        """Test updating review status without status."""
        with pytest.raises(ValidationError):
            review_service.update_review_status("rev_123", "")


class TestUserServiceV4:
    """Test cases for UserServiceV4."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        mock_db = Mock()
        mock_db.get_users.return_value = []
        mock_db.get_users_count.return_value = 0
        mock_db.get_user_by_id.return_value = None
        mock_db.update_user_role.return_value = True
        mock_db.delete_user.return_value = True
        mock_db.get_user_statistics.return_value = {}
        return mock_db

    @pytest.fixture
    def user_service(self, mock_db_manager):
        """Create a UserServiceV4 instance."""
        return UserServiceV4(db_manager=mock_db_manager)

    def test_get_users(self, user_service, mock_db_manager):
        """Test getting users."""
        mock_users = [
            {
                "id": "user_123",
                "name": "Test User",
                "email": "test@example.com",
                "isSuperAdmin": False
            }
        ]
        mock_db_manager.get_users.return_value = mock_users

        result = user_service.get_users(limit=10, offset=0)

        assert len(result) == 1
        assert result[0]["id"] == "user_123"
        assert result[0]["name"] == "Test User"
        mock_db_manager.get_users.assert_called_once()

    def test_get_users_count(self, user_service, mock_db_manager):
        """Test getting users count."""
        mock_db_manager.get_users_count.return_value = 100

        result = user_service.get_users_count()

        assert result == 100
        mock_db_manager.get_users_count.assert_called_once()

    def test_get_user_by_id_success(self, user_service, mock_db_manager):
        """Test getting user by ID successfully."""
        mock_user = {
            "id": "user_123",
            "name": "Test User",
            "email": "test@example.com",
            "isSuperAdmin": False
        }
        mock_db_manager.get_user_by_id.return_value = mock_user

        result = user_service.get_user_by_id("user_123")

        assert result is not None
        assert result["id"] == "user_123"
        assert result["name"] == "Test User"
        mock_db_manager.get_user_by_id.assert_called_once_with("user_123")

    def test_get_user_by_id_not_found(self, user_service, mock_db_manager):
        """Test getting user by ID when not found."""
        mock_db_manager.get_user_by_id.return_value = None

        result = user_service.get_user_by_id("user_999")

        assert result is None

    def test_get_user_by_id_invalid_id(self, user_service):
        """Test getting user by invalid ID."""
        with pytest.raises(ValidationError):
            user_service.get_user_by_id("")

    def test_update_user_role_success(self, user_service, mock_db_manager):
        """Test updating user role successfully."""
        result = user_service.update_user_role("user_123", True)

        assert result is True
        mock_db_manager.update_user_role.assert_called_once_with("user_123", True)

    def test_update_user_role_not_found(self, user_service, mock_db_manager):
        """Test updating user role for non-existent user."""
        mock_db_manager.update_user_role.return_value = False

        with pytest.raises(NotFoundError):
            user_service.update_user_role("user_999", True)

    def test_delete_user_success(self, user_service, mock_db_manager):
        """Test deleting user successfully."""
        result = user_service.delete_user("user_123")

        assert result is True
        mock_db_manager.delete_user.assert_called_once_with("user_123")

    def test_delete_user_not_found(self, user_service, mock_db_manager):
        """Test deleting user that doesn't exist."""
        mock_db_manager.delete_user.return_value = False

        with pytest.raises(NotFoundError):
            user_service.delete_user("user_999")

    def test_get_user_statistics(self, user_service, mock_db_manager):
        """Test getting user statistics."""
        mock_stats = {
            "total_users": 100,
            "admin_users": 5,
            "verified_users": 80
        }
        mock_db_manager.get_user_statistics.return_value = mock_stats

        result = user_service.get_user_statistics()

        assert result == mock_stats
        mock_db_manager.get_user_statistics.assert_called_once()

    def test_get_admin_users(self, user_service, mock_db_manager):
        """Test getting admin users."""
        mock_admin_users = [
            {
                "id": "admin_123",
                "name": "Admin User",
                "email": "admin@example.com",
                "isSuperAdmin": True
            }
        ]
        mock_db_manager.get_users.return_value = mock_admin_users

        result = user_service.get_admin_users()

        assert len(result) == 1
        assert result[0]["isSuperAdmin"] is True
        mock_db_manager.get_users.assert_called_once()

    def test_get_users_by_role(self, user_service, mock_db_manager):
        """Test getting users by role."""
        mock_users = [
            {
                "id": "user_123",
                "name": "Regular User",
                "isSuperAdmin": False
            }
        ]
        mock_db_manager.get_users.return_value = mock_users

        result = user_service.get_users_by_role("user", limit=10, offset=0)

        assert len(result) == 1
        assert result[0]["isSuperAdmin"] is False
        mock_db_manager.get_users.assert_called_once()

    def test_get_users_by_role_invalid_role(self, user_service):
        """Test getting users by invalid role."""
        with pytest.raises(ValidationError):
            user_service.get_users_by_role("invalid_role")

    def test_search_users(self, user_service, mock_db_manager):
        """Test searching users."""
        mock_users = [
            {
                "id": "user_123",
                "name": "Test User",
                "email": "test@example.com"
            }
        ]
        mock_db_manager.get_users.return_value = mock_users

        result = user_service.search_users("test", limit=10, offset=0)

        assert len(result) == 1
        assert result[0]["name"] == "Test User"
        mock_db_manager.get_users.assert_called_once()

    def test_search_users_empty_query(self, user_service):
        """Test searching users with empty query."""
        with pytest.raises(ValidationError):
            user_service.search_users("")

    def test_validate_user_data(self, user_service):
        """Test user data validation."""
        # Valid data
        valid_data = {
            "name": "Test User",
            "email": "test@example.com"
        }
        user_service._validate_user_data(valid_data)  # Should not raise

        # Missing required fields
        invalid_data = {
            "name": "Test User"
            # Missing email
        }
        with pytest.raises(ValidationError):
            user_service._validate_user_data(invalid_data)

        # Invalid email format
        invalid_email_data = {
            "name": "Test User",
            "email": "invalid-email"
        }
        with pytest.raises(ValidationError):
            user_service._validate_user_data(invalid_email_data)


if __name__ == "__main__":
    pytest.main([__file__])
