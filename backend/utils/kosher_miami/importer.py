import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import requests

from config.config import get_config
from database.database_manager_v3 import EnhancedDatabaseManager
from .processor import KosherMiamiProcessor

#!/usr/bin/env python3
"""Kosher Miami Importer.

Database import functionality with geocoding for kosher establishment data.
"""

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

class KosherMiamiImporter:
    """Importer for kosher establishment data with geocoding."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        self.google_api_key = os.environ.get("GOOGLE_MAPS_API_KEY")

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
            pass

        return {
            "street_address": address,
            "city": "",
            "state": "",
            "zip_code": "",
            "latitude": None,
            "longitude": None,
            "geocoded": False,
        }

    def prepare_restaurant_data(self, restaurant: dict) -> dict:
        """Prepare restaurant data for database import with geocoding and validation.

        Args:
            restaurant (Dict): Restaurant data dictionary

        Returns:
            Dict: Prepared restaurant data ready for database insertion

        """
        # Check if data is already normalized (has lowercase field names)
        if "name" in restaurant and "type" in restaurant:
            # Data is already normalized
            normalized_restaurant = restaurant
        else:
            # Normalize the restaurant data first
            processor = KosherMiamiProcessor()
            normalized_restaurant = processor.normalize_restaurant_data(restaurant)

        # Set kosher_type if not present (derived from 'Type' field)
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

        # Geocode address to get precise location data
        address = normalized_restaurant.get("address", "")
        parsed_address = self.geocode_address(address)

        # Prepare database record, using geocoded data or falling back to normalized data
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

        # Add coordinates if available from geocoding
        if parsed_address["latitude"] and parsed_address["longitude"]:
            db_record["latitude"] = parsed_address["latitude"]
            db_record["longitude"] = parsed_address["longitude"]

        return db_record

    def import_restaurants(self, restaurants: list[dict]) -> dict:
        """Import restaurants to database with duplicate protection."""
        results = {
            "total_processed": len(restaurants),
            "successful_imports": 0,
            "failed_imports": 0,
            "updated_imports": 0,
            "new_imports": 0,
            "geocoded_addresses": 0,
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

                if upsert_result["action"] == "inserted":
                    results["successful_imports"] += 1
                    results["new_imports"] += 1
                elif upsert_result["action"] == "updated":
                    results["successful_imports"] += 1
                    results["updated_imports"] += 1
                else:
                    results["failed_imports"] += 1
                    error_msg = f"Failed to import {restaurant_name}: {upsert_result.get('error', 'Unknown error')}"
                    results["errors"].append(error_msg)

                # Rate limiting for geocoding
                if self.google_api_key:
                    time.sleep(0.1)

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
        """Import restaurants from JSON file."""
        try:
            with open(file_path, encoding="utf-8") as f:
                restaurants = json.load(f)

            return self.import_restaurants(restaurants)

        except Exception as e:
            msg = f"Failed to import from file {file_path}: {e}"
            raise Exception(msg)

    def close(self) -> None:
        """Close database connection."""
        if self.db_manager:
            self.db_manager.close()


def main() -> None:
    """Test function for the importer."""
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
        importer = KosherMiamiImporter()
        results = importer.import_restaurants(sample_restaurants)
    except Exception as e:
        pass


if __name__ == "__main__":
    main()
