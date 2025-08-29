# !/usr/bin/env python3
"""Restaurant service - handles all restaurant-related business logic."""
import json
import os
import sys
from typing import Any

try:
    from utils.error_handler import NotFoundError, ValidationError
    from utils.hours_parser import parse_hours_blob
    from . import hours_compute, hours_normalizer, hours_sources
    from .base_service import BaseService
except ImportError:
    try:
        from utils.error_handler import NotFoundError, ValidationError
        from utils.hours_parser import parse_hours_blob
        from . import hours_compute, hours_normalizer, hours_sources
        from .base_service import BaseService
    except ImportError:
        sys.path.append(os.path.dirname(__file__))
        sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
        import hours_compute
        import hours_normalizer
        import hours_sources
        from base_service import BaseService
        from utils.error_handler import NotFoundError, ValidationError
        from utils.hours_parser import parse_hours_blob


class RestaurantService(BaseService):
    """Service for restaurant-related operations."""

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
            # Use the database manager's search_places method which returns dictionaries
            restaurants = self.db_manager.search_places(
                query=processed_filters.get("location"),
                category=processed_filters.get("cuisine_type"),
                limit=1000,  # Get all restaurants
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
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation("get_restaurant_by_id", restaurant_id=restaurant_id)
        restaurant = self.db_manager.get_place_by_id(restaurant_id)
        if not restaurant:
            msg = f"Restaurant with ID {restaurant_id} not found"
            raise NotFoundError(msg)
        # Process the restaurant data
        processed_restaurant = self._process_single_restaurant(restaurant)
        self.logger.info(
            "Successfully retrieved restaurant",
            restaurant_id=restaurant_id,
        )
        return processed_restaurant

    def get_restaurant_hours(self, restaurant_id: int) -> dict[str, Any]:
        """Get restaurant hours with computed status.
        Args:
            restaurant_id: The restaurant ID
        Returns:
            Hours data with computed status
        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If ID is invalid
        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation("get_restaurant_hours", restaurant_id=restaurant_id)
        # Get restaurant data
        restaurant = self.db_manager.get_place_by_id(restaurant_id)
        if not restaurant:
            msg = f"Restaurant with ID {restaurant_id} not found"
            raise NotFoundError(msg)
        # Get hours data - try hours_json first, then hours_of_operation
        hours_json = restaurant.get("hours_json") or restaurant.get(
            "hours_of_operation"
        )
        if not hours_json:
            # Return empty hours structure
            return hours_compute.format_hours_for_display({})
        try:
            # Parse hours using robust parser
            if isinstance(hours_json, str):
                parsed_hours = parse_hours_blob(hours_json)
                # Convert parsed format to expected format
                hours_doc = self._convert_parsed_hours_to_expected_format(parsed_hours)
            elif isinstance(hours_json, dict):
                # hours_json is already a dict, check if it has the expected format
                if "weekday_text" in hours_json:
                    # This is Google Places format, convert it
                    hours_doc = self._convert_google_places_hours_to_expected_format(
                        hours_json
                    )
                else:
                    # Assume it's already in the expected format
                    hours_doc = hours_json
            else:
                hours_doc = hours_json
            # Format for display
            formatted_hours = hours_compute.format_hours_for_display(hours_doc)
            self.logger.info(
                "Successfully retrieved restaurant hours",
                restaurant_id=restaurant_id,
            )
            return formatted_hours
        except Exception as e:
            self.logger.warning(
                f"Error parsing hours for restaurant {restaurant_id}: {e}",
                hours_json=hours_json,
            )
            return hours_compute.format_hours_for_display({})

    def _convert_parsed_hours_to_expected_format(self, parsed_hours: dict) -> dict:
        """Convert parsed hours from parse_hours_blob format to hours_compute expected format.
        Args:
            parsed_hours: Hours in format {"Monday": ["11:00 AM-9:30 PM"], ...}
        Returns:
            Hours in format {"hours": {"mon": {"open": "11:00 AM", "close": "9:30 PM", "is_open": true}, ...}}
        """
        day_mapping = {
            "Monday": "mon",
            "Tuesday": "tue",
            "Wednesday": "wed",
            "Thursday": "thu",
            "Friday": "fri",
            "Saturday": "sat",
            "Sunday": "sun",
        }
        converted_hours = {}
        for day_name, time_ranges in parsed_hours.items():
            if not time_ranges:
                continue
            day_abbr = day_mapping.get(day_name)
            if not day_abbr:
                continue
            # Take the first time range (most restaurants have one range per day)
            time_range = time_ranges[0] if time_ranges else ""
            if time_range and time_range.lower() != "closed":
                # Parse the time range (e.g., "11:00 AM-9:30 PM")
                parts = time_range.split("-")
                if len(parts) == 2:
                    open_time = parts[0].strip()
                    close_time = parts[1].strip()
                    converted_hours[day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True,
                    }
                else:
                    # Invalid format, mark as closed
                    converted_hours[day_abbr] = {
                        "open": "",
                        "close": "",
                        "is_open": False,
                    }
            else:
                # Closed day
                converted_hours[day_abbr] = {"open": "", "close": "", "is_open": False}
        return {
            "hours": converted_hours,
            "timezone": "America/New_York",
            "last_updated": None,
        }

    def _convert_google_places_hours_to_expected_format(
        self, google_hours: dict
    ) -> dict:
        """Convert Google Places hours format to hours_compute expected format.
        Args:
            google_hours: Hours in Google Places format with weekday_text array
        Returns:
            Hours in format {"hours": {"mon": {"open": "11:00 AM", "close": "9:30 PM", "is_open": true}, ...}}
        """
        day_mapping = {
            "Monday": "mon",
            "Tuesday": "tue",
            "Wednesday": "wed",
            "Thursday": "thu",
            "Friday": "fri",
            "Saturday": "sat",
            "Sunday": "sun",
        }
        converted_hours = {}
        weekday_text = google_hours.get("weekday_text", [])
        for day_text in weekday_text:
            # Parse format like "Monday: 11:00 AM – 9:30 PM"
            if ":" not in day_text:
                continue
            day_part, time_part = day_text.split(":", 1)
            day_name = day_part.strip()
            time_range = time_part.strip()
            day_abbr = day_mapping.get(day_name)
            if not day_abbr:
                continue
            if time_range.lower() == "closed":
                converted_hours[day_abbr] = {"open": "", "close": "", "is_open": False}
            else:
                # Parse time range like "11:00 AM – 9:30 PM"
                # Handle different dash characters
                time_range = time_range.replace("–", "-").replace("—", "-")
                parts = time_range.split("-")
                if len(parts) == 2:
                    open_time = parts[0].strip()
                    close_time = parts[1].strip()
                    converted_hours[day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True,
                    }
                else:
                    # Invalid format, mark as closed
                    converted_hours[day_abbr] = {
                        "open": "",
                        "close": "",
                        "is_open": False,
                    }
        return {
            "hours": converted_hours,
            "timezone": "America/New_York",
            "last_updated": None,
        }

    def update_restaurant_hours(
        self,
        restaurant_id: int,
        hours_data: dict[str, Any],
        updated_by: str,
        merge_strategy: str = "prefer-incoming",
    ) -> dict[str, Any]:
        """Update restaurant hours.
        Args:
            restaurant_id: The restaurant ID
            hours_data: New hours data
            updated_by: User updating the hours
            merge_strategy: How to merge with existing hours
        Returns:
            Updated hours data
        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If data is invalid
        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation(
            "update_restaurant_hours",
            restaurant_id=restaurant_id,
            updated_by=updated_by,
            merge_strategy=merge_strategy,
        )
        # Get restaurant data
        restaurant = self.db_manager.get_place_by_id(restaurant_id)
        if not restaurant:
            msg = f"Restaurant with ID {restaurant_id} not found"
            raise NotFoundError(msg)
        try:
            # Get current hours
            current_hours_json = restaurant.get("hours_of_operation")
            current_hours = {}
            if current_hours_json:
                if isinstance(current_hours_json, str):
                    current_hours = parse_hours_blob(current_hours_json)
                else:
                    current_hours = current_hours_json
            # Normalize new hours data
            timezone = current_hours.get("timezone", "America/New_York")
            normalized_hours = hours_normalizer.normalize_from_manual(
                hours_data, timezone, updated_by
            )
            # Merge with existing hours if needed
            if merge_strategy != "replace" and current_hours:
                final_hours = hours_normalizer.merge_hours(
                    current_hours, normalized_hours, merge_strategy
                )
            else:
                final_hours = normalized_hours
            # Validate the final hours
            hours_normalizer.validate_hours(final_hours)
            # Update in database
            success = self.db_manager.update_restaurant_data(
                restaurant_id, {"hours_of_operation": json.dumps(final_hours)}
            )
            if not success:
                msg = f"Failed to update hours for restaurant {restaurant_id}"
                raise ValidationError(msg)
            self.logger.info(
                "Successfully updated restaurant hours",
                restaurant_id=restaurant_id,
                updated_by=updated_by,
            )
            return hours_compute.format_hours_for_display(final_hours)
        except Exception as e:
            self.logger.error(
                f"Error updating hours for restaurant {restaurant_id}: {e}",
                hours_data=hours_data,
            )
            raise

    def fetch_hours_from_google(self, restaurant_id: int) -> dict[str, Any]:
        """Fetch hours from Google Places API.
        Args:
            restaurant_id: The restaurant ID
        Returns:
            Updated hours data
        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If no Google place_id
        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation("fetch_hours_from_google", restaurant_id=restaurant_id)
        # Get restaurant data
        restaurant = self.db_manager.get_place_by_id(restaurant_id)
        if not restaurant:
            msg = f"Restaurant with ID {restaurant_id} not found"
            raise NotFoundError(msg)
        # Check for Google place_id
        place_id = restaurant.get("google_place_id")
        if not place_id:
            msg = f"No Google place_id for restaurant {restaurant_id}"
            raise ValidationError(msg)
        try:
            # Fetch from Google
            google_hours = hours_sources.fetch_google_hours(place_id)
            if not google_hours:
                msg = f"No hours found in Google Places for restaurant {restaurant_id}"
                raise ValidationError(msg)
            # Get current hours for timezone
            current_hours_json = restaurant.get("hours_of_operation")
            timezone = "America/New_York"  # Default
            if current_hours_json:
                if isinstance(current_hours_json, str):
                    current_hours = parse_hours_blob(current_hours_json)
                else:
                    current_hours = current_hours_json
                timezone = current_hours.get("timezone", timezone)
            # Normalize Google hours
            normalized_hours = hours_normalizer.normalize_from_google(
                google_hours, timezone
            )
            # Merge with existing hours
            if current_hours_json:
                if isinstance(current_hours_json, str):
                    current_hours = parse_hours_blob(current_hours_json)
                else:
                    current_hours = current_hours_json
                final_hours = hours_normalizer.merge_hours(
                    current_hours, normalized_hours, "prefer-incoming"
                )
            else:
                final_hours = normalized_hours
            # Update in database
            success = self.db_manager.update_restaurant_data(
                restaurant_id, {"hours_of_operation": json.dumps(final_hours)}
            )
            if not success:
                msg = f"Failed to update hours for restaurant {restaurant_id}"
                raise ValidationError(msg)
            self.logger.info(
                "Successfully fetched and updated hours from Google",
                restaurant_id=restaurant_id,
                place_id=place_id,
            )
            return hours_compute.format_hours_for_display(final_hours)
        except Exception as e:
            self.logger.error(
                f"Error fetching Google hours for restaurant {restaurant_id}: {e}",
                place_id=place_id,
            )
            raise

    def fetch_hours_from_orb(self, restaurant_id: int) -> dict[str, Any]:
        """Fetch hours from ORB certification data.
        Args:
            restaurant_id: The restaurant ID
        Returns:
            Updated hours data
        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If no ORB cert URL
        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation("fetch_hours_from_orb", restaurant_id=restaurant_id)
        # Get restaurant data
        restaurant = self.db_manager.get_place_by_id(restaurant_id)
        if not restaurant:
            msg = f"Restaurant with ID {restaurant_id} not found"
            raise NotFoundError(msg)
        # Check for ORB cert URL
        cert_url = restaurant.get("orb_cert_url") or restaurant.get("website")
        if not cert_url:
            msg = f"No ORB cert URL for restaurant {restaurant_id}"
            raise ValidationError(msg)
        try:
            # Fetch from ORB
            orb_hours = hours_sources.fetch_orb_hours(cert_url)
            if not orb_hours:
                msg = f"No hours found in ORB data for restaurant {restaurant_id}"
                raise ValidationError(msg)
            # Get current hours for timezone
            current_hours_json = restaurant.get("hours_of_operation")
            timezone = "America/New_York"  # Default
            if current_hours_json:
                if isinstance(current_hours_json, str):
                    current_hours = parse_hours_blob(current_hours_json)
                else:
                    current_hours = current_hours_json
                timezone = current_hours.get("timezone", timezone)
            # Normalize ORB hours
            normalized_hours = hours_normalizer.normalize_from_orb(orb_hours, timezone)
            # Merge with existing hours
            if current_hours_json:
                if isinstance(current_hours_json, str):
                    current_hours = parse_hours_blob(current_hours_json)
                else:
                    current_hours = current_hours_json
                final_hours = hours_normalizer.merge_hours(
                    current_hours, normalized_hours, "prefer-incoming"
                )
            else:
                final_hours = normalized_hours
            # Update in database
            success = self.db_manager.update_restaurant_data(
                restaurant_id, {"hours_of_operation": json.dumps(final_hours)}
            )
            if not success:
                msg = f"Failed to update hours for restaurant {restaurant_id}"
                raise ValidationError(msg)
            self.logger.info(
                "Successfully fetched and updated hours from ORB",
                restaurant_id=restaurant_id,
                cert_url=cert_url,
            )
            return hours_compute.format_hours_for_display(final_hours)
        except Exception as e:
            self.logger.error(
                f"Error fetching ORB hours for restaurant {restaurant_id}: {e}",
                cert_url=cert_url,
            )
            raise

    def update_restaurant(
        self,
        restaurant_id: int,
        update_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Update a restaurant's information.
        Args:
            restaurant_id: The restaurant ID
            update_data: Dictionary containing fields to update
        Returns:
            Updated restaurant dictionary
        Raises:
            NotFoundError: If restaurant doesn't exist
            ValidationError: If data is invalid
        """
        if (
            not restaurant_id
            or not isinstance(restaurant_id, int)
            or restaurant_id <= 0
        ):
            msg = "Invalid restaurant ID"
            raise ValidationError(msg)
        self.log_operation("update_restaurant", restaurant_id=restaurant_id)
        # Validate and process update data
        processed_data = self._validate_restaurant_update_data(update_data)
        # Update the restaurant
        success = self.db_manager.update_restaurant_data(restaurant_id, processed_data)
        if not success:
            msg = f"Failed to update restaurant {restaurant_id}"
            raise ValidationError(msg)
        # Get the updated restaurant
        updated_restaurant = self.get_restaurant_by_id(restaurant_id)
        self.logger.info(
            "Successfully updated restaurant",
            restaurant_id=restaurant_id,
        )
        return updated_restaurant

    def _process_restaurant_filters(self, filters: dict[str, Any]) -> dict[str, Any]:
        """Process and validate restaurant filters.
        Args:
            filters: Raw filter dictionary
        Returns:
            Processed filter dictionary
        """
        processed_filters = {}
        # Process location filter
        if "location" in filters and filters["location"]:
            processed_filters["location"] = str(filters["location"]).strip()
        # Process cuisine type filter
        if "cuisine_type" in filters and filters["cuisine_type"]:
            processed_filters["cuisine_type"] = str(filters["cuisine_type"]).strip()
        return processed_filters

    def _process_restaurant_list(
        self,
        restaurants: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Process a list of restaurants.
        Args:
            restaurants: List of restaurant dictionaries
        Returns:
            Processed list of restaurant dictionaries
        """
        processed_restaurants = []
        for restaurant in restaurants:
            processed_restaurant = self._process_single_restaurant(restaurant)
            processed_restaurants.append(processed_restaurant)
        return processed_restaurants

    def _process_single_restaurant(self, restaurant: dict[str, Any]) -> dict[str, Any]:
        """Process a single restaurant's data.
        Args:
            restaurant: Restaurant dictionary
        Returns:
            Processed restaurant dictionary
        """
        processed = restaurant.copy()
        # Format phone number if present
        if "phone_number" in processed and processed["phone_number"]:
            processed["phone_number"] = self._format_phone_number(
                processed["phone_number"]
            )
        # Add computed fields
        processed["is_open"] = self._compute_open_status(restaurant)
        processed["hours_status"] = self._get_hours_status(restaurant)
        return processed

    def _compute_open_status(self, restaurant: dict[str, Any]) -> bool:
        """Compute if restaurant is currently open.
        Args:
            restaurant: Restaurant dictionary
        Returns:
            True if restaurant is open
        """
        try:
            hours_json = restaurant.get("hours_of_operation")
            if not hours_json:
                return False
            if isinstance(hours_json, str):
                hours_doc = parse_hours_blob(hours_json)
            else:
                hours_doc = hours_json
            return hours_compute.is_open_now(hours_doc)
        except Exception as e:
            self.logger.warning(f"Error computing open status: {e}")
            return False

    def _get_hours_status(self, restaurant: dict[str, Any]) -> str:
        """Get hours status for restaurant.
        Args:
            restaurant: Restaurant dictionary
        Returns:
            Hours status string
        """
        try:
            hours_json = restaurant.get("hours_of_operation")
            if not hours_json:
                return "missing"
            if isinstance(hours_json, str):
                hours_doc = parse_hours_blob(hours_json)
            else:
                hours_doc = hours_json
            # Check if hours are valid
            try:
                hours_normalizer.validate_hours(hours_doc)
                return "valid"
            except ValueError:
                return "invalid"
        except Exception as e:
            self.logger.warning(f"Error getting hours status: {e}")
            return "error"

    def _validate_restaurant_update_data(
        self,
        update_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Validate restaurant update data.
        Args:
            update_data: Raw update data
        Returns:
            Validated update data
        Raises:
            ValidationError: If data is invalid
        """
        validated_data = {}
        # Validate name
        if "name" in update_data:
            name = str(update_data["name"]).strip()
            if not name:
                msg = "Restaurant name cannot be empty"
                raise ValidationError(msg)
            validated_data["name"] = name
        # Validate address
        if "address" in update_data:
            address = str(update_data["address"]).strip()
            if not address:
                msg = "Restaurant address cannot be empty"
                raise ValidationError(msg)
            validated_data["address"] = address
        # Validate phone number
        if "phone_number" in update_data:
            phone = str(update_data["phone_number"]).strip()
            if phone:
                validated_data["phone_number"] = self._format_phone_number(phone)
        # Validate website
        if "website" in update_data:
            website = str(update_data["website"]).strip()
            if website and not website.startswith(("http://", "https://")):
                website = "https://" + website
            validated_data["website"] = website
        # Validate kosher category
        if "kosher_category" in update_data:
            kosher_category = str(update_data["kosher_category"]).strip()
            valid_categories = ["meat", "dairy", "pareve"]
            if kosher_category not in valid_categories:
                msg = f"Invalid kosher category. Must be one of: {valid_categories}"
                raise ValidationError(msg)
            validated_data["kosher_category"] = kosher_category
        return validated_data

    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for display.
        Args:
            phone: Raw phone number string
        Returns:
            Formatted phone number
        """
        # Remove all non-digit characters
        digits = "".join(filter(str.isdigit, phone))
        # Format based on length
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == "1":
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        else:
            return phone  # Return original if can't format
