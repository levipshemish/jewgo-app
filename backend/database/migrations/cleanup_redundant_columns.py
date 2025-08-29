import os
import sys

from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Migration script to remove redundant columns from restaurants table.
This migration removes columns that are duplicates or no longer needed.

Columns to remove:
- hechsher_details (duplicate of certifying_agency)
- is_hechsher (redundant, can infer from certifying_agency)
- is_mehadrin (not needed, can be handled in JSON if required)
- is_kosher (all restaurants are kosher by definition)
- is_glatt (not needed, can be handled in JSON if required)
"""

# Configure logging using unified logging configuration
from utils.logging_config import get_logger

logger = get_logger(__name__)


def run_migration() -> bool | None:
    """Run the migration to remove redundant columns."""
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
                logger.info("Starting cleanup of redundant columns")

                # Columns to remove
                columns_to_remove = [
                    "hechsher_details",
                    "is_hechsher",
                    "is_mehadrin",
                    "is_kosher",
                    "is_glatt",
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
                            logger.info(
                                "Removing column from restaurants table",
                                column_name=column_name,
                            )
                            conn.execute(
                                text(
                                    f"ALTER TABLE restaurants DROP COLUMN {column_name}",
                                ),
                            )
                            logger.info(
                                "Successfully removed column", column_name=column_name
                            )
                        else:
                            logger.info(
                                "Column does not exist, skipping",
                                column_name=column_name,
                            )

                    except Exception as e:
                        logger.exception(
                            "Error removing column",
                            column_name=column_name,
                            error=str(e),
                        )
                        raise

                # Commit transaction
                trans.commit()
                logger.info("Successfully completed cleanup of redundant columns")

                return True

            except Exception as e:
                # Rollback transaction on error
                trans.rollback()
                logger.exception("Error during migration", error=str(e))
                raise

    except Exception as e:
        logger.exception("Failed to run migration", error=str(e))
        return False


def verify_migration() -> bool | None:
    """Verify that the migration was successful."""
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False

    try:
        # Create engine
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Check that columns were removed
            columns_to_remove = [
                "hechsher_details",
                "is_hechsher",
                "is_mehadrin",
                "is_kosher",
                "is_glatt",
            ]

            for column_name in columns_to_remove:
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
                    logger.error(
                        "Column still exists after migration!", column_name=column_name
                    )
                    return False
                logger.info("Column successfully removed", column_name=column_name)

            # Get total column count
            result = conn.execute(
                text(
                    """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'restaurants'
            """,
                ),
            )

            column_count = result.fetchone()[0]
            logger.info("Total columns in restaurants table", count=column_count)

            return True

    except Exception as e:
        logger.exception("Error verifying migration", error=str(e))
        return False


if __name__ == "__main__":
    logger.info("Starting redundant columns cleanup migration")

    if run_migration():
        logger.info("Migration completed successfully")

        if verify_migration():
            logger.info("✅ Migration verification passed")
        else:
            logger.error("❌ Migration verification failed")
    else:
        logger.error("❌ Migration failed")
        sys.exit(1)
