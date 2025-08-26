#!/usr/bin/env python3
"""
Populate Google Places data for existing restaurants.
"""

import os
import sys
import time

from database.database_manager_v3 import EnhancedDatabaseManager
from database.google_places_manager import GooglePlacesManager
from dotenv import load_dotenv
from sqlalchemy import text
from utils.http_client import get_http_client

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def get_restaurants_without_google_data():
    """Get restaurants that don't have Google Places data."""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return []

    # Initialize database manager
    db_manager = EnhancedDatabaseManager(database_url)

    try:
        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return []

        print("✅ Connected to database")

        # Get restaurants without Google Places data
        query = text(
            """
        SELECT id, name, address 
        FROM restaurants 
        WHERE google_place_id IS NULL 
        OR google_place_id = ''
        ORDER BY id
        LIMIT 50
        """
        )

        with db_manager.get_session() as session:
            result = session.execute(query)
            restaurants = result.fetchall()

        print(f"📊 Found {len(restaurants)} restaurants without Google Places data")
        return restaurants

    except Exception as e:
        print(f"❌ Error getting restaurants: {e}")
        return []
    finally:
        db_manager.disconnect()


def populate_google_places_data():
    """Populate Google Places data for restaurants."""

    # Get restaurants without Google data
    restaurants = get_restaurants_without_google_data()

    if not restaurants:
        print("✅ All restaurants already have Google Places data")
        return

    # Initialize Google Places manager
    database_url = os.getenv("DATABASE_URL")
    google_manager = GooglePlacesManager(database_url)

    if not google_manager.connect():
        print("❌ Failed to connect to Google Places manager")
        return

    print("✅ Connected to Google Places manager")

    # Process each restaurant
    success_count = 0
    error_count = 0

    for restaurant in restaurants:
        restaurant_id, name, address = restaurant

        print(f"🔄 Processing restaurant {restaurant_id}: {name}")

        try:
            # Search for the restaurant using Google Places API
            search_query = f"{name} {address}" if address else name

            # Use the Google Places API to search for the restaurant
            api_key = os.getenv("GOOGLE_PLACES_API_KEY")
            if not api_key:
                print("❌ GOOGLE_PLACES_API_KEY not found")
                break

            # Make API call to Google Places
            # First, search for the place
            search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            search_params = {
                "query": search_query,
                "key": api_key,
                "type": "restaurant",
            }

            http_client = get_http_client()
            response = http_client.get(search_url, params=search_params)
            data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                # Get the first result
                place = data["results"][0]
                place_id = place["place_id"]

                # Get detailed place information
                details_url = "https://maps.googleapis.com/maps/api/place/details/json"
                details_params = {
                    "place_id": place_id,
                    "key": api_key,
                    "fields": "name,formatted_address,website,opening_hours,rating,user_ratings_total,price_level,geometry,photos,types",
                }

                details_response = http_client.get(details_url, params=details_params)
                details_data = details_response.json()

                if details_data.get("status") == "OK":
                    place_details = details_data["result"]

                    # Store the place data
                    if google_manager.store_place_data(
                        restaurant_id, place_details, place_id
                    ):
                        print(f"✅ Successfully stored Google Places data for {name}")
                        success_count += 1
                    else:
                        print(f"❌ Failed to store Google Places data for {name}")
                        error_count += 1
                else:
                    print(
                        f"❌ Failed to get place details for {name}: {details_data.get('status')}"
                    )
                    error_count += 1
            else:
                print(
                    f"❌ No Google Places results found for {name}: {data.get('status')}"
                )
                error_count += 1

            # Add delay to respect API rate limits
            time.sleep(0.2)

        except Exception as e:
            print(f"❌ Error processing {name}: {e}")
            error_count += 1

    print(f"\n📊 Population completed!")
    print(f"   Successful: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Total processed: {len(restaurants)}")

    # Disconnect
    google_manager.disconnect()


if __name__ == "__main__":
    populate_google_places_data()
