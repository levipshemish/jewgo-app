#!/usr/bin/env python3
"""
Database Index Application Script for JewGo
==========================================

This script safely applies performance indexes to the JewGo production database.
It includes safety checks, backup verification, and rollback capabilities.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import sys
import psycopg2
import subprocess
from datetime import datetime
from typing import List, Dict, Optional
import argparse


def get_database_connection(database_url: str) -> psycopg2.extensions.connection:
    """Establish database connection."""
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)


def backup_database(conn: psycopg2.extensions.connection, backup_path: str) -> bool:
    """Create a database backup before applying indexes."""
    try:
        print("📦 Creating database backup...")

        # Get database name from connection
        db_name = conn.info.dbname

        # Create backup using pg_dump
        backup_command = [
            "pg_dump",
            "-h",
            conn.info.host,
            "-p",
            str(conn.info.port),
            "-U",
            conn.info.user,
            "-d",
            db_name,
            "-f",
            backup_path,
            "--verbose",
        ]

        # Set password environment variable
        env = os.environ.copy()
        env["PGPASSWORD"] = conn.info.password

        result = subprocess.run(backup_command, env=env, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"✅ Database backup created: {backup_path}")
            return True
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"❌ Backup error: {e}")
        return False


def check_existing_indexes(conn: psycopg2.extensions.connection) -> List[str]:
    """Check which indexes already exist."""
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'restaurants' 
            AND indexname LIKE 'idx_restaurants_%'
            ORDER BY indexname
        """
        )

        existing_indexes = [row[0] for row in cursor.fetchall()]
        cursor.close()

        return existing_indexes

    except Exception as e:
        print(f"❌ Error checking existing indexes: {e}")
        return []


def apply_indexes(conn: psycopg2.extensions.connection, index_file: str) -> bool:
    """Apply the performance indexes."""
    try:
        print("🔧 Applying performance indexes...")

        # Read the index file
        with open(index_file, "r") as f:
            index_sql = f.read()

        # Split into individual statements
        statements = [stmt.strip() for stmt in index_sql.split(";") if stmt.strip()]

        cursor = conn.cursor()
        applied_count = 0

        for statement in statements:
            if (
                statement.startswith("--") or not statement
            ):  # Skip comments and empty lines
                continue

            if statement.startswith("SELECT"):  # Skip the SELECT statement at the end
                continue

            try:
                cursor.execute(statement)
                applied_count += 1

                # Extract index name more reliably
                if statement.startswith("CREATE INDEX"):
                    # Handle IF NOT EXISTS syntax
                    if "IF NOT EXISTS" in statement:
                        # Extract index name after IF NOT EXISTS
                        parts = statement.split("IF NOT EXISTS")
                        if len(parts) > 1:
                            index_name = parts[1].split()[0]
                        else:
                            index_name = statement.split()[2]
                    else:
                        index_name = statement.split()[2]
                    print(f"  ✅ Applied: {index_name}")
                else:
                    print(f"  ✅ Applied: {statement[:50]}...")

            except Exception as e:
                if "already exists" in str(e):
                    # Extract index name for already exists error
                    if statement.startswith("CREATE INDEX"):
                        # Handle IF NOT EXISTS syntax
                        if "IF NOT EXISTS" in statement:
                            # Extract index name after IF NOT EXISTS
                            parts = statement.split("IF NOT EXISTS")
                            if len(parts) > 1:
                                index_name = parts[1].split()[0]
                            else:
                                index_name = statement.split()[2]
                        else:
                            index_name = statement.split()[2]
                        print(f"  ⚠️  Skipped (already exists): {index_name}")
                    else:
                        print(f"  ⚠️  Skipped (already exists): {statement[:50]}...")
                else:
                    # Extract index name for other errors
                    if statement.startswith("CREATE INDEX"):
                        # Handle IF NOT EXISTS syntax
                        if "IF NOT EXISTS" in statement:
                            # Extract index name after IF NOT EXISTS
                            parts = statement.split("IF NOT EXISTS")
                            if len(parts) > 1:
                                index_name = parts[1].split()[0]
                            else:
                                index_name = statement.split()[2]
                        else:
                            index_name = statement.split()[2]
                        print(f"  ❌ Failed: {index_name} - {e}")
                    else:
                        print(f"  ❌ Failed: {statement[:50]}... - {e}")
                    conn.rollback()
                    cursor.close()
                    return False

        conn.commit()
        cursor.close()

        print(f"✅ Successfully applied {applied_count} indexes")
        return True

    except Exception as e:
        print(f"❌ Error applying indexes: {e}")
        conn.rollback()
        return False


def verify_indexes(conn: psycopg2.extensions.connection) -> Dict[str, bool]:
    """Verify that all expected indexes were created."""
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'restaurants' 
            AND indexname LIKE 'idx_restaurants_%'
            ORDER BY indexname
        """
        )

        indexes = {row[0]: row[1] for row in cursor.fetchall()}
        cursor.close()

        expected_indexes = [
            "idx_restaurants_name",
            "idx_restaurants_city",
            "idx_restaurants_state",
            "idx_restaurants_kosher_category",
            "idx_restaurants_certifying_agency",
            "idx_restaurants_location",
            "idx_restaurants_city_state",
            "idx_restaurants_category_city",
            "idx_restaurants_agency_category",
            "idx_restaurants_name_city",
            "idx_restaurants_cholov_yisroel",
            "idx_restaurants_pas_yisroel",
            "idx_restaurants_cholov_stam",
            "idx_restaurants_created_at",
            "idx_restaurants_updated_at",
            "idx_restaurants_hours_updated",
            "idx_restaurants_active",
            "idx_restaurants_name_gin",
            "idx_restaurants_description_gin",
            "idx_restaurants_phone",
            "idx_restaurants_has_website",
        ]

        verification_results = {}
        for expected_index in expected_indexes:
            verification_results[expected_index] = expected_index in indexes

        return verification_results

    except Exception as e:
        print(f"❌ Error verifying indexes: {e}")
        return {}


def analyze_table_performance(conn: psycopg2.extensions.connection) -> None:
    """Analyze table performance after index creation."""
    try:
        print("📊 Analyzing table performance...")

        cursor = conn.cursor()

        # Get table statistics
        cursor.execute(
            """
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats 
            WHERE tablename = 'restaurants'
            ORDER BY attname
        """
        )

        stats = cursor.fetchall()

        print("📈 Table Statistics:")
        for stat in stats:
            print(f"  {stat[2]}: {stat[3]} distinct values, correlation: {stat[4]:.3f}")

        # Get index usage statistics
        cursor.execute(
            """
            SELECT 
                indexrelname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE relname = 'restaurants'
            ORDER BY idx_scan DESC
        """
        )

        index_stats = cursor.fetchall()

        print("\n📊 Index Usage Statistics:")
        for stat in index_stats:
            print(
                f"  {stat[0]}: {stat[1]} scans, {stat[2]} tuples read, {stat[3]} tuples fetched"
            )

        cursor.close()

    except Exception as e:
        print(f"❌ Error analyzing performance: {e}")


def main():
    """Main function to apply database indexes."""
    parser = argparse.ArgumentParser(
        description="Apply performance indexes to JewGo database"
    )
    parser.add_argument("--database-url", help="Database connection URL")
    parser.add_argument(
        "--backup", action="store_true", help="Create backup before applying indexes"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be applied without making changes",
    )
    parser.add_argument(
        "--verify", action="store_true", help="Verify indexes after application"
    )

    args = parser.parse_args()

    # Get database URL
    database_url = args.database_url or os.environ.get("DATABASE_URL")
    if not database_url:
        print(
            "❌ No database URL provided. Set DATABASE_URL environment variable or use --database-url"
        )
        sys.exit(1)

    print("🚀 JewGo Database Index Application")
    print("=" * 50)
    print(
        f"Database: {database_url.split('@')[1] if '@' in database_url else 'Unknown'}"
    )
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Connect to database
    conn = get_database_connection(database_url)

    try:
        # Check existing indexes
        existing_indexes = check_existing_indexes(conn)
        print(f"📋 Found {len(existing_indexes)} existing indexes")

        # Create backup if requested
        if args.backup:
            backup_path = f"backup_jewgo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
            if not backup_database(conn, backup_path):
                print("❌ Backup failed. Aborting index application.")
                sys.exit(1)

        # Dry run mode
        if args.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made")
            print("Indexes that would be applied:")

            index_file = "backend/database/performance_indexes.sql"
            with open(index_file, "r") as f:
                index_sql = f.read()

            statements = [stmt.strip() for stmt in index_sql.split(";") if stmt.strip()]
            for statement in statements:
                if statement.startswith("CREATE INDEX"):
                    # Handle IF NOT EXISTS syntax
                    if "IF NOT EXISTS" in statement:
                        # Extract index name after IF NOT EXISTS
                        parts = statement.split("IF NOT EXISTS")
                        if len(parts) > 1:
                            index_name = parts[1].split()[0]
                        else:
                            index_name = statement.split()[2]
                    else:
                        index_name = statement.split()[2]

                    if index_name not in existing_indexes:
                        print(f"  ➕ {index_name}")
                    else:
                        print(f"  ⚠️  {index_name} (already exists)")

            return

        # Apply indexes
        index_file = "backend/database/performance_indexes.sql"
        if not os.path.exists(index_file):
            print(f"❌ Index file not found: {index_file}")
            sys.exit(1)

        if not apply_indexes(conn, index_file):
            print("❌ Failed to apply indexes")
            sys.exit(1)

        # Verify indexes if requested
        if args.verify:
            verification_results = verify_indexes(conn)

            print("\n📋 Index Verification Results:")
            all_success = True
            for index_name, exists in verification_results.items():
                status = "✅" if exists else "❌"
                print(f"  {status} {index_name}")
                if not exists:
                    all_success = False

            if all_success:
                print("\n🎉 All indexes successfully created!")
            else:
                print("\n⚠️  Some indexes failed to create")

        # Analyze performance
        analyze_table_performance(conn)

        print("\n✅ Database index application completed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
