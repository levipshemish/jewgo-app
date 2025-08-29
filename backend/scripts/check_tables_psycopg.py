# !/usr/bin/env python3
"""Check existing tables using psycopg2 directly."""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def check_tables():
    """Check what tables exist in the database."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found")
            return False
        print("🔗 Connecting to database...")
        print(f"   URL: {database_url[:50]}...")
        # Convert SQLAlchemy URL to psycopg2 format
        # Remove the +psycopg part and convert to standard PostgreSQL URL
        pg_url = database_url.replace("postgresql+psycopg://", "postgresql://")
        # Connect to database
        conn = psycopg2.connect(pg_url)
        cursor = conn.cursor()
        print("✅ Connected to database successfully")
        # Get all tables
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """
        )
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n📋 Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table}")
        # Check if profiles table exists
        if "profiles" in tables:
            print("\n✅ Profiles table exists!")
            # Check profiles table structure
            cursor.execute(
                """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'profiles'
                ORDER BY ordinal_position;
            """
            )
            print("\n📊 Profiles table structure:")
            for row in cursor.fetchall():
                nullable = "NULL" if row[2] == "YES" else "NOT NULL"
                default = f" DEFAULT {row[3]}" if row[3] else ""
                print(f"   - {row[0]}: {row[1]} ({nullable}{default})")
            # Check indexes
            cursor.execute(
                """
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'profiles';
            """
            )
            print("\n🔍 Indexes on profiles table:")
            for row in cursor.fetchall():
                print(f"   - {row[0]}: {row[1][:100]}...")
        else:
            print("\n❌ Profiles table does not exist")
            print("   Need to create profiles table and indexes")
        # Close connection
        cursor.close()
        conn.close()
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
