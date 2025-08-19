#!/usr/bin/env python3
"""Comprehensive script to add diverse marketplace sample data to Neon database.

This script adds realistic kosher marketplace listings including:
- Kitchen appliances and cookware
- Jewish books and educational materials
- Community services and gemach items
- Electronics and gadgets
- Furniture and home items
- Clothing and accessories
- Vehicles and transportation
- Toys and games

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
import psycopg2
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

# Load environment variables
load_dotenv()

def add_comprehensive_marketplace_data():
    """Add comprehensive marketplace sample data to the database."""
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
        
        # Comprehensive sample data
        comprehensive_listings = [
            # Kitchen Appliances & Cookware
            {
                "title": "Kosher Kitchen Blender Set - Chalav Yisroel",
                "description": "Professional-grade blender set perfect for kosher kitchen. Includes multiple attachments for smoothies, soups, and food processing. All parts are Chalav Yisroel certified and in excellent condition.",
                "price": 89.99,
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
                "is_on_sale": True,
                "discount_percentage": 15,
                "stock": 3,
                "rating": 4.8,
                "review_count": 18,
                "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
            },
            {
                "title": "Separate Meat & Dairy Cookware Set",
                "description": "Complete set of separate cookware for meat and dairy. Includes pots, pans, utensils, and storage containers. Perfect for maintaining proper kashrut standards.",
                "price": 199.99,
                "category": "Appliances",
                "subcategory": "Kitchen",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33020",
                "vendor_name": "Kosher Home Essentials",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "sales@kosherhome.com",
                "kosher_agency": "Star-K",
                "kosher_level": "Mehadrin",
                "stock": 2,
                "rating": 4.9,
                "review_count": 12,
                "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
            },
            {
                "title": "Kosher Food Processor - Pas Yisroel",
                "description": "High-quality food processor with Pas Yisroel certification. Perfect for chopping, slicing, and food preparation. Includes multiple blades and attachments.",
                "price": 149.99,
                "category": "Appliances",
                "subcategory": "Kitchen",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "vendor_name": "Kosher Appliance Center",
                "vendor_phone": "(561) 555-0789",
                "vendor_email": "appliances@koshercenter.com",
                "kosher_agency": "CRC",
                "kosher_level": "Pas Yisroel",
                "is_featured": True,
                "stock": 1,
                "rating": 4.7,
                "review_count": 8,
                "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
            },
            
            # Jewish Books & Educational Materials
            {
                "title": "Complete Shas Set - Talmud Bavli",
                "description": "Complete set of Talmud Bavli (Babylonian Talmud) in Hebrew and English. Includes all 63 tractates with commentaries. Perfect condition, barely used.",
                "price": 2500.00,
                "category": "Books",
                "subcategory": "Talmud",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "vendor_name": "Jewish Book Store",
                "vendor_phone": "(305) 555-0321",
                "vendor_email": "books@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 1,
                "rating": 5.0,
                "review_count": 3,
                "thumbnail": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop"
            },
            {
                "title": "Kosher Cookbook Collection - 50 Books",
                "description": "Extensive collection of kosher cookbooks including traditional Jewish recipes, modern kosher cooking, holiday specials, and international kosher cuisine.",
                "price": 75.00,
                "category": "Books",
                "subcategory": "Cookbooks",
                "city": "Coral Springs",
                "state": "FL",
                "zip_code": "33065",
                "vendor_name": "Jewish Learning Center",
                "vendor_phone": "(954) 555-0123",
                "vendor_email": "learning@jewishcenter.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 2,
                "rating": 4.6,
                "review_count": 22,
                "thumbnail": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop"
            },
            {
                "title": "Hebrew Learning Materials for Children",
                "description": "Complete set of Hebrew learning materials for children ages 3-12. Includes workbooks, flashcards, games, and audio materials.",
                "price": 45.00,
                "category": "Books",
                "subcategory": "Education",
                "city": "Parkland",
                "state": "FL",
                "zip_code": "33067",
                "vendor_name": "Jewish Education Store",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "education@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_on_sale": True,
                "discount_percentage": 20,
                "stock": 5,
                "rating": 4.8,
                "review_count": 15,
                "thumbnail": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop"
            },
            
            # Community Services & Gemach
            {
                "title": "Community Gemach - Baby Equipment",
                "description": "Free loan of baby equipment including strollers, car seats, high chairs, and playpens. No cost, just return when done. Perfect for families in need.",
                "price": 0.00,
                "category": "Community",
                "subcategory": "Gemach",
                "city": "Miami",
                "state": "FL",
                "zip_code": "33101",
                "vendor_name": "Community Gemach",
                "vendor_phone": "(305) 555-0123",
                "vendor_email": "gemach@community.org",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 25,
                "rating": 5.0,
                "review_count": 45,
                "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop"
            },
            {
                "title": "Medical Equipment Gemach",
                "description": "Free loan of medical equipment including wheelchairs, walkers, crutches, and medical supplies. Available for community members in need.",
                "price": 0.00,
                "category": "Community",
                "subcategory": "Medical",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33020",
                "vendor_name": "Medical Gemach",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "medical@gemach.org",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 15,
                "rating": 5.0,
                "review_count": 32,
                "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop"
            },
            {
                "title": "Shabbat Hospitality Service",
                "description": "Community service providing Shabbat meals and hospitality for visitors and community members in need. Kosher meals prepared in certified kitchens.",
                "price": 0.00,
                "category": "Community",
                "subcategory": "Hospitality",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "vendor_name": "Shabbat Hospitality",
                "vendor_phone": "(561) 555-0789",
                "vendor_email": "shabbat@hospitality.org",
                "kosher_agency": "OU",
                "kosher_level": "Mehadrin",
                "stock": 50,
                "rating": 5.0,
                "review_count": 28,
                "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop"
            },
            
            # Electronics & Gadgets
            {
                "title": "Kosher Smartphone - Separate Apps",
                "description": "Smartphone configured with separate apps and settings for kosher use. Includes kosher apps, prayer times, and Jewish calendar integration.",
                "price": 299.99,
                "category": "Electronics",
                "subcategory": "Mobile",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "vendor_name": "Kosher Tech Solutions",
                "vendor_phone": "(305) 555-0321",
                "vendor_email": "tech@koshersolutions.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_featured": True,
                "stock": 3,
                "rating": 4.7,
                "review_count": 12,
                "thumbnail": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop"
            },
            {
                "title": "Kosher Computer Setup",
                "description": "Computer configured with kosher internet filters and software. Includes parental controls and kosher content filtering.",
                "price": 599.99,
                "category": "Electronics",
                "subcategory": "Computers",
                "city": "Coral Springs",
                "state": "FL",
                "zip_code": "33065",
                "vendor_name": "Kosher Computer Store",
                "vendor_phone": "(954) 555-0123",
                "vendor_email": "computers@kosherstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 2,
                "rating": 4.8,
                "review_count": 8,
                "thumbnail": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop"
            },
            
            # Furniture & Home Items
            {
                "title": "Shabbat Table Set - 8 Person",
                "description": "Beautiful Shabbat table set including table, chairs, and tablecloth. Perfect for hosting Shabbat meals and holidays.",
                "price": 899.99,
                "category": "Furniture",
                "subcategory": "Dining",
                "city": "Parkland",
                "state": "FL",
                "zip_code": "33067",
                "vendor_name": "Jewish Furniture Store",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "furniture@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_on_sale": True,
                "discount_percentage": 25,
                "stock": 1,
                "rating": 4.9,
                "review_count": 6,
                "thumbnail": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
            },
            {
                "title": "Kosher Kitchen Storage Solutions",
                "description": "Complete storage solution for kosher kitchen including separate cabinets for meat and dairy, spice racks, and pantry organizers.",
                "price": 349.99,
                "category": "Furniture",
                "subcategory": "Kitchen",
                "city": "Miami",
                "state": "FL",
                "zip_code": "33101",
                "vendor_name": "Kosher Home Solutions",
                "vendor_phone": "(305) 555-0123",
                "vendor_email": "home@koshersolutions.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 4,
                "rating": 4.6,
                "review_count": 18,
                "thumbnail": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
            },
            
            # Clothing & Accessories
            {
                "title": "Kippah Collection - Various Styles",
                "description": "Collection of high-quality kippot in various styles and colors. Includes crocheted, velvet, and leather options.",
                "price": 25.00,
                "category": "Clothing",
                "subcategory": "Accessories",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33020",
                "vendor_name": "Jewish Clothing Store",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "clothing@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 50,
                "rating": 4.7,
                "review_count": 35,
                "thumbnail": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
            },
            {
                "title": "Tzitzit Set - Handmade",
                "description": "Handmade tzitzit set with high-quality wool and proper kosher certification. Available in various sizes and colors.",
                "price": 45.00,
                "category": "Clothing",
                "subcategory": "Religious",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "vendor_name": "Religious Items Store",
                "vendor_phone": "(561) 555-0789",
                "vendor_email": "religious@itemsstore.com",
                "kosher_agency": "OU",
                "kosher_level": "Mehadrin",
                "stock": 20,
                "rating": 4.9,
                "review_count": 42,
                "thumbnail": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
            },
            
            # Vehicles & Transportation
            {
                "title": "2019 Honda Odyssey - Family Minivan",
                "description": "Well-maintained Honda Odyssey perfect for large families. Single owner, no smoking, regularly serviced. Great for carpooling and family trips.",
                "price": 28500.00,
                "category": "Vehicles",
                "subcategory": "Minivan",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "vendor_name": "Kosher Auto Sales",
                "vendor_phone": "(305) 555-0321",
                "vendor_email": "sales@kosherauto.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_featured": True,
                "stock": 1,
                "rating": 4.8,
                "review_count": 5,
                "thumbnail": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop"
            },
            {
                "title": "Electric Scooter - Kosher Transportation",
                "description": "Electric scooter perfect for short trips around the neighborhood. Great for Shabbat errands and local transportation.",
                "price": 299.99,
                "category": "Vehicles",
                "subcategory": "Electric",
                "city": "Coral Springs",
                "state": "FL",
                "zip_code": "33065",
                "vendor_name": "Kosher Transportation",
                "vendor_phone": "(954) 555-0123",
                "vendor_email": "transport@kosher.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_on_sale": True,
                "discount_percentage": 10,
                "stock": 3,
                "rating": 4.5,
                "review_count": 8,
                "thumbnail": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop"
            },
            
            # Toys & Games
            {
                "title": "Jewish Educational Games Set",
                "description": "Complete set of Jewish educational games for children. Includes Hebrew learning games, Jewish history games, and holiday-themed activities.",
                "price": 35.00,
                "category": "Toys & Games",
                "subcategory": "Educational",
                "city": "Parkland",
                "state": "FL",
                "zip_code": "33067",
                "vendor_name": "Jewish Toy Store",
                "vendor_phone": "(954) 555-0456",
                "vendor_email": "toys@jewishstore.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "stock": 15,
                "rating": 4.8,
                "review_count": 25,
                "thumbnail": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
            },
            {
                "title": "Shabbat Activity Kit for Kids",
                "description": "Complete activity kit for keeping children engaged during Shabbat. Includes quiet games, coloring books, and educational materials.",
                "price": 22.99,
                "category": "Toys & Games",
                "subcategory": "Shabbat",
                "city": "Miami",
                "state": "FL",
                "zip_code": "33101",
                "vendor_name": "Shabbat Activities",
                "vendor_phone": "(305) 555-0123",
                "vendor_email": "activities@shabbat.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_featured": True,
                "stock": 30,
                "rating": 4.9,
                "review_count": 38,
                "thumbnail": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
            }
        ]
        
        print(f"📦 Adding {len(comprehensive_listings)} comprehensive listings...")
        
        # Add all listings
        for listing in comprehensive_listings:
            cursor.execute("""
                INSERT INTO marketplace (
                    title, description, price, category, subcategory, city, state, zip_code,
                    vendor_name, vendor_phone, vendor_email, kosher_agency, kosher_level,
                    is_on_sale, discount_percentage, stock, rating, review_count,
                    thumbnail, is_featured
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                listing["title"], listing["description"], listing["price"], listing["category"],
                listing["subcategory"], listing["city"], listing["state"], listing["zip_code"],
                listing["vendor_name"], listing["vendor_phone"], listing["vendor_email"],
                listing["kosher_agency"], listing["kosher_level"], listing.get("is_on_sale", False),
                listing.get("discount_percentage", 0), listing.get("stock", 1), listing["rating"],
                listing["review_count"], listing["thumbnail"], listing.get("is_featured", False)
            ))
        
        # Commit changes
        conn.commit()
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM marketplace")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT category, COUNT(*) FROM marketplace GROUP BY category ORDER BY COUNT(*) DESC")
        category_counts = cursor.fetchall()
        
        print(f"✅ Successfully added comprehensive marketplace data!")
        print(f"📊 Total marketplace listings: {total_count}")
        print("📈 Category breakdown:")
        for category, count in category_counts:
            print(f"   - {category}: {count} listings")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Adding comprehensive marketplace sample data...")
    success = add_comprehensive_marketplace_data()
    if success:
        print("✅ Comprehensive marketplace data added successfully!")
        print("🌐 You can now view the marketplace at: http://localhost:3000/marketplace")
    else:
        print("❌ Failed to add comprehensive marketplace data")
