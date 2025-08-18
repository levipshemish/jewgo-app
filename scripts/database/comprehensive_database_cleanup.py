#!/usr/bin/env python3
"""
Comprehensive Database Cleanup Script
====================================

This script performs a comprehensive cleanup of the database to ensure
all data is consistent and follows the correct format.

Author: JewGo Development Team
Version: 1.0
Updated: 2024 - Now uses unified DatabaseConnectionManager
"""

import os
import sys
import logging
from typing import Dict, List, Any
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Add the backend directory to the path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from utils.database_connection_manager import get_db_manager

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ComprehensiveDatabaseCleanup:
    def __init__(self):
        self.db_manager = get_db_manager()
        
        # Connect to database
        if not self.db_manager.connect():
            raise RuntimeError("Failed to connect to database")

    def cleanup_kosher_categories(self) -> Dict[str, int]:
        """Comprehensive cleanup of kosher categories."""
        try:
            with self.db_manager.session_scope() as session:
                # Define all possible mappings
                category_mappings = {
                    # Case normalization
                    "Dairy": "dairy",
                    "Meat": "meat",
                    "Pareve": "pareve",
                    "Bakery": "bakery",
                    "Catering": "catering",
                    "Commercial": "commercial",
                    "Take Out": "take_out",
                    "Misc": "misc",
                    # Spelling fixes
                    "parve": "pareve",
                    # Complex categories - convert to primary category
                    "Pareve, Dairy, Meat": "pareve",
                    "Dairy, Pareve": "dairy",
                    "Pareve, Bakery": "bakery",
                    "Commercial, Bakery": "bakery",
                    "Commercial, Dairy": "dairy",
                    "Meat, Commercial": "meat",
                    "Misc, Pareve": "pareve",
                    "Butcher, Meat": "meat",
                }

                updates = {}

                for old_category, new_category in category_mappings.items():
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

                return updates

        except SQLAlchemyError as e:
            logger.error(f"Error cleaning up kosher categories: {e}")
            return {}

    def cleanup_certifying_agencies(self) -> Dict[str, int]:
        """Comprehensive cleanup of certifying agencies."""
        try:
            session = self.db_manager.get_session()

            # Define all possible mappings
            agency_mappings = {
                "KM": "Kosher Miami",
                "KDM": "Kosher Dining Miami",
                "DIAMOND K": "Diamond K",
            }

            updates = {}

            for old_agency, new_agency in agency_mappings.items():
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
            logger.error(f"Error cleaning up certifying agencies: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def cleanup_listing_types(self) -> Dict[str, int]:
        """Comprehensive cleanup of listing types."""
        try:
            session = self.db_manager.get_session()

            # Define all possible mappings
            type_mappings = {
                "Restaurant": "restaurant",
                "Bakery": "bakery",
                "Catering": "catering",
                "Grocery": "grocery",
                "Market": "market",
            }

            updates = {}

            for old_type, new_type in type_mappings.items():
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
            logger.error(f"Error cleaning up listing types: {e}")
            session.rollback()
            return {}
        finally:
            if session:
                session.close()

    def remove_invalid_entries(self) -> Dict[str, int]:
        """Remove restaurants with invalid or problematic data."""
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
                "Commercial, Bakery",
                "Dairy, Pareve",
                "Pareve, Bakery",
                "Butcher, Meat",
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

            # Remove restaurants with invalid certifying agencies
            invalid_agencies = ["KM", "KDM", "DIAMOND K"]
            for invalid_agency in invalid_agencies:
                result = session.execute(
                    text("DELETE FROM restaurants WHERE certifying_agency = :agency"),
                    {"agency": invalid_agency},
                )
                deleted_count += result.rowcount
                if result.rowcount > 0:
                    logger.info(
                        f"Deleted {result.rowcount} restaurants with invalid agency: {invalid_agency}"
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

    def run_comprehensive_cleanup(self) -> Dict[str, Any]:
        """Run comprehensive database cleanup."""
        logger.info("Starting comprehensive database cleanup...")

        # Get initial stats
        initial_stats = self.get_current_stats()
        logger.info(f"Initial database state: {initial_stats}")

        # Run cleanup steps
        category_updates = self.cleanup_kosher_categories()
        agency_updates = self.cleanup_certifying_agencies()
        type_updates = self.cleanup_listing_types()
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
    """Main function to run the comprehensive database cleanup."""
    try:
        cleanup = ComprehensiveDatabaseCleanup()
        results = cleanup.run_comprehensive_cleanup()

        logger.info("Comprehensive database cleanup completed!")
        logger.info(f"Results: {results}")

        # Print summary
        print("\n" + "=" * 60)
        print("COMPREHENSIVE DATABASE CLEANUP SUMMARY")
        print("=" * 60)

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

        print("\n" + "=" * 60)

    except Exception as e:
        logger.error(f"Error running comprehensive cleanup: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
