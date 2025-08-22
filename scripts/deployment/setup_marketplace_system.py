#!/usr/bin/env python3
"""
Marketplace System Setup Script
===============================

This script sets up the marketplace system for the JewGo application.
It runs the marketplace schema migration to create the necessary tables.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_marketplace_system():
    """Set up the marketplace system by running the schema migration."""
    
    print("🏪 JewGo Marketplace System Setup")
    print("==================================")
    
    try:
        # Import the migration function
        from database.migrations.create_marketplace_schema import run_migration
        
        # Step 1: Run Database Migration
        print("\n1️⃣ Running Marketplace Database Migration...")
        
        success = run_migration()
        
        if success:
            print("✅ Marketplace database migration completed successfully")
        else:
            print("❌ Marketplace database migration failed")
            return False
            
    except ImportError as e:
        print(f"❌ Error importing migration module: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during marketplace setup: {e}")
        return False
    
    print("\n🎉 Marketplace system setup completed successfully!")
    return True

if __name__ == "__main__":
    success = setup_marketplace_system()
    sys.exit(0 if success else 1)
