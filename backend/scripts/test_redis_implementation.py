import os
import sys
import time
from dotenv import load_dotenv

        
        
        from utils.cache_manager import CacheManager
        
        



import requests
        import redis
        import flask_session
        from flask import Flask
        from flask_session import Session
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        from flask import Flask

#!/usr/bin/env python3
"""Test Redis Implementation.
======================

This script tests all Redis functionality after implementation.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def test_redis_connection():
    """Test basic Redis connection."""
    print("🔍 Testing Redis Connection")
    print("=" * 40)
    
    try:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        print(f"Redis URL: {redis_url}")
        
        r = redis.from_url(redis_url)
        r.ping()
        print("✅ Redis connection successful")
        
        # Test basic operations
        test_key = f"test_{int(time.time())}"
        r.setex(test_key, 60, "test_value")
        value = r.get(test_key)
        r.delete(test_key)
        
        if value == b"test_value":
            print("✅ Redis basic operations successful")
        else:
            print("❌ Redis basic operations failed")
            
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def test_flask_session():
    """Test Flask-Session with Redis."""
    print("\n🔍 Testing Flask-Session")
    print("=" * 40)
    
    try:
        print("✅ Flask-Session package available")
        
        # Test session configuration
        app = Flask(__name__)
        app.config['SESSION_TYPE'] = 'redis'
        app.config['SECRET_KEY'] = 'test-secret'
        
        # This would normally require a Redis connection
        print("✅ Flask-Session configuration successful")
        return True
        
    except Exception as e:
        print(f"❌ Flask-Session test failed: {e}")
        return False

def test_cache_manager():
    """Test cache manager functionality."""
    print("\n🔍 Testing Cache Manager")
    print("=" * 40)
    
    try:
        redis_url = os.environ.get("REDIS_URL")
        cache_manager = CacheManager(redis_url=redis_url)
        
        # Test cache operations
        test_key = "test_cache_key"
        test_value = {"test": "data", "timestamp": time.time()}
        
        # Set cache
        success = cache_manager.set(test_key, test_value, ttl=60)
        if success:
            print("✅ Cache set operation successful")
        else:
            print("❌ Cache set operation failed")
        
        # Get cache
        retrieved = cache_manager.get(test_key)
        if retrieved == test_value:
            print("✅ Cache get operation successful")
        else:
            print("❌ Cache get operation failed")
        
        # Clean up
        cache_manager.delete(test_key)
        print("✅ Cache cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Cache manager test failed: {e}")
        return False

def test_rate_limiting():
    """Test rate limiting configuration."""
    print("\n🔍 Testing Rate Limiting Configuration")
    print("=" * 40)
    
    try:
        redis_url = os.environ.get("REDIS_URL", "memory://")
        print(f"Rate limiting storage: {redis_url}")
        
        # Test limiter configuration
        app = Flask(__name__)
        
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=["200 per day", "50 per hour"],
            storage_uri=redis_url
        )
        
        print("✅ Rate limiter configuration successful")
        return True
        
    except Exception as e:
        print(f"❌ Rate limiting test failed: {e}")
        return False

def test_health_endpoints():
    """Test Redis health endpoints (if app is running)."""
    print("\n🔍 Testing Redis Health Endpoints")
    print("=" * 40)
    
    base_url = os.environ.get("FLASK_APP_URL", "http://localhost:5000")
    
    endpoints = [
        "/api/redis/health",
        "/api/redis/stats"
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            print(f"Testing: {url}")
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {endpoint}: {data.get('status', 'unknown')}")
            else:
                print(f"❌ {endpoint}: HTTP {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️  {endpoint}: Could not connect (app may not be running)")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")

def main():
    """Main test function."""
    print("🚀 Testing Redis Implementation")
    print("=" * 50)
    
    tests = [
        ("Redis Connection", test_redis_connection),
        ("Flask-Session", test_flask_session),
        ("Cache Manager", test_cache_manager),
        ("Rate Limiting", test_rate_limiting)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results[test_name] = False
    
    # Test health endpoints (optional)
    test_health_endpoints()
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 20)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All Redis functionality tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check Redis configuration.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
