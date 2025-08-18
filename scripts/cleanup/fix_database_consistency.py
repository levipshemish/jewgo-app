#!/usr/bin/env python3
"""
Database Consistency Fix Script
==============================

This script fixes various database consistency issues:
1. Normalizes kosher_category case (dairy, meat, pareve)
2. Converts KM to Kosher Miami in certifying_agency
3. Normalizes listing_type case
4. Removes invalid/duplicate entries

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import logging
from typing import Dict, List, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
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


class DatabaseConsistencyFixer:
    def __init__(self):
        config = Config()
        self.db_manager = DatabaseManager(config.SQLALCHEMY_DATABASE_URI)

    def fix_kosher_categories(self) -> Dict[str, int]:
        """Normalize kosher_category case and fix spelling issues."""
        try:
            session = self.db_manager.get_session()

            # Define the mapping for kosher categories
            category_mapping = {
                "Dairy": "dairy",
                "Meat": "meat",
                "Pareve": "pareve",
                "parve": "pareve",  # Fix spelling
                "Bakery": "bakery",
                "Commercial": "commercial",
                "Catering": "catering",
                "Take Out": "take_out",
                "Misc": "misc",
            }

            updates = {}

            for old_category, new_category in category_mapping.items():
                # Update restaurants with the old category
                result = session.execute(
                    text(
                        "UPDATE restaurants SET kosher_category = :new_category WHERE kosher_category = :old_category"
                    ),
                    {"new_category": new_category, "old_category": old_category},
                )

                if result.rowcount > 0:
                    updates[f"{old_category} → {new_category}"] = result.rowcount
                    logger.info(
                        f"Updated {result.rowcount} restaurants: {old_category} → {new_category}"
                    )

            session.commit()
            return updates

        except SQLAlchemyError as e:
            logger.error(f"Error fixing kosher categories: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def fix_certifying_agencies(self) -> Dict[str, int]:
        """Convert KM to Kosher Miami and normalize other agencies."""
        try:
            session = self.db_manager.get_session()

            # Define the mapping for certifying agencies
            agency_mapping = {
                "KM": "Kosher Miami",
                "KDM": "Kosher Dining Miami",
                "DIAMOND K": "Diamond K",
            }

            updates = {}

            for old_agency, new_agency in agency_mapping.items():
                # Update restaurants with the old agency
                result = session.execute(
                    text(
                        "UPDATE restaurants SET certifying_agency = :new_agency WHERE certifying_agency = :old_agency"
                    ),
                    {"new_agency": new_agency, "old_agency": old_agency},
                )

                if result.rowcount > 0:
                    updates[f"{old_agency} → {new_agency}"] = result.rowcount
                    logger.info(
                        f"Updated {result.rowcount} restaurants: {old_agency} → {new_agency}"
                    )

            session.commit()
            return updates

        except SQLAlchemyError as e:
            logger.error(f"Error fixing certifying agencies: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def fix_listing_types(self) -> Dict[str, int]:
        """Normalize listing_type case."""
        try:
            session = self.db_manager.get_session()

            # Define the mapping for listing types
            type_mapping = {
                "Restaurant": "restaurant",
                "Bakery": "bakery",
                "Catering": "catering",
                "Grocery": "grocery",
                "Market": "market",
            }

            updates = {}

            for old_type, new_type in type_mapping.items():
                # Update restaurants with the old type
                result = session.execute(
                    text(
                        "UPDATE restaurants SET listing_type = :new_type WHERE listing_type = :old_type"
                    ),
                    {"new_type": new_type, "old_type": old_type},
                )

                if result.rowcount > 0:
                    updates[f"{old_type} → {new_type}"] = result.rowcount
                    logger.info(
                        f"Updated {result.rowcount} restaurants: {old_type} → {new_type}"
                    )

            session.commit()
            return updates

        except SQLAlchemyError as e:
            logger.error(f"Error fixing listing types: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def remove_invalid_entries(self) -> Dict[str, int]:
        """Remove restaurants with invalid data."""
        try:
            session = self.db_manager.get_session()

            # Remove restaurants with invalid kosher categories
            invalid_categories = [
                "Commercial",
                "Misc",
                "Take Out",
                "Bakery, Commercial",
                "Commercial, Dairy",
                "Meat, Commercial",
                "Misc, Pareve",
                "Pareve, Dairy, Meat",
            ]

            deleted_count = 0
            for invalid_category in invalid_categories:
                result = session.execute(
                    text("DELETE FROM restaurants WHERE kosher_category = :category"),
                    {"category": invalid_category},
                )
                deleted_count += result.rowcount
                if result.rowcount > 0:
                    logger.info(
                        f"Deleted {result.rowcount} restaurants with invalid category: {invalid_category}"
                    )

            session.commit()
            return {"deleted_invalid_entries": deleted_count}

        except SQLAlchemyError as e:
            logger.error(f"Error removing invalid entries: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def get_current_stats(self) -> Dict[str, Any]:
        """Get current database statistics."""
        try:
            session = self.db_manager.get_session()

            # Get total count
            total = session.execute(text("SELECT COUNT(*) FROM restaurants")).scalar()

            # Get kosher category distribution
            categories = session.execute(
                text(
                    "SELECT kosher_category, COUNT(*) FROM restaurants GROUP BY kosher_category ORDER BY COUNT(*) DESC"
                )
            ).fetchall()

            # Get certifying agency distribution
            agencies = session.execute(
                text(
                    "SELECT certifying_agency, COUNT(*) FROM restaurants GROUP BY certifying_agency ORDER BY COUNT(*) DESC"
                )
            ).fetchall()

            # Get listing type distribution
            types = session.execute(
                text(
                    "SELECT listing_type, COUNT(*) FROM restaurants GROUP BY listing_type ORDER BY COUNT(*) DESC"
                )
            ).fetchall()

            return {
                "total_restaurants": total,
                "kosher_categories": dict(categories),
                "certifying_agencies": dict(agencies),
                "listing_types": dict(types),
            }

        except SQLAlchemyError as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
        finally:
            if session:
                session.close()

    def run_all_fixes(self) -> Dict[str, Any]:
        """Run all database consistency fixes."""
        logger.info("Starting database consistency fixes...")

        # Get initial stats
        initial_stats = self.get_current_stats()
        logger.info(f"Initial database state: {initial_stats}")

        # Run fixes
        category_updates = self.fix_kosher_categories()
        agency_updates = self.fix_certifying_agencies()
        type_updates = self.fix_listing_types()
        deleted_entries = self.remove_invalid_entries()

        # Get final stats
        final_stats = self.get_current_stats()

        return {
            "initial_stats": initial_stats,
            "final_stats": final_stats,
            "category_updates": category_updates,
            "agency_updates": agency_updates,
            "type_updates": type_updates,
            "deleted_entries": deleted_entries,
        }


def main():
    """Main function to run the database consistency fixes."""
    try:
        fixer = DatabaseConsistencyFixer()
        results = fixer.run_all_fixes()

        logger.info("Database consistency fixes completed!")
        logger.info(f"Results: {results}")

        # Print summary
        print("\n" + "=" * 50)
        print("DATABASE CONSISTENCY FIX SUMMARY")
        print("=" * 50)

        print(
            f"\nInitial restaurants: {results['initial_stats'].get('total_restaurants', 0)}"
        )
        print(
            f"Final restaurants: {results['final_stats'].get('total_restaurants', 0)}"
        )

        print("\nKosher Category Updates:")
        for change, count in results["category_updates"].items():
            print(f"  {change}: {count} restaurants")

        print("\nCertifying Agency Updates:")
        for change, count in results["agency_updates"].items():
            print(f"  {change}: {count} restaurants")

        print("\nListing Type Updates:")
        for change, count in results["type_updates"].items():
            print(f"  {change}: {count} restaurants")

        print("\nDeleted Entries:")
        for change, count in results["deleted_entries"].items():
            print(f"  {change}: {count} restaurants")

        print("\nFinal Database State:")
        print(
            f"  Kosher Categories: {results['final_stats'].get('kosher_categories', {})}"
        )
        print(
            f"  Certifying Agencies: {results['final_stats'].get('certifying_agencies', {})}"
        )
        print(f"  Listing Types: {results['final_stats'].get('listing_types', {})}")

        print("\n" + "=" * 50)

    except Exception as e:
        logger.error(f"Error running database fixes: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
