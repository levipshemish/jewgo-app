#!/usr/bin/env python3
"""
Fix Parve Spelling Inconsistency
================================

This script fixes the spelling inconsistency in the kosher_category field
where some restaurants have "parve" instead of the correct "pareve".

The correct spelling is "pareve" (with two 'e's), which is the proper
Hebrew/Yiddish term for foods that are neither meat nor dairy.

Usage:
    python scripts/maintenance/fix_parve_spelling.py [--dry-run]
"""

import os
import sys
import argparse
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor


def success_response(message: str, data: dict = None) -> dict:
    """Simple success response function."""
    return {"success": True, "message": message, "data": data or {}}


def error_response(message: str) -> dict:
    """Simple error response function."""
    return {"success": False, "message": message}


def fix_parve_spelling(dry_run: bool = True) -> dict:
    """
    Fix the spelling inconsistency in kosher_category field.

    Args:
        dry_run (bool): If True, only show what would be changed without making changes

    Returns:
        dict: Results of the operation
    """
    try:
        # Get database URL from environment
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return error_response("DATABASE_URL environment variable is required")

        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Find restaurants with incorrect "parve" spelling
        cursor.execute(
            """
            SELECT id, name, kosher_category 
            FROM restaurants 
            WHERE kosher_category = 'parve'
        """
        )

        restaurants_with_parve = cursor.fetchall()

        print(
            f"Found {len(restaurants_with_parve)} restaurants with incorrect 'parve' spelling"
        )

        if not restaurants_with_parve:
            return success_response(
                "No restaurants found with incorrect 'parve' spelling",
                data={"fixed_count": 0, "restaurants": []},
            )

        # Show which restaurants would be affected
        affected_restaurants = []
        for restaurant in restaurants_with_parve:
            affected_restaurants.append(
                {
                    "id": restaurant["id"],
                    "name": restaurant["name"],
                    "current_kosher_category": restaurant["kosher_category"],
                    "new_kosher_category": "pareve",
                }
            )

        print("Restaurants that would be updated:")
        for restaurant in affected_restaurants:
            print(f"  - {restaurant['name']} (ID: {restaurant['id']})")

        if dry_run:
            return success_response(
                f"DRY RUN: Would fix {len(restaurants_with_parve)} restaurants with incorrect 'parve' spelling",
                data={
                    "dry_run": True,
                    "fixed_count": len(restaurants_with_parve),
                    "restaurants": affected_restaurants,
                },
            )

        # Actually update the restaurants
        cursor.execute(
            """
            UPDATE restaurants 
            SET kosher_category = 'pareve', updated_at = NOW()
            WHERE kosher_category = 'parve'
        """
        )

        updated_count = cursor.rowcount
        conn.commit()

        print(f"Successfully updated {updated_count} restaurants")

        # Verify the changes
        cursor.execute(
            "SELECT COUNT(*) as count FROM restaurants WHERE kosher_category = 'parve'"
        )
        remaining_parve = cursor.fetchone()["count"]

        cursor.execute(
            "SELECT COUNT(*) as count FROM restaurants WHERE kosher_category = 'pareve'"
        )
        pareve_count = cursor.fetchone()["count"]

        print(
            f"After update: {remaining_parve} restaurants with 'parve', {pareve_count} restaurants with 'pareve'"
        )

        return success_response(
            f"Successfully fixed {updated_count} restaurants with incorrect 'parve' spelling",
            data={
                "dry_run": False,
                "fixed_count": updated_count,
                "remaining_parve": remaining_parve,
                "pareve_count": pareve_count,
                "restaurants": affected_restaurants,
            },
        )

    except Exception as e:
        print(f"Error fixing parve spelling: {e}")
        return error_response(f"Failed to fix parve spelling: {str(e)}")

    finally:
        if "cursor" in locals():
            cursor.close()
        if "conn" in locals():
            conn.close()


def main():
    """Main function to run the script."""
    parser = argparse.ArgumentParser(
        description="Fix parve spelling inconsistency in kosher categories"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes (default: True)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually apply the changes (overrides --dry-run)",
    )

    args = parser.parse_args()

    # Default to dry-run unless --apply is specified
    dry_run = not args.apply

    print(f"Starting parve spelling fix (dry_run: {dry_run})")

    result = fix_parve_spelling(dry_run=dry_run)

    if result.get("success"):
        print(f"✅ {result['message']}")
        if "data" in result:
            print(f"📊 Fixed count: {result['data'].get('fixed_count', 0)}")
            if result["data"].get("restaurants"):
                print("\n📋 Affected restaurants:")
                for restaurant in result["data"]["restaurants"]:
                    print(f"  - {restaurant['name']} (ID: {restaurant['id']})")
    else:
        print(f"❌ {result['message']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
