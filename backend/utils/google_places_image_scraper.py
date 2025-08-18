from utils.logging_config import get_logger

import os
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse







import requests

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Google Places Image Scraper.
==========================

Scrapes restaurant images from Google Places API for the JewGo app.
Fetches high-quality images and prepares them for Cloudinary upload.

Author: JewGo Development Team
Version: 1.0
"""

class GooglePlacesImageScraper:
    """Scrapes restaurant images from Google Places API."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not self.api_key:
            msg = "GOOGLE_PLACES_API_KEY environment variable is required"
            raise ValueError(msg)

        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "JewGo-ImageScraper/1.0",
            },
        )

    def search_restaurant_place_id(
        self,
        restaurant_name: str,
        address: str,
    ) -> str | None:
        """Search for a restaurant's place_id using Google Places API.

        Args:
            restaurant_name: Name of the restaurant
            address: Address of the restaurant

        Returns:
            Place ID if found, None otherwise

        """
        try:
            # Build search query
            query = f"{restaurant_name} {address}"

            # Search for the place
            search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            search_params = {
                "query": query,
                "key": self.api_key,
                "type": "restaurant",
            }

            logger.info("Searching Google Places", query=query)
            response = self.session.get(search_url, params=search_params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data["status"] == "OK" and data["results"]:
                place_id = data["results"][0]["place_id"]
                logger.info(
                    "Found place_id", restaurant_name=restaurant_name, place_id=place_id
                )
                return place_id
            logger.warning("No place found", query=query)
            return None

        except Exception as e:
            logger.exception(
                "Error searching for place_id",
                restaurant_name=restaurant_name,
                error=str(e),
            )
            return None

    def get_place_photos(self, place_id: str) -> list[dict]:
        """Get photos for a specific place_id.

        Args:
            place_id: Google Places place_id

        Returns:
            List of photo information including photo_reference and metadata

        """
        try:
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                "place_id": place_id,
                "fields": "photos",
                "key": self.api_key,
            }

            logger.info("Getting photos", place_id=place_id)
            response = self.session.get(details_url, params=details_params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data["status"] == "OK" and "result" in data:
                photos = data["result"].get("photos", [])
                logger.info("Found photos", place_id=place_id, count=len(photos))
                return photos
            logger.warning("No photos found", place_id=place_id)
            return []

        except Exception as e:
            logger.exception("Error getting photos", place_id=place_id, error=str(e))
            return []

    def download_photo(
        self,
        photo_reference: str,
        max_width: int = 800,
    ) -> bytes | None:
        """Download a photo using its photo_reference.

        Args:
            photo_reference: Google Places photo reference
            max_width: Maximum width for the photo (default 800px)

        Returns:
            Photo bytes if successful, None otherwise

        """
        try:
            photo_url = "https://maps.googleapis.com/maps/api/place/photo"
            photo_params = {
                "photoreference": photo_reference,
                "maxwidth": max_width,
                "key": self.api_key,
            }

            logger.info("Downloading photo", photo_reference=photo_reference[:20])
            response = self.session.get(photo_url, params=photo_params, timeout=15)
            response.raise_for_status()

            # Check if we got an image
            content_type = response.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                logger.warning("Unexpected content type", content_type=content_type)
                return None

            photo_bytes = response.content
            logger.info("Downloaded photo", bytes_count=len(photo_bytes))
            return photo_bytes

        except Exception as e:
            logger.exception(
                "Error downloading photo",
                photo_reference=photo_reference[:20],
                error=str(e),
            )
            return None

    def get_restaurant_photos(
        self,
        restaurant_name: str,
        address: str,
        max_photos: int = 4,
    ) -> list[tuple[bytes, dict]]:
        """Get multiple photos for a restaurant.

        Args:
            restaurant_name: Name of the restaurant
            address: Address of the restaurant
            max_photos: Maximum number of photos to return (default 4)

        Returns:
            List of tuples (photo_bytes, photo_metadata) if found, empty list otherwise

        """
        try:
            # Search for place_id
            place_id = self.search_restaurant_place_id(restaurant_name, address)
            if not place_id:
                return []

            # Get photos
            photos = self.get_place_photos(place_id)
            if not photos:
                return []

            # Select multiple photos (up to max_photos)
            selected_photos = self._select_multiple_photos(photos, max_photos)
            if not selected_photos:
                return []

            # Download the photos
            downloaded_photos = []
            for photo in selected_photos:
                photo_bytes = self.download_photo(photo["photo_reference"])
                if photo_bytes:
                    downloaded_photos.append((photo_bytes, photo))

            return downloaded_photos

        except Exception as e:
            logger.exception(
                "Error getting photos for restaurant",
                restaurant_name=restaurant_name,
                error=str(e),
            )
            return []

    def get_best_restaurant_photo(
        self,
        restaurant_name: str,
        address: str,
    ) -> tuple[bytes, dict] | None:
        """Get the best photo for a restaurant (backward compatibility).

        Args:
            restaurant_name: Name of the restaurant
            address: Address of the restaurant

        Returns:
            Tuple of (photo_bytes, photo_metadata) if found, None otherwise

        """
        photos = self.get_restaurant_photos(restaurant_name, address, max_photos=1)
        return photos[0] if photos else None

    def _select_multiple_photos(
        self,
        photos: list[dict],
        max_photos: int = 4,
    ) -> list[dict]:
        """Select multiple photos from a list of photos.
        Prioritizes exterior/interior shots over logos and other images.

        Args:
            photos: List of photo metadata from Google Places API
            max_photos: Maximum number of photos to select

        Returns:
            List of selected photo metadata

        """
        if not photos:
            return []

        # For now, just return the first max_photos
        # In the future, we could implement more sophisticated selection logic
        # based on photo metadata like width, height, and HTML attributions
        return photos[:max_photos]

    def _select_best_photo(self, photos: list[dict]) -> dict | None:
        """Select the best photo from a list of photos.
        Prioritizes exterior/interior shots over logos and other images.

        Args:
            photos: List of photo metadata from Google Places API

        Returns:
            Best photo metadata, or None if no suitable photo found

        """
        if not photos:
            return None

        # For now, just return the first photo
        # In the future, we could implement more sophisticated selection logic
        # based on photo metadata like width, height, and HTML attributions
        return photos[0]

    def close(self) -> None:
        """Close the session."""
        if self.session:
            self.session.close()


def main() -> None:
    """Test function for the image scraper."""
    try:
        scraper = GooglePlacesImageScraper()

        # Test with a sample restaurant
        test_restaurant = {
            "name": "Pita Plus",
            "address": "123 Main St, Miami Beach, FL",
        }

        result = scraper.get_best_restaurant_photo(
            test_restaurant["name"],
            test_restaurant["address"],
        )

        if result:
            photo_bytes, metadata = result
        else:
            pass

    except Exception as e:
        pass
    finally:
        if "scraper" in locals():
            scraper.close()


if __name__ == "__main__":
    main()
