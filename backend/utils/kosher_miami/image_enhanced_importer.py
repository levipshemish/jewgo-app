import json
import os
import sys
import time
import requests
from database.database_manager_v3 import EnhancedDatabaseManager
from utils.cloudinary_uploader import CloudinaryUploader
from utils.google_places_image_scraper import GooglePlacesImageScraper
from utils.logging_config import get_logger
from config.config import get_config
from .processor import KosherMiamiProcessor

logger = get_logger(__name__)
# !/usr/bin/env python3
"""Enhanced Kosher Miami Importer with Image Scraping.
==================================================
Enhanced importer that scrapes restaurant images from Google Places API
and uploads them to Cloudinary during the import process.
Author: JewGo Development Team
Version: 2.0
"""
# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))


class ImageEnhancedKosherMiamiImporter:
    """Enhanced importer with image scraping and Cloudinary upload."""

    def __init__(
        self, database_url: str | None = None, enable_image_scraping: bool = True
    ) -> None:
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        self.google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        self.enable_image_scraping = enable_image_scraping
        # Initialize database manager
        if not self.database_url:
            try:
                config = get_config()
                self.database_url = config.SQLALCHEMY_DATABASE_URI
            except Exception as e:
                msg = f"Database URL not found: {e}"
                raise Exception(msg)
        self.db_manager = EnhancedDatabaseManager(self.database_url)
        # Connect to database
        if not self.db_manager.connect():
            msg = "Failed to connect to database"
            raise RuntimeError(msg)
        # Initialize image scraping and upload components
        if self.enable_image_scraping:
            try:
                self.image_scraper = GooglePlacesImageScraper()
                self.cloudinary_uploader = CloudinaryUploader()
                logger.info("Image scraping and Cloudinary upload initialized")
            except Exception as e:
                logger.warning("Failed to initialize image components", error=str(e))
                self.enable_image_scraping = False
                self.image_scraper = None
                self.cloudinary_uploader = None

    def geocode_address(self, address: str) -> dict:
        """Geocode address using Google Maps API."""
        if not self.google_api_key or not address.strip():
            return {
                "street_address": address,
                "city": "",
                "state": "",
                "zip_code": "",
                "latitude": None,
                "longitude": None,
                "geocoded": False,
            }
        try:
            # Add Miami, FL to incomplete addresses
            search_address = address
            if "," not in address and address.strip():
                search_address = f"{address}, Miami, FL"
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": search_address,
                "key": self.google_api_key,
            }
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            if data["status"] == "OK" and data["results"]:
                result = data["results"][0]
                location = result["geometry"]["location"]
                # Parse address components
                address_components = result["address_components"]
                street_address = address
                city = ""
                state = ""
                zip_code = ""
                for component in address_components:
                    types = component["types"]
                    if "locality" in types:
                        city = component["long_name"]
                    elif "administrative_area_level_1" in types:
                        state = component["short_name"]
                    elif "postal_code" in types:
                        zip_code = component["long_name"]
                return {
                    "street_address": street_address,
                    "city": city,
                    "state": state,
                    "zip_code": zip_code,
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                    "geocoded": True,
                }
        except Exception as e:
            logger.warning("Geocoding error", address=address, error=str(e))
        return {
            "street_address": address,
            "city": "",
            "state": "",
            "zip_code": "",
            "latitude": None,
            "longitude": None,
            "geocoded": False,
        }

    def scrape_and_upload_restaurant_image(
        self,
        restaurant_name: str,
        address: str,
    ) -> str | None:
        """Scrape restaurant image from Google Places and upload to Cloudinary.
        Args:
            restaurant_name: Name of the restaurant
            address: Address of the restaurant
        Returns:
            Cloudinary URL if successful, None otherwise
        """
        if (
            not self.enable_image_scraping
            or not self.image_scraper
            or not self.cloudinary_uploader
        ):
            return None
        try:
            logger.info(
                "Scraping image for restaurant", restaurant_name=restaurant_name
            )
            # Get the best photo from Google Places
            result = self.image_scraper.get_best_restaurant_photo(
                restaurant_name,
                address,
            )
            if not result:
                logger.warning(
                    "No image found for restaurant", restaurant_name=restaurant_name
                )
                return None
            photo_bytes, photo_metadata = result
            # Upload to Cloudinary
            cloudinary_url = self.cloudinary_uploader.upload_restaurant_image(
                image_bytes=photo_bytes,
                restaurant_name=restaurant_name,
            )
            if cloudinary_url:
                logger.info(
                    "Successfully uploaded image for restaurant",
                    restaurant_name=restaurant_name,
                    cloudinary_url=cloudinary_url,
                )
                return cloudinary_url
            logger.warning(
                "Failed to upload image to Cloudinary for restaurant",
                restaurant_name=restaurant_name,
            )
            return None
        except Exception as e:
            logger.exception(
                "Error scraping/uploading image for restaurant",
                restaurant_name=restaurant_name,
                error=str(e),
            )
            return None

    def prepare_restaurant_data(self, restaurant: dict) -> dict:
        """Prepare restaurant data for database import with image scraping."""
        # Check if data is already normalized (has lowercase field names)
        if "name" in restaurant and "type" in restaurant:
            # Data is already normalized
            normalized_restaurant = restaurant
        else:
            # Normalize the restaurant data first
            processor = KosherMiamiProcessor()
            normalized_restaurant = processor.normalize_restaurant_data(restaurant)
        # Set kosher_type if not present
        if "kosher_type" not in normalized_restaurant:
            processor = KosherMiamiProcessor()
            normalized_restaurant["kosher_type"] = processor.determine_kosher_type(
                normalized_restaurant.get("type", ""),
            )
        # Parse certifications from the certification fields
        cholov_text = normalized_restaurant.get("cholov_yisroel", "")
        pas_text = normalized_restaurant.get("pas_yisroel", "")
        certifications = {
            "is_cholov_yisroel": "all items" in cholov_text.lower()
            or "available" in cholov_text.lower(),
            "is_pas_yisroel": "all items" in pas_text.lower()
            or "available" in pas_text.lower(),
        }
        # Geocode address
        address = normalized_restaurant.get("address", "")
        parsed_address = self.geocode_address(address)
        # Prepare database record
        db_record = {
            "name": normalized_restaurant["name"],
            "address": (
                parsed_address["street_address"]
                if parsed_address["street_address"]
                else normalized_restaurant.get("address", "")
            ),
            "city": (
                parsed_address["city"]
                if parsed_address["city"]
                else normalized_restaurant.get("city", "")
            ),
            "state": (
                parsed_address["state"]
                if parsed_address["state"]
                else normalized_restaurant.get("state", "")
            ),
            "zip_code": (
                parsed_address["zip_code"]
                if parsed_address["zip_code"]
                else normalized_restaurant.get("zip_code", "")
            ),
            "phone_number": normalized_restaurant.get("phone", ""),
            "kosher_category": normalized_restaurant["kosher_type"],
            "listing_type": "restaurant",
            "certifying_agency": "ORB",  # Default for Kosher Miami data
            "is_cholov_yisroel": certifications["is_cholov_yisroel"],
            "is_pas_yisroel": certifications["is_pas_yisroel"],
        }
        # Add coordinates if available
        if parsed_address["latitude"] and parsed_address["longitude"]:
            db_record["latitude"] = parsed_address["latitude"]
            db_record["longitude"] = parsed_address["longitude"]
        return db_record

    def import_restaurants(self, restaurants: list[dict]) -> dict:
        """Import restaurants to database with image scraping and duplicate protection."""
        results = {
            "total_processed": len(restaurants),
            "successful_imports": 0,
            "failed_imports": 0,
            "updated_imports": 0,
            "new_imports": 0,
            "geocoded_addresses": 0,
            "images_scraped": 0,
            "images_uploaded": 0,
            "errors": [],
        }
        for _i, restaurant in enumerate(restaurants, 1):
            try:
                # Normalize restaurant data for display
                processor = KosherMiamiProcessor()
                normalized_restaurant = processor.normalize_restaurant_data(restaurant)
                restaurant_name = normalized_restaurant.get(
                    "name",
                    "Unknown Restaurant",
                )
                # Prepare data for import
                db_record = self.prepare_restaurant_data(restaurant)
                # Count geocoded addresses
                if db_record.get("latitude") and db_record.get("longitude"):
                    results["geocoded_addresses"] += 1
                # Use upsert to handle duplicates
                upsert_result = self.db_manager.upsert_restaurant(db_record)
                if upsert_result["action"] in ["inserted", "updated"]:
                    results["successful_imports"] += 1
                    if upsert_result["action"] == "inserted":
                        results["new_imports"] += 1
                    else:
                        results["updated_imports"] += 1
                    # Scrape and upload image for new restaurants or if no image exists
                    restaurant_id = upsert_result.get("restaurant_id")
                    if restaurant_id and (
                        upsert_result["action"] == "inserted"
                        or not db_record.get("image_url")
                    ):
                        results["images_scraped"] += 1
                        image_url = self.scrape_and_upload_restaurant_image(
                            restaurant_name,
                            db_record["address"],
                        )
                        if image_url:
                            # Update the restaurant with the image URL
                            update_data = {"image_url": image_url}
                            self.db_manager.update_restaurant_data(
                                restaurant_id,
                                update_data,
                            )
                            results["images_uploaded"] += 1
                        else:
                            pass
                else:
                    results["failed_imports"] += 1
                    error_msg = f"Failed to import {restaurant_name}: {upsert_result.get('error', 'Unknown error')}"
                    results["errors"].append(error_msg)
                # Rate limiting for API calls
                if self.google_api_key:
                    time.sleep(0.2)  # Slightly longer delay for image scraping
            except Exception as e:
                # Get restaurant name for error message
                try:
                    processor = KosherMiamiProcessor()
                    normalized_restaurant = processor.normalize_restaurant_data(
                        restaurant,
                    )
                    restaurant_name = normalized_restaurant.get(
                        "name",
                        "Unknown Restaurant",
                    )
                except:
                    restaurant_name = "Unknown Restaurant"
                error_msg = f"Error importing {restaurant_name}: {e}"
                results["errors"].append(error_msg)
                results["failed_imports"] += 1
        return results

    def import_from_file(self, file_path: str) -> dict:
        """Import restaurants from JSON file with image scraping."""
        try:
            with open(file_path, encoding="utf-8") as f:
                restaurants = json.load(f)
            return self.import_restaurants(restaurants)
        except Exception as e:
            msg = f"Failed to import from file {file_path}: {e}"
            raise Exception(msg)

    def close(self) -> None:
        """Close database connection and cleanup resources."""
        if self.db_manager:
            self.db_manager.close()
        if self.image_scraper:
            self.image_scraper.close()


def main() -> None:
    """Test function for the enhanced importer."""
    # Example usage
    sample_restaurants = [
        {
            "name": "Test Restaurant",
            "type": "Dairy",
            "address": "123 Main St, Miami Beach, FL",
            "phone": "305-123-4567",
            "certifying_agency": "ORB",
            "kosher_type": "Dairy",
        },
    ]
    try:
        importer = ImageEnhancedKosherMiamiImporter(enable_image_scraping=True)
        results = importer.import_restaurants(sample_restaurants)
    except Exception as e:
        pass
    finally:
        if "importer" in locals():
            importer.close()


if __name__ == "__main__":
    main()
