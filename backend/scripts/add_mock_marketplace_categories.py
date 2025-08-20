#!/usr/bin/env python3
"""Add mock marketplace categories data to the database.

This script adds sample marketplace categories to test the marketplace functionality.
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


def create_mock_categories_data() -> List[Dict[str, Any]]:
    """Create mock marketplace categories data."""
    return [
        {
            "name": "Appliances",
            "slug": "appliances",
            "sort_order": 1,
            "active": True,
            "color": "#3B82F6",
            "description": "Kitchen and household appliances",
            "icon": "blender",
            "productCount": 15,
        },
        {
            "name": "Vehicles",
            "slug": "vehicles",
            "sort_order": 2,
            "active": True,
            "color": "#10B981",
            "description": "Cars, trucks, and other vehicles",
            "icon": "car",
            "productCount": 8,
        },
        {
            "name": "Books",
            "slug": "books",
            "sort_order": 3,
            "active": True,
            "color": "#F59E0B",
            "description": "Jewish books, cookbooks, and literature",
            "icon": "book",
            "productCount": 25,
        },
        {
            "name": "Community",
            "slug": "community",
            "sort_order": 4,
            "active": True,
            "color": "#8B5CF6",
            "description": "Community services and gemach items",
            "icon": "users",
            "productCount": 12,
        },
        {
            "name": "Electronics",
            "slug": "electronics",
            "sort_order": 5,
            "active": True,
            "color": "#EF4444",
            "description": "Computers, phones, and electronics",
            "icon": "smartphone",
            "productCount": 20,
        },
        {
            "name": "Furniture",
            "slug": "furniture",
            "sort_order": 6,
            "active": True,
            "color": "#84CC16",
            "description": "Home and office furniture",
            "icon": "sofa",
            "productCount": 18,
        },
        {
            "name": "Clothing",
            "slug": "clothing",
            "sort_order": 7,
            "active": True,
            "color": "#06B6D4",
            "description": "Jewish clothing and accessories",
            "icon": "tshirt",
            "productCount": 30,
        },
        {
            "name": "Toys & Games",
            "slug": "toys-games",
            "sort_order": 8,
            "active": True,
            "color": "#F97316",
            "description": "Children's toys and educational games",
            "icon": "gamepad-2",
            "productCount": 22,
        },
    ]


def add_mock_categories_to_database():
    """Add mock marketplace categories data to the database."""
    try:
        # Initialize database manager
        db_manager = EnhancedDatabaseManager()

        # Get database connection
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if categories table exists
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'categories'
                    );
                """
                )

                table_exists = cursor.fetchone()[0]

                if not table_exists:
                    logger.info("Creating categories table...")

                    # Create categories table
                    cursor.execute(
                        """
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
                    """
                    )

                    # Create indexes
                    cursor.execute(
                        "CREATE INDEX idx_categories_slug ON categories(slug);"
                    )
                    cursor.execute(
                        "CREATE INDEX idx_categories_active ON categories(active);"
                    )
                    cursor.execute(
                        "CREATE INDEX idx_categories_sort_order ON categories(sort_order);"
                    )

                    logger.info("Categories table created successfully")

                # Get mock data
                mock_categories = create_mock_categories_data()

                # Clear existing data (for testing purposes)
                cursor.execute("DELETE FROM categories")

                # Insert mock data
                for category in mock_categories:
                    cursor.execute(
                        """
                        INSERT INTO categories (
                            name, slug, sort_order, active, color, description, icon, product_count
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """,
                        (
                            category["name"],
                            category["slug"],
                            category["sort_order"],
                            category["active"],
                            category["color"],
                            category["description"],
                            category["icon"],
                            category["productCount"],
                        ),
                    )

                # Commit the transaction
                conn.commit()

                logger.info(
                    f"Successfully added {len(mock_categories)} mock marketplace categories"
                )

                # Verify the data was inserted
                cursor.execute("SELECT COUNT(*) FROM categories")
                count = cursor.fetchone()[0]
                logger.info(f"Total marketplace categories in database: {count}")

                return True

    except Exception as e:
        logger.error(f"Error adding mock marketplace categories: {str(e)}")
        return False


def main():
    """Main function to run the script."""
    logger.info("Starting to add mock marketplace categories...")

    success = add_mock_categories_to_database()

    if success:
        logger.info("✅ Mock marketplace categories added successfully!")
    else:
        logger.error("❌ Failed to add mock marketplace categories")
        sys.exit(1)


if __name__ == "__main__":
    main()
