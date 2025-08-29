# !/usr/bin/env python3
"""Migration script to optimize the restaurants table schema.
This migration implements the new optimized schema design.
Changes:
1. Add new required fields
2. Remove deprecated fields
3. Update field constraints
4. Add proper indexes
5. Update data types where needed
"""
import os
import sys
from sqlalchemy import (
    create_engine,
    text,
)

# Configure logging using unified logging configuration
from utils.logging_config import get_logger

logger = get_logger(__name__)


def run_migration() -> bool | None:
    """Run the migration to optimize the restaurants table schema."""
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
                logger.info("Starting restaurants table schema optimization")
                # 1. Add new required fields FIRST
                new_columns = [
                    ("current_time_local", "TIMESTAMP"),
                    ("hours_parsed", "BOOLEAN DEFAULT FALSE"),
                    ("timezone", "VARCHAR(50)"),
                    ("phone_number", "VARCHAR(50)"),  # Rename from 'phone'
                    ("listing_type", "VARCHAR(100)"),  # Rename from 'category'
                    ("hours_of_operation", "TEXT"),  # Rename from 'hours_open'
                    ("specials", "TEXT"),  # New field for admin-managed specials
                ]
                for column_name, column_type in new_columns:
                    try:
                        # Check if column exists
                        result = conn.execute(
                            text(
                                """
                            SELECT column_name
                            FROM information_schema.columns
                            WHERE table_name = 'restaurants'
                            AND column_name = '{column_name}'
                        """,
                            ),
                        )
                        if not result.fetchone():
                            logger.info(
                                "Adding column to restaurants table",
                                column_name=column_name,
                            )
                            conn.execute(
                                text(
                                    f"ALTER TABLE restaurants ADD COLUMN {column_name} {column_type}",
                                ),
                            )
                            logger.info(
                                "Successfully added column", column_name=column_name
                            )
                        else:
                            logger.info(
                                "Column already exists, skipping",
                                column_name=column_name,
                            )
                    except Exception as e:
                        logger.exception(
                            "Error adding column", column_name=column_name, error=str(e)
                        )
                        raise
                # 2. Migrate data from old column names to new ones BEFORE adding constraints
                logger.info("Migrating data from old column names to new ones")
                # Migrate phone to phone_number (only if both columns exist)
                try:
                    # Check if both columns exist
                    result = conn.execute(
                        text(
                            """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = 'restaurants'
                        AND column_name IN ('phone', 'phone_number')
                        """
                        )
                    )
                    column_count = result.fetchone()[0]
                    if column_count == 2:
                        logger.info("Migrating data from 'phone' to 'phone_number'")
                        conn.execute(
                            text(
                                """
                            UPDATE restaurants
                            SET phone_number = phone
                            WHERE phone_number IS NULL AND phone IS NOT NULL
                            """
                            )
                        )
                        logger.info("Successfully migrated phone data")
                    else:
                        logger.info("Phone column migration not needed")
                except Exception as e:
                    logger.warning("Phone migration failed, continuing", error=str(e))
                # Migrate category to listing_type
                try:
                    result = conn.execute(
                        text(
                            """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = 'restaurants'
                        AND column_name IN ('category', 'listing_type')
                        """
                        )
                    )
                    column_count = result.fetchone()[0]
                    if column_count == 2:
                        logger.info("Migrating data from 'category' to 'listing_type'")
                        conn.execute(
                            text(
                                """
                            UPDATE restaurants
                            SET listing_type = category
                            WHERE listing_type IS NULL AND category IS NOT NULL
                            """
                            )
                        )
                        logger.info("Successfully migrated category data")
                    else:
                        logger.info("Category column migration not needed")
                except Exception as e:
                    logger.warning(
                        "Category migration failed, continuing", error=str(e)
                    )
                # Migrate hours_open to hours_of_operation
                try:
                    result = conn.execute(
                        text(
                            """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = 'restaurants'
                        AND column_name IN ('hours_open', 'hours_of_operation')
                        """
                        )
                    )
                    column_count = result.fetchone()[0]
                    if column_count == 2:
                        logger.info(
                            "Migrating data from 'hours_open' to 'hours_of_operation'"
                        )
                        conn.execute(
                            text(
                                """
                            UPDATE restaurants
                            SET hours_of_operation = hours_open
                            WHERE hours_of_operation IS NULL AND hours_open IS NOT NULL
                            """
                            )
                        )
                        logger.info("Successfully migrated hours data")
                    else:
                        logger.info("Hours column migration not needed")
                except Exception as e:
                    logger.warning("Hours migration failed, continuing", error=str(e))
                # 3. Remove old columns AFTER data migration
                logger.info("Removing old columns")
                old_columns = ["phone", "category", "hours_open"]
                for column_name in old_columns:
                    try:
                        # Check if column exists
                        result = conn.execute(
                            text(
                                """
                            SELECT column_name
                            FROM information_schema.columns
                            WHERE table_name = 'restaurants'
                            AND column_name = '{column_name}'
                        """,
                            ),
                        )
                        if result.fetchone():
                            logger.info(
                                "Removing old column from restaurants table",
                                column_name=column_name,
                            )
                            conn.execute(
                                text(
                                    f"ALTER TABLE restaurants DROP COLUMN {column_name}"
                                ),
                            )
                            logger.info(
                                "Successfully removed old column",
                                column_name=column_name,
                            )
                        else:
                            logger.info(
                                "Old column does not exist, skipping",
                                column_name=column_name,
                            )
                    except Exception as e:
                        logger.warning(
                            "Error removing old column, continuing",
                            column_name=column_name,
                            error=str(e),
                        )
                # 4. Add constraints and indexes
                logger.info("Adding constraints and indexes")
                # Add NOT NULL constraints to required fields
                required_columns = [
                    "name",
                    "address",
                    "city",
                    "state",
                    "zip_code",
                    "phone_number",
                    "certifying_agency",
                    "kosher_category",
                    "listing_type",
                ]
                for column_name in required_columns:
                    try:
                        # Check if column exists and is not already NOT NULL
                        result = conn.execute(
                            text(
                                """
                            SELECT is_nullable
                            FROM information_schema.columns
                            WHERE table_name = 'restaurants'
                            AND column_name = '{column_name}'
                        """,
                            ),
                        )
                        row = result.fetchone()
                        if row and row[0] == "YES":
                            logger.info(
                                "Adding NOT NULL constraint",
                                column_name=column_name,
                            )
                            conn.execute(
                                text(
                                    f"ALTER TABLE restaurants ALTER COLUMN {column_name} SET NOT NULL"
                                ),
                            )
                            logger.info(
                                "Successfully added NOT NULL constraint",
                                column_name=column_name,
                            )
                        else:
                            logger.info(
                                "Column already has NOT NULL constraint or doesn't exist",
                                column_name=column_name,
                            )
                    except Exception as e:
                        logger.warning(
                            "Error adding NOT NULL constraint, continuing",
                            column_name=column_name,
                            error=str(e),
                        )
                # Add indexes for performance
                indexes = [
                    ("idx_restaurants_city", "city"),
                    ("idx_restaurants_kosher_category", "kosher_category"),
                    ("idx_restaurants_certifying_agency", "certifying_agency"),
                    ("idx_restaurants_created_at", "created_at"),
                ]
                for index_name, column_name in indexes:
                    try:
                        # Check if index already exists
                        result = conn.execute(
                            text(
                                """
                            SELECT indexname
                            FROM pg_indexes
                            WHERE tablename = 'restaurants'
                            AND indexname = '{index_name}'
                        """,
                            ),
                        )
                        if not result.fetchone():
                            logger.info(
                                "Creating index",
                                index_name=index_name,
                                column_name=column_name,
                            )
                            conn.execute(
                                text(
                                    f"CREATE INDEX {index_name} ON restaurants ({column_name})"
                                ),
                            )
                            logger.info(
                                "Successfully created index",
                                index_name=index_name,
                            )
                        else:
                            logger.info(
                                "Index already exists, skipping",
                                index_name=index_name,
                            )
                    except Exception as e:
                        logger.warning(
                            "Error creating index, continuing",
                            index_name=index_name,
                            error=str(e),
                        )
                # Commit transaction
                trans.commit()
                logger.info(
                    "Successfully completed restaurants table schema optimization"
                )
                return True
            except Exception as e:
                # Rollback transaction
                trans.rollback()
                logger.exception(
                    "Error during schema optimization",
                    error=str(e),
                )
                raise
    except Exception as e:
        logger.exception(
            "Failed to optimize restaurants table schema",
            error=str(e),
        )
        return False


if __name__ == "__main__":
    success = run_migration()
    if success:
        print("Migration completed successfully")
    else:
        print("Migration failed")
        sys.exit(1)
