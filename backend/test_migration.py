#!/usr/bin/env python3
"""
Test script to verify database migration can be executed.
This script will test the database connection and attempt to run the migration.
"""

import os
import sys
import psycopg2
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_database_connection():
    """Test basic database connection"""
    try:
        # Get database URL from environment
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
            return False
        
        print(f"🔗 Testing connection to database...")
        
        # Test connection
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ Database connected successfully")
        print(f"📊 PostgreSQL version: {version[0]}")
        
        # Test if required extensions exist
        cursor.execute("SELECT extname FROM pg_extension WHERE extname IN ('cube', 'earthdistance')")
        extensions = cursor.fetchall()
        existing_extensions = [ext[0] for ext in extensions]
        
        print(f"🔧 Existing extensions: {existing_extensions}")
        
        # Test if restaurants table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'restaurants'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("✅ Restaurants table exists")
            
            # Check if new columns exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name IN ('timezone', 'hours_structured')
            """)
            new_columns = [col[0] for col in cursor.fetchall()]
            print(f"📋 New columns: {new_columns}")
        else:
            print("❌ Restaurants table does not exist")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing database: {e}")
        return False

def test_migration_file():
    """Test if migration file exists and is readable"""
    migration_file = backend_dir / "database" / "migrations" / "add_distance_filtering_indexes.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    try:
        with open(migration_file, 'r') as f:
            content = f.read()
        
        print(f"✅ Migration file found and readable")
        print(f"📄 File size: {len(content)} characters")
        
        # Check for key SQL statements
        required_statements = [
            "CREATE EXTENSION IF NOT EXISTS cube",
            "CREATE EXTENSION IF NOT EXISTS earthdistance",
            "ALTER TABLE restaurants ADD COLUMN",
            "CREATE INDEX IF NOT EXISTS"
        ]
        
        for statement in required_statements:
            if statement in content:
                print(f"✅ Found: {statement}")
            else:
                print(f"❌ Missing: {statement}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading migration file: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Database Migration Setup")
    print("=" * 50)
    
    # Test environment
    print("\n1. Environment Check:")
    env_vars = ['DATABASE_URL', 'ENVIRONMENT']
    for var in env_vars:
        value = os.environ.get(var)
        if value:
            # Mask sensitive parts of DATABASE_URL
            if var == 'DATABASE_URL' and '://' in value:
                parts = value.split('://')
                if len(parts) == 2:
                    protocol = parts[0]
                    rest = parts[1]
                    if '@' in rest:
                        user_pass, host_db = rest.split('@', 1)
                        if ':' in user_pass:
                            user, _ = user_pass.split(':', 1)
                            masked_url = f"{protocol}://{user}:***@{host_db}"
                            print(f"✅ {var}: {masked_url}")
                        else:
                            print(f"✅ {var}: {protocol}://***@{host_db}")
                    else:
                        print(f"✅ {var}: {protocol}://***")
                else:
                    print(f"✅ {var}: [set]")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: not set")
    
    # Test migration file
    print("\n2. Migration File Check:")
    migration_ok = test_migration_file()
    
    # Test database connection
    print("\n3. Database Connection Check:")
    db_ok = test_database_connection()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    
    if migration_ok and db_ok:
        print("✅ All tests passed! Migration should work.")
        print("\n🚀 To run the migration:")
        print("   cd backend")
        print("   python scripts/run_distance_migration.py")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        
        if not migration_ok:
            print("\n🔧 Migration file issues:")
            print("   - Check if the migration file exists")
            print("   - Verify file permissions")
            
        if not db_ok:
            print("\n🔧 Database connection issues:")
            print("   - Verify DATABASE_URL is correct")
            print("   - Check if PostgreSQL is running")
            print("   - Verify database credentials")
            print("   - Ensure database exists")

if __name__ == "__main__":
    main()
