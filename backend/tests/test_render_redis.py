import os
import sys
import json
from datetime import datetime



        from utils.cache_manager import cache_manager

        from app_factory import create_app

            from utils.cache_manager import cache_manager

        from app_factory import create_app

        from app_factory import create_app




        import redis

#!/usr/bin/env python3
"""
Test Redis Integration for Render Deployment
===========================================

This script simulates the Render environment and tests Redis integration.
"""

def simulate_render_environment():
    """Simulate Render environment variables"""
    print("🔧 Simulating Render environment...")

    # Set Render-like environment variables
    os.environ.update(
        {
            "ENVIRONMENT": "production",
            "PORT": "8081",
            "PYTHON_VERSION": "3.11.8",
            "REDIS_URL": "redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768",
            "REDIS_HOST": "redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com",
            "REDIS_PORT": "10768",
            "REDIS_DB": "0",
            "REDIS_USERNAME": "default",
            "REDIS_PASSWORD": "p4El96DKlpczWdIIkdelvNUC8JBRm83r",
            "CACHE_TYPE": "redis",
            "CACHE_REDIS_URL": "redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768",
            "CACHE_DEFAULT_TIMEOUT": "300",
            "CACHE_KEY_PREFIX": "jewgo:",
            "SESSION_TYPE": "redis",
            "SESSION_REDIS": "redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768",
            "SESSION_KEY_PREFIX": "jewgo_session:",
            "PERMANENT_SESSION_LIFETIME": "3600",
        }
    )

    print("✅ Render environment variables set")


def test_redis_connection():
    """Test Redis connection in Render environment"""
    print("\n🔍 Testing Redis connection in Render environment...")

    try:
        redis_url = os.environ.get("REDIS_URL")
        r = redis.from_url(redis_url)
        r.ping()
        print("✅ Redis connection successful in Render environment")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False


def test_cache_manager_render():
    """Test cache manager in Render environment"""
    print("\n🔍 Testing cache manager in Render environment...")

    try:
        sys.path.append("backend")
        print(f"✅ Cache manager imported successfully")
        print(f"Redis client available: {cache_manager.redis_client is not None}")

        # Test cache operations
        test_data = {
            "message": "Hello from Render!",
            "timestamp": datetime.now().isoformat(),
            "environment": "production",
            "test": True,
        }

        # Set cache
        success = cache_manager.set("jewgo:render:test", test_data, 300)
        print(f"✅ Cache set operation: {success}")

        # Get cache
        result = cache_manager.get("jewgo:render:test")
        print(f"✅ Cache get operation: {result is not None}")

        if result:
            print(f"✅ Data integrity: {result == test_data}")

        # Clean up
        cache_manager.delete("jewgo:render:test")

        return True

    except Exception as e:
        print(f"❌ Cache manager test failed: {e}")
        return False


def test_flask_app_render():
    """Test Flask app in Render environment"""
    print("\n🔍 Testing Flask app in Render environment...")

    try:
        sys.path.append("backend")
        app = create_app()
        print("✅ Flask app created successfully in Render environment")

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
        print(f"❌ Flask app test failed: {e}")
        return False


def test_health_endpoint():
    """Test health endpoint with Redis status"""
    print("\n🔍 Testing health endpoint...")

    try:
        sys.path.append("backend")
        app = create_app()

        with app.test_client() as client:
            response = client.get("/health")
            if response.status_code == 200:
                data = response.get_json()
                print("✅ Health endpoint responding")
                print(f"✅ Status: {data.get('status', 'unknown')}")
                print(f"✅ Redis: {data.get('redis', 'unknown')}")
                return True
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
                return False

    except Exception as e:
        print(f"❌ Health endpoint test failed: {e}")
        return False


def test_cache_endpoints():
    """Test cache management endpoints"""
    print("\n🔍 Testing cache management endpoints...")

    try:
        sys.path.append("backend")
        app = create_app()

        with app.test_client() as client:
            # Test cache stats endpoint
            response = client.get("/api/admin/cache/stats")
            if response.status_code == 200:
                data = response.get_json()
                print("✅ Cache stats endpoint working")
                print(f"✅ Cache type: {data.get('cache_type', 'unknown')}")
                print(f"✅ Total keys: {data.get('total_keys', 0)}")
                return True
            else:
                print(f"❌ Cache stats endpoint failed: {response.status_code}")
                return False

    except Exception as e:
        print(f"❌ Cache endpoints test failed: {e}")
        return False


def main():
    """Run all Render tests"""
    print("🚀 Testing Redis Integration for Render Deployment")
    print("=" * 60)

    # Simulate Render environment
    simulate_render_environment()

    tests = [
        ("Redis Connection", test_redis_connection),
        ("Cache Manager", test_cache_manager_render),
        ("Flask App", test_flask_app_render),
        ("Health Endpoint", test_health_endpoint),
        ("Cache Endpoints", test_cache_endpoints),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 60)
    print("📊 Render Deployment Test Results")
    print("=" * 60)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Redis integration is ready for Render deployment.")
        print("\n📋 Next steps for Render deployment:")
        print("1. Push your code to GitHub")
        print("2. Connect your repository to Render")
        print("3. Deploy using the updated render.yaml configuration")
        print("4. Monitor the deployment logs for any issues")
    else:
        print("⚠️ Some tests failed. Please check the configuration before deploying.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
