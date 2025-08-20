#!/usr/bin/env python3
"""Simple script to check existing tables using the working database manager."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def check_tables():
    """Check what tables exist in the database."""
    try:
        # Import the working database manager
        from database.database_manager_v3 import EnhancedDatabaseManager
        from sqlalchemy import text

        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found")
            return False

        print(f"🔗 Connecting to database...")
        print(f"   URL: {database_url[:50]}...")

        # Create database manager
        db_manager = EnhancedDatabaseManager(database_url)

        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return False

        print("✅ Connected to database successfully")

        # Get engine and check tables
        engine = db_manager.engine

        with engine.connect() as connection:
            # Get all tables
            result = connection.execute(
                text(
                    """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """
                )
            )

            tables = [row[0] for row in result]

            print(f"\n📋 Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table}")

            # Check if profiles table exists
            if "profiles" in tables:
                print(f"\n✅ Profiles table exists!")

                # Check profiles table structure
                result = connection.execute(
                    text(
                        """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'profiles' 
                    ORDER BY ordinal_position;
                """
                    )
                )

                print(f"\n📊 Profiles table structure:")
                for row in result:
                    nullable = "NULL" if row[2] == "YES" else "NOT NULL"
                    print(f"   - {row[0]}: {row[1]} ({nullable})")

                # Check indexes
                result = connection.execute(
                    text(
                        """
                    SELECT indexname, indexdef
                    FROM pg_indexes 
                    WHERE tablename = 'profiles';
                """
                    )
                )

                print(f"\n🔍 Indexes on profiles table:")
                for row in result:
                    print(f"   - {row[0]}: {row[1][:100]}...")

            else:
                print(f"\n❌ Profiles table does not exist")
                print(f"   Need to create profiles table and indexes")

            return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("🔍 Checking existing database tables...")
    success = check_tables()
    if success:
        print("\n✅ Database check completed successfully")
    else:
        print("\n❌ Database check failed")
        sys.exit(1)
