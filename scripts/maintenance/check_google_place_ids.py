#!/usr/bin/env python3
"""Check google_place_id status in restaurants."""

import psycopg2

# Database connection
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"

def check_google_place_ids():
    """Check google_place_id status."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get total restaurants
        cursor.execute('SELECT COUNT(*) FROM restaurants')
        total = cursor.fetchone()[0]
        
        # Get restaurants with google_place_id
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE google_place_id IS NOT NULL")
        with_place_id = cursor.fetchone()[0]
        
        # Get restaurants without google_place_id
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE google_place_id IS NULL")
        without_place_id = cursor.fetchone()[0]
        
        # Get restaurants that need enhancement
        cursor.execute("""
            SELECT COUNT(*) FROM restaurants
            WHERE google_place_id IS NOT NULL
            AND (
                business_types IS NULL 
                OR business_types = ''
                OR review_snippets IS NULL 
                OR review_snippets = ''
            )
        """)
        need_enhancement = cursor.fetchone()[0]
        
        print("🔍 GOOGLE PLACE ID STATUS:")
        print("=" * 50)
        print(f"Total Restaurants: {total}")
        print(f"With Google Place ID: {with_place_id}")
        print(f"Without Google Place ID: {without_place_id}")
        print(f"Need Enhancement: {need_enhancement}")
        
        # Get sample restaurants with google_place_id
        cursor.execute("""
            SELECT id, name, google_place_id, business_types, review_snippets 
            FROM restaurants 
            WHERE google_place_id IS NOT NULL 
            LIMIT 5
        """)
        
        samples = cursor.fetchall()
        
        print(f"\n📋 SAMPLE RESTAURANTS WITH GOOGLE PLACE ID:")
        print("=" * 50)
        for row in samples:
            print(f"ID: {row[0]}, Name: {row[1]}")
            print(f"  Google Place ID: {row[2]}")
            print(f"  Business Types: {row[3] or 'None'}")
            print(f"  Review Snippets: {row[4][:50] + '...' if row[4] and len(row[4]) > 50 else row[4] or 'None'}")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_google_place_ids()
