#!/usr/bin/env python3
"""Test JSON Parsing After Fixes.
==============================

This script tests if the JSON parsing errors have been resolved
after running the fix scripts.

Author: JewGo Development Team
Version: 1.0
"""

import json
import os
import sys
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
except ImportError:
    # If python-dotenv is not available, try to load .env manually
    env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

from database.database_manager_v4 import DatabaseManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def test_json_parsing():
    """Test JSON parsing for all restaurants."""
    try:
        # Initialize database manager
        db_manager = DatabaseManager()

        # Connect to the database
        db_manager.connection_manager.connect()

        # Get a sample of restaurants
        restaurants = db_manager.get_restaurants(limit=10, as_dict=True)

        print(f"Testing JSON parsing for {len(restaurants)} restaurants...")

        json_errors = 0
        total_tested = 0

        for restaurant in restaurants:
            restaurant_id = restaurant.get("id")
            restaurant_name = restaurant.get("name", "Unknown")

            # Test specials field
            specials = restaurant.get("specials")
            if specials:
                total_tested += 1
                try:
                    parsed_specials = db_manager._safe_json_loads(specials, [])
                    if parsed_specials == [] and specials.strip():
                        print(
                            f"⚠️  Restaurant {restaurant_id} ({restaurant_name}): specials field still has issues"
                        )
                        json_errors += 1
                except Exception as e:
                    print(
                        f"❌ Restaurant {restaurant_id} ({restaurant_name}): specials parsing error: {e}"
                    )
                    json_errors += 1

            # Test google_reviews field
            google_reviews = restaurant.get("google_reviews")
            if google_reviews:
                total_tested += 1
                try:
                    parsed_reviews = db_manager._safe_json_loads(google_reviews, [])
                    if parsed_reviews == [] and google_reviews.strip():
                        print(
                            f"⚠️  Restaurant {restaurant_id} ({restaurant_name}): google_reviews field still has issues"
                        )
                        json_errors += 1
                except Exception as e:
                    print(
                        f"❌ Restaurant {restaurant_id} ({restaurant_name}): google_reviews parsing error: {e}"
                    )
                    json_errors += 1

        print(f"\n=== JSON Parsing Test Results ===")
        print(f"Total fields tested: {total_tested}")
        print(f"JSON parsing errors: {json_errors}")
        print(
            f"Success rate: {((total_tested - json_errors) / total_tested * 100):.1f}%"
            if total_tested > 0
            else "N/A"
        )

        if json_errors == 0:
            print("✅ All JSON fields parsed successfully!")
        else:
            print(f"⚠️  {json_errors} JSON parsing issues remain")

        return json_errors == 0

    except Exception as e:
        logger.exception(f"Error testing JSON parsing: {e}")
        return False


def main():
    """Main function to run the JSON parsing test."""
    print("Starting JSON parsing test...")

    success = test_json_parsing()

    if success:
        print("\n🎉 JSON parsing test passed! The fixes appear to be working.")
    else:
        print("\n⚠️  JSON parsing test found some remaining issues.")

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
