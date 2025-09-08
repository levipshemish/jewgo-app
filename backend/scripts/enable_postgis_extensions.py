#!/usr/bin/env python3
"""
Script to enable PostGIS and earthdistance extensions in the database.
This is needed for the cursor-based pagination with distance sorting.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def enable_extensions(connection):
    """Enable required PostGIS extensions."""
    print("Enabling PostGIS extensions...")
    
    extensions_to_enable = [
        ('cube', 'Cube extension for earthdistance'),
        ('earthdistance', 'Earthdistance extension for geographic calculations'),
        ('postgis', 'PostGIS extension for spatial data')
    ]
    
    success_count = 0
    with connection.cursor() as cursor:
        for extension, description in extensions_to_enable:
            try:
                print(f"Enabling {extension}...")
                cursor.execute(f"CREATE EXTENSION IF NOT EXISTS {extension};")
                print(f"✅ {extension}: {description}")
                success_count += 1
            except Exception as e:
                print(f"❌ Failed to enable {extension}: {e}")
    
    return success_count

def verify_extensions(connection):
    """Verify that extensions are enabled."""
    print("\nVerifying extensions...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT extname, extversion 
            FROM pg_extension 
            WHERE extname IN ('cube', 'earthdistance', 'postgis')
            ORDER BY extname;
        """)
        extensions = cursor.fetchall()
        
        if extensions:
            print("✅ Enabled extensions:")
            for ext_name, ext_version in extensions:
                print(f"  - {ext_name} (version {ext_version})")
        else:
            print("❌ No extensions found")
            return False
    
    return True

def test_earthdistance_functions(connection):
    """Test that earthdistance functions work."""
    print("\nTesting earthdistance functions...")
    
    with connection.cursor() as cursor:
        try:
            # Test ll_to_earth function
            cursor.execute("SELECT ll_to_earth(40.7128, -74.0060);")
            result = cursor.fetchone()
            print(f"✅ ll_to_earth function works: {result[0]}")
            
            # Test earth_distance function
            cursor.execute("""
                SELECT earth_distance(
                    ll_to_earth(40.7128, -74.0060),
                    ll_to_earth(40.7589, -73.9851)
                );
            """)
            result = cursor.fetchone()
            distance_meters = result[0]
            distance_miles = distance_meters * 0.000621371
            print(f"✅ earth_distance function works: {distance_meters:.2f}m ({distance_miles:.2f}mi)")
            
            return True
            
        except Exception as e:
            print(f"❌ earthdistance functions failed: {e}")
            return False

def main():
    """Main function to enable PostGIS extensions."""
    print("=== Enabling PostGIS Extensions ===")
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set")
        print("Please set DATABASE_URL to your PostgreSQL connection string")
        sys.exit(1)
    
    try:
        # Connect to database
        connection = psycopg2.connect(database_url)
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Connected to database")
        
        # Enable extensions
        success_count = enable_extensions(connection)
        
        # Verify extensions
        if verify_extensions(connection):
            # Test functions
            if test_earthdistance_functions(connection):
                print("\n✅ All PostGIS extensions enabled and working!")
                print("The cursor-based pagination with distance sorting should now work.")
            else:
                print("\n❌ Extensions enabled but functions not working")
                sys.exit(1)
        else:
            print("\n❌ Extensions not properly enabled")
            sys.exit(1)
        
        connection.close()
        sys.exit(0)
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check that DATABASE_URL is set correctly")
        print("2. Verify database connection details")
        print("3. Ensure PostgreSQL server is running")
        print("4. Check that the database user has CREATE EXTENSION privileges")
        sys.exit(1)

if __name__ == "__main__":
    main()
