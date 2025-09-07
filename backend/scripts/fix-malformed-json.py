#!/usr/bin/env python3
"""
Script to investigate and fix malformed JSON in the google_reviews field
"""

import psycopg2
import json
import re
import sys
from typing import List, Dict, Any, Optional

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'database': 'app_db',
    'user': 'app_user',
    'password': 'Jewgo123',
    'port': 5432
}

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def investigate_malformed_json(conn):
    """Investigate malformed JSON in google_reviews field"""
    cursor = conn.cursor()
    
    print("🔍 Investigating malformed JSON in google_reviews field...")
    
    # Get all records with google_reviews data
    cursor.execute("""
        SELECT id, name, google_reviews, 
               LENGTH(google_reviews) as review_length,
               LEFT(google_reviews, 50) as review_preview
        FROM restaurants 
        WHERE google_reviews IS NOT NULL 
        AND google_reviews != ''
        ORDER BY id
    """)
    
    records = cursor.fetchall()
    print(f"Found {len(records)} records with google_reviews data")
    
    malformed_count = 0
    malformed_examples = []
    
    for record in records:
        restaurant_id, name, google_reviews, length, preview = record
        
        try:
            # Try to parse the JSON
            json.loads(google_reviews)
            print(f"✅ {name} (ID: {restaurant_id}) - Valid JSON ({length} chars)")
        except json.JSONDecodeError as e:
            malformed_count += 1
            print(f"❌ {name} (ID: {restaurant_id}) - Malformed JSON: {e}")
            print(f"   Preview: {preview}...")
            print(f"   Length: {length} chars")
            
            # Store example for analysis
            if len(malformed_examples) < 10:  # Keep first 10 examples
                malformed_examples.append({
                    'id': restaurant_id,
                    'name': name,
                    'google_reviews': google_reviews,
                    'error': str(e),
                    'preview': preview
                })
    
    print(f"\n📊 Summary:")
    print(f"   Total records with google_reviews: {len(records)}")
    print(f"   Malformed JSON records: {malformed_count}")
    print(f"   Valid JSON records: {len(records) - malformed_count}")
    
    return malformed_examples

def analyze_malformed_patterns(malformed_examples: List[Dict]):
    """Analyze patterns in malformed JSON"""
    print("\n🔬 Analyzing malformed JSON patterns...")
    
    patterns = {
        'double_quoted': 0,
        'missing_quotes': 0,
        'extra_characters': 0,
        'incomplete_json': 0,
        'html_entities': 0,
        'other': 0
    }
    
    for example in malformed_examples:
        google_reviews = example['google_reviews']
        
        # Check for common patterns
        if google_reviews.startswith('"') and google_reviews.endswith('"'):
            patterns['double_quoted'] += 1
            print(f"   Double-quoted JSON: {example['name']} (ID: {example['id']})")
        elif '"' not in google_reviews:
            patterns['missing_quotes'] += 1
            print(f"   Missing quotes: {example['name']} (ID: {example['id']})")
        elif '<' in google_reviews or '&' in google_reviews:
            patterns['html_entities'] += 1
            print(f"   HTML entities: {example['name']} (ID: {example['id']})")
        elif not google_reviews.endswith('}') and not google_reviews.endswith(']'):
            patterns['incomplete_json'] += 1
            print(f"   Incomplete JSON: {example['name']} (ID: {example['id']})")
        else:
            patterns['other'] += 1
            print(f"   Other pattern: {example['name']} (ID: {example['id']})")
    
    print(f"\n📈 Pattern Analysis:")
    for pattern, count in patterns.items():
        if count > 0:
            print(f"   {pattern}: {count} records")
    
    return patterns

def fix_double_quoted_json(conn, restaurant_id: int, google_reviews: str) -> bool:
    """Fix double-quoted JSON by unescaping it"""
    try:
        # Remove outer quotes and unescape
        fixed_json = json.loads(google_reviews)
        fixed_json_str = json.dumps(fixed_json)
        
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE restaurants 
            SET google_reviews = %s 
            WHERE id = %s
        """, (fixed_json_str, restaurant_id))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"   Failed to fix double-quoted JSON for ID {restaurant_id}: {e}")
        return False

def fix_html_entities(conn, restaurant_id: int, google_reviews: str) -> bool:
    """Fix HTML entities in JSON"""
    try:
        import html
        
        # Decode HTML entities
        decoded = html.unescape(google_reviews)
        
        # Try to parse the decoded JSON
        json.loads(decoded)
        
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE restaurants 
            SET google_reviews = %s 
            WHERE id = %s
        """, (decoded, restaurant_id))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"   Failed to fix HTML entities for ID {restaurant_id}: {e}")
        return False

def fix_missing_quotes(conn, restaurant_id: int, google_reviews: str) -> bool:
    """Attempt to fix JSON with missing quotes"""
    try:
        # This is more complex - try to add quotes around unquoted keys
        # This is a basic attempt and might not work for all cases
        
        # Try to fix common patterns
        fixed = google_reviews
        
        # Add quotes around unquoted keys (basic pattern)
        fixed = re.sub(r'(\w+):', r'"\1":', fixed)
        
        # Try to parse
        json.loads(fixed)
        
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE restaurants 
            SET google_reviews = %s 
            WHERE id = %s
        """, (fixed, restaurant_id))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"   Failed to fix missing quotes for ID {restaurant_id}: {e}")
        return False

def fix_malformed_json(conn, malformed_examples: List[Dict]):
    """Attempt to fix malformed JSON records"""
    print("\n🔧 Attempting to fix malformed JSON records...")
    
    fixed_count = 0
    failed_count = 0
    
    for example in malformed_examples:
        restaurant_id = example['id']
        name = example['name']
        google_reviews = example['google_reviews']
        
        print(f"\n🔧 Fixing {name} (ID: {restaurant_id})...")
        
        success = False
        
        # Try different fix strategies based on the pattern
        if google_reviews.startswith('"') and google_reviews.endswith('"'):
            print("   Trying double-quoted JSON fix...")
            success = fix_double_quoted_json(conn, restaurant_id, google_reviews)
        elif '<' in google_reviews or '&' in google_reviews:
            print("   Trying HTML entities fix...")
            success = fix_html_entities(conn, restaurant_id, google_reviews)
        elif '"' not in google_reviews:
            print("   Trying missing quotes fix...")
            success = fix_missing_quotes(conn, restaurant_id, google_reviews)
        
        if success:
            print(f"   ✅ Successfully fixed {name}")
            fixed_count += 1
        else:
            print(f"   ❌ Failed to fix {name}")
            failed_count += 1
    
    print(f"\n📊 Fix Results:")
    print(f"   Successfully fixed: {fixed_count}")
    print(f"   Failed to fix: {failed_count}")
    
    return fixed_count, failed_count

def verify_fixes(conn):
    """Verify that the fixes worked"""
    print("\n✅ Verifying fixes...")
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) 
        FROM restaurants 
        WHERE google_reviews IS NOT NULL 
        AND google_reviews != ''
    """)
    
    total_records = cursor.fetchone()[0]
    
    # Check how many are now valid JSON
    cursor.execute("""
        SELECT id, name, google_reviews
        FROM restaurants 
        WHERE google_reviews IS NOT NULL 
        AND google_reviews != ''
    """)
    
    records = cursor.fetchall()
    valid_count = 0
    
    for record in records:
        try:
            json.loads(record[2])
            valid_count += 1
        except json.JSONDecodeError:
            pass
    
    print(f"   Total records with google_reviews: {total_records}")
    print(f"   Valid JSON records: {valid_count}")
    print(f"   Malformed JSON records: {total_records - valid_count}")
    
    if total_records - valid_count == 0:
        print("   🎉 All JSON records are now valid!")
    else:
        print(f"   ⚠️  Still have {total_records - valid_count} malformed records")

def main():
    """Main function"""
    print("🚀 Starting JSON investigation and fix process...")
    
    # Connect to database
    conn = connect_to_db()
    
    try:
        # Investigate malformed JSON
        malformed_examples = investigate_malformed_json(conn)
        
        if not malformed_examples:
            print("🎉 No malformed JSON found!")
            return
        
        # Analyze patterns
        patterns = analyze_malformed_patterns(malformed_examples)
        
        # Ask for confirmation before fixing
        print(f"\n⚠️  Found {len(malformed_examples)} malformed JSON records.")
        response = input("Do you want to attempt to fix them? (y/N): ")
        
        if response.lower() != 'y':
            print("Skipping fixes.")
            return
        
        # Attempt to fix malformed JSON
        fixed_count, failed_count = fix_malformed_json(conn, malformed_examples)
        
        # Verify fixes
        verify_fixes(conn)
        
    finally:
        conn.close()
        print("\n🔚 Database connection closed.")

if __name__ == "__main__":
    main()
