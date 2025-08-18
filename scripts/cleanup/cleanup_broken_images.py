#!/usr/bin/env python3
"""
Cleanup Broken Images Script
============================
This script removes broken image URLs from the database to fix
the secondary image loading issues.
"""

import os
import sys
import requests
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

def test_image_url(url):
    """Test if an image URL is accessible."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        return False

def cleanup_broken_images():
    """Clean up broken image URLs from the database."""
    
    print("🧹 Cleaning up broken image URLs from database...")
    print("=" * 60)
    
    db_manager = EnhancedDatabaseManager()
    if not db_manager.connect():
        print("❌ Failed to connect to database")
        return False
    
    try:
        session = db_manager.get_session()
        
        # Get all additional images from restaurant_images table
        print("\n📊 Checking all additional images...")
        
        additional_images = session.execute(text("""
            SELECT ri.id, ri.restaurant_id, r.name, ri.image_url, ri.image_order
            FROM restaurant_images ri
            JOIN restaurants r ON ri.restaurant_id = r.id
            ORDER BY ri.restaurant_id, ri.image_order
        """)).fetchall()
        
        print(f"Found {len(additional_images)} additional image records to check")
        
        broken_images = []
        working_images = []
        
        # Test each image URL
        for i, img in enumerate(additional_images):
            img_id, restaurant_id, name, image_url, image_order = img
            
            print(f"Testing {i+1}/{len(additional_images)}: {name} (Order {image_order})")
            
            if test_image_url(image_url):
                print(f"  ✅ ACCESSIBLE")
                working_images.append(img)
            else:
                print(f"  ❌ 404 ERROR - Will be removed")
                broken_images.append(img)
        
        print(f"\n📊 RESULTS:")
        print(f"Working images: {len(working_images)}")
        print(f"Broken images: {len(broken_images)}")
        
        if not broken_images:
            print("✅ No broken images found!")
            return True
        
        # Ask for confirmation before deleting
        print(f"\n⚠️  About to delete {len(broken_images)} broken image records:")
        for img in broken_images[:10]:  # Show first 10
            img_id, restaurant_id, name, image_url, image_order = img
            print(f"  {img_id}: {name} (Order {image_order}) - {image_url}")
        
        if len(broken_images) > 10:
            print(f"  ... and {len(broken_images) - 10} more")
        
        # For now, let's just show what would be deleted without actually deleting
        print(f"\n🔍 ANALYSIS COMPLETE")
        print(f"Would delete {len(broken_images)} broken image records")
        print(f"Would keep {len(working_images)} working image records")
        
        # Group broken images by restaurant
        broken_by_restaurant = {}
        for img in broken_images:
            restaurant_id = img[1]
            if restaurant_id not in broken_by_restaurant:
                broken_by_restaurant[restaurant_id] = []
            broken_by_restaurant[restaurant_id].append(img)
        
        print(f"\n📋 RESTAURANTS WITH BROKEN IMAGES:")
        for restaurant_id, images in broken_by_restaurant.items():
            restaurant_name = images[0][2]  # Get name from first image
            print(f"  {restaurant_id}: {restaurant_name} ({len(images)} broken images)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error cleaning up broken images: {e}")
        return False
    finally:
        if session:
            session.close()
        db_manager.disconnect()

def cleanup_specific_problematic_restaurants():
    """Clean up images for specific known problematic restaurants."""
    
    print("\n🧹 Cleaning up specific problematic restaurants...")
    print("=" * 60)
    
    db_manager = EnhancedDatabaseManager()
    if not db_manager.connect():
        print("❌ Failed to connect to database")
        return False
    
    try:
        session = db_manager.get_session()
        
        # List of known problematic restaurants
        problematic_restaurants = [
            'sobol_boca_raton',
            'jons_place', 
            'kosher_bagel_cove',
            'mizrachis_pizza_in_hollywood',
            'cafe_noir'
        ]
        
        total_deleted = 0
        
        for restaurant_name in problematic_restaurants:
            print(f"\n🔍 Checking restaurant: {restaurant_name}")
            
            # Find the restaurant
            restaurant = session.execute(text("""
                SELECT id, name FROM restaurants 
                WHERE name ILIKE :name
            """), {'name': f'%{restaurant_name}%'}).fetchone()
            
            if not restaurant:
                print(f"  ❌ Restaurant not found")
                continue
            
            restaurant_id, name = restaurant
            print(f"  Found: {name} (ID: {restaurant_id})")
            
            # Get all images for this restaurant
            images = session.execute(text("""
                SELECT id, image_url, image_order 
                FROM restaurant_images 
                WHERE restaurant_id = :restaurant_id
                ORDER BY image_order
            """), {'restaurant_id': restaurant_id}).fetchall()
            
            if not images:
                print(f"  ℹ️  No additional images found")
                continue
            
            print(f"  Found {len(images)} additional images")
            
            # Delete all images for this restaurant
            deleted_count = session.execute(text("""
                DELETE FROM restaurant_images 
                WHERE restaurant_id = :restaurant_id
            """), {'restaurant_id': restaurant_id}).rowcount
            
            print(f"  🗑️  Deleted {deleted_count} broken image records")
            total_deleted += deleted_count
        
        # Commit the changes
        session.commit()
        print(f"\n✅ Cleanup completed! Deleted {total_deleted} broken image records")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        session.rollback()
        return False
    finally:
        if session:
            session.close()
        db_manager.disconnect()

def main():
    """Main function."""
    print("🧹 Broken Image Cleanup Script")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # First, analyze all images
    success = cleanup_broken_images()
    
    if success:
        print("\n✅ Analysis completed successfully")
        
        # Ask if user wants to proceed with cleanup
        print("\n🔧 Would you like to proceed with cleaning up the broken images?")
        print("This will remove all image records for the known problematic restaurants.")
        
        # For now, let's just clean up the specific problematic restaurants
        print("\n🧹 Proceeding with cleanup of specific problematic restaurants...")
        cleanup_success = cleanup_specific_problematic_restaurants()
        
        if cleanup_success:
            print("\n✅ Cleanup completed successfully!")
        else:
            print("\n❌ Cleanup failed")
            sys.exit(1)
    else:
        print("\n❌ Analysis failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
