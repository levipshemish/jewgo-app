import json
from typing import Any
from services.base_service import BaseService
from utils.error_handler import NotFoundError, ValidationError
from utils.error_handler_v2 import (
    handle_database_operation,
    handle_validation_operation,
    create_error_context,
)

# !/usr/bin/env python3
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
        context = create_error_context(filters=filters)
        # Handle database operation with specific error handling
        restaurants = handle_database_operation(
            operation=lambda: self.db_manager.get_restaurants(
                limit=1000,  # Get all restaurants
                as_dict=True,
                filters=self._process_restaurant_filters(filters or {}),
            ),
            operation_name="get_all_restaurants",
            context=context,
        )
        if restaurants is None:
            return []
        # Apply any post-processing (e.g., add computed fields, format data)
        processed_restaurants = self._process_restaurant_list(restaurants)
        self.logger.info(
            "Successfully retrieved restaurants",
            count=len(processed_restaurants),
        )
        return processed_restaurants

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
        # Validate input with specific error handling
        validation_result = handle_validation_operation(
            operation=lambda: self._validate_restaurant_id(restaurant_id),
            operation_name="validate_restaurant_id",
            context=create_error_context(restaurant_id=restaurant_id),
        )
        if validation_result is False:
            raise ValidationError("Invalid restaurant ID")
        self.log_operation("get_restaurant_by_id", restaurant_id=restaurant_id)
        context = create_error_context(restaurant_id=restaurant_id)
        # Handle database operation with specific error handling
        restaurant = handle_database_operation(
            operation=lambda: self.db_manager.get_restaurant_by_id(restaurant_id),
            operation_name="get_restaurant_by_id",
            context=context,
        )
        if not restaurant:
            raise NotFoundError(f"Restaurant with ID {restaurant_id} not found")
        # Apply any post-processing
        processed_restaurant = self._process_restaurant_data(restaurant)
        self.logger.info(
            "Successfully retrieved restaurant", restaurant_id=restaurant_id
        )
        return processed_restaurant

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
            # Use database manager v4's create method via repository
            create_result = self.db_manager.restaurant_repo.create(processed_data)
            if not create_result or not create_result.get("id"):
                raise Exception("Failed to create restaurant")
            
            restaurant_id = create_result["id"]
            
            # Return success with basic restaurant info
            created_restaurant = {
                'id': restaurant_id,
                'name': create_result.get("name"),
                'status': 'pending',
                'message': 'Restaurant created successfully and is pending approval'
            }
                
            self.logger.info("Successfully created restaurant", restaurant_id=restaurant_id)
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

    def get_filter_options(self) -> dict[str, Any]:
        """Get filter options for restaurants.
        Returns:
            Dictionary containing filter options (kosher categories, agencies, etc.)
        """
        self.log_operation("get_filter_options")
        try:
            # Get all restaurants to extract unique values
            restaurants = self.db_manager.get_restaurants()
            # Extract unique kosher categories
            kosher_categories = set()
            certifying_agencies = set()
            for restaurant in restaurants:
                # Handle both dict and object types
                if isinstance(restaurant, dict):
                    kosher_categories.add(restaurant.get("kosher_category"))
                    certifying_agencies.add(restaurant.get("certifying_agency"))
                else:
                    kosher_categories.add(getattr(restaurant, "kosher_category", None))
                    certifying_agencies.add(
                        getattr(restaurant, "certifying_agency", None)
                    )
            # Remove None values and convert to sorted lists
            kosher_categories = sorted([cat for cat in kosher_categories if cat])
            certifying_agencies = sorted(
                [agency for agency in certifying_agencies if agency]
            )
            filter_options = {
                "kosherCategories": kosher_categories,
                "agencies": certifying_agencies,
            }
            self.logger.info("Successfully retrieved filter options")
            return filter_options
        except Exception as e:
            self.logger.exception("Error retrieving filter options", error=str(e))
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

    def _validate_restaurant_id(self, restaurant_id: int) -> bool:
        """Validate restaurant ID."""
        return (
            restaurant_id is not None
            and isinstance(restaurant_id, int)
            and restaurant_id > 0
        )

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

    def _preprocess_restaurant_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Preprocess restaurant data before saving."""
        processed_data = data.copy()
        # Handle business_images field - convert JSON string to array if needed
        if "business_images" in processed_data:
            business_images = processed_data["business_images"]
            self.logger.info(
                "Processing business_images",
                original_type=type(business_images),
                original_value=business_images,
            )
            if isinstance(business_images, str):
                try:
                    import json

                    processed_data["business_images"] = json.loads(business_images)
                    self.logger.info(
                        "Converted business_images from JSON string",
                        result=processed_data["business_images"],
                    )
                except (json.JSONDecodeError, TypeError) as e:
                    # If it's not valid JSON, treat it as a single image
                    processed_data["business_images"] = (
                        [business_images] if business_images else []
                    )
                    self.logger.warning(
                        "Failed to parse business_images as JSON", error=str(e)
                    )
            elif not isinstance(business_images, list):
                # If it's not a list, convert to list
                processed_data["business_images"] = (
                    [business_images] if business_images else []
                )
                self.logger.info(
                    "Converted business_images to list",
                    result=processed_data["business_images"],
                )
            else:
                self.logger.info(
                    "business_images already a list",
                    result=processed_data["business_images"],
                )
        # Remove fields that don't exist in the database model
        fields_to_remove = [
            "description",  # Not in model
            "business_email",  # Not in model  
            "hours_open",  # Use hours_of_operation instead
            "submission_status",  # Not in model
            "submission_date",  # Use created_at instead
            "is_owner_submission",  # Not in model
            "owner_name",  # Not in model
            "owner_email",  # Not in model
            "owner_phone",  # Not in model
            "business_license",  # Not in model
            "tax_id",  # Not in model
            "years_in_business",  # Not in model
            "delivery_available",  # Not in model
            "takeout_available",  # Not in model
            "catering_available",  # Not in model
            "preferred_contact_method",  # Not in model
            "preferred_contact_time",  # Not in model
            "contact_notes",  # Not in model
            "instagram_link",  # Not in model
            "facebook_link",  # Not in model
            "tiktok_link",  # Not in model
            "seating_capacity",  # Not in model
        ]
        
        for field in fields_to_remove:
            if field in processed_data:
                self.logger.debug(f"Removing field '{field}' from restaurant data")
                del processed_data[field]
        
        # Handle business_images - use first image as main image_url, then remove the field
        if "business_images" in processed_data and processed_data["business_images"]:
            if isinstance(processed_data["business_images"], list) and len(processed_data["business_images"]) > 0:
                processed_data["image_url"] = processed_data["business_images"][0]
                self.logger.info("Set image_url from first business_image")
            # Remove business_images since it's not in the database model
            del processed_data["business_images"]
            
        # Ensure status is set to pending for new submissions
        if "status" not in processed_data or processed_data["status"] == "active":
            processed_data["status"] = "pending"
            self.logger.info(
                "Set status to pending", original_status=processed_data.get("status")
            )
        # Capitalize kosher category
        if "kosher_category" in processed_data and processed_data["kosher_category"]:
            kosher_category = processed_data["kosher_category"].lower()
            self.logger.info(
                "Processing kosher_category",
                original=processed_data["kosher_category"],
                lowercase=kosher_category,
            )
            if kosher_category == "dairy":
                processed_data["kosher_category"] = "Dairy"
            elif kosher_category == "meat":
                processed_data["kosher_category"] = "Meat"
            elif kosher_category == "pareve":
                processed_data["kosher_category"] = "Pareve"
            self.logger.info(
                "Capitalized kosher_category", result=processed_data["kosher_category"]
            )
        # Handle null values for kosher flags - convert empty strings to None
        kosher_flags = ["is_cholov_yisroel", "is_pas_yisroel", "cholov_stam"]
        for flag in kosher_flags:
            if flag in processed_data:
                if processed_data[flag] == "" or processed_data[flag] is None:
                    processed_data[flag] = None
                elif isinstance(processed_data[flag], str):
                    # Convert string to boolean
                    processed_data[flag] = processed_data[flag].lower() in [
                        "true",
                        "1",
                        "yes",
                    ]
        # Parse address components if full address is provided
        if "address" in processed_data and processed_data["address"]:
            address = processed_data["address"]
            # If address contains city, state, zip, try to parse it
            if "," in address and not processed_data.get("city"):
                parts = address.split(",")
                if len(parts) >= 2:
                    # Extract street address (everything before the first comma)
                    processed_data["address"] = parts[0].strip()
                    # Try to extract city, state, zip from remaining parts
                    remaining = ",".join(parts[1:]).strip()
                    if remaining:
                        # Look for state and zip pattern
                        import re

                        state_zip_pattern = r"([A-Z]{2})\s+(\d{5}(?:-\d{4})?)"
                        match = re.search(state_zip_pattern, remaining)
                        if match:
                            state = match.group(1)
                            zip_code = match.group(2)
                            city = (
                                remaining.replace(f"{state} {zip_code}", "")
                                .strip()
                                .rstrip(",")
                                .strip()
                            )
                            if not processed_data.get("state"):
                                processed_data["state"] = state
                            if not processed_data.get("zip_code"):
                                processed_data["zip_code"] = zip_code
                            if not processed_data.get("city") and city:
                                processed_data["city"] = city
        # Ensure hours_of_operation is included
        if (
            "hours_of_operation" not in processed_data
            and "hours_open" in processed_data
        ):
            processed_data["hours_of_operation"] = processed_data["hours_open"]
        return processed_data

    def _get_created_restaurant(self, data: dict[str, Any]) -> dict[str, Any]:
        """Get the created restaurant data."""
        # Search for the restaurant by name and address to get the full record with ID
        restaurants = self.db_manager.get_restaurants()
        for restaurant in restaurants:
            # Handle both dict and object types
            restaurant_name = (
                restaurant.get("name")
                if isinstance(restaurant, dict)
                else getattr(restaurant, "name", None)
            )
            restaurant_address = (
                restaurant.get("address")
                if isinstance(restaurant, dict)
                else getattr(restaurant, "address", None)
            )
            if restaurant_name == data.get("name") and restaurant_address == data.get(
                "address"
            ):
                # Convert to dict if it's an object
                if isinstance(restaurant, dict):
                    return restaurant
                else:
                    # Convert object to dict
                    return {
                        "id": getattr(restaurant, "id", None),
                        "name": getattr(restaurant, "name", None),
                        "address": getattr(restaurant, "address", None),
                        "city": getattr(restaurant, "city", None),
                        "state": getattr(restaurant, "state", None),
                        "zip_code": getattr(restaurant, "zip_code", None),
                        "phone_number": getattr(restaurant, "phone_number", None),
                        "kosher_category": getattr(restaurant, "kosher_category", None),
                        "listing_type": getattr(restaurant, "listing_type", None),
                        "certifying_agency": getattr(
                            restaurant, "certifying_agency", None
                        ),
                        "created_at": getattr(restaurant, "created_at", None),
                        "updated_at": getattr(restaurant, "updated_at", None),
                        "hours_parsed": getattr(restaurant, "hours_parsed", None),
                    }
        # If not found, return the original data
        return data
