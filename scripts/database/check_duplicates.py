#!/usr/bin/env python3
"""
Check Duplicates Script
======================

This script checks for duplicate restaurants in the database based on:
- Exact name matches
- Name + address matches
- Phone number matches
- Website matches

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


def check_duplicates():
    """Check for duplicate restaurants in the database."""
    config = Config()
    db_manager = DatabaseManager(config.SQLALCHEMY_DATABASE_URI)

    session = db_manager.get_session()
    try:
        print("=" * 80)
        print("DUPLICATE RESTAURANT CHECK")
        print("=" * 80)

        # 1. Check for exact name duplicates
        print("\n1. EXACT NAME DUPLICATES")
        print("-" * 40)
        name_duplicates = session.execute(
            text(
                """
                SELECT name, COUNT(*) as count, 
                       STRING_AGG(CONCAT(id, ':', address, ':', phone_number), ' | ') as details
                FROM restaurants 
                GROUP BY name 
                HAVING COUNT(*) > 1 
                ORDER BY count DESC, name
            """
            )
        ).fetchall()

        if name_duplicates:
            for name, count, details in name_duplicates:
                print(f"\n'{name}' ({count} duplicates):")
                for detail in details.split(" | "):
                    parts = detail.split(":")
                    if len(parts) >= 3:
                        print(
                            f"  ID: {parts[0]}, Address: {parts[1]}, Phone: {parts[2]}"
                        )
        else:
            print("No exact name duplicates found.")

        # 2. Check for name + address duplicates
        print("\n2. NAME + ADDRESS DUPLICATES")
        print("-" * 40)
        name_address_duplicates = session.execute(
            text(
                """
                SELECT name, address, COUNT(*) as count,
                       STRING_AGG(CONCAT(id, ':', phone_number, ':', kosher_category), ' | ') as details
                FROM restaurants 
                GROUP BY name, address 
                HAVING COUNT(*) > 1 
                ORDER BY count DESC, name
            """
            )
        ).fetchall()

        if name_address_duplicates:
            for name, address, count, details in name_address_duplicates:
                print(f"\n'{name}' at '{address}' ({count} duplicates):")
                for detail in details.split(" | "):
                    parts = detail.split(":")
                    if len(parts) >= 3:
                        print(
                            f"  ID: {parts[0]}, Phone: {parts[1]}, Category: {parts[2]}"
                        )
        else:
            print("No name + address duplicates found.")

        # 3. Check for phone number duplicates
        print("\n3. PHONE NUMBER DUPLICATES")
        print("-" * 40)
        phone_duplicates = session.execute(
            text(
                """
                SELECT phone_number, COUNT(*) as count,
                       STRING_AGG(CONCAT(id, ':', name, ':', address), ' | ') as details
                FROM restaurants 
                WHERE phone_number IS NOT NULL AND phone_number != ''
                GROUP BY phone_number 
                HAVING COUNT(*) > 1 
                ORDER BY count DESC, phone_number
            """
            )
        ).fetchall()

        if phone_duplicates:
            for phone, count, details in phone_duplicates:
                print(f"\nPhone: {phone} ({count} duplicates):")
                for detail in details.split(" | "):
                    parts = detail.split(":")
                    if len(parts) >= 3:
                        print(
                            f"  ID: {parts[0]}, Name: {parts[1]}, Address: {parts[2]}"
                        )
        else:
            print("No phone number duplicates found.")

        # 4. Check for website duplicates
        print("\n4. WEBSITE DUPLICATES")
        print("-" * 40)
        website_duplicates = session.execute(
            text(
                """
                SELECT website, COUNT(*) as count,
                       STRING_AGG(CONCAT(id, ':', name, ':', address), ' | ') as details
                FROM restaurants 
                WHERE website IS NOT NULL AND website != ''
                GROUP BY website 
                HAVING COUNT(*) > 1 
                ORDER BY count DESC, website
            """
            )
        ).fetchall()

        if website_duplicates:
            for website, count, details in website_duplicates:
                print(f"\nWebsite: {website} ({count} duplicates):")
                for detail in details.split(" | "):
                    parts = detail.split(":")
                    if len(parts) >= 3:
                        print(
                            f"  ID: {parts[0]}, Name: {parts[1]}, Address: {parts[2]}"
                        )
        else:
            print("No website duplicates found.")

        # 5. Check for similar names (fuzzy matching)
        print("\n5. SIMILAR NAMES (Potential Duplicates)")
        print("-" * 40)
        similar_names = session.execute(
            text(
                """
                SELECT name, COUNT(*) as count
                FROM restaurants 
                GROUP BY LOWER(TRIM(name))
                HAVING COUNT(*) > 1 
                ORDER BY count DESC, name
            """
            )
        ).fetchall()

        if similar_names:
            for name, count in similar_names:
                print(f"\nSimilar names for '{name}' ({count} entries):")
                restaurants = session.execute(
                    text(
                        "SELECT id, name, address, phone_number FROM restaurants WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) ORDER BY id"
                    ),
                    {"name": name},
                ).fetchall()
                for restaurant in restaurants:
                    print(
                        f"  ID: {restaurant[0]}, Name: '{restaurant[1]}', Address: {restaurant[2]}, Phone: {restaurant[3]}"
                    )
        else:
            print("No similar names found.")

        # 6. Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)

        total_duplicates = (
            len(name_duplicates)
            + len(name_address_duplicates)
            + len(phone_duplicates)
            + len(website_duplicates)
        )

        print(f"Exact name duplicates: {len(name_duplicates)}")
        print(f"Name + address duplicates: {len(name_address_duplicates)}")
        print(f"Phone number duplicates: {len(phone_duplicates)}")
        print(f"Website duplicates: {len(website_duplicates)}")
        print(f"Similar names: {len(similar_names)}")
        print(f"Total duplicate groups: {total_duplicates}")

        if total_duplicates > 0:
            print("\n⚠️  DUPLICATES FOUND - Consider running cleanup script")
        else:
            print("\n✅ NO DUPLICATES FOUND - Database is clean!")

        print("=" * 80)

    except SQLAlchemyError as e:
        logger.error(f"Error checking duplicates: {e}")
        return False
    finally:
        if session:
            session.close()

    return True


if __name__ == "__main__":
    success = check_duplicates()
    if not success:
        sys.exit(1)
