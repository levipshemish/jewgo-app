#!/usr/bin/env python3
"""Add sample mikvah data to the database for testing."""
import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime

def add_mikvah_sample_data():
    """Add sample mikvahs to the database."""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("Error: DATABASE_URL environment variable is required")
            return False
        print(f"Adding sample mikvah data to: {database_url}")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Sample mikvah data
        sample_mikvahs = [
            {
                "name": "Miami Community Mikvah",
                "description": "Beautiful community mikvah with modern facilities and experienced attendants",
                "address": "321 Ocean Drive",
                "city": "Miami Beach",
                "state": "FL",
                "zip_code": "33139",
                "country": "USA",
                "latitude": 25.7907,
                "longitude": -80.1300,
                "phone_number": "(305) 555-0321",
                "website": "https://miamimikvah.com",
                "email": "info@miamimikvah.com",
                "mikvah_type": "women",
                "business_hours": "Mon-Thu: 6:00 AM - 10:00 PM, Fri: 6:00 AM - 2:00 PM, Sun: 7:00 AM - 9:00 PM",
                "has_parking": True,
                "has_disabled_access": True,
                "has_changing_rooms": True,
                "has_towels_provided": True,
                "has_soap_provided": True,
                "has_hair_dryers": True,
                "requires_appointment": True,
                "walk_in_available": False,
                "fee_amount": 15.00,
                "fee_currency": "USD",
                "accepts_credit_cards": True,
                "accepts_cash": True,
                "rating": 4.5,
                "review_count": 12,
                "star_rating": 4.5,
                "is_active": True,
                "is_verified": True,
                "tags": ["community", "modern", "orthodox"],
                "listing_type": "mikvah"
            },
            {
                "name": "Aventura Mikvah Center",
                "description": "Private mikvah facility with luxury amenities and professional attendants",
                "address": "456 Aventura Blvd",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "country": "USA",
                "latitude": 25.9564,
                "longitude": -80.1392,
                "phone_number": "(305) 555-0456",
                "website": "https://aventuramikvah.com",
                "email": "info@aventuramikvah.com",
                "mikvah_type": "women",
                "business_hours": "Mon-Thu: 7:00 AM - 11:00 PM, Fri: 7:00 AM - 3:00 PM, Sun: 8:00 AM - 10:00 PM",
                "has_parking": True,
                "has_disabled_access": True,
                "has_changing_rooms": True,
                "has_towels_provided": True,
                "has_soap_provided": True,
                "has_hair_dryers": True,
                "requires_appointment": True,
                "walk_in_available": False,
                "fee_amount": 25.00,
                "fee_currency": "USD",
                "accepts_credit_cards": True,
                "accepts_cash": True,
                "rating": 4.8,
                "review_count": 8,
                "star_rating": 4.8,
                "is_active": True,
                "is_verified": True,
                "tags": ["luxury", "private", "orthodox"],
                "listing_type": "mikvah"
            },
            {
                "name": "Boca Raton Community Mikvah",
                "description": "Welcoming community mikvah serving the Boca Raton Jewish community",
                "address": "789 Glades Road",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "country": "USA",
                "latitude": 26.3683,
                "longitude": -80.1289,
                "phone_number": "(561) 555-0789",
                "website": "https://bocamikvah.com",
                "email": "info@bocamikvah.com",
                "mikvah_type": "women",
                "business_hours": "Mon-Thu: 6:30 AM - 9:30 PM, Fri: 6:30 AM - 2:30 PM, Sun: 7:30 AM - 8:30 PM",
                "has_parking": True,
                "has_disabled_access": True,
                "has_changing_rooms": True,
                "has_towels_provided": False,
                "has_soap_provided": True,
                "has_hair_dryers": True,
                "requires_appointment": False,
                "walk_in_available": True,
                "fee_amount": 10.00,
                "fee_currency": "USD",
                "accepts_credit_cards": False,
                "accepts_cash": True,
                "rating": 4.2,
                "review_count": 15,
                "star_rating": 4.2,
                "is_active": True,
                "is_verified": True,
                "tags": ["community", "welcoming", "orthodox"],
                "listing_type": "mikvah"
            }
        ]
        
        # Insert mikvahs
        with engine.connect() as conn:
            for mikvah in sample_mikvahs:
                try:
                    # Check if mikvah already exists
                    result = conn.execute(text("""
                        SELECT id FROM mikvah 
                        WHERE name = :name AND address = :address
                    """), {
                        "name": mikvah["name"],
                        "address": mikvah["address"]
                    }).fetchone()
                    
                    if result:
                        print(f"⚠️  Mikvah already exists: {mikvah['name']}")
                        continue
                    
                    # Insert new mikvah
                    conn.execute(text("""
                        INSERT INTO mikvah (
                            name, description, address, city, state, zip_code, country,
                            latitude, longitude, phone_number, website, email,
                            mikvah_type, business_hours,
                            has_parking, has_disabled_access, has_changing_rooms,
                            has_towels_provided, has_soap_provided, has_hair_dryers,
                            requires_appointment, walk_in_available,
                            fee_amount, fee_currency, accepts_credit_cards, accepts_cash,
                            rating, review_count, star_rating,
                            is_active, is_verified, tags, listing_type,
                            created_at, updated_at
                        ) VALUES (
                            :name, :description, :address, :city, :state, :zip_code, :country,
                            :latitude, :longitude, :phone_number, :website, :email,
                            :mikvah_type, :business_hours,
                            :has_parking, :has_disabled_access, :has_changing_rooms,
                            :has_towels_provided, :has_soap_provided, :has_hair_dryers,
                            :requires_appointment, :walk_in_available,
                            :fee_amount, :fee_currency, :accepts_credit_cards, :accepts_cash,
                            :rating, :review_count, :star_rating,
                            :is_active, :is_verified, :tags, :listing_type,
                            :created_at, :updated_at
                        )
                    """), {
                        **mikvah,
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                    conn.commit()
                    print(f"✅ Added mikvah: {mikvah['name']}")
                    
                except Exception as e:
                    print(f"⚠️  Failed to add mikvah {mikvah['name']}: {e}")
                    conn.rollback()
        
        print("✅ Sample mikvah data addition completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Sample mikvah data addition failed: {e}")
        return False

if __name__ == "__main__":
    success = add_mikvah_sample_data()
    sys.exit(0 if success else 1)
