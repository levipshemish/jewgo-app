# !/usr/bin/env python3
"""Database Migration: Add Google Places Table.
===========================================
This migration creates the google_places_data table to store Google Places information
for restaurants, reducing API calls and improving performance.
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
import argparse
import os
import sys
from pathlib import Path
from database.google_places_manager import Base
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from utils.logging_config import get_logger

# Add the backend directory to the Python path
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))
# Configure structured logging using unified logging configuration
logger = get_logger(__name__)


def run_migration() -> bool | None:
    """Run the migration to create the Google Places table."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False
        # Create engine
        engine = create_engine(database_url)
        # Create the table
        logger.info("Creating google_places_data table...")
        Base.metadata.create_all(
            bind=engine,
            tables=[Base.metadata.tables["google_places_data"]],
        )
        logger.info("✅ Successfully created google_places_data table")
        # Verify the table was created
        with engine.connect() as connection:
            result = connection.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'google_places_data')",
            )
            table_exists = result.scalar()
            if table_exists:
                logger.info("✅ Table verification successful")
                # Show table structure
                result = connection.execute(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'google_places_data'
                    ORDER BY ordinal_position
                """,
                )
                columns = result.fetchall()
                logger.info("Table structure:")
                for column in columns:
                    nullable = "NULL" if column[2] == "YES" else "NOT NULL"
                    logger.info(
                        "Table column",
                        name=column[0],
                        type=column[1],
                        nullable=nullable,
                    )
            else:
                logger.error("❌ Table verification failed")
                return False
        return True
    except SQLAlchemyError as e:
        logger.exception("Database error during migration", error=str(e))
        return False
    except Exception as e:
        logger.exception("Unexpected error during migration", error=str(e))
        return False


def rollback_migration() -> bool | None:
    """Rollback the migration by dropping the table."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False
        # Create engine
        engine = create_engine(database_url)
        # Drop the table
        logger.info("Dropping google_places_data table...")
        with engine.connect() as connection:
            connection.execute("DROP TABLE IF EXISTS google_places_data")
            connection.commit()
        logger.info("✅ Successfully dropped google_places_data table")
        return True
    except SQLAlchemyError as e:
        logger.exception("Database error during rollback", error=str(e))
        return False
    except Exception as e:
        logger.exception("Unexpected error during rollback", error=str(e))
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Google Places table migration")
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration",
    )
    args = parser.parse_args()
    if args.rollback:
        success = rollback_migration()
        if success:
            pass
        else:
            sys.exit(1)
    else:
        success = run_migration()
        if success:
            pass
        else:
            sys.exit(1)
