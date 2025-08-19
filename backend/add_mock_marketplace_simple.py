#!/usr/bin/env python3
"""Simple script to add mock marketplace data."""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_mock_data():
    """Add mock marketplace data to the database."""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    # Convert SQLAlchemy URL to psycopg2 format
    if database_url.startswith('postgresql+psycopg://'):
        database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        
        # Create marketplace table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD',
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                city VARCHAR(100) NOT NULL,
                state VARCHAR(50) NOT NULL,
                zip_code VARCHAR(20),
                vendor_name VARCHAR(255) NOT NULL,
                vendor_phone VARCHAR(50),
                vendor_email VARCHAR(255),
                kosher_agency VARCHAR(100),
                kosher_level VARCHAR(100),
                is_available BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                is_on_sale BOOLEAN DEFAULT FALSE,
                discount_percentage INTEGER DEFAULT 0,
                stock INTEGER DEFAULT 1,
                rating DECIMAL(3,2),
                review_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                thumbnail VARCHAR(500),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        # Create categories table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                sort_order INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                color VARCHAR(7),
                description TEXT,
                icon VARCHAR(100),
                product_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        print("✅ Tables created/verified")
        
        # Drop and recreate tables to ensure correct structure
        cursor.execute("DROP TABLE IF EXISTS marketplace CASCADE")
        cursor.execute("DROP TABLE IF EXISTS categories CASCADE")
        
        # Recreate marketplace table
        cursor.execute("""
            CREATE TABLE marketplace (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD',
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                city VARCHAR(100) NOT NULL,
                state VARCHAR(50) NOT NULL,
                zip_code VARCHAR(20),
                vendor_name VARCHAR(255) NOT NULL,
                vendor_phone VARCHAR(50),
                vendor_email VARCHAR(255),
                kosher_agency VARCHAR(100),
                kosher_level VARCHAR(100),
                is_available BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                is_on_sale BOOLEAN DEFAULT FALSE,
                discount_percentage INTEGER DEFAULT 0,
                stock INTEGER DEFAULT 1,
                rating DECIMAL(3,2),
                review_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                thumbnail VARCHAR(500),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        # Recreate categories table
        cursor.execute("""
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                sort_order INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                color VARCHAR(7),
                description TEXT,
                icon VARCHAR(100),
                product_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        print("✅ Tables recreated with correct structure")
        
        # Add mock categories
        categories = [
            ("Appliances", "appliances", 1, "#3B82F6", "Kitchen and household appliances", "blender", 15),
            ("Vehicles", "vehicles", 2, "#10B981", "Cars, trucks, and other vehicles", "car", 8),
            ("Books", "books", 3, "#F59E0B", "Jewish books, cookbooks, and literature", "book", 25),
            ("Community", "community", 4, "#8B5CF6", "Community services and gemach items", "users", 12),
            ("Electronics", "electronics", 5, "#EF4444", "Computers, phones, and electronics", "smartphone", 20),
            ("Furniture", "furniture", 6, "#84CC16", "Home and office furniture", "sofa", 18),
            ("Clothing", "clothing", 7, "#06B6D4", "Jewish clothing and accessories", "tshirt", 30),
            ("Toys & Games", "toys-games", 8, "#F97316", "Children's toys and educational games", "gamepad-2", 22)
        ]
        
        for name, slug, sort_order, color, description, icon, product_count in categories:
            cursor.execute("""
                INSERT INTO categories (name, slug, sort_order, color, description, icon, product_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (name, slug, sort_order, color, description, icon, product_count))
        
        print(f"✅ Added {len(categories)} categories")
        
        # Add mock listings
        listings = [
            {
                "title": "Kosher Kitchen Appliances Set",
                "description": "Complete set of kosher kitchen appliances including blender, food processor, and mixer. All items are Chalav Yisroel certified and in excellent condition.",
                "price": 299.99,
                "category": "Appliances",
                "subcategory": "Kitchen",
                "city": "Miami",
                "state": "FL",
                "zip_code": "33101",
                "vendor_name": "Kosher Kitchen Supply",
                "vendor_phone": "(305) 555-0123",
                "vendor_email": "info@kosherkitchen.com",
                "kosher_agency": "OU",
                "kosher_level": "Chalav Yisroel",
                "rating": 4.8,
                "review_count": 12,
                "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
                "images": ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop"]
            },
            {
                "title": "2018 Toyota Camry - Kosher Family Car",
                "description": "Well-maintained Toyota Camry perfect for a kosher family. Single owner, no smoking, regularly serviced. Great for carpooling and family trips.",
                "price": 18500.00,
                "category": "Vehicles",
                "subcategory": "Sedan",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33020",
                "vendor_name": "Kosher Auto Sales",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "sales@kosherauto.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_on_sale": True,
                "discount_percentage": 10,
                "rating": 4.9,
                "review_count": 8,
                "thumbnail": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop",
                "images": ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop"]
            },
            {
                "title": "Gemach - Free Loan Items",
                "description": "Community gemach offering free loans of various items including baby equipment, medical supplies, and household items. No cost, just return when done.",
                "price": 0.00,
                "category": "Community",
                "subcategory": "Gemach",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "vendor_name": "Community Gemach",
                "vendor_phone": "(561) 555-0789",
                "vendor_email": "gemach@community.org",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 50,
                "rating": 5.0,
                "review_count": 25,
                "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop",
                "images": ["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop"]
            },
            {
                "title": "Kosher Cookbook Collection",
                "description": "Complete collection of kosher cookbooks including traditional Jewish recipes, modern kosher cooking, and holiday specials. Perfect condition.",
                "price": 45.00,
                "category": "Books",
                "subcategory": "Cookbooks",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "vendor_name": "Jewish Book Store",
                "vendor_phone": "(305) 555-0321",
                "vendor_email": "books@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 3,
                "rating": 4.7,
                "review_count": 15,
                "thumbnail": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop",
                "images": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop"]
            }
        ]
        
        for listing in listings:
            cursor.execute("""
                INSERT INTO marketplace (
                    title, description, price, category, subcategory, city, state, zip_code,
                    vendor_name, vendor_phone, vendor_email, kosher_agency, kosher_level,
                    is_on_sale, discount_percentage, stock, rating, review_count,
                    thumbnail
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                listing["title"], listing["description"], listing["price"], listing["category"],
                listing["subcategory"], listing["city"], listing["state"], listing["zip_code"],
                listing["vendor_name"], listing["vendor_phone"], listing["vendor_email"],
                listing["kosher_agency"], listing["kosher_level"], listing.get("is_on_sale", False),
                listing.get("discount_percentage", 0), listing.get("stock", 1), listing["rating"],
                listing["review_count"], listing["thumbnail"]
            ))
        
        print(f"✅ Added {len(listings)} listings")
        
        # Commit changes
        conn.commit()
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM categories")
        category_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        listing_count = cursor.fetchone()[0]
        
        print(f"✅ Database now contains {category_count} categories and {listing_count} listings")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Adding mock marketplace data...")
    success = add_mock_data()
    if success:
        print("✅ Mock marketplace data added successfully!")
    else:
        print("❌ Failed to add mock marketplace data")
