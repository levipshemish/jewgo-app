#!/usr/bin/env python3
"""
Check Cloudinary Images
======================

Simple script to check what images are available in your Cloudinary account.
This script can be run without the full backend setup.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import json
from pathlib import Path


def check_cloudinary_images():
    """Check what images are available in Cloudinary."""

    # Get Cloudinary credentials from environment
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        print("❌ Cloudinary credentials not found in environment variables")
        print("Please set the following environment variables:")
        print("  - CLOUDINARY_CLOUD_NAME")
        print("  - CLOUDINARY_API_KEY")
        print("  - CLOUDINARY_API_SECRET")
        print("\nYou can set them by running:")
        print("  export CLOUDINARY_CLOUD_NAME='your_cloud_name'")
        print("  export CLOUDINARY_API_KEY='your_api_key'")
        print("  export CLOUDINARY_API_SECRET='your_api_secret'")
        return

    print(f"✅ Cloudinary credentials found")
    print(f"🔍 Cloud Name: {cloud_name}")

    try:
        import cloudinary
        import cloudinary.api

        # Configure Cloudinary
        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)

        print(f"🔍 Searching for restaurant images in Cloudinary...")

        # List all resources in the jewgo/restaurants folder
        result = cloudinary.api.resources(
            type="upload", prefix="jewgo/restaurants/", max_results=500, context=True
        )

        if not result.get("resources"):
            print("❌ No restaurant images found in Cloudinary")
            print("This means you haven't uploaded any restaurant images yet.")
            print("You can upload images using your Google Places image scraper.")
            return

        restaurants = {}
        categories = {"dairy": [], "meat": [], "pareve": [], "restaurant": []}

        print(f"📊 Found {len(result['resources'])} images across all restaurants")

        # Group images by restaurant
        for resource in result["resources"]:
            public_id = resource.get("public_id", "")

            # Extract restaurant name from path: jewgo/restaurants/restaurant_name/image_1
            if "jewgo/restaurants/" in public_id:
                parts = public_id.split("/")
                if len(parts) >= 3:
                    restaurant_name = parts[2]  # restaurant_name
                    image_name = parts[3] if len(parts) > 3 else "image_1"

                    if restaurant_name not in restaurants:
                        restaurants[restaurant_name] = []

                    # Create Cloudinary URL (without .jpg extension)
                    image_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/f_auto,q_80,w_800,h_400,c_fill/{public_id}"
                    restaurants[restaurant_name].append(
                        {
                            "public_id": public_id,
                            "url": image_url,
                            "image_name": image_name,
                            "secure_url": resource.get("secure_url", ""),
                            "width": resource.get("width", 0),
                            "height": resource.get("height", 0),
                            "format": resource.get("format", ""),
                            "created_at": resource.get("created_at", ""),
                        }
                    )

        print(f"🏪 Found {len(restaurants)} restaurants with images:")

        # Display restaurants
        for i, (restaurant_name, images) in enumerate(restaurants.items(), 1):
            print(f"  {i}. {restaurant_name} ({len(images)} images)")
            for img in images:
                print(f"     - {img['image_name']}: {img['url']}")

        # Categorize restaurants based on their names
        for restaurant_name, images in restaurants.items():
            name_lower = restaurant_name.lower()

            # Simple categorization based on restaurant name keywords
            if any(
                keyword in name_lower
                for keyword in ["pizza", "pasta", "cheese", "dairy", "milk", "cream"]
            ):
                categories["dairy"].append({"name": restaurant_name, "images": images})
            elif any(
                keyword in name_lower
                for keyword in [
                    "steak",
                    "burger",
                    "bbq",
                    "meat",
                    "beef",
                    "chicken",
                    "grill",
                ]
            ):
                categories["meat"].append({"name": restaurant_name, "images": images})
            elif any(
                keyword in name_lower
                for keyword in [
                    "sushi",
                    "salad",
                    "vegan",
                    "vegetarian",
                    "pareve",
                    "fish",
                ]
            ):
                categories["pareve"].append({"name": restaurant_name, "images": images})
            else:
                categories["restaurant"].append(
                    {"name": restaurant_name, "images": images}
                )

        print(f"\n📊 Categorization Summary:")
        for category, restaurants_list in categories.items():
            print(f"  {category.capitalize()}: {len(restaurants_list)} restaurants")
            for restaurant in restaurants_list:
                print(f"    - {restaurant['name']}")

        # Save detailed report
        save_discovery_report(restaurants, categories)

        print(f"\n✅ Restaurant image discovery completed!")
        print(f"📁 Detailed report saved to: scripts/restaurant_images_report.json")

    except ImportError:
        print("❌ Cloudinary package not installed")
        print("Install it with: pip install cloudinary")
    except Exception as e:
        print(f"❌ Error discovering restaurant images: {e}")


def save_discovery_report(restaurants: dict, categories: dict):
    """Save a detailed report of discovered restaurant images."""

    report = {
        "summary": {
            "total_restaurants": len(restaurants),
            "total_images": sum(len(images) for images in restaurants.values()),
            "categories": {cat: len(rests) for cat, rests in categories.items()},
        },
        "restaurants": restaurants,
        "categories": categories,
    }

    output_path = Path(__file__).parent / "restaurant_images_report.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"📊 Discovery report saved: {output_path}")


if __name__ == "__main__":
    check_cloudinary_images()
