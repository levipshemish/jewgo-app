#!/usr/bin/env python3
"""Enhance Google Listing URLs and Price Range Data.
================================================

This script enhances restaurant data by:
1. Generating Google Listing URLs for restaurants with Google Place IDs
2. Adding price range data from Google Places API
3. Updating missing information efficiently

Phase 1 Quick Win - High impact, low effort implementation.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GoogleDataEnhancer:
    """Handles enhancing Google Listing URLs and Price Range data."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the Google data enhancer."""
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.places_details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        
    def connect_db(self):
        """Connect to the database."""
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_needing_enhancement(self, conn, limit: int = 100):
        """Get restaurants that need Google Listing URLs or Price Range data."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT id, name, city, google_place_id, google_listing_url, price_range
            FROM restaurants
            WHERE google_place_id IS NOT NULL
            AND (
                google_listing_url IS NULL 
                OR google_listing_url = ''
                OR price_range IS NULL 
                OR price_range = ''
            )
            ORDER BY city, name
            LIMIT %s
        """
        cursor.execute(query, (limit,))
        restaurants = cursor.fetchall()
        cursor.close()
        return restaurants
    
    def get_place_details(self, place_id: str):
        """Get detailed information for a Google Place including price level."""
        try:
            params = {
                'place_id': place_id,
                'key': self.google_api_key,
                'fields': 'price_level,formatted_phone_number,website,opening_hours'
            }
            
            response = requests.get(self.places_details_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['result']:
                return data['result']
            return None
                
        except Exception as e:
            logger.error(f"Error getting details for {place_id}: {e}")
            return None
    
    def convert_price_level_to_text(self, price_level):
        """Convert Google price_level to text format."""
        if price_level is None:
            return None
            
        price_mapping = {
            0: 'Free',
            1: '$',
            2: '$$', 
            3: '$$$',
            4: '$$$$'
        }
        
        return price_mapping.get(price_level, None)
    
    def generate_google_listing_url(self, place_id: str):
        """Generate Google listing URL from place ID."""
        return f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    
    def update_restaurant_data(self, conn, restaurant_id: int, place_data, place_id: str):
        """Update restaurant with Google listing URL and price range."""
        try:
            cursor = conn.cursor()
            
            # Generate Google listing URL
            google_listing_url = self.generate_google_listing_url(place_id)
            
            # Convert price level to text
            price_range = self.convert_price_level_to_text(place_data.get('price_level'))
            
            # Update restaurant table
            update_query = """
                UPDATE restaurants 
                SET 
                    google_listing_url = %s,
                    price_range = COALESCE(%s, price_range),
                    phone_number = COALESCE(%s, phone_number),
                    website = COALESCE(%s, website),
                    last_google_sync_at = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            now = datetime.utcnow()
            
            cursor.execute(update_query, (
                google_listing_url,
                price_range,
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
                    price_level = %s,
                    phone_number = COALESCE(%s, phone_number),
                    website = COALESCE(%s, website),
                    last_updated = %s,
                    updated_at = %s
                WHERE restaurant_id = %s
            """
            
            cursor.execute(update_cache_query, (
                place_data.get('price_level'),
                place_data.get('formatted_phone_number'),
                place_data.get('website'),
                now,
                now,
                restaurant_id
            ))
            
            conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update data for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def enhance_google_data(self, limit: int = 100):
        """Main method to enhance Google listing URLs and price range data."""
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'urls_added': 0,
            'prices_added': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants needing enhancement
            restaurants = self.get_restaurants_needing_enhancement(conn, limit)
            results['total_processed'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants found needing enhancement")
                return results
            
            logger.info(f"Found {len(restaurants)} restaurants needing enhancement")
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Get detailed place information
                place_data = self.get_place_details(restaurant['google_place_id'])
                
                if place_data:
                    # Update the restaurant with enhanced data
                    if self.update_restaurant_data(conn, restaurant['id'], place_data, restaurant['google_place_id']):
                        results['successfully_processed'] += 1
                        
                        # Track what was added
                        if not restaurant['google_listing_url']:
                            results['urls_added'] += 1
                        if not restaurant['price_range']:
                            results['prices_added'] += 1
                            
                        logger.info(f"✅ Updated {restaurant['name']} - URL: {'Added' if not restaurant['google_listing_url'] else 'Exists'}, Price: {'Added' if not restaurant['price_range'] else 'Exists'}")
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
            logger.error(f"Error in enhance_google_data: {e}")
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
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    # Initialize and run the Google data enhancer
    enhancer = GoogleDataEnhancer(database_url, google_api_key)
    
    print("🔗 Starting Google Listing URLs and Price Range enhancement...")
    print("=" * 70)
    print(f"Processing up to {limit} restaurants")
    
    results = enhancer.enhance_google_data(limit)
    
    print("\n📊 RESULTS:")
    print("=" * 70)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    print(f"Google Listing URLs added: {results['urls_added']}")
    print(f"Price ranges added: {results['prices_added']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if isinstance(error, dict):
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error}")
    
    if results['successfully_processed'] > 0:
        print(f"\n✅ Successfully enhanced {results['successfully_processed']} restaurants!")
        print(f"   - Added {results['urls_added']} Google Listing URLs")
        print(f"   - Added {results['prices_added']} Price Ranges")
    else:
        print(f"\n⚠️  No restaurants were enhanced. Check the errors above.")

if __name__ == "__main__":
    main()
