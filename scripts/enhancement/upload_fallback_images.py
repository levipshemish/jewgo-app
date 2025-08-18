#!/usr/bin/env python3
"""
Upload Fallback Images to Cloudinary
====================================

This script uploads default fallback images to Cloudinary for the JewGo app.
These images will be used when restaurant images are not available.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import requests
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.utils.cloudinary_uploader import CloudinaryUploader


def download_image(url: str, filename: str) -> bytes:
    """Download an image from URL."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return None


def upload_fallback_images():
    """Upload fallback images to Cloudinary."""

    # Initialize Cloudinary uploader
    try:
        uploader = CloudinaryUploader()
        print("✅ Cloudinary uploader initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Cloudinary uploader: {e}")
        return

    # Define fallback images with their URLs and Cloudinary paths
    fallback_images = {
        # Dairy category
        "jewgo/fallbacks/dairy/pizza.jpg": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/dairy/pasta.jpg": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/dairy/cheese_platter.jpg": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/dairy/dairy_products.jpg": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=400&fit=crop&q=80",
        # Meat category
        "jewgo/fallbacks/meat/steak.jpg": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/meat/burger.jpg": "https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/meat/bbq.jpg": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/meat/meat_dishes.jpg": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=400&fit=crop&q=80",
        # Pareve category
        "jewgo/fallbacks/pareve/sushi.jpg": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/pareve/salad.jpg": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/pareve/restaurant_interior.jpg": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/pareve/pareve_dishes.jpg": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=400&fit=crop&q=80",
        # Restaurant category
        "jewgo/fallbacks/restaurant/interior.jpg": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/restaurant/food_plating.jpg": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/restaurant/dining_experience.jpg": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=400&fit=crop&q=80",
        "jewgo/fallbacks/restaurant/ambiance.jpg": "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80",
        # Specials category
        "jewgo/fallbacks/specials/burger.jpg": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop&q=75",
        "jewgo/fallbacks/specials/sushi.jpg": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop&q=75",
        "jewgo/fallbacks/specials/cocktail.jpg": "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=400&fit=crop&q=75",
        "jewgo/fallbacks/specials/default_food.jpg": "https://images.unsplash.com/photo-1504674900240-9a9049b7d63e?w=400&h=400&fit=crop&q=75",
        # Demo category
        "jewgo/fallbacks/demo/pizza_restaurant.jpg": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&crop=center&q=75",
        "jewgo/fallbacks/demo/steakhouse.jpg": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&crop=center&q=75",
        "jewgo/fallbacks/demo/cafe.jpg": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center&q=75",
        "jewgo/fallbacks/demo/sushi_restaurant.jpg": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center&q=75",
    }

    print(f"📤 Uploading {len(fallback_images)} fallback images to Cloudinary...")

    successful_uploads = 0
    failed_uploads = 0

    for cloudinary_path, image_url in fallback_images.items():
        print(f"🔄 Processing: {cloudinary_path}")

        # Download the image
        image_bytes = download_image(image_url, cloudinary_path)
        if not image_bytes:
            print(f"❌ Failed to download: {image_url}")
            failed_uploads += 1
            continue

        # Upload to Cloudinary
        try:
            result = uploader.upload_image_bytes(
                image_bytes=image_bytes,
                public_id=cloudinary_path.replace(
                    ".jpg", ""
                ),  # Remove extension for public_id
                folder="",  # Already included in public_id
                transformation={"quality": "auto", "fetch_format": "auto"},
            )

            if result:
                print(f"✅ Uploaded: {cloudinary_path}")
                successful_uploads += 1
            else:
                print(f"❌ Failed to upload: {cloudinary_path}")
                failed_uploads += 1

        except Exception as e:
            print(f"❌ Error uploading {cloudinary_path}: {e}")
            failed_uploads += 1

    print(f"\n📊 Upload Summary:")
    print(f"✅ Successful: {successful_uploads}")
    print(f"❌ Failed: {failed_uploads}")
    print(f"📈 Success Rate: {(successful_uploads / len(fallback_images)) * 100:.1f}%")

    if successful_uploads > 0:
        print(f"\n🎉 Successfully uploaded {successful_uploads} fallback images!")
        print(
            "These images will now be used as fallbacks when restaurant images are not available."
        )
    else:
        print(
            f"\n⚠️  No images were uploaded successfully. Please check your Cloudinary configuration."
        )


if __name__ == "__main__":
    upload_fallback_images()
