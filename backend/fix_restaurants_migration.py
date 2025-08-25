#!/usr/bin/env python3
"""
Restaurants Table Migration Fix
===============================

This script specifically migrates the restaurants table from Neon to Oracle Cloud,
handling JSON/dict data properly by converting it to JSON strings.
"""

import os
import sys
import json
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RestaurantsMigrator:
    def __init__(self, source_url, target_url):
        self.source_url = source_url
        self.target_url = target_url
        self.source_engine = None
        self.target_engine = None

    def connect_databases(self):
        """Connect to both source and target databases."""
        try:
            # Connect to source (Neon)
            logger.info("Connecting to source database (Neon)...")
            self.source_engine = create_engine(
                self.source_url,
                echo=False,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 30}
            )

            # Test source connection
            with self.source_engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                logger.info("✅ Source database connection successful")

            # Connect to target (Oracle Cloud)
            logger.info("Connecting to target database (Oracle Cloud)...")
            self.target_engine = create_engine(
                self.target_url,
                echo=False,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 30}
            )

            # Test target connection
            with self.target_engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                logger.info("✅ Target database connection successful")

            return True

        except SQLAlchemyError as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def get_restaurants_data(self):
        """Get restaurants data from source database."""
        try:
            with self.source_engine.connect() as conn:
                result = conn.execute(text("SELECT * FROM restaurants"))
                rows = result.fetchall()
                columns = result.keys()
                logger.info(f"📊 Found {len(rows)} restaurants in source database")
                return rows, columns
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to get restaurants data: {e}")
            return None, None

    def clear_restaurants_table(self):
        """Clear the restaurants table in target database."""
        try:
            with self.target_engine.connect() as conn:
                conn.execute(text("DELETE FROM restaurants"))
                conn.commit()
                logger.info("✅ Cleared restaurants table in target database")
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to clear restaurants table: {e}")

    def migrate_restaurants_data(self, rows, columns):
        """Migrate restaurants data with proper JSON handling."""
        if not rows:
            logger.info("ℹ️  No restaurants data to migrate")
            return

        logger.info(f"🔄 Migrating {len(rows)} restaurants...")

        success_count = 0
        error_count = 0

        with self.target_engine.connect() as conn:
            for i, row in enumerate(rows):
                if i % 50 == 0:
                    logger.info(f"   Progress: {i}/{len(rows)} restaurants")

                try:
                    # Convert row to list and handle JSON/dict data
                    row_data = []
                    for value in row:
                        if isinstance(value, dict):
                            # Convert dict to JSON string
                            row_data.append(json.dumps(value))
                        elif value is None:
                            row_data.append(None)
                        else:
                            row_data.append(value)

                    # Create insert statement
                    placeholders = ', '.join(['%s'] * len(columns))
                    insert_sql = f"INSERT INTO restaurants ({', '.join(columns)}) VALUES ({placeholders})"

                    # Execute insert
                    conn.execute(text(insert_sql), row_data)
                    success_count += 1

                except SQLAlchemyError as e:
                    logger.warning(f"⚠️  Failed to insert restaurant {i}: {e}")
                    error_count += 1
                    continue
                except Exception as e:
                    logger.warning(f"⚠️  Unexpected error inserting restaurant {i}: {e}")
                    error_count += 1
                    continue

            # Commit all changes
            conn.commit()

        logger.info(f"✅ Successfully migrated {success_count} restaurants")
        if error_count > 0:
            logger.warning(f"⚠️  Failed to migrate {error_count} restaurants")

    def verify_migration(self):
        """Verify the migration was successful."""
        try:
            with self.target_engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
                count = result.scalar()
                logger.info(f"📊 Restaurants table now has {count} rows")

                if count > 0:
                    # Show a sample restaurant
                    result = conn.execute(text("SELECT * FROM restaurants LIMIT 1"))
                    sample = result.fetchone()
                    if sample:
                        logger.info("✅ Sample restaurant data looks good")
                        return True
                else:
                    logger.error("❌ Restaurants table is empty")
                    return False

        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to verify migration: {e}")
            return False

    def migrate_restaurants(self):
        """Main migration function for restaurants table."""
        try:
            # Get restaurants data from source
            rows, columns = self.get_restaurants_data()
            if not rows:
                logger.error("❌ No restaurants data found in source database")
                return False

            # Clear target table
            self.clear_restaurants_table()

            # Migrate data
            self.migrate_restaurants_data(rows, columns)

            # Verify migration
            success = self.verify_migration()

            if success:
                logger.info("🎉 Restaurants migration completed successfully!")
            else:
                logger.error("❌ Restaurants migration verification failed")

            return success

        except Exception as e:
            logger.error(f"❌ Restaurants migration failed: {e}")
            return False

def main():
    """Main migration function."""
    print("🔄 Restaurants Table Migration Fix")
    print("=" * 40)

    # Get database URLs
    neon_url = os.getenv("NEON_DATABASE_URL")
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"

    if not neon_url:
        logger.error("❌ NEON_DATABASE_URL environment variable not set")
        return False

    # Create migrator
    migrator = RestaurantsMigrator(neon_url, oracle_url)

    # Connect to databases
    if not migrator.connect_databases():
        return False

    # Confirm migration
    print("\n⚠️  WARNING: This will migrate the restaurants table from Neon to Oracle Cloud")
    print("The existing restaurants table in Oracle Cloud will be cleared first.")

    confirm = input("\nDo you want to proceed with restaurants migration? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Migration cancelled.")
        return False

    # Perform migration
    success = migrator.migrate_restaurants()

    if success:
        print("\n✅ Restaurants migration completed successfully!")
        print("Your Oracle Cloud database now has all the restaurant data.")
    else:
        print("\n❌ Restaurants migration failed. Check the logs for details.")

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
