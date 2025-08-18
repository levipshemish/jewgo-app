#!/usr/bin/env python3
"""
Check and Create Reviews Table
=============================

This script checks if the reviews table exists and creates it if needed.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from datetime import datetime


def check_reviews_table():
    """Check if reviews table exists and create it if needed."""

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

            # Check if reviews table exists
            print("🔍 Checking if reviews table exists...")
            cursor.execute(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'reviews'
            """
            )

            table_exists = cursor.fetchone()

            if table_exists:
                print("✅ Reviews table exists")

                # Check table structure
                cursor.execute(
                    """
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'reviews'
                    ORDER BY ordinal_position
                """
                )

                columns = cursor.fetchall()

                print(f"\n📋 Reviews table structure ({len(columns)} columns):")
                print("=" * 80)
                print(
                    f"{'Column Name':<25} {'Data Type':<15} {'Nullable':<10} {'Default'}"
                )
                print("-" * 80)

                for column in columns:
                    column_name, data_type, is_nullable, column_default = column
                    default_str = str(column_default) if column_default else "NULL"
                    print(
                        f"{column_name:<25} {data_type:<15} {is_nullable:<10} {default_str}"
                    )

                return True
            else:
                print("❌ Reviews table does not exist")
                print("🔄 Creating reviews table...")

                # Create reviews table
                cursor.execute(
                    """
                    CREATE TABLE reviews (
                        id VARCHAR(50) PRIMARY KEY,
                        restaurant_id INTEGER NOT NULL,
                        user_id VARCHAR(50) NOT NULL,
                        user_name VARCHAR(255) NOT NULL,
                        user_email VARCHAR(255),
                        rating INTEGER NOT NULL,
                        title VARCHAR(255),
                        content TEXT NOT NULL,
                        images TEXT,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                        moderator_notes TEXT,
                        verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
                        helpful_count INTEGER NOT NULL DEFAULT 0,
                        report_count INTEGER NOT NULL DEFAULT 0
                    )
                """
                )

                # Create review_flags table
                print("🔄 Creating review_flags table...")
                cursor.execute(
                    """
                    CREATE TABLE review_flags (
                        id VARCHAR(50) PRIMARY KEY,
                        review_id VARCHAR(50) NOT NULL,
                        reason VARCHAR(50) NOT NULL,
                        description TEXT,
                        reported_by VARCHAR(50) NOT NULL,
                        reported_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        resolved_by VARCHAR(50),
                        resolved_at TIMESTAMP WITHOUT TIME ZONE,
                        resolution_notes TEXT
                    )
                """
                )

                print("✅ Reviews and review_flags tables created successfully")

                # Verify the tables were created
                cursor.execute(
                    """
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name IN ('reviews', 'review_flags')
                    ORDER BY table_name
                """
                )

                created_tables = cursor.fetchall()
                print(f"✅ Created tables: {[table[0] for table in created_tables]}")

                cursor.close()
                conn.close()

                return True

        else:
            print("❌ Invalid database URL format")
            return False

    except Exception as e:
        print(f"❌ Error checking/creating reviews table: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 Checking Reviews Table")
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Load environment variables
    try:
        from dotenv import load_dotenv

        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("⚠️  python-dotenv not available, using system environment")

    # Check and create reviews table
    success = check_reviews_table()

    if success:
        print("\n✅ Reviews table check/creation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Reviews table check/creation failed!")
        sys.exit(1)
