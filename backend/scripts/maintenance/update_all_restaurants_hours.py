import os
import sys
import time
from dotenv import load_dotenv

from database.google_places_manager import GooglePlacesManager, GooglePlacesData
from database.database_manager_v3 import EnhancedDatabaseManager

        
        
            import json
        from datetime import datetime



        from sqlalchemy import text
        import requests

#!/usr/bin/env python3
"""
Update all restaurants with hours information from Google Places.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def get_restaurants_without_hours():
    """Get restaurants that don't have hours information."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
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
        
        # Get restaurants without hours data
        query = text("""
        SELECT id, name, address 
        FROM restaurants 
        WHERE (hours_json IS NULL OR hours_json::text = '' OR hours_json::text = 'null')
        AND (hours_of_operation IS NULL OR hours_of_operation = '')
        ORDER BY id
        """)
        
        with db_manager.get_session() as session:
            result = session.execute(query)
            restaurants = result.fetchall()
        
        print(f"📊 Found {len(restaurants)} restaurants without hours data")
        return restaurants
        
    except Exception as e:
        print(f"❌ Error getting restaurants: {e}")
        return []
    finally:
        db_manager.disconnect()

def fetch_hours_for_restaurant(restaurant_id, name, address):
    """Fetch hours information for a specific restaurant using Google Places API."""
    
    try:
        # Search for the restaurant using Google Places API
        search_query = f"{name} {address}" if address else name
        
        # Use the Google Places API to search for the restaurant
        api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        if not api_key:
            print("❌ GOOGLE_PLACES_API_KEY not found")
            return None
        
        # Make API call to Google Places
        # First, search for the place
        search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        search_params = {
            'query': search_query,
            'key': api_key,
            'type': 'restaurant'
        }
        
        response = requests.get(search_url, params=search_params)
        data = response.json()
        
        if data.get('status') == 'OK' and data.get('results'):
            # Get the first result
            place = data['results'][0]
            place_id = place['place_id']
            
            # Get detailed place information
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                'place_id': place_id,
                'key': api_key,
                'fields': 'opening_hours,formatted_address,website'
            }
            
            details_response = requests.get(details_url, params=details_params)
            details_data = details_response.json()
            
            if details_data.get('status') == 'OK':
                place_details = details_data['result']
                return {
                    'place_id': place_id,
                    'opening_hours': place_details.get('opening_hours'),
                    'formatted_address': place_details.get('formatted_address'),
                    'website': place_details.get('website')
                }
            else:
                print(f"❌ Failed to get place details for {name}: {details_data.get('status')}")
                return None
        else:
            print(f"❌ No Google Places results found for {name}: {data.get('status')}")
            return None
            
    except Exception as e:
        print(f"❌ Error fetching hours for {name}: {e}")
        return None

def update_restaurant_hours(restaurant_id, hours_data):
    """Update a restaurant with hours information."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    # Initialize database manager
    db_manager = EnhancedDatabaseManager(database_url)
    
    try:
        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return False
        
        # Prepare update data
        update_data = {}
        
        if hours_data.get('opening_hours'):
            # Convert opening hours to JSON format
            hours_json = json.dumps(hours_data['opening_hours'])
            update_data['hours_json'] = hours_json
            
            # Also create a human-readable format
            if hours_data['opening_hours'].get('weekday_text'):
                hours_text = '\n'.join(hours_data['opening_hours']['weekday_text'])
                update_data['hours_of_operation'] = hours_text
        
        if hours_data.get('formatted_address'):
            update_data['formatted_address'] = hours_data['formatted_address']
        
        if hours_data.get('website'):
            update_data['website'] = hours_data['website']
        
        # Add Google Place ID if we have it
        if hours_data.get('place_id'):
            update_data['google_place_id'] = hours_data['place_id']
        
        # Add timestamp
        update_data['last_google_sync_at'] = datetime.utcnow()
        
        # Update the restaurant
        if update_data:
            success = db_manager.update_restaurant_data(restaurant_id, update_data)
            return success
        else:
            print(f"⚠️  No data to update for restaurant {restaurant_id}")
            return False
        
    except Exception as e:
        print(f"❌ Error updating restaurant {restaurant_id}: {e}")
        return False
    finally:
        db_manager.disconnect()

def update_all_restaurants_hours():
    """Update all restaurants with hours information."""
    
    # Get restaurants without hours
    restaurants = get_restaurants_without_hours()
    
    if not restaurants:
        print("✅ All restaurants already have hours data")
        return
    
    print(f"🔄 Starting hours update for {len(restaurants)} restaurants...")
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    for i, restaurant in enumerate(restaurants, 1):
        restaurant_id, name, address = restaurant
        
        print(f"🔄 [{i}/{len(restaurants)}] Processing: {name}")
        
        try:
            # Fetch hours data
            hours_data = fetch_hours_for_restaurant(restaurant_id, name, address)
            
            if hours_data and hours_data.get('opening_hours'):
                # Update the restaurant
                if update_restaurant_hours(restaurant_id, hours_data):
                    print(f"✅ Updated hours for: {name}")
                    success_count += 1
                else:
                    print(f"❌ Failed to update hours for: {name}")
                    error_count += 1
            else:
                print(f"⚠️  No hours data found for: {name}")
                skipped_count += 1
            
            # Add delay to respect API rate limits
            time.sleep(0.2)
            
        except Exception as e:
            print(f"❌ Error processing {name}: {e}")
            error_count += 1
    
    print(f"\n📊 Hours update completed!")
    print(f"   Successful: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Skipped (no hours): {skipped_count}")
    print(f"   Total processed: {len(restaurants)}")

if __name__ == "__main__":
    update_all_restaurants_hours()
