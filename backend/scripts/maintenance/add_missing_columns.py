import os
import sys

import psycopg2
from dotenv import load_dotenv
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


        from database.database_manager_v3 import EnhancedDatabaseManager





#!/usr/bin/env python3
"""Script to add missing columns to the restaurants table.
This fixes the issue where the eatery page shows no listings due to schema mismatch.
"""

def add_missing_columns() -> None:
    """Add missing columns to the restaurants table."""
    # Load environment variables
    load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        sys.exit(1)

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if columns already exist
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'restaurants'
            AND column_name IN ('current_time_local', 'hours_parsed')
        """
        )
        existing_columns = [row[0] for row in cur.fetchall()]

        # Add missing columns
        if "current_time_local" not in existing_columns:
            cur.execute(
                """
                ALTER TABLE restaurants
                ADD COLUMN current_time_local TIMESTAMP
            """
            )

        if "hours_parsed" not in existing_columns:
            cur.execute(
                """
                ALTER TABLE restaurants
                ADD COLUMN hours_parsed BOOLEAN DEFAULT FALSE
            """
            )

        # Verify the columns were added
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'restaurants'
            AND column_name IN ('current_time_local', 'hours_parsed')
        """
        )
        new_columns = [row[0] for row in cur.fetchall()]

        # Test the database manager
        db = EnhancedDatabaseManager(database_url)
        if db.connect():

            # Test getting restaurants
            restaurants = db.get_restaurants(limit=5, as_dict=True)

            if restaurants:
                sample = restaurants[0]
        else:
            pass

        cur.close()
        conn.close()

    except Exception as e:
        sys.exit(1)


if __name__ == "__main__":
    add_missing_columns()
