#!/usr/bin/env python3
"""
Add Shtetl Community Sample Data
===============================

Adds Jewish community-specific sample data to the shtetl_marketplace table.
"""

import os
import sys
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

from utils.logging_config import get_logger

logger = get_logger(__name__)


class ShtetlSampleDataManager:
    """Manager for adding shtetl sample data."""

    def __init__(self, database_url: str = None):
        """Initialize the data manager."""
        self.database_url = database_url or os.getenv("DATABASE_URL")
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

    def get_sample_listings(self) -> list:
        """Get sample shtetl community listings."""
        return [
            {
                "title": "Sterling Silver Mezuzah Case",
                "description": "Beautiful handcrafted sterling silver mezuzah case with intricate Jewish designs. Includes kosher scroll from Rabbi Goldstein.",
                "price_cents": 12000,
                "currency": "USD",
                "city": "Miami Beach",
                "state": "FL",
                "zip_code": "33139",
                "latitude": 25.7907,
                "longitude": -80.1300,
                "category_name": "Judaica",
                "subcategory": "Mezuzot",
                "seller_name": "Sarah's Judaica Shop",
                "seller_phone": "(305) 555-0101",
                "seller_email": "sarah@judaic-treasures.com",
                "kosher_agency": "Rabbi Goldstein",
                "kosher_level": "Kosher",
                "kosher_verified": True,
                "rabbi_endorsed": True,
                "community_verified": True,
                "is_gemach": False,
                "condition": "new",
                "stock_quantity": 5,
                "is_available": True,
                "is_featured": True,
                "transaction_type": "sale",
                "contact_preference": "phone",
            },
            {
                "title": "High Chair - Community Gemach",
                "description": "Clean high chair available for community use through our Gemach program. Pick up from Aventura community center.",
                "price_cents": 0,  # Free Gemach item
                "currency": "USD",
                "city": "Aventura",
                "state": "FL",
                "zip_code": "33180",
                "latitude": 25.9564,
                "longitude": -80.1955,
                "category_name": "Gemach Items",
                "subcategory": "Baby Gear",
                "seller_name": "Aventura Community Gemach",
                "seller_phone": "(305) 555-0200",
                "seller_email": "gemach@aventuracommunity.org",
                "is_gemach": True,
                "gemach_type": "baby_items",
                "loan_duration_days": 90,
                "return_condition": "Clean and in good condition",
                "community_verified": True,
                "condition": "good",
                "stock_quantity": 1,
                "is_available": True,
                "is_featured": True,
                "transaction_type": "gemach",
                "contact_preference": "phone",
                "pickup_instructions": "Call before pickup - located at community center",
            },
            {
                "title": "Vitamix Blender - Fleishig Only",
                "description": "Professional Vitamix blender used exclusively for meat preparations. Never mixed with dairy. Perfect for chopped liver and meat-based smoothies.",
                "price_cents": 15000,
                "currency": "USD",
                "city": "Miami Gardens",
                "state": "FL",
                "zip_code": "33056",
                "latitude": 25.9420,
                "longitude": -80.2456,
                "category_name": "Appliances",
                "subcategory": "Kitchen",
                "seller_name": "David's Kosher Kitchen",
                "seller_phone": "(305) 555-0300",
                "seller_email": "david@kosherkitchen.net",
                "kosher_verified": True,
                "community_verified": True,
                "condition": "like_new",
                "stock_quantity": 1,
                "is_available": True,
                "transaction_type": "sale",
                "contact_preference": "phone",
                "notes": "Strictly fleishig use - never mixed with dairy",
            },
            {
                "title": "Silver Shabbat Candlesticks",
                "description": "Elegant silver-plated Shabbat candlesticks, perfect for weekly Shabbat dinners. Traditional design with modern craftsmanship.",
                "price_cents": 8500,
                "currency": "USD",
                "city": "Hollywood",
                "state": "FL",
                "zip_code": "33021",
                "latitude": 26.0112,
                "longitude": -80.1495,
                "category_name": "Judaica",
                "subcategory": "Shabbat Items",
                "seller_name": "Rachel's Judaica",
                "seller_phone": "(954) 555-0400",
                "seller_email": "rachel@shabbat-treasures.com",
                "community_verified": True,
                "condition": "new",
                "stock_quantity": 3,
                "is_available": True,
                "is_featured": True,
                "transaction_type": "sale",
                "contact_preference": "phone",
            },
            {
                "title": "Complete Passover Dish Set",
                "description": "Complete Passover dish set including plates, bowls, cups, and serving dishes. Only used during Pesach. Includes storage containers.",
                "price_cents": 20000,
                "currency": "USD",
                "city": "Pembroke Pines",
                "state": "FL",
                "zip_code": "33028",
                "latitude": 26.0070,
                "longitude": -80.2962,
                "category_name": "Holiday Items",
                "subcategory": "Passover",
                "seller_name": "Miriam's Pesach Store",
                "seller_phone": "(954) 555-0500",
                "seller_email": "miriam@pesachstore.com",
                "kosher_agency": "OU-P",
                "kosher_level": "Pesach",
                "kosher_verified": True,
                "community_verified": True,
                "holiday_category": "passover",
                "seasonal_item": True,
                "condition": "like_new",
                "stock_quantity": 2,
                "is_available": True,
                "is_featured": True,
                "transaction_type": "sale",
                "contact_preference": "email",
            },
            {
                "title": "Hand Embroidered Tallit Bag",
                "description": "Beautiful hand-embroidered tallit bag with traditional Jewish motifs. Made in Israel. Perfect for protecting your tallit.",
                "price_cents": 4500,
                "currency": "USD",
                "city": "Coral Springs",
                "state": "FL",
                "zip_code": "33065",
                "latitude": 26.2712,
                "longitude": -80.2561,
                "category_name": "Judaica",
                "subcategory": "Prayer Items",
                "seller_name": "Israeli Imports",
                "seller_phone": "(954) 555-0600",
                "seller_email": "imports@israeligoods.com",
                "community_verified": True,
                "condition": "new",
                "stock_quantity": 8,
                "is_available": True,
                "transaction_type": "sale",
                "contact_preference": "email",
            },
            {
                "title": "Baby Stroller - Gemach Loan",
                "description": "High-quality baby stroller available through community Gemach. Excellent condition, meets all safety standards. Available for 6-month loans.",
                "price_cents": 0,  # Free Gemach item
                "currency": "USD",
                "city": "Hallandale Beach",
                "state": "FL",
                "zip_code": "33009",
                "latitude": 25.9812,
                "longitude": -80.1484,
                "category_name": "Gemach Items",
                "subcategory": "Baby Gear",
                "seller_name": "Hallandale Community Gemach",
                "seller_phone": "(954) 555-0800",
                "seller_email": "gemach@hallandalecommunity.org",
                "is_gemach": True,
                "gemach_type": "baby_items",
                "loan_duration_days": 180,
                "return_condition": "Clean, working condition",
                "community_verified": True,
                "condition": "good",
                "stock_quantity": 1,
                "is_available": True,
                "is_featured": True,
                "transaction_type": "gemach",
                "contact_preference": "phone",
                "pickup_instructions": "Community center pickup by appointment",
            },
            {
                "title": "Sukkah Decorations Set",
                "description": "Beautiful Sukkah decoration set including chains, hanging fruits, and traditional Jewish symbols. Perfect for making your Sukkah beautiful.",
                "price_cents": 3500,
                "currency": "USD",
                "city": "Deerfield Beach",
                "state": "FL",
                "zip_code": "33441",
                "latitude": 26.3185,
                "longitude": -80.0997,
                "category_name": "Holiday Items",
                "subcategory": "Sukkot",
                "seller_name": "Sukkot Celebrations",
                "seller_phone": "(954) 555-0700",
                "seller_email": "info@sukkotcelebrations.com",
                "holiday_category": "sukkot",
                "seasonal_item": True,
                "community_verified": True,
                "condition": "like_new",
                "stock_quantity": 12,
                "is_available": True,
                "transaction_type": "sale",
                "contact_preference": "phone",
            },
        ]

    def add_sample_data(self) -> bool:
        """Add sample data to shtetl_marketplace table."""
        try:
            listings = self.get_sample_listings()

            logger.info(f"🏛️ Adding {len(listings)} shtetl community sample listings...")

            with self.engine.connect() as conn:
                for listing in listings:
                    # Add timestamps and defaults
                    now = datetime.now(timezone.utc)
                    listing.update(
                        {
                            "created_at": now,
                            "updated_at": now,
                            "status": "active",
                            "rating": 0.0,
                            "review_count": 0,
                        }
                    )

                    # Set defaults if not provided
                    listing.setdefault("kosher_agency", None)
                    listing.setdefault("kosher_level", None)
                    listing.setdefault("kosher_verified", False)
                    listing.setdefault("rabbi_endorsed", False)
                    listing.setdefault("community_verified", False)
                    listing.setdefault("is_gemach", False)
                    listing.setdefault("gemach_type", None)
                    listing.setdefault("loan_duration_days", None)
                    listing.setdefault("return_condition", None)
                    listing.setdefault("holiday_category", None)
                    listing.setdefault("seasonal_item", False)
                    listing.setdefault("is_featured", False)
                    listing.setdefault("pickup_instructions", None)
                    listing.setdefault("notes", None)

                    # Insert listing
                    insert_sql = """
                        INSERT INTO shtetl_marketplace 
                        (title, description, price_cents, currency, city, state, zip_code, latitude, longitude,
                         category_name, subcategory, seller_name, seller_phone, seller_email,
                         kosher_agency, kosher_level, kosher_verified, rabbi_endorsed, community_verified,
                         is_gemach, gemach_type, loan_duration_days, return_condition, holiday_category,
                         seasonal_item, condition, stock_quantity, is_available, is_featured,
                         rating, review_count, status, transaction_type, contact_preference,
                         pickup_instructions, notes, created_at, updated_at)
                        VALUES 
                        (:title, :description, :price_cents, :currency, :city, :state, :zip_code, :latitude, :longitude,
                         :category_name, :subcategory, :seller_name, :seller_phone, :seller_email,
                         :kosher_agency, :kosher_level, :kosher_verified, :rabbi_endorsed, :community_verified,
                         :is_gemach, :gemach_type, :loan_duration_days, :return_condition, :holiday_category,
                         :seasonal_item, :condition, :stock_quantity, :is_available, :is_featured,
                         :rating, :review_count, :status, :transaction_type, :contact_preference,
                         :pickup_instructions, :notes, :created_at, :updated_at)
                    """

                    conn.execute(text(insert_sql), listing)
                    logger.info(f"✅ Added: {listing['title']}")

                conn.commit()

            logger.info(
                f"🎉 Successfully added {len(listings)} shtetl community listings!"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Error adding shtetl sample data: {e}")
            return False

    def run(self):
        """Run the shtetl sample data population."""
        logger.info("🏛️ Starting Shtetl Community Sample Data Population...")

        if not self.connect():
            logger.error("❌ Failed to connect to database")
            return False

        success = self.add_sample_data()

        if success:
            logger.info(
                "🎉 Shtetl community sample data population completed successfully!"
            )
            logger.info("")
            logger.info("📋 Next steps:")
            logger.info("1. Visit the shtetl marketplace page")
            logger.info("2. Test shtetl API endpoints")
            logger.info("3. Verify community features like Gemach items")
            logger.info("4. Test kosher verification and community sorting")
        else:
            logger.error("❌ Shtetl sample data population failed")

        return success


if __name__ == "__main__":
    manager = ShtetlSampleDataManager()
    manager.run()
