#!/usr/bin/env python3
"""Test script to check if marketplace table exists."""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from database.database_manager_v3 import EnhancedDatabaseManager


def test_marketplace_table():
    """Test if marketplace table exists."""
    try:
        db_manager = EnhancedDatabaseManager()

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if marketplace table exists
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'marketplace'
                    );
                """
                )

                table_exists = cursor.fetchone()[0]

                if table_exists:
                    print("✅ Marketplace table exists")

                    # Check if table has data
                    cursor.execute("SELECT COUNT(*) FROM marketplace")
                    count = cursor.fetchone()[0]
                    print(f"📊 Marketplace table has {count} records")

                    # Check table structure
                    cursor.execute(
                        """
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'marketplace' 
                        ORDER BY ordinal_position
                    """
                    )

                    columns = cursor.fetchall()
                    print("📋 Table structure:")
                    for col_name, data_type in columns:
                        print(f"  - {col_name}: {data_type}")

                else:
                    print("❌ Marketplace table does not exist")

                    # Check what tables exist
                    cursor.execute(
                        """
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        ORDER BY table_name
                    """
                    )

                    tables = cursor.fetchall()
                    print("📋 Available tables:")
                    for table in tables:
                        print(f"  - {table[0]}")

    except Exception as e:
        print(f"❌ Error testing marketplace table: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_marketplace_table()
