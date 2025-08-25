#!/usr/bin/env python3
"""Test script to verify marketplace image functionality."""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_marketplace_service():
    """Test the marketplace service to see if it returns image data."""
    try:
        from services.marketplace_service_v4 import MarketplaceServiceV4
        from database.database_manager_v3 import DatabaseManagerV3
        
        print("✅ Successfully imported marketplace service")
        
        # Create database manager
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables")
            return False
            
        db_manager = DatabaseManagerV3(database_url)
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return False
            
        print("✅ Successfully connected to database")
        
        # Create marketplace service
        service = MarketplaceServiceV4(db_manager=db_manager)
        print("✅ Successfully created marketplace service")
        
        # Test getting listings
        result = service.get_listings(limit=5, offset=0)
        
        if result.get("success"):
            listings = result.get("data", {}).get("listings", [])
            print(f"✅ Found {len(listings)} marketplace listings")
            
            for i, listing in enumerate(listings):
                print(f"\n📦 Listing {i+1}: {listing.get('title', 'No title')}")
                print(f"   Images: {listing.get('images', [])}")
                print(f"   Thumbnail: {listing.get('thumbnail', 'No thumbnail')}")
                
                # Check if images are present
                images = listing.get('images', [])
                if images and len(images) > 0:
                    print(f"   ✅ Has {len(images)} image(s)")
                else:
                    print(f"   ❌ No images found")
        else:
            print(f"❌ Failed to get listings: {result.get('error', 'Unknown error')}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error testing marketplace service: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing Marketplace Image Functionality")
    print("=" * 50)
    
    success = test_marketplace_service()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Marketplace image test completed successfully")
    else:
        print("❌ Marketplace image test failed")
