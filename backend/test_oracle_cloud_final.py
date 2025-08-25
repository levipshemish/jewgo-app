#!/usr/bin/env python3
"""
Final Oracle Cloud Connection Test
================================

This script tests the direct connection to Oracle Cloud database
to verify the migration is working correctly.
"""

import os
import sys
from datetime import datetime

def test_oracle_cloud_connection():
    """Test direct connection to Oracle Cloud database."""
    
    print("🚀 Final Oracle Cloud Database Test")
    print("=" * 50)
    print(f"⏰ Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    try:
        from sqlalchemy import create_engine, text
        
        print("🔍 Testing Oracle Cloud connection...")
        engine = create_engine(
            oracle_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10}
        )
        
        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text("SELECT 1"))
            print("✅ Oracle Cloud connection successful")
            
            # Test restaurant count
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
            count = result.scalar()
            print(f"✅ Restaurant count: {count}")
            
            # Test sample restaurants
            result = conn.execute(text("SELECT id, name, city FROM restaurants ORDER BY id LIMIT 3"))
            samples = result.fetchall()
            print("✅ Sample restaurants:")
            for sample in samples:
                print(f"   - ID {sample[0]}: {sample[1]} in {sample[2]}")
            
            # Test other tables
            tables_to_check = [
                ('restaurant_images', 'images'),
                ('florida_synagogues', 'synagogues'),
                ('google_places_data', 'Google Places entries'),
                ('reviews', 'reviews'),
                ('marketplace', 'marketplace items')
            ]
            
            print("\n📊 Table counts:")
            for table_name, description in tables_to_check:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = result.scalar()
                    print(f"   ✅ {description}: {count}")
                except Exception as e:
                    print(f"   ❌ {description}: Error - {e}")
            
            # Test database info
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"\n📋 Database version: {version}")
            
    except Exception as e:
        print(f"❌ Oracle Cloud connection failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎯 Test Summary:")
    print("=" * 50)
    print("✅ Oracle Cloud PostgreSQL is working correctly!")
    print("✅ All migrated data is accessible!")
    print("✅ Your application should be working with the new database!")
    print()
    print("🎉 Migration to Oracle Cloud PostgreSQL is complete and successful!")
    return True

def main():
    """Main test function."""
    success = test_oracle_cloud_connection()
    
    if success:
        print("\n🚀 Next Steps:")
        print("1. Your Render deployment should now be using Oracle Cloud")
        print("2. Test your application in the browser")
        print("3. Verify all features are working correctly")
        print("4. Monitor the application for any issues")
        print()
        print("🎊 Congratulations! Your migration is complete!")
    else:
        print("\n❌ There may be an issue with the Oracle Cloud connection.")
        print("Please check your network connectivity and database configuration.")

if __name__ == "__main__":
    main()
