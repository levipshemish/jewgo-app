#!/usr/bin/env python3
"""Fix Google Reviews Python Dictionary Strings.
============================================

This script handles the specific case where google_reviews contains Python
dictionary strings (with single quotes) instead of proper JSON format.

The script will:
1. Identify restaurants with Python dict strings in google_reviews
2. Convert them to proper JSON format
3. Update the database with properly formatted JSON
4. Log all changes for audit purposes

Author: JewGo Development Team
Version: 1.0
"""

import ast
import json
import os
import sys
from typing import Dict, Optional

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


def is_python_dict_string(text: str) -> bool:
    """Check if a string looks like a Python dictionary."""
    if not text or not isinstance(text, str):
        return False

    text = text.strip()

    # Check if it starts and ends with brackets (list of dicts)
    if text.startswith("[") and text.endswith("]"):
        return True

    # Check if it starts and ends with braces (single dict)
    if text.startswith("{") and text.endswith("}"):
        return True

    return False


def convert_python_dict_to_json(python_dict_str: str) -> Optional[str]:
    """Convert Python dictionary string to proper JSON."""
    if not python_dict_str or not isinstance(python_dict_str, str):
        return None

    python_dict_str = python_dict_str.strip()

    try:
        # Try to parse as Python literal (handles single quotes, etc.)
        parsed_data = ast.literal_eval(python_dict_str)

        # Convert to JSON string
        json_str = json.dumps(parsed_data, ensure_ascii=False)
        return json_str

    except (ValueError, SyntaxError) as e:
        logger.warning(f"Failed to parse Python dict string: {e}")
        return None


def scan_and_fix_python_dicts(db_manager: DatabaseManager) -> Dict[str, int]:
    """Scan and fix Python dictionary strings in google_reviews."""
    fixes_applied = {
        "google_reviews_fixed": 0,
        "total_restaurants_checked": 0,
        "restaurants_with_issues": 0,
    }

    try:
        # Get all restaurants as dictionaries
        restaurants = db_manager.get_restaurants(limit=10000, as_dict=True)
        fixes_applied["total_restaurants_checked"] = len(restaurants)

        logger.info(
            f"Scanning {len(restaurants)} restaurants for Python dict strings in Google reviews"
        )

        for restaurant in restaurants:
            restaurant_id = restaurant.get("id")
            if not restaurant_id:
                continue

            # Check google_reviews field
            google_reviews = restaurant.get("google_reviews")
            if not google_reviews:
                continue

            # Check if it's already valid JSON
            try:
                json.loads(google_reviews)
                # If it's valid JSON, skip
                continue
            except (json.JSONDecodeError, TypeError):
                pass

            # Check if it looks like a Python dict string
            if is_python_dict_string(google_reviews):
                fixes_applied["restaurants_with_issues"] += 1

                # Try to convert it
                fixed_reviews = convert_python_dict_to_json(google_reviews)
                if fixed_reviews:
                    try:
                        # Update the database
                        db_manager.restaurant_repo.update_restaurant(
                            restaurant_id, {"google_reviews": fixed_reviews}
                        )
                        fixes_applied["google_reviews_fixed"] += 1
                        logger.info(
                            f"Fixed Python dict string for restaurant {restaurant_id}"
                        )
                    except Exception as e:
                        logger.error(
                            f"Failed to update Google reviews for restaurant {restaurant_id}: {e}"
                        )
                else:
                    logger.warning(
                        f"Could not convert Python dict string for restaurant {restaurant_id}: {google_reviews[:100]}..."
                    )

        return fixes_applied

    except Exception as e:
        logger.exception(f"Error scanning Python dict strings: {e}")
        return fixes_applied


def main():
    """Main function to run the Python dict string fix script."""
    logger.info("Starting Python dict string fix script")

    try:
        # Initialize database manager
        db_manager = DatabaseManager()

        # Connect to the database
        db_manager.connection_manager.connect()

        # Scan and fix Python dict strings
        logger.info("=== Scanning Python Dict Strings ===")
        fixes = scan_and_fix_python_dicts(db_manager)

        # Print summary
        logger.info("=== Python Dict String Fix Summary ===")
        logger.info(f"Restaurants checked: {fixes['total_restaurants_checked']}")
        logger.info(
            f"Restaurants with Python dict strings: {fixes['restaurants_with_issues']}"
        )
        logger.info(f"Google reviews fixed: {fixes['google_reviews_fixed']}")

        if fixes["google_reviews_fixed"] > 0:
            logger.info(
                "✅ Python dict strings have been converted to JSON successfully"
            )
        else:
            logger.info("ℹ️ No Python dict string issues found or could be fixed")

    except Exception as e:
        logger.exception(f"Error running Python dict string fix script: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
