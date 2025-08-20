import os
import time

import requests
from utils.logging_config import get_logger

from .google_places_searcher import GooglePlacesSearcher
from .google_places_validator import GooglePlacesValidator
from .hours_formatter import HoursFormatter

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Google Places Helper.
===================

Helper functions for Google Places API integration.
Used to fetch website links as backup when restaurants don't have them.

Author: JewGo Development Team
Version: 1.0
"""


def search_google_places_website(restaurant_name: str, address: str) -> str:
    """Search Google Places API for a restaurant's website.
    Returns the website URL if found, empty string otherwise.
    """
    searcher = GooglePlacesSearcher()
    return searcher.search_place_for_website(restaurant_name, address)


def validate_website_url(url: str) -> bool:
    """Validate if a website URL is accessible and properly formatted."""
    from .validators import validate_website_url as unified_validate_website_url

    return unified_validate_website_url(url, timeout=3, strict_mode=True)


def search_google_places_hours(restaurant_name: str, address: str) -> str:
    """Search Google Places API for a restaurant's opening hours.
    Returns the formatted hours string if found, empty string otherwise.
    """
    searcher = GooglePlacesSearcher()
    return searcher.search_place_for_hours(restaurant_name, address)


def format_hours_from_places_api(opening_hours: dict) -> str:
    """Format opening hours from Google Places API format to our database format."""
    from .unified_hours_formatter import UnifiedHoursFormatter

    return UnifiedHoursFormatter.format_from_places_api(opening_hours)
