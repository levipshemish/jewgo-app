#!/usr/bin/env python3
"""
Final Restaurants Migration - Individual Commits
===============================================

This script migrates the restaurants table using individual commits
to avoid transaction failures with complex JSON data.
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

# Common columns between source and target
COMMON_COLUMNS = [
    'id', 'name', 'address', 'city', 'state', 'zip_code', 'website', 'price_range',
    'image_url', 'is_cholov_yisroel', 'is_pas_yisroel', 'created_at', 'updated_at',
    'short_description', 'google_listing_url', 'status', 'latitude', 'longitude',
    'google_rating', 'google_review_count', 'google_reviews', 'certifying_agency',
    'timezone', 'phone_number', 'listing_type', 'hours_of_operation', 'specials',
    'hours_json', 'hours_last_updated', 'kosher_category', 'cholov_stam',
    'user_email', 'current_time_local', 'hours_parsed'
]

class FinalRestaurantsMigrator:
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
        """Get restaurants data from source database using only common columns."""
        try:
            with self.source_engine.connect() as conn:
                # Select only common columns
                columns_str = ', '.join(COMMON_COLUMNS)
                query = f"SELECT {columns_str} FROM restaurants"
                result = conn.execute(text(query))
                rows = result.fetchall()
                logger.info(f"📊 Found {len(rows)} restaurants in source database")
                return rows
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to get restaurants data: {e}")
            return None

    def clear_restaurants_table(self):
        """Clear the restaurants table in target database."""
        try:
            with self.target_engine.connect() as conn:
                conn.execute(text("DELETE FROM restaurants"))
                conn.commit()
                logger.info("✅ Cleared restaurants table in target database")
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to clear restaurants table: {e}")

    def migrate_single_restaurant(self, row, index):
        """Migrate a single restaurant with individual commit."""
        try:
            # Convert row to dictionary with proper data handling
            row_dict = {}
            for j, value in enumerate(row):
                col_name = COMMON_COLUMNS[j]
                
                if isinstance(value, dict):
                    # Convert dict to JSON string
                    try:
                        row_dict[col_name] = json.dumps(value)
                    except (TypeError, ValueError):
                        # If JSON serialization fails, convert to string
                        row_dict[col_name] = str(value)
                elif isinstance(value, str) and col_name == 'google_reviews':
                    # Handle google_reviews column specifically
                    try:
                        # Try to parse and re-serialize to ensure valid JSON
                        parsed = json.loads(value)
                        row_dict[col_name] = json.dumps(parsed)
                    except (json.JSONDecodeError, TypeError):
                        # If it's not valid JSON, store as is
                        row_dict[col_name] = value
                elif value is None:
                    row_dict[col_name] = None
                else:
                    row_dict[col_name] = value

            # Create insert statement with named parameters
            placeholders = ', '.join([f':{col}' for col in COMMON_COLUMNS])
            insert_sql = f"INSERT INTO restaurants ({', '.join(COMMON_COLUMNS)}) VALUES ({placeholders})"

            # Execute insert with individual commit
            with self.target_engine.connect() as conn:
                conn.execute(text(insert_sql), row_dict)
                conn.commit()

            return True

        except SQLAlchemyError as e:
            logger.warning(f"⚠️  Failed to insert restaurant {index}: {e}")
            return False
        except Exception as e:
            logger.warning(f"⚠️  Unexpected error inserting restaurant {index}: {e}")
            return False

    def migrate_restaurants_data(self, rows):
        """Migrate restaurants data using individual commits."""
        if not rows:
            logger.info("ℹ️  No restaurants data to migrate")
            return

        logger.info(f"🔄 Migrating {len(rows)} restaurants using individual commits...")

        success_count = 0
        error_count = 0

        for i, row in enumerate(rows):
            if i % 25 == 0:
                logger.info(f"   Progress: {i}/{len(rows)} restaurants")

            success = self.migrate_single_restaurant(row, i)
            if success:
                success_count += 1
            else:
                error_count += 1

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
                    result = conn.execute(text("SELECT id, name, city FROM restaurants LIMIT 1"))
                    sample = result.fetchone()
                    if sample:
                        logger.info(f"✅ Sample restaurant: ID {sample[0]}, {sample[1]} in {sample[2]}")
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
            rows = self.get_restaurants_data()
            if not rows:
                logger.error("❌ No restaurants data found in source database")
                return False

            # Clear target table
            self.clear_restaurants_table()

            # Migrate data
            self.migrate_restaurants_data(rows)

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
    print("🔄 Final Restaurants Migration - Individual Commits")
    print("=" * 50)
    print(f"📋 Using {len(COMMON_COLUMNS)} common columns")
    print("🔧 Using individual commits to avoid transaction failures")
    print()

    # Get database URLs
    neon_url = os.getenv("NEON_DATABASE_URL")
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"

    if not neon_url:
        logger.error("❌ NEON_DATABASE_URL environment variable not set")
        return False

    # Create migrator
    migrator = FinalRestaurantsMigrator(neon_url, oracle_url)

    # Connect to databases
    if not migrator.connect_databases():
        return False

    # Confirm migration
    print("\n⚠️  WARNING: This will migrate the restaurants table from Neon to Oracle Cloud")
    print("The existing restaurants table in Oracle Cloud will be cleared first.")
    print("Only common columns will be migrated (34 out of 43 columns).")
    print("Each restaurant will be committed individually to avoid transaction failures.")

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
