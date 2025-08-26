import json
import os
import sys
from typing import Any, Dict, List, Optional

from services import hours_compute, hours_normalizer, hours_sources
from services.base_service import BaseService
from utils.cloudinary_uploader import CloudinaryUploader
from utils.error_handler import NotFoundError, ValidationError

#!/usr/bin/env python3
"""Restaurant service v4 - handles all restaurant-related business logic using DatabaseManager v4."""


class RestaurantServiceV4(BaseService):
    """Service for restaurant-related operations using DatabaseManager v4."""

    def get_all_restaurants(
        self,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Get all restaurants with optional filtering.

        Args:
            filters: Optional dict with filter criteria (location, cuisine_type, etc.)

        Returns:
            List of restaurant dictionaries

        """
        self.log_operation("get_all_restaurants", filters=filters)

        try:
            # Apply any business logic for filtering
            processed_filters = self._process_restaurant_filters(filters or {})

            # Use the database manager v4's get_restaurants method
            restaurants = self.db_manager.get_restaurants(
                limit=1000,  # Get all restaurants
                as_dict=True,
                filters=processed_filters,
            )

            # Apply any post-processing (e.g., add computed fields, format data)
            processed_restaurants = self._process_restaurant_list(restaurants)

            self.logger.info(
                "Successfully retrieved restaurants",
                count=len(processed_restaurants),
            )
            return processed_restaurants

        except Exception as e:
            self.logger.exception("Error retrieving restaurants", error=str(e))
            raise

    def get_restaurant_by_id(self, restaurant_id: int) -> dict[str, Any]:
        """Get a single restaurant by ID.

        Args:
            restaurant_id: The restaurant ID

        Returns:
            Restaurant dictionary

        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If ID is invalid

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        self.log_operation("get_restaurant_by_id", restaurant_id=restaurant_id)

        try:
            restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)

            if not restaurant:
                raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")

            # Apply any post-processing
            processed_restaurant = self._process_restaurant_data(restaurant)

            self.logger.info(
                "Successfully retrieved restaurant", restaurant_id=restaurant_id
            )
            return processed_restaurant

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.exception("Error retrieving restaurant", error=str(e))
            raise

    def search_restaurants(
        self,
        query: str,
        filters: dict[str, Any] | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Search restaurants by name, description, or address.

        Args:
            query: Search query string
            filters: Additional filters to apply
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of matching restaurant dictionaries

        """
        self.log_operation("search_restaurants", query=query, filters=filters)

        try:
            # Use database manager v4's search method
            restaurants = self.db_manager.search_restaurants(
                query=query,
                limit=limit,
                offset=offset,
            )

            # Apply any post-processing
            processed_restaurants = self._process_restaurant_list(restaurants)

            self.logger.info(
                "Successfully searched restaurants",
                query=query,
                count=len(processed_restaurants),
            )
            return processed_restaurants

        except Exception as e:
            self.logger.exception("Error searching restaurants", error=str(e))
            raise

    def search_restaurants_near_location(
        self,
        latitude: float,
        longitude: float,
        radius_miles: float = 10.0,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Search restaurants within a radius of a location.

        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            radius_miles: Search radius in miles
            limit: Maximum number of results

        Returns:
            List of nearby restaurant dictionaries

        """
        self.log_operation(
            "search_restaurants_near_location",
            latitude=latitude,
            longitude=longitude,
            radius_miles=radius_miles,
        )

        try:
            # Use database manager v4's location search method
            restaurants = self.db_manager.search_restaurants_near_location(
                latitude=latitude,
                longitude=longitude,
                radius_miles=radius_miles,
                limit=limit,
            )

            # Apply any post-processing
            processed_restaurants = self._process_restaurant_list(restaurants)

            self.logger.info(
                "Successfully searched restaurants near location",
                count=len(processed_restaurants),
            )
            return processed_restaurants

        except Exception as e:
            self.logger.exception(
                "Error searching restaurants near location", error=str(e)
            )
            raise

    def create_restaurant(self, restaurant_data: dict[str, Any]) -> dict[str, Any]:
        """Create a new restaurant.

        Args:
            restaurant_data: Restaurant data dictionary

        Returns:
            Created restaurant dictionary

        Raises:
            ValidationError: If required fields are missing

        """
        self.log_operation("create_restaurant")

        try:
            # Validate required fields
            self._validate_restaurant_data(restaurant_data)

            # Apply any pre-processing
            processed_data = self._preprocess_restaurant_data(restaurant_data)

            # Use database manager v4's add method
            success = self.db_manager.add_restaurant(processed_data)

            if not success:
                raise Exception("Failed to create restaurant")

            # Get the created restaurant (assuming it has an ID)
            # This is a simplified approach - in practice, you'd want to return the ID
            # and then fetch the restaurant
            created_restaurant = self._get_created_restaurant(processed_data)

            self.logger.info("Successfully created restaurant")
            return created_restaurant

        except ValidationError:
            raise
        except Exception as e:
            self.logger.exception("Error creating restaurant", error=str(e))
            raise

    def update_restaurant(
        self,
        restaurant_id: int,
        update_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Update an existing restaurant.

        Args:
            restaurant_id: Restaurant ID
            update_data: Data to update

        Returns:
            Updated restaurant dictionary

        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If update data is invalid

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        self.log_operation("update_restaurant", restaurant_id=restaurant_id)

        try:
            # Validate update data
            self._validate_restaurant_update_data(update_data)

            # Apply any pre-processing
            processed_data = self._preprocess_restaurant_data(update_data)

            # Use database manager v4's update method
            success = self.db_manager.update_restaurant_data(
                restaurant_id, processed_data
            )

            if not success:
                raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")

            # Get the updated restaurant
            updated_restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)

            if not updated_restaurant:
                raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")

            # Apply any post-processing
            processed_restaurant = self._process_restaurant_data(updated_restaurant)

            self.logger.info(
                "Successfully updated restaurant", restaurant_id=restaurant_id
            )
            return processed_restaurant

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.exception("Error updating restaurant", error=str(e))
            raise

    def delete_restaurant(self, restaurant_id: int) -> bool:
        """Delete a restaurant.

        Args:
            restaurant_id: Restaurant ID

        Returns:
            True if successful

        Raises:
            NotFoundError: If restaurant doesn't exist

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        self.log_operation("delete_restaurant", restaurant_id=restaurant_id)

        try:
            # Use database manager v4's delete method
            success = self.db_manager.delete_restaurant(restaurant_id)

            if not success:
                raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")

            self.logger.info(
                "Successfully deleted restaurant", restaurant_id=restaurant_id
            )
            return True

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.exception("Error deleting restaurant", error=str(e))
            raise

    def get_restaurant_statistics(self) -> dict[str, Any]:
        """Get restaurant statistics.

        Returns:
            Dictionary containing restaurant statistics

        """
        self.log_operation("get_restaurant_statistics")

        try:
            # Use database manager v4's statistics method
            stats = self.db_manager.get_restaurant_statistics()

            self.logger.info("Successfully retrieved restaurant statistics")
            return stats

        except Exception as e:
            self.logger.exception(
                "Error retrieving restaurant statistics", error=str(e)
            )
            raise

    def get_restaurant_images(self, restaurant_id: int) -> list[dict[str, Any]]:
        """Get all images for a restaurant.

        Args:
            restaurant_id: Restaurant ID

        Returns:
            List of image dictionaries

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        self.log_operation("get_restaurant_images", restaurant_id=restaurant_id)

        try:
            # Use database manager v4's image method
            images = self.db_manager.get_restaurant_images(restaurant_id)

            self.logger.info(
                "Successfully retrieved restaurant images",
                restaurant_id=restaurant_id,
                count=len(images),
            )
            return images

        except Exception as e:
            self.logger.exception("Error retrieving restaurant images", error=str(e))
            raise

    def add_restaurant_image(
        self,
        restaurant_id: int,
        image_url: str,
        image_order: int | None = None,
        cloudinary_public_id: str | None = None,
    ) -> dict[str, Any]:
        """Add an image to a restaurant.

        Args:
            restaurant_id: The restaurant ID
            image_url: The image URL
            image_order: Optional image order
            cloudinary_public_id: Optional Cloudinary public ID

        Returns:
            Image data dictionary

        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If data is invalid

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        if not image_url:
            raise ValidationError("Image URL is required")

        self.log_operation("add_restaurant_image", restaurant_id=restaurant_id)

        try:
            # Use database manager v4's image method
            image = self.db_manager.add_restaurant_image(
                restaurant_id=restaurant_id,
                image_url=image_url,
                image_order=image_order,
                cloudinary_public_id=cloudinary_public_id,
            )

            if not image:
                raise Exception("Failed to add restaurant image")

            self.logger.info(
                "Successfully added restaurant image", restaurant_id=restaurant_id
            )
            return image

        except Exception as e:
            self.logger.exception("Error adding restaurant image", error=str(e))
            raise

    def update_restaurant_status(
        self,
        restaurant_id: int,
        status: str,
        action: str,
        reason: str | None = None,
    ) -> bool:
        """Update restaurant submission status (approve/reject).

        Args:
            restaurant_id: The restaurant ID
            status: New status ('approved', 'rejected', 'pending_approval')
            action: Action taken ('approved', 'rejected')
            reason: Optional reason for rejection

        Returns:
            True if successful, False otherwise

        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If data is invalid

        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            raise ValidationError("Invalid restaurant ID")

        if not status or status not in ["approved", "rejected", "pending_approval"]:
            raise ValidationError("Invalid status")

        if not action or action not in ["approved", "rejected"]:
            raise ValidationError("Invalid action")

        self.log_operation(
            "update_restaurant_status",
            restaurant_id=restaurant_id,
            status=status,
            action=action,
            reason=reason,
        )

        try:
            # Check if restaurant exists
            restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
            if not restaurant:
                raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")

            # Prepare update data
            update_data = {
                "submission_status": status,
                "approval_date": self._get_current_timestamp(),
                "approved_by": "admin",  # TODO: Get actual admin user
            }

            # Add rejection reason if provided
            if action == "rejected" and reason:
                update_data["rejection_reason"] = reason

            # Update the restaurant
            success = self.db_manager.update_restaurant(restaurant_id, update_data)

            if success:
                self.logger.info(
                    "Successfully updated restaurant status",
                    restaurant_id=restaurant_id,
                    status=status,
                    action=action,
                )
            else:
                self.logger.error(
                    "Failed to update restaurant status",
                    restaurant_id=restaurant_id,
                    status=status,
                )

            return success

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.exception("Error updating restaurant status", error=str(e))
            raise

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.utcnow().isoformat()

    # Helper methods
    def _process_restaurant_filters(self, filters: dict[str, Any]) -> dict[str, Any]:
        """Process and validate restaurant filters."""
        processed_filters = {}

        # Map service layer filters to database layer filters
        if "location" in filters:
            processed_filters["search"] = filters["location"]
        if "cuisine_type" in filters:
            processed_filters["kosher_category"] = filters["cuisine_type"]
        if "status" in filters:
            processed_filters["status"] = filters["status"]

        return processed_filters

    def _process_restaurant_list(
        self, restaurants: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Process a list of restaurants."""
        processed_restaurants = []
        for restaurant in restaurants:
            processed_restaurant = self._process_restaurant_data(restaurant)
            processed_restaurants.append(processed_restaurant)
        return processed_restaurants

    def _process_restaurant_data(self, restaurant: dict[str, Any]) -> dict[str, Any]:
        """Process individual restaurant data."""
        # Add any computed fields or transformations
        if restaurant.get("hours_json"):
            try:
                hours_data = json.loads(restaurant["hours_json"])
                restaurant["hours_parsed"] = hours_data
            except (json.JSONDecodeError, TypeError):
                restaurant["hours_parsed"] = None

        return restaurant

    def _validate_restaurant_data(self, data: dict[str, Any]) -> None:
        """Validate restaurant data."""
        required_fields = [
            "name",
            "address",
            "city",
            "state",
            "zip_code",
            "phone_number",
        ]
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}"
            )

    def _validate_restaurant_update_data(self, data: dict[str, Any]) -> None:
        """Validate restaurant update data."""
        # Add any update-specific validation logic
        pass

    def _preprocess_restaurant_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Preprocess restaurant data before saving."""
        # Add any preprocessing logic
        return data.copy()

    def _get_created_restaurant(self, data: dict[str, Any]) -> dict[str, Any]:
        """Get the created restaurant data."""
        # This is a simplified approach - in practice, you'd want to return the ID
        # and then fetch the restaurant
        return data
