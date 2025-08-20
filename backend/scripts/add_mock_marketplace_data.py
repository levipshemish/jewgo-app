#!/usr/bin/env python3
"""Add mock marketplace data to the database.

This script adds sample marketplace listings to test the marketplace functionality.
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

from database.database_manager_v3 import EnhancedDatabaseManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def create_mock_marketplace_data() -> List[Dict[str, Any]]:
    """Create mock marketplace listings data."""
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
                "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
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
            "vendor_email": "gemach@community.org",
            "kosher_agency": "N/A",
            "kosher_level": "N/A",
            "is_available": True,
            "is_featured": False,
            "is_on_sale": False,
            "stock": 50,
            "rating": 5.0,
            "review_count": 25,
            "status": "active",
            "latitude": 26.3683,
            "longitude": -80.1289,
            "thumbnail": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop",
            "images": [
                "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop"
            ],
        },
        {
            "title": "Kosher Cookbook Collection",
            "description": "Complete collection of kosher cookbooks including traditional Jewish recipes, modern kosher cooking, and holiday specials. Perfect condition.",
            "price": 45.00,
            "currency": "USD",
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
            "is_available": True,
            "is_featured": False,
            "is_on_sale": False,
            "stock": 3,
            "rating": 4.7,
            "review_count": 15,
            "status": "active",
            "latitude": 25.9564,
            "longitude": -80.1392,
            "thumbnail": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop",
            "images": [
                "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop"
            ],
        },
    ]


def add_mock_data_to_database():
    """Add mock marketplace data to the database."""
    try:
        # Initialize database manager
        db_manager = EnhancedDatabaseManager()

        # Get database connection
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if marketplace table exists
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'marketplace'
                    );
                """
                )

                table_exists = cursor.fetchone()[0]

                if not table_exists:
                    logger.info("Creating marketplace table...")

                    # Create marketplace table
                    cursor.execute(
                        """
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
                            images TEXT[], -- Array of image URLs
                            created_at TIMESTAMPTZ DEFAULT NOW(),
                            updated_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    """
                    )

                    # Create indexes
                    cursor.execute(
                        "CREATE INDEX idx_marketplace_category ON marketplace(category);"
                    )
                    cursor.execute(
                        "CREATE INDEX idx_marketplace_city ON marketplace(city);"
                    )
                    cursor.execute(
                        "CREATE INDEX idx_marketplace_status ON marketplace(status);"
                    )
                    cursor.execute(
                        "CREATE INDEX idx_marketplace_price ON marketplace(price);"
                    )

                    logger.info("Marketplace table created successfully")

                # Get mock data
                mock_data = create_mock_marketplace_data()

                # Insert mock data
                for item in mock_data:
                    cursor.execute(
                        """
                        INSERT INTO marketplace (
                            title, description, price, currency, category, subcategory,
                            city, state, zip_code, vendor_name, vendor_phone, vendor_email,
                            kosher_agency, kosher_level, is_available, is_featured, is_on_sale,
                            discount_percentage, stock, rating, review_count, status,
                            latitude, longitude, thumbnail, images
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """,
                        (
                            item["title"],
                            item["description"],
                            item["price"],
                            item["currency"],
                            item["category"],
                            item["subcategory"],
                            item["city"],
                            item["state"],
                            item["zip_code"],
                            item["vendor_name"],
                            item["vendor_phone"],
                            item["vendor_email"],
                            item["kosher_agency"],
                            item["kosher_level"],
                            item["is_available"],
                            item["is_featured"],
                            item["is_on_sale"],
                            item["discount_percentage"],
                            item["stock"],
                            item["rating"],
                            item["review_count"],
                            item["status"],
                            item["latitude"],
                            item["longitude"],
                            item["thumbnail"],
                            item["images"],
                        ),
                    )

                # Commit the transaction
                conn.commit()

                logger.info(
                    f"Successfully added {len(mock_data)} mock marketplace listings"
                )

                # Verify the data was inserted
                cursor.execute("SELECT COUNT(*) FROM marketplace")
                count = cursor.fetchone()[0]
                logger.info(f"Total marketplace listings in database: {count}")

                return True

    except Exception as e:
        logger.error(f"Error adding mock marketplace data: {str(e)}")
        return False


def main():
    """Main function to run the script."""
    logger.info("Starting to add mock marketplace data...")

    success = add_mock_data_to_database()

    if success:
        logger.info("✅ Mock marketplace data added successfully!")
    else:
        logger.error("❌ Failed to add mock marketplace data")
        sys.exit(1)


if __name__ == "__main__":
    main()
