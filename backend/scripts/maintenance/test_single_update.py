import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

from database.database_manager_v3 import EnhancedDatabaseManager





#!/usr/bin/env python3
"""
Test updating a single restaurant with hours data.
"""

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_single_update():
    """Test updating a single restaurant with hours data."""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Initialize database manager
    db_manager = EnhancedDatabaseManager(database_url)
    
    try:
        # Connect to database
        if not db_manager.connect():
            print("❌ Failed to connect to database")
            return
        
        print("✅ Connected to database")
        
        # Test data
        test_hours = {
            "open_now": True,
            "periods": [
                {
                    "close": {"day": 1, "time": "2200"},
                    "open": {"day": 0, "time": "0900"}
                }
            ],
            "weekday_text": [
                "Monday: 9:00 AM – 10:00 PM",
                "Tuesday: 9:00 AM – 10:00 PM"
            ]
        }
        
        # Prepare update data
        update_data = {
            'hours_json': json.dumps(test_hours),
            'hours_of_operation': '\n'.join(test_hours['weekday_text']),
            'google_place_id': 'TEST_PLACE_ID_123',
            'formatted_address': '123 Test Street, Miami, FL 33139, USA',
            'last_google_sync_at': datetime.utcnow()
        }
        
        # Update restaurant ID 1468 (Hollywood Deli)
        restaurant_id = 1468
        
        print(f"🔄 Updating restaurant {restaurant_id} with test data...")
        
        # Update the restaurant
        success = db_manager.update_restaurant_data(restaurant_id, update_data)
        
        if success:
            print(f"✅ Successfully updated restaurant {restaurant_id}")
            
            # Verify the update
            restaurant = db_manager.get_restaurant_by_id(restaurant_id)
            if restaurant:
                print(f"\n📊 Verification - Restaurant {restaurant_id}:")
                print(f"   Name: {restaurant.get('name')}")
                print(f"   hours_json: {restaurant.get('hours_json')}")
                print(f"   hours_of_operation: {restaurant.get('hours_of_operation')}")
                print(f"   google_place_id: {restaurant.get('google_place_id')}")
                print(f"   formatted_address: {restaurant.get('formatted_address')}")
                print(f"   last_google_sync_at: {restaurant.get('last_google_sync_at')}")
            else:
                print("❌ Could not retrieve updated restaurant data")
        else:
            print(f"❌ Failed to update restaurant {restaurant_id}")
        
    except Exception as e:
        print(f"❌ Error in test update: {e}")
    finally:
        db_manager.disconnect()

if __name__ == "__main__":
    test_single_update()
