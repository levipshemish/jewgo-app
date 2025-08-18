#!/usr/bin/env python3
"""Test manual data insertion for business types and review snippets."""

import psycopg2
import json

# Database connection
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"

def test_data_insert():
    """Test inserting data manually."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get first restaurant
        cursor.execute("SELECT id, name FROM restaurants LIMIT 1")
        restaurant = cursor.fetchone()
        
        if not restaurant:
            print("No restaurants found!")
            return
        
        restaurant_id, restaurant_name = restaurant
        
        # Test data
        business_type = "restaurant"
        review_snippets = json.dumps([
            {
                "author": "Test User",
                "rating": 5,
                "text": "Great food and service!",
                "time": 1234567890
            }
        ])
        
        print(f"Testing with restaurant: {restaurant_name} (ID: {restaurant_id})")
        
        # Update the restaurant
        cursor.execute("""
            UPDATE restaurants 
            SET business_types = %s, review_snippets = %s, updated_at = NOW()
            WHERE id = %s
        """, (business_type, review_snippets, restaurant_id))
        
        # Commit the transaction
        conn.commit()
        
        print("✅ Data inserted successfully!")
        
        # Verify the data was saved
        cursor.execute("""
            SELECT business_types, review_snippets 
            FROM restaurants 
            WHERE id = %s
        """, (restaurant_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"Verified - Business Types: {result[0]}")
            print(f"Verified - Review Snippets: {result[1][:100]}...")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_data_insert()
