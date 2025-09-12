#!/usr/bin/env python3
"""Add sample data to the database for testing."""
import os
import sys
import uuid
from sqlalchemy import create_engine, text
from datetime import datetime

def add_sample_data():
    """Add sample restaurants to the database."""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("Error: DATABASE_URL environment variable is required")
            return False
        print(f"Adding sample data to: {database_url}")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Sample restaurants data
        sample_restaurants = [
            {
                "name": "Kosher Deli & Grill",
                "address": "123 Main St, Miami, FL",
                "phone": "(305) 555-0123",
                "website": "https://kosherdeli.com",
                "cuisine": "American",
                "kosher_category": "Glatt Kosher",
                "rating": 4.5,
                "google_rating": 4.5,
                "price_range": "$$",
                "image_url": "/images/default-restaurant.webp",
                "is_open": True,
                "latitude": 25.7617,
                "longitude": -80.1918
            },
            {
                "name": "Jerusalem Pizza",
                "address": "456 Ocean Dr, Miami Beach, FL",
                "phone": "(305) 555-0456",
                "website": "https://jerusalempizza.com",
                "cuisine": "Pizza",
                "kosher_category": "Kosher",
                "rating": 4.2,
                "google_rating": 4.2,
                "price_range": "$",
                "image_url": "/images/default-restaurant.webp",
                "is_open": True,
                "latitude": 25.7907,
                "longitude": -80.1300
            },
            {
                "name": "Shalom Sushi",
                "address": "789 Aventura Blvd, Aventura, FL",
                "phone": "(305) 555-0789",
                "website": "https://shalomsushi.com",
                "cuisine": "Japanese",
                "kosher_category": "Glatt Kosher",
                "rating": 4.7,
                "google_rating": 4.7,
                "price_range": "$$$",
                "image_url": "/images/default-restaurant.webp",
                "is_open": True,
                "latitude": 25.9564,
                "longitude": -80.1392
            }
        ]
        
        # Insert restaurants
        with engine.connect() as conn:
            for restaurant in sample_restaurants:
                try:
                    # Check if restaurant already exists
                    result = conn.execute(text("""
                        SELECT id FROM listings 
                        WHERE title = :title AND address = :address
                    """), {
                        "title": restaurant["name"],
                        "address": restaurant["address"]
                    }).fetchone()
                    
                    if result:
                        print(f"⚠️  Restaurant already exists: {restaurant['name']}")
                        continue
                    
                    # Insert new restaurant
                    conn.execute(text("""
                        INSERT INTO listings (
                            id, title, description, address, city, state, phone, website,
                            rating, is_active, created_at, updated_at, location
                        ) VALUES (
                            :id, :title, :description, :address, :city, :state, :phone, :website,
                            :rating, :is_active, :created_at, :updated_at, :location
                        )
                    """), {
                        "id": str(uuid.uuid4()),
                        "title": restaurant["name"],
                        "description": f"{restaurant['cuisine']} restaurant - {restaurant['kosher_category']}",
                        "address": restaurant["address"],
                        "city": restaurant["address"].split(",")[1].strip() if "," in restaurant["address"] else "Miami",
                        "state": "FL",
                        "phone": restaurant["phone"],
                        "website": restaurant["website"],
                        "rating": restaurant["rating"],
                        "is_active": restaurant["is_open"],
                        "location": f"POINT({restaurant['longitude']} {restaurant['latitude']})",
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                    conn.commit()
                    print(f"✅ Added restaurant: {restaurant['name']}")
                    
                except Exception as e:
                    print(f"⚠️  Failed to add restaurant {restaurant['name']}: {e}")
                    conn.rollback()
        
        print("✅ Sample data addition completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Sample data addition failed: {e}")
        return False

if __name__ == "__main__":
    success = add_sample_data()
    sys.exit(0 if success else 1)
