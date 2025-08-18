#!/usr/bin/env python3
"""
Fix Problematic Image URLs Script
================================

This script identifies and fixes problematic image URLs in the JewGo database
that are causing 404 errors, specifically targeting Cloudinary images that don't exist.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import requests
from datetime import datetime
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from database.database_manager_v3 import EnhancedDatabaseManager
except ImportError as e:
    print(f"❌ Error importing database manager: {e}")
    print("Make sure you're running this script from the project root directory")
    sys.exit(1)

# Configure logging
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Problematic URL patterns that are known to cause 404 errors
PROBLEMATIC_PATTERNS = [
    'jewgo/restaurants/pita_xpress/image_1',
    'jewgo/restaurants/sobol_boca_raton/image_1',
    'jewgo/restaurants/jons_place/image_1',
    'jewgo/restaurants/kosher_bagel_cove/image_1',
    'jewgo/restaurants/mizrachis_pizza_in_hollywood/image_1',
    'jewgo/restaurants/cafe_noir/image_1',
    'jewgo/restaurants/lox_n_bagel_bagel_factory_cafe/image_1',
    # Add more patterns as discovered
]

def check_image_url_exists(url: str) -> bool:
    """Check if an image URL returns a successful response."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Error checking URL {url}: {e}")
        return False

def is_problematic_url(url: str) -> bool:
    """Check if a URL matches known problematic patterns."""
    if not url or not isinstance(url, str):
        return True
    
    # Check for problematic patterns
    for pattern in PROBLEMATIC_PATTERNS:
        if pattern in url:
            return True
    
    # Check for other problematic patterns
    problematic_indicators = [
        'undefined',
        'null',
        'image/upload//',
        'image/upload/v1//',
    ]
    
    for indicator in problematic_indicators:
        if indicator in url:
            return True
    
    return False

def get_fallback_image_url(restaurant_name: str, kosher_category: str = None) -> str:
    """Get a fallback image URL based on restaurant category."""
    # Use category-based fallback images
    if kosher_category:
        kosher_category = kosher_category.lower()
        if kosher_category == 'dairy':
            return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop'
        elif kosher_category == 'meat':
            return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop'
        elif kosher_category == 'pareve':
            return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'
    
    # Default restaurant image
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop'

def fix_problematic_image_urls() -> Dict[str, Any]:
    """Identify and fix problematic image URLs in the database."""
    print("🔧 Fix Problematic Image URLs")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Initialize database manager
        db_manager = EnhancedDatabaseManager()
        
        # Get all restaurants
        restaurants = db_manager.get_restaurants(limit=1000)  # Get up to 1000 restaurants
        print(f"📊 Found {len(restaurants)} restaurants in database")
        
        problematic_restaurants = []
        fixed_count = 0
        checked_count = 0
        
        for restaurant in restaurants:
            checked_count += 1
            image_url = restaurant.image_url
            
            if not image_url:
                continue
            
            # Check if URL is problematic
            if is_problematic_url(image_url):
                problematic_restaurants.append({
                    'id': restaurant.id,
                    'name': restaurant.name,
                    'current_url': image_url,
                    'kosher_category': restaurant.kosher_category
                })
                print(f"⚠️  Found problematic URL: {restaurant.name} - {image_url}")
                
                # Get fallback image
                fallback_url = get_fallback_image_url(
                    restaurant.name, 
                    restaurant.kosher_category
                )
                
                # Update the database
                try:
                    success = db_manager.update_restaurant_data(
                        restaurant.id, 
                        {'image_url': fallback_url}
                    )
                    if success:
                        fixed_count += 1
                        print(f"✅ Fixed: {restaurant.name} -> {fallback_url}")
                    else:
                        print(f"❌ Failed to update: {restaurant.name}")
                except Exception as e:
                    print(f"❌ Error updating {restaurant.name}: {e}")
            
            # Progress indicator
            if checked_count % 10 == 0:
                print(f"📈 Processed {checked_count}/{len(restaurants)} restaurants...")
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 SUMMARY")
        print("=" * 50)
        print(f"Total restaurants checked: {checked_count}")
        print(f"Problematic URLs found: {len(problematic_restaurants)}")
        print(f"Successfully fixed: {fixed_count}")
        print(f"Failed to fix: {len(problematic_restaurants) - fixed_count}")
        
        if problematic_restaurants:
            print("\n📝 Problematic Restaurants:")
            for restaurant in problematic_restaurants:
                print(f"  - {restaurant['name']} (ID: {restaurant['id']})")
                print(f"    Current URL: {restaurant['current_url']}")
                print(f"    Category: {restaurant['kosher_category']}")
                print()
        
        return {
            'total_checked': checked_count,
            'problematic_found': len(problematic_restaurants),
            'fixed_count': fixed_count,
            'failed_count': len(problematic_restaurants) - fixed_count,
            'problematic_restaurants': problematic_restaurants
        }
        
    except Exception as e:
        logger.exception(f"Error fixing problematic image URLs: {e}")
        return {
            'error': str(e),
            'total_checked': 0,
            'problematic_found': 0,
            'fixed_count': 0,
            'failed_count': 0
        }

def main():
    """Main function."""
    print("🔧 JewGo Image URL Fix Script")
    print("=" * 50)
    
    # Check if running in dry-run mode
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made to the database")
        print("=" * 50)
    
    # Run the fix
    result = fix_problematic_image_urls()
    
    if 'error' in result:
        print(f"❌ Script failed: {result['error']}")
        sys.exit(1)
    
    print("\n✅ Script completed successfully!")
    
    if result['fixed_count'] > 0:
        print(f"🎉 Fixed {result['fixed_count']} problematic image URLs")
    else:
        print("ℹ️  No problematic URLs found or fixed")

if __name__ == "__main__":
    main()
