#!/usr/bin/env python3
"""
Marketplace Migration Deployment Script
======================================

This script is designed to be run on Render to create the marketplace tables.
It will be executed as a one-time setup script.

Usage on Render:
    python backend/deploy_marketplace_migration.py
"""

import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Run the marketplace migration on production."""
    
    print("🏪 JewGo Marketplace Migration - Production Deployment")
    print("=" * 60)
    print(f"🕐 Started at: {datetime.now().isoformat()}")
    
    # Check if DATABASE_URL is set
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable is not set")
        print("💡 This script should be run on Render with proper environment variables")
        return False
    
    print(f"✅ Database URL found: {database_url[:30]}...")
    
    try:
        # Import and run the migration
        from database.migrations.create_marketplace_schema import run_migration
        
        print("\n🔄 Running marketplace schema migration...")
        success = run_migration()
        
        if success:
            print("\n✅ Marketplace migration completed successfully!")
            print("📋 Created tables:")
            print("   - categories")
            print("   - subcategories") 
            print("   - marketplace_items")
            print("   - gemachs")
            print("   - listing_images")
            print("   - listing_transactions")
            print("   - listing_endorsements")
            print("   - usernames")
            print("\n🎉 Marketplace is now ready for use!")
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
