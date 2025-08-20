#!/usr/bin/env python3
"""Complete test of the streamlined marketplace API with sample data creation."""

import json
import os
import subprocess
import sys
import time

import requests


def start_server():
    """Start the Flask server."""
    print("🚀 Starting Flask server...")

    # Set environment variables
    env = os.environ.copy()
    env["PORT"] = "5001"

    # Start server in background
    process = subprocess.Popen(
        ["python", "app.py"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE
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
            print(
                f"✅ Categories endpoint working! Found {len(data.get('data', []))} categories"
            )
            return True
        else:
            print(f"❌ Categories endpoint returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing categories: {e}")
        return False


def create_sample_listings():
    """Create sample listings."""
    print("📦 Creating sample listings...")

    base_url = "http://localhost:5001/api/v4/marketplace"

    # Sample listings
    listings = [
        {
            "title": "Vintage Judaica Book Collection",
            "kind": "regular",
            "category_id": 1,
            "price_cents": 5000,
            "condition": "used_good",
            "description": "Beautiful collection of vintage Judaica books in excellent condition.",
            "city": "Brooklyn",
            "region": "NY",
            "attributes": {
                "brand": "Various Publishers",
                "size": "Standard",
                "color": "Brown/Gold",
                "material": "Leather bound",
            },
        },
        {
            "title": "2018 Toyota Camry LE - Kosher Family Car",
            "kind": "vehicle",
            "category_id": 1,
            "price_cents": 1380000,
            "condition": "used_good",
            "description": "Well-maintained family car, perfect for the kosher community.",
            "city": "Lakewood",
            "region": "NJ",
            "attributes": {
                "vehicle_type": "car",
                "make": "Toyota",
                "model": "Camry",
                "year": 2018,
                "mileage": 72000,
                "transmission": "automatic",
                "fuel_type": "gasoline",
                "color": "Silver",
                "title_status": "clear",
            },
        },
        {
            "title": "KitchenAid Stand Mixer - Dairy Kitchen",
            "kind": "appliance",
            "category_id": 1,
            "price_cents": 25000,
            "condition": "used_like_new",
            "description": "Barely used KitchenAid stand mixer from our dairy kitchen.",
            "city": "Monsey",
            "region": "NY",
            "attributes": {
                "appliance_type": "other",
                "kosher_use": "dairy",
                "brand": "KitchenAid",
                "model_number": "KSM150PSER",
                "installation_required": False,
            },
        },
        {
            "title": "Free Microwave - Meat Kitchen",
            "kind": "appliance",
            "category_id": 1,
            "price_cents": 0,
            "condition": "used_fair",
            "description": "Giving away microwave from our meat kitchen. Works perfectly!",
            "city": "Five Towns",
            "region": "NY",
            "attributes": {
                "appliance_type": "microwave",
                "kosher_use": "meat",
                "brand": "Panasonic",
                "model_number": "NN-SN966S",
                "installation_required": False,
            },
        },
    ]

    created_count = 0
    for i, listing in enumerate(listings):
        try:
            print(f"Creating listing {i+1}: {listing['title']}")
            response = requests.post(f"{base_url}/listings", json=listing, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"✅ Created: {listing['title']}")
                    created_count += 1
                else:
                    print(f"❌ Failed: {data.get('error', 'Unknown error')}")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")

        except Exception as e:
            print(f"❌ Error creating listing {i+1}: {e}")

    return created_count


def test_listings():
    """Test fetching listings."""
    print("📋 Testing listings retrieval...")

    base_url = "http://localhost:5001/api/v4/marketplace"

    try:
        response = requests.get(f"{base_url}/listings", timeout=10)
        if response.status_code == 200:
            data = response.json()
            listings = data.get("data", {}).get("listings", [])
            print(f"✅ Found {len(listings)} listings")

            # Show some details
            for listing in listings[:2]:  # Show first 2
                price = (
                    listing["price_cents"] / 100
                    if listing["price_cents"] > 0
                    else "Free"
                )
                print(f"  - {listing['title']} | {listing['kind']} | ${price}")

            return len(listings)
        else:
            print(f"❌ Failed to fetch listings: {response.status_code}")
            return 0
    except Exception as e:
        print(f"❌ Error fetching listings: {e}")
        return 0


def main():
    """Main function."""
    print("🎯 Complete Marketplace Test")
    print("=" * 50)

    # Start server
    server_process = start_server()

    try:
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(10)

        # Test basic endpoints
        if not test_endpoints():
            print("❌ Basic endpoint test failed")
            return

        print("\n" + "=" * 50)

        # Create sample data
        created_count = create_sample_listings()
        print(f"\n📊 Created {created_count} sample listings")

        print("\n" + "=" * 50)

        # Test listings retrieval
        total_listings = test_listings()

        print("\n" + "=" * 50)
        print(f"🎉 Marketplace test complete!")
        print(f"✅ Server is running on http://localhost:5001")
        print(f"✅ Created {created_count} sample listings")
        print(f"✅ Total listings available: {total_listings}")
        print(f"🌐 Frontend marketplace: http://localhost:3000/marketplace")
        print(f"➕ Add new listing: http://localhost:3000/marketplace/add")

    finally:
        # Clean up
        print("\n🛑 Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server stopped")


if __name__ == "__main__":
    main()
