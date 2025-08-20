import os
import sys

from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Migration script to add missing columns to the restaurants table.
This fixes the AttributeError: 'Restaurant' object has no attribute 'hechsher_details'.
"""

# Configure logging using unified logging configuration
logger = get_logger(__name__)


def run_migration() -> bool | None:
    """Run the migration to add missing columns."""
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False

    try:
        # Create engine
        engine = create_engine(database_url)

        # Define the columns to add
        columns_to_add = [
            ("cuisine_type", "VARCHAR(100)"),
            ("hechsher_details", "VARCHAR(500)"),
            ("description", "TEXT"),
            ("latitude", "FLOAT"),
            ("longitude", "FLOAT"),
            ("rating", "FLOAT"),
            ("review_count", "INTEGER"),
            ("google_rating", "FLOAT"),
            ("google_review_count", "INTEGER"),
            ("google_reviews", "TEXT"),
            ("hours", "TEXT"),
        ]

        with engine.connect() as conn:
            # Check if columns already exist and add them if they don't
            for column_name, column_type in columns_to_add:
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
                        # Column doesn't exist, add it
                        logger.info(
                            "Adding column to restaurants table",
                            column_name=column_name,
                        )
                        conn.execute(
                            text(
                                f"ALTER TABLE restaurants ADD COLUMN {column_name} {column_type}",
                            ),
                        )
                        conn.commit()
                        logger.info(
                            "Successfully added column", column_name=column_name
                        )
                    else:
                        logger.info(
                            "Column already exists, skipping", column_name=column_name
                        )

                except Exception as e:
                    logger.exception(
                        "Error adding column", column_name=column_name, error=str(e)
                    )
                    conn.rollback()
                    return False

        logger.info("Migration completed successfully")
        return True

    except Exception as e:
        logger.exception("Migration failed", error=str(e))
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
