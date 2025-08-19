#!/usr/bin/env python3
"""
Show Database Categories Script
==============================

This script shows detailed information about bakery and other valid categories
in the database.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
from sqlalchemy import text

# Add the backend directory to the path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManager
from config.config import Config


def show_database_categories():
    """Show detailed breakdown of database categories."""
    config = Config()
    db_manager = DatabaseManager(config.SQLALCHEMY_DATABASE_URI)

    session = db_manager.get_session()
    try:
        # Get bakery restaurants
        bakery_restaurants = session.execute(
            text(
                "SELECT name, kosher_category, certifying_agency, listing_type FROM restaurants WHERE kosher_category = 'bakery' ORDER BY name"
            )
        ).fetchall()

        print("=" * 60)
        print("BAKERY RESTAURANTS (7 total)")
        print("=" * 60)
        for i, restaurant in enumerate(bakery_restaurants, 1):
            print(
                f"{i}. {restaurant[0]} - {restaurant[1]} - {restaurant[2]} - {restaurant[3]}"
            )

        # Get other valid categories
        other_categories = session.execute(
            text(
                "SELECT kosher_category, COUNT(*) FROM restaurants WHERE kosher_category NOT IN ('meat', 'dairy', 'pareve', 'bakery') GROUP BY kosher_category ORDER BY COUNT(*) DESC"
            )
        ).fetchall()

        print("\n" + "=" * 60)
        print("OTHER VALID CATEGORIES (6 total)")
        print("=" * 60)

        total_other = 0
        for category, count in other_categories:
            total_other += count
            print(f"\n{category.upper()} ({count} restaurants):")
            restaurants = session.execute(
                text(
                    "SELECT name, kosher_category, certifying_agency, listing_type FROM restaurants WHERE kosher_category = :category ORDER BY name"
                ),
                {"category": category},
            ).fetchall()
            for i, restaurant in enumerate(restaurants, 1):
                print(
                    f"  {i}. {restaurant[0]} - {restaurant[1]} - {restaurant[2]} - {restaurant[3]}"
                )

        print(f"\nTotal 'other' restaurants: {total_other}")

        # Show summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        all_categories = session.execute(
            text(
                "SELECT kosher_category, COUNT(*) FROM restaurants GROUP BY kosher_category ORDER BY COUNT(*) DESC"
            )
        ).fetchall()

        for category, count in all_categories:
            print(f"{category}: {count} restaurants")

    finally:
        session.close()


if __name__ == "__main__":
    show_database_categories()
