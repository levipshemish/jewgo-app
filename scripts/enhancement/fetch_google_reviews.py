#!/usr/bin/env python3
"""
Google Reviews Fetcher
=====================

This script fetches Google reviews for restaurants in the database.
It can be run manually or scheduled to keep reviews up to date.

Author: JewGo Development Team
Version: 1.0
"""

import os
import sys
import argparse
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def fetch_reviews_for_restaurant(restaurant_id: int):
    """Fetch Google reviews for a specific restaurant."""
    try:
        from utils.google_places_manager import GooglePlacesManager

        api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            print("❌ GOOGLE_PLACES_API_KEY environment variable not set")
            return False

        google_manager = GooglePlacesManager(api_key)

        print(f"🔄 Fetching Google reviews for restaurant ID: {restaurant_id}")
        success = google_manager.update_restaurant_google_reviews(restaurant_id)

        if success:
            print(
                f"✅ Successfully fetched Google reviews for restaurant {restaurant_id}"
            )
            return True
        else:
            print(f"❌ Failed to fetch Google reviews for restaurant {restaurant_id}")
            return False

    except Exception as e:
        print(f"❌ Error fetching reviews for restaurant {restaurant_id}: {e}")
        return False


def fetch_reviews_batch(batch_size: int = 10):
    """Fetch Google reviews for multiple restaurants in batch."""
    try:
        from utils.google_places_manager import GooglePlacesManager

        api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            print("❌ GOOGLE_PLACES_API_KEY environment variable not set")
            return False

        google_manager = GooglePlacesManager(api_key)

        print(f"🔄 Fetching Google reviews for {batch_size} restaurants...")
        results = google_manager.batch_update_google_reviews(batch_size)

        if results:
            print("✅ Batch update completed:")
            print(f"   Processed: {results.get('processed', 0)}")
            print(f"   Updated: {results.get('updated', 0)}")
            print(f"   Errors: {len(results.get('errors', []))}")

            if results.get("details"):
                print("   Details:")
                for detail in results["details"]:
                    status_emoji = "✅" if detail.get("status") == "updated" else "❌"
                    print(
                        f"     {status_emoji} {detail.get('name')}: {detail.get('status')}"
                    )

            return True
        else:
            print("❌ Batch update failed")
            return False

    except Exception as e:
        print(f"❌ Error during batch update: {e}")
        return False


def show_statistics():
    """Show Google reviews statistics."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()

        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return False

        stats = db_manager.get_google_reviews_statistics()

        if stats:
            print("📊 Google Reviews Statistics:")
            print("=" * 40)
            print(f"Total restaurants: {stats.get('total_restaurants')}")
            print(f"With reviews: {stats.get('restaurants_with_reviews')}")
            print(f"Without reviews: {stats.get('restaurants_without_reviews')}")
            print(f"Coverage: {stats.get('coverage_percentage')}%")
            print(f"Recent updates: {stats.get('recent_reviews_count')}")

            if stats.get("sample_restaurants"):
                print("\n📋 Sample restaurants with reviews:")
                for restaurant in stats["sample_restaurants"]:
                    print(
                        f"   - {restaurant.get('name')}: {restaurant.get('review_count')} reviews, {restaurant.get('overall_rating')} stars"
                    )

            return True
        else:
            print("❌ Could not get statistics")
            return False

    except Exception as e:
        print(f"❌ Error getting statistics: {e}")
        return False


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description="Fetch Google reviews for restaurants")
    parser.add_argument(
        "--restaurant-id", type=int, help="Fetch reviews for specific restaurant ID"
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=10,
        help="Batch size for fetching multiple restaurants (default: 10)",
    )
    parser.add_argument(
        "--stats", action="store_true", help="Show Google reviews statistics"
    )
    parser.add_argument("--test", action="store_true", help="Run test suite")

    args = parser.parse_args()

    print("🚀 Google Reviews Fetcher")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 50)

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
        print("Please set your Google Places API key to use this functionality")
        sys.exit(1)

    success = True

    if args.test:
        print("\n🧪 Running test suite...")
        from test_google_reviews import test_google_reviews, test_batch_update

        success = test_google_reviews() and test_batch_update()

    elif args.stats:
        print("\n📊 Getting statistics...")
        success = show_statistics()

    elif args.restaurant_id:
        print(f"\n🔄 Fetching reviews for restaurant {args.restaurant_id}...")
        success = fetch_reviews_for_restaurant(args.restaurant_id)

    else:
        print(f"\n🔄 Running batch update (size: {args.batch})...")
        success = fetch_reviews_batch(args.batch)

    if success:
        print("\n🎉 Operation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Operation failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
