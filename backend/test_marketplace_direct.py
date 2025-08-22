#!/usr/bin/env python3
"""
Direct Test of Marketplace Service
==================================

This script tests the marketplace service directly to debug the issue.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the current directory to the path so we can import the service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def get_database_url():
    """Get database URL from environment variables."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        # Try reading from .env file
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    
    if not db_url:
        print("❌ No database URL found")
        return None
    
    # Convert psycopg:// to postgresql:// for SQLAlchemy
    if db_url.startswith('postgresql+psycopg://'):
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    
    return db_url

def test_marketplace_service_direct():
    """Test the marketplace service directly."""
    try:
        # Import the service
        from services.marketplace_service_v4 import MarketplaceServiceV4
        print("✅ MarketplaceServiceV4 imported successfully")
        
        # Create a simple database manager mock
        class SimpleDBManager:
            def __init__(self, db_url):
                self.engine = create_engine(db_url)
            
            class ConnectionManager:
                def __init__(self, engine):
                    self.engine = engine
                
                def get_session_context(self):
                    return self.engine.connect()
            
            @property
            def connection_manager(self):
                return self.ConnectionManager(self.engine)
        
        # Get database URL
        db_url = get_database_url()
        if not db_url:
            return
        
        # Create simple database manager
        db_manager = SimpleDBManager(db_url)
        print("✅ Database manager created")
        
        # Create service
        service = MarketplaceServiceV4(db_manager=db_manager)
        print("✅ MarketplaceServiceV4 created")
        
        # Test the service
        result = service.get_listings(limit=5, offset=0, status="active")
        print(f"📊 Service result: {result}")
        
        if result.get('success') and result.get('data', {}).get('listings'):
            listings = result['data']['listings']
            print(f"✅ Found {len(listings)} listings:")
            for listing in listings:
                print(f"  - {listing.get('title')} (${listing.get('price_cents', 0)/100:.2f})")
        else:
            print("❌ No listings found in service response")
            
    except Exception as e:
        print(f"❌ Error testing marketplace service: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_marketplace_service_direct()
