#!/usr/bin/env python3
"""Test marketplace table directly."""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_marketplace_table():
    """Test marketplace table structure and data."""
    
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
        
        print("🔍 Testing marketplace table...")
        
        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'marketplace' 
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        print("📋 Marketplace table columns:")
        for col in columns:
            print(f"  {col['column_name']}: {col['data_type']} ({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")
        
        # Check if table has data
        cursor.execute('SELECT COUNT(*) as count FROM marketplace')
        count = cursor.fetchone()['count']
        print(f"\n📊 Total marketplace items: {count}")
        
        if count > 0:
            # Show sample data
            cursor.execute('SELECT id, title, price, category, status, created_at FROM marketplace LIMIT 3')
            sample_data = cursor.fetchall()
            print('📝 Sample marketplace items:')
            for item in sample_data:
                print(f"  ID: {item['id']}")
                print(f"  Title: {item['title']}")
                print(f"  Price: ${item['price']}")
                print(f"  Category: {item['category']}")
                print(f"  Status: {item['status']}")
                print(f"  Created: {item['created_at']}")
                print('  ---')
        
        # Test the exact query from the service
        print("\n🔍 Testing service query...")
        try:
            cursor.execute("""
                SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code, 
                       m.latitude, m.longitude, m.vendor_name, m.vendor_phone, m.vendor_email,
                       m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale, 
                       m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at, 
                       m.updated_at, m.category, m.subcategory
                FROM marketplace m
                WHERE m.status = 'active'
                ORDER BY m.created_at DESC LIMIT 5
            """)
            results = cursor.fetchall()
            print(f"✅ Query successful! Found {len(results)} results")
            
            if results:
                print("📝 First result:")
                result = results[0]
                print(f"  ID: {result['id']}")
                print(f"  Title: {result['title']}")
                print(f"  Price: ${result['price']}")
                print(f"  Category: {result['category']}")
                print(f"  Vendor: {result['vendor_name']}")
                
        except Exception as e:
            print(f"❌ Query failed: {e}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f'❌ Database error: {e}')
        return False

if __name__ == "__main__":
    test_marketplace_table()
