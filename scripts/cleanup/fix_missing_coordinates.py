#!/usr/bin/env python3
"""Fix Missing Coordinates for Restaurants.
========================================

This script addresses restaurants missing latitude/longitude coordinates
by using geocoding to find their locations based on address information.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Tuple, Dict, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CoordinateFixer:
    """Handles fixing missing coordinates for restaurants."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the coordinate fixer."""
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
        
    def connect_db(self) -> psycopg2.extensions.connection:
        """Connect to the database."""
        try:
            conn = psycopg2.connect(self.database_url)
            logger.info("Successfully connected to database")
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def get_restaurants_missing_coordinates(self, conn) -> list:
        """Get restaurants missing coordinates."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT id, name, address, city, state, zip_code
            FROM restaurants
            WHERE latitude IS NULL OR longitude IS NULL
            ORDER BY city, name
        """
        
        cursor.execute(query)
        restaurants = cursor.fetchall()
        cursor.close()
        
        logger.info(f"Found {len(restaurants)} restaurants missing coordinates")
        return restaurants
    
    def geocode_address(self, address: str, city: str, state: str, zip_code: str) -> Optional[Tuple[float, float]]:
        """Geocode an address using Google Geocoding API."""
        try:
            # Build the full address
            full_address = f"{address}, {city}, {state} {zip_code}"
            
            # Make API request
            params = {
                'address': full_address,
                'key': self.google_api_key
            }
            
            response = requests.get(self.geocoding_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                location = data['results'][0]['geometry']['location']
                lat = location['lat']
                lng = location['lng']
                
                logger.info(f"Successfully geocoded: {full_address} -> ({lat}, {lng})")
                return (lat, lng)
            else:
                logger.warning(f"Geocoding failed for {full_address}: {data['status']}")
                return None
                
        except Exception as e:
            logger.error(f"Error geocoding {address}: {e}")
            return None
    
    def update_restaurant_coordinates(self, conn, restaurant_id: int, lat: float, lng: float) -> bool:
        """Update restaurant coordinates in the database."""
        try:
            cursor = conn.cursor()
            
            query = """
                UPDATE restaurants 
                SET latitude = %s, longitude = %s, updated_at = NOW()
                WHERE id = %s
            """
            
            cursor.execute(query, (lat, lng, restaurant_id))
            conn.commit()
            cursor.close()
            
            logger.info(f"Updated coordinates for restaurant ID {restaurant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update coordinates for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def fix_missing_coordinates(self) -> Dict[str, Any]:
        """Main method to fix missing coordinates."""
        results = {
            'total_missing': 0,
            'successfully_fixed': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants missing coordinates
            restaurants = self.get_restaurants_missing_coordinates(conn)
            results['total_missing'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants missing coordinates found")
                return results
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Skip if address is incomplete
                if (restaurant['address'] == 'Address not provided' or 
                    restaurant['zip_code'] == '00000' or
                    restaurant['city'] == 'Other'):
                    logger.warning(f"Skipping {restaurant['name']} - incomplete address data")
                    results['failed'] += 1
                    results['errors'].append({
                        'restaurant_id': restaurant['id'],
                        'name': restaurant['name'],
                        'reason': 'Incomplete address data'
                    })
                    continue
                
                # Geocode the address
                coordinates = self.geocode_address(
                    restaurant['address'],
                    restaurant['city'],
                    restaurant['state'],
                    restaurant['zip_code']
                )
                
                if coordinates:
                    # Update the database
                    if self.update_restaurant_coordinates(conn, restaurant['id'], coordinates[0], coordinates[1]):
                        results['successfully_fixed'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append({
                            'restaurant_id': restaurant['id'],
                            'name': restaurant['name'],
                            'reason': 'Database update failed'
                        })
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'restaurant_id': restaurant['id'],
                        'name': restaurant['name'],
                        'reason': 'Geocoding failed'
                    })
                
                # Rate limiting - be nice to Google API
                time.sleep(0.1)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in fix_missing_coordinates: {e}")
            results['errors'].append({
                'restaurant_id': None,
                'name': 'General Error',
                'reason': str(e)
            })
        
        return results

def main():
    """Main execution function."""
    # Get environment variables
    database_url = os.getenv('DATABASE_URL')
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        sys.exit(1)
    
    if not google_api_key:
        logger.error("GOOGLE_PLACES_API_KEY environment variable is required")
        sys.exit(1)
    
    # Initialize and run the coordinate fixer
    fixer = CoordinateFixer(database_url, google_api_key)
    
    print("🔧 Starting coordinate fix process...")
    print("=" * 50)
    
    results = fixer.fix_missing_coordinates()
    
    print("\n📊 RESULTS SUMMARY:")
    print("=" * 50)
    print(f"Total restaurants missing coordinates: {results['total_missing']}")
    print(f"Successfully fixed: {results['successfully_fixed']}")
    print(f"Failed: {results['failed']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if error['restaurant_id']:
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error['reason']}")
    
    if results['successfully_fixed'] > 0:
        print(f"\n✅ Successfully fixed coordinates for {results['successfully_fixed']} restaurants!")
    else:
        print(f"\n⚠️  No coordinates were fixed. Check the errors above.")

if __name__ == "__main__":
    main()
