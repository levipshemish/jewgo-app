import json
import os
import sys
from datetime import datetime

try:
    import redis
    from app_factory import create_app
    from monitor_redis import RedisMonitor
    from utils.cache_manager import cache_manager
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    import redis
    from app_factory import create_app
    from monitor_redis import RedisMonitor
    from utils.cache_manager import cache_manager

#!/usr/bin/env python3
"""
Test Redis Integration for JewGo App
===================================

This script tests the Redis integration with Redis Cloud.
"""

# Set Redis URL
os.environ[
    "REDIS_URL"
] = "redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768"


def test_redis_connection():
    """Test basic Redis connection"""
    print("🔍 Testing Redis Cloud connection...")

    try:
        r = redis.from_url(os.environ["REDIS_URL"])
        r.ping()
        print("✅ Redis Cloud connection successful!")
        return True
    except Exception as e:
        print(f"❌ Redis Cloud connection failed: {e}")
        return False


def test_cache_manager():
    """Test cache manager functionality"""
    print("\n🔍 Testing cache manager...")

    try:
        sys.path.append("backend")
        print(f"✅ Cache manager imported successfully")
        print(f"Redis client available: {cache_manager.redis_client is not None}")

        # Test cache operations
        test_data = {
            "message": "Hello from JewGo!",
            "timestamp": datetime.now().isoformat(),
            "test": True,
        }

        # Set cache
        success = cache_manager.set("jewgo:test:integration", test_data, 300)
        print(f"✅ Cache set operation: {success}")

        # Get cache
        result = cache_manager.get("jewgo:test:integration")
        print(f"✅ Cache get operation: {result is not None}")

        if result:
            print(f"✅ Data integrity: {result == test_data}")

        # Test restaurant caching
        restaurant_data = {
            "id": 1,
            "name": "Test Restaurant",
            "kosher_type": "Glatt Kosher",
            "cached_at": datetime.now().isoformat(),
        }

        cache_manager.cache_restaurant_details(1, restaurant_data, 600)
        cached_restaurant = cache_manager.get_cached_restaurant_details(1)
        print(f"✅ Restaurant caching: {cached_restaurant is not None}")

        # Clean up
        cache_manager.delete("jewgo:test:integration")
        cache_manager.invalidate_restaurant_cache(1)

        return True

    except Exception as e:
        print(f"❌ Cache manager test failed: {e}")
        return False


def test_flask_integration():
    """Test Flask app integration"""
    print("\n🔍 Testing Flask app integration...")

    try:
        sys.path.append("backend")
        app = create_app()
        print("✅ Flask app created successfully with Redis integration")

        # Test app context
        with app.app_context():
            print("✅ Flask app context working")

            # Test cache manager in app context
            if cache_manager.redis_client:
                print("✅ Cache manager available in Flask context")
            else:
                print("⚠️ Cache manager not available in Flask context")

        return True

    except Exception as e:
        print(f"❌ Flask integration test failed: {e}")
        return False


def test_redis_monitoring():
    """Test Redis monitoring"""
    print("\n🔍 Testing Redis monitoring...")

    try:
        sys.path.append("scripts")
        monitor = RedisMonitor(os.environ["REDIS_URL"])

        if monitor.redis_client:
            print("✅ Redis monitoring working")

            # Get basic info
            info = monitor.get_basic_info()
            if info:
                print(f"✅ Redis version: {info.get('redis_version', 'Unknown')}")
                print(f"✅ Memory usage: {info.get('used_memory_human', 'Unknown')}")

            # Get cache stats
            stats = monitor.get_cache_stats()
            if stats:
                print(f"✅ Total keys: {stats.get('total_keys', 0)}")

            return True
        else:
            print("❌ Redis monitoring failed")
            return False

    except Exception as e:
        print(f"❌ Redis monitoring test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Testing Redis Integration for JewGo App")
    print("=" * 50)

    tests = [
        ("Redis Connection", test_redis_connection),
        ("Cache Manager", test_cache_manager),
        ("Flask Integration", test_flask_integration),
        ("Redis Monitoring", test_redis_monitoring),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Redis integration is working correctly.")
    else:
        print("⚠️ Some tests failed. Please check the configuration.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
