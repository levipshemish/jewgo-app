#!/usr/bin/env python3
"""Test enhancement script with a single restaurant."""

import psycopg2
import requests
import json
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"
GOOGLE_API_KEY = "AIzaSyCl7r"

def test_single_enhancement():
    """Test enhancing a single restaurant."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get a restaurant with google_place_id
        cursor.execute("""
            SELECT id, name, google_place_id 
            FROM restaurants 
            WHERE google_place_id IS NOT NULL 
            AND (business_types IS NULL OR business_types = '')
            LIMIT 1
        """)
        
        restaurant = cursor.fetchone()
        if not restaurant:
            print("No restaurants found to test")
            return
        
        restaurant_id, restaurant_name, google_place_id = restaurant
        print(f"Testing with: {restaurant_name} (ID: {restaurant_id})")
        print(f"Google Place ID: {google_place_id}")
        
        # Get place details from Google
        params = {
            'place_id': google_place_id,
            'key': GOOGLE_API_KEY,
            'fields': 'types,reviews'
        }
        
        response = requests.get('https://maps.googleapis.com/maps/api/place/details/json', params=params, timeout=10)
        data = response.json()
        
        if data['status'] == 'OK' and data['result']:
            place_data = data['result']
            
            # Extract business type
            google_types = place_data.get('types', [])
            business_type = 'restaurant'  # Default
            if 'bakery' in [t.lower() for t in google_types]:
                business_type = 'bakery'
            elif 'cafe' in [t.lower() for t in google_types]:
                business_type = 'cafe'
            
            # Extract review snippets
            reviews = place_data.get('reviews', [])
            review_snippets = None
            if reviews:
                snippets = []
                for review in reviews[:3]:
                    snippet = {
                        'author': review.get('author_name', 'Anonymous'),
                        'rating': review.get('rating', 0),
                        'text': review.get('text', '')[:150] + '...' if len(review.get('text', '')) > 150 else review.get('text', ''),
                        'time': review.get('time', 0)
                    }
                    snippets.append(snippet)
                review_snippets = json.dumps(snippets)
            
            if review_snippets is None:
                review_snippets = ''
            
            print(f"Business Type: {business_type}")
            print(f"Review Snippets: {review_snippets[:100]}...")
            
            # Update the database
            cursor.execute("""
                UPDATE restaurants 
                SET business_types = %s, review_snippets = %s, updated_at = NOW()
                WHERE id = %s
            """, (business_type, review_snippets, restaurant_id))
            
            conn.commit()
            print("✅ Data updated successfully!")
            
            # Verify the update
            cursor.execute("""
                SELECT business_types, review_snippets 
                FROM restaurants 
                WHERE id = %s
            """, (restaurant_id,))
            
            result = cursor.fetchone()
            if result:
                print(f"Verified - Business Types: {result[0]}")
                print(f"Verified - Review Snippets: {result[1][:100] if result[1] else 'None'}...")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_single_enhancement()
