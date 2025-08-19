#!/usr/bin/env python3
"""Minimal test to check marketplace table direct access."""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_minimal_marketplace():
    """Test minimal marketplace table access."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print('❌ DATABASE_URL not found')
        return False

    # Convert SQLAlchemy URL to psycopg2 format
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')

    try:
        print("🔍 Testing minimal marketplace access...")
        
        # Connect directly
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Test the exact query the service should run
        cursor.execute("""
            SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code, 
                   m.latitude, m.longitude, m.vendor_name, m.vendor_phone, m.vendor_email,
                   m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale, 
                   m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at, 
                   m.updated_at, m.category, m.subcategory
            FROM marketplace m
            WHERE m.status = %s
            ORDER BY m.created_at DESC LIMIT %s OFFSET %s
        """, ['active', 5, 0])
        
        results = cursor.fetchall()
        print(f"✅ Query successful! Found {len(results)} results")
        
        if results:
            print("📝 First result:")
            result = results[0]
            print(f"  ID: {result['id']}")
            print(f"  Title: {result['title']}")
            print(f"  Price: ${result['price']}")
            print(f"  Category: {result['category']}")
            print(f"  Status: {result['status']}")
        
        # Test count query
        cursor.execute("SELECT COUNT(*) as total FROM marketplace m WHERE m.status = %s", ['active'])
        total = cursor.fetchone()['total']
        print(f"📊 Total active listings: {total}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_minimal_marketplace()