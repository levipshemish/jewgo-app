#!/usr/bin/env python3
"""Test script for streamlined marketplace API endpoints."""

import json
import time

import requests

BASE_URL = "http://localhost:5001/api/v4/marketplace"


def test_categories():
    """Test categories endpoint."""
    print("Testing categories endpoint...")
    response = requests.get(f"{BASE_URL}/categories")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Categories: {len(data.get('data', []))}")
        for category in data.get("data", [])[:3]:
            print(f"  - {category['name']} ({category['slug']})")
    else:
        print(f"Error: {response.text}")
    print()


def test_listings():
    """Test listings endpoint."""
    print("Testing listings endpoint...")
    response = requests.get(f"{BASE_URL}/listings")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Listings: {len(data.get('data', {}).get('listings', []))}")
        print(f"Total: {data.get('data', {}).get('total', 0)}")
    else:
        print(f"Error: {response.text}")
    print()


def test_create_regular_listing():
    """Test creating a regular listing."""
    print("Testing create regular listing endpoint...")

    listing_data = {
        "title": "Test Dining Table",
        "description": "Solid wood dining table, seats 6",
        "kind": "regular",
        "category_id": 4,  # Furniture & Home Goods
        "price_cents": 25000,
        "condition": "used_good",
        "city": "Miami",
        "region": "FL",
        "attributes": {},
    }

    response = requests.post(
        f"{BASE_URL}/listings",
        headers={"Content-Type": "application/json"},
        data=json.dumps(listing_data),
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created listing ID: {data.get('data', {}).get('id')}")
        return data.get("data", {}).get("id")
    else:
        print(f"Error: {response.text}")
    print()
    return None


def test_create_vehicle_listing():
    """Test creating a vehicle listing."""
    print("Testing vehicle listing creation...")

    listing_data = {
        "title": "2018 Toyota Camry LE",
        "description": "Well maintained, low mileage",
        "kind": "vehicle",
        "category_id": 1,  # Vehicles & Auto
        "subcategory_id": 1,  # Cars
        "price_cents": 1380000,
        "condition": "used_good",
        "city": "North Miami Beach",
        "region": "FL",
        "attributes": {
            "vehicle_type": "car",
            "make": "Toyota",
            "model": "Camry",
            "year": 2018,
            "mileage": 72000,
        },
    }

    response = requests.post(
        f"{BASE_URL}/listings",
        headers={"Content-Type": "application/json"},
        data=json.dumps(listing_data),
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created vehicle listing ID: {data.get('data', {}).get('id')}")
    else:
        print(f"Error: {response.text}")
    print()


def test_create_appliance_listing():
    """Test creating an appliance listing."""
    print("Testing appliance listing creation...")

    listing_data = {
        "title": "KitchenAid Artisan 5qt Mixer",
        "description": "Lightly used, perfect condition",
        "kind": "appliance",
        "category_id": 2,  # Appliances & Kitchen
        "price_cents": 12000,
        "condition": "used_like_new",
        "city": "Aventura",
        "region": "FL",
        "attributes": {
            "appliance_type": "mixer",
            "brand": "KitchenAid",
            "model": "Artisan 5qt",
            "kosher_use": "dairy",
            "never_mixed": True,
        },
    }

    response = requests.post(
        f"{BASE_URL}/listings",
        headers={"Content-Type": "application/json"},
        data=json.dumps(listing_data),
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created appliance listing ID: {data.get('data', {}).get('id')}")
    else:
        print(f"Error: {response.text}")
    print()


def test_get_listing(listing_id):
    """Test getting a specific listing."""
    if not listing_id:
        return

    print(f"Testing get listing endpoint for ID: {listing_id}")
    response = requests.get(f"{BASE_URL}/listings/{listing_id}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        listing = data.get("data", {})
        print(f"Title: {listing.get('title')}")
        print(f"Kind: {listing.get('kind')}")
        print(f"Price: ${listing.get('price_cents', 0) / 100}")
        print(f"Condition: {listing.get('condition')}")
    else:
        print(f"Error: {response.text}")
    print()


def test_filter_by_kind():
    """Test filtering by kind."""
    print("Testing filter by kind (regular)...")
    response = requests.get(f"{BASE_URL}/listings?kind=regular")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        listings = data.get("data", {}).get("listings", [])
        print(f"Regular listings: {len(listings)}")
        for listing in listings[:2]:
            print(f"  - {listing.get('title')} ({listing.get('kind')})")
    else:
        print(f"Error: {response.text}")
    print()


if __name__ == "__main__":
    print("🚀 Testing Streamlined Marketplace API")
    print("=" * 50)

    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(3)

    test_categories()
    test_listings()

    # Test creating listings
    regular_id = test_create_regular_listing()
    test_create_vehicle_listing()
    test_create_appliance_listing()

    # Test getting a specific listing
    test_get_listing(regular_id)

    # Test filtering
    test_filter_by_kind()

    print("✅ Testing completed!")
