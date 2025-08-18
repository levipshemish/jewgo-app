#!/usr/bin/env python3
"""Check if business_types and review_snippets columns exist."""

import psycopg2

# Database connection
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"

def check_columns():
    """Check if the required columns exist."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check if columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name IN ('business_types', 'review_snippets')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        print("🔍 COLUMN CHECK:")
        print("=" * 50)
        print(f"business_types column exists: {'business_types' in existing_columns}")
        print(f"review_snippets column exists: {'review_snippets' in existing_columns}")
        
        # Get all columns in restaurants table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants'
            ORDER BY ordinal_position
        """)
        
        all_columns = [row[0] for row in cursor.fetchall()]
        
        print(f"\n📋 ALL COLUMNS IN RESTAURANTS TABLE ({len(all_columns)} total):")
        print("=" * 50)
        for i, col in enumerate(all_columns, 1):
            print(f"{i:2d}. {col}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
