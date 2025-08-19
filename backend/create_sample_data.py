#!/usr/bin/env python3
"""Create sample data for the streamlined marketplace."""

import requests
import json

BASE_URL = "http://localhost:5001/api/v4/marketplace"

def create_sample_categories():
    """Create sample categories via direct database insertion."""
    print("📂 Creating sample categories...")
    
    # For now, we'll create listings which will work with whatever categories exist
    # The migration should have already created categories
    pass

def create_sample_listings():
    """Create sample listings for testing."""
    print("📦 Creating sample listings...")
    
    # Sample regular item
    regular_listing = {
        "title": "Vintage Judaica Book Collection",
        "kind": "regular",
        "category_id": 1,  # Assuming category 1 exists
        "price_cents": 5000,  # $50.00
        "condition": "used_good",
        "description": "Beautiful collection of vintage Judaica books in excellent condition. Perfect for collectors or those starting their Jewish library.",
        "city": "Brooklyn",
        "region": "NY",
        "zip": "11230",
        "attributes": {
            "brand": "Various Publishers",
            "size": "Standard",
            "color": "Brown/Gold",
            "material": "Leather bound"
        }
    }
    
    # Sample vehicle listing
    vehicle_listing = {
        "title": "2018 Toyota Camry LE - Kosher Family Car",
        "kind": "vehicle",
        "category_id": 1,
        "price_cents": 1380000,  # $13,800.00
        "condition": "used_good",
        "description": "Well-maintained family car, perfect for the kosher community. Non-smoking, highway miles, excellent maintenance records.",
        "city": "Lakewood",
        "region": "NJ",
        "zip": "08701",
        "attributes": {
            "vehicle_type": "car",
            "make": "Toyota",
            "model": "Camry",
            "year": 2018,
            "mileage": 72000,
            "transmission": "automatic",
            "fuel_type": "gasoline",
            "color": "Silver",
            "title_status": "clear"
        }
    }
    
    # Sample appliance listing
    appliance_listing = {
        "title": "KitchenAid Stand Mixer - Dairy Kitchen",
        "kind": "appliance",
        "category_id": 1,
        "price_cents": 25000,  # $250.00
        "condition": "used_like_new",
        "description": "Barely used KitchenAid stand mixer from our dairy kitchen. Excellent condition, all attachments included.",
        "city": "Monsey",
        "region": "NY",
        "zip": "10952",
        "attributes": {
            "appliance_type": "other",
            "kosher_use": "dairy",
            "brand": "KitchenAid",
            "model_number": "KSM150PSER",
            "energy_rating": "N/A",
            "warranty_remaining": "1 year",
            "installation_required": False
        }
    }
    
    # Free appliance listing
    free_appliance = {
        "title": "Free Microwave - Meat Kitchen",
        "kind": "appliance",
        "category_id": 1,
        "price_cents": 0,  # Free
        "condition": "used_fair",
        "description": "Giving away microwave from our meat kitchen. Works perfectly, just upgraded to a newer model.",
        "city": "Five Towns",
        "region": "NY",
        "zip": "11516",
        "attributes": {
            "appliance_type": "microwave",
            "kosher_use": "meat",
            "brand": "Panasonic",
            "model_number": "NN-SN966S",
            "energy_rating": "Energy Star",
            "warranty_remaining": "Expired",
            "installation_required": False
        }
    }
    
    # Create listings
    listings = [regular_listing, vehicle_listing, appliance_listing, free_appliance]
    
    for i, listing in enumerate(listings):
        try:
            print(f"Creating listing {i+1}: {listing['title']}")
            response = requests.post(f"{BASE_URL}/listings", json=listing, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"✅ Created listing: {listing['title']}")
                else:
                    print(f"❌ Failed to create listing: {data.get('error', 'Unknown error')}")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating listing {i+1}: {e}")

def test_api_endpoints():
    """Test that the API endpoints are working."""
    print("🧪 Testing API endpoints...")
    
    try:
        # Test categories
        print("Testing categories endpoint...")
        response = requests.get(f"{BASE_URL}/categories", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Categories: {len(data.get('data', []))} found")
        else:
            print(f"❌ Categories failed: {response.status_code}")
    
        # Test listings
        print("Testing listings endpoint...")
        response = requests.get(f"{BASE_URL}/listings", timeout=10)
        if response.status_code == 200:
            data = response.json()
            listings_count = len(data.get('data', {}).get('listings', []))
            print(f"✅ Listings: {listings_count} found")
        else:
            print(f"❌ Listings failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing endpoints: {e}")

def main():
    """Main function to create sample data."""
    print("🚀 Creating sample data for streamlined marketplace")
    print("=" * 60)
    
    # Wait for server to be ready
    print("⏳ Waiting for server to be ready...")
    import time
    time.sleep(5)
    
    # Test endpoints first
    test_api_endpoints()
    
    print("\n" + "=" * 60)
    
    # Create sample data
    create_sample_categories()
    create_sample_listings()
    
    print("\n" + "=" * 60)
    print("✅ Sample data creation complete!")
    print("You can now view the marketplace at: http://localhost:3000/marketplace")

if __name__ == "__main__":
    main()
