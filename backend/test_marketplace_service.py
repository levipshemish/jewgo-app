#!/usr/bin/env python3
"""Test the updated marketplace service."""

from dotenv import load_dotenv
from services.marketplace_service_v4 import MarketplaceServiceV4
from database.database_manager_v3 import DatabaseManagerV3

# Load environment variables
load_dotenv()

def test_marketplace_service():
    """Test the marketplace service with the marketplace table."""
    
    try:
        # Initialize service
        db_manager = DatabaseManagerV3()
        service = MarketplaceServiceV4(db_manager=db_manager)
        
        print("🧪 Testing marketplace service...")
        
        # Test the service
        result = service.get_listings(limit=5)
        
        print(f"✅ Success: {result['success']}")
        
        if result['success']:
            data = result['data']
            print(f"📊 Total listings: {data['total']}")
            print(f"📋 Listings returned: {len(data['listings'])}")
            
            if data['listings']:
                print("\n📝 Sample listing:")
                listing = data['listings'][0]
                print(f"  ID: {listing['id']}")
                print(f"  Title: {listing['title']}")
                print(f"  Price: ${listing['price_cents']/100:.2f}")
                print(f"  Category: {listing['category_name']}")
                print(f"  Seller: {listing['seller_name']}")
                print(f"  Status: {listing['status']}")
        else:
            print(f"❌ Error: {result['error']}")
            if 'details' in result:
                print(f"📋 Details: {result['details']}")
                
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_marketplace_service()
