#!/usr/bin/env python3
"""
Marketplace Migration Runner
============================

This script runs the marketplace schema migration on the production database.
It should be run on Render to create the necessary marketplace tables.

Usage:
    python run_marketplace_migration.py
"""

import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Run the marketplace migration."""
    
    print("🏪 Running Marketplace Migration on Production Database")
    print("=======================================================")
    
    # Check if DATABASE_URL is set
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable is not set")
        return False
    
    print(f"✅ Database URL found: {database_url[:20]}...")
    
    try:
        # Import and run the migration
        from database.migrations.create_marketplace_schema import run_migration
        
        print("\n🔄 Running marketplace schema migration...")
        success = run_migration()
        
        if success:
            print("✅ Marketplace migration completed successfully!")
            print("📋 Created tables:")
            print("   - categories")
            print("   - subcategories") 
            print("   - listings")
            print("   - gemachs")
            print("   - listing_images")
            print("   - listing_transactions")
            print("   - listing_endorsements")
            print("   - usernames")
            return True
        else:
            print("❌ Marketplace migration failed")
            return False
            
    except ImportError as e:
        print(f"❌ Error importing migration module: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        logger.exception("Migration error")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
