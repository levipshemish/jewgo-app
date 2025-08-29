#!/usr/bin/env python3
"""Google Places Validator.

===================

Unified validation utilities for Google Places integration.
Consolidates all website URL validation logic from across the codebase.

Author: JewGo Development Team
Version: 1.0
"""

import os
import re

import requests
from utils.logging_config import get_logger

logger = get_logger(__name__)
"""Google Places Validator.

===================

Unified validation utilities for Google Places integration.
Consolidates all website URL validation logic from across the codebase.

Author: JewGo Development Team
Version: 1.0
"""


class GooglePlacesValidator:
    """Unified validator for Google Places related operations."""

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

    @staticmethod
    def validate_google_places_api_key() -> bool:
        """Validate if Google Places API key is configured.

        Returns:
            True if API key is set, False otherwise
        """
        api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            logger.warning("GOOGLE_PLACES_API_KEY not set")
            return False
        return True

    @staticmethod
    def validate_place_id(place_id: str) -> bool:
        """Validate if a Google Places place_id is properly formatted.

        Args:
            place_id: Place ID to validate

        Returns:
            True if valid format, False otherwise
        """
        if not place_id:
            return False

        # Google Places place_ids are typically long alphanumeric strings
        # They usually start with a specific pattern
        if len(place_id) < 10 or len(place_id) > 100:
            return False

        # Basic format validation (alphanumeric and some special characters)
        pattern = r"^[A-Za-z0-9_-]+$"
        return bool(re.match(pattern, place_id))

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """Validate if coordinates are within valid ranges.

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            True if valid coordinates, False otherwise
        """
        # Latitude: -90 to 90
        if not -90 <= lat <= 90:
            return False

        # Longitude: -180 to 180
        if not -180 <= lng <= 180:
            return False

        return True

    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate if a phone number is properly formatted.

        Args:
            phone: Phone number to validate

        Returns:
            True if valid format, False otherwise
        """
        if not phone:
            return False

        # Remove common formatting characters
        cleaned = "".join(c for c in phone if c.isdigit() or c in "+()-")

        # Must have at least 10 digits
        digits = "".join(c for c in cleaned if c.isdigit())
        if len(digits) < 10:
            return False

        return True

    @staticmethod
    def validate_rating(rating: float) -> bool:
        """Validate if a rating is within valid range.

        Args:
            rating: Rating value to validate

        Returns:
            True if valid rating, False otherwise
        """
        if rating is None:
            return False

        # Google Places ratings are typically 0.0 to 5.0
        return 0.0 <= rating <= 5.0

    @staticmethod
    def validate_price_level(price_level: int) -> bool:
        """Validate if a price level is within valid range.

        Args:
            price_level: Price level to validate

        Returns:
            True if valid price level, False otherwise
        """
        if price_level is None:
            return False

        # Google Places price levels are 0-4
        return 0 <= price_level <= 4
