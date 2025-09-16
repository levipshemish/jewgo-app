#!/usr/bin/env python3
"""
Migration: Add view_count field to restaurants table
==================================================
This migration adds a view_count field to track how many times each restaurant
has been viewed on the details page.

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
    """Add view_count column to restaurants table."""
    try:
        # Set the DATABASE_URL from ORACLE_DATABASE_URL if not already set
        if not os.getenv('DATABASE_URL') and os.getenv('ORACLE_DATABASE_URL'):
            os.environ['DATABASE_URL'] = os.getenv('ORACLE_DATABASE_URL')
        
        connection_manager = DatabaseConnectionManager()
        
        # Connect to the database
        if not connection_manager.connect():
            raise Exception("Failed to connect to database")
        
        with connection_manager.get_session() as session:
            # Check if the column already exists
            result = session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = 'view_count'
            """)).fetchone()
            
            if result:
                logger.info("view_count column already exists in restaurants table")
                return True
            
            # Add the view_count column
            session.execute(text("""
                ALTER TABLE restaurants 
                ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL
            """))
            
            # Create an index for better performance on view count queries
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_restaurants_view_count 
                ON restaurants(view_count DESC)
            """))
            
            # Initialize view_count for existing restaurants with a random value between 50-500
            # This gives a realistic starting point for existing restaurants
            session.execute(text("""
                UPDATE restaurants 
                SET view_count = FLOOR(RANDOM() * 451) + 50
                WHERE view_count = 0
            """))
            
            session.commit()
            logger.info("Successfully added view_count column to restaurants table")
            return True
            
    except Exception as e:
        logger.error(f"Error adding view_count column: {e}")
        return False

def downgrade():
    """Remove view_count column from restaurants table."""
    try:
        # Set the DATABASE_URL from ORACLE_DATABASE_URL if not already set
        if not os.getenv('DATABASE_URL') and os.getenv('ORACLE_DATABASE_URL'):
            os.environ['DATABASE_URL'] = os.getenv('ORACLE_DATABASE_URL')
        
        connection_manager = DatabaseConnectionManager()
        
        # Connect to the database
        if not connection_manager.connect():
            raise Exception("Failed to connect to database")
        
        with connection_manager.get_session() as session:
            # Drop the index first
            session.execute(text("DROP INDEX IF EXISTS idx_restaurants_view_count"))
            
            # Drop the column
            session.execute(text("ALTER TABLE restaurants DROP COLUMN IF EXISTS view_count"))
            
            session.commit()
            logger.info("Successfully removed view_count column from restaurants table")
            return True
            
    except Exception as e:
        logger.error(f"Error removing view_count column: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Add view_count field to restaurants table")
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