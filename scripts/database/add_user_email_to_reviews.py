#!/usr/bin/env python3
"""
Add user_email column to reviews table
=====================================

This script adds the missing user_email column to the reviews table.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from datetime import datetime


def add_user_email_to_reviews():
    """Add user_email column to reviews table if it doesn't exist."""

    # Get database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        # Parse the database URL
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

            # Check if user_email column exists in reviews table
            print("🔍 Checking if user_email column exists in reviews table...")
            cursor.execute(
                """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reviews' 
                AND column_name = 'user_email'
            """
            )

            column_exists = cursor.fetchone()

            if column_exists:
                print("✅ user_email column already exists in reviews table")
                return True

            # Add the user_email column
            print("➕ Adding user_email column to reviews table...")
            cursor.execute(
                """
                ALTER TABLE reviews 
                ADD COLUMN user_email VARCHAR(255)
            """
            )

            print("✅ user_email column added successfully to reviews table")

            # Verify the column was added
            cursor.execute(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'reviews' 
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


if __name__ == "__main__":
    print("🚀 Adding user_email to reviews table")
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Load environment variables
    try:
        from dotenv import load_dotenv

        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("⚠️  python-dotenv not available, using system environment")

    # Run migration
    success = add_user_email_to_reviews()

    if success:
        print("\n✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
