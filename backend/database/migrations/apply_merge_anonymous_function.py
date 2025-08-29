#!/usr/bin/env python3
"""
Migration script to create merge_anonymous_user_data function and merge_jobs table
Date: 2025-01-20
Purpose: Support idempotent anonymous user data merging with ON CONFLICT DO NOTHING
"""

import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from config.config import get_database_url


def apply_migration():
    """Apply the merge_anonymous_user_data function and merge_jobs table migration"""

    # Read the SQL migration file
    sql_file_path = Path(__file__).parent / "create_merge_anonymous_function.sql"

    if not sql_file_path.exists():
        print(f"Error: SQL migration file not found at {sql_file_path}")
        return False

    try:
        with open(sql_file_path, "r") as f:
            sql_migration = f.read()
    except Exception as e:
        print(f"Error reading SQL migration file: {e}")
        return False

    # Get database connection
    database_url = get_database_url()
    if not database_url:
        print("Error: Database URL not configured")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print(
            "Applying merge_anonymous_user_data function and merge_jobs table migration..."
        )

        # Execute the migration
        cursor.execute(sql_migration)

        # Verify the function was created
        cursor.execute(
            """
            SELECT routine_name, routine_type 
            FROM information_schema.routines 
            WHERE routine_name = 'merge_anonymous_user_data'
        """
        )

        function_exists = cursor.fetchone()
        if not function_exists:
            print("Error: merge_anonymous_user_data function was not created")
            return False

        # Verify the table was created
        cursor.execute(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'merge_jobs'
        """
        )

        table_exists = cursor.fetchone()
        if not table_exists:
            print("Error: merge_jobs table was not created")
            return False

        print("✅ Migration applied successfully!")
        print("✅ merge_anonymous_user_data function created")
        print("✅ merge_jobs table created with RLS policies")

        # Test the function with dummy data
        print("\nTesting function with dummy UUIDs...")
        try:
            cursor.execute(
                """
                SELECT merge_anonymous_user_data(
                    '00000000-0000-0000-0000-000000000001'::UUID,
                    '00000000-0000-0000-0000-000000000002'::UUID
                )
            """
            )
            result = cursor.fetchone()
            print(
                f"✅ Function test successful, returned: {result[0] if result else 'None'}"
            )
        except Exception as e:
            print(f"⚠️  Function test failed (expected if tables don't exist): {e}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"Error applying migration: {e}")
        return False


def rollback_migration():
    """Rollback the migration by dropping the function and table"""

    database_url = get_database_url()
    if not database_url:
        print("Error: Database URL not configured")
        return False

    try:
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("Rolling back merge_anonymous_user_data migration...")

        # Drop the function
        cursor.execute("DROP FUNCTION IF EXISTS merge_anonymous_user_data(UUID, UUID)")

        # Drop the table
        cursor.execute("DROP TABLE IF EXISTS merge_jobs")

        print("✅ Rollback completed successfully!")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"Error rolling back migration: {e}")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Apply or rollback merge_anonymous_user_data migration"
    )
    parser.add_argument(
        "--rollback", action="store_true", help="Rollback the migration"
    )

    args = parser.parse_args()

    if args.rollback:
        success = rollback_migration()
    else:
        success = apply_migration()

    sys.exit(0 if success else 1)
