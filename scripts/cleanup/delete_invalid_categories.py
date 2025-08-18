#!/usr/bin/env python3
"""
Delete Invalid Categories Script
==============================

This script deletes restaurants with invalid kosher categories:
- misc (3 restaurants)
- catering (1 restaurant)
- commercial (1 restaurant)
- take_out (1 restaurant)

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import logging
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Add the backend directory to the path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManager
from config.config import Config

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def delete_invalid_categories():
    """Delete restaurants with invalid kosher categories."""
    config = Config()
    db_manager = DatabaseManager(config.SQLALCHEMY_DATABASE_URI)

    session = db_manager.get_session()
    try:
        # Define invalid categories to delete
        invalid_categories = ["misc", "catering", "commercial", "take_out"]

        # Get count before deletion
        total_before = session.execute(
            text("SELECT COUNT(*) FROM restaurants")
        ).scalar()

        deleted_count = 0
        deleted_restaurants = []

        for category in invalid_categories:
            # Get restaurants to be deleted for logging
            restaurants = session.execute(
                text(
                    "SELECT id, name, kosher_category, certifying_agency FROM restaurants WHERE kosher_category = :category"
                ),
                {"category": category},
            ).fetchall()

            for restaurant in restaurants:
                deleted_restaurants.append(
                    {
                        "id": restaurant[0],
                        "name": restaurant[1],
                        "category": restaurant[2],
                        "agency": restaurant[3],
                    }
                )

            # Delete restaurants with this category
            result = session.execute(
                text("DELETE FROM restaurants WHERE kosher_category = :category"),
                {"category": category},
            )

            deleted_count += result.rowcount
            logger.info(
                f"Deleted {result.rowcount} restaurants with category '{category}'"
            )

        # Get count after deletion
        total_after = session.execute(text("SELECT COUNT(*) FROM restaurants")).scalar()

        session.commit()

        # Print summary
        print("\n" + "=" * 60)
        print("DELETION SUMMARY")
        print("=" * 60)
        print(f"Total restaurants before: {total_before}")
        print(f"Total restaurants after: {total_after}")
        print(f"Deleted restaurants: {deleted_count}")

        print("\n" + "=" * 60)
        print("DELETED RESTAURANTS")
        print("=" * 60)
        for i, restaurant in enumerate(deleted_restaurants, 1):
            print(
                f"{i}. {restaurant['name']} - {restaurant['category']} - {restaurant['agency']}"
            )

        # Show final category distribution
        print("\n" + "=" * 60)
        print("FINAL CATEGORY DISTRIBUTION")
        print("=" * 60)
        categories = session.execute(
            text(
                "SELECT kosher_category, COUNT(*) FROM restaurants GROUP BY kosher_category ORDER BY COUNT(*) DESC"
            )
        ).fetchall()

        for category, count in categories:
            print(f"{category}: {count} restaurants")

        print("\n" + "=" * 60)

    except SQLAlchemyError as e:
        logger.error(f"Error deleting invalid categories: {e}")
        session.rollback()
        return False
    finally:
        if session:
            session.close()

    return True


if __name__ == "__main__":
    success = delete_invalid_categories()
    if success:
        logger.info("Successfully deleted invalid categories")
    else:
        logger.error("Failed to delete invalid categories")
        sys.exit(1)
