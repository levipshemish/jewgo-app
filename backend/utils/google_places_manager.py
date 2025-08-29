#!/usr/bin/env python3
"""Google Places Manager Utility.
============================

This module provides utilities for interacting with Google Places API
to fetch website links and other place information for restaurants.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import json
import os
import re
import time
from datetime import datetime
from typing import Any

import requests
from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

from .google_places_searcher import GooglePlacesSearcher

logger = get_logger(__name__)
"""Google Places Manager Utility.
============================

This module provides utilities for interacting with Google Places API
to fetch website links and other place information for restaurants.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

# Configure logging using unified logging configuration
logger = get_logger(__name__)


class GooglePlacesManager:
    """Manager for Google Places API interactions."""

    def __init__(self, api_key: str, database_url: str | None = None) -> None:
        """Initialize the Google Places Manager.

        Args:
            api_key: Google Places API key
            database_url: Database connection URL (optional)

        """
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api/place"

        # Use provided database URL or get from environment
        self.database_url = database_url or os.environ.get("DATABASE_URL")

        logger.info("Google Places Manager initialized", api_key_length=len(api_key))

    def _normalize_name(self, name: str) -> str:
        """Normalize restaurant name for better search matching."""
        if not name:
            return ""
        # Unify quotes and dashes
        name = name.replace("’", "'").replace("–", "-").replace("—", "-")
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

    def _get_name_aliases(self, name: str) -> list[str]:
        """Return a list of alias names for known tricky brands."""
        base = name.lower().strip()
        aliases: dict[str, list[str]] = {
            "sobol": ["SoBol"],
            "sonnys bakery": ["Sonny's Bakery", "Sonny’s Bakery"],
            "serendipity yogurt cafe": ["Serendipity Yogurt", "Serendipity Creamery"],
            "square cafe": ["Square Cafe Kosher"],
            "bunnie cakes": ["Bunnie Cakes Wynwood", "BunnieCakes"],
            "yo-chef": ["Yo Chef"],
            "yo chef": ["Yo-Chef"],
            "yossef roasting": ["Yosef Roasting", "Yosef Roastery"],
            "yosef roasting": ["Yossef Roasting"],
            "bourekas, etc.": ["Bourekas Etc", "Bourekas Etc."],
            "fleisch 41": ["Fleish 41", "41 Fleisch"],
            "gallery of cakes": ["Gallery of Cakes Aventura"],
            "kokoa": ["Motek", "Motek Cafe"],
            "gifted crust pizza": ["The Italian Corner"],
        }
        return aliases.get(base, [])

    def _normalize_address(self, address: str) -> str:
        if not address:
            return ""
        addr = address
        # Standardize abbreviations and remove extra punctuation
        replacements = {
            " W. ": " West ",
            " E. ": " East ",
            " N. ": " North ",
            " S. ": " South ",
            " Hwy": " Highway",
            " St ": " Street ",
            " Ave ": " Avenue ",
        }
        addr = f" {addr} "
        for k, v in replacements.items():
            addr = addr.replace(k, v)
        addr = addr.strip()
        # Remove suite numbers like #112 or Suite 9
        addr = re.sub(r"\s+#\w+", "", addr)
        addr = re.sub(r"\bSuite\s+\w+", "", addr, flags=re.I)
        addr = re.sub(r"\s+", " ", addr).strip()
        return addr

    def search_place(
        self,
        restaurant_name: str,
        address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        lat: float | None = None,
        lng: float | None = None,
    ) -> str | None:
        """Search for a place using Google Places API with multiple fallbacks.

        Tries several text search queries and finally a Find Place request.

        Args:
            restaurant_name: Name of the restaurant
            address: Street address (optional)
            city: City (optional)
            state: State/region (optional)

        Returns:
            Place ID if found, None otherwise

        """
        searcher = GooglePlacesSearcher(self.api_key)
        return searcher.search_place(
            restaurant_name, address, city, state, lat, lng, search_type="general"
        )

    def get_place_details(self, place_id: str) -> dict[str, Any] | None:
        """Get detailed information about a place including website.

        Args:
            place_id: Google Places place ID

        Returns:
            Place details dictionary if successful, None otherwise

        """
        searcher = GooglePlacesSearcher(self.api_key)
        return searcher.get_place_details(
            place_id,
            ["website", "url", "name", "formatted_address", "formatted_phone_number"],
        )

    def fetch_google_reviews(
        self,
        place_id: str,
        max_reviews: int = 20,
    ) -> list[dict[str, Any]] | None:
        """Fetch Google reviews for a specific place.

        Args:
            place_id: Google Places place ID
            max_reviews: Maximum number of reviews to fetch (default: 20)

        Returns:
            List of review dictionaries if successful, None otherwise

        """
        try:
            url = f"{self.base_url}/details/json"
            params = {
                "place_id": place_id,
                "fields": "reviews,rating,user_ratings_total",
                "key": self.api_key,
            }

            logger.info("Fetching Google reviews", place_id=place_id)
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()

            if data["status"] == "OK" and "result" in data:
                result = data["result"]
                reviews = result.get("reviews", [])

                # Limit the number of reviews
                reviews = reviews[:max_reviews]

                # Process and format reviews
                formatted_reviews = []
                for review in reviews:
                    formatted_review = {
                        "google_review_id": review.get("time"),
                        "author_name": review.get("author_name", "Anonymous"),
                        "author_url": review.get("author_url", ""),
                        "rating": review.get("rating", 0),
                        "relative_time_description": review.get(
                            "relative_time_description",
                            "",
                        ),
                        "text": review.get("text", ""),
                        "time": review.get("time"),
                        "translated": review.get("translated", False),
                        "language": review.get("language", "en"),
                        "profile_photo_url": review.get("profile_photo_url", ""),
                        "rating_date": self._convert_timestamp_to_date(
                            review.get("time"),
                        ),
                    }
                    formatted_reviews.append(formatted_review)

                logger.info(
                    "Retrieved Google reviews",
                    formatted_count=len(formatted_reviews),
                    place_id=place_id,
                    total_reviews=len(reviews),
                )

                return {
                    "reviews": formatted_reviews,
                    "overall_rating": result.get("rating"),
                    "total_reviews": result.get("user_ratings_total"),
                    "fetched_at": time.time(),
                }
            logger.warning(
                "Error fetching reviews",
                status=data.get("status"),
                place_id=place_id,
            )
            return None

        except Exception as e:
            logger.exception(
                "Error fetching Google reviews",
                place_id=place_id,
                error=str(e),
            )
            return None

    def _convert_timestamp_to_date(self, timestamp: int) -> str:
        """Convert Google Places timestamp to readable date.

        Args:
            timestamp: Unix timestamp from Google Places API

        Returns:
            Formatted date string

        """
        try:
            if timestamp:
                return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")
            return ""
        except Exception:
            return ""

    def update_restaurant_google_reviews(
        self,
        restaurant_id: int,
        place_id: str | None = None,
    ) -> bool:
        """Update Google reviews for a specific restaurant.

        Args:
            restaurant_id: ID of the restaurant to update
            place_id: Google Places place ID (optional, will search if not provided)

        Returns:
            True if update successful, False otherwise

        """
        try:
            if not self.database_url:
                logger.error("Database URL not configured")
                return False

            # If place_id not provided, try to find it
            if not place_id:
                # Get restaurant info from database
                # Use resilient engine per backend standards
                connect_url = self.database_url
                if "neon.tech" in connect_url and "sslmode=" not in connect_url:
                    connect_url = (
                        connect_url
                        + ("&" if "?" in connect_url else "?")
                        + "sslmode=require"
                    )
                engine = create_engine(
                    connect_url,
                    echo=False,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,
                    pool_recycle=3600,
                    connect_args={
                        "connect_timeout": 30,
                        "application_name": "jewgo-utils-google-places",
                    },
                )
                with engine.begin() as conn:
                    result = conn.execute(
                        text(
                            """
                        SELECT name, address FROM restaurants WHERE id = :restaurant_id
                    """,
                        ),
                        {"restaurant_id": restaurant_id},
                    )

                    restaurant = result.fetchone()
                    if not restaurant:
                        logger.error(
                            "Restaurant not found", restaurant_id=restaurant_id
                        )
                        return False

                    # Search for place_id
                    place_id = self.search_place(restaurant.name, restaurant.address)
                    if not place_id:
                        logger.warning(
                            "Could not find Google Places ID for restaurant",
                            restaurant_id=restaurant_id,
                        )
                        return False

            # Fetch reviews
            reviews_data = self.fetch_google_reviews(place_id)
            if not reviews_data:
                logger.warning(
                    "No reviews data found for restaurant", restaurant_id=restaurant_id
                )
                return False

            # Update database
            connect_url = self.database_url
            if "neon.tech" in connect_url and "sslmode=" not in connect_url:
                connect_url = (
                    connect_url
                    + ("&" if "?" in connect_url else "?")
                    + "sslmode=require"
                )
            engine = create_engine(
                connect_url,
                echo=False,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    "connect_timeout": 30,
                    "application_name": "jewgo-utils-google-places",
                },
            )
            with engine.begin() as conn:
                # Update the google_reviews, google_rating, and google_review_count fields in restaurants table
                result = conn.execute(
                    text(
                        """
                    UPDATE restaurants
                    SET google_reviews = :reviews_data,
                        google_rating = :overall_rating,
                        google_review_count = :total_reviews,
                        updated_at = NOW()
                    WHERE id = :restaurant_id
                """,
                    ),
                    {
                        "reviews_data": str(reviews_data),
                        "overall_rating": reviews_data.get("overall_rating"),
                        "total_reviews": reviews_data.get("total_reviews"),
                        "restaurant_id": restaurant_id,
                    },
                )

                if result.rowcount > 0:
                    logger.info(
                        "Updated Google reviews for restaurant",
                        restaurant_id=restaurant_id,
                        reviews_count=len(reviews_data.get("reviews", [])),
                    )
                    return True
                logger.warning("No restaurant found", restaurant_id=restaurant_id)
                return False

        except Exception as e:
            logger.exception(
                "Error updating Google reviews",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return False

    def batch_update_google_reviews(self, limit: int = 10) -> dict[str, Any]:
        """Update Google reviews for multiple restaurants in batch.

        Args:
            limit: Maximum number of restaurants to process

        Returns:
            Dictionary with update results

        """
        try:
            if not self.database_url:
                logger.error("Database URL not configured")
                return {"success": False, "error": "Database URL not configured"}

            connect_url = self.database_url
            if "neon.tech" in connect_url and "sslmode=" not in connect_url:
                connect_url = (
                    connect_url
                    + ("&" if "?" in connect_url else "?")
                    + "sslmode=require"
                )
            engine = create_engine(
                connect_url,
                echo=False,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    "connect_timeout": 30,
                    "application_name": "jewgo-utils-google-places",
                },
            )

            # Get restaurants that need review updates
            with engine.begin() as conn:
                result = conn.execute(
                    text(
                        """
                    SELECT id, name, address, google_reviews
                    FROM restaurants
                    WHERE status = 'active'
                    ORDER BY updated_at ASC
                    LIMIT :limit
                """,
                    ),
                    {"limit": limit},
                )

                restaurants = result.fetchall()

            results = {
                "processed": 0,
                "updated": 0,
                "errors": [],
                "details": [],
            }

            for restaurant in restaurants:
                try:
                    results["processed"] += 1

                    # Check if we have recent reviews (less than 7 days old)
                    current_reviews = restaurant.google_reviews
                    if current_reviews:
                        # Parse existing reviews to check age
                        try:
                            reviews_data = json.loads(current_reviews)
                            fetched_at = reviews_data.get("fetched_at", 0)
                            if time.time() - fetched_at < 604800:  # 7 days in seconds
                                logger.debug(
                                    "Skipping restaurant - reviews are recent",
                                    restaurant_id=restaurant.id,
                                )
                                results["details"].append(
                                    {
                                        "restaurant_id": restaurant.id,
                                        "name": restaurant.name,
                                        "status": "skipped_recent",
                                    },
                                )
                                continue
                        except (json.JSONDecodeError, TypeError):
                            pass  # Invalid JSON, proceed with update

                    # Update reviews
                    success = self.update_restaurant_google_reviews(restaurant.id)

                    if success:
                        results["updated"] += 1
                        results["details"].append(
                            {
                                "restaurant_id": restaurant.id,
                                "name": restaurant.name,
                                "status": "updated",
                            },
                        )
                    else:
                        results["details"].append(
                            {
                                "restaurant_id": restaurant.id,
                                "name": restaurant.name,
                                "status": "failed",
                            },
                        )

                    # Rate limiting - pause between requests
                    time.sleep(1)

                except Exception as e:
                    error_msg = f"Error processing restaurant {restaurant.id}: {e!s}"
                    results["errors"].append(error_msg)
                    logger.exception(
                        "Error in batch review update",
                        restaurant_id=restaurant.id,
                        error=str(e),
                    )

            logger.info(
                "Completed batch Google reviews update",
                processed=results["processed"],
                updated=results["updated"],
                errors=len(results["errors"]),
            )

            return results

        except Exception as e:
            logger.exception("Error in batch review update", error=str(e))
            return {"success": False, "error": str(e)}

    def validate_website_url(self, url: str) -> bool:
        """Validate if a website URL is accessible and properly formatted.

        Accepts 2xx/3xx responses; falls back to GET if HEAD is blocked.
        """
        from .validators import validate_website_url as unified_validate_website_url

        return unified_validate_website_url(url, timeout=5, strict_mode=False)

    def update_restaurant_website(self, restaurant_id: int, website_url: str) -> bool:
        """Update restaurant website URL in the database.

        Args:
            restaurant_id: ID of the restaurant to update
            website_url: Website URL to set

        Returns:
            True if update successful, False otherwise

        """
        try:
            if not self.database_url:
                logger.error("Database URL not configured")
                return False

            connect_url = self.database_url
            if "neon.tech" in connect_url and "sslmode=" not in connect_url:
                connect_url = (
                    connect_url
                    + ("&" if "?" in connect_url else "?")
                    + "sslmode=require"
                )
            engine = create_engine(
                connect_url,
                echo=False,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    "connect_timeout": 30,
                    "application_name": "jewgo-utils-google-places",
                },
            )

            with engine.begin() as conn:
                # Update the website field
                result = conn.execute(
                    text(
                        """
                    UPDATE restaurants
                    SET website = :website_url, updated_at = NOW()
                    WHERE id = :restaurant_id
                """,
                    ),
                    {"website_url": website_url, "restaurant_id": restaurant_id},
                )

                if result.rowcount > 0:
                    logger.info(
                        "Updated website for restaurant",
                        restaurant_id=restaurant_id,
                        website=website_url,
                    )
                    return True
                logger.warning("No restaurant found", restaurant_id=restaurant_id)
                return False

        except Exception as e:
            logger.exception(
                "Error updating restaurant website",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return False

    def get_restaurants_without_websites(
        self,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Get restaurants that don't have website links.

        Args:
            limit: Maximum number of restaurants to return

        Returns:
            List of restaurant dictionaries

        """
        try:
            if not self.database_url:
                logger.error("Database URL not configured")
                return []

            engine = create_engine(self.database_url)

            with engine.connect() as conn:
                query = """
                    SELECT id, name, address, city, state, website
                    FROM restaurants
                    WHERE website IS NULL OR website = '' OR website = ' '
                    ORDER BY name
                """

                if limit:
                    query += f" LIMIT {limit}"

                result = conn.execute(text(query))
                restaurants = [dict(row._mapping) for row in result.fetchall()]

                logger.info(
                    "Found restaurants without websites", count=len(restaurants)
                )
                return restaurants

        except Exception as e:
            logger.exception("Error getting restaurants without websites", error=str(e))
            return []

    def process_restaurant(self, restaurant: dict[str, Any]) -> dict[str, Any]:
        """Process a single restaurant to update its website link.

        Args:
            restaurant: Restaurant dictionary with id, name, address, etc.

        Returns:
            Dictionary with processing results

        """
        try:
            restaurant_id = restaurant.get("id")
            restaurant_name = restaurant.get("name", "")
            address = restaurant.get("address", "")
            city = restaurant.get("city")
            state = restaurant.get("state")
            lat = restaurant.get("latitude")
            lng = restaurant.get("longitude")
            current_website = restaurant.get("website", "")

            if not restaurant_name or not address:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "skipped",
                    "message": "Missing name or address",
                }

            # Check if website already exists and is substantial
            if current_website and len(current_website) > 10:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "skipped",
                    "message": "Website already exists",
                    "website": current_website,
                }

            logger.info(
                "Processing restaurant",
                restaurant_name=restaurant_name,
                id=restaurant_id,
            )

            # Search for the place
            place_id = self.search_place(
                restaurant_name,
                address,
                city=city,
                state=state,
                lat=lat,
                lng=lng,
            )
            if not place_id:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "failed",
                    "message": "Restaurant not found in Google Places",
                }

            # Get place details
            place_details = self.get_place_details(place_id)
            if not place_details:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "failed",
                    "message": "Could not retrieve place details",
                }

            # Get website
            website_url = place_details.get("website", "")
            if not website_url:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "failed",
                    "message": "No website found in Google Places",
                }

            # Validate website
            if not self.validate_website_url(website_url):
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "failed",
                    "message": "Invalid website URL",
                    "website": website_url,
                }

            # Update database
            success = self.update_restaurant_website(restaurant_id, website_url)
            if success:
                return {
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "status": "updated",
                    "website": website_url,
                }
            return {
                "id": restaurant_id,
                "name": restaurant_name,
                "status": "failed",
                "message": "Database update failed",
            }

        except Exception as e:
            logger.exception(
                "Error processing restaurant",
                restaurant_name=restaurant.get("name", "Unknown"),
                error=str(e),
            )
            return {
                "id": restaurant.get("id"),
                "name": restaurant.get("name", "Unknown"),
                "status": "error",
                "message": str(e),
            }

    def update_restaurants_batch(self, limit: int = 10) -> dict[str, Any]:
        """Update website links for a batch of restaurants.

        Args:
            limit: Maximum number of restaurants to process

        Returns:
            Dictionary with batch processing results

        """
        try:
            # Get restaurants without websites
            restaurants = self.get_restaurants_without_websites(limit)

            if not restaurants:
                return {
                    "message": "No restaurants found without websites",
                    "processed": 0,
                    "updated": 0,
                    "failed": 0,
                    "results": [],
                }

            logger.info(
                "Processing restaurants without websites", count=len(restaurants)
            )

            updated_count = 0
            failed_count = 0
            results = []

            for i, restaurant in enumerate(restaurants, 1):
                logger.info(
                    "Processing restaurant in batch",
                    current=i,
                    total=len(restaurants),
                    restaurant_name=restaurant.get("name", "Unknown"),
                )

                result = self.process_restaurant(restaurant)
                results.append(result)

                if result["status"] == "updated":
                    updated_count += 1
                elif result["status"] in ["failed", "error"]:
                    failed_count += 1

                # Progress update every 5 restaurants
                if i % 5 == 0:
                    logger.info(
                        "Progress update",
                        current=i,
                        total=len(restaurants),
                        updated=updated_count,
                        failed=failed_count,
                    )

                # Add delay to respect API rate limits
                time.sleep(0.2)  # 200ms delay

            logger.info(
                "Batch update complete",
                updated=updated_count,
                failed=failed_count,
                total=len(restaurants),
            )

            return {
                "message": f"Processed {len(restaurants)} restaurants",
                "processed": len(restaurants),
                "updated": updated_count,
                "failed": failed_count,
                "results": results,
            }

        except Exception as e:
            logger.exception("Error in batch update", error=str(e))
            return {
                "message": "Batch update failed",
                "processed": 0,
                "updated": 0,
                "failed": 0,
                "error": str(e),
                "results": [],
            }
