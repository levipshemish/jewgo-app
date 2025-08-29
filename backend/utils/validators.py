# !/usr/bin/env python3
"""
Unified Validators Module
=========================
Centralized validation functions to eliminate code duplication across the codebase.
This module consolidates all validation logic that was previously duplicated.
Author: JewGo Development Team
Version: 1.0
"""
import re
from typing import Any, Dict
import requests
from .logging_config import get_logger

logger = get_logger(__name__)


class WebsiteValidator:
    """Unified website URL validation functionality."""

    @staticmethod
    def validate_website_url(
        url: str,
        timeout: int = 5,
        strict_mode: bool = False,
        fallback_to_get: bool = True,
    ) -> bool:
        """Validate if a website URL is accessible and properly formatted.
        Args:
            url: URL to validate
            timeout: Request timeout in seconds (default: 5)
            strict_mode: If True, only accept 200 status codes (default: False)
            fallback_to_get: If True, fall back to GET request if HEAD fails (default: True)
        Returns:
            True if valid, False otherwise
        """
        if not url:
            logger.debug("Empty URL provided")
            return False
        # Normalize scheme
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        # Try HEAD request first (more efficient)
        try:
            response = requests.head(url, timeout=timeout, allow_redirects=True)
            if strict_mode:
                is_valid = response.status_code == 200
            else:
                is_valid = response.status_code < 400
            logger.debug(
                "Website HEAD validation",
                url=url,
                status_code=response.status_code,
                is_valid=is_valid,
                strict_mode=strict_mode,
            )
            if is_valid:
                return True
        except Exception as e:
            logger.debug("Website HEAD request failed", url=url, error=str(e))
            if not fallback_to_get:
                return False
        # Fall back to GET request if HEAD failed or was invalid
        if fallback_to_get:
            try:
                response = requests.get(url, timeout=timeout + 2, allow_redirects=True)
                if strict_mode:
                    is_valid = response.status_code == 200
                else:
                    is_valid = response.status_code < 400
                logger.debug(
                    "Website GET validation",
                    url=url,
                    status_code=response.status_code,
                    is_valid=is_valid,
                    strict_mode=strict_mode,
                )
                return is_valid
            except Exception as e:
                logger.debug("Website GET request failed", url=url, error=str(e))
                return False
        return False


class EmailValidator:
    """Unified email validation functionality."""

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format.
        Args:
            email: Email address to validate
        Returns:
            True if valid format, False otherwise
        """
        if not email:
            return False
        # Basic email regex pattern
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))


class PhoneValidator:
    """Unified phone number validation functionality."""

    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format.
        Args:
            phone: Phone number to validate
        Returns:
            True if valid format, False otherwise
        """
        if not phone:
            return False
        # Remove all non-digit characters
        digits_only = re.sub(r"\D", "", phone)
        # Check if we have 10-15 digits (international format)
        return 10 <= len(digits_only) <= 15


class CoordinateValidator:
    """Unified coordinate validation functionality."""

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """Validate latitude and longitude coordinates.
        Args:
            lat: Latitude value
            lng: Longitude value
        Returns:
            True if valid coordinates, False otherwise
        """
        try:
            lat_float = float(lat)
            lng_float = float(lng)
            # Check valid ranges
            return -90 <= lat_float <= 90 and -180 <= lng_float <= 180
        except (ValueError, TypeError):
            return False


class RatingValidator:
    """Unified rating validation functionality."""

    @staticmethod
    def validate_rating(rating: float) -> bool:
        """Validate rating value.
        Args:
            rating: Rating value to validate
        Returns:
            True if valid rating, False otherwise
        """
        try:
            rating_float = float(rating)
            return 0 <= rating_float <= 5
        except (ValueError, TypeError):
            return False


class PriceLevelValidator:
    """Unified price level validation functionality."""

    @staticmethod
    def validate_price_level(price_level: int) -> bool:
        """Validate price level value.
        Args:
            price_level: Price level to validate
        Returns:
            True if valid price level, False otherwise
        """
        try:
            return 1 <= int(price_level) <= 4
        except (ValueError, TypeError):
            return False


class RestaurantDataValidator:
    """Unified restaurant data validation functionality."""

    @staticmethod
    def validate_restaurant_data(
        data: Dict[str, Any], strict: bool = False
    ) -> Dict[str, Any]:
        """Validate restaurant data structure.
        Args:
            data: Restaurant data dictionary
            strict: If True, perform strict validation
        Returns:
            Validated data dictionary
        """
        validated_data = data.copy()
        # Required fields for strict validation
        if strict:
            required_fields = ["name", "address"]
            for field in required_fields:
                if not data.get(field):
                    raise ValueError(f"Missing required field: {field}")
        # Validate optional fields if present
        if "email" in data and data["email"]:
            if not EmailValidator.validate_email(data["email"]):
                raise ValueError("Invalid email format")
        if "phone" in data and data["phone"]:
            if not PhoneValidator.validate_phone_number(data["phone"]):
                raise ValueError("Invalid phone number format")
        if "website" in data and data["website"]:
            if not WebsiteValidator.validate_website_url(data["website"]):
                raise ValueError("Invalid website URL")
        if "rating" in data and data["rating"] is not None:
            if not RatingValidator.validate_rating(data["rating"]):
                raise ValueError("Invalid rating value")
        if "price_level" in data and data["price_level"] is not None:
            if not PriceLevelValidator.validate_price_level(data["price_level"]):
                raise ValueError("Invalid price level")
        if "latitude" in data and "longitude" in data:
            if data["latitude"] is not None and data["longitude"] is not None:
                if not CoordinateValidator.validate_coordinates(
                    data["latitude"], data["longitude"]
                ):
                    raise ValueError("Invalid coordinates")
        return validated_data


# Convenience functions for backward compatibility
def validate_website_url(url: str, timeout: int = 5, strict_mode: bool = False) -> bool:
    """Convenience function for website URL validation."""
    return WebsiteValidator.validate_website_url(url, timeout, strict_mode)


def validate_email(email: str) -> bool:
    """Convenience function for email validation."""
    return EmailValidator.validate_email(email)


def validate_phone_number(phone: str) -> bool:
    """Convenience function for phone number validation."""
    return PhoneValidator.validate_phone_number(phone)


def validate_coordinates(lat: float, lng: float) -> bool:
    """Convenience function for coordinate validation."""
    return CoordinateValidator.validate_coordinates(lat, lng)


def validate_rating(rating: float) -> bool:
    """Convenience function for rating validation."""
    return RatingValidator.validate_rating(rating)


def validate_price_level(price_level: int) -> bool:
    """Convenience function for price level validation."""
    return PriceLevelValidator.validate_price_level(price_level)


def validate_restaurant_data(
    data: Dict[str, Any], strict: bool = False
) -> Dict[str, Any]:
    """Convenience function for restaurant data validation."""
    return RestaurantDataValidator.validate_restaurant_data(data, strict)
