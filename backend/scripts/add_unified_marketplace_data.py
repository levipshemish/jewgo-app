#!/usr/bin/env python3
"""
Unified Marketplace Data Population Script
==========================================

This script consolidates functionality from all marketplace data population scripts:
- add_marketplace_sample_data.py
- add_mock_marketplace_data.py
- add_mock_marketplace_categories.py

This is the single source of truth for marketplace data population.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

from utils.logging_config import get_logger

logger = get_logger(__name__)


class UnifiedMarketplaceDataManager:
    """Unified marketplace data population manager."""

    def __init__(self, database_url: Optional[str] = None):
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
                result = conn.execute(text("SELECT 1"))
                result.fetchone()

            logger.info("✅ Database connection established successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def check_table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the database."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(
                    text(
                        """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = :table_name
                    )
                """
                    ),
                    {"table_name": table_name},
                )
                return result.scalar()
        except Exception as e:
            logger.error(f"Error checking table existence: {e}")
            return False

    def create_sample_categories(self) -> List[Dict[str, Any]]:
        """Create sample marketplace categories."""
        return [
            {
                "name": "Food & Beverages",
                "description": "Kosher food and beverage items",
                "icon": "🍽️",
                "is_active": True,
                "sort_order": 1,
            },
            {
                "name": "Appliances",
                "description": "Kitchen and household appliances",
                "icon": "🔌",
                "is_active": True,
                "sort_order": 2,
            },
            {
                "name": "Vehicles",
                "description": "Cars, trucks, and other vehicles",
                "icon": "🚗",
                "is_active": True,
                "sort_order": 3,
            },
            {
                "name": "Community",
                "description": "Community services and gemachs",
                "icon": "🤝",
                "is_active": True,
                "sort_order": 4,
            },
            {
                "name": "Home & Garden",
                "description": "Home improvement and gardening items",
                "icon": "🏠",
                "is_active": True,
                "sort_order": 5,
            },
            {
                "name": "Electronics",
                "description": "Electronic devices and accessories",
                "icon": "📱",
                "is_active": True,
                "sort_order": 6,
            },
            {
                "name": "Clothing & Accessories",
                "description": "Modest clothing and accessories",
                "icon": "👕",
                "is_active": True,
                "sort_order": 7,
            },
            {
                "name": "Books & Media",
                "description": "Jewish books, CDs, and media",
                "icon": "📚",
                "is_active": True,
                "sort_order": 8,
            },
        ]

    def create_sample_listings(self) -> List[Dict[str, Any]]:
        """Create sample marketplace listings."""
        return [
            {
                "title": "Kosher Kitchen Appliances Set",
                "description": "Complete set of kosher kitchen appliances including blender, food processor, and mixer. All items are Chalav Yisroel certified and in excellent condition.",
                "price": 299.99,
                "currency": "USD",
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
                "is_available": True,
                "is_featured": True,
                "is_on_sale": False,
                "stock": 1,
                "rating": 4.8,
                "review_count": 12,
                "status": "active",
                "latitude": 25.7617,
                "longitude": -80.1918,
                "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
                "images": [
                    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
                ],
            },
            {
                "title": "Fresh Homemade Challah Bread",
                "description": "Fresh homemade challah bread made with premium ingredients. Perfect for Shabbat and holidays.",
                "price": 8.99,
                "currency": "USD",
                "category": "Food & Beverages",
                "subcategory": "Bakery",
                "city": "Brooklyn",
                "state": "NY",
                "zip_code": "11201",
                "vendor_name": "Brooklyn Kosher Bakery",
                "vendor_phone": "(718) 555-0123",
                "vendor_email": "info@brooklynkosher.com",
                "kosher_agency": "OU",
                "kosher_level": "regular",
                "is_available": True,
                "is_featured": True,
                "is_on_sale": False,
                "stock": 50,
                "rating": 4.8,
                "review_count": 25,
                "status": "active",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "thumbnail": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
                "images": [
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop",
                ],
            },
            {
                "title": "Premium Glatt Kosher Beef Brisket",
                "description": "Premium glatt kosher beef brisket, perfect for slow cooking and smoking.",
                "price": 45.99,
                "currency": "USD",
                "category": "Food & Beverages",
                "subcategory": "Meat",
                "city": "Queens",
                "state": "NY",
                "zip_code": "11375",
                "vendor_name": "Queens Kosher Butcher",
                "vendor_phone": "(718) 555-0456",
                "vendor_email": "info@queenskosher.com",
                "kosher_agency": "OU",
                "kosher_level": "Glatt",
                "is_available": True,
                "is_featured": True,
                "is_on_sale": False,
                "stock": 20,
                "rating": 4.9,
                "review_count": 15,
                "status": "active",
                "latitude": 40.7282,
                "longitude": -73.7949,
                "thumbnail": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
                "images": [
                    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                ],
            },
            {
                "title": "2018 Toyota Camry - Kosher Family Car",
                "description": "Well-maintained Toyota Camry perfect for a kosher family. Single owner, no smoking, regularly serviced. Great for carpooling and family trips.",
                "price": 18500.00,
                "currency": "USD",
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
                "is_available": True,
                "is_featured": True,
                "is_on_sale": True,
                "discount_percentage": 10,
                "stock": 1,
                "rating": 4.9,
                "review_count": 8,
                "status": "active",
                "latitude": 26.0112,
                "longitude": -80.1495,
                "thumbnail": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop",
                "images": [
                    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop",
                ],
            },
            {
                "title": "Gemach - Free Loan Items",
                "description": "Community gemach offering free loans of various items including baby equipment, medical supplies, and household items. No cost, just return when done.",
                "price": 0.00,
                "currency": "USD",
                "category": "Community",
                "subcategory": "Gemach",
                "city": "Boca Raton",
                "state": "FL",
                "zip_code": "33431",
                "vendor_name": "Community Gemach",
                "vendor_phone": "(561) 555-0789",
                "vendor_email": "info@communitygemach.com",
                "kosher_agency": "N/A",
                "kosher_level": "N/A",
                "is_available": True,
                "is_featured": True,
                "is_on_sale": False,
                "stock": 999,
                "rating": 5.0,
                "review_count": 45,
                "status": "active",
                "latitude": 26.3683,
                "longitude": -80.1000,
                "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop",
                "images": [
                    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop",
                ],
            },
        ]

    def populate_categories(self) -> bool:
        """Populate marketplace categories."""
        try:
            if not self.check_table_exists("marketplace_categories"):
                logger.info(
                    "⚠️ Marketplace categories table does not exist, skipping categories"
                )
                return True

            logger.info("📂 Populating marketplace categories...")

            categories = self.create_sample_categories()

            with self.engine.begin() as conn:
                for category in categories:
                    # Check if category already exists
                    result = conn.execute(
                        text(
                            """
                        SELECT id FROM marketplace_categories 
                        WHERE name = :name
                    """
                        ),
                        {"name": category["name"]},
                    )

                    if not result.fetchone():
                        conn.execute(
                            text(
                                """
                            INSERT INTO marketplace_categories 
                            (name, description, icon, is_active, sort_order, created_at, updated_at)
                            VALUES (:name, :description, :icon, :is_active, :sort_order, :created_at, :updated_at)
                        """
                            ),
                            {
                                **category,
                                "created_at": datetime.now(timezone.utc),
                                "updated_at": datetime.now(timezone.utc),
                            },
                        )
                        logger.info(f"✅ Added category: {category['name']}")
                    else:
                        logger.info(f"⏭️ Category already exists: {category['name']}")

            logger.info("✅ Categories populated successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Error populating categories: {e}")
            return False

    def populate_listings(self) -> bool:
        """Populate marketplace listings."""
        try:
            if not self.check_table_exists("marketplace"):
                logger.error("❌ Marketplace table does not exist")
                return False

            logger.info("📦 Populating marketplace listings...")

            # Check if data already exists
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
                count = result.scalar()

                if count > 0:
                    logger.info(
                        f"✅ Marketplace table already contains {count} records, skipping sample data"
                    )
                    return True

            listings = self.create_sample_listings()

            with self.engine.begin() as conn:
                for listing in listings:
                    conn.execute(
                        text(
                            """
                        INSERT INTO marketplace 
                        (title, description, price, currency, category, subcategory, city, state, zip_code,
                         vendor_name, vendor_phone, vendor_email, kosher_agency, kosher_level, is_available,
                         is_featured, is_on_sale, stock, rating, review_count, status, latitude, longitude,
                         thumbnail, images, created_at, updated_at)
                        VALUES (:title, :description, :price, :currency, :category, :subcategory, :city, :state, :zip_code,
                                :vendor_name, :vendor_phone, :vendor_email, :kosher_agency, :kosher_level, :is_available,
                                :is_featured, :is_on_sale, :stock, :rating, :review_count, :status, :latitude, :longitude,
                                :thumbnail, :images, :created_at, :updated_at)
                    """
                        ),
                        {
                            **listing,
                            "images": json.dumps(listing["images"]),
                            "created_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc),
                        },
                    )
                    logger.info(f"✅ Added listing: {listing['title']}")

            logger.info("✅ Listings populated successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Error populating listings: {e}")
            return False

    def run_complete_population(self) -> bool:
        """Run complete data population process."""
        logger.info("🚀 Starting unified marketplace data population...")

        try:
            # Connect to database
            if not self.connect():
                return False

            # Populate categories (if table exists)
            self.populate_categories()

            # Populate listings
            if not self.populate_listings():
                return False

            logger.info(
                "🎉 Unified marketplace data population completed successfully!"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Data population failed: {e}")
            return False


def main():
    """Main execution function."""
    try:
        # Initialize data manager
        data_manager = UnifiedMarketplaceDataManager()

        # Run complete population
        success = data_manager.run_complete_population()

        if success:
            print("\n🎉 Data population completed successfully!")
            print("✅ Categories populated (if table exists)")
            print("✅ Sample listings added")
            print("\n📋 Next steps:")
            print("1. Test marketplace functionality in the frontend")
            print("2. Verify data appears correctly")
            print("3. Test search and filtering features")
        else:
            print("\n❌ Data population completed with errors")
            print("Please check the logs above for details")

        return 0 if success else 1

    except Exception as e:
        logger.error(f"❌ Data population script failed: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
