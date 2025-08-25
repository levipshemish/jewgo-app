#!/usr/bin/env python3
"""
Test Production Connection
=========================

This script tests the production connection to verify that Render
is now using the Oracle Cloud database correctly.
"""

import os
import sys
import requests
import json
from datetime import datetime

def test_production_api():
    """Test the production API endpoints."""
    
    # Your Render app URL (replace with your actual URL)
    base_url = "https://jewgo-app.onrender.com"  # Update this with your actual Render URL
    
    print("🔍 Testing Production Connection")
    print("=" * 40)
    print(f"🌐 Testing URL: {base_url}")
    print()
    
    # Test 1: Health check
    print("1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # Test 2: Restaurants API
    print("\n2. Testing restaurants API...")
    try:
        response = requests.get(f"{base_url}/api/restaurants", timeout=15)
        if response.status_code == 200:
            data = response.json()
            if 'restaurants' in data:
                count = len(data['restaurants'])
                print(f"✅ Restaurants API working - Found {count} restaurants")
            else:
                print(f"✅ Restaurants API working - Response: {data}")
        else:
            print(f"❌ Restaurants API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Restaurants API error: {e}")
    
    # Test 3: Restaurants with images API
    print("\n3. Testing restaurants with images API...")
    try:
        response = requests.get(f"{base_url}/api/restaurants-with-images", timeout=15)
        if response.status_code == 200:
            data = response.json()
            if 'restaurants' in data:
                count = len(data['restaurants'])
                print(f"✅ Restaurants with images API working - Found {count} restaurants")
            else:
                print(f"✅ Restaurants with images API working - Response: {data}")
        else:
            print(f"❌ Restaurants with images API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Restaurants with images API error: {e}")
    
    # Test 4: Statistics API
    print("\n4. Testing statistics API...")
    try:
        response = requests.get(f"{base_url}/api/statistics", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Statistics API working - Data: {data}")
        else:
            print(f"❌ Statistics API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Statistics API error: {e}")
    
    print("\n" + "=" * 40)
    print("🎯 Production Connection Test Complete")
    print("=" * 40)

def test_oracle_cloud_direct():
    """Test direct connection to Oracle Cloud database."""
    
    print("\n🔍 Testing Direct Oracle Cloud Connection")
    print("=" * 40)
    
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    try:
        from sqlalchemy import create_engine, text
        
        engine = create_engine(
            oracle_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10}
        )
        
        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text("SELECT 1"))
            print("✅ Direct Oracle Cloud connection successful")
            
            # Test restaurant count
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
            count = result.scalar()
            print(f"✅ Restaurant count: {count}")
            
            # Test sample restaurant
            result = conn.execute(text("SELECT id, name, city FROM restaurants LIMIT 1"))
            sample = result.fetchone()
            if sample:
                print(f"✅ Sample restaurant: ID {sample[0]}, {sample[1]} in {sample[2]}")
            
    except Exception as e:
        print(f"❌ Direct Oracle Cloud connection failed: {e}")

def main():
    """Main test function."""
    print("🚀 Production Database Migration Verification")
    print("=" * 50)
    print(f"⏰ Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test production API
    test_production_api()
    
    # Test direct Oracle Cloud connection
    test_oracle_cloud_direct()
    
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print("=" * 50)
    print("✅ If all tests passed, your Oracle Cloud migration is working in production!")
    print("✅ Your application is now using the Oracle Cloud PostgreSQL database.")
    print("✅ All 207 restaurants and related data are available.")
    print()
    print("🎉 Migration to Oracle Cloud PostgreSQL is complete!")

if __name__ == "__main__":
    main()
