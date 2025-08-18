#!/usr/bin/env python3
"""
Scrape More Restaurant Images
============================

This script scrapes restaurant images from Google Places for restaurants in the Kosher Miami data
and uploads them to Cloudinary.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import json
import time
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def scrape_more_restaurant_images():
    """Scrape restaurant images from Google Places and upload to Cloudinary."""

    # Set environment variables (use placeholders; configure real values via env)
    os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "your-cloudinary-cloud-name")
    os.environ.setdefault("CLOUDINARY_API_KEY", "your-cloudinary-api-key")
    os.environ.setdefault("CLOUDINARY_API_SECRET", "your-cloudinary-api-secret")
    os.environ.setdefault(
        "GOOGLE_PLACES_API_KEY", "your-google-places-api-key"
    )

    try:
        # Import the required modules
        from backend.utils.google_places_image_scraper import GooglePlacesImageScraper
        from backend.utils.cloudinary_uploader import CloudinaryUploader

        # Load the Kosher Miami data
        data_file = (
            Path(__file__).parent.parent / "data" / "kosher_miami_establishments.json"
        )

        if not data_file.exists():
            print(f"❌ Data file not found: {data_file}")
            return

        print(f"📁 Loading data from: {data_file}")

        with open(data_file, "r", encoding="utf-8") as f:
            restaurants = json.load(f)

        print(f"📊 Found {len(restaurants)} restaurants in data file")

        # Initialize scrapers
        image_scraper = GooglePlacesImageScraper()
        cloudinary_uploader = CloudinaryUploader()

        # Process restaurants (limit to first 20 for testing)
        test_restaurants = restaurants[:20]
        print(f"🔄 Processing first {len(test_restaurants)} restaurants...")

        successful_uploads = 0
        failed_uploads = 0

        for i, restaurant in enumerate(test_restaurants, 1):
            restaurant_name = restaurant.get("Name", "Unknown")
            address = restaurant.get("Address", "")
            area = restaurant.get("Area", "")

            # Create full address
            full_address = f"{address}, {area}, FL"

            print(f"\n[{i}/{len(test_restaurants)}] Processing: {restaurant_name}")
            print(f"📍 Address: {full_address}")

            try:
                # Get the best photo from Google Places
                result = image_scraper.get_best_restaurant_photo(
                    restaurant_name, full_address
                )

                if result:
                    photo_bytes, photo_metadata = result
                    print(f"📸 Found image for {restaurant_name}")

                    # Upload to Cloudinary
                    cloudinary_url = cloudinary_uploader.upload_restaurant_image(
                        image_bytes=photo_bytes, restaurant_name=restaurant_name
                    )

                    if cloudinary_url:
                        print(
                            f"✅ Uploaded image for {restaurant_name}: {cloudinary_url}"
                        )
                        successful_uploads += 1
                    else:
                        print(f"❌ Failed to upload image for {restaurant_name}")
                        failed_uploads += 1
                else:
                    print(f"⚠️  No image found for {restaurant_name}")
                    failed_uploads += 1

                # Rate limiting for API calls
                time.sleep(0.5)

            except Exception as e:
                print(f"❌ Error processing {restaurant_name}: {e}")
                failed_uploads += 1

        print(f"\n📊 Final Results:")
        print(f"  Successful uploads: {successful_uploads}")
        print(f"  Failed uploads: {failed_uploads}")
        print(
            f"  Success rate: {(successful_uploads / len(test_restaurants)) * 100:.1f}%"
        )

        # Cleanup
        image_scraper.close()

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("  pip install cloudinary requests")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    scrape_more_restaurant_images()
