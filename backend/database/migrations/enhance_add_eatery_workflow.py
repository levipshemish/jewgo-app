#!/usr/bin/env python3
"""Database Migration: Enhance Add Eatery Workflow.
========================================
Adds new fields to the restaurants table for enhanced add eatery form functionality.

New Fields:
- Owner management fields
- Additional business contact fields
- Social media links
- Multiple image support
- Enhanced status tracking
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
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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
                logger.info("Starting restaurants table enhancement for add eatery workflow")

                # 1. Add new fields for enhanced add eatery workflow
                new_columns = [
                    # Owner management fields
                    ("owner_name", "TEXT"),
                    ("owner_email", "TEXT"),
                    ("owner_phone", "TEXT"),
                    ("is_owner_submission", "BOOLEAN DEFAULT FALSE"),
                    
                    # Additional business fields
                    ("business_email", "TEXT"),
                    ("instagram_link", "TEXT"),
                    ("facebook_link", "TEXT"),
                    ("tiktok_link", "TEXT"),
                    
                    # Multiple images support
                    ("business_images", "TEXT[]"),  # Array for multiple image URLs
                    
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
                    ("delivery_available", "BOOLEAN DEFAULT FALSE"),
                    ("takeout_available", "BOOLEAN DEFAULT FALSE"),
                    ("catering_available", "BOOLEAN DEFAULT FALSE"),
                    
                    # Contact preferences
                    ("preferred_contact_method", "TEXT"),  # email, phone, text
                    ("preferred_contact_time", "TEXT"),    # morning, afternoon, evening
                    ("contact_notes", "TEXT"),
                ]

                for column_name, column_type in new_columns:
                    try:
                        # Check if column exists
                        result = conn.execute(
                            text(
                                f"""
                            SELECT column_name
                            FROM information_schema.columns
                            WHERE table_name = 'restaurants'
                            AND column_name = '{column_name}'
                        """,
                            ),
                        )

                        if not result.fetchone():
                            logger.info(
                                f"Adding column {column_name} to restaurants table"
                            )
                            conn.execute(
                                text(f"ALTER TABLE restaurants ADD COLUMN {column_name} {column_type}")
                            )
                            logger.info(f"Successfully added column {column_name}")
                        else:
                            logger.info(f"Column {column_name} already exists")

                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error adding column {column_name}: {str(e)}"
                        )
                        raise e

                # 2. Add indexes for performance optimization
                new_indexes = [
                    ("idx_restaurants_submission_status", "submission_status"),
                    ("idx_restaurants_is_owner_submission", "is_owner_submission"),
                    ("idx_restaurants_submission_date", "submission_date"),
                    ("idx_restaurants_owner_email", "owner_email"),
                    ("idx_restaurants_business_email", "business_email"),
                ]

                for index_name, column_name in new_indexes:
                    try:
                        # Check if index exists
                        result = conn.execute(
                            text(
                                f"""
                            SELECT indexname
                            FROM pg_indexes
                            WHERE tablename = 'restaurants'
                            AND indexname = '{index_name}'
                        """,
                            ),
                        )

                        if not result.fetchone():
                            logger.info(f"Creating index {index_name}")
                            conn.execute(
                                text(f"CREATE INDEX {index_name} ON restaurants ({column_name})")
                            )
                            logger.info(f"Successfully created index {index_name}")
                        else:
                            logger.info(f"Index {index_name} already exists")

                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error creating index {index_name}: {str(e)}"
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
                    SET is_owner_submission = FALSE
                    WHERE is_owner_submission IS NULL
                """
                    )
                )

                # 4. Add constraints for data integrity
                logger.info("Adding constraints for data integrity")

                # Add check constraint for submission_status
                try:
                    conn.execute(
                        text(
                            """
                        ALTER TABLE restaurants 
                        ADD CONSTRAINT check_submission_status 
                        CHECK (submission_status IN ('pending_approval', 'approved', 'rejected', 'draft'))
                    """
                        )
                    )
                    logger.info("Added submission_status check constraint")
                except SQLAlchemyError as e:
                    logger.warning(f"Could not add submission_status constraint: {e}")

                # Add check constraint for preferred_contact_method
                try:
                    conn.execute(
                        text(
                            """
                        ALTER TABLE restaurants 
                        ADD CONSTRAINT check_preferred_contact_method 
                        CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'any'))
                    """
                        )
                    )
                    logger.info("Added preferred_contact_method check constraint")
                except SQLAlchemyError as e:
                    logger.warning(f"Could not add preferred_contact_method constraint: {e}")

                # 5. Create a view for pending submissions (for admin dashboard)
                logger.info("Creating view for pending submissions")
                try:
                    conn.execute(
                        text(
                            """
                        CREATE OR REPLACE VIEW pending_restaurant_submissions AS
                        SELECT 
                            id,
                            name,
                            address,
                            city,
                            state,
                            phone_number,
                            owner_name,
                            owner_email,
                            owner_phone,
                            is_owner_submission,
                            submission_date,
                            business_email,
                            instagram_link,
                            facebook_link,
                            tiktok_link,
                            business_images,
                            created_at
                        FROM restaurants 
                        WHERE submission_status = 'pending_approval'
                        ORDER BY submission_date DESC
                    """
                        )
                    )
                    logger.info("Created pending_restaurant_submissions view")
                except SQLAlchemyError as e:
                    logger.warning(f"Could not create pending submissions view: {e}")

                # Commit the transaction
                trans.commit()
                logger.info("✅ Successfully completed restaurants table enhancement")

                # 6. Verify the changes
                logger.info("Verifying migration results")
                
                # Check column count
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) as column_count
                    FROM information_schema.columns
                    WHERE table_name = 'restaurants'
                """
                    )
                )
                column_count = result.fetchone()[0]
                logger.info(f"Total columns in restaurants table: {column_count}")

                # Check new columns exist
                new_column_names = [col[0] for col in new_columns]
                for column_name in new_column_names:
                    result = conn.execute(
                        text(
                            f"""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_name = 'restaurants'
                        AND column_name = '{column_name}'
                    """
                        )
                    )
                    column_info = result.fetchone()
                    if column_info:
                        logger.info(
                            f"Column {column_name}: {column_info[1]} ({'NULL' if column_info[2] == 'YES' else 'NOT NULL'})"
                        )
                    else:
                        logger.warning(f"Column {column_name} not found after migration")

                return True

            except Exception as e:
                # Rollback the transaction
                trans.rollback()
                logger.exception("Error during migration, rolling back")
                raise e

    except SQLAlchemyError as e:
        logger.exception("Database error during migration")
        return False
    except Exception as e:
        logger.exception("Unexpected error during migration")
        return False


def rollback_migration() -> bool | None:
    """Rollback the migration by removing added columns."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False

        # Create engine
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                logger.info("Starting rollback of add eatery workflow enhancement")

                # Columns to remove (in reverse order of dependencies)
                columns_to_remove = [
                    "contact_notes",
                    "preferred_contact_time",
                    "preferred_contact_method",
                    "catering_available",
                    "takeout_available",
                    "delivery_available",
                    "seating_capacity",
                    "years_in_business",
                    "tax_id",
                    "business_license",
                    "rejection_reason",
                    "approved_by",
                    "approval_date",
                    "submission_date",
                    "submission_status",
                    "business_images",
                    "tiktok_link",
                    "facebook_link",
                    "instagram_link",
                    "business_email",
                    "is_owner_submission",
                    "owner_phone",
                    "owner_email",
                    "owner_name",
                ]

                for column_name in columns_to_remove:
                    try:
                        # Check if column exists
                        result = conn.execute(
                            text(
                                f"""
                            SELECT column_name
                            FROM information_schema.columns
                            WHERE table_name = 'restaurants'
                            AND column_name = '{column_name}'
                        """,
                            ),
                        )

                        if result.fetchone():
                            logger.info(f"Removing column {column_name}")
                            conn.execute(
                                text(f"ALTER TABLE restaurants DROP COLUMN {column_name}")
                            )
                            logger.info(f"Successfully removed column {column_name}")
                        else:
                            logger.info(f"Column {column_name} does not exist, skipping")

                    except SQLAlchemyError as e:
                        logger.error(
                            f"Error removing column {column_name}",
                            error=str(e),
                        )
                        # Continue with other columns even if one fails

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
                        # Check if index exists
                        result = conn.execute(
                            text(
                                f"""
                            SELECT indexname
                            FROM pg_indexes
                            WHERE tablename = 'restaurants'
                            AND indexname = '{index_name}'
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
                            f"Error removing index {index_name}: {str(e)}"
                        )
                        # Continue with other indexes even if one fails

                # Remove constraints
                constraints_to_remove = [
                    "check_submission_status",
                    "check_preferred_contact_method",
                ]

                for constraint_name in constraints_to_remove:
                    try:
                        logger.info(f"Removing constraint {constraint_name}")
                        conn.execute(
                            text(f"ALTER TABLE restaurants DROP CONSTRAINT {constraint_name}")
                        )
                        logger.info(f"Successfully removed constraint {constraint_name}")
                    except SQLAlchemyError as e:
                        logger.warning(f"Could not remove constraint {constraint_name}: {e}")

                # Remove view
                try:
                    logger.info("Removing pending_restaurant_submissions view")
                    conn.execute(text("DROP VIEW IF EXISTS pending_restaurant_submissions"))
                    logger.info("Successfully removed pending_restaurant_submissions view")
                except SQLAlchemyError as e:
                    logger.warning(f"Could not remove view: {e}")

                # Commit the rollback
                trans.commit()
                logger.info("✅ Successfully completed rollback")

                return True

            except Exception as e:
                # Rollback the transaction
                trans.rollback()
                logger.exception("Error during rollback, rolling back")
                raise e

    except SQLAlchemyError as e:
        logger.exception("Database error during rollback")
        return False
    except Exception as e:
        logger.exception("Unexpected error during rollback")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Enhance restaurants table for add eatery workflow")
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
