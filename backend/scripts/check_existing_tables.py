# !/usr/bin/env python3
"""Check existing tables in the database."""
import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_existing_tables():
    """Check what tables already exist in the database."""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("Failed to get database URL")
            return False
        logger.info("Connecting to database...")
        engine = create_engine(database_url)
        with engine.connect() as connection:
            # Check if profiles table exists
            result = connection.execute(
                text(
                    """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """
                )
            )
            tables = [row[0] for row in result]
            logger.info("Existing tables in database:")
            for table in tables:
                logger.info(f"  - {table}")
            # Check if profiles table specifically exists
            if "profiles" in tables:
                logger.info("✅ Profiles table already exists!")
                # Check profiles table structure
                result = connection.execute(
                    text(
                        """
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'profiles'
                    ORDER BY ordinal_position;
                """
                    )
                )
                logger.info("Profiles table structure:")
                for row in result:
                    logger.info(
                        f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})"
                    )
                # Check indexes on profiles table
                result = connection.execute(
                    text(
                        """
                    SELECT indexname, indexdef
                    FROM pg_indexes
                    WHERE tablename = 'profiles';
                """
                    )
                )
                logger.info("Indexes on profiles table:")
                for row in result:
                    logger.info(f"  - {row[0]}: {row[1]}")
            else:
                logger.info("❌ Profiles table does not exist")
            return True
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False


if __name__ == "__main__":
    logger.info("Starting database table check...")
    success = check_existing_tables()
    if success:
        logger.info("✅ Database check completed successfully")
    else:
        logger.error("❌ Database check failed")
        sys.exit(1)
