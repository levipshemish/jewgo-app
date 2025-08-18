#!/usr/bin/env python3
"""
Cleanup Additional Images Script
================================
This script removes broken additional images from the restaurant_images table.
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

def cleanup_additional_images():
    """Clean up broken additional restaurant images."""
    
    print("🧹 Additional Image Cleanup Script")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    db_manager = EnhancedDatabaseManager()
    if not db_manager.connect():
        print("❌ Failed to connect to database")
        return False
    
    try:
        session = db_manager.get_session()
        
        # Get all additional images
        additional_images = session.execute(text("""
            SELECT ri.id, ri.restaurant_id, r.name, ri.image_url, ri.image_order
            FROM restaurant_images ri
            JOIN restaurants r ON ri.restaurant_id = r.id
            ORDER BY ri.restaurant_id, ri.image_order
        """)).fetchall()
        
        print(f"Testing {len(additional_images)} additional images...")
        
        broken_images = []
        
        for i, (img_id, restaurant_id, name, image_url, image_order) in enumerate(additional_images):
            print(f"  {i+1:3d}/{len(additional_images)}: {name[:35]:<35} (Order {image_order})", end=" ")
            
            if not test_image_url(image_url):
                print("❌ BROKEN")
                broken_images.append((img_id, restaurant_id, name, image_url, image_order))
            else:
                print("✅")
            
            # Rate limiting
            if (i + 1) % 10 == 0:
                print(f"    Processed {i+1}/{len(additional_images)} images...")
        
        print(f"\nFound {len(broken_images)} broken additional images")
        
        if broken_images:
            print("\n❌ BROKEN ADDITIONAL IMAGES:")
            for img_id, restaurant_id, name, url, order in broken_images:
                print(f"  {img_id}: {name} (Order {order})")
                print(f"    {url}")
            
            print(f"\n🧹 Deleting {len(broken_images)} broken image records...")
            
            # Delete broken images
            for img_id, restaurant_id, name, url, order in broken_images:
                try:
                    session.execute(text("""
                        DELETE FROM restaurant_images 
                        WHERE id = :img_id
                    """), {"img_id": img_id})
                    print(f"  ✅ Deleted {name} (Order {order})")
                except Exception as e:
                    print(f"  ❌ Failed to delete {name} (Order {order}): {e}")
            
            # Commit changes
            session.commit()
            print(f"\n✅ Successfully deleted {len(broken_images)} broken image records")
        else:
            print("✅ No broken additional images found!")
        
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
    success = cleanup_additional_images()
    
    if success:
        print("\n✅ Additional image cleanup completed successfully!")
    else:
        print("\n❌ Additional image cleanup failed!")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
