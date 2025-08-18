#!/usr/bin/env python3
"""Enhance Business Types and Review Snippets.
===========================================

This script enhances restaurant data by:
1. Extracting business types from Google Places API
2. Storing review snippets for better user insights
3. Categorizing restaurants by cuisine and service type
4. Enhancing search and filtering capabilities

Phase 3 Advanced Features - Business Types & Review Snippets Enhancement.

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
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BusinessTypesAndReviewsEnhancer:
    """Handles enhancing business types and review snippets."""
    
    def __init__(self, database_url: str, google_api_key: str):
        """Initialize the enhancer."""
        self.database_url = database_url
        self.google_api_key = google_api_key
        self.places_details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        
        # Business type mapping for better categorization
        self.business_type_mapping = {
            'restaurant': ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'],
            'bakery': ['bakery', 'pastry_shop'],
            'cafe': ['cafe', 'coffee_shop'],
            'pizzeria': ['pizzeria', 'pizza'],
            'sushi': ['sushi_restaurant', 'japanese_restaurant'],
            'steakhouse': ['steakhouse', 'barbecue_restaurant'],
            'deli': ['deli', 'sandwich_shop'],
            'ice_cream': ['ice_cream_shop', 'dessert_shop'],
            'bbq': ['barbecue_restaurant', 'smokehouse'],
            'mediterranean': ['mediterranean_restaurant', 'greek_restaurant'],
            'asian': ['asian_restaurant', 'chinese_restaurant', 'thai_restaurant'],
            'italian': ['italian_restaurant', 'pasta_house'],
            'mexican': ['mexican_restaurant', 'taco_shop'],
            'american': ['american_restaurant', 'diner', 'burger_restaurant']
        }
        
    def connect_db(self):
        """Connect to the database."""
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_needing_enhancement(self, conn, limit: int = 100):
        """Get restaurants that need business types and review snippets."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = f"""
            SELECT id, name, city, google_place_id, business_types, review_snippets
            FROM restaurants
            WHERE google_place_id IS NOT NULL
            AND (
                business_types IS NULL 
                OR business_types = ''
                OR business_types = 'None'
                OR review_snippets IS NULL 
                OR review_snippets = ''
                OR review_snippets = 'None'
            )
            ORDER BY city, name
            LIMIT {limit}
        """
        cursor.execute(query)
        restaurants = cursor.fetchall()
        cursor.close()
        return restaurants
    
    def get_place_details(self, place_id: str):
        """Get detailed information for a Google Place including types and reviews."""
        try:
            params = {
                'place_id': place_id,
                'key': self.google_api_key,
                'fields': 'types,reviews,price_level,opening_hours,formatted_phone_number,website'
            }
            
            response = requests.get(self.places_details_url, params=params, timeout=10)
            data = response.json()
            
            if data['status'] == 'OK' and data['result']:
                return data['result']
            return None
                
        except Exception as e:
            logger.error(f"Error getting details for {place_id}: {e}")
            return None
    
    def categorize_business_types(self, google_types: List[str]) -> str:
        """Categorize business types into primary cuisine/service type."""
        if not google_types:
            return 'restaurant'
        
        # Convert to lowercase for matching
        types_lower = [t.lower() for t in google_types]
        
        # Find the best match
        for category, type_keywords in self.business_type_mapping.items():
            for keyword in type_keywords:
                if keyword in types_lower:
                    return category
        
        # Default to restaurant if no specific match
        return 'restaurant'
    
    def extract_review_snippets(self, reviews: List[Dict]) -> Optional[str]:
        """Extract and format review snippets."""
        if not reviews:
            return None
        
        # Take the first 3 reviews and extract key information
        snippets = []
        for review in reviews[:3]:
            snippet = {
                'author': review.get('author_name', 'Anonymous'),
                'rating': review.get('rating', 0),
                'text': review.get('text', '')[:150] + '...' if len(review.get('text', '')) > 150 else review.get('text', ''),
                'time': review.get('time', 0)
            }
            snippets.append(snippet)
        
        return json.dumps(snippets) if snippets else None
    
    def update_restaurant_data(self, conn, restaurant_id: int, place_data: Dict):
        """Update restaurant with business types and review snippets."""
        cursor = None
        try:
            cursor = conn.cursor()
            
            # Extract business types
            google_types = place_data.get('types', [])
            business_type = self.categorize_business_types(google_types)
            
            # Extract review snippets
            reviews = place_data.get('reviews', [])
            review_snippets = self.extract_review_snippets(reviews)
            
            # Only update if we have valid data (not None or empty strings)
            if review_snippets is None:
                review_snippets = ''  # Use empty string instead of None
            
            # Update restaurant table
            update_query = """
                UPDATE restaurants 
                SET 
                    business_types = %s,
                    review_snippets = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            now = datetime.utcnow()
            
            cursor.execute(update_query, (
                business_type,
                review_snippets,
                now,
                restaurant_id
            ))
            
            # Also update google_places_data table if entry exists
            try:
                update_cache_query = """
                    UPDATE google_places_data 
                    SET 
                        business_types = %s,
                        review_snippets = %s,
                        last_updated = %s,
                        updated_at = %s
                    WHERE restaurant_id = %s
                """
                
                cursor.execute(update_cache_query, (
                    business_type,
                    review_snippets,
                    now,
                    now,
                    restaurant_id
                ))
            except Exception as e:
                logger.warning(f"Could not update google_places_data table: {e}")
            
            # Don't commit here - let the main method handle transactions
            return True
            
        except Exception as e:
            logger.error(f"Failed to update data for restaurant {restaurant_id}: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def enhance_business_types_and_reviews(self, limit: int = 100):
        """Main method to enhance business types and review snippets."""
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'business_types_added': 0,
            'review_snippets_added': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants needing enhancement
            restaurants = self.get_restaurants_needing_enhancement(conn, limit)
            results['total_processed'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants found needing business types and review enhancement")
                return results
            
            logger.info(f"Found {len(restaurants)} restaurants needing enhancement")
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Get detailed place information
                place_data = self.get_place_details(restaurant['google_place_id'])
                
                if place_data:
                    # Update the restaurant with enhanced data
                    if self.update_restaurant_data(conn, restaurant['id'], place_data):
                        # Commit the transaction for this restaurant
                        conn.commit()
                        results['successfully_processed'] += 1
                        
                        # Track what was added
                        if not restaurant['business_types']:
                            results['business_types_added'] += 1
                        if not restaurant['review_snippets']:
                            results['review_snippets_added'] += 1
                            
                        logger.info(f"✅ Enhanced {restaurant['name']} - Business Type: {'Added' if not restaurant['business_types'] else 'Exists'}, Reviews: {'Added' if not restaurant['review_snippets'] else 'Exists'}")
                    else:
                        # Rollback on failure
                        conn.rollback()
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
            logger.error(f"Error in enhance_business_types_and_reviews: {e}")
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
    
    # Initialize and run the enhancer
    enhancer = BusinessTypesAndReviewsEnhancer(database_url, google_api_key)
    
    print("🏷️ Starting Business Types and Review Snippets Enhancement...")
    print("=" * 80)
    print(f"Processing up to {limit} restaurants")
    
    results = enhancer.enhance_business_types_and_reviews(limit)
    
    print("\n📊 RESULTS:")
    print("=" * 80)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    print(f"Business Types added: {results['business_types_added']}")
    print(f"Review Snippets added: {results['review_snippets_added']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if isinstance(error, dict):
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error}")
    
    if results['successfully_processed'] > 0:
        print(f"\n✅ Successfully enhanced {results['successfully_processed']} restaurants!")
        print(f"   - Added {results['business_types_added']} Business Types")
        print(f"   - Added {results['review_snippets_added']} Review Snippets")
    else:
        print(f"\n⚠️  No restaurants were enhanced. Check the errors above.")

if __name__ == "__main__":
    main()
