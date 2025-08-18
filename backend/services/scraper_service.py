from utils.logging_config import get_logger

import asyncio
import csv
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from playwright.async_api import async_playwright







import requests

from .base_service import BaseService
logger = get_logger(__name__)

"""Scraper Service.

This service provides consolidated scraping functionality with shared logic,
improved error handling, and consistent interfaces for all scraping operations.
"""

class ScraperService(BaseService):
    """Consolidated service for all scraping operations."""

    def __init__(self, db_manager=None, config=None) -> None:
        super().__init__(db_manager, config)
        self.output_dir = Path("data")
        self.output_dir.mkdir(exist_ok=True)

        # Scraping configuration
        self.timeout = 30000  # 30 seconds
        self.retry_attempts = 3
        self.retry_delay = 5  # seconds

        # Rate limiting
        self.request_delay = 1  # seconds between requests
        self.last_request_time = 0

    async def scrape_kosher_miami(self, limit: int | None = None) -> dict[str, Any]:
        """Scrape kosher establishment data from koshermiami.org.

        Args:
            limit: Maximum number of establishments to scrape

        Returns:
            Dictionary with scraping results

        """
        try:
            self.log_operation("scrape_kosher_miami_start", limit=limit)

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                try:
                    # Navigate to koshermiami.org
                    await page.goto(
                        "https://koshermiami.org/establishments/", timeout=self.timeout
                    )

                    # Ensure we're in List View mode
                    await page.click("text=List View")
                    await page.wait_for_selector(
                        "div.row.desctop", timeout=self.timeout
                    )

                    # Extract restaurant entries
                    rows = await page.locator("div.row.desctop").all()

                    if limit:
                        rows = rows[:limit]

                    data = []
                    for i, row in enumerate(rows):
                        try:
                            fields = await row.locator(".value").all_inner_texts()
                            if len(fields) < 9:
                                continue  # Skip malformed rows

                            entry = {
                                "Name": fields[0].strip(),
                                "Type": fields[1].strip(),
                                "Area": fields[2].strip(),
                                "Address": fields[3].strip(),
                                "Phone": fields[4].strip(),
                                "Cholov Yisroel": fields[5].strip(),
                                "Pas Yisroel": fields[6].strip(),
                                "Yoshon": fields[7].strip(),
                                "Bishul Yisroel Tuna": fields[8].strip(),
                            }
                            data.append(entry)

                            if (i + 1) % 10 == 0:
                                self.log_operation(
                                    "scrape_progress", processed=i + 1, total=len(rows)
                                )

                        except Exception as e:
                            self.log_operation("row_error", row_index=i, error=str(e))
                            continue

                    await browser.close()

                    # Save data
                    await self._save_kosher_miami_data(data)

                    result = {
                        "success": True,
                        "total_scraped": len(data),
                        "output_files": {
                            "csv": str(
                                self.output_dir / "kosher_miami_establishments.csv"
                            ),
                            "json": str(
                                self.output_dir / "kosher_miami_establishments.json"
                            ),
                        },
                    }

                    self.log_operation("scrape_kosher_miami_complete", result=result)
                    return result

                except Exception as e:
                    await browser.close()
                    raise

        except Exception as e:
            self.log_operation("scrape_kosher_miami_error", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "total_scraped": 0,
            }

    async def _save_kosher_miami_data(self, data: list[dict]) -> None:
        """Save scraped kosher Miami data to files."""
        if not data:
            return

        # Save as CSV
        csv_file = self.output_dir / "kosher_miami_establishments.csv"
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            if data:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)

        # Save as JSON
        json_file = self.output_dir / "kosher_miami_establishments.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        self.log_operation(
            "data_saved", csv_file=str(csv_file), json_file=str(json_file)
        )

    def scrape_google_reviews(
        self, restaurant_id: int | None = None, batch_size: int = 10
    ) -> dict[str, Any]:
        """Scrape Google reviews for restaurants.

        Args:
            restaurant_id: Specific restaurant ID to scrape (optional)
            batch_size: Number of restaurants to process in batch

        Returns:
            Dictionary with scraping results

        """
        try:
            if not self.db_manager:
                return {"success": False, "error": "No database manager available"}

            api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
            if not api_key:
                return {
                    "success": False,
                    "error": "Google Places API key not configured",
                }

            self.log_operation(
                "scrape_google_reviews_start",
                restaurant_id=restaurant_id,
                batch_size=batch_size,
            )

            if restaurant_id:
                # Single restaurant
                success = self._update_restaurant_reviews(restaurant_id)
                result = {
                    "success": success,
                    "restaurant_id": restaurant_id,
                    "total_processed": 1,
                    "total_updated": 1 if success else 0,
                }
            else:
                # Batch processing
                result = self._batch_update_reviews(batch_size)

            self.log_operation("scrape_google_reviews_complete", result=result)
            return result

        except Exception as e:
            self.log_operation("scrape_google_reviews_error", error=str(e))
            return {"success": False, "error": str(e)}

    def _update_restaurant_reviews(self, restaurant_id: int) -> bool:
        """Update Google reviews for a single restaurant."""
        try:
            # Get restaurant info
            restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
            if not restaurant:
                self.log_operation("restaurant_not_found", restaurant_id=restaurant_id)
                return False

            # Search for place
            place_id = self._search_google_place(
                restaurant["name"], restaurant["address"]
            )
            if not place_id:
                self.log_operation("place_not_found", restaurant_id=restaurant_id)
                return False

            # Fetch reviews
            reviews = self._fetch_google_reviews(place_id)
            if not reviews:
                return False

            # Update database
            success = self.db_manager.update_restaurant_reviews(restaurant_id, reviews)
            self.log_operation(
                "reviews_updated", restaurant_id=restaurant_id, success=success
            )
            return success

        except Exception as e:
            self.log_operation(
                "update_reviews_error", restaurant_id=restaurant_id, error=str(e)
            )
            return False

    def _batch_update_reviews(self, batch_size: int) -> dict[str, Any]:
        """Batch update Google reviews for multiple restaurants."""
        try:
            # Get restaurants without recent reviews
            restaurants = self.db_manager.get_restaurants_without_recent_reviews(
                batch_size
            )

            results = {
                "total_processed": len(restaurants),
                "total_updated": 0,
                "errors": [],
                "details": [],
            }

            for restaurant in restaurants:
                try:
                    success = self._update_restaurant_reviews(restaurant["id"])
                    if success:
                        results["total_updated"] += 1
                        results["details"].append(
                            {
                                "restaurant_id": restaurant["id"],
                                "name": restaurant["name"],
                                "status": "updated",
                            }
                        )
                    else:
                        results["errors"].append(
                            f"Failed to update restaurant {restaurant['id']}"
                        )

                    # Rate limiting
                    self._rate_limit()

                except Exception as e:
                    results["errors"].append(
                        f"Error updating restaurant {restaurant['id']}: {e!s}"
                    )

            results["success"] = len(results["errors"]) == 0
            return results

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _search_google_place(self, name: str, address: str) -> str | None:
        """Search for a place using Google Places API."""
        try:
            api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
            query = f"{name} {address}"

            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                "query": query,
                "key": api_key,
                "type": "restaurant",
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data["status"] == "OK" and data["results"]:
                return data["results"][0]["place_id"]

            return None

        except Exception as e:
            self.log_operation("search_place_error", name=name, error=str(e))
            return None

    def _fetch_google_reviews(
        self, place_id: str, max_reviews: int = 20
    ) -> list[dict] | None:
        """Fetch Google reviews for a place."""
        try:
            api_key = os.environ.get("GOOGLE_PLACES_API_KEY")

            url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                "place_id": place_id,
                "key": api_key,
                "fields": "reviews",
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data["status"] == "OK" and "reviews" in data["result"]:
                reviews = data["result"]["reviews"][:max_reviews]

                # Convert to our format
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

                return formatted_reviews

            return None

        except Exception as e:
            self.log_operation("fetch_reviews_error", place_id=place_id, error=str(e))
            return None

    def _convert_timestamp_to_date(self, timestamp: int) -> str:
        """Convert Google Places timestamp to date string."""
        try:
            return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        except Exception:
            return "Unknown"

    def _rate_limit(self) -> None:
        """Implement rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)

        self.last_request_time = time.time()

    def scrape_restaurant_images(
        self, restaurant_id: int | None = None, limit: int = 10
    ) -> dict[str, Any]:
        """Scrape restaurant images from various sources.

        Args:
            restaurant_id: Specific restaurant ID to scrape (optional)
            limit: Number of restaurants to process in batch

        Returns:
            Dictionary with scraping results

        """
        try:
            if not self.db_manager:
                return {"success": False, "error": "No database manager available"}

            self.log_operation(
                "scrape_images_start", restaurant_id=restaurant_id, limit=limit
            )

            if restaurant_id:
                # Single restaurant
                result = self._scrape_restaurant_images_single(restaurant_id)
            else:
                # Batch processing
                result = self._scrape_restaurant_images_batch(limit)

            self.log_operation("scrape_images_complete", result=result)
            return result

        except Exception as e:
            self.log_operation("scrape_images_error", error=str(e))
            return {"success": False, "error": str(e)}

    def _scrape_restaurant_images_single(self, restaurant_id: int) -> dict[str, Any]:
        """Scrape images for a single restaurant."""
        try:
            restaurant = self.db_manager.get_restaurant_by_id(restaurant_id)
            if not restaurant:
                return {"success": False, "error": "Restaurant not found"}

            # Try to find images from Google Places
            place_id = self._search_google_place(
                restaurant["name"], restaurant["address"]
            )
            if place_id:
                images = self._fetch_google_place_images(place_id)
                if images:
                    # Update restaurant with image URL
                    self.db_manager.update_restaurant_data(
                        restaurant_id, {"image_url": images[0]}
                    )
                    return {
                        "success": True,
                        "restaurant_id": restaurant_id,
                        "images_found": len(images),
                        "image_url": images[0],
                    }

            return {
                "success": False,
                "restaurant_id": restaurant_id,
                "error": "No images found",
            }

        except Exception as e:
            return {"success": False, "restaurant_id": restaurant_id, "error": str(e)}

    def _scrape_restaurant_images_batch(self, limit: int) -> dict[str, Any]:
        """Scrape images for multiple restaurants in batch."""
        try:
            # Get restaurants without images
            restaurants = self.db_manager.get_restaurants_without_images(limit)

            results = {
                "total_processed": len(restaurants),
                "total_updated": 0,
                "errors": [],
                "details": [],
            }

            for restaurant in restaurants:
                try:
                    result = self._scrape_restaurant_images_single(restaurant["id"])
                    if result["success"]:
                        results["total_updated"] += 1
                        results["details"].append(result)
                    else:
                        results["errors"].append(
                            f"Failed to scrape images for restaurant {restaurant['id']}"
                        )

                    # Rate limiting
                    self._rate_limit()

                except Exception as e:
                    results["errors"].append(
                        f"Error scraping images for restaurant {restaurant['id']}: {e!s}"
                    )

            results["success"] = len(results["errors"]) == 0
            return results

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _fetch_google_place_images(
        self, place_id: str, max_images: int = 5
    ) -> list[str] | None:
        """Fetch images from Google Places API."""
        try:
            api_key = os.environ.get("GOOGLE_PLACES_API_KEY")

            url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                "place_id": place_id,
                "key": api_key,
                "fields": "photos",
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data["status"] == "OK" and "photos" in data["result"]:
                photos = data["result"]["photos"][:max_images]
                image_urls = []

                for photo in photos:
                    photo_reference = photo.get("photo_reference")
                    if photo_reference:
                        image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={api_key}"
                        image_urls.append(image_url)

                return image_urls

            return None

        except Exception as e:
            self.log_operation("fetch_images_error", place_id=place_id, error=str(e))
            return None

    def get_scraping_statistics(self) -> dict[str, Any]:
        """Get statistics about scraping operations."""
        try:
            if not self.db_manager:
                return {"success": False, "error": "No database manager available"}

            stats = {
                "total_restaurants": 0,
                "restaurants_with_images": 0,
                "restaurants_with_reviews": 0,
                "restaurants_with_websites": 0,
                "last_scrape_time": None,
            }

            # Get basic statistics
            all_restaurants = self.db_manager.get_restaurants(limit=1000, as_dict=True)
            stats["total_restaurants"] = len(all_restaurants)

            for restaurant in all_restaurants:
                if restaurant.get("image_url"):
                    stats["restaurants_with_images"] += 1
                if restaurant.get("google_reviews"):
                    stats["restaurants_with_reviews"] += 1
                if restaurant.get("website"):
                    stats["restaurants_with_websites"] += 1

            return {"success": True, "statistics": stats}

        except Exception as e:
            return {"success": False, "error": str(e)}
