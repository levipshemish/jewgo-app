#!/usr/bin/env python3
"""
Unified Google Places Search Module

This module consolidates all Google Places API search functionality that was previously
duplicated across multiple files in the codebase. It provides a single, consistent
interface for searching places and retrieving place details.

Usage:
    searcher = GooglePlacesSearcher()
    place_id = searcher.search_place("Restaurant Name", "123 Main St", "Miami", "FL")
    details = searcher.get_place_details(place_id, ["website", "opening_hours"])
"""

import os
import re
from typing import Any, Dict, List, Optional, Union

import requests
from utils.logging_config import get_logger

logger = get_logger(__name__)


class GooglePlacesSearcher:
    """
    Unified Google Places API searcher that consolidates search functionality
    """

    def __init__(self, api_key: str = None):
        """
        Initialize the Google Places searcher.

        Args:
            api_key: Google Places API key. If not provided, will use environment variable.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_PLACES_API_KEY")
        self.base_url = "https://maps.googleapis.com/maps/api/place"

        if not self.api_key:
            logger.warning("GOOGLE_PLACES_API_KEY not set")

        logger.info(
            "Google Places Searcher initialized",
            api_key_length=len(self.api_key) if self.api_key else 0,
        )

    def _normalize_name(self, name: str) -> str:
        """
        Normalize restaurant name for better search matching.

        Args:
            name: Restaurant name to normalize

        Returns:
            Normalized restaurant name
        """
        if not name:
            return ""

        # Unify quotes and dashes
        name = name.replace("'", "'").replace("–", "-").replace("—", "-")
        # Remove content in parentheses
        name = re.sub(r"\s*\([^\)]*\)", "", name)
        # Remove marketing disclaimers
        name = re.sub(r"\s*-\s*ONLY this location\.?", "", name, flags=re.I)
        # Replace slashes and @ with spaces
        name = name.replace("/", " ").replace("@", " ")
        # Replace ampersand with 'and'
        name = re.sub(r"\s*&\s*", " and ", name)
        # Collapse multiple spaces
        name = re.sub(r"\s+", " ", name).strip()
        return name

    def _normalize_address(self, address: str) -> str:
        """
        Normalize address for better search matching.

        Args:
            address: Address to normalize

        Returns:
            Normalized address
        """
        if not address:
            return ""

        addr = address.strip()
        # Remove suite numbers like #112 or Suite 9
        addr = re.sub(r"\s+#\w+", "", addr)
        addr = re.sub(r"\bSuite\s+\w+", "", addr, flags=re.I)
        addr = re.sub(r"\s+", " ", addr).strip()
        return addr

    def search_place(
        self,
        name: str,
        address: str = None,
        city: str = None,
        state: str = None,
        lat: float = None,
        lng: float = None,
        search_type: str = "general",
    ) -> Optional[str]:
        """
        Search for a place using Google Places API with multiple fallback strategies.

        Args:
            name: Restaurant/business name
            address: Street address (optional)
            city: City (optional)
            state: State/region (optional)
            lat: Latitude for location bias (optional)
            lng: Longitude for location bias (optional)
            search_type: Type of search ("general", "enhanced", "simple")

        Returns:
            Place ID if found, None otherwise
        """
        if not self.api_key:
            logger.error("No API key available for Google Places search")
            return None

        try:
            # Normalize inputs
            clean_name = self._normalize_name(name)
            clean_addr = self._normalize_address(address or "")

            if search_type == "enhanced":
                return self._search_place_enhanced(
                    clean_name, clean_addr, city, state, lat, lng
                )
            elif search_type == "simple":
                return self._search_place_simple(clean_name, clean_addr)
            else:  # general
                return self._search_place_general(
                    clean_name, clean_addr, city, state, lat, lng
                )

        except Exception as e:
            logger.error(
                "Error in search_place", name=name, address=address, error=str(e)
            )
            return None

    def _search_place_general(
        self,
        name: str,
        address: str = None,
        city: str = None,
        state: str = None,
        lat: float = None,
        lng: float = None,
    ) -> Optional[str]:
        """
        General search strategy with multiple fallbacks.
        """

        def _text_search(query: str) -> Optional[str]:
            """Perform text search with location bias."""
            url = f"{self.base_url}/textsearch/json"
            params = {
                "query": query,
                "key": self.api_key,
                "type": "restaurant",
            }
            # Bias by location if available
            if lat is not None and lng is not None:
                params["location"] = f"{lat},{lng}"
                params["radius"] = 5000

            logger.info("Text search", query=query)
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") == "OK" and data.get("results"):
                return data["results"][0].get("place_id")

            logger.warning(
                "Text search no results", query=query, status=data.get("status")
            )
            return None

        def _find_place(query: str) -> Optional[str]:
            """Perform Find Place search."""
            url = f"{self.base_url}/findplacefromtext/json"
            params = {
                "input": query,
                "inputtype": "textquery",
                "key": self.api_key,
                "fields": "place_id,name,formatted_address",
            }

            logger.info("Find Place search", query=query)
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            candidates = data.get("candidates") or []
            if candidates:
                return candidates[0].get("place_id")

            logger.warning(
                "Find Place no candidates", query=query, status=data.get("status")
            )
            return None

        # Build search queries in order of preference
        parts = []
        if address:
            parts.append(address)
        if city:
            parts.append(city)
        if state:
            parts.append(state)
        full_loc = " ".join([p for p in parts if p])

        queries = []
        if full_loc:
            queries.append(f"{name} {full_loc}")
        if city and state:
            queries.append(f"{name} {city} {state}")
        if address:
            queries.append(f"{name} {address}")
        if state:
            queries.append(f"{name} {state}")
        # Last resort: name only
        queries.append(name)

        # Try text search first
        for query in queries:
            place_id = _text_search(query)
            if place_id:
                logger.info("Found place with text search", name=name, query=query)
                return place_id

        # Try Find Place as fallback
        for query in queries:
            place_id = _find_place(query)
            if place_id:
                logger.info("Found place with Find Place", name=name, query=query)
                return place_id

        logger.warning("No place found with any strategy", name=name)
        return None

    def _search_place_enhanced(
        self,
        name: str,
        address: str = None,
        city: str = None,
        state: str = None,
        lat: float = None,
        lng: float = None,
    ) -> Optional[str]:
        """
        Enhanced search strategy with multiple specific approaches.
        """
        # Strategy 1: Name + Full Address
        if address and city and state:
            query = f"{name} {address}, {city}, {state}".strip()
            place_id = self._search_place_single(query)
            if place_id:
                logger.info("Found with Strategy 1", name=name)
                return place_id

        # Strategy 2: Name + City, State (without street address)
        if city and state:
            query = f"{name} {city}, {state}".strip()
            place_id = self._search_place_single(query)
            if place_id:
                logger.info("Found with Strategy 2", name=name)
                return place_id

        # Strategy 3: Name only
        query = name.strip()
        place_id = self._search_place_single(query)
        if place_id:
            logger.info("Found with Strategy 3", name=name)
            return place_id

        # Strategy 4: Address only (without name)
        if address and city and state:
            query = f"{address}, {city}, {state}".strip()
            place_id = self._search_place_single(query)
            if place_id:
                logger.info("Found with Strategy 4", name=name)
                return place_id

        logger.warning("All enhanced strategies failed", name=name)
        return None

    def _search_place_simple(self, name: str, address: str = None) -> Optional[str]:
        """
        Simple search strategy - just name and address.
        """
        query = f"{name} {address}".strip() if address else name.strip()
        return self._search_place_single(query)

    def _search_place_single(self, query: str) -> Optional[str]:
        """
        Single search attempt with a specific query.

        Args:
            query: Search query string

        Returns:
            Place ID if found, None otherwise
        """
        try:
            url = f"{self.base_url}/textsearch/json"
            params = {"query": query, "key": self.api_key, "type": "restaurant"}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                return data["results"][0].get("place_id")

            return None

        except Exception as e:
            logger.error(f"Error in single search for '{query}': {e}")
            return None

    def get_place_details(
        self, place_id: str, fields: Union[List[str], str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a place.

        Args:
            place_id: Google Places place ID
            fields: List of fields to retrieve or string of comma-separated fields.
                   If None, uses default fields.

        Returns:
            Place details dictionary or None if error
        """
        if not self.api_key:
            logger.error("No API key available for Google Places details")
            return None

        try:
            # Handle different field formats
            if fields is None:
                fields = (
                    "website,formatted_phone_number,opening_hours,"
                    "rating,user_ratings_total,reviews"
                )
            elif isinstance(fields, list):
                fields = ",".join(fields)

            url = f"{self.base_url}/details/json"
            params = {
                "place_id": place_id,
                "fields": fields,
                "key": self.api_key,
            }

            logger.info("Getting place details", place_id=place_id, fields=fields)
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data["status"] == "OK":
                return data["result"]

            logger.warning(
                "Error getting place details",
                place_id=place_id,
                status=data.get("status"),
            )
            return None

        except Exception as e:
            logger.error("Error getting place details", place_id=place_id, error=str(e))
            return None

    def search_place_for_website(self, name: str, address: str) -> str:
        """
        Search for a place and return its website URL.

        Args:
            name: Restaurant name
            address: Restaurant address

        Returns:
            Website URL if found, empty string otherwise
        """
        try:
            place_id = self.search_place(name, address, search_type="simple")
            if not place_id:
                return ""

            details = self.get_place_details(place_id, ["website"])
            if details and "website" in details:
                website = details["website"]
                if website:
                    logger.info("Found website", name=name, website=website)
                    return website

            logger.warning("No website found", name=name)
            return ""

        except Exception as e:
            logger.exception("Error searching for website", name=name, error=str(e))
            return ""

    def search_place_for_hours(self, name: str, address: str) -> str:
        """
        Search for a place and return its opening hours.

        Args:
            name: Restaurant name
            address: Restaurant address

        Returns:
            Opening hours string if found, empty string otherwise
        """
        try:
            place_id = self.search_place(name, address, search_type="simple")
            if not place_id:
                return ""

            details = self.get_place_details(place_id, ["opening_hours"])
            if details and "opening_hours" in details:
                opening_hours = details["opening_hours"]
                if opening_hours and "weekday_text" in opening_hours:
                    hours_text = "\n".join(opening_hours["weekday_text"])
                    logger.info("Found opening hours", name=name)
                    return hours_text

            logger.warning("No opening hours found", name=name)
            return ""

        except Exception as e:
            logger.exception("Error searching for hours", name=name, error=str(e))
            return ""


# Convenience functions for backward compatibility
def search_google_places_website(restaurant_name: str, address: str) -> str:
    """Backward compatibility function for website search."""
    searcher = GooglePlacesSearcher()
    return searcher.search_place_for_website(restaurant_name, address)


def search_google_places_hours(restaurant_name: str, address: str) -> str:
    """Backward compatibility function for hours search."""
    searcher = GooglePlacesSearcher()
    return searcher.search_place_for_hours(restaurant_name, address)
