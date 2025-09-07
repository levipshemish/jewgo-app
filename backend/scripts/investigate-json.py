#!/usr/bin/env python3
"""
Simple script to investigate malformed JSON in the google_reviews field
"""

import psycopg2
import json
import sys

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'app_db',
    'user': 'app_user',
    'password': 'Jewgo123',
    'port': 5432
}

def main():
    """Investigate malformed JSON"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔍 Investigating google_reviews JSON data...")
        
        # Get sample of records with google_reviews
        cursor.execute("""
            SELECT id, name, google_reviews, 
                   LENGTH(google_reviews) as review_length
            FROM restaurants 
            WHERE google_reviews IS NOT NULL 
            AND google_reviews != ''
            ORDER BY id
            LIMIT 20
        """)
        
        records = cursor.fetchall()
        print(f"Found {len(records)} records with google_reviews data (showing first 20)")
        
        malformed_count = 0
        
        for i, record in enumerate(records, 1):
            restaurant_id, name, google_reviews, length = record
            
            print(f"\n--- Record {i} ---")
            print(f"ID: {restaurant_id}")
            print(f"Name: {name}")
            print(f"Length: {length} characters")
            print(f"First 100 chars: {google_reviews[:100]}...")
            print(f"Last 50 chars: ...{google_reviews[-50:]}")
            
            try:
                # Try to parse the JSON
                parsed = json.loads(google_reviews)
                print(f"✅ Valid JSON - {len(parsed) if isinstance(parsed, list) else 'object'} items")
                
                # Show structure if it's a list
                if isinstance(parsed, list) and len(parsed) > 0:
                    first_item = parsed[0]
                    print(f"   First item keys: {list(first_item.keys()) if isinstance(first_item, dict) else 'not a dict'}")
                    
            except json.JSONDecodeError as e:
                malformed_count += 1
                print(f"❌ Malformed JSON: {e}")
                print(f"   Error position: {e.pos}")
                print(f"   Character at error: '{google_reviews[e.pos] if e.pos < len(google_reviews) else 'EOF'}'")
                
                # Show context around the error
                start = max(0, e.pos - 20)
                end = min(len(google_reviews), e.pos + 20)
                context = google_reviews[start:end]
                print(f"   Context: ...{context}...")
        
        print(f"\n📊 Summary:")
        print(f"   Total records checked: {len(records)}")
        print(f"   Malformed JSON: {malformed_count}")
        print(f"   Valid JSON: {len(records) - malformed_count}")
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) 
            FROM restaurants 
            WHERE google_reviews IS NOT NULL 
            AND google_reviews != ''
        """)
        total_count = cursor.fetchone()[0]
        print(f"   Total records with google_reviews: {total_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
