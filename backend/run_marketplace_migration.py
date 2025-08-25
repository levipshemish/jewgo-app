#!/usr/bin/env python3
"""Simple script to run marketplace migration."""

import os
import sys

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database.migrations.create_marketplace_unified import run_migration
    
    print("Starting marketplace migration...")
    success = run_migration()
    
    if success:
        print("✅ Marketplace migration completed successfully!")
    else:
        print("❌ Marketplace migration failed!")
        
except Exception as e:
    print(f"❌ Error running migration: {e}")
    import traceback
    traceback.print_exc()
