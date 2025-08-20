#!/usr/bin/env python3
"""Script to add sample marketplace listings to the database.
This populates the marketplace table with realistic kosher product data.
"""

import json
import os
import sys
from datetime import date, datetime

from sqlalchemy import create_engine, text

# Add the parent directory to the path so we can import our modules
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from utils.logging_config import get_logger

logger = get_logger(__name__)


def add_sample_data() -> bool:
    """Add sample marketplace listings to the database."""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False

    try:
        # Create engine
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                logger.info("Adding sample marketplace listings...")

                # Sample marketplace listings
                sample_listings = [
                    {
                        "name": "Glatt Kosher Beef Brisket",
                        "title": "Premium Quality Beef Brisket - Perfect for Shabbat",
                        "price": 45.99,
                        "original_price": 59.99,
                        "category": "Meat & Poultry",
                        "subcategory": "Beef",
                        "location": "123 Main Street, Miami, FL 33101",
                        "city": "Miami",
                        "state": "FL",
                        "zip_code": "33101",
                        "vendor_name": "Kosher Delights Market",
                        "vendor_id": "kd_001",
                        "vendor_address": "123 Main Street, Miami, FL 33101",
                        "vendor_phone": "(305) 555-0123",
                        "vendor_email": "info@kosherdelights.com",
                        "vendor_website": "https://kosherdelights.com",
                        "vendor_rating": 4.7,
                        "vendor_review_count": 234,
                        "vendor_is_verified": True,
                        "vendor_is_premium": True,
                        "product_image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                        "thumbnail": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
                        "additional_images": [
                            "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                            "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
                        ],
                        "description": "Premium quality beef brisket, perfect for Shabbat meals. Hand-selected and expertly prepared. This tender, flavorful brisket is ideal for special occasions and family gatherings.",
                        "stock": 15,
                        "is_available": True,
                        "is_featured": True,
                        "is_on_sale": True,
                        "discount_percentage": 23,
                        "kosher_agency": "OU",
                        "kosher_level": "glatt",
                        "kosher_certificate_number": "OU-12345",
                        "kosher_expiry_date": date(2025, 12, 31),
                        "kosher_is_verified": True,
                        "is_gluten_free": False,
                        "is_dairy_free": True,
                        "is_nut_free": True,
                        "is_vegan": False,
                        "is_vegetarian": False,
                        "allergens": ["beef"],
                        "tags": ["meat", "brisket", "shabbat", "glatt", "premium"],
                        "specifications": json.dumps(
                            {
                                "weight": "3-4 lbs",
                                "cut": "Brisket",
                                "preparation": "Ready to cook",
                                "storage": "Refrigerate or freeze",
                            }
                        ),
                        "shipping_info": json.dumps(
                            {
                                "weight": 4.0,
                                "dimensions": {"length": 12, "width": 8, "height": 3},
                                "shipping_methods": [
                                    {
                                        "name": "Standard",
                                        "price": 5.99,
                                        "estimated_days": 3,
                                    },
                                    {
                                        "name": "Express",
                                        "price": 12.99,
                                        "estimated_days": 1,
                                    },
                                ],
                            }
                        ),
                        "rating": 4.8,
                        "review_count": 127,
                        "status": "active",
                        "priority": 1,
                        "expiry_date": date(2025, 1, 31),
                        "created_by": "admin",
                        "approved_by": "admin",
                        "approved_at": datetime.now(),
                        "notes": "Premium brisket from local kosher butcher",
                        "source": "manual",
                    },
                    {
                        "name": "Challah Bread - Traditional",
                        "title": "Fresh-Baked Traditional Challah Bread - Perfect for Shabbat",
                        "price": 8.99,
                        "category": "Bakery",
                        "subcategory": "Bread",
                        "location": "456 Oak Avenue, Miami, FL 33102",
                        "city": "Miami",
                        "state": "FL",
                        "zip_code": "33102",
                        "vendor_name": "Bakery Express",
                        "vendor_id": "be_001",
                        "vendor_address": "456 Oak Avenue, Miami, FL 33102",
                        "vendor_phone": "(305) 555-0456",
                        "vendor_email": "orders@bakeryexpress.com",
                        "vendor_website": "https://bakeryexpress.com",
                        "vendor_rating": 4.8,
                        "vendor_review_count": 156,
                        "vendor_is_verified": True,
                        "vendor_is_premium": False,
                        "product_image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop",
                        "thumbnail": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
                        "additional_images": [
                            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop"
                        ],
                        "description": "Fresh-baked traditional challah bread, perfect for Shabbat. Made with premium ingredients and baked fresh daily. Soft, fluffy texture with a beautiful golden crust.",
                        "stock": 50,
                        "is_available": True,
                        "is_featured": False,
                        "is_on_sale": False,
                        "kosher_agency": "Kof-K",
                        "kosher_level": "pas_yisrael",
                        "kosher_certificate_number": "KofK-67890",
                        "kosher_expiry_date": date(2025, 6, 30),
                        "kosher_is_verified": True,
                        "is_gluten_free": False,
                        "is_dairy_free": False,
                        "is_nut_free": True,
                        "is_vegan": False,
                        "is_vegetarian": True,
                        "allergens": ["wheat", "eggs", "dairy"],
                        "tags": ["bread", "challah", "shabbat", "bakery", "fresh"],
                        "specifications": json.dumps(
                            {
                                "weight": "1 lb",
                                "ingredients": "Flour, water, eggs, sugar, yeast, salt",
                                "preparation": "Ready to serve",
                                "storage": "Room temperature or freeze",
                            }
                        ),
                        "shipping_info": json.dumps(
                            {
                                "weight": 1.0,
                                "dimensions": {"length": 10, "width": 6, "height": 2},
                                "shipping_methods": [
                                    {
                                        "name": "Standard",
                                        "price": 3.99,
                                        "estimated_days": 2,
                                    },
                                    {
                                        "name": "Same Day",
                                        "price": 8.99,
                                        "estimated_days": 0,
                                    },
                                ],
                            }
                        ),
                        "rating": 4.9,
                        "review_count": 89,
                        "status": "active",
                        "priority": 2,
                        "expiry_date": date(2025, 1, 7),
                        "created_by": "admin",
                        "approved_by": "admin",
                        "approved_at": datetime.now(),
                        "notes": "Fresh challah from local kosher bakery",
                        "source": "manual",
                    },
                    {
                        "name": "Chalav Yisrael Milk - Whole",
                        "title": "Fresh Chalav Yisrael Whole Milk - 1 Gallon",
                        "price": 6.99,
                        "category": "Dairy",
                        "subcategory": "Milk",
                        "location": "789 Pine Street, Miami, FL 33103",
                        "city": "Miami",
                        "state": "FL",
                        "zip_code": "33103",
                        "vendor_name": "Kosher Dairy Co.",
                        "vendor_id": "kdc_001",
                        "vendor_address": "789 Pine Street, Miami, FL 33103",
                        "vendor_phone": "(305) 555-0789",
                        "vendor_email": "info@kosherdairy.com",
                        "vendor_website": "https://kosherdairy.com",
                        "vendor_rating": 4.6,
                        "vendor_review_count": 89,
                        "vendor_is_verified": True,
                        "vendor_is_premium": False,
                        "product_image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=600&fit=crop",
                        "thumbnail": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
                        "additional_images": [
                            "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=600&fit=crop"
                        ],
                        "description": "Fresh Chalav Yisrael whole milk, delivered daily. Rich, creamy milk from cows supervised by Jewish milkers. Perfect for coffee, cereal, and cooking.",
                        "stock": 25,
                        "is_available": True,
                        "is_featured": True,
                        "is_on_sale": False,
                        "kosher_agency": "OU",
                        "kosher_level": "chalav_yisrael",
                        "kosher_certificate_number": "OU-11111",
                        "kosher_expiry_date": date(2025, 12, 31),
                        "kosher_is_verified": True,
                        "is_gluten_free": True,
                        "is_dairy_free": False,
                        "is_nut_free": True,
                        "is_vegan": False,
                        "is_vegetarian": True,
                        "allergens": ["milk"],
                        "tags": ["milk", "chalav_yisrael", "dairy", "fresh", "whole"],
                        "specifications": json.dumps(
                            {
                                "volume": "1 Gallon",
                                "fat_content": "3.25%",
                                "preparation": "Ready to drink",
                                "storage": "Refrigerate",
                            }
                        ),
                        "shipping_info": json.dumps(
                            {
                                "weight": 8.6,
                                "dimensions": {"length": 8, "width": 8, "height": 10},
                                "shipping_methods": [
                                    {
                                        "name": "Standard",
                                        "price": 4.99,
                                        "estimated_days": 1,
                                    },
                                    {
                                        "name": "Express",
                                        "price": 9.99,
                                        "estimated_days": 0,
                                    },
                                ],
                            }
                        ),
                        "rating": 4.7,
                        "review_count": 67,
                        "status": "active",
                        "priority": 3,
                        "expiry_date": date(2025, 1, 10),
                        "created_by": "admin",
                        "approved_by": "admin",
                        "approved_at": datetime.now(),
                        "notes": "Fresh Chalav Yisrael milk from local dairy",
                        "source": "manual",
                    },
                    {
                        "name": "Kosher Olive Oil - Extra Virgin",
                        "title": "Premium Extra Virgin Olive Oil - 500ml",
                        "price": 12.99,
                        "original_price": 15.99,
                        "category": "Pantry",
                        "subcategory": "Oils",
                        "location": "321 Elm Street, Miami, FL 33104",
                        "city": "Miami",
                        "state": "FL",
                        "zip_code": "33104",
                        "vendor_name": "Mediterranean Imports",
                        "vendor_id": "mi_001",
                        "vendor_address": "321 Elm Street, Miami, FL 33104",
                        "vendor_phone": "(305) 555-0321",
                        "vendor_email": "info@mediterraneanimports.com",
                        "vendor_website": "https://mediterraneanimports.com",
                        "vendor_rating": 4.5,
                        "vendor_review_count": 123,
                        "vendor_is_verified": True,
                        "vendor_is_premium": False,
                        "product_image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&h=600&fit=crop",
                        "thumbnail": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop",
                        "additional_images": [
                            "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&h=600&fit=crop"
                        ],
                        "description": "Premium extra virgin olive oil from the Mediterranean. Cold-pressed and certified kosher. Perfect for cooking, salad dressings, and dipping bread.",
                        "stock": 30,
                        "is_available": True,
                        "is_featured": False,
                        "is_on_sale": True,
                        "discount_percentage": 19,
                        "kosher_agency": "OU",
                        "kosher_level": "regular",
                        "kosher_certificate_number": "OU-22222",
                        "kosher_expiry_date": date(2026, 6, 30),
                        "kosher_is_verified": True,
                        "is_gluten_free": True,
                        "is_dairy_free": True,
                        "is_nut_free": True,
                        "is_vegan": True,
                        "is_vegetarian": True,
                        "allergens": [],
                        "tags": [
                            "olive_oil",
                            "extra_virgin",
                            "mediterranean",
                            "kosher",
                            "premium",
                        ],
                        "specifications": json.dumps(
                            {
                                "volume": "500ml",
                                "origin": "Mediterranean",
                                "extraction": "Cold-pressed",
                                "storage": "Room temperature",
                            }
                        ),
                        "shipping_info": json.dumps(
                            {
                                "weight": 0.6,
                                "dimensions": {"length": 4, "width": 4, "height": 8},
                                "shipping_methods": [
                                    {
                                        "name": "Standard",
                                        "price": 3.99,
                                        "estimated_days": 3,
                                    },
                                    {
                                        "name": "Express",
                                        "price": 7.99,
                                        "estimated_days": 1,
                                    },
                                ],
                            }
                        ),
                        "rating": 4.6,
                        "review_count": 45,
                        "status": "active",
                        "priority": 4,
                        "expiry_date": date(2026, 6, 30),
                        "created_by": "admin",
                        "approved_by": "admin",
                        "approved_at": datetime.now(),
                        "notes": "Premium olive oil from Mediterranean region",
                        "source": "manual",
                    },
                    {
                        "name": "Gluten-Free Matzo Ball Mix",
                        "title": "Homestyle Gluten-Free Matzo Ball Mix - 8 oz",
                        "price": 5.99,
                        "category": "Pantry",
                        "subcategory": "Baking",
                        "location": "654 Maple Drive, Miami, FL 33105",
                        "city": "Miami",
                        "state": "FL",
                        "zip_code": "33105",
                        "vendor_name": "Kosher Pantry",
                        "vendor_id": "kp_001",
                        "vendor_address": "654 Maple Drive, Miami, FL 33105",
                        "vendor_phone": "(305) 555-0654",
                        "vendor_email": "info@kosherpantry.com",
                        "vendor_website": "https://kosherpantry.com",
                        "vendor_rating": 4.4,
                        "vendor_review_count": 78,
                        "vendor_is_verified": True,
                        "vendor_is_premium": False,
                        "product_image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
                        "thumbnail": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
                        "additional_images": [
                            "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop"
                        ],
                        "description": "Homestyle gluten-free matzo ball mix. Easy to prepare, perfect for Passover and year-round use. Makes fluffy, delicious matzo balls for your soup.",
                        "stock": 40,
                        "is_available": True,
                        "is_featured": True,
                        "is_on_sale": False,
                        "kosher_agency": "OU",
                        "kosher_level": "regular",
                        "kosher_certificate_number": "OU-33333",
                        "kosher_expiry_date": date(2025, 12, 31),
                        "kosher_is_verified": True,
                        "is_gluten_free": True,
                        "is_dairy_free": True,
                        "is_nut_free": True,
                        "is_vegan": False,
                        "is_vegetarian": True,
                        "allergens": ["eggs"],
                        "tags": [
                            "matzo_balls",
                            "gluten_free",
                            "passover",
                            "soup",
                            "mix",
                        ],
                        "specifications": json.dumps(
                            {
                                "weight": "8 oz",
                                "servings": "8-10 matzo balls",
                                "preparation": "Add water and eggs",
                                "storage": "Room temperature",
                            }
                        ),
                        "shipping_info": json.dumps(
                            {
                                "weight": 0.5,
                                "dimensions": {"length": 3, "width": 3, "height": 6},
                                "shipping_methods": [
                                    {
                                        "name": "Standard",
                                        "price": 2.99,
                                        "estimated_days": 3,
                                    },
                                    {
                                        "name": "Express",
                                        "price": 6.99,
                                        "estimated_days": 1,
                                    },
                                ],
                            }
                        ),
                        "rating": 4.5,
                        "review_count": 34,
                        "status": "active",
                        "priority": 5,
                        "expiry_date": date(2025, 12, 31),
                        "created_by": "admin",
                        "approved_by": "admin",
                        "approved_at": datetime.now(),
                        "notes": "Gluten-free matzo ball mix for Passover",
                        "source": "manual",
                    },
                ]

                # Insert sample data
                for listing in sample_listings:
                    # Handle optional fields
                    if "original_price" not in listing:
                        listing["original_price"] = None
                    if "discount_percentage" not in listing:
                        listing["discount_percentage"] = None

                    insert_sql = """
                    INSERT INTO marketplace (
                        name, title, price, original_price, category, subcategory, location, city, state, zip_code,
                        vendor_name, vendor_id, vendor_address, vendor_phone, vendor_email, vendor_website,
                        vendor_rating, vendor_review_count, vendor_is_verified, vendor_is_premium,
                        product_image, thumbnail, additional_images, description, stock, is_available,
                        is_featured, is_on_sale, discount_percentage, kosher_agency, kosher_level,
                        kosher_certificate_number, kosher_expiry_date, kosher_is_verified,
                        is_gluten_free, is_dairy_free, is_nut_free, is_vegan, is_vegetarian,
                        allergens, tags, specifications, shipping_info, rating, review_count,
                        status, priority, expiry_date, created_by, approved_by, approved_at, notes, source
                    ) VALUES (
                        :name, :title, :price, :original_price, :category, :subcategory, :location, :city, :state, :zip_code,
                        :vendor_name, :vendor_id, :vendor_address, :vendor_phone, :vendor_email, :vendor_website,
                        :vendor_rating, :vendor_review_count, :vendor_is_verified, :vendor_is_premium,
                        :product_image, :thumbnail, :additional_images, :description, :stock, :is_available,
                        :is_featured, :is_on_sale, :discount_percentage, :kosher_agency, :kosher_level,
                        :kosher_certificate_number, :kosher_expiry_date, :kosher_is_verified,
                        :is_gluten_free, :is_dairy_free, :is_nut_free, :is_vegan, :is_vegetarian,
                        :allergens, :tags, :specifications, :shipping_info, :rating, :review_count,
                        :status, :priority, :expiry_date, :created_by, :approved_by, :approved_at, :notes, :source
                    )
                    """

                    conn.execute(text(insert_sql), listing)

                # Commit transaction
                trans.commit()

                logger.info(
                    f"✅ Successfully added {len(sample_listings)} sample marketplace listings!"
                )
                return True

            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Failed to add sample data: {e}")
                return False

    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    success = add_sample_data()
    if success:
        print("✅ Sample marketplace data added successfully!")
        sys.exit(0)
    else:
        print("❌ Failed to add sample marketplace data!")
        sys.exit(1)
