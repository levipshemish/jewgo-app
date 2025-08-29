#!/usr/bin/env python3
"""
Username Index Migration Script
==============================

This script adds a case-insensitive index on the username column for better performance
when looking up profiles by username.
"""

import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.connection_manager import ConfigManager
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def add_username_index():
    """Add case-insensitive username index."""
    try:
        # Get database URL
        database_url = ConfigManager.get_database_url()
        if not database_url:
            logger.error("Failed to get database URL")
            return False

        # Create engine
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                logger.info("Adding case-insensitive username index")

                # Check if index already exists
                result = conn.execute(
                    text(
                        """
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'profiles' 
                    AND indexname = 'idx_profiles_username_ci';
                """
                    )
                )

                if result.fetchone():
                    logger.info("Case-insensitive username index already exists")
                    return True

                # Create case-insensitive index
                conn.execute(
                    text(
                        """
                    CREATE INDEX idx_profiles_username_ci 
                    ON profiles (LOWER(username));
                """
                    )
                )

                # Commit transaction
                trans.commit()
                logger.info("Case-insensitive username index created successfully")
                return True

            except SQLAlchemyError as e:
                trans.rollback()
                logger.error(f"Database error during index creation: {e}")
                return False
            except Exception as e:
                trans.rollback()
                logger.error(f"Unexpected error during index creation: {e}")
                return False

    except Exception as e:
        logger.error(f"Failed to add username index: {e}")
        return False


def verify_index():
    """Verify that the index was created successfully."""
    try:
        database_url = ConfigManager.get_database_url()
        if not database_url:
            logger.error("Failed to get database URL")
            return False

        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Check if index exists
            result = conn.execute(
                text(
                    """
                SELECT indexname, indexdef
                FROM pg_indexes 
                WHERE tablename = 'profiles' 
                AND indexname = 'idx_profiles_username_ci';
            """
                )
            )

            index_info = result.fetchone()
            if not index_info:
                logger.error("Case-insensitive username index not found")
                return False

            logger.info(f"Index found: {index_info[0]}")
            logger.info(f"Index definition: {index_info[1]}")

            # Test the index with a sample query
            test_result = conn.execute(
                text(
                    """
                EXPLAIN (ANALYZE, BUFFERS) 
                SELECT * FROM profiles 
                WHERE LOWER(username) = LOWER('test_username');
            """
                )
            )

            logger.info("Index verification completed successfully")
            return True

    except Exception as e:
        logger.error(f"Failed to verify index: {e}")
        return False


if __name__ == "__main__":
    logger.info("Starting username index migration")

    # Add index
    if add_username_index():
        logger.info("Index creation completed successfully")

        # Verify index
        if verify_index():
            logger.info("Index verification passed")
            sys.exit(0)
        else:
            logger.error("Index verification failed")
            sys.exit(1)
    else:
        logger.error("Index creation failed")
        sys.exit(1)
