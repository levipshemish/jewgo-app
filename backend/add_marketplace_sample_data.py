#!/usr/bin/env python3
"""
Add Sample Marketplace Data
===========================

This script adds sample marketplace data to test the marketplace functionality.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

def get_database_url():
    """Get database URL from environment variables."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        # Try reading from .env file
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    
    if not db_url:
        print("❌ No database URL found")
        return None
    
    # Convert psycopg:// to postgresql:// for SQLAlchemy
    if db_url.startswith('postgresql+psycopg://'):
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    
    return db_url

def add_sample_data():
    """Add sample marketplace data."""
    db_url = get_database_url()
    if not db_url:
        return
    
    try:
        print(f"🔗 Connecting to database...")
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("✅ Connected successfully!")
            
            # Sample marketplace data
            sample_data = [
                {
                    "name": "Kosher Challah Bread",
                    "title": "Fresh Homemade Challah Bread",
                    "price": 8.99,
                    "category": "Bakery",
                    "location": "123 Main St, Brooklyn, NY 11201",
                    "vendor_name": "Brooklyn Kosher Bakery",
                    "city": "Brooklyn",
                    "state": "NY",
                    "zip_code": "11201",
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "product_image": "https://example.com/challah.jpg",
                    "subcategory": "Bread",
                    "description": "Fresh homemade challah bread made with premium ingredients. Perfect for Shabbat and holidays.",
                    "currency": "USD",
                    "stock": 50,
                    "is_available": True,
                    "is_featured": True,
                    "is_on_sale": False,
                    "discount_percentage": 0,
                    "vendor_id": "vendor_001",
                    "kosher_agency": "OU",
                    "kosher_level": "regular",
                    "rating": 4.8,
                    "review_count": 25,
                    "vendor_review_count": 25,
                    "vendor_is_verified": True,
                    "vendor_is_premium": False,
                    "kosher_is_verified": True,
                    "status": "active"
                },
                {
                    "name": "Glatt Kosher Beef Brisket",
                    "title": "Premium Glatt Kosher Beef Brisket",
                    "price": 45.99,
                    "category": "Meat",
                    "location": "456 Oak Ave, Queens, NY 11375",
                    "vendor_name": "Queens Kosher Butcher",
                    "city": "Queens",
                    "state": "NY",
                    "zip_code": "11375",
                    "latitude": 40.7282,
                    "longitude": -73.7949,
                    "product_image": "https://example.com/brisket.jpg",
                    "subcategory": "Beef",
                    "description": "Premium glatt kosher beef brisket, perfect for slow cooking and smoking.",
                    "currency": "USD",
                    "stock": 20,
                    "is_available": True,
                    "is_featured": False,
                    "is_on_sale": True,
                    "discount_percentage": 15,
                    "vendor_id": "vendor_002",
                    "kosher_agency": "OU",
                    "kosher_level": "glatt",
                    "rating": 4.9,
                    "review_count": 42,
                    "vendor_review_count": 42,
                    "vendor_is_verified": True,
                    "vendor_is_premium": False,
                    "kosher_is_verified": True,
                    "status": "active"
                },
                {
                    "name": "Chalav Yisrael Milk",
                    "title": "Fresh Chalav Yisrael Whole Milk",
                    "price": 6.49,
                    "category": "Dairy",
                    "location": "789 Pine St, Manhattan, NY 10001",
                    "vendor_name": "Manhattan Dairy",
                    "city": "Manhattan",
                    "state": "NY",
                    "zip_code": "10001",
                    "latitude": 40.7505,
                    "longitude": -73.9934,
                    "product_image": "https://example.com/milk.jpg",
                    "subcategory": "Milk",
                    "description": "Fresh chalav yisrael whole milk from local farms. Certified kosher.",
                    "currency": "USD",
                    "stock": 100,
                    "is_available": True,
                    "is_featured": False,
                    "is_on_sale": False,
                    "discount_percentage": 0,
                    "vendor_id": "vendor_003",
                    "kosher_agency": "OU",
                    "kosher_level": "chalav_yisrael",
                    "rating": 4.7,
                    "review_count": 18,
                    "vendor_review_count": 18,
                    "vendor_is_verified": True,
                    "vendor_is_premium": False,
                    "kosher_is_verified": True,
                    "status": "active"
                }
            ]
            
            # Insert sample data
            for item in sample_data:
                insert_query = text("""
                    INSERT INTO marketplace (
                        name, title, price, category, location, vendor_name, city, state, zip_code,
                        latitude, longitude, product_image, subcategory, description, currency,
                        stock, is_available, is_featured, is_on_sale, discount_percentage,
                        vendor_id, kosher_agency, kosher_level, rating, review_count, vendor_review_count, vendor_is_verified, vendor_is_premium, kosher_is_verified, is_gluten_free, is_dairy_free, is_nut_free, is_vegan, is_vegetarian, priority, source, status,
                        created_at, updated_at
                    ) VALUES (
                        :name, :title, :price, :category, :location, :vendor_name, :city, :state, :zip_code,
                        :latitude, :longitude, :product_image, :subcategory, :description, :currency,
                        :stock, :is_available, :is_featured, :is_on_sale, :discount_percentage,
                        :vendor_id, :kosher_agency, :kosher_level, :rating, :review_count, :vendor_review_count, :vendor_is_verified, :vendor_is_premium, :kosher_is_verified, :is_gluten_free, :is_dairy_free, :is_nut_free, :is_vegan, :is_vegetarian, :priority, :source, :status,
                        :created_at, :updated_at
                    )
                """)
                
                now = datetime.now(timezone.utc)
                conn.execute(insert_query, {
                    **item,
                    "is_gluten_free": False,
                    "is_dairy_free": False,
                    "is_nut_free": False,
                    "is_vegan": False,
                    "is_vegetarian": False,
                    "priority": 1,
                    "source": "manual",
                    "created_at": now,
                    "updated_at": now
                })
                print(f"✅ Added: {item['title']}")
            
            conn.commit()
            print(f"\n🎉 Successfully added {len(sample_data)} sample marketplace items!")
            
            # Verify the data was added
            result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
            count = result.scalar()
            print(f"📊 Total marketplace items: {count}")
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    add_sample_data()
