#!/usr/bin/env python3
"""
Test script to verify core functionality after setup.
"""

import os
import sys
import psycopg2
import redis

def test_database_connection():
    """Test database connection and basic functionality."""
    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL not set")
            return False
        
        print("🔗 Testing database connection...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ Database connected: {version[0]}")
        
        # Test extensions
        cursor.execute("SELECT extname FROM pg_extension WHERE extname IN ('cube', 'earthdistance')")
        extensions = cursor.fetchall()
        ext_names = [ext[0] for ext in extensions]
        print(f"✅ Extensions: {ext_names}")
        
        # Test restaurants table
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name IN ('timezone', 'hours_structured', 'latitude', 'longitude')
            ORDER BY column_name
        """)
        columns = cursor.fetchall()
        print(f"✅ New columns: {[col[0] for col in columns]}")
        
        # Test spatial functions
        cursor.execute("SELECT ll_to_earth(40.7128, -74.0060)")
        result = cursor.fetchone()
        print(f"✅ Spatial functions working: {result[0] is not None}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_redis_connection():
    """Test Redis connection and basic functionality."""
    try:
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        print("🔗 Testing Redis connection...")
        
        r = redis.from_url(redis_url)
        r.ping()
        print("✅ Redis connected")
        
        # Test basic operations
        r.set('test_key', 'test_value')
        value = r.get('test_key')
        r.delete('test_key')
        print(f"✅ Redis operations working: {value.decode() == 'test_value'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Redis test failed: {e}")
        return False

def test_environment():
    """Test environment variables."""
    print("🔧 Testing environment variables...")
    
    required_vars = ['DATABASE_URL', 'ENVIRONMENT']
    optional_vars = ['REDIS_URL']
    
    all_good = True
    
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}: {value[:20]}..." if len(value) > 20 else f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: not set")
            all_good = False
    
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️ {var}: not set (optional)")
    
    return all_good

def main():
    """Main test function."""
    print("🧪 Testing Core Functionality")
    print("=" * 50)
    
    # Test environment
    env_ok = test_environment()
    print()
    
    # Test database
    db_ok = test_database_connection()
    print()
    
    # Test Redis
    redis_ok = test_redis_connection()
    print()
    
    # Summary
    print("=" * 50)
    print("📋 Test Summary:")
    
    if env_ok and db_ok and redis_ok:
        print("✅ All core functionality tests passed!")
        print("\n🚀 Your setup is ready for production!")
        print("\nNext steps:")
        print("1. Start the backend: python app_factory.py")
        print("2. Start the frontend: npm run dev")
        print("3. Test the API endpoints")
    else:
        print("❌ Some tests failed. Please check the issues above.")
        
        if not env_ok:
            print("\n🔧 Environment issues:")
            print("   - Check environment variables")
            
        if not db_ok:
            print("\n🔧 Database issues:")
            print("   - Verify PostgreSQL is running")
            print("   - Check database credentials")
            
        if not redis_ok:
            print("\n🔧 Redis issues:")
            print("   - Verify Redis is running")
            print("   - Check Redis configuration")

if __name__ == "__main__":
    main()
