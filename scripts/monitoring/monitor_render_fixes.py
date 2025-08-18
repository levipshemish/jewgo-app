#!/usr/bin/env python3
"""
Monitor Render Deployment Fixes
===============================

This script monitors the Render deployment after applying Redis and database connection fixes.
It tests various endpoints to verify that the issues have been resolved.

Author: JewGo Development Team
Version: 1.0
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://jewgo.onrender.com"
TIMEOUT = 10


def log(message, level="INFO"):
    """Log messages with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")


def test_endpoint(endpoint, method="GET", data=None, expected_status=200):
    """Test a specific endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=TIMEOUT)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=TIMEOUT)
        else:
            log(f"Unsupported method: {method}", "ERROR")
            return False, None

        success = response.status_code == expected_status
        log(
            f"{method} {endpoint} - Status: {response.status_code} (Expected: {expected_status})",
            "SUCCESS" if success else "ERROR",
        )

        if response.status_code == 200:
            try:
                return success, response.json()
            except:
                return success, response.text
        else:
            return success, response.text

    except requests.exceptions.RequestException as e:
        log(f"{method} {endpoint} - Request failed: {e}", "ERROR")
        return False, str(e)


def main():
    """Main monitoring function"""
    log("Starting Render deployment monitoring...")
    log(f"Testing against: {BASE_URL}")

    # Test 1: Basic connectivity
    log("\n=== Test 1: Basic Connectivity ===")
    success, data = test_endpoint("/")
    if not success:
        log(
            "Basic connectivity failed. Deployment may still be in progress.", "WARNING"
        )
        return

    # Test 2: Environment variables debug
    log("\n=== Test 2: Environment Variables Debug ===")
    success, data = test_endpoint("/api/debug/env-vars")
    if success and isinstance(data, dict):
        log("Environment variables found:")
        for key, value in data.items():
            if key in ["REDIS_URL", "CACHE_REDIS_URL"]:
                if value and "localhost" not in value:
                    log(f"  {key}: {value[:50]}... (✅ Redis Cloud configured)")
                else:
                    log(f"  {key}: {value} (❌ Still using localhost)")
            elif key == "DATABASE_URL":
                log(f"  {key}: {'***' if value else 'Not set'} (✅ Configured)")
            else:
                log(f"  {key}: {value}")
    else:
        log("Failed to get environment variables", "ERROR")

    # Test 3: Redis configuration debug
    log("\n=== Test 3: Redis Configuration Debug ===")
    success, data = test_endpoint("/api/debug/redis-config")
    if success and isinstance(data, dict):
        redis_url = data.get("redis_url", "")
        cache_redis_url = data.get("cache_redis_url", "")

        if redis_url and "localhost" not in redis_url:
            log(f"Redis URL: {redis_url[:50]}... (✅ Redis Cloud)")
        else:
            log(f"Redis URL: {redis_url} (❌ Still localhost)")

        if cache_redis_url and "localhost" not in cache_redis_url:
            log(f"Cache Redis URL: {cache_redis_url[:50]}... (✅ Redis Cloud)")
        else:
            log(f"Cache Redis URL: {cache_redis_url} (❌ Still localhost)")
    else:
        log("Failed to get Redis configuration", "ERROR")

    # Test 4: Health endpoint
    log("\n=== Test 4: Health Endpoint ===")
    success, data = test_endpoint("/health")
    if success and isinstance(data, dict):
        status = data.get("status", "unknown")
        db_status = data.get("database", {}).get("status", "unknown")
        redis_status = data.get("redis", {}).get("status", "unknown")

        log(f"Overall Status: {status}")
        log(f"Database Status: {db_status}")
        log(f"Redis Status: {redis_status}")

        # Check for errors
        db_error = data.get("database", {}).get("error")
        redis_error = data.get("redis", {}).get("error")

        if db_error:
            log(f"Database Error: {db_error}", "ERROR")
        if redis_error:
            log(f"Redis Error: {redis_error}", "ERROR")

    else:
        log("Health endpoint failed", "ERROR")

    # Test 5: Core API endpoints
    log("\n=== Test 5: Core API Endpoints ===")

    # Test restaurants endpoint
    success, data = test_endpoint("/api/restaurants?limit=5")
    if success:
        if isinstance(data, dict) and "restaurants" in data:
            count = len(data.get("restaurants", []))
            log(f"Restaurants endpoint: {count} restaurants returned (✅ Working)")
        else:
            log("Restaurants endpoint: Unexpected response format", "WARNING")
    else:
        log("Restaurants endpoint failed", "ERROR")

    # Test 6: Cache functionality
    log("\n=== Test 6: Cache Functionality ===")
    success, data = test_endpoint("/api/admin/cache/stats")
    if success:
        log("Cache stats endpoint working (✅ Cache system operational)")
    else:
        log(
            "Cache stats endpoint failed (❌ Cache system may not be working)",
            "WARNING",
        )

    # Test 7: CORS configuration
    log("\n=== Test 7: CORS Configuration ===")
    success, data = test_endpoint("/api/debug/cors-config")
    if success:
        log("CORS debug endpoint working (✅ CORS configured)")
    else:
        log("CORS debug endpoint failed", "WARNING")

    # Summary
    log("\n=== Summary ===")
    log("Monitoring complete. Check the results above to verify fixes.")
    log("If issues persist, check Render logs for more details.")


if __name__ == "__main__":
    main()
