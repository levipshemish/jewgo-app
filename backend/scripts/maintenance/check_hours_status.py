#!/usr/bin/env python3
"""
Check the current hours status of all restaurants.
"""

import os
import sys

from database.database_manager_v3 import EnhancedDatabaseManager
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def check_hours_status():
    """Check the current hours status of all restaurants."""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return

    # Initialize database manager
    db_manager = EnhancedDatabaseManager(database_url)

    try:
        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return

        print("✅ Connected to database")

        # Get statistics about hours data
        # Check total restaurants
        total_query = text("SELECT COUNT(*) FROM restaurants")

        # Check restaurants with hours_json
        hours_json_query = text(
            "SELECT COUNT(*) FROM restaurants WHERE hours_json IS NOT NULL"
        )

        # Check restaurants with hours_of_operation
        hours_text_query = text(
            "SELECT COUNT(*) FROM restaurants WHERE hours_of_operation IS NOT NULL AND hours_of_operation != ''"
        )

        # Check restaurants with google_place_id
        google_place_query = text(
            "SELECT COUNT(*) FROM restaurants WHERE google_place_id IS NOT NULL AND google_place_id != ''"
        )

        with db_manager.get_session() as session:
            total = session.execute(total_query).scalar()
            hours_json_count = session.execute(hours_json_query).scalar()
            hours_text_count = session.execute(hours_text_query).scalar()
            google_place_count = session.execute(google_place_query).scalar()

        print(f"\n📊 Hours Status Report:")
        print(f"   Total restaurants: {total}")
        print(f"   With hours_json: {hours_json_count}")
        print(f"   With hours_of_operation: {hours_text_count}")
        print(f"   With google_place_id: {google_place_count}")

        # Get restaurants without hours
        no_hours_query = text(
            """
        SELECT id, name, address 
        FROM restaurants 
        WHERE (hours_json IS NULL OR hours_json::text = 'null')
        AND (hours_of_operation IS NULL OR hours_of_operation = '')
        ORDER BY id
        LIMIT 10
        """
        )

        with db_manager.get_session() as session:
            no_hours = session.execute(no_hours_query).fetchall()

        print(f"\n📋 Sample restaurants without hours (first 10):")
        for restaurant in no_hours:
            print(f"   ID {restaurant[0]}: {restaurant[1]} - {restaurant[2]}")

        if len(no_hours) == 10:
            print(f"   ... and more")

    except Exception as e:
        print(f"❌ Error checking hours status: {e}")
    finally:
        db_manager.disconnect()


if __name__ == "__main__":
    check_hours_status()
