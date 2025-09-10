#!/usr/bin/env python3
"""Simple Database Initialization Script for JewGo
Creates PostgreSQL database with sample data for development.
"""
import os
import sys
from sqlalchemy import create_engine, text
from database.models import Base
from database.database_manager_v4 import DatabaseManager as EnhancedDatabaseManager

def init_database():
    """Initialize the PostgreSQL database with tables and sample data."""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("Error: DATABASE_URL environment variable is required")
            return False
        print(f"Initializing database: {database_url}")
        
        # Create engine and tables
        engine = create_engine(database_url)
        Base.metadata.create_all(engine)
        print("✅ Database tables created successfully")
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection test successful")
        
        # Initialize database manager
        db_manager = EnhancedDatabaseManager(database_url)
        if db_manager.connect():
            print("✅ Database manager connected successfully")
            
            # Add sample restaurants
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
            
            for restaurant in sample_restaurants:
                try:
                    db_manager.add_restaurant(restaurant)
                    print(f"✅ Added restaurant: {restaurant['name']}")
                except Exception as e:
                    print(f"⚠️  Failed to add restaurant {restaurant['name']}: {e}")
            
            print("✅ Database initialization completed successfully")
            return True
        else:
            print("❌ Failed to connect database manager")
            return False
            
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
