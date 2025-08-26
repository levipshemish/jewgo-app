import ast
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from utils.error_handler import (
    handle_database_operation,
    handle_operation_with_fallback,
)
from utils.logging_config import get_logger

from .connection_manager import DatabaseConnectionManager
from .models import Base
from .repositories import (
    ImageRepository,
    RestaurantRepository,
    ReviewRepository,
    UserRepository,
)

# Import the dynamic status calculation module
try:
    from utils.restaurant_status import get_restaurant_status, is_restaurant_open
except ImportError:
    # Fallback for when utils module is not available
    def get_restaurant_status(restaurant_data):
        return {
            "is_open": False,
            "status": "unknown",
            "status_reason": "Status calculation not available",
        }

    def is_restaurant_open(restaurant_data) -> bool:
        return False


logger = get_logger(__name__)

#!/usr/bin/env python3
"""Enhanced Database Manager for JewGo App v4.

This module provides a comprehensive database management system for the JewGo application,
using the repository pattern to separate concerns and improve maintainability.

Key Features:
- Repository pattern implementation
- SQLAlchemy 1.4 compatibility with PostgreSQL
- Structured logging with structlog
- Comprehensive restaurant data management
- Kosher supervision categorization
- Search and filtering capabilities
- Geographic location support
- Statistics and reporting

Architecture:
- ConnectionManager: Handles database connections and sessions
- BaseRepository: Generic CRUD operations
- Specific Repositories: Restaurant, Review, User, Image
- DatabaseManager: Orchestrates repositories and provides unified interface

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

from .repositories import (
    ImageRepository,
    RestaurantRepository,
    ReviewRepository,
    UserRepository,
)

# Import the dynamic status calculation module
try:
    from utils.restaurant_status import get_restaurant_status, is_restaurant_open
except ImportError:
    # Fallback for when utils module is not available
    def get_restaurant_status(restaurant_data):
        return {
            "is_open": False,
            "status": "unknown",
            "status_reason": "Status calculation not available",
        }

    def is_restaurant_open(restaurant_data) -> bool:
        return False


class DatabaseManager:
    """Enhanced database manager using repository pattern."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        """Initialize database manager with connection string."""
        # Initialize connection manager
        self.connection_manager = DatabaseConnectionManager(database_url)

        # Initialize repositories
        self.restaurant_repo = RestaurantRepository(self.connection_manager)
        self.review_repo = ReviewRepository(self.connection_manager)
        self.user_repo = UserRepository(self.connection_manager)
        self.image_repo = ImageRepository(self.connection_manager)

        logger.info("Database manager v4 initialized with repository pattern")

    def connect(self) -> bool:
        """Connect to the database and create tables if they don't exist."""
        try:
            success = self.connection_manager.connect()
            if success:
                # Create tables if they don't exist
                Base.metadata.create_all(self.connection_manager.engine)
                logger.info("Database tables created/verified")
            return success
        except Exception as e:
            logger.exception("Failed to connect to database", error=str(e))
            return False

    def disconnect(self) -> None:
        """Disconnect from the database."""
        self.connection_manager.disconnect()

    def close(self) -> None:
        """Close the database connection (alias for disconnect)."""
        self.disconnect()

    def health_check(self) -> bool:
        """Perform a health check on the database connection."""
        return self.connection_manager.health_check()

    def test_connection(self) -> bool:
        """Test the database connection (alias for health_check)."""
        return self.health_check()

    # Restaurant Operations
    @handle_database_operation
    def add_restaurant(self, restaurant_data: Dict[str, Any]) -> bool:
        """Add a new restaurant to the database."""
        # Validate required fields
        required_fields = [
            "name",
            "address",
            "city",
            "state",
            "zip_code",
            "phone_number",
            "kosher_category",
            "listing_type",
        ]
        for field in required_fields:
            if not restaurant_data.get(field):
                logger.error("Missing required field", field=field)
                return False

        # Set default values
        restaurant_data.setdefault("certifying_agency", "ORB")
        restaurant_data.setdefault("created_at", datetime.utcnow())
        restaurant_data.setdefault("updated_at", datetime.utcnow())
        restaurant_data.setdefault("hours_parsed", False)

        # Handle specials field
        if "specials" in restaurant_data and isinstance(
            restaurant_data["specials"], list
        ):
            restaurant_data["specials"] = json.dumps(restaurant_data["specials"])

        result = self.restaurant_repo.create(restaurant_data)
        if result and result.get("created"):
            logger.info(
                "Restaurant added successfully",
                restaurant_id=result.get("id"),
                name=result.get("name", "Unknown"),
            )
            return True
        return False

    @handle_database_operation
    def get_restaurants(
        self,
        kosher_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        as_dict: bool = False,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Any]:
        """Get restaurants with optional filtering and pagination."""
        restaurants = self.restaurant_repo.get_restaurants_with_filters(
            kosher_type=kosher_type,
            status=status,
            limit=limit,
            offset=offset,
            filters=filters,
        )

        if as_dict:
            return [self._restaurant_to_dict(restaurant) for restaurant in restaurants]

        return restaurants

    @handle_operation_with_fallback(fallback_value=0)
    def get_restaurants_count(
        self,
        kosher_type: Optional[str] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of restaurants with optional filtering."""
        return self.restaurant_repo.count(filters or {})

    @handle_database_operation
    def get_restaurant_by_id(self, restaurant_id: int) -> Optional[Dict[str, Any]]:
        """Get a restaurant by its ID."""
        restaurant = self.restaurant_repo.get_by_id(restaurant_id)
        if restaurant:
            return self._restaurant_to_dict(restaurant)
        return None

    @handle_database_operation
    def search_restaurants(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Search restaurants by name or description."""
        restaurants = self.restaurant_repo.search_restaurants(query, limit, offset)
        return [self._restaurant_to_dict(restaurant) for restaurant in restaurants]

    @handle_database_operation
    def search_restaurants_near_location(
        self,
        latitude: float,
        longitude: float,
        radius_miles: float = 10.0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Search restaurants within a radius of a location."""
        restaurants = self.restaurant_repo.search_restaurants_near_location(
            latitude, longitude, radius_miles, limit
        )
        return [self._restaurant_to_dict(restaurant) for restaurant in restaurants]

    @handle_database_operation
    def update_restaurant_data(
        self, restaurant_id: int, update_data: Dict[str, Any]
    ) -> bool:
        """Update restaurant data."""
        update_data["updated_at"] = datetime.utcnow()
        return self.restaurant_repo.update(restaurant_id, update_data)

    @handle_database_operation
    def delete_restaurant(self, restaurant_id: int) -> bool:
        """Delete a restaurant."""
        # Delete associated images first
        self.image_repo.delete_all_restaurant_images(restaurant_id)

        # Delete the restaurant
        return self.restaurant_repo.delete(restaurant_id)

    @handle_operation_with_fallback(fallback_value={})
    def get_restaurant_statistics(self) -> Dict[str, Any]:
        """Get restaurant statistics."""
        return self.restaurant_repo.get_statistics()

    # Review Operations
    @handle_database_operation
    def get_reviews(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get reviews with optional filtering and pagination."""
        reviews = self.review_repo.get_reviews(
            restaurant_id=restaurant_id,
            status=status,
            limit=limit,
            offset=offset,
            filters=filters,
        )
        return [self._review_to_dict(review) for review in reviews]

    @handle_operation_with_fallback(fallback_value=0)
    def get_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of reviews with optional filtering."""
        return self.review_repo.get_reviews_count(restaurant_id, status, filters)

    @handle_database_operation
    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get a review by its ID."""
        review = self.review_repo.get_by_id(review_id)
        if review:
            return self._review_to_dict(review)
        return None

    def create_review(self, review_data: Dict[str, Any]) -> Optional[str]:
        """Create a new review."""
        try:
            return self.review_repo.create_review(review_data)
        except Exception as e:
            logger.exception("Error creating review", error=str(e))
            return None

    def update_review(self, review_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a review."""
        try:
            return self.review_repo.update(review_id, update_data)
        except Exception as e:
            logger.exception("Error updating review", error=str(e))
            return False

    def delete_review(self, review_id: str) -> bool:
        """Delete a review."""
        try:
            return self.review_repo.delete(review_id)
        except Exception as e:
            logger.exception("Error deleting review", error=str(e))
            return False

    def get_review_statistics(self) -> Dict[str, Any]:
        """Get review statistics."""
        try:
            return self.review_repo.get_review_statistics()
        except Exception as e:
            logger.exception("Error getting review statistics", error=str(e))
            return {}

    # User Operations
    @handle_database_operation
    def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get users with optional filtering and pagination."""
        users = self.user_repo.get_users(limit, offset, filters)
        return [self._user_to_dict(user) for user in users]

    @handle_operation_with_fallback(fallback_value=0)
    def get_users_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get total count of users with optional filtering."""
        return self.user_repo.get_users_count(filters)

    @handle_database_operation
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a user by their ID."""
        user = self.user_repo.get_by_id(user_id)
        if user:
            return self._user_to_dict(user)
        return None

    def update_user_role(self, user_id: str, is_super_admin: bool) -> bool:
        """Update user's admin role."""
        try:
            return self.user_repo.update_user_role(user_id, is_super_admin)
        except Exception as e:
            logger.exception("Error updating user role", error=str(e))
            return False

    def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        try:
            # Delete associated sessions and accounts first
            self.user_repo.delete_user_sessions(user_id)
            self.user_repo.delete_user_accounts(user_id)

            # Delete the user
            return self.user_repo.delete_user(user_id)
        except Exception as e:
            logger.exception("Error deleting user", error=str(e))
            return False

    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics."""
        try:
            return self.user_repo.get_user_statistics()
        except Exception as e:
            logger.exception("Error getting user statistics", error=str(e))
            return {}

    # Image Operations
    @handle_database_operation
    def get_restaurant_images(self, restaurant_id: int) -> List[Dict[str, Any]]:
        """Get all images for a specific restaurant."""
        images = self.image_repo.get_restaurant_images(restaurant_id)
        return [self._image_to_dict(image) for image in images]

    @handle_database_operation
    def add_restaurant_image(
        self,
        restaurant_id: int,
        image_url: str,
        image_order: Optional[int] = None,
        cloudinary_public_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Add a new image to a restaurant."""
        image = self.image_repo.add_restaurant_image(
            restaurant_id, image_url, image_order, cloudinary_public_id
        )
        if image:
            return self._image_to_dict(image)
        return None

    @handle_database_operation
    def delete_restaurant_image(self, image_id: int) -> bool:
        """Delete a specific restaurant image."""
        return self.image_repo.delete_restaurant_image(image_id)

    @handle_operation_with_fallback(fallback_value={})
    def get_image_statistics(self) -> Dict[str, Any]:
        """Get image statistics."""
        return self.image_repo.get_image_statistics()

    # Helper methods for data conversion
    def _restaurant_to_dict(self, restaurant) -> Dict[str, Any]:
        """Convert restaurant model to dictionary."""
        try:
            # Get restaurant images
            images = self.image_repo.get_restaurant_images(restaurant.id)
            image_dicts = [self._image_to_dict(img) for img in images]

            # Get restaurant status
            status_info = get_restaurant_status(
                {
                    "hours_json": restaurant.hours_json,
                    "timezone": restaurant.timezone,
                }
            )

            return {
                "id": restaurant.id,
                "name": restaurant.name,
                "address": restaurant.address,
                "city": restaurant.city,
                "state": restaurant.state,
                "zip_code": restaurant.zip_code,
                "phone_number": restaurant.phone_number,
                "website": restaurant.website,
                "certifying_agency": restaurant.certifying_agency,
                "kosher_category": restaurant.kosher_category,
                "listing_type": restaurant.listing_type,
                "google_listing_url": restaurant.google_listing_url,
                "price_range": restaurant.price_range,
                "short_description": restaurant.short_description,
                "hours_of_operation": restaurant.hours_of_operation,
                "hours_json": restaurant.hours_json,
                "hours_last_updated": restaurant.hours_last_updated.isoformat()
                if restaurant.hours_last_updated
                else None,
                "timezone": restaurant.timezone,
                "latitude": restaurant.latitude,
                "longitude": restaurant.longitude,
                "is_cholov_yisroel": restaurant.is_cholov_yisroel,
                "is_pas_yisroel": restaurant.is_pas_yisroel,
                "cholov_stam": restaurant.cholov_stam,
                "image_url": restaurant.image_url,
                "specials": self._safe_json_loads(restaurant.specials, []),
                "status": restaurant.status,
                "google_rating": restaurant.google_rating,
                "google_review_count": restaurant.google_review_count,
                "google_reviews": self._safe_json_loads(restaurant.google_reviews, []),
                "user_email": restaurant.user_email,
                "created_at": restaurant.created_at.isoformat()
                if restaurant.created_at
                else None,
                "updated_at": restaurant.updated_at.isoformat()
                if restaurant.updated_at
                else None,
                "current_time_local": restaurant.current_time_local.isoformat()
                if restaurant.current_time_local
                else None,
                "hours_parsed": restaurant.hours_parsed,
                "images": image_dicts,
                "is_open": status_info.get("is_open", False),
                "status_info": status_info,
            }
        except Exception as e:
            logger.exception("Error converting restaurant to dict", error=str(e))
            return {}

    def _review_to_dict(self, review) -> Dict[str, Any]:
        """Convert review model to dictionary."""
        try:
            return {
                "id": review.id,
                "restaurant_id": review.restaurant_id,
                "user_id": review.user_id,
                "user_name": review.user_name,
                "user_email": review.user_email,
                "rating": review.rating,
                "title": review.title,
                "content": review.content,
                "images": self._safe_json_loads(review.images, []),
                "status": review.status,
                "created_at": review.created_at.isoformat()
                if review.created_at
                else None,
                "updated_at": review.updated_at.isoformat()
                if review.updated_at
                else None,
                "moderator_notes": review.moderator_notes,
                "verified_purchase": review.verified_purchase,
                "helpful_count": review.helpful_count,
                "report_count": review.report_count,
            }
        except Exception as e:
            logger.exception("Error converting review to dict", error=str(e))
            return {}

    def _user_to_dict(self, user) -> Dict[str, Any]:
        """Convert user model to dictionary."""
        try:
            return {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "emailVerified": user.emailVerified.isoformat()
                if user.emailVerified
                else None,
                "image": user.image,
                "isSuperAdmin": user.isSuperAdmin,
                "role": "admin" if user.isSuperAdmin else "user",
                "createdAt": user.createdAt.isoformat() if user.createdAt else None,
                "updatedAt": user.updatedAt.isoformat() if user.updatedAt else None,
            }
        except Exception as e:
            logger.exception("Error converting user to dict", error=str(e))
            return {}

    def _safe_json_loads(self, json_str: Optional[str], default_value: Any) -> Any:
        """Safely parse JSON string or Python literal with fallback to default value."""
        if not json_str:
            return default_value

        # Handle non-string inputs (e.g., already parsed JSON objects)
        if not isinstance(json_str, str):
            # If it's already a list, dict, or other JSON-compatible type, return as is
            if isinstance(json_str, (list, dict, int, float, bool)) or json_str is None:
                return json_str
            logger.debug(
                f"Non-string JSON input: {type(json_str)}, using default value"
            )
            return default_value

        # Remove leading/trailing whitespace
        json_str = json_str.strip()

        # Handle empty strings
        if not json_str:
            return default_value

        # First try to parse as JSON
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            # If JSON parsing fails, try to parse as Python literal (handles single quotes)
            try:
                parsed_data = ast.literal_eval(json_str)
                return parsed_data
            except (ValueError, SyntaxError) as e:
                # Log the specific error and the problematic string (truncated)
                json_preview = (
                    json_str[:100] + "..." if len(json_str) > 100 else json_str
                )
                logger.warning(
                    f"Failed to parse JSON or Python literal: {e}, using default value. JSON preview: {json_preview}"
                )
                return default_value

    def _image_to_dict(self, image) -> Dict[str, Any]:
        """Convert image model to dictionary."""
        try:
            return {
                "id": image.id,
                "restaurant_id": image.restaurant_id,
                "image_url": image.image_url,
                "image_order": image.image_order,
                "cloudinary_public_id": image.cloudinary_public_id,
                "created_at": image.created_at.isoformat()
                if image.created_at
                else None,
                "updated_at": image.updated_at.isoformat()
                if image.updated_at
                else None,
            }
        except Exception as e:
            logger.exception("Error converting image to dict", error=str(e))
            return {}
