"""
Import Kosher Miami Data with Image Scraping
============================================

This script imports restaurants from the Kosher Miami data file and scrapes images for them.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import json
import time
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

def import__data():
    """Import Kosher Miami data with image scraping."""

    os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "your-cloudinary-cloud-name")
    os.environ.setdefault("CLOUDINARY_API_KEY", "your-cloudinary-api-key")
    os.environ.setdefault("CLOUDINARY_API_SECRET", "your-cloudinary-api-secret")
    os.environ.setdefault(
        "GOOGLE_PLACES_API_KEY", "your-google-places-api-key"
    )

    try:
            ImageEnhancedImporter,
        )

        data_file = (
            Path(__file__).parent.parent / "data" / "_establishments.json"
        )

        if not data_file.exists():
            print(f"❌ Data file not found: {data_file}")
            return

        print(f"📁 Loading data from: {data_file}")

        with open(data_file, "r", encoding="utf-8") as f:
            restaurants = json.load(f)

        print(f"📊 Found {len(restaurants)} restaurants in data file")

        importer = ImageEnhancedImporter(enable_image_scraping=True)

        test_restaurants = restaurants[:10]
        print(f"🔄 Importing first {len(test_restaurants)} restaurants...")

        results = importer.import_restaurants(test_restaurants)

        print(f"\n📊 Import Results:")
        print(f"  Total processed: {results.get('total_processed', 0)}")
        print(f"  Successful imports: {results.get('successful_imports', 0)}")
        print(f"  Updated imports: {results.get('updated_imports', 0)}")
        print(f"  Failed imports: {results.get('failed_imports', 0)}")
        print(f"  Images scraped: {results.get('images_scraped', 0)}")
        print(f"  Images uploaded: {results.get('images_uploaded', 0)}")
        print(f"  Geocoded addresses: {results.get('geocoded_addresses', 0)}")

        if results.get("errors"):
            print(f"\n❌ Errors:")
            for error in results["errors"][:5]:  # Show first 5 errors
                print(f"  - {error}")

        importer.close()

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("  pip install cloudinary requests")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import__data()
