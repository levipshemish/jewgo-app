#!/usr/bin/env python3
"""Test marketplace service creation and database connection."""

import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables
load_dotenv()

def test_marketplace_service():
    """Test marketplace service creation and basic functionality."""
    
    try:
        print("🔍 Testing marketplace service creation...")
        
        # Import required modules
        from services.marketplace_service_v4 import MarketplaceServiceV4
        from database.database_manager_v3 import DatabaseManagerV3
        from utils.unified_database_config import ConfigManager
        
        # Create database manager
        print("📊 Creating database manager...")
        db_manager = DatabaseManagerV3()
        
        # Create config manager
        print("⚙️ Creating config manager...")
        config = ConfigManager()
        
        # Create marketplace service
        print("🛍️ Creating marketplace service...")
        service = MarketplaceServiceV4(db_manager=db_manager, cache_manager=None, config=config)
        
        if service:
            print("✅ Marketplace service created successfully!")
            
            # Test basic database connection
            print("🔗 Testing database connection...")
            try:
                with db_manager.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT COUNT(*) FROM marketplace")
                        count = cursor.fetchone()[0]
                        print(f"✅ Database connection successful! Found {count} marketplace items")
                        
                        # Test service query
                        print("🔍 Testing service query...")
                        result = service.get_listings(limit=5)
                        
                        if result["success"]:
                            print(f"✅ Service query successful! Found {len(result['data']['listings'])} listings")
                            for listing in result['data']['listings'][:2]:
                                print(f"  - {listing['title']} (${listing['price_cents']/100:.2f})")
                        else:
                            print(f"❌ Service query failed: {result.get('error', 'Unknown error')}")
                            
            except Exception as e:
                print(f"❌ Database connection failed: {e}")
                
        else:
            print("❌ Failed to create marketplace service")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_marketplace_service()
