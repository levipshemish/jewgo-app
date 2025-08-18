import os
import sys
from dotenv import load_dotenv

from database.google_places_manager import GooglePlacesManager, GooglePlacesData
from database.database_manager_v3 import EnhancedDatabaseManager





#!/usr/bin/env python3
"""
Update restaurants table with Google Places data.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def update_restaurants_with_google_data():
    """Update restaurants table with Google Places data."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Initialize managers
    google_manager = GooglePlacesManager(database_url)
    db_manager = EnhancedDatabaseManager(database_url)
    
    # Connect to databases
    if not google_manager.connect():
        print("❌ Failed to connect to Google Places manager")
        return
    
    if not db_manager.connect():
        print("❌ Failed to connect to database manager")
        return
    
    print("✅ Connected to both managers")
    
    # Get all Google Places data
    try:
        session = google_manager.get_session()
        google_data = session.query(GooglePlacesData).filter_by(is_active=True).all()
        session.close()
        
        print(f"📊 Found {len(google_data)} Google Places records")
        
        success_count = 0
        error_count = 0
        
        for place_data in google_data:
            try:
                # Get the restaurant data
                restaurant = db_manager.get_restaurant_by_id(place_data.restaurant_id)
                if not restaurant:
                    print(f"⚠️  Restaurant {place_data.restaurant_id} not found")
                    continue
                
                # Prepare update data
                update_data = {}
                
                # Update Google Places fields
                if place_data.google_place_id:
                    update_data['google_place_id'] = place_data.google_place_id
                
                if place_data.formatted_address:
                    update_data['formatted_address'] = place_data.formatted_address
                
                if place_data.website:
                    update_data['website'] = place_data.website
                
                if place_data.hours_json:
                    update_data['hours_json'] = place_data.hours_json
                
                if place_data.rating:
                    update_data['google_rating'] = place_data.rating
                
                if place_data.user_ratings_total:
                    update_data['google_review_count'] = place_data.user_ratings_total
                
                if place_data.latitude and place_data.longitude:
                    update_data['latitude'] = place_data.latitude
                    update_data['longitude'] = place_data.longitude
                
                if place_data.timezone:
                    update_data['timezone'] = place_data.timezone
                
                # Add timestamp
                update_data['last_google_sync_at'] = place_data.last_updated
                
                # Update the restaurant
                if update_data:
                    if db_manager.update_restaurant_data(place_data.restaurant_id, update_data):
                        print(f"✅ Updated restaurant {place_data.restaurant_id}: {restaurant.get('name', 'Unknown')}")
                        success_count += 1
                    else:
                        print(f"❌ Failed to update restaurant {place_data.restaurant_id}")
                        error_count += 1
                else:
                    print(f"⚠️  No data to update for restaurant {place_data.restaurant_id}")
                
            except Exception as e:
                print(f"❌ Error updating restaurant {place_data.restaurant_id}: {e}")
                error_count += 1
        
        print(f"\n📊 Update completed!")
        print(f"   Successful: {success_count}")
        print(f"   Errors: {error_count}")
        print(f"   Total processed: {len(google_data)}")
        
    except Exception as e:
        print(f"❌ Error getting Google Places data: {e}")
    
    # Disconnect
    google_manager.disconnect()
    db_manager.disconnect()
    print("✅ Disconnected from databases")

if __name__ == "__main__":
    update_restaurants_with_google_data()
