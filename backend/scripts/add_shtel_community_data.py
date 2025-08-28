#!/usr/bin/env python3
"""
Shtetl Community Data Population Script
=======================================

This script adds Jewish community-specific marketplace listings
that are perfect for the shtetl marketplace page.
"""

import os
import sys
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Load environment variables
load_dotenv()

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ShtelCommunityDataManager:
    """Shtetl community-specific marketplace data manager."""

    def __init__(self, database_url: str = None):
        """Initialize the data manager."""
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.engine = None
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")

    def connect(self) -> bool:
        """Connect to the database."""
        try:
            logger.info("🔗 Connecting to database...")
            self.engine = create_engine(self.database_url)
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("✅ Database connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def get_shtel_community_listings(self) -> list:
        """Get shtetl community-specific listings."""
        return [
            {
                "title": "Sterling Silver Mezuzah Case",
                "description": "Beautiful handcrafted sterling silver mezuzah case with intricate Jewish designs. Kosher scroll included from Rabbi Goldstein. Perfect for front door or bedroom.",
                "price": 120.00,
                "currency": "USD",
                "category": "Judaica",
                "subcategory": "Mezuzot",
                "city": "Miami Beach",
                "state": "FL",
                "zip_code": "33139",
                "vendor_name": "Sarah's Judaica Shop",
                "vendor_phone": "(305) 555-0101",
                "vendor_email": "sarah@judaic-treasures.com",
                "kosher_agency": "Rabbi Goldstein",
                "kosher_level": "Kosher",
                "is_available": True,
                "is_featured": True,
                "latitude": 25.7907,
                "longitude": -80.1300,
                "stock": 5,
                "rating": 4.9,
                "review_count": 12
            },
            {
                "title": "High Chair - Community Gemach",
                "description": "Clean high chair available for community use through our Gemach program. Pick up from Aventura community center. Return when no longer needed.",
                "price": 0.00,  # Gemach items are free
                "currency": "USD",
                "category": "Baby Items",
                "subcategory": "Furniture",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "vendor_name": "Aventura Community Gemach",
                "vendor_phone": "(305) 555-0200",
                "vendor_email": "gemach@aventuracommunity.org",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "latitude": 25.9564,
                "longitude": -80.1955,
                "stock": 1,
                "rating": 5.0,
                "review_count": 8
            },
            {
                "title": "Fleishig Vitamix Blender",
                "description": "Professional Vitamix blender used exclusively for meat preparations. Never mixed with dairy. Perfect for making chopped liver and meat-based smoothies.",
                "price": 150.00,
                "currency": "USD",
                "category": "Appliances",
                "subcategory": "Kitchen",
                "city": "Miami Gardens",
                "state": "FL",
                "zip_code": "33056",
                "vendor_name": "David's Kosher Kitchen",
                "vendor_phone": "(305) 555-0300",
                "vendor_email": "david@kosherkitchen.net",
                "kosher_agency": "Rabbi verified",
                "kosher_level": "Fleishig",
                "is_available": True,
                "is_featured": True,
                "latitude": 25.9420,
                "longitude": -80.2456,
                "stock": 1,
                "rating": 4.8,
                "review_count": 15
            },
            {
                "title": "Beautiful Shabbat Candlesticks - Silver Plated",
                "description": "Elegant silver-plated Shabbat candlesticks, perfect for weekly Shabbat dinners. Traditional design with modern craftsmanship.",
                "price": 85.00,
                "currency": "USD",
                "category": "Judaica",
                "subcategory": "Shabbat Items",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33021",
                "vendor_name": "Rachel's Judaica",
                "vendor_phone": "(954) 555-0400",
                "vendor_email": "rachel@shabbat-treasures.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "latitude": 26.0112,
                "longitude": -80.1495,
                "stock": 3,
                "rating": 4.7,
                "review_count": 9
            },
            {
                "title": "Passover Dishes Set - Complete",
                "description": "Complete Passover dish set including plates, bowls, cups, and serving dishes. Only used during Pesach. Includes storage containers.",
                "price": 200.00,
                "currency": "USD",
                "category": "Holiday Items",
                "subcategory": "Passover",
                "city": "Pembroke Pines",
                "state": "FL",
                "zip_code": "33028",
                "vendor_name": "Miriam's Pesach Store",
                "vendor_phone": "(954) 555-0500",
                "vendor_email": "miriam@pesachstore.com",
                "kosher_agency": "Pesach Kosher",
                "kosher_level": "Pesach",
                "is_available": True,
                "is_featured": True,
                "latitude": 26.0070,
                "longitude": -80.2962,
                "stock": 2,
                "rating": 4.9,
                "review_count": 18
            },
            {
                "title": "Tallit Bag - Hand Embroidered",
                "description": "Beautiful hand-embroidered tallit bag with traditional Jewish motifs. Made in Israel. Perfect for protecting your tallit.",
                "price": 45.00,
                "currency": "USD",
                "category": "Judaica",
                "subcategory": "Prayer Items",
                "city": "Coral Springs",
                "state": "FL",
                "zip_code": "33065",
                "vendor_name": "Israeli Imports",
                "vendor_phone": "(954) 555-0600",
                "vendor_email": "imports@israeligoods.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "latitude": 26.2712,
                "longitude": -80.2561,
                "stock": 8,
                "rating": 4.6,
                "review_count": 7
            },
            {
                "title": "Sukkah Decorations - Complete Set",
                "description": "Beautiful Sukkah decoration set including chains, hanging fruits, and traditional Jewish symbols. Perfect for making your Sukkah beautiful.",
                "price": 35.00,
                "currency": "USD",
                "category": "Holiday Items",
                "subcategory": "Sukkot",
                "city": "Deerfield Beach",
                "state": "FL",
                "zip_code": "33441",
                "vendor_name": "Sukkot Celebrations",
                "vendor_phone": "(954) 555-0700",
                "vendor_email": "info@sukkotcelebrations.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "latitude": 26.3185,
                "longitude": -80.0997,
                "stock": 12,
                "rating": 4.8,
                "review_count": 22
            },
            {
                "title": "Baby Crib - Gemach Loan",
                "description": "Solid wood baby crib available through community Gemach. Excellent condition, meets all safety standards. Available for 6-month loans.",
                "price": 0.00,  # Gemach items are free
                "currency": "USD",
                "category": "Baby Items",
                "subcategory": "Furniture",
                "city": "Hallandale Beach",
                "state": "FL",
                "zip_code": "33009",
                "vendor_name": "Hallandale Gemach",
                "vendor_phone": "(954) 555-0800",
                "vendor_email": "gemach@hallandalecommunity.org",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "latitude": 25.9812,
                "longitude": -80.1484,
                "stock": 1,
                "rating": 5.0,
                "review_count": 14
            }
        ]

    def add_shtel_listings(self) -> bool:
        """Add shtetl community listings to the marketplace."""
        try:
            listings = self.get_shtel_community_listings()
            
            logger.info(f"🏛️ Adding {len(listings)} shtetl community listings...")
            
            with self.engine.connect() as conn:
                for listing in listings:
                    # Add timestamps
                    now = datetime.now(timezone.utc)
                    listing.update({
                        'created_at': now,
                        'updated_at': now,
                        'status': 'active',
                        'is_on_sale': False,
                        'thumbnail': '/images/default-restaurant.webp',
                        'images': '[]'  # Empty JSON array
                    })
                    
                    # Insert listing
                    result = conn.execute(text("""
                        INSERT INTO marketplace 
                        (title, description, price, currency, category, subcategory, city, state, zip_code,
                         vendor_name, vendor_phone, vendor_email, kosher_agency, kosher_level, is_available,
                         is_featured, is_on_sale, stock, rating, review_count, status, latitude, longitude,
                         thumbnail, images, created_at, updated_at)
                        VALUES (:title, :description, :price, :currency, :category, :subcategory, :city, :state, :zip_code,
                                :vendor_name, :vendor_phone, :vendor_email, :kosher_agency, :kosher_level, :is_available,
                                :is_featured, :is_on_sale, :stock, :rating, :review_count, :status, :latitude, :longitude,
                                :thumbnail, :images, :created_at, :updated_at)
                    """), listing)
                    
                    logger.info(f"✅ Added: {listing['title']}")
                
                # Commit the transaction
                conn.commit()
            
            logger.info(f"🎉 Successfully added {len(listings)} shtetl community listings!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding shtetl listings: {e}")
            return False

    def run(self):
        """Run the shtetl data population."""
        logger.info("🏛️ Starting Shtetl Community Data Population...")
        
        if not self.connect():
            logger.error("❌ Failed to connect to database")
            return False
        
        success = self.add_shtel_listings()
        
        if success:
            logger.info("🎉 Shtetl community data population completed successfully!")
            logger.info("")
            logger.info("📋 Next steps:")
            logger.info("1. Visit the shtetl marketplace page")
            logger.info("2. Verify community listings appear correctly")
            logger.info("3. Test community-specific features like Gemach items")
            logger.info("4. Check kosher verification indicators")
        else:
            logger.error("❌ Shtetl data population failed")
        
        return success


if __name__ == "__main__":
    manager = ShtelCommunityDataManager()
    manager.run()