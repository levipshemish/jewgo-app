#!/usr/bin/env python3
"""Scrape Restaurant Images from Google Places.
==========================================

This script scrapes restaurant images from Google Places for restaurants in the Kosher Miami data
and uploads them to Cloudinary.

Author: JewGo Development Team
Version: 1.0
"""

import json
import os
import sys
import time
from pathlib import Path

from utils.cloudinary_uploader import CloudinaryUploader
from utils.google_places_image_scraper import GooglePlacesImageScraper

# Add current directory to Python path
sys.path.append(".")


def scrape_restaurant_images() -> None:
    """Scrape restaurant images from Google Places and upload to Cloudinary."""
    # Set environment variables (placeholders; configure via environment in production)
    os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "your-cloudinary-cloud-name")
    os.environ.setdefault("CLOUDINARY_API_KEY", "your-cloudinary-api-key")
    os.environ.setdefault("CLOUDINARY_API_SECRET", "your-cloudinary-api-secret")
    os.environ.setdefault("GOOGLE_PLACES_API_KEY", "your-google-places-api-key")

    try:
        # Import the required modules
        # Load the Kosher Miami data
        data_file = (
            Path(__file__).parent.parent / "data" / "kosher_miami_establishments.json"
        )

        if not data_file.exists():
            return

        with open(data_file, encoding="utf-8") as f:
            restaurants = json.load(f)

        # Initialize scrapers
        image_scraper = GooglePlacesImageScraper()
        cloudinary_uploader = CloudinaryUploader()

        # Process ALL restaurants

        successful_uploads = 0
        failed_uploads = 0

        for _i, restaurant in enumerate(restaurants, 1):
            restaurant_name = restaurant.get("Name", "Unknown")
            address = restaurant.get("Address", "")
            area = restaurant.get("Area", "")

            # Create full address
            full_address = f"{address}, {area}, FL"

            try:
                # Get the best photo from Google Places
                result = image_scraper.get_best_restaurant_photo(
                    restaurant_name, full_address
                )

                if result:
                    photo_bytes, photo_metadata = result

                    # Upload to Cloudinary
                    cloudinary_url = cloudinary_uploader.upload_restaurant_image(
                        image_bytes=photo_bytes,
                        restaurant_name=restaurant_name,
                    )

                    if cloudinary_url:
                        successful_uploads += 1
                    else:
                        failed_uploads += 1
                else:
                    failed_uploads += 1

                # Rate limiting for API calls
                time.sleep(0.5)

            except Exception as e:
                failed_uploads += 1

        # Cleanup
        image_scraper.close()

    except ImportError as e:
        pass
    except Exception as e:
        pass


if __name__ == "__main__":
    scrape_restaurant_images()
