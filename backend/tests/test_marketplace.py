#!/usr/bin/env python3
"""Test script to verify marketplace functionality."""

import os
import sys
sys.path.append(os.path.dirname(__file__))

from services.marketplace_service_v4 import MarketplaceServiceV4
from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
from utils.cache_manager_v4 import CacheManagerV4
from utils.config_manager import ConfigManager

def test_marketplace_service():
    """Test the marketplace service functionality."""
    try:
        # Initialize dependencies
        db_manager = DatabaseManagerV4()
        cache_manager = CacheManagerV4(enable_cache=False)
        config = ConfigManager()
        
        # Create marketplace service
        service = MarketplaceServiceV4(
            db_manager=db_manager,
            cache_manager=cache_manager,
            config=config
        )
        
        print("✅ Marketplace service created successfully")
        
        # Test get_categories
        result = service.get_categories()
        print(f"Categories result: {result}")
        
        if result.get('success'):
            categories = result.get('data', [])
            print(f"Found {len(categories)} categories")
            for category in categories:
                print(f"  - {category['name']} ({category['slug']})")
        else:
            print(f"Error getting categories: {result.get('error')}")
        
        # Test get_listings
        result = service.get_listings(limit=5)
        print(f"Listings result: {result}")
        
        if result.get('success'):
            listings = result.get('data', {}).get('listings', [])
            print(f"Found {len(listings)} listings")
            for listing in listings:
                print(f"  - {listing['title']} ({listing['type']})")
        else:
            print(f"Error getting listings: {result.get('error')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing marketplace service: {e}")
        return False

if __name__ == "__main__":
    test_marketplace_service()
