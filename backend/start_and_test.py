#!/usr/bin/env python3
"""Script to start the server and test API endpoints."""

import subprocess
import time
import requests
import sys
import os

def start_server():
    """Start the Flask server."""
    print("🚀 Starting Flask server...")
    
    # Set environment variables
    env = os.environ.copy()
    env['PORT'] = '5001'
    
    # Start server in background
    process = subprocess.Popen(
        ['python', 'app.py'],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    print(f"Server started with PID: {process.pid}")
    return process

def test_endpoints():
    """Test the API endpoints."""
    print("🧪 Testing API endpoints...")
    
    base_url = "http://localhost:5001/api/v4/marketplace"
    
    # Test categories endpoint
    try:
        print("Testing categories endpoint...")
        response = requests.get(f"{base_url}/categories", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Categories endpoint working! Found {len(data.get('data', []))} categories")
        else:
            print(f"❌ Categories endpoint returned {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error testing categories: {e}")
    
    # Test listings endpoint
    try:
        print("\nTesting listings endpoint...")
        response = requests.get(f"{base_url}/listings", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Listings endpoint working! Found {len(data.get('data', {}).get('listings', []))} listings")
        else:
            print(f"❌ Listings endpoint returned {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error testing listings: {e}")

def main():
    """Main function."""
    print("🎯 Streamlined Marketplace API Test")
    print("=" * 50)
    
    # Start server
    server_process = start_server()
    
    try:
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(10)
        
        # Test endpoints
        test_endpoints()
        
    finally:
        # Clean up
        print("\n🛑 Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    main()
