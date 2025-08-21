#!/usr/bin/env python3
"""
Script to run distance filtering migration
=========================================

This script runs the database migration to add distance filtering indexes
and extensions for the JewGo backend.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Run the distance filtering migration."""
    try:
        # Import database manager
        from database.database_manager_v3 import EnhancedDatabaseManager
        
        # Initialize database manager
        logger.info("Initializing database manager...")
        db_manager = EnhancedDatabaseManager()
        
        # Migration file path
        migration_file = backend_dir / "database" / "migrations" / "add_distance_filtering_indexes.sql"
        
        if not migration_file.exists():
            logger.error(f"Migration file not found: {migration_file}")
            return False
        
        logger.info(f"Running migration: {migration_file}")
        
        # Read and execute migration
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Split SQL into individual statements
                statements = migration_sql.split(';')
                
                for statement in statements:
                    statement = statement.strip()
                    if statement:
                        logger.info(f"Executing: {statement[:50]}...")
                        cursor.execute(statement)
                
                conn.commit()
        
        logger.info("Migration completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
