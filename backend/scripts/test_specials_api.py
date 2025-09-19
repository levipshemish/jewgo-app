#!/usr/bin/env python3
"""
Test script for the specials API endpoints.

This script tests the specials API endpoints to ensure they're working correctly.
"""

import requests
import json
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def get_api_base_url():
    """Get API base URL from environment or use default."""
    return os.environ.get('API_BASE_URL', 'http://localhost:5000')

def test_health_endpoint():
    """Test the health endpoint."""
    print("🔍 Testing health endpoint...")
    
    try:
        response = requests.get(f"{get_api_base_url()}/test")
        if response.status_code == 200:
            print("✅ Health endpoint working")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
        return False

def test_get_specials():
    """Test getting specials."""
    print("\n🔍 Testing GET /api/v5/specials...")
    
    try:
        response = requests.get(f"{get_api_base_url()}/api/v5/specials")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data.get('specials', []))} specials")
            
            # Show first few specials
            specials = data.get('specials', [])[:3]
            for special in specials:
                print(f"  - {special.get('title')} (ID: {special.get('id')})")
            
            return True
        else:
            print(f"❌ GET specials failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ GET specials error: {e}")
        return False

def test_get_specials_by_restaurant():
    """Test getting specials by restaurant ID."""
    print("\n🔍 Testing GET /api/v5/specials?restaurant_id=...")
    
    try:
        # First get a restaurant ID from the specials
        response = requests.get(f"{get_api_base_url()}/api/v5/specials")
        if response.status_code == 200:
            data = response.json()
            specials = data.get('specials', [])
            
            if specials:
                restaurant_id = specials[0].get('restaurant_id')
                print(f"Testing with restaurant ID: {restaurant_id}")
                
                # Test filtering by restaurant
                response2 = requests.get(f"{get_api_base_url()}/api/v5/specials?restaurant_id={restaurant_id}")
                if response2.status_code == 200:
                    data2 = response2.json()
                    restaurant_specials = data2.get('specials', [])
                    print(f"✅ Found {len(restaurant_specials)} specials for restaurant {restaurant_id}")
                    return True
                else:
                    print(f"❌ GET specials by restaurant failed: {response2.text}")
                    return False
            else:
                print("❌ No specials found to test restaurant filtering")
                return False
        else:
            print(f"❌ Failed to get specials for testing: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ GET specials by restaurant error: {e}")
        return False

def test_get_special_by_id():
    """Test getting a specific special by ID."""
    print("\n🔍 Testing GET /api/v5/specials/<id>...")
    
    try:
        # First get a special ID
        response = requests.get(f"{get_api_base_url()}/api/v5/specials")
        if response.status_code == 200:
            data = response.json()
            specials = data.get('specials', [])
            
            if specials:
                special_id = specials[0].get('id')
                print(f"Testing with special ID: {special_id}")
                
                # Test getting specific special
                response2 = requests.get(f"{get_api_base_url()}/api/v5/specials/{special_id}")
                if response2.status_code == 200:
                    special_data = response2.json()
                    print(f"✅ Retrieved special: {special_data.get('title')}")
                    return True
                else:
                    print(f"❌ GET special by ID failed: {response2.text}")
                    return False
            else:
                print("❌ No specials found to test ID retrieval")
                return False
        else:
            print(f"❌ Failed to get specials for testing: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ GET special by ID error: {e}")
        return False

def test_create_special():
    """Test creating a new special."""
    print("\n🔍 Testing POST /api/v5/specials...")
    
    try:
        # Get a restaurant ID first
        response = requests.get(f"{get_api_base_url()}/api/v5/specials")
        if response.status_code == 200:
            data = response.json()
            specials = data.get('specials', [])
            
            if specials:
                restaurant_id = specials[0].get('restaurant_id')
                
                # Create a test special
                test_special = {
                    "restaurant_id": restaurant_id,
                    "title": "Test Special",
                    "subtitle": "Created by API test",
                    "description": "This is a test special created by the API test script",
                    "discount_type": "percentage",
                    "discount_value": 15.0,
                    "discount_label": "15% Off Test",
                    "valid_from": "2025-09-19T20:00:00Z",
                    "valid_until": "2025-09-20T23:59:59Z",
                    "max_claims_total": 10,
                    "max_claims_per_user": 1,
                    "per_visit": False,
                    "requires_code": False,
                    "terms": "Test terms and conditions"
                }
                
                response2 = requests.post(
                    f"{get_api_base_url()}/api/v5/specials",
                    json=test_special,
                    headers={"Content-Type": "application/json"}
                )
                
                if response2.status_code == 201:
                    created_special = response2.json()
                    print(f"✅ Created test special: {created_special.get('title')} (ID: {created_special.get('id')})")
                    return True
                else:
                    print(f"❌ POST special failed: {response2.status_code} - {response2.text}")
                    return False
            else:
                print("❌ No restaurants found to create test special")
                return False
        else:
            print(f"❌ Failed to get restaurants for testing: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ POST special error: {e}")
        return False

def main():
    """Main test function."""
    print("🧪 Specials API Test Suite")
    print("=" * 40)
    
    # Test health endpoint
    if not test_health_endpoint():
        print("❌ Health check failed - server may not be running")
        sys.exit(1)
    
    # Test specials endpoints
    tests = [
        test_get_specials,
        test_get_specials_by_restaurant,
        test_get_special_by_id,
        test_create_special
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
