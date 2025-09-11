#!/usr/bin/env python3
"""
V5 Consolidation Migration Runner

This script runs the v5 consolidation migrations in the correct order,
handling CONCURRENTLY index creation and TimescaleDB setup properly.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path

def get_db_connection():
    """Get database connection from environment variables."""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'jewgo'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )

def run_migration_file(conn, file_path):
    """Run a single migration file."""
    print(f"Running migration: {file_path}")
    
    with open(file_path, 'r') as f:
        sql_content = f.read()
    
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_content)
        conn.commit()
        print(f"✓ Migration completed: {file_path}")
        return True
    except Exception as e:
        print(f"✗ Migration failed: {file_path}")
        print(f"Error: {e}")
        conn.rollback()
        return False

def run_concurrent_migration_file(conn, file_path):
    """Run a migration file with autocommit for CONCURRENTLY operations."""
    print(f"Running concurrent migration: {file_path}")
    
    with open(file_path, 'r') as f:
        sql_content = f.read()
    
    try:
        # Set autocommit for CONCURRENTLY operations
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        with conn.cursor() as cursor:
            cursor.execute(sql_content)
        
        print(f"✓ Concurrent migration completed: {file_path}")
        return True
    except Exception as e:
        print(f"✗ Concurrent migration failed: {file_path}")
        print(f"Error: {e}")
        return False
    finally:
        # Reset to default isolation level
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)

def main():
    """Run all v5 consolidation migrations."""
    print("Starting V5 Consolidation Migrations...")
    
    # Get migration directory
    migration_dir = Path(__file__).parent
    
    # Define migration files in order
    migrations = [
        # Regular migrations (with transactions)
        'v5_consolidation_001_metadata.sql',
        'v5_consolidation_007_cache_triggers.sql',
        
        # Concurrent migrations (without transactions)
        'v5_consolidation_002_restaurant_indexes.sql',
        'v5_consolidation_003_synagogue_indexes.sql',
        'v5_consolidation_004_review_indexes.sql',
        'v5_consolidation_005_mikvah_store_indexes.sql',
        'v5_consolidation_006_timescaledb.sql',
    ]
    
    conn = None
    try:
        conn = get_db_connection()
        
        for migration_file in migrations:
            file_path = migration_dir / migration_file
            
            if not file_path.exists():
                print(f"⚠ Migration file not found: {file_path}")
                continue
            
            # Run concurrent migrations with autocommit
            if 'indexes' in migration_file or 'timescaledb' in migration_file:
                success = run_concurrent_migration_file(conn, file_path)
            else:
                success = run_migration_file(conn, file_path)
            
            if not success:
                print(f"Migration failed: {migration_file}")
                sys.exit(1)
        
        print("✓ All V5 consolidation migrations completed successfully!")
        
    except Exception as e:
        print(f"Migration runner error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()
