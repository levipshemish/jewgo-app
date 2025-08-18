#!/usr/bin/env python3
"""Expand Google Places Integration for Restaurants."""

import os
import sys
import time
import json
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GooglePlacesExpander:
    def __init__(self, database_url: str, google_api_key: str):
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.places_search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        self.places_details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        
    def connect_db(self):
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_without_google_data(self, conn, limit: int = 20):
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT id, name, address, city, state, zip_code
            FROM restaurants
            WHERE google_place_id IS NULL
            ORDER BY city, name
            LIMIT %s
        """
        cursor.execute(query, (limit,))
        restaurants = cursor.fetchall()
        cursor.close()
        return restaurants
    
    def search_place(self, restaurant):
        try:
            search_query = f"{restaurant['name']} {restaurant['city']} {restaurant['state']}"
            params = {
                'query': search_query,
                'key': self.google_api_key,
                'type': 'restaurant'
            }
            
            response = requests.get(self.places_search_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                place = data['results'][0]
                details = self.get_place_details(place['place_id'])
                if details:
                    place.update(details)
                return place
            return None
                
        except Exception as e:
            logger.error(f"Error searching for {restaurant['name']}: {e}")
            return None
    
    def get_place_details(self, place_id: str):
        try:
            params = {
                'place_id': place_id,
                'key': self.google_api_key,
                'fields': 'formatted_phone_number,website,opening_hours,rating,user_ratings_total,price_level'
            }
            
            response = requests.get(self.places_details_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['result']:
                return data['result']
            return None
                
        except Exception as e:
            logger.error(f"Error getting details for {place_id}: {e}")
            return None
    
    def store_google_places_data(self, conn, restaurant_id: int, place_data):
        try:
            cursor = conn.cursor()
            
            # Insert into google_places_data table
            now = datetime.utcnow()
            next_update = now + timedelta(hours=168)
            
            insert_query = """
                INSERT INTO google_places_data (
                    restaurant_id, google_place_id, name, formatted_address,
                    phone_number, website, rating, user_ratings_total, price_level,
                    latitude, longitude, last_updated, next_update, 
                    update_frequency_hours, is_active, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) ON CONFLICT (google_place_id) DO UPDATE SET
                    last_updated = EXCLUDED.last_updated,
                    updated_at = EXCLUDED.updated_at
            """
            
            cursor.execute(insert_query, (
                restaurant_id,
                place_data.get('place_id'),
                place_data.get('name'),
                place_data.get('formatted_address'),
                place_data.get('formatted_phone_number'),
                place_data.get('website'),
                place_data.get('rating'),
                place_data.get('user_ratings_total'),
                place_data.get('price_level'),
                place_data.get('geometry', {}).get('location', {}).get('lat'),
                place_data.get('geometry', {}).get('location', {}).get('lng'),
                now,
                next_update,
                168,
                True,
                now,
                now
            ))
            
            # Update restaurant table
            update_query = """
                UPDATE restaurants 
                SET 
                    google_place_id = %s,
                    google_rating = %s,
                    google_review_count = %s,
                    google_listing_url = %s,
                    last_google_sync_at = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            google_listing_url = f"https://www.google.com/maps/place/?q=place_id:{place_data.get('place_id')}"
            
            cursor.execute(update_query, (
                place_data.get('place_id'),
                place_data.get('rating'),
                place_data.get('user_ratings_total'),
                google_listing_url,
                now,
                now,
                restaurant_id
            ))
            
            conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to store data for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def expand_google_places_integration(self, limit: int = 20):
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            restaurants = self.get_restaurants_without_google_data(conn, limit)
            results['total_processed'] = len(restaurants)
            
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                place_data = self.search_place(restaurant)
                
                if place_data:
                    if self.store_google_places_data(conn, restaurant['id'], place_data):
                        results['successfully_processed'] += 1
                    else:
                        results['failed'] += 1
                else:
                    results['failed'] += 1
                
                time.sleep(0.2)  # Rate limiting
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error: {e}")
            results['errors'].append(str(e))
        
        return results

def main():
    database_url = os.getenv('DATABASE_URL')
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    
    if not database_url or not google_api_key:
        logger.error("DATABASE_URL and GOOGLE_PLACES_API_KEY environment variables are required")
        sys.exit(1)
    
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    
    expander = GooglePlacesExpander(database_url, google_api_key)
    
    print("🔍 Starting Google Places integration expansion...")
    print(f"Processing up to {limit} restaurants")
    
    results = expander.expand_google_places_integration(limit)
    
    print("\n📊 RESULTS:")
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    
    if results['successfully_processed'] > 0:
        print(f"✅ Successfully expanded Google Places integration for {results['successfully_processed']} restaurants!")

if __name__ == "__main__":
    main()
