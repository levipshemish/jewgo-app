#!/usr/bin/env python3
"""
Remove Duplicates Script
======================

This script removes duplicate restaurants from the database.
It keeps the restaurant with the lower ID (older entry) and removes duplicates.

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


def remove_duplicates():
    """Remove duplicate restaurants from the database."""
    config = Config()
    db_manager = DatabaseManager(config.SQLALCHEMY_DATABASE_URI)

    session = db_manager.get_session()
    try:
        print("=" * 80)
        print("REMOVING DUPLICATE RESTAURANTS")
        print("=" * 80)

        # Get count before deletion
        total_before = session.execute(
            text("SELECT COUNT(*) FROM restaurants")
        ).scalar()
        print(f"Total restaurants before: {total_before}")

        # Remove duplicates based on name + address (most common case)
        print("\n1. Removing duplicates based on name + address...")

        # Find duplicates and keep the one with the lowest ID
        duplicates_to_remove = session.execute(
            text(
                """
                DELETE FROM restaurants 
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY name, address 
                                   ORDER BY id
                               ) as rn
                        FROM restaurants
                    ) t
                    WHERE t.rn > 1
                )
            """
            )
        )

        deleted_count = duplicates_to_remove.rowcount
        logger.info(
            f"Deleted {deleted_count} duplicate restaurants based on name + address"
        )

        # Get count after deletion
        total_after = session.execute(text("SELECT COUNT(*) FROM restaurants")).scalar()

        session.commit()

        print(f"\nTotal restaurants after: {total_after}")
        print(f"Deleted duplicates: {deleted_count}")

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

        # Show final agency distribution
        print("\n" + "=" * 60)
        print("FINAL AGENCY DISTRIBUTION")
        print("=" * 60)
        agencies = session.execute(
            text(
                "SELECT certifying_agency, COUNT(*) FROM restaurants GROUP BY certifying_agency ORDER BY COUNT(*) DESC"
            )
        ).fetchall()

        for agency, count in agencies:
            print(f"{agency}: {count} restaurants")

        print("\n" + "=" * 80)
        print("DUPLICATE REMOVAL COMPLETED")
        print("=" * 80)

        return True

    except SQLAlchemyError as e:
        logger.error(f"Error removing duplicates: {e}")
        session.rollback()
        return False
    finally:
        if session:
            session.close()


if __name__ == "__main__":
    success = remove_duplicates()
    if success:
        logger.info("Successfully removed duplicates")
    else:
        logger.error("Failed to remove duplicates")
        sys.exit(1)
