#!/usr/bin/env python3
"""Check current data status in the database."""

import psycopg2
import os

# Database connection
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"

def check_data_status():
    """Check the current status of data in the database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get total restaurants
        cursor.execute('SELECT COUNT(*) FROM restaurants')
        total = cursor.fetchone()[0]
        
        # Get active restaurants
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE status = 'active'")
        active = cursor.fetchone()[0]
        
        # Get restaurants with business types
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE business_types IS NOT NULL AND business_types != ''")
        business_types = cursor.fetchone()[0]
        
        # Get restaurants with review snippets
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE review_snippets IS NOT NULL AND review_snippets != ''")
        review_snippets = cursor.fetchone()[0]
        
        # Get restaurants with Google reviews
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE google_reviews IS NOT NULL AND google_reviews != ''")
        google_reviews = cursor.fetchone()[0]
        
        # Get sample data
        cursor.execute('SELECT id, name, business_types, review_snippets FROM restaurants LIMIT 3')
        samples = cursor.fetchall()
        
        # Log data status
        print("📊 CURRENT DATA STATUS:")
        print("=" * 50)
        print(f"Total Restaurants: {total}")
        print(f"Active Restaurants: {active}")
        print(f"With Business Types: {business_types}")
        print(f"With Review Snippets: {review_snippets}")
        print(f"With Google Reviews: {google_reviews}")
        
        print("\n🔍 SAMPLE DATA:")
        print("=" * 50)
        for row in samples:
            print(f"ID: {row[0]}, Name: {row[1]}")
            print(f"  Business Types: {row[2] or 'None'}")
            print(f"  Review Snippets: {row[3][:100] + '...' if row[3] and len(row[3]) > 100 else row[3] or 'None'}")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        # Log error for debugging

if __name__ == "__main__":
    check_data_status()
