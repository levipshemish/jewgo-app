#!/usr/bin/env python3
"""
Python script to run database migrations for stores and mikvah tables.
This script can be run inside the container to create the new tables.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_sql_file(connection, sql_file_path, description):
    """Run a SQL file against the database connection."""
    print(f"Running migration: {description}")
    print(f"File: {sql_file_path}")
    
    if not os.path.exists(sql_file_path):
        print(f"Error: SQL file not found: {sql_file_path}")
        return False
    
    try:
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()
        
        with connection.cursor() as cursor:
            cursor.execute(sql_content)
        
        print(f"✅ Successfully executed: {description}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to execute: {description}")
        print(f"Error: {e}")
        return False

def main():
    """Main function to run all migrations."""
    print("=== Running Database Migrations ===")
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set")
        sys.exit(1)
    
    try:
        # Connect to database
        connection = psycopg2.connect(database_url)
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Connected to database")
        
        # Run migrations
        migrations = [
            ('/app/database/migrations/create_stores_table.sql', 'Create stores table'),
            ('/app/database/migrations/create_mikvah_table.sql', 'Create mikvah table'),
            ('/app/database/migrations/insert_sample_data.sql', 'Insert sample data')
        ]
        
        success_count = 0
        for sql_file, description in migrations:
            if run_sql_file(connection, sql_file, description):
                success_count += 1
        
        # Verify tables were created
        print("\nVerifying tables were created...")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('stores', 'mikvah')
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            if tables:
                print("✅ Tables found:")
                for table in tables:
                    print(f"  - {table[0]}")
            else:
                print("❌ No tables found")
        
        # Check data counts
        print("\nChecking data counts...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM stores;")
            stores_count = cursor.fetchone()[0]
            print(f"Stores: {stores_count} records")
            
            cursor.execute("SELECT COUNT(*) FROM mikvah;")
            mikvah_count = cursor.fetchone()[0]
            print(f"Mikvah: {mikvah_count} records")
        
        connection.close()
        
        if success_count == len(migrations):
            print("\n✅ All migrations completed successfully!")
            sys.exit(0)
        else:
            print(f"\n❌ {len(migrations) - success_count} migrations failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
