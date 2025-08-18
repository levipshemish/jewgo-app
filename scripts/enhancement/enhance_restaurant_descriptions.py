#!/usr/bin/env python3
"""Enhance Restaurant Descriptions.
================================

This script enhances restaurant data by:
1. Generating short descriptions for restaurants using template-based approach
2. Using restaurant name, category, and kosher information
3. Creating informative descriptions that help users understand restaurant type

Phase 2 Data Enrichment - Short Descriptions Enhancement.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
import logging
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RestaurantDescriptionEnhancer:
    """Handles enhancing restaurant descriptions."""
    
    def __init__(self, database_url: str):
        """Initialize the description enhancer."""
        self.database_url = database_url
        
        # Template-based description generation
        self.description_templates = {
            'dairy': {
                'default': 'Kosher dairy restaurant serving delicious {cuisine_type} cuisine in {city}.',
                'bakery': 'Kosher dairy bakery offering fresh {cuisine_type} pastries and baked goods in {city}.',
                'cafe': 'Kosher dairy cafe serving {cuisine_type} coffee, pastries, and light meals in {city}.',
                'ice_cream': 'Kosher dairy ice cream shop featuring {cuisine_type} frozen treats and desserts in {city}.',
                'pizza': 'Kosher dairy pizzeria serving authentic {cuisine_type} pizza and Italian dishes in {city}.'
            },
            'meat': {
                'default': 'Kosher meat restaurant specializing in {cuisine_type} cuisine and grilled dishes in {city}.',
                'steakhouse': 'Kosher steakhouse offering premium {cuisine_type} cuts and fine dining in {city}.',
                'bbq': 'Kosher BBQ restaurant serving smoked {cuisine_type} meats and traditional barbecue in {city}.',
                'grill': 'Kosher grill restaurant featuring {cuisine_type} grilled meats and Mediterranean dishes in {city}.',
                'deli': 'Kosher deli serving {cuisine_type} sandwiches, salads, and traditional deli fare in {city}.'
            },
            'pareve': {
                'default': 'Kosher pareve restaurant offering {cuisine_type} dishes and vegetarian-friendly options in {city}.',
                'sushi': 'Kosher sushi restaurant serving fresh {cuisine_type} sushi and Japanese cuisine in {city}.',
                'asian': 'Kosher Asian restaurant featuring {cuisine_type} dishes and authentic Asian flavors in {city}.',
                'mediterranean': 'Kosher Mediterranean restaurant serving {cuisine_type} dishes and healthy Mediterranean cuisine in {city}.',
                'bakery': 'Kosher pareve bakery offering {cuisine_type} pastries and baked goods in {city}.'
            }
        }
        
        # Cuisine type mapping based on restaurant names
        self.cuisine_keywords = {
            'pizza': ['pizza', 'pizzeria', 'slice'],
            'sushi': ['sushi', 'japanese', 'asian', 'poke'],
            'bbq': ['bbq', 'barbecue', 'smokehouse', 'grill'],
            'steakhouse': ['steak', 'steakhouse', 'meat'],
            'bakery': ['bakery', 'pastry', 'cake', 'dessert', 'sweet'],
            'cafe': ['cafe', 'coffee', 'espresso', 'latte'],
            'deli': ['deli', 'sandwich', 'sub'],
            'ice_cream': ['ice cream', 'frozen yogurt', 'gelato', 'dessert'],
            'mediterranean': ['mediterranean', 'greek', 'lebanese', 'middle eastern'],
            'chinese': ['chinese', 'wok', 'dim sum'],
            'italian': ['italian', 'pasta', 'risotto'],
            'mexican': ['mexican', 'taco', 'burrito', 'cantina'],
            'american': ['american', 'burger', 'diner', 'grill']
        }
        
    def connect_db(self):
        """Connect to the database."""
        return psycopg2.connect(self.database_url)
    
    def get_restaurants_needing_descriptions(self, conn, limit: int = 100):
        """Get restaurants that need short descriptions."""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT id, name, city, kosher_category, listing_type, short_description
            FROM restaurants
            WHERE (short_description IS NULL OR short_description = '')
            ORDER BY city, name
            LIMIT %s
        """
        cursor.execute(query, (limit,))
        restaurants = cursor.fetchall()
        cursor.close()
        return restaurants
    
    def detect_cuisine_type(self, restaurant_name: str, existing_listing_type: str = None) -> str:
        """Detect cuisine type from restaurant name and existing data."""
        name_lower = restaurant_name.lower()
        
        # If we have existing listing type, use it
        if existing_listing_type and existing_listing_type.strip():
            return existing_listing_type.strip()
        
        # Detect from restaurant name
        for cuisine, keywords in self.cuisine_keywords.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return cuisine
        
        # Default to general cuisine if no specific type detected
        return 'cuisine'
    
    def detect_restaurant_type(self, restaurant_name: str, kosher_category: str) -> str:
        """Detect specific restaurant type for template selection."""
        name_lower = restaurant_name.lower()
        
        # Check for specific restaurant types
        if any(word in name_lower for word in ['pizza', 'pizzeria']):
            return 'pizza'
        elif any(word in name_lower for word in ['sushi', 'japanese']):
            return 'sushi'
        elif any(word in name_lower for word in ['bbq', 'barbecue', 'smokehouse']):
            return 'bbq'
        elif any(word in name_lower for word in ['steak', 'steakhouse']):
            return 'steakhouse'
        elif any(word in name_lower for word in ['bakery', 'pastry', 'cake']):
            return 'bakery'
        elif any(word in name_lower for word in ['cafe', 'coffee']):
            return 'cafe'
        elif any(word in name_lower for word in ['deli', 'sandwich']):
            return 'deli'
        elif any(word in name_lower for word in ['ice cream', 'frozen yogurt', 'gelato']):
            return 'ice_cream'
        elif any(word in name_lower for word in ['mediterranean', 'greek', 'lebanese']):
            return 'mediterranean'
        elif any(word in name_lower for word in ['asian', 'chinese', 'wok']):
            return 'asian'
        
        return 'default'
    
    def generate_description(self, restaurant: Dict[str, Any]) -> str:
        """Generate a short description for a restaurant."""
        name = restaurant['name']
        city = restaurant['city']
        kosher_category = restaurant['kosher_category'] or 'pareve'
        existing_listing_type = restaurant.get('listing_type')
        
        # Detect cuisine type
        cuisine_type = self.detect_cuisine_type(name, existing_listing_type)
        
        # Detect restaurant type for template selection
        restaurant_type = self.detect_restaurant_type(name, kosher_category)
        
        # Get appropriate template
        templates = self.description_templates.get(kosher_category, self.description_templates['pareve'])
        template = templates.get(restaurant_type, templates['default'])
        
        # Generate description
        description = template.format(
            cuisine_type=cuisine_type,
            city=city
        )
        
        # Clean up the description
        description = re.sub(r'\s+', ' ', description).strip()
        
        return description
    
    def update_restaurant_description(self, conn, restaurant_id: int, description: str):
        """Update restaurant with generated description."""
        try:
            cursor = conn.cursor()
            
            update_query = """
                UPDATE restaurants 
                SET 
                    short_description = %s,
                    updated_at = %s
                WHERE id = %s
            """
            
            now = datetime.utcnow()
            
            cursor.execute(update_query, (
                description,
                now,
                restaurant_id
            ))
            
            conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update description for restaurant {restaurant_id}: {e}")
            conn.rollback()
            return False
    
    def enhance_descriptions(self, limit: int = 100):
        """Main method to enhance restaurant descriptions."""
        results = {
            'total_processed': 0,
            'successfully_processed': 0,
            'failed': 0,
            'descriptions_added': 0,
            'errors': []
        }
        
        try:
            conn = self.connect_db()
            
            # Get restaurants needing descriptions
            restaurants = self.get_restaurants_needing_descriptions(conn, limit)
            results['total_processed'] = len(restaurants)
            
            if not restaurants:
                logger.info("No restaurants found needing descriptions")
                return results
            
            logger.info(f"Found {len(restaurants)} restaurants needing descriptions")
            
            # Process each restaurant
            for restaurant in restaurants:
                logger.info(f"Processing: {restaurant['name']} in {restaurant['city']}")
                
                # Generate description
                description = self.generate_description(restaurant)
                
                # Update the restaurant
                if self.update_restaurant_description(conn, restaurant['id'], description):
                    results['successfully_processed'] += 1
                    results['descriptions_added'] += 1
                    logger.info(f"✅ Added description for {restaurant['name']}: {description[:50]}...")
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'restaurant_id': restaurant['id'],
                        'name': restaurant['name'],
                        'reason': 'Failed to update database'
                    })
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in enhance_descriptions: {e}")
            results['errors'].append(str(e))
        
        return results

def main():
    """Main execution function."""
    # Get environment variables
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        sys.exit(1)
    
    # Get limit from command line argument
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    # Initialize and run the description enhancer
    enhancer = RestaurantDescriptionEnhancer(database_url)
    
    print("📝 Starting Restaurant Descriptions Enhancement...")
    print("=" * 70)
    print(f"Processing up to {limit} restaurants")
    
    results = enhancer.enhance_descriptions(limit)
    
    print("\n📊 RESULTS:")
    print("=" * 70)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully processed: {results['successfully_processed']}")
    print(f"Failed: {results['failed']}")
    print(f"Descriptions added: {results['descriptions_added']}")
    
    if results['errors']:
        print(f"\n❌ ERRORS:")
        for error in results['errors']:
            if isinstance(error, dict):
                print(f"  - Restaurant {error['restaurant_id']} ({error['name']}): {error['reason']}")
            else:
                print(f"  - {error}")
    
    if results['successfully_processed'] > 0:
        print(f"\n✅ Successfully enhanced {results['successfully_processed']} restaurants!")
        print(f"   - Added {results['descriptions_added']} short descriptions")
    else:
        print(f"\n⚠️  No restaurants were enhanced. Check the errors above.")

if __name__ == "__main__":
    main()
