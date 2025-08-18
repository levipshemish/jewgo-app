#!/usr/bin/env python3
"""Enhance Google Ratings Coverage for Restaurants.
==============================================

This script enhances Google ratings coverage by:
1. Finding restaurants without Google ratings
2. Using Google Places API to get ratings and reviews
3. Updating restaurant records with rating information
4. Caching the data for performance

Similar to hours updates, this focuses on enriching existing data.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import time
import json
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GoogleRatingsEnhancer:
    """Handles enhancing Google ratings coverage."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the Google ratings enhancer."""
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.places_details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        
    def connect_db(self):
        """Connect to the database."""
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_without_ratings(self, conn, limit: int = 50):
        """Get restaurants that have Google Place IDs but no ratings."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT id, name, city, google_place_id, google_rating, google_review_count
            FROM restaurants
            WHERE google_place_id IS NOT NULL
            AND (google_rating IS NULL OR google_review_count IS NULL)
            ORDER BY city, name
            LIMIT %s
        """
        cursor.execute(query, (limit,))
        restaurants = cursor.fetchall()
        cursor.close()
        return restaurants
    
    def get_place_details(self, place_id: str):
        """Get detailed information for a Google Place including ratings."""
        try:
            params = {
                'place_id': place_id,
                'key': self.google_api_key,
                'fields': 'rating,user_ratings_total,reviews,price_level,opening_hours,formatted_phone_number,website'
            }
            
            response = requests.get(self.places_details_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['result']:
                return data['result']
            return None
                
        except Exception as e:
            logger.error(f"Error getting details for {place_id}: {e}")
            return None
    
    def update_restaurant_ratings(self, conn, restaurant_id: int, place_data):
        """Update restaurant with Google ratings and additional data."""
        try:
            cursor = conn.cursor()
            
            # Update restaurant table with rating information
            update_query = """
                UPDATE restaurants 
                SET 
                    google_rating = %s,
                    google_review_count = %s,
                    google_reviews = %s,
                    price_range = %s,
                    hours_of_operation = %s,
                    phone_number = COALESCE(%s, phone_number),
                    website = COALESCE(%s, website),
                    last_google_sync_at = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            # Format hours if available
            hours_text = None
            if place_data.get('opening_hours') and place_data['opening_hours'].get('weekday_text'):
                hours_text = '\n'.join(place_data['opening_hours']['weekday_text'])
            
            # Format reviews if available (limit to first 3)
            reviews_text = None
            if place_data.get('reviews'):
                reviews_data = place_data['reviews'][:3]  # Limit to 3 reviews
                reviews_text = json.dumps([{
                    'author': review.get('author_name', ''),
                    'rating': review.get('rating', 0),
                    'text': review.get('text', ''),
                    'time': review.get('time', 0)
                } for review in reviews_data])
            
            # Convert price_level to text format
            price_range = None
            if place_data.get('price_level') is not None:
                price_level = place_data['price_level']
                if price_level == 0:
                    price_range = 'Free'
                elif price_level == 1:
                    price_range = '$'
                elif price_level == 2:
                    price_range = '$$'
                elif price_level == 3:
                    price_range = '$$$'
                elif price_level == 4:
                    price_range = '$$$$'
            
            now = datetime.utcnow()
            
            cursor.execute(update_query, (
                place_data.get('rating'),
                place_data.get('user_ratings_total'),
                reviews_text,
                price_range,
                hours_text,
                place_data.get('formatted_phone_number'),
                place_data.get('website'),
                now,
                now,
                restaurant_id
            ))
            
            # Also update google_places_data table if entry exists
            update_cache_query = """
                UPDATE google_places_data 
                SET 
                    rating = %s,
                    user_ratings_total = %s,
                    reviews_json = %s,
                    price_level = %s,
                    hours_text = %s,
                    last_updated = %s,
                    updated_at = %s
                WHERE restaurant_id = %s
            """
            
            cursor.execute(update_cache_query, (
                place_data.get('rating'),
                place_data.get('user_ratings_total'),
                json.dumps(place_data.get('reviews', [])[:5]) if place_data.get('reviews') else None,
                place_data.get('price_level'),
                hours_text,
                now,
                now,
                restaurant_id
            ))
            
            conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update ratings for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def enhance_google_ratings(self, limit: int = 50):
        """Main method to enhance Google ratings coverage."""
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants without ratings
            restaurants = self.get_restaurants_without_ratings(conn, limit)
            results['total_processed'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants found without Google ratings")
                return results
            
            logger.info(f"Found {len(restaurants)} restaurants without Google ratings")
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Get detailed place information
                place_data = self.get_place_details(restaurant['google_place_id'])
                
                if place_data:
                    # Update the restaurant with rating data
                    if self.update_restaurant_ratings(conn, restaurant['id'], place_data):
                        results['successfully_processed'] += 1
                        logger.info(f"✅ Updated {restaurant['name']} with rating: {place_data.get('rating')} ({place_data.get('user_ratings_total')} reviews)")
                    else:
                        results['failed'] += 1
                        results['errors'].append({
                            'restaurant_id': restaurant['id'],
                            'name': restaurant['name'],
                            'reason': 'Failed to update database'
                        })
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'restaurant_id': restaurant['id'],
                        'name': restaurant['name'],
                        'reason': 'No place data found'
                    })
                
                # Rate limiting - be nice to Google API
                time.sleep(0.2)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in enhance_google_ratings: {e}")
            results['errors'].append(str(e))
        
        return results

def main():
    """Main execution function."""
    # Get environment variables
    database_url = os.getenv('DATABASE_URL')
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    
    if not database_url or not google_api_key:
        logger.error("DATABASE_URL and GOOGLE_PLACES_API_KEY environment variables are required")
        sys.exit(1)
    
    # Get limit from command line argument
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    
    # Initialize and run the Google ratings enhancer
    enhancer = GoogleRatingsEnhancer(database_url, google_api_key)
    
    print("⭐ Starting Google ratings enhancement...")
    print("=" * 60)
    print(f"Processing up to {limit} restaurants")
    
    results = enhancer.enhance_google_ratings(limit)
    
    print("\n📊 RESULTS:")
    print("=" * 60)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if isinstance(error, dict):
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error}")
    
    if results['successfully_processed'] > 0:
        print(f"\n✅ Successfully enhanced Google ratings for {results['successfully_processed']} restaurants!")
    else:
        print(f"\n⚠️  No ratings were enhanced. Check the errors above.")

if __name__ == "__main__":
    main()
