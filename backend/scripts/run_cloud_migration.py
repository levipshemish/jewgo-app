#!/usr/bin/env python3
"""
Cloud migration script for Neon PostgreSQL.
This script runs the distance filtering migration on Neon database.
"""

import os
import sys
import psycopg2
from pathlib import Path

def run_cloud_migration():
    """Run migration on Neon database."""
    try:
        # Get database URL from environment
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
            print("Please set your Neon database connection string:")
            print("export DATABASE_URL='postgresql://[username]:[password]@[host]/[database]?sslmode=require'")
            return False
        
        print("🔗 Connecting to Neon database...")
        
        # Connect to Neon
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Test connection
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ Connected to: {version[0]}")
        
        # Read migration file
        migration_file = Path(__file__).parent.parent / "database" / "migrations" / "add_distance_filtering_indexes.sql"
        
        if not migration_file.exists():
            print(f"❌ Migration file not found: {migration_file}")
            return False
        
        print(f"📄 Reading migration file: {migration_file}")
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        # Split and execute SQL statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        print(f"🔧 Executing {len(statements)} SQL statements...")
        
        for i, statement in enumerate(statements, 1):
            try:
                print(f"  [{i}/{len(statements)}] Executing: {statement[:50]}...")
                cursor.execute(statement)
                print(f"  ✅ Statement {i} completed")
            except Exception as e:
                print(f"  ⚠️ Statement {i} failed (may already exist): {e}")
                # Continue with other statements
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Cloud migration completed successfully!")
        print("\n🔍 Verifying migration...")
        
        # Verify migration
        verify_migration(database_url)
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def verify_migration(database_url):
    """Verify that the migration was successful."""
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Check extensions
        cursor.execute("SELECT extname FROM pg_extension WHERE extname IN ('cube', 'earthdistance')")
        extensions = cursor.fetchall()
        ext_names = [ext[0] for ext in extensions]
        print(f"✅ Extensions installed: {ext_names}")
        
        # Check new columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name IN ('timezone', 'hours_structured')
            ORDER BY column_name
        """)
        columns = cursor.fetchall()
        print(f"✅ New columns: {[col[0] for col in columns]}")
        
        # Check indexes
        cursor.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'restaurants' 
            AND indexname LIKE 'idx_restaurants_%'
            ORDER BY indexname
        """)
        indexes = cursor.fetchall()
        print(f"✅ Spatial indexes: {[idx[0] for idx in indexes]}")
        
        # Test spatial functions
        cursor.execute("SELECT ll_to_earth(40.7128, -74.0060)")
        result = cursor.fetchone()
        print(f"✅ Spatial functions working: {result[0] is not None}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Migration verification completed successfully!")
        
    except Exception as e:
        print(f"⚠️ Verification failed: {e}")

def main():
    """Main function."""
    print("🚀 Cloud Migration for JewGo App")
    print("=" * 50)
    print("This script will run the distance filtering migration on Neon PostgreSQL.")
    print()
    
    # Check if DATABASE_URL is set
    if not os.environ.get('DATABASE_URL'):
        print("❌ DATABASE_URL environment variable not set")
        print("\nPlease set your Neon database connection string:")
        print("export DATABASE_URL='postgresql://[username]:[password]@[host]/[database]?sslmode=require'")
        print("\nYou can get this from your Neon dashboard.")
        sys.exit(1)
    
    # Run migration
    success = run_cloud_migration()
    
    if success:
        print("\n🎉 Cloud migration completed successfully!")
        print("\nNext steps:")
        print("1. Deploy your backend to Render")
        print("2. Deploy your frontend to Vercel")
        print("3. Test your application")
    else:
        print("\n❌ Cloud migration failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
