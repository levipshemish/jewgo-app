#!/usr/bin/env python3
"""
Discover Restaurant Images in Cloudinary
========================================

This script discovers what real restaurant images are available in your Cloudinary account
and generates a mapping for use in the fallback system.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import json
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

try:
    from backend.utils.cloudinary_uploader import CloudinaryUploader
except ImportError:
    # Try alternative import path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from backend.utils.cloudinary_uploader import CloudinaryUploader


def discover_restaurant_images():
    """Discover all restaurant images in Cloudinary and categorize them."""

    # Initialize Cloudinary uploader
    try:
        uploader = CloudinaryUploader()
        print("✅ Cloudinary uploader initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Cloudinary uploader: {e}")
        return

    # Get Cloudinary cloud name
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "jewgo")

    print(f"🔍 Discovering restaurant images in Cloudinary account: {cloud_name}")

    try:
        # List all resources in the jewgo/restaurants folder
        import cloudinary.api

        result = cloudinary.api.resources(
            type="upload", prefix="jewgo/restaurants/", max_results=500, context=True
        )

        if not result.get("resources"):
            print("❌ No restaurant images found in Cloudinary")
            return

        restaurants = {}
        categories = {"dairy": [], "meat": [], "pareve": [], "restaurant": []}

        print(f"📊 Found {len(result['resources'])} images across all restaurants")

        # Group images by restaurant
        for resource in result["resources"]:
            public_id = resource.get("public_id", "")

            # Extract restaurant name from path: jewgo/restaurants/restaurant_name/image_1
            if "/jewgo/restaurants/" in public_id:
                parts = public_id.split("/")
                if len(parts) >= 4:
                    restaurant_name = parts[2]  # restaurant_name
                    image_name = parts[3] if len(parts) > 3 else "image_1"

                    if restaurant_name not in restaurants:
                        restaurants[restaurant_name] = []

                    # Create Cloudinary URL
                    image_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/f_auto,q_80,w_800,h_400,c_fill/{public_id}.jpg"
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

        print(f"🏪 Found {len(restaurants)} restaurants with images")

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

        # Generate TypeScript code for the fallback system
        generate_typescript_fallbacks(cloud_name, categories)

        # Save detailed report
        save_discovery_report(restaurants, categories)

        print("\n✅ Restaurant image discovery completed!")
        print(f"📁 Detailed report saved to: scripts/restaurant_images_report.json")
        print(f"📝 TypeScript fallbacks generated in: scripts/generated_fallbacks.ts")

    except Exception as e:
        print(f"❌ Error discovering restaurant images: {e}")


def generate_typescript_fallbacks(cloud_name: str, categories: dict):
    """Generate TypeScript code for the fallback system."""

    ts_code = f"""// Auto-generated fallback images from Cloudinary
// Generated from real restaurant images in your Cloudinary account

export function getFallbackImages(category: string = 'restaurant'): string[] {{
  const cloudName = "{cloud_name}";
  
  const realRestaurantImages = {{
"""

    for category_name, restaurants in categories.items():
        ts_code += f"    {category_name}: [\n"

        # Take up to 4 restaurants per category
        for i, restaurant in enumerate(restaurants[:4]):
            if restaurant["images"]:
                # Use the first image from each restaurant
                image_url = restaurant["images"][0]["url"]
                ts_code += f"      // {restaurant['name']}\n"
                ts_code += f"      `{image_url}`,\n"

        ts_code += "    ],\n"

    ts_code += """  };
  
  return realRestaurantImages[category.toLowerCase() as keyof typeof realRestaurantImages] || realRestaurantImages.restaurant;
}
"""

    # Write to file
    output_path = Path(__file__).parent / "generated_fallbacks.ts"
    with open(output_path, "w") as f:
        f.write(ts_code)

    print(f"📝 Generated TypeScript fallbacks: {output_path}")


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
    discover_restaurant_images()
