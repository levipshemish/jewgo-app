#!/usr/bin/env python3
"""
Check Database Images Script
============================
This script checks the actual image URLs stored in the database to identify
any issues with the data that might be causing secondary image loading problems.
"""

import os
import sys
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from database.database_manager_v3 import EnhancedDatabaseManager
    from sqlalchemy import text
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

def check_restaurant_images():
    """Check all restaurant images in the database."""
    
    print("🔍 Checking restaurant images in database...")
    print("=" * 60)
    
    db_manager = EnhancedDatabaseManager()
    if not db_manager.connect():
        print("❌ Failed to connect to database")
        return False
    
    try:
        session = db_manager.get_session()
        
        # Check main restaurant images
        print("\n📊 MAIN RESTAURANT IMAGES (restaurants.image_url):")
        print("-" * 50)
        
        restaurants = session.execute(text("""
            SELECT id, name, image_url 
            FROM restaurants 
            WHERE image_url IS NOT NULL 
            ORDER BY id
        """)).fetchall()
        
        print(f"Found {len(restaurants)} restaurants with main images")
        
        problematic_main_images = []
        for restaurant in restaurants[:10]:  # Show first 10
            restaurant_id, name, image_url = restaurant
            print(f"  {restaurant_id}: {name}")
            print(f"    URL: {image_url}")
            
            if image_url and ('undefined' in image_url or 'null' in image_url):
                problematic_main_images.append((restaurant_id, name, image_url))
                print(f"    ❌ PROBLEMATIC: Contains undefined/null")
            elif image_url and image_url.endswith('/default-restaurant.webp'):
                print(f"    ⚠️  DEFAULT: Using placeholder")
            else:
                print(f"    ✅ VALID")
            print()
        
        if problematic_main_images:
            print(f"❌ Found {len(problematic_main_images)} problematic main images:")
            for rid, name, url in problematic_main_images:
                print(f"  {rid}: {name} - {url}")
        
        # Check additional images from restaurant_images table
        print("\n📊 ADDITIONAL RESTAURANT IMAGES (restaurant_images table):")
        print("-" * 50)
        
        additional_images = session.execute(text("""
            SELECT ri.restaurant_id, r.name, ri.image_url, ri.image_order, ri.cloudinary_public_id
            FROM restaurant_images ri
            JOIN restaurants r ON ri.restaurant_id = r.id
            ORDER BY ri.restaurant_id, ri.image_order
        """)).fetchall()
        
        print(f"Found {len(additional_images)} additional image records")
        
        if additional_images:
            # Group by restaurant
            restaurants_with_additional = {}
            problematic_additional = []
            
            for img in additional_images:
                restaurant_id, name, image_url, image_order, cloudinary_id = img
                
                if restaurant_id not in restaurants_with_additional:
                    restaurants_with_additional[restaurant_id] = []
                
                restaurants_with_additional[restaurant_id].append({
                    'url': image_url,
                    'order': image_order,
                    'cloudinary_id': cloudinary_id
                })
                
                # Check for problematic URLs
                if image_url and ('undefined' in image_url or 'null' in image_url):
                    problematic_additional.append((restaurant_id, name, image_url))
            
            # Show first few restaurants with additional images
            print(f"\nRestaurants with additional images (showing first 5):")
            for i, (restaurant_id, images) in enumerate(list(restaurants_with_additional.items())[:5]):
                restaurant_name = next(r[1] for r in additional_images if r[0] == restaurant_id)
                print(f"\n  {restaurant_id}: {restaurant_name} ({len(images)} additional images)")
                
                for img in images:
                    print(f"    Order {img['order']}: {img['url']}")
                    if img['cloudinary_id']:
                        print(f"      Cloudinary ID: {img['cloudinary_id']}")
                    
                    # Check if URL is problematic
                    if img['url'] and ('undefined' in img['url'] or 'null' in img['url']):
                        print(f"      ❌ PROBLEMATIC: Contains undefined/null")
                    elif img['url'] and img['url'].endswith('/default-restaurant.webp'):
                        print(f"      ⚠️  DEFAULT: Using placeholder")
                    else:
                        print(f"      ✅ VALID")
            
            if problematic_additional:
                print(f"\n❌ Found {len(problematic_additional)} problematic additional images:")
                for rid, name, url in problematic_additional[:10]:  # Show first 10
                    print(f"  {rid}: {name} - {url}")
        
        # Check for restaurants with no images at all
        print("\n📊 RESTAURANTS WITH NO IMAGES:")
        print("-" * 50)
        
        no_images = session.execute(text("""
            SELECT id, name 
            FROM restaurants 
            WHERE image_url IS NULL OR image_url = '' OR image_url = '/images/default-restaurant.webp'
            ORDER BY id
        """)).fetchall()
        
        print(f"Found {len(no_images)} restaurants with no valid images")
        if no_images:
            print("First 10 restaurants with no images:")
            for restaurant_id, name in no_images[:10]:
                print(f"  {restaurant_id}: {name}")
        
        # Summary statistics
        print("\n📈 SUMMARY STATISTICS:")
        print("-" * 50)
        
        total_restaurants = session.execute(text("SELECT COUNT(*) FROM restaurants")).scalar()
        restaurants_with_main_images = session.execute(text("""
            SELECT COUNT(*) FROM restaurants 
            WHERE image_url IS NOT NULL AND image_url != '' AND image_url != '/images/default-restaurant.webp'
        """)).scalar()
        restaurants_with_additional_count = len(restaurants_with_additional)
        
        print(f"Total restaurants: {total_restaurants}")
        print(f"Restaurants with valid main images: {restaurants_with_main_images}")
        print(f"Restaurants with additional images: {restaurants_with_additional_count}")
        print(f"Problematic main images: {len(problematic_main_images)}")
        print(f"Problematic additional images: {len(problematic_additional)}")
        
        # Check specific problematic patterns
        print("\n🔍 CHECKING SPECIFIC PROBLEMATIC PATTERNS:")
        print("-" * 50)
        
        # Check for image_1 patterns that might be problematic
        image_1_patterns = session.execute(text("""
            SELECT COUNT(*) FROM restaurant_images 
            WHERE image_url LIKE '%image_1%'
        """)).scalar()
        
        print(f"Additional images with 'image_1' pattern: {image_1_patterns}")
        
        # Check for specific problematic restaurant names
        problematic_restaurants = [
            'sobol_boca_raton',
            'jons_place', 
            'kosher_bagel_cove',
            'mizrachis_pizza_in_hollywood',
            'cafe_noir'
        ]
        
        for restaurant_name in problematic_restaurants:
            count = session.execute(text("""
                SELECT COUNT(*) FROM restaurant_images ri
                JOIN restaurants r ON ri.restaurant_id = r.id
                WHERE r.name ILIKE :name
            """), {'name': f'%{restaurant_name}%'}).scalar()
            
            if count > 0:
                print(f"  {restaurant_name}: {count} images (KNOWN PROBLEMATIC)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking database images: {e}")
        return False
    finally:
        if session:
            session.close()
        db_manager.disconnect()

def main():
    """Main function."""
    print("🔍 Database Image Checker")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    success = check_restaurant_images()
    
    if success:
        print("\n✅ Database image check completed successfully")
    else:
        print("\n❌ Database image check failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
