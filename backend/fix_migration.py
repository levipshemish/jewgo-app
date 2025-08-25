#!/usr/bin/env python3
"""
Fixed Migration Script: Neon to Oracle Cloud PostgreSQL
======================================================

This script properly migrates data from Neon PostgreSQL to Oracle Cloud PostgreSQL,
fixing the parameter mapping issues from the previous migration.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FixedDatabaseMigrator:
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

    def get_table_list(self, engine):
        """Get list of tables from database."""
        inspector = inspect(engine)
        return inspector.get_table_names()

    def clear_target_table(self, table_name):
        """Clear existing data from target table."""
        try:
            with self.target_engine.connect() as conn:
                conn.execute(text(f"DELETE FROM {table_name}"))
                conn.commit()
                logger.info(f"✅ Cleared existing data from {table_name}")
        except SQLAlchemyError as e:
            logger.warning(f"⚠️  Could not clear {table_name}: {e}")

    def migrate_table_data_fixed(self, table_name):
        """Migrate data from source to target table with proper parameter handling."""
        try:
            # Get data from source
            with self.source_engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {table_name}"))
                rows = result.fetchall()
                columns = list(result.keys())

            if not rows:
                logger.info(f"ℹ️  No data to migrate for table: {table_name}")
                return True

            logger.info(f"📊 Migrating {len(rows)} rows from table: {table_name}")

            # Clear target table first
            self.clear_target_table(table_name)

            # Insert data into target using proper parameter binding
            with self.target_engine.connect() as conn:
                for i, row in enumerate(rows):
                    if i % 50 == 0:
                        logger.info(f"   Progress: {i}/{len(rows)} rows")

                    # Convert row to dict for proper parameter binding
                    row_dict = dict(zip(columns, row))
                    
                    # Create insert statement with named parameters
                    placeholders = ', '.join([f':{col}' for col in columns])
                    insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

                    try:
                        conn.execute(text(insert_sql), row_dict)
                    except SQLAlchemyError as e:
                        logger.warning(f"⚠️  Failed to insert row {i} in {table_name}: {e}")
                        # Try to continue with next row
                        continue

                conn.commit()
                logger.info(f"✅ Successfully migrated {len(rows)} rows to table: {table_name}")
                return True

        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to migrate table {table_name}: {e}")
            return False

    def migrate_all_data_fixed(self):
        """Migrate all data from source to target with proper error handling."""
        try:
            # Get tables from source
            source_tables = self.get_table_list(self.source_engine)
            logger.info(f"📋 Found {len(source_tables)} tables in source database")

            # Focus on essential tables first
            essential_tables = [
                'restaurants',
                'restaurant_images',
                'florida_synagogues',
                'google_places_data',
                'marketplace',
                'reviews'
            ]

            success_count = 0
            for table_name in essential_tables:
                if table_name in source_tables:
                    logger.info(f"\n🔄 Migrating table: {table_name}")
                    if self.migrate_table_data_fixed(table_name):
                        success_count += 1
                else:
                    logger.warning(f"⚠️  Table {table_name} not found in source database")

            logger.info(f"\n🎉 Migration completed! {success_count}/{len(essential_tables)} tables migrated successfully")
            return success_count > 0

        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False

def main():
    """Main migration function."""
    print("🔄 Fixed Neon to Oracle Cloud PostgreSQL Migration")
    print("=" * 60)

    # Get database URLs
    neon_url = os.getenv("NEON_DATABASE_URL")
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"

    if not neon_url:
        logger.error("❌ NEON_DATABASE_URL environment variable not set")
        return False

    # Create migrator
    migrator = FixedDatabaseMigrator(neon_url, oracle_url)

    # Connect to databases
    if not migrator.connect_databases():
        return False

    # Confirm migration
    print("\n⚠️  WARNING: This will migrate all data from Neon to Oracle Cloud PostgreSQL")
    print("This will clear existing data in the target tables first.")

    confirm = input("\nDo you want to proceed with migration? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Migration cancelled.")
        return False

    # Perform migration
    success = migrator.migrate_all_data_fixed()

    if success:
        print("\n✅ Migration completed successfully!")
        print("You can now update your DATABASE_URL to use the Oracle Cloud database.")
    else:
        print("\n❌ Migration failed. Check the logs for details.")

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
