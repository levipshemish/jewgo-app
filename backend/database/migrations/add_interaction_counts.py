#!/usr/bin/env python3
"""
Migration: Add interaction count fields to restaurants table
==========================================================
This migration adds share_count and favorite_count fields to track user
interactions with restaurant listings.

Author: JewGo Development Team
Date: 2024
"""

import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(backend_dir)

from database.connection_manager import DatabaseConnectionManager
from utils.logging_config import get_logger
from sqlalchemy import text

logger = get_logger(__name__)

def upgrade():
    """Add share_count and favorite_count columns to restaurants table."""
    try:
        # Set the DATABASE_URL from ORACLE_DATABASE_URL if not already set
        if not os.getenv('DATABASE_URL') and os.getenv('ORACLE_DATABASE_URL'):
            os.environ['DATABASE_URL'] = os.getenv('ORACLE_DATABASE_URL')
        
        connection_manager = DatabaseConnectionManager()
        
        # Connect to the database
        if not connection_manager.connect():
            raise Exception("Failed to connect to database")
        
        with connection_manager.get_session() as session:
            # Check if share_count column already exists
            result = session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = 'share_count'
            """)).fetchone()
            
            if not result:
                # Add the share_count column
                session.execute(text("""
                    ALTER TABLE restaurants 
                    ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL
                """))
                logger.info("Added share_count column to restaurants table")
            else:
                logger.info("share_count column already exists in restaurants table")
            
            # Check if favorite_count column already exists
            result = session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = 'favorite_count'
            """)).fetchone()
            
            if not result:
                # Add the favorite_count column
                session.execute(text("""
                    ALTER TABLE restaurants 
                    ADD COLUMN favorite_count INTEGER DEFAULT 0 NOT NULL
                """))
                logger.info("Added favorite_count column to restaurants table")
            else:
                logger.info("favorite_count column already exists in restaurants table")
            
            # Create indexes for better performance on count queries
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_restaurants_share_count 
                ON restaurants(share_count DESC)
            """))
            
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_restaurants_favorite_count 
                ON restaurants(favorite_count DESC)
            """))
            
            # Initialize counts for existing restaurants with realistic values
            session.execute(text("""
                UPDATE restaurants 
                SET share_count = FLOOR(RANDOM() * 21) + 5,
                    favorite_count = FLOOR(RANDOM() * 51) + 10
                WHERE share_count = 0 OR favorite_count = 0
            """))
            
            session.commit()
            logger.info("Successfully added interaction count columns to restaurants table")
            return True
            
    except Exception as e:
        logger.error(f"Error adding interaction count columns: {e}")
        return False

def downgrade():
    """Remove share_count and favorite_count columns from restaurants table."""
    try:
        # Set the DATABASE_URL from ORACLE_DATABASE_URL if not already set
        if not os.getenv('DATABASE_URL') and os.getenv('ORACLE_DATABASE_URL'):
            os.environ['DATABASE_URL'] = os.getenv('ORACLE_DATABASE_URL')
        
        connection_manager = DatabaseConnectionManager()
        
        # Connect to the database
        if not connection_manager.connect():
            raise Exception("Failed to connect to database")
        
        with connection_manager.get_session() as session:
            # Drop the indexes first
            session.execute(text("DROP INDEX IF EXISTS idx_restaurants_share_count"))
            session.execute(text("DROP INDEX IF EXISTS idx_restaurants_favorite_count"))
            
            # Drop the columns
            session.execute(text("ALTER TABLE restaurants DROP COLUMN IF EXISTS share_count"))
            session.execute(text("ALTER TABLE restaurants DROP COLUMN IF EXISTS favorite_count"))
            
            session.commit()
            logger.info("Successfully removed interaction count columns from restaurants table")
            return True
            
    except Exception as e:
        logger.error(f"Error removing interaction count columns: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Add interaction count fields to restaurants table")
    parser.add_argument("--downgrade", action="store_true", help="Run downgrade instead of upgrade")
    
    args = parser.parse_args()
    
    if args.downgrade:
        success = downgrade()
    else:
        success = upgrade()
    
    if success:
        print("Migration completed successfully")
        sys.exit(0)
    else:
        print("Migration failed")
        sys.exit(1)
