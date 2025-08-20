#!/usr/bin/env python3
"""Test marketplace query directly."""

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

def test_marketplace_query():
    """Test the marketplace query directly."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print('❌ DATABASE_URL not found in environment')
        return False

    # Convert SQLAlchemy URL to psycopg2 format
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 Testing marketplace query...")
        
        # Test the exact query from the service
        query = """
            SELECT m.id, m.title, m.description, m.price_cents, m.currency, m.city, m.region, m.zip, 
                   m.lat, m.lng, m.seller_user_id, m.type, m.condition,
                   m.category_id, m.subcategory_id, m.status, m.created_at, m.updated_at
            FROM "Marketplace listings" m
            WHERE m.status = %s
            ORDER BY m.created_at DESC LIMIT %s OFFSET %s
        """
        
        params = ('active', 5, 0)
        
        print(f"🔍 Executing query with params: {params}")
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        print(f"📊 Found {len(results)} results")
        
        if results:
            print("📝 Sample results:")
            for i, result in enumerate(results[:3]):
                print(f"  Result {i+1}:")
                print(f"    ID: {result['id']}")
                print(f"    Title: {result['title']}")
                print(f"    Price: ${result['price_cents']/100:.2f}")
                print(f"    Status: {result['status']}")
                print("    ---")
        else:
            print("⚠️  No results found")
            
            # Let's check what's in the table
            cursor.execute('SELECT COUNT(*) as count FROM "Marketplace listings"')
            total = cursor.fetchone()['count']
            print(f"📊 Total items in table: {total}")
            
            if total > 0:
                cursor.execute('SELECT id, title, status FROM "Marketplace listings" LIMIT 3')
                items = cursor.fetchall()
                print("📝 Sample items:")
                for item in items:
                    print(f"  ID: {item['id']}")
                    print(f"  Title: {item['title']}")
                    print(f"  Status: {item['status']}")
                    print("  ---")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f'❌ Database error: {e}')
        return False

if __name__ == "__main__":
    test_marketplace_query()
