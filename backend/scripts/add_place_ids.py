#!/usr/bin/env python3
"""
Script to add place_ids to restaurants for testing Google reviews functionality.
"""

import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def add_place_ids():
    """Add place_ids to some restaurants for testing."""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'config.env'))
    
    from database.database_manager_v4 import DatabaseManager
    
    db = DatabaseManager()
    db.connect()
    
    # Sample place_ids for testing (these are real Google Places IDs)
    test_place_ids = [
        "ChIJN1t_tDeuEmsRUsoyG83frY4",  # Google Sydney office
        "ChIJKxjxuxNZwokRjOqQhqJhKqk",  # Another test location
        "ChIJKxjxuxNZwokRjOqQhqJhKqk",  # Another test location
    ]
    
    # Get some restaurants that don't have place_ids
    restaurants = db.get_restaurants(limit=10)
    
    updated_count = 0
    for i, restaurant in enumerate(restaurants):
        if not restaurant.get('place_id') and i < len(test_place_ids):
            success = db.restaurant_repo.update(restaurant['id'], {
                'place_id': test_place_ids[i]
            })
            if success:
                print(f"✓ Added place_id to restaurant {restaurant['id']} ({restaurant['name']})")
                updated_count += 1
            else:
                print(f"✗ Failed to add place_id to restaurant {restaurant['id']}")
    
    print(f"\nUpdated {updated_count} restaurants with place_ids")

if __name__ == "__main__":
    add_place_ids()
