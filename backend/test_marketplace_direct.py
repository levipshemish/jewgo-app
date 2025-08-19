#!/usr/bin/env python3
"""Direct test of marketplace table access."""

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()

def test_marketplace_direct():
    """Test direct access to marketplace table."""
    
    database_url = 'postgresql://neondb_owner:npg_75MGzUgStfuO@ep-snowy-firefly-aeeo0tbc-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🧪 Testing direct marketplace table access...")
        
        # Test simple query
        cursor.execute("SELECT COUNT(*) as count FROM marketplace WHERE status = 'active'")
        result = cursor.fetchone()
        print(f"✅ Active marketplace items: {result['count']}")
        
        # Test detailed query
        cursor.execute("""
            SELECT id, title, price, category, vendor_name, status 
            FROM marketplace 
            WHERE status = 'active' 
            LIMIT 3
        """)
        items = cursor.fetchall()
        
        print(f"📋 Sample items:")
        for item in items:
            print(f"  ID: {item['id']}")
            print(f"  Title: {item['title']}")
            print(f"  Price: ${item['price']}")
            print(f"  Category: {item['category']}")
            print(f"  Vendor: {item['vendor_name']}")
            print(f"  Status: {item['status']}")
            print("  ---")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_marketplace_direct()
