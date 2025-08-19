#!/usr/bin/env python3
"""
Profile Migration Script
=======================

This script runs the migration to create the profiles table for user profile data.
"""

import os
import sys
import logging
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
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_profile_migration():
    """Run the profiles table migration."""
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
                logger.info("Starting profiles table migration")
                
                # Check if profiles table already exists
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'profiles'
                    );
                """))
                
                if result.scalar():
                    logger.info("Profiles table already exists")
                    return True
                
                # Create profiles table
                logger.info("Creating profiles table")
                conn.execute(text("""
                    CREATE TABLE profiles (
                        id VARCHAR(50) PRIMARY KEY,
                        username VARCHAR(30) UNIQUE NOT NULL,
                        display_name VARCHAR(50) NOT NULL,
                        bio TEXT,
                        location VARCHAR(100),
                        website VARCHAR(500),
                        phone VARCHAR(20),
                        date_of_birth DATE,
                        avatar_url VARCHAR(500),
                        preferences JSONB,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                """))
                
                # Create indexes
                logger.info("Creating indexes")
                conn.execute(text("""
                    CREATE INDEX idx_profiles_username ON profiles (username);
                    CREATE INDEX idx_profiles_display_name ON profiles (display_name);
                    CREATE INDEX idx_profiles_created_at ON profiles (created_at);
                """))
                
                # Create constraints
                logger.info("Creating constraints")
                conn.execute(text("""
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_username_format 
                    CHECK (username ~ '^[a-zA-Z0-9_-]+$');
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_username_length 
                    CHECK (length(username) >= 3 AND length(username) <= 30);
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_display_name_length 
                    CHECK (length(display_name) >= 1 AND length(display_name) <= 50);
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_bio_length 
                    CHECK (bio IS NULL OR length(bio) <= 500);
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_location_length 
                    CHECK (location IS NULL OR length(location) <= 100);
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_website_length 
                    CHECK (website IS NULL OR length(website) <= 500);
                    
                    ALTER TABLE profiles 
                    ADD CONSTRAINT check_phone_format 
                    CHECK (phone IS NULL OR phone ~ '^[+]?[1-9][0-9]{0,15}$');
                """))
                
                # Commit transaction
                trans.commit()
                logger.info("Profiles table migration completed successfully")
                return True
                
            except SQLAlchemyError as e:
                trans.rollback()
                logger.error(f"Database error during migration: {e}")
                return False
            except Exception as e:
                trans.rollback()
                logger.error(f"Unexpected error during migration: {e}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to run profile migration: {e}")
        return False


def verify_migration():
    """Verify that the migration was successful."""
    try:
        database_url = ConfigManager.get_database_url()
        if not database_url:
            logger.error("Failed to get database URL")
            return False

        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'profiles'
                );
            """))
            
            if not result.scalar():
                logger.error("Profiles table does not exist")
                return False
            
            # Check if columns exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profiles' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            """))
            
            columns = [row[0] for row in result.fetchall()]
            expected_columns = [
                'id', 'username', 'display_name', 'bio', 'location', 
                'website', 'phone', 'date_of_birth', 'avatar_url', 
                'preferences', 'created_at', 'updated_at'
            ]
            
            missing_columns = set(expected_columns) - set(columns)
            if missing_columns:
                logger.error(f"Missing columns: {missing_columns}")
                return False
            
            # Check if indexes exist
            result = conn.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'profiles';
            """))
            
            indexes = [row[0] for row in result.fetchall()]
            expected_indexes = ['idx_profiles_username', 'idx_profiles_display_name', 'idx_profiles_created_at']
            
            missing_indexes = set(expected_indexes) - set(indexes)
            if missing_indexes:
                logger.error(f"Missing indexes: {missing_indexes}")
                return False
            
            logger.info("Migration verification completed successfully")
            return True
            
    except Exception as e:
        logger.error(f"Failed to verify migration: {e}")
        return False


if __name__ == "__main__":
    logger.info("Starting profile migration process")
    
    # Run migration
    if run_profile_migration():
        logger.info("Migration completed successfully")
        
        # Verify migration
        if verify_migration():
            logger.info("Migration verification passed")
            sys.exit(0)
        else:
            logger.error("Migration verification failed")
            sys.exit(1)
    else:
        logger.error("Migration failed")
        sys.exit(1)
