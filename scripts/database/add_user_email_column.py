#!/usr/bin/env python3
"""
Migration Script: Add user_email column to restaurants table
==========================================================

This script adds the missing user_email column to the restaurants table.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from datetime import datetime


def add_user_email_column():
    """Add user_email column to restaurants table if it doesn't exist."""

    # Get database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        # Parse the database URL
        # Format: postgresql://username:password@host:port/database?params
        if database_url.startswith("postgresql://"):
            # Remove postgresql:// prefix
            url_part = database_url[13:]

            # Split on @ to separate credentials from host
            credentials_part, host_part = url_part.split("@", 1)

            # Split credentials
            username, password = credentials_part.split(":", 1)

            # Split host part
            if "?" in host_part:
                host_port_db, params = host_part.split("?", 1)
            else:
                host_port_db = host_part
                params = ""

            # Split host:port/database
            if "/" in host_port_db:
                host_port, database = host_port_db.rsplit("/", 1)
            else:
                host_port = host_port_db
                database = "postgres"

            # Split host:port
            if ":" in host_port:
                host, port = host_port.split(":", 1)
            else:
                host = host_port
                port = "5432"

            # Parse additional parameters
            sslmode = "require"
            channel_binding = "require"

            if params:
                param_pairs = params.split("&")
                for pair in param_pairs:
                    if "=" in pair:
                        key, value = pair.split("=", 1)
                        if key == "sslmode":
                            sslmode = value
                        elif key == "channel_binding":
                            channel_binding = value

            print(f"🔌 Connecting to database: {host}:{port}/{database}")

            # Connect to database
            conn = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                sslmode=sslmode,
            )

            conn.autocommit = True
            cursor = conn.cursor()

            # Check if user_email column exists
            print("🔍 Checking if user_email column exists...")
            cursor.execute(
                """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = 'user_email'
            """
            )

            column_exists = cursor.fetchone()

            if column_exists:
                print("✅ user_email column already exists")
                return True

            # Add the user_email column
            print("➕ Adding user_email column to restaurants table...")
            cursor.execute(
                """
                ALTER TABLE restaurants 
                ADD COLUMN user_email VARCHAR(255)
            """
            )

            print("✅ user_email column added successfully")

            # Verify the column was added
            cursor.execute(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = 'user_email'
            """
            )

            column_info = cursor.fetchone()
            if column_info:
                print(
                    f"✅ Column verified: {column_info[0]} ({column_info[1]}, nullable: {column_info[2]})"
                )
            else:
                print("❌ Column was not added properly")
                return False

            cursor.close()
            conn.close()

            print("🎉 Migration completed successfully!")
            return True

        else:
            print("❌ Invalid database URL format")
            return False

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback

        traceback.print_exc()
        return False


def check_table_structure():
    """Check the current structure of the restaurants table."""

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        # Parse the database URL (simplified version)
        if database_url.startswith("postgresql://"):
            url_part = database_url[13:]
            credentials_part, host_part = url_part.split("@", 1)
            username, password = credentials_part.split(":", 1)

            if "?" in host_part:
                host_port_db, params = host_part.split("?", 1)
            else:
                host_port_db = host_part
                params = ""

            if "/" in host_port_db:
                host_port, database = host_port_db.rsplit("/", 1)
            else:
                host_port = host_port_db
                database = "postgres"

            if ":" in host_port:
                host, port = host_port.split(":", 1)
            else:
                host = host_port
                port = "5432"

            sslmode = "require"
            if params:
                param_pairs = params.split("&")
                for pair in param_pairs:
                    if "=" in pair:
                        key, value = pair.split("=", 1)
                        if key == "sslmode":
                            sslmode = value

            print(f"🔍 Checking table structure for {host}:{port}/{database}")

            conn = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                sslmode=sslmode,
            )

            cursor = conn.cursor()

            # Get all columns in the restaurants table
            cursor.execute(
                """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'restaurants'
                ORDER BY ordinal_position
            """
            )

            columns = cursor.fetchall()

            print(f"\n📋 Current restaurants table structure ({len(columns)} columns):")
            print("=" * 80)
            print(f"{'Column Name':<25} {'Data Type':<15} {'Nullable':<10} {'Default'}")
            print("-" * 80)

            for column in columns:
                column_name, data_type, is_nullable, column_default = column
                default_str = str(column_default) if column_default else "NULL"
                print(
                    f"{column_name:<25} {data_type:<15} {is_nullable:<10} {default_str}"
                )

            cursor.close()
            conn.close()

            return True

        else:
            print("❌ Invalid database URL format")
            return False

    except Exception as e:
        print(f"❌ Error checking table structure: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 Starting Database Migration")
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Load environment variables
    try:
        from dotenv import load_dotenv

        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("⚠️  python-dotenv not available, using system environment")

    # Check current table structure
    print("\n📋 Checking current table structure...")
    check_table_structure()

    # Run migration
    print("\n🔄 Running migration...")
    success = add_user_email_column()

    if success:
        print("\n✅ Migration completed successfully!")
        print("\n📋 Final table structure:")
        check_table_structure()
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
