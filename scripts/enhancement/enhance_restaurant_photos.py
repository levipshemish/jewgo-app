#!/usr/bin/env python3
"""Enhance Restaurant Photos.
==========================

This script enhances restaurant data by:
1. Fetching primary photos from Google Places API
2. Updating restaurant image_url with high-quality photos
3. Storing photo URLs in restaurant_images table
4. Enhancing visual appeal of restaurant listings

Phase 2 Data Enrichment - Enhanced Photos Enhancement.

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
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RestaurantPhotoEnhancer:
    """Handles enhancing restaurant photos."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the photo enhancer."""
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.places_details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        self.places_photo_url = "https://maps.googleapis.com/maps/api/place/photo"
        
    def connect_db(self):
        """Connect to the database."""
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_needing_photos(self, conn, limit: int = 100):
        """Get restaurants that need enhanced photos."""
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            query = f"""
                SELECT id, name, city, google_place_id, image_url
                FROM restaurants
                WHERE google_place_id IS NOT NULL
                AND image_url LIKE '%default%'
                ORDER BY city, name
                LIMIT {limit}
            """
            cursor.execute(query)
            restaurants = cursor.fetchall()
            cursor.close()
            logger.info(f"Successfully fetched {len(restaurants)} restaurants")
            return restaurants
        except Exception as e:
            logger.error(f"Error in get_restaurants_needing_photos: {e}")
            return []
    
    def get_place_photos(self, place_id: str):
        """Get photo information for a Google Place."""
        try:
            params = {
                'place_id': place_id,
                'key': self.google_api_key,
                'fields': 'photos'
            }
            
            response = requests.get(self.places_details_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['result'] and 'photos' in data['result']:
                return data['result']['photos']
            return []
                
        except Exception as e:
            logger.error(f"Error getting photos for {place_id}: {e}")
            return []
    
    def generate_photo_url(self, photo_reference: str, max_width: int = 400):
        """Generate a photo URL from Google Places photo reference."""
        return f"{self.places_photo_url}?maxwidth={max_width}&photoreference={photo_reference}&key={self.google_api_key}"
    
    def update_restaurant_photo(self, conn, restaurant_id: int, photo_url: str, photo_data: Dict = None):
        """Update restaurant with enhanced photo."""
        try:
            cursor = conn.cursor()
            
            # Update restaurant table with primary photo
            update_query = """
                UPDATE restaurants 
                SET 
                    image_url = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            now = datetime.utcnow()
            
            cursor.execute(update_query, (
                photo_url,
                now,
                restaurant_id
            ))
            
            # Also store in restaurant_images table if it exists
            try:
                insert_image_query = """
                    INSERT INTO restaurant_images (restaurant_id, image_url, is_primary, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (restaurant_id, image_url) DO NOTHING
                """
                
                cursor.execute(insert_image_query, (
                    restaurant_id,
                    photo_url,
                    True,  # Mark as primary photo
                    now,
                    now
                ))
            except Exception as e:
                logger.warning(f"Could not insert into restaurant_images table: {e}")
            
            conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update photo for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def enhance_photos(self, limit: int = 100):
        """Main method to enhance restaurant photos."""
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'photos_added': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants needing photos
            restaurants = self.get_restaurants_needing_photos(conn, limit)
            results['total_processed'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants found needing photo enhancement")
                return results
            
            logger.info(f"Found {len(restaurants)} restaurants needing photo enhancement")
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Get photos from Google Places
                photos = self.get_place_photos(restaurant['google_place_id'])
                logger.info(f"Found {len(photos)} photos for {restaurant['name']}")
                
                if photos:
                    # Use the first (primary) photo
                    primary_photo = photos[0]
                    logger.info(f"Primary photo data: {primary_photo}")
                    if 'photo_reference' in primary_photo:
                        photo_url = self.generate_photo_url(primary_photo['photo_reference'])
                        logger.info(f"Generated photo URL: {photo_url[:50]}...")
                    else:
                        logger.warning(f"No photo_reference found for {restaurant['name']}")
                        results['failed'] += 1
                        results['errors'].append({
                            'restaurant_id': restaurant['id'],
                            'name': restaurant['name'],
                            'reason': 'No photo_reference in photo data'
                        })
                        continue
                    
                    # Update the restaurant
                    if self.update_restaurant_photo(conn, restaurant['id'], photo_url, primary_photo):
                        results['successfully_processed'] += 1
                        results['photos_added'] += 1
                        logger.info(f"✅ Added photo for {restaurant['name']}: {photo_url[:50]}...")
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
                        'reason': 'No photos found'
                    })
                
                # Rate limiting - be nice to Google API
                time.sleep(0.2)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in enhance_photos: {e}")
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
    
    # Initialize and run the photo enhancer
    enhancer = RestaurantPhotoEnhancer(database_url, google_api_key)
    
    print("🖼️ Starting Restaurant Photos Enhancement...")
    print("=" * 70)
    print(f"Processing up to {limit} restaurants")
    
    results = enhancer.enhance_photos(limit)
    
    print("\n📊 RESULTS:")
    print("=" * 70)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    print(f"Photos added: {results['photos_added']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if isinstance(error, dict):
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error}")
    
    if results['successfully_processed'] > 0:
        print(f"\n✅ Successfully enhanced {results['successfully_processed']} restaurants!")
        print(f"   - Added {results['photos_added']} enhanced photos")
    else:
        print(f"\n⚠️  No restaurants were enhanced. Check the errors above.")

if __name__ == "__main__":
    main()
