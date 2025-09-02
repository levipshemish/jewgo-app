import time
from datetime import datetime
from typing import Any
from utils.config_manager import ConfigManager
from utils.google_places_searcher import GooglePlacesSearcher
from utils.logging_config import get_logger
from utils.validators import validate_website_url as unified_validate_website_url
from utils.error_handler_v2 import (
    handle_external_api_call,
    create_error_context,
)
from .base_service import BaseService

logger = get_logger(__name__)
"""Google Places Service.
This service provides Google Places API interactions for fetching website links,
reviews, and other place information for restaurants.
"""


class GooglePlacesService(BaseService):
    """Service for Google Places API interactions."""

    def __init__(self, db_manager=None, config=None) -> None:
        super().__init__(db_manager, config)
        config_manager = ConfigManager()
        external_services = config_manager.get_external_services_config()
        self.api_key = external_services.get('google_places_api_key')
        self.base_url = "https://maps.googleapis.com/maps/api/place"
        if not self.api_key:
            logger.warning("Google Places API key not found in environment")
        logger.info(
            "Google Places Service initialized",
            api_key_length=len(self.api_key) if self.api_key else 0,
        )

    def search_place(self, restaurant_name: str, address: str) -> str | None:
        """Search for a place using Google Places API.
        Args:
            restaurant_name: Name of the restaurant
            address: Address of the restaurant
        Returns:
            Place ID if found, None otherwise
        """
        searcher = GooglePlacesSearcher(self.api_key)
        place_id = searcher.search_place(restaurant_name, address, search_type="simple")
        if place_id:
            self.log_operation(
                "place_found", place_id=place_id, restaurant_name=restaurant_name
            )
        else:
            self.log_operation("place_not_found", restaurant_name=restaurant_name)
        return place_id

    def get_place_details(self, place_id: str) -> dict[str, Any] | None:
        """Get detailed information about a place.
        Args:
            place_id: Google Places place ID
        Returns:
            Place details dictionary or None if error
        """
        searcher = GooglePlacesSearcher(self.api_key)
        details = searcher.get_place_details(place_id)
        if details:
            self.log_operation("get_place_details", place_id=place_id)
        else:
            self.log_operation("details_error", place_id=place_id)
        return details

    def fetch_google_reviews(
        self,
        place_id: str,
        max_reviews: int = 20,
    ) -> list[dict[str, Any]] | None:
        """Fetch Google reviews for a place.
        Args:
            place_id: Google Places place ID
            max_reviews: Maximum number of reviews to fetch
        Returns:
            List of review dictionaries or None if error
        """
        context = create_error_context(place_id=place_id, max_reviews=max_reviews)
        self.log_operation("fetch_reviews", place_id=place_id, max_reviews=max_reviews)
        # Use external API call handler with timeout
        data = handle_external_api_call(
            operation=lambda: self._make_places_api_call(place_id),
            operation_name="fetch_google_reviews",
            context=context,
            default_return=None,
        )
        if data is None:
            return None
        if data["status"] == "OK" and "reviews" in data["result"]:
            reviews = data["result"]["reviews"][:max_reviews]
            # Convert reviews to our format
            formatted_reviews = []
            for review in reviews:
                formatted_review = {
                    "author_name": review.get("author_name"),
                    "rating": review.get("rating"),
                    "text": review.get("text"),
                    "time": self._convert_timestamp_to_date(review.get("time", 0)),
                    "profile_photo_url": review.get("profile_photo_url"),
                    "relative_time_description": review.get(
                        "relative_time_description"
                    ),
                }
                formatted_reviews.append(formatted_review)
            self.log_operation(
                "reviews_fetched", place_id=place_id, count=len(formatted_reviews)
            )
            return formatted_reviews
        self.log_operation(
            "reviews_error", place_id=place_id, status=data.get("status")
        )
        return None

    def _make_places_api_call(self, place_id: str) -> dict[str, Any]:
        """Make Google Places API call with proper timeout."""
        from utils.http_client import get_http_client

        url = f"{self.base_url}/details/json"
        params = {
            "place_id": place_id,
            "key": self.api_key,
            "fields": "reviews",
        }
        http_client = get_http_client()
        response = http_client.get(url, params=params)
        return response.json()

    def _convert_timestamp_to_date(self, timestamp: int) -> str:
        """Convert Google Places timestamp to date string."""
        try:
            return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        except (ValueError, OSError):
            return "Unknown"

    def update_restaurant_google_reviews(
        self,
        restaurant_id: int,
        place_id: str | None = None,
    ) -> bool:
        """Update Google reviews for a restaurant.
        Args:
            restaurant_id: Restaurant ID in database
            place_id: Google Places place ID (optional, will search if not provided)
        Returns:
            True if successful, False otherwise
        """
        context = create_error_context(restaurant_id=restaurant_id, place_id=place_id)
        if not place_id:
            # Get restaurant info to search for place
            if not self.db_manager:
                self.log_operation(
                    "update_reviews_error",
                    restaurant_id=restaurant_id,
                    error="No DB manager",
                )
                return False
            restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
            if not restaurant:
                self.log_operation(
                    "update_reviews_error",
                    restaurant_id=restaurant_id,
                    error="Restaurant not found",
                )
                return False
            place_id = self.search_place(restaurant["name"], restaurant["address"])
            if not place_id:
                self.log_operation(
                    "update_reviews_error",
                    restaurant_id=restaurant_id,
                    error="Place not found",
                )
                return False
        # Fetch reviews
        reviews = self.fetch_google_reviews(place_id)
        if not reviews:
            return False
        # Update database with reviews
        if self.db_manager:
            success = self.db_manager.update_restaurant_reviews(restaurant_id, reviews)
            self.log_operation(
                "reviews_updated", restaurant_id=restaurant_id, success=success
            )
            return success
        return False

    def batch_update_google_reviews(self, limit: int = 10) -> dict[str, Any]:
        """Batch update Google reviews for multiple restaurants.
        Args:
            limit: Maximum number of restaurants to process
        Returns:
            Dictionary with results summary
        """
        context = create_error_context(limit=limit)
        if not self.db_manager:
            return {"success": False, "error": "No DB manager available"}
        # Get restaurants without recent reviews
        restaurants = self.db_manager.get_restaurants_without_recent_reviews(limit)
        results = {
            "total": len(restaurants),
            "successful": 0,
            "failed": 0,
            "errors": [],
        }
        for restaurant in restaurants:
            success = self.update_restaurant_google_reviews(restaurant["id"])
            if success:
                results["successful"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(
                    f"Failed to update reviews for restaurant {restaurant['id']}"
                )
            # Rate limiting
            time.sleep(1)
        self.log_operation("batch_update_complete", results=results)
        return results

    def validate_website_url(self, url: str) -> bool:
        """Validate a website URL.
        Args:
            url: URL to validate
        Returns:
            True if valid, False otherwise
        """
        return unified_validate_website_url(url, timeout=5, strict_mode=False)

    def update_restaurant_website(self, restaurant_id: int, website_url: str) -> bool:
        """Update restaurant website URL.
        Args:
            restaurant_id: Restaurant ID
            website_url: Website URL to update
        Returns:
            True if successful, False otherwise
        """
        context = create_error_context(
            restaurant_id=restaurant_id, website_url=website_url
        )
        if not self.validate_website_url(website_url):
            self.log_operation(
                "website_validation_failed",
                restaurant_id=restaurant_id,
                url=website_url,
            )
            return False
        if self.db_manager:
            success = self.db_manager.update_restaurant_website(
                restaurant_id, website_url
            )
            self.log_operation(
                "website_updated", restaurant_id=restaurant_id, success=success
            )
            return success
        return False

    def get_restaurants_without_websites(
        self,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Get restaurants that don't have website URLs.
        Args:
            limit: Maximum number of restaurants to return
        Returns:
            List of restaurant dictionaries
        """
        context = create_error_context(limit=limit)
        if self.db_manager:
            return self.db_manager.get_restaurants_without_websites(limit)
        return []

    def process_restaurant(self, restaurant: dict[str, Any]) -> dict[str, Any]:
        """Process a single restaurant to update its Google Places data.
        Args:
            restaurant: Restaurant dictionary
        Returns:
            Dictionary with processing results
        """
        context = create_error_context(restaurant_id=restaurant.get("id"))
        restaurant_id = restaurant["id"]
        restaurant_name = restaurant["name"]
        address = restaurant.get("address", "")
        # Search for place
        place_id = self.search_place(restaurant_name, address)
        if not place_id:
            return {
                "restaurant_id": restaurant_id,
                "success": False,
                "error": "Place not found",
            }
        # Get place details
        place_details = self.get_place_details(place_id)
        if not place_details:
            return {
                "restaurant_id": restaurant_id,
                "success": False,
                "error": "Could not fetch place details",
            }
        # Update website if available
        website_url = place_details.get("website")
        if website_url and self.validate_website_url(website_url):
            self.update_restaurant_website(restaurant_id, website_url)
        # Update reviews
        reviews_updated = self.update_restaurant_google_reviews(restaurant_id, place_id)
        return {
            "restaurant_id": restaurant_id,
            "success": True,
            "place_id": place_id,
            "website_updated": bool(website_url),
            "reviews_updated": reviews_updated,
        }

    def update_restaurants_batch(self, limit: int = 10) -> dict[str, Any]:
        """Batch update multiple restaurants with Google Places data.
        Args:
            limit: Maximum number of restaurants to process
        Returns:
            Dictionary with batch processing results
        """
        context = create_error_context(limit=limit)
        if not self.db_manager:
            return {"success": False, "error": "No DB manager available"}
        # Get restaurants to process
        restaurants = self.db_manager.get_restaurants_for_google_places_update(limit)
        results = {
            "total": len(restaurants),
            "successful": 0,
            "failed": 0,
            "results": [],
        }
        for restaurant in restaurants:
            result = self.process_restaurant(restaurant)
            results["results"].append(result)
            if result["success"]:
                results["successful"] += 1
            else:
                results["failed"] += 1
            # Rate limiting
            time.sleep(1)
        self.log_operation("batch_processing_complete", results=results)
        return results
