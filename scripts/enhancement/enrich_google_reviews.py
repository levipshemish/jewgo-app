#!/usr/bin/env python3
"""
Google Reviews Enrichment Script
================================

This script aggressively fetches Google reviews for restaurants
that don't have any reviews yet, regardless of their update status.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def get_restaurants_without_reviews(limit: int = 50) -> List[Dict[str, Any]]:
    """Get restaurants that don't have Google reviews."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()

        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return []

        # Get restaurants without reviews
        from database.database_manager_v3 import Restaurant

        session = db_manager.get_session()
        restaurants = (
            session.query(Restaurant)
            .filter(Restaurant.google_reviews.is_(None))
            .limit(limit)
            .all()
        )

        result = []
        for restaurant in restaurants:
            result.append(
                {
                    "id": restaurant.id,
                    "name": restaurant.name,
                    "address": restaurant.address,
                    "city": restaurant.city,
                    "state": restaurant.state,
                }
            )

        session.close()
        db_manager.disconnect()

        return result

    except Exception as e:
        print(f"❌ Error getting restaurants without reviews: {e}")
        return []


def enrich_restaurant_reviews(restaurant: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich a single restaurant with Google reviews."""
    try:
        from utils.google_places_manager import GooglePlacesManager

        api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            return {
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "status": "failed",
                "error": "No API key",
            }

        google_manager = GooglePlacesManager(api_key)

        print(f"🔍 Processing: {restaurant['name']} (ID: {restaurant['id']})")

        # Search for Google Places ID
        place_id = google_manager.search_place(
            restaurant["name"], restaurant["address"]
        )
        if not place_id:
            return {
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "status": "no_place_id",
                "error": "Could not find Google Places ID",
            }

        print(f"   ✅ Found Google Places ID: {place_id}")

        # Fetch reviews
        reviews_data = google_manager.fetch_google_reviews(place_id, max_reviews=10)
        if not reviews_data:
            return {
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "status": "no_reviews",
                "error": "No reviews found",
            }

        print(f"   📝 Found {len(reviews_data.get('reviews', []))} reviews")
        print(f"   ⭐ Overall rating: {reviews_data.get('overall_rating')}")

        # Update database
        success = google_manager.update_restaurant_google_reviews(
            restaurant["id"], place_id
        )

        if success:
            return {
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "status": "success",
                "place_id": place_id,
                "reviews_count": len(reviews_data.get("reviews", [])),
                "overall_rating": reviews_data.get("overall_rating"),
                "total_reviews": reviews_data.get("total_reviews"),
            }
        else:
            return {
                "restaurant_id": restaurant["id"],
                "name": restaurant["name"],
                "status": "update_failed",
                "error": "Failed to update database",
            }

    except Exception as e:
        return {
            "restaurant_id": restaurant["id"],
            "name": restaurant["name"],
            "status": "error",
            "error": str(e),
        }


def run_enrichment(batch_size: int = 20, max_total: int = 100):
    """Run the enrichment process."""
    print("🚀 Starting Google Reviews Enrichment")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)

    # Load environment variables
    try:
        from dotenv import load_dotenv

        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("⚠️  python-dotenv not available, using system environment")

    # Check for API key
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("❌ GOOGLE_PLACES_API_KEY environment variable not set")
        return False

    print(f"✅ Google Places API key found (length: {len(api_key)})")

    # Get initial statistics
    print("\n📊 Initial Statistics:")
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        if db_manager.connect():
            stats = db_manager.get_google_reviews_statistics()
            print(f"   Total restaurants: {stats.get('total_restaurants')}")
            print(f"   With reviews: {stats.get('restaurants_with_reviews')}")
            print(f"   Without reviews: {stats.get('restaurants_without_reviews')}")
            print(f"   Coverage: {stats.get('coverage_percentage')}%")
            db_manager.disconnect()
    except Exception as e:
        print(f"   ⚠️  Could not get initial statistics: {e}")

    # Start enrichment process
    total_processed = 0
    total_success = 0
    total_errors = 0

    results = {"success": [], "no_place_id": [], "no_reviews": [], "errors": []}

    while total_processed < max_total:
        print(f"\n🔄 Processing batch {total_processed // batch_size + 1}...")

        # Get restaurants without reviews
        restaurants = get_restaurants_without_reviews(batch_size)
        if not restaurants:
            print("✅ No more restaurants without reviews!")
            break

        print(f"📋 Found {len(restaurants)} restaurants to process")

        batch_results = []
        for i, restaurant in enumerate(restaurants, 1):
            print(f"\n[{i}/{len(restaurants)}] Processing restaurant...")

            result = enrich_restaurant_reviews(restaurant)
            batch_results.append(result)

            # Categorize results
            if result["status"] == "success":
                results["success"].append(result)
                total_success += 1
            elif result["status"] == "no_place_id":
                results["no_place_id"].append(result)
            elif result["status"] == "no_reviews":
                results["no_reviews"].append(result)
            else:
                results["errors"].append(result)
                total_errors += 1

            total_processed += 1

            # Rate limiting
            if i < len(restaurants):  # Don't sleep after the last one
                print("   ⏳ Waiting 2 seconds for rate limiting...")
                time.sleep(2)

        # Print batch summary
        batch_success = len([r for r in batch_results if r["status"] == "success"])
        print(f"\n📊 Batch Summary:")
        print(f"   Processed: {len(batch_results)}")
        print(f"   Success: {batch_success}")
        print(
            f"   No Place ID: {len([r for r in batch_results if r['status'] == 'no_place_id'])}"
        )
        print(
            f"   No Reviews: {len([r for r in batch_results if r['status'] == 'no_reviews'])}"
        )
        print(
            f"   Errors: {len([r for r in batch_results if r['status'] not in ['success', 'no_place_id', 'no_reviews']])}"
        )

        # Check if we should continue
        if len(restaurants) < batch_size:
            print("✅ No more restaurants to process!")
            break

    # Print final summary
    print(f"\n🎉 Enrichment Process Complete!")
    print("=" * 60)
    print(f"📊 Final Statistics:")
    print(f"   Total Processed: {total_processed}")
    print(f"   Successful: {total_success}")
    print(f"   No Place ID: {len(results['no_place_id'])}")
    print(f"   No Reviews: {len(results['no_reviews'])}")
    print(f"   Errors: {len(results['errors'])}")

    # Show some successful examples
    if results["success"]:
        print(f"\n✅ Successful Enrichments (showing first 5):")
        for result in results["success"][:5]:
            print(
                f"   - {result['name']}: {result['reviews_count']} reviews, {result['overall_rating']} stars"
            )

    # Show some failed examples
    if results["no_place_id"]:
        print(f"\n🔍 Restaurants without Google Places ID (showing first 3):")
        for result in results["no_place_id"][:3]:
            print(f"   - {result['name']}: {result['error']}")

    # Get final statistics
    print(f"\n📊 Updated Statistics:")
    try:
        db_manager = EnhancedDatabaseManager()
        if db_manager.connect():
            stats = db_manager.get_google_reviews_statistics()
            print(f"   Total restaurants: {stats.get('total_restaurants')}")
            print(f"   With reviews: {stats.get('restaurants_with_reviews')}")
            print(f"   Without reviews: {stats.get('restaurants_without_reviews')}")
            print(f"   Coverage: {stats.get('coverage_percentage')}%")
            db_manager.disconnect()
    except Exception as e:
        print(f"   ⚠️  Could not get final statistics: {e}")

    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Enrich restaurants with Google reviews"
    )
    parser.add_argument(
        "--batch-size", type=int, default=20, help="Batch size (default: 20)"
    )
    parser.add_argument(
        "--max-total",
        type=int,
        default=100,
        help="Maximum total restaurants to process (default: 100)",
    )

    args = parser.parse_args()

    success = run_enrichment(args.batch_size, args.max_total)

    if success:
        print("\n🎉 Enrichment completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Enrichment failed!")
        sys.exit(1)
