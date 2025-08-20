import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse

from utils.logging_config import get_logger

from .error_handler import ValidationError

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Unified Data Validation Module.
============================

Provides comprehensive validation utilities for all data types used in the JewGo application.
Consolidates validation logic from across the codebase for consistency and maintainability.

Author: JewGo Development Team
Version: 1.0
"""


class DataValidator:
    """Unified validator for all data types used in the application."""

    # Validation patterns
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    PHONE_PATTERN = re.compile(r"^\+?1?\d{9,15}$")
    ZIP_CODE_PATTERN = re.compile(r"^\d{5}(-\d{4})?$")
    URL_PATTERN = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
        r"localhost|"  # localhost...
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )

    # Valid kosher categories
    VALID_KOSHER_CATEGORIES = ["meat", "dairy", "pareve"]

    # Valid restaurant statuses
    VALID_RESTAURANT_STATUSES = ["active", "inactive", "pending", "suspended"]

    # Valid listing types
    VALID_LISTING_TYPES = [
        "restaurant",
        "catering",
        "bakery",
        "deli",
        "grocery",
        "other",
    ]

    @staticmethod
    def validate_required_fields(
        data: Dict[str, Any], required_fields: List[str]
    ) -> None:
        """Validate that all required fields are present and not empty.

        Args:
            data: Data dictionary to validate
            required_fields: List of required field names

        Raises:
            ValidationError: If any required fields are missing or empty
        """
        missing_fields = []

        for field in required_fields:
            value = data.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)

        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}",
                {"missing_fields": missing_fields},
            )

    @staticmethod
    def validate_field_types(
        data: Dict[str, Any], field_types: Dict[str, type]
    ) -> None:
        """Validate that fields have the correct types.

        Args:
            data: Data dictionary to validate
            field_types: Dictionary mapping field names to expected types

        Raises:
            ValidationError: If any fields have incorrect types
        """
        type_errors = []

        for field, expected_type in field_types.items():
            if field in data:
                value = data[field]
                if not isinstance(value, expected_type):
                    type_errors.append(
                        f"{field}: expected {expected_type.__name__}, got {type(value).__name__}"
                    )

        if type_errors:
            raise ValidationError(
                f"Type validation failed: {', '.join(type_errors)}",
                {"type_errors": type_errors},
            )

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format.

        Args:
            email: Email address to validate

        Returns:
            True if valid, False otherwise
        """
        if not email or not isinstance(email, str):
            return False

        return bool(DataValidator.EMAIL_PATTERN.match(email.strip()))

    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format.

        Args:
            phone: Phone number to validate

        Returns:
            True if valid, False otherwise
        """
        if not phone or not isinstance(phone, str):
            return False

        # Remove all non-digit characters except + for international format
        cleaned_phone = re.sub(r"[^\d+]", "", phone)
        return bool(DataValidator.PHONE_PATTERN.match(cleaned_phone))

    @staticmethod
    def validate_zip_code(zip_code: str) -> bool:
        """Validate ZIP code format.

        Args:
            zip_code: ZIP code to validate

        Returns:
            True if valid, False otherwise
        """
        if not zip_code or not isinstance(zip_code, str):
            return False

        return bool(DataValidator.ZIP_CODE_PATTERN.match(zip_code.strip()))

    @staticmethod
    def validate_url(url: str, require_https: bool = False) -> bool:
        """Validate URL format.

        Args:
            url: URL to validate
            require_https: If True, only accept HTTPS URLs

        Returns:
            True if valid, False otherwise
        """
        if not url or not isinstance(url, str):
            return False

        url = url.strip()

        # Check if URL matches pattern
        if not DataValidator.URL_PATTERN.match(url):
            return False

        # Parse URL for additional validation
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False

            if require_https and parsed.scheme != "https":
                return False

            return True
        except Exception:
            return False

    @staticmethod
    def validate_kosher_category(category: str) -> bool:
        """Validate kosher category.

        Args:
            category: Kosher category to validate

        Returns:
            True if valid, False otherwise
        """
        if not category or not isinstance(category, str):
            return False

        return category.lower() in DataValidator.VALID_KOSHER_CATEGORIES

    @staticmethod
    def validate_restaurant_status(status: str) -> bool:
        """Validate restaurant status.

        Args:
            status: Restaurant status to validate

        Returns:
            True if valid, False otherwise
        """
        if not status or not isinstance(status, str):
            return False

        return status.lower() in DataValidator.VALID_RESTAURANT_STATUSES

    @staticmethod
    def validate_listing_type(listing_type: str) -> bool:
        """Validate listing type.

        Args:
            listing_type: Listing type to validate

        Returns:
            True if valid, False otherwise
        """
        if not listing_type or not isinstance(listing_type, str):
            return False

        return listing_type.lower() in DataValidator.VALID_LISTING_TYPES

    @staticmethod
    def validate_rating(rating: Union[int, float]) -> bool:
        """Validate rating value.

        Args:
            rating: Rating to validate

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(rating, (int, float)):
            return False

        return 0.0 <= float(rating) <= 5.0

    @staticmethod
    def validate_price_level(price_level: int) -> bool:
        """Validate price level.

        Args:
            price_level: Price level to validate

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(price_level, int):
            return False

        return 1 <= price_level <= 4

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """Validate geographic coordinates.

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            return False

        return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0

    @staticmethod
    def validate_hours_format(hours_data: Any) -> Dict[str, Any]:
        """Validate hours of operation format.

        Args:
            hours_data: Hours data to validate

        Returns:
            Validation result with format and data

        Raises:
            ValidationError: If hours data is invalid
        """
        if not hours_data:
            raise ValidationError("Hours data is required")

        # Try to parse as JSON if it's a string
        if isinstance(hours_data, str):
            try:
                parsed = json.loads(hours_data)
                return {"valid": True, "format": "json", "data": parsed}
            except json.JSONDecodeError:
                # Try to parse as text format
                if ":" in hours_data and (
                    "AM" in hours_data.upper() or "PM" in hours_data.upper()
                ):
                    return {"valid": True, "format": "text", "data": hours_data}
                else:
                    raise ValidationError("Invalid hours format")

        # If it's already a dict, validate structure
        elif isinstance(hours_data, dict):
            if "hours" in hours_data and isinstance(hours_data["hours"], dict):
                return {"valid": True, "format": "dict", "data": hours_data}
            else:
                raise ValidationError("Invalid hours dictionary structure")

        else:
            raise ValidationError("Hours data must be string or dictionary")

    @staticmethod
    def validate_restaurant_data(
        data: Dict[str, Any], strict: bool = False
    ) -> Dict[str, Any]:
        """Validate restaurant data comprehensively.

        Args:
            data: Restaurant data to validate
            strict: If True, perform strict validation including optional fields

        Returns:
            Validation result with errors and warnings

        Raises:
            ValidationError: If validation fails
        """
        errors = []
        warnings = []

        # Required fields validation
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

        try:
            DataValidator.validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.extend(e.details.get("missing_fields", []))

        # Field-specific validation
        if data.get("name"):
            if len(data["name"].strip()) < 2:
                errors.append("Restaurant name must be at least 2 characters")
            elif len(data["name"].strip()) > 255:
                errors.append("Restaurant name must be 255 characters or less")

        if data.get("email") and not DataValidator.validate_email(data["email"]):
            errors.append("Invalid email format")

        if data.get("phone_number") and not DataValidator.validate_phone_number(
            data["phone_number"]
        ):
            errors.append("Invalid phone number format")

        if data.get("zip_code") and not DataValidator.validate_zip_code(
            data["zip_code"]
        ):
            errors.append("Invalid ZIP code format")

        if data.get("website") and not DataValidator.validate_url(data["website"]):
            errors.append("Invalid website URL")

        if data.get("kosher_category") and not DataValidator.validate_kosher_category(
            data["kosher_category"]
        ):
            errors.append(
                f"Invalid kosher category. Must be one of: {', '.join(DataValidator.VALID_KOSHER_CATEGORIES)}"
            )

        if data.get("listing_type") and not DataValidator.validate_listing_type(
            data["listing_type"]
        ):
            errors.append(
                f"Invalid listing type. Must be one of: {', '.join(DataValidator.VALID_LISTING_TYPES)}"
            )

        if data.get("status") and not DataValidator.validate_restaurant_status(
            data["status"]
        ):
            errors.append(
                f"Invalid status. Must be one of: {', '.join(DataValidator.VALID_RESTAURANT_STATUSES)}"
            )

        # Coordinate validation
        if data.get("latitude") is not None and data.get("longitude") is not None:
            if not DataValidator.validate_coordinates(
                data["latitude"], data["longitude"]
            ):
                errors.append("Invalid coordinates")

        # Rating validation
        if data.get("rating") is not None:
            if not DataValidator.validate_rating(data["rating"]):
                errors.append("Rating must be between 0 and 5")

        # Price level validation
        if data.get("price_level") is not None:
            if not DataValidator.validate_price_level(data["price_level"]):
                errors.append("Price level must be between 1 and 4")

        # Hours validation
        if data.get("hours_json"):
            try:
                DataValidator.validate_hours_format(data["hours_json"])
            except ValidationError as e:
                errors.append(f"Invalid hours format: {str(e)}")

        # Strict validation for optional fields
        if strict:
            if not data.get("short_description"):
                warnings.append("Short description is recommended")

            if not data.get("image_url"):
                warnings.append("Image URL is recommended")

            if not data.get("website"):
                warnings.append("Website URL is recommended")

        # Return validation result
        result = {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

        if errors:
            raise ValidationError(
                f"Restaurant validation failed: {', '.join(errors)}", result
            )

        return result

    @staticmethod
    def validate_review_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate review data.

        Args:
            data: Review data to validate

        Returns:
            Validation result

        Raises:
            ValidationError: If validation fails
        """
        errors = []

        # Required fields
        required_fields = ["restaurant_id", "rating", "content"]
        try:
            DataValidator.validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.extend(e.details.get("missing_fields", []))

        # Field-specific validation
        if data.get("restaurant_id"):
            if not isinstance(data["restaurant_id"], int) or data["restaurant_id"] <= 0:
                errors.append("Invalid restaurant ID")

        if data.get("rating"):
            if not DataValidator.validate_rating(data["rating"]):
                errors.append("Rating must be between 1 and 5")

        if data.get("content"):
            content = data["content"].strip()
            if len(content) < 10:
                errors.append("Review content must be at least 10 characters")
            elif len(content) > 1000:
                errors.append("Review content must be 1000 characters or less")

        if data.get("user_email") and not DataValidator.validate_email(
            data["user_email"]
        ):
            errors.append("Invalid email format")

        if data.get("title"):
            title = data["title"].strip()
            if len(title) > 200:
                errors.append("Review title must be 200 characters or less")

        # Images validation
        if data.get("images"):
            if not isinstance(data["images"], list):
                errors.append("Images must be a list")
            else:
                for i, image in enumerate(data["images"]):
                    if not isinstance(image, str) or not DataValidator.validate_url(
                        image
                    ):
                        errors.append(f"Invalid image URL at index {i}")

        result = {"valid": len(errors) == 0, "errors": errors}

        if errors:
            raise ValidationError(
                f"Review validation failed: {', '.join(errors)}", result
            )

        return result

    @staticmethod
    def validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user data.

        Args:
            data: User data to validate

        Returns:
            Validation result

        Raises:
            ValidationError: If validation fails
        """
        errors = []

        # Required fields
        required_fields = ["email"]
        try:
            DataValidator.validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.extend(e.details.get("missing_fields", []))

        # Field-specific validation
        if data.get("email") and not DataValidator.validate_email(data["email"]):
            errors.append("Invalid email format")

        if data.get("name"):
            name = data["name"].strip()
            if len(name) < 2:
                errors.append("Name must be at least 2 characters")
            elif len(name) > 100:
                errors.append("Name must be 100 characters or less")

        if data.get("phone") and not DataValidator.validate_phone_number(data["phone"]):
            errors.append("Invalid phone number format")

        # Role validation
        if data.get("role"):
            valid_roles = ["user", "admin", "moderator"]
            if data["role"] not in valid_roles:
                errors.append(f"Invalid role. Must be one of: {', '.join(valid_roles)}")

        result = {"valid": len(errors) == 0, "errors": errors}

        if errors:
            raise ValidationError(
                f"User validation failed: {', '.join(errors)}", result
            )

        return result

    @staticmethod
    def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
        """Sanitize a string value.

        Args:
            value: String to sanitize
            max_length: Maximum length (optional)

        Returns:
            Sanitized string
        """
        if not value or not isinstance(value, str):
            return ""

        # Remove leading/trailing whitespace
        sanitized = value.strip()

        # Remove null bytes and control characters
        sanitized = "".join(char for char in sanitized if ord(char) >= 32)

        # Limit length if specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]

        return sanitized

    @staticmethod
    def sanitize_restaurant_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize restaurant data.

        Args:
            data: Restaurant data to sanitize

        Returns:
            Sanitized data
        """
        sanitized = {}

        for key, value in data.items():
            if isinstance(value, str):
                # Apply appropriate length limits based on field
                max_lengths = {
                    "name": 255,
                    "address": 500,
                    "city": 100,
                    "state": 50,
                    "zip_code": 10,
                    "phone_number": 20,
                    "email": 255,
                    "website": 500,
                    "short_description": 500,
                    "description": 2000,
                }

                max_length = max_lengths.get(key)
                sanitized[key] = DataValidator.sanitize_string(value, max_length)
            else:
                sanitized[key] = value

        return sanitized


# Convenience functions for backward compatibility
def validate_restaurant_data(
    data: Dict[str, Any], strict: bool = False
) -> Dict[str, Any]:
    """Validate restaurant data (convenience function)."""
    return DataValidator.validate_restaurant_data(data, strict)


def validate_review_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate review data (convenience function)."""
    return DataValidator.validate_review_data(data)


def validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate user data (convenience function)."""
    return DataValidator.validate_user_data(data)


def validate_email(email: str) -> bool:
    """Validate email address (convenience function)."""
    return DataValidator.validate_email(email)


def validate_phone_number(phone: str) -> bool:
    """Validate phone number (convenience function)."""
    return DataValidator.validate_phone_number(phone)


def validate_url(url: str, require_https: bool = False) -> bool:
    """Validate URL (convenience function)."""
    return DataValidator.validate_url(url, require_https)


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """Sanitize string (convenience function)."""
    return DataValidator.sanitize_string(value, max_length)
