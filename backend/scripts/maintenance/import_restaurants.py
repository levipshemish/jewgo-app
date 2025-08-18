import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

        from database.database_manager_v3 import EnhancedDatabaseManager





#!/usr/bin/env python3
"""Simple script to import restaurants from Kosher Miami data."""

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))


def import_restaurants() -> bool | None:
    """Import restaurants from Kosher Miami data file."""
    try:
        # Initialize database manager
        db_manager = EnhancedDatabaseManager(os.getenv("DATABASE_URL"))
        if not db_manager.connect():
            return False

        # Load the Kosher Miami data
        data_file = (
            Path(__file__).parent.parent / "data" / "kosher_miami_establishments.json"
        )

        if not data_file.exists():
            return False

        with open(data_file, encoding="utf-8") as f:
            restaurants_data = json.load(f)

        # Import restaurants (limit to first 50 for now)
        restaurants_to_import = restaurants_data[:50]

        successful_imports = 0
        failed_imports = 0

        for restaurant_data in restaurants_to_import:
            try:
                # Convert Kosher Miami format to our database format
                restaurant_dict = {
                    "name": restaurant_data.get("Name", ""),
                    "kosher_category": restaurant_data.get("Type", ""),
                    "city": restaurant_data.get("Area", ""),
                    "state": "FL",  # All Kosher Miami restaurants are in Florida
                    "zip_code": "00000",  # Default zip code since not provided in data
                    "address": restaurant_data.get("Address", "")
                    or "Address not provided",
                    "phone_number": restaurant_data.get("Phone", ""),
                    "certifying_agency": "Kosher Miami",
                    "listing_type": "restaurant",  # Default listing type
                    "status": "active",
                    "hours_parsed": False,
                    "current_time_local": None,
                }

                # Insert restaurant into database
                result = db_manager.add_restaurant(restaurant_dict)
                if result:
                    successful_imports += 1
                else:
                    failed_imports += 1

            except Exception as e:
                failed_imports += 1

        # Close database connection
        db_manager.close()

        return True

    except Exception as e:
        return False


if __name__ == "__main__":
    import_restaurants()
