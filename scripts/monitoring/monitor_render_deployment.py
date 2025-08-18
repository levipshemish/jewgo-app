#!/usr/bin/env python3
"""
Monitor Render Deployment and Redis Functionality
================================================

This script tests the deployed JewGo backend on Render to verify:
1. Application startup without errors
2. Health endpoint functionality
3. Redis cache functionality
4. API endpoints working
5. Debug information

Usage:
    python scripts/monitor_render_deployment.py [base_url]
"""

import requests
import json
import sys
import time
from datetime import datetime


def test_endpoint(url, endpoint, expected_status=200, timeout=10):
    """Test a specific endpoint"""
    full_url = f"{url.rstrip('/')}/{endpoint.lstrip('/')}"
    try:
        response = requests.get(full_url, timeout=timeout)
        print(f"✅ {endpoint}: {response.status_code}")
        if response.status_code == expected_status:
            return True, response
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            return False, response
    except requests.exceptions.RequestException as e:
        print(f"❌ {endpoint}: {e}")
        return False, None


def test_post_endpoint(url, endpoint, data=None, expected_status=200, timeout=10):
    """Test a POST endpoint"""
    full_url = f"{url.rstrip('/')}/{endpoint.lstrip('/')}"
    try:
        response = requests.post(full_url, json=data, timeout=timeout)
        print(f"✅ {endpoint}: {response.status_code}")
        if response.status_code == expected_status:
            return True, response
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            return False, response
    except requests.exceptions.RequestException as e:
        print(f"❌ {endpoint}: {e}")
        return False, None


def analyze_response(response, endpoint_name):
    """Analyze and display response details"""
    if response is None:
        return

    print(f"   📊 {endpoint_name} Response:")
    print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
    print(f"   Content-Length: {len(response.content)} bytes")

    try:
        data = response.json()
        print(f"   JSON Response: {json.dumps(data, indent=2)}")
    except json.JSONDecodeError:
        print(f"   Text Response: {response.text[:200]}...")


def test_redis_functionality(base_url):
    """Test Redis-specific functionality"""
    print("\n🔍 Testing Redis Functionality...")

    # Test cache stats endpoint
    success, response = test_endpoint(base_url, "/api/admin/cache/stats")
    if success:
        analyze_response(response, "Cache Stats")

    # Test cache clear endpoint
    success, response = test_post_endpoint(base_url, "/api/admin/cache/clear")
    if success:
        analyze_response(response, "Cache Clear")

    # Test debug Redis config endpoint
    success, response = test_endpoint(base_url, "/api/debug/redis-config")
    if success:
        analyze_response(response, "Redis Config Debug")


def test_api_endpoints(base_url):
    """Test core API endpoints"""
    print("\n🔍 Testing Core API Endpoints...")

    endpoints = [
        ("/", "Root endpoint"),
        ("/health", "Health check"),
        ("/api/restaurants", "Restaurants API"),
        ("/api/kosher-types", "Kosher types API"),
        ("/api/statistics", "Statistics API"),
    ]

    for endpoint, description in endpoints:
        success, response = test_endpoint(base_url, endpoint)
        if success and response:
            print(f"   📋 {description}: Working")
        else:
            print(f"   ❌ {description}: Failed")


def test_error_handling(base_url):
    """Test error handling"""
    print("\n🔍 Testing Error Handling...")

    # Test non-existent endpoint
    success, response = test_endpoint(
        base_url, "/api/non-existent", expected_status=404
    )
    if success:
        print("   ✅ 404 handling: Working")
    else:
        print("   ❌ 404 handling: Failed")


def main():
    """Main monitoring function"""
    print("🚀 JewGo Render Deployment Monitor")
    print("=" * 50)

    # Get base URL from command line or use default
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        # Try to get from environment or use a default
        import os

        base_url = os.environ.get("RENDER_URL", "https://jewgo-backend.onrender.com")

    print(f"📍 Testing deployment at: {base_url}")
    print(f"⏰ Started at: {datetime.now().isoformat()}")

    # Test basic connectivity
    print("\n🔍 Testing Basic Connectivity...")
    try:
        response = requests.get(base_url, timeout=10)
        print(f"✅ Basic connectivity: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Basic connectivity failed: {e}")
        print("💡 Make sure the deployment is live and the URL is correct")
        return False

    # Test all endpoints
    test_api_endpoints(base_url)
    test_redis_functionality(base_url)
    test_error_handling(base_url)

    print("\n" + "=" * 50)
    print("📊 Monitoring Complete!")
    print(f"⏰ Finished at: {datetime.now().isoformat()}")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
