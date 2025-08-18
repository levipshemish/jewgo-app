#!/usr/bin/env python3
"""Add Business Types and Review Snippets Columns.
===============================================

This script adds the missing columns needed for Phase 3 enhancements:
1. business_types - for categorizing restaurants by cuisine/service type
2. review_snippets - for storing formatted review highlights

Phase 3 Database Schema Enhancement.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def add_columns(database_url: str):
    """Add business_types and review_snippets columns to restaurants table."""
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name IN ('business_types', 'review_snippets')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Add business_types column if it doesn't exist
        if 'business_types' not in existing_columns:
            logger.info("Adding business_types column...")
            cursor.execute("""
                ALTER TABLE restaurants 
                ADD COLUMN business_types TEXT
            """)
            logger.info("✅ Added business_types column")
        else:
            logger.info("business_types column already exists")
        
        # Add review_snippets column if it doesn't exist
        if 'review_snippets' not in existing_columns:
            logger.info("Adding review_snippets column...")
            cursor.execute("""
                ALTER TABLE restaurants 
                ADD COLUMN review_snippets TEXT
            """)
            logger.info("✅ Added review_snippets column")
        else:
            logger.info("review_snippets column already exists")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("✅ Database schema update completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        return False

def main():
    """Main execution function."""
    # Get environment variables
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        sys.exit(1)
    
    print("🔧 Adding Business Types and Review Snippets Columns...")
    print("=" * 60)
    
    success = add_columns(database_url)
    
    if success:
        print("\n✅ Successfully added required columns!")
        print("   - business_types (TEXT)")
        print("   - review_snippets (TEXT)")
        print("\nReady for Phase 3 enhancements!")
    else:
        print("\n❌ Failed to add columns. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
