#!/usr/bin/env python3
"""
Cleanup Main Images Script
==========================
This script removes broken main restaurant images from the database.
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

def cleanup_main_images():
    """Clean up broken main restaurant images."""
    
    print("🧹 Main Image Cleanup Script")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    db_manager = EnhancedDatabaseManager()
    if not db_manager.connect():
        print("❌ Failed to connect to database")
        return False
    
    try:
        session = db_manager.get_session()
        
        # Get all main restaurant images
        main_images = session.execute(text("""
            SELECT id, name, image_url 
            FROM restaurants 
            WHERE image_url IS NOT NULL AND image_url != '' AND image_url != '/images/default-restaurant.webp'
            ORDER BY id
        """)).fetchall()
        
        print(f"Testing {len(main_images)} main restaurant images...")
        
        broken_images = []
        
        for i, (restaurant_id, name, image_url) in enumerate(main_images):
            print(f"  {i+1:3d}/{len(main_images)}: {name[:40]:<40}", end=" ")
            
            if not test_image_url(image_url):
                print("❌ BROKEN")
                broken_images.append((restaurant_id, name, image_url))
            else:
                print("✅")
            
            # Rate limiting
            if (i + 1) % 10 == 0:
                print(f"    Processed {i+1}/{len(main_images)} images...")
        
        print(f"\nFound {len(broken_images)} broken main images")
        
        if broken_images:
            print("\n❌ BROKEN MAIN IMAGES:")
            for restaurant_id, name, url in broken_images:
                print(f"  {restaurant_id}: {name}")
                print(f"    {url}")
            
            print(f"\n🧹 Updating {len(broken_images)} restaurants to use default image...")
            
            # Update broken images to use default
            for restaurant_id, name, url in broken_images:
                try:
                    session.execute(text("""
                        UPDATE restaurants 
                        SET image_url = '/images/default-restaurant.webp'
                        WHERE id = :restaurant_id
                    """), {"restaurant_id": restaurant_id})
                    print(f"  ✅ Updated {name}")
                except Exception as e:
                    print(f"  ❌ Failed to update {name}: {e}")
            
            # Commit changes
            session.commit()
            print(f"\n✅ Successfully updated {len(broken_images)} restaurants")
        else:
            print("✅ No broken main images found!")
        
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
    success = cleanup_main_images()
    
    if success:
        print("\n✅ Main image cleanup completed successfully!")
    else:
        print("\n❌ Main image cleanup failed!")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
