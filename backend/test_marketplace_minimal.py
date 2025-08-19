#!/usr/bin/env python3
"""Minimal test that simulates the marketplace service database query."""

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

def test_marketplace_minimal():
    """Test the exact query that the marketplace service uses."""
    
    database_url = 'postgresql://neondb_owner:npg_75MGzUgStfuO@ep-snowy-firefly-aeeo0tbc-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("🧪 Testing marketplace service query...")
        
        # Test the exact query from the marketplace service
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
        
        print(f"🔍 Executing query with params: {params}")
        cursor.execute(query, params)
        listings = cursor.fetchall()
        
        print(f"✅ Query executed successfully")
        print(f"📊 Listings returned: {len(listings)}")
        
        if listings:
            print(f"📝 Sample listing data:")
            listing = listings[0]
            print(f"  ID: {listing[0]}")
            print(f"  Title: {listing[1]}")
            print(f"  Price: {listing[3]}")
            print(f"  Category: {listing[26]}")
            print(f"  Status: {listing[23]}")
        
        # Test count query
        count_query = """
            SELECT COUNT(*) as total FROM marketplace m 
            WHERE m.status = %s
        """
        count_params = ['active']
        
        cursor.execute(count_query, count_params)
        total = cursor.fetchone()[0]
        print(f"📊 Total count: {total}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_marketplace_minimal()
