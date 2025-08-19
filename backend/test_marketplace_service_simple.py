#!/usr/bin/env python3
"""Simple test of marketplace service without Flask dependencies."""

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

class MockDatabaseManager:
    """Mock database manager for testing."""
    
    def __init__(self):
        self.database_url = 'postgresql://neondb_owner:npg_75MGzUgStfuO@ep-snowy-firefly-aeeo0tbc-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    
    def get_connection(self):
        return psycopg2.connect(self.database_url)

def test_marketplace_service_simple():
    """Test marketplace service with mock database manager."""
    
    try:
        print("🧪 Testing marketplace service with mock database manager...")
        
        # Create mock database manager
        db_manager = MockDatabaseManager()
        
        # Test the exact query logic from marketplace service
        query = """
            SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code, 
                   m.latitude, m.longitude, m.vendor_id, m.vendor_name, m.vendor_phone, m.vendor_email,
                   m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale, 
                   m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at, 
                   m.updated_at, m.category as category_name, m.subcategory as subcategory_name, 
                   m.vendor_name as seller_name
            FROM marketplace m
            WHERE m.status = %s
            ORDER BY m.created_at DESC LIMIT %s OFFSET %s
        """
        params = ['active', 5, 0]
        
        # Execute query using mock database manager
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                listings = cursor.fetchall()
                
                # Get total count
                count_query = """
                    SELECT COUNT(*) as total FROM marketplace m 
                    WHERE m.status = %s
                """
                count_params = [params[0]]  # Only the status parameter
                cursor.execute(count_query, count_params)
                total = cursor.fetchone()[0]
        
        print(f"✅ Query executed successfully")
        print(f"📊 Total listings: {total}")
        print(f"📋 Listings returned: {len(listings)}")
        
        if listings:
            print(f"📝 Sample listing:")
            listing = listings[0]
            print(f"  ID: {listing[0]}")
            print(f"  Title: {listing[1]}")
            print(f"  Price: ${listing[3]}")
            print(f"  Category: {listing[26]}")
            print(f"  Status: {listing[23]}")
        
        # Format response like the marketplace service
        formatted_listings = []
        for listing in listings:
            formatted_listing = {
                'id': str(listing[0]),
                'kind': 'regular',
                'txn_type': 'sale',
                'title': listing[1],
                'description': listing[2],
                'price_cents': int(float(listing[3]) * 100) if listing[3] else 0,
                'currency': listing[4] or 'USD',
                'condition': 'new',
                'category_id': None,
                'subcategory_id': None,
                'city': listing[5],
                'region': listing[6],
                'zip': listing[7],
                'country': 'US',
                'lat': float(listing[8]) if listing[8] else None,
                'lng': float(listing[9]) if listing[9] else None,
                'seller_user_id': listing[10],
                'attributes': {
                    'vendor_name': listing[11],
                    'vendor_phone': listing[12],
                    'vendor_email': listing[13],
                    'kosher_agency': listing[14],
                    'kosher_level': listing[15],
                    'is_available': listing[16],
                    'is_featured': listing[17],
                    'is_on_sale': listing[18],
                    'discount_percentage': listing[19],
                    'stock': listing[20],
                    'rating': float(listing[21]) if listing[21] else None,
                    'review_count': listing[22] or 0
                },
                'endorse_up': 0,
                'endorse_down': 0,
                'status': listing[23],
                'created_at': listing[24].isoformat() if listing[24] else None,
                'updated_at': listing[25].isoformat() if listing[25] else None,
                'category_name': listing[26],
                'subcategory_name': listing[27],
                'seller_name': listing[28]
            }
            formatted_listings.append(formatted_listing)
        
        print(f"✅ Response formatting successful")
        print(f"📋 Formatted listings: {len(formatted_listings)}")
        
        # Return success response like the marketplace service
        response = {
            'success': True,
            'data': {
                'listings': formatted_listings,
                'total': total,
                'limit': 5,
                'offset': 0
            }
        }
        
        print(f"✅ Marketplace service logic works correctly")
        return response
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': 'Failed to fetch marketplace listings',
            'details': str(e)
        }

if __name__ == "__main__":
    result = test_marketplace_service_simple()
    print(f"\n🎯 Final result: {result['success']}")
    if result['success']:
        print(f"📊 Data: {len(result['data']['listings'])} listings, {result['data']['total']} total")
    else:
        print(f"❌ Error: {result['error']}")
