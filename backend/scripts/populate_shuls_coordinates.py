#!/usr/bin/env python3
"""Populate Shuls Coordinates.
========================================

This script populates latitude and longitude coordinates for existing shuls
in the database using Google Geocoding API based on address information.

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

class ShulsCoordinatePopulator:
    """Handles populating coordinates for shuls."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the coordinate populator."""
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
    
    def get_shuls_missing_coordinates(self, conn) -> list:
        """Get shuls missing coordinates."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT id, name, address, city, state, zip_code, country
            FROM shuls
            WHERE (latitude IS NULL OR longitude IS NULL)
            AND address IS NOT NULL 
            AND address != ''
            AND city IS NOT NULL 
            AND city != ''
            ORDER BY city, name
        """
        
        cursor.execute(query)
        shuls = cursor.fetchall()
        cursor.close()
        
        logger.info(f"Found {len(shuls)} shuls missing coordinates")
        return shuls
    
    def geocode_address(self, address: str, city: str, state: str, zip_code: str, country: str = 'USA') -> Optional[Tuple[float, float]]:
        """Geocode an address using Google Geocoding API."""
        try:
            # Build the full address
            if zip_code:
                full_address = f"{address}, {city}, {state} {zip_code}, {country}"
            else:
                full_address = f"{address}, {city}, {state}, {country}"
            
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
    
    def update_shul_coordinates(self, conn, shul_id: int, lat: float, lng: float) -> bool:
        """Update shul coordinates in the database."""
        try:
            cursor = conn.cursor()
            
            query = """
                UPDATE shuls 
                SET latitude = %s, longitude = %s, updated_at = NOW()
                WHERE id = %s
            """
            
            cursor.execute(query, (lat, lng, shul_id))
            conn.commit()
            cursor.close()
            
            logger.info(f"Updated coordinates for shul ID {shul_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update coordinates for shul {shul_id}: {e}")
            conn.rollback()
            return False
    
    def populate_missing_coordinates(self) -> Dict[str, Any]:
        """Main method to populate missing coordinates."""
        results = {
            'total_missing': 0,
            'successfully_populated': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get shuls missing coordinates
            shuls = self.get_shuls_missing_coordinates(conn)
            results['total_missing'] = len(shuls)
            
            if not shuls:
                logger.info("No shuls missing coordinates found")
                return results
            
            # Process each shul
            for shul in shuls:
                logger.info(f"Processing: {shul['name']} in {shul['city']}")
                
                # Skip if address is incomplete
                if (not shul['address'] or 
                    shul['address'].strip() == '' or
                    not shul['city'] or 
                    shul['city'].strip() == ''):
                    logger.warning(f"Skipping {shul['name']} - incomplete address data")
                    results['failed'] += 1
                    results['errors'].append({
                        'shul_id': shul['id'],
                        'name': shul['name'],
                        'reason': 'Incomplete address data'
                    })
                    continue
                
                # Geocode the address
                coordinates = self.geocode_address(
                    shul['address'],
                    shul['city'],
                    shul['state'],
                    shul['zip_code'],
                    shul['country']
                )
                
                if coordinates:
                    # Update the database
                    if self.update_shul_coordinates(conn, shul['id'], coordinates[0], coordinates[1]):
                        results['successfully_populated'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append({
                            'shul_id': shul['id'],
                            'name': shul['name'],
                            'reason': 'Database update failed'
                        })
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'shul_id': shul['id'],
                        'name': shul['name'],
                        'reason': 'Geocoding failed'
                    })
                
                # Rate limiting - be nice to Google API
                time.sleep(0.1)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in populate_missing_coordinates: {e}")
            results['errors'].append({
                'shul_id': None,
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
    
    # Initialize and run the coordinate populator
    populator = ShulsCoordinatePopulator(database_url, google_api_key)
    
    print("🔧 Starting shuls coordinate population process...")
    print("=" * 50)
    
    results = populator.populate_missing_coordinates()
    
    print("\n📊 RESULTS SUMMARY:")
    print("=" * 50)
    print(f"Total shuls missing coordinates: {results['total_missing']}")
    print(f"Successfully populated: {results['successfully_populated']}")
    print(f"Failed: {results['failed']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if error['shul_id']:
                print(f"  - Shul {error['shul_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error['reason']}")
    
    if results['successfully_populated'] > 0:
        print(f"\n✅ Successfully populated coordinates for {results['successfully_populated']} shuls!")
    else:
        print(f"\n⚠️  No coordinates were populated. Check the errors above.")

if __name__ == "__main__":
    main()
