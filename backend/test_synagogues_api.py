#!/usr/bin/env python3
"""
Test script for the synagogues API endpoints.
Run this script to verify that the new synagogues API is working correctly.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8082"  # Change this to your backend URL
API_BASE = f"{BASE_URL}/api/v4/synagogues"

def test_endpoint(endpoint, description):
    """Test a specific endpoint and return the result."""
    try:
        print(f"\n🔍 Testing: {description}")
        print(f"   URL: {endpoint}")
        
        response = requests.get(endpoint, timeout=10)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: {data.get('message', 'No message')}")
            
            # Show some data if available
            if 'synagogues' in data:
                count = len(data['synagogues'])
                total = data.get('total', 0)
                print(f"   📊 Retrieved {count} synagogues (total: {total})")
                
                if count > 0:
                    first = data['synagogues'][0]
                    print(f"   🏛️  First synagogue: {first.get('name', 'Unknown')} in {first.get('city', 'Unknown city')}")
            
            elif 'data' in data:
                print(f"   📋 Filter options available")
                if 'cities' in data['data']:
                    cities = data['data']['cities']
                    print(f"   🏙️  Cities: {len(cities)} available (e.g., {cities[:3] if len(cities) >= 3 else cities})")
            
            return True
            
        else:
            print(f"   ❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Error text: {response.text[:200]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection Error: Could not connect to {BASE_URL}")
        print(f"   Make sure the backend server is running on {BASE_URL}")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout: Request took too long")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False

def main():
    """Main test function."""
    print("🚀 Synagogues API Test Suite")
    print("=" * 50)
    print(f"Testing backend at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test endpoints
    endpoints = [
        (f"{API_BASE}", "Get synagogues (main endpoint)"),
        (f"{API_BASE}?limit=5", "Get synagogues with limit"),
        (f"{API_BASE}?search=miami", "Search synagogues in Miami"),
        (f"{API_BASE}/filter-options", "Get filter options"),
        (f"{API_BASE}/statistics", "Get synagogue statistics"),
    ]
    
    results = []
    for endpoint, description in endpoints:
        success = test_endpoint(endpoint, description)
        results.append(success)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The synagogues API is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        sys.exit(1)
