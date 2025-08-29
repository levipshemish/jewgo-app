# !/usr/bin/env python3
"""Database Migration: Enhance Add Eatery Workflow (SQLite Version).
========================================
Adds new fields to the restaurants table for enhanced add eatery form functionality.
New Fields:
- Owner management fields
- Additional business contact fields
- Social media links
- Multiple image support
- Enhanced status tracking
This version is compatible with SQLite for local development.
"""
import os
import sys
from sqlalchemy import (
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError
import logging
# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
def run_migration() -> bool | None:
    """Run the migration to enhance the restaurants table for add eatery workflow."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    try:
        # Create engine
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            try:
                logger.info(
                    "Starting restaurants table enhancement for add eatery workflow"
                )
                # 1. Add new fields for enhanced add eatery workflow
                new_columns = [
                    # Owner management fields
                    ("owner_name", "TEXT"),
                    ("owner_email", "TEXT"),
                    ("owner_phone", "TEXT"),
                    ("is_owner_submission", "BOOLEAN DEFAULT 0"),
                    # Additional business fields
                    ("business_email", "TEXT"),
                    ("instagram_link", "TEXT"),
                    ("facebook_link", "TEXT"),
                    ("tiktok_link", "TEXT"),
                    # Multiple images support (
                        SQLite doesn't support arrays,
                        use JSON string
                    )
                    ("business_images", "TEXT"),  # JSON string for multiple image URLs
                    # Enhanced status tracking
                    ("submission_status", "TEXT DEFAULT 'pending_approval'"),
                    ("submission_date", "TIMESTAMP"),
                    ("approval_date", "TIMESTAMP"),
                    ("approved_by", "TEXT"),
                    ("rejection_reason", "TEXT"),
                    # Additional business details
                    ("business_license", "TEXT"),
                    ("tax_id", "TEXT"),
                    ("years_in_business", "INTEGER"),
                    ("seating_capacity", "INTEGER"),
                    ("delivery_available", "BOOLEAN DEFAULT 0"),
                    ("takeout_available", "BOOLEAN DEFAULT 0"),
                    ("catering_available", "BOOLEAN DEFAULT 0"),
                    # Contact preferences
                    ("preferred_contact_method", "TEXT"),  # email, phone, text
                    ("preferred_contact_time", "TEXT"),  # morning, afternoon, evening
                    ("contact_notes", "TEXT"),
                ]
                for column_name, column_type in new_columns:
                    try:
                        # Check if column exists (SQLite syntax)
                        result = conn.execute(
                            text(
                                """
                            SELECT name FROM pragma_table_info('restaurants')
                            WHERE name = '{column_name}'
                        """,
                            ),
                        )
                        if not result.fetchone():
                            logger.info(
                                f"Adding column {column_name} to restaurants table"
                            )
                            conn.execute(
                                text(
                                    f"ALTER TABLE restaurants ADD COLUMN {column_name} {column_type}"
                                )
                            )
                            logger.info(f"Successfully added column {column_name}")
                        else:
                            logger.info(f"Column {column_name} already exists")
                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error adding column {column_name}",
                            error=str(e),
                        )
                        raise e
                # 2. Add indexes for performance optimization (SQLite syntax)
                new_indexes = [
                    ("idx_restaurants_submission_status", "submission_status"),
                    ("idx_restaurants_is_owner_submission", "is_owner_submission"),
                    ("idx_restaurants_submission_date", "submission_date"),
                    ("idx_restaurants_owner_email", "owner_email"),
                    ("idx_restaurants_business_email", "business_email"),
                ]
                for index_name, column_name in new_indexes:
                    try:
                        # Check if index exists (SQLite syntax)
                        result = conn.execute(
                            text(
                                """
                            SELECT name FROM sqlite_master
                            WHERE type='index' AND name='{index_name}'
                        """,
                            ),
                        )
                        if not result.fetchone():
                            logger.info(f"Creating index {index_name}")
                            conn.execute(
                                text(
                                    f"CREATE INDEX {index_name} ON restaurants ({column_name})"
                                )
                            )
                            logger.info(f"Successfully created index {index_name}")
                        else:
                            logger.info(f"Index {index_name} already exists")
                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error creating index {index_name}",
                            error=str(e),
                        )
                        # Don't fail the migration for index creation errors
                        logger.warning(f"Skipping index {index_name} due to error")
                # 3. Update existing records to set default values
                logger.info("Updating existing records with default values")
                # Set submission_status for existing records
                conn.execute(
                    text(
                        """
                    UPDATE restaurants
                    SET submission_status = 'approved',
                        submission_date = created_at,
                        approval_date = created_at,
                        approved_by = 'system'
                    WHERE submission_status IS NULL
                """
                    )
                )
                # Set is_owner_submission to false for existing records
                conn.execute(
                    text(
                        """
                    UPDATE restaurants
                    SET is_owner_submission = 0
                    WHERE is_owner_submission IS NULL
                """
                    )
                )
                # Set default values for boolean fields
                conn.execute(
                    text(
                        """
                    UPDATE restaurants
                    SET delivery_available = 0,
                        takeout_available = 0,
                        catering_available = 0
                    WHERE delivery_available IS NULL
                """
                    )
                )
                # Commit the transaction
                trans.commit()
                logger.info("✅ Successfully completed restaurants table enhancement")
                # 4. Verify the changes
                logger.info("Verifying migration results...")
                # Count total columns
                result = conn.execute(
                    text(
                        "SELECT COUNT(*) as column_count FROM pragma_table_info('restaurants')"
                    )
                )
                column_count = result.fetchone()[0]
                logger.info(f"Total columns in restaurants table: {column_count}")
                # List new columns
                new_column_names = [col[0] for col in new_columns]
                result = conn.execute(
                    text(
                        "SELECT name FROM pragma_table_info('restaurants') WHERE name IN ("
                        + ",".join([f"'{name}'" for name in new_column_names])
                        + ")"
                    )
                )
                existing_new_columns = [row[0] for row in result.fetchall()]
                logger.info(f"New columns added: {existing_new_columns}")
                return True
            except Exception as e:
                # Rollback the transaction
                trans.rollback()
                logger.exception("Error during migration, rolling back", error=str(e))
                raise e
    except SQLAlchemyError as e:
        logger.exception("Database error during migration", error=str(e))
        return False
    except Exception as e:
        logger.exception("Unexpected error during migration", error=str(e))
        return False
def rollback_migration() -> bool | None:
    """Rollback the migration by removing added columns and indexes."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    try:
        # Create engine
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            try:
                logger.info("Starting rollback of restaurants table enhancement")
                # Remove indexes
                indexes_to_remove = [
                    "idx_restaurants_submission_status",
                    "idx_restaurants_is_owner_submission",
                    "idx_restaurants_submission_date",
                    "idx_restaurants_owner_email",
                    "idx_restaurants_business_email",
                ]
                for index_name in indexes_to_remove:
                    try:
                        # Check if index exists (SQLite syntax)
                        result = conn.execute(
                            text(
                                """
                            SELECT name FROM sqlite_master
                            WHERE type='index' AND name='{index_name}'
                        """,
                            ),
                        )
                        if result.fetchone():
                            logger.info(f"Removing index {index_name}")
                            conn.execute(text(f"DROP INDEX {index_name}"))
                            logger.info(f"Successfully removed index {index_name}")
                        else:
                            logger.info(f"Index {index_name} does not exist, skipping")
                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error removing index {index_name}",
                            error=str(e),
                        )
                        # Continue with other indexes even if one fails
                # Note: SQLite doesn't support dropping columns easily
                # We would need to recreate the table to remove columns
                logger.warning(
                    "SQLite doesn't support dropping columns. Manual table recreation required for full rollback."
                )
                # Commit the rollback
                trans.commit()
                logger.info("✅ Successfully completed rollback (indexes removed)")
                return True
            except Exception as e:
                # Rollback the transaction
                trans.rollback()
                logger.exception("Error during rollback, rolling back", error=str(e))
                raise e
    except SQLAlchemyError as e:
        logger.exception("Database error during rollback", error=str(e))
        return False
    except Exception as e:
        logger.exception("Unexpected error during rollback", error=str(e))
        return False
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Enhance restaurants table for add eatery workflow (SQLite)"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration instead of running it",
    )
    args = parser.parse_args()
    if args.rollback:
        logger.info("Running rollback...")
        success = rollback_migration()
    else:
        logger.info("Running migration...")
        success = run_migration()
    if success:
        logger.info("✅ Migration completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed")
        sys.exit(1)
