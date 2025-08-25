#!/usr/bin/env python3
"""
Unified Marketplace Migration
============================

This migration consolidates functionality from all marketplace migration files:
- create_marketplace_schema.py
- create_marketplace_schema_simple.py
- create_marketplace_table_script.py
- create_marketplace_streamlined.py
- simple_marketplace_migration.py
- execute_marketplace_migration.py

This is the single source of truth for marketplace table creation.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logging_config import get_logger

logger = get_logger(__name__)


class MarketplaceMigration:
    """Unified marketplace migration manager."""

    def __init__(self, database_url: Optional[str] = None):
        """Initialize the migration."""
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.engine = None
        self.metadata = MetaData()
        
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
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = :table_name
                    )
                """), {"table_name": table_name})
                return result.scalar()
        except Exception as e:
            logger.error(f"Error checking table existence: {e}")
            return False

    def create_marketplace_table(self) -> bool:
        """Create the main marketplace table."""
        try:
            if self.check_table_exists('marketplace'):
                logger.info("✅ Marketplace table already exists, skipping creation")
                return True

            logger.info("🏗️ Creating marketplace table...")
            
            with self.engine.begin() as conn:
                # Create marketplace table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS marketplace (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        price DECIMAL(10,2),
                        currency VARCHAR(3) DEFAULT 'USD',
                        category VARCHAR(100),
                        subcategory VARCHAR(100),
                        status VARCHAR(20) DEFAULT 'active',
                        vendor_id INTEGER,
                        city VARCHAR(100),
                        state VARCHAR(50),
                        zip_code VARCHAR(20),
                        latitude DECIMAL(10,8),
                        longitude DECIMAL(11,8),
                        contact_email VARCHAR(255),
                        contact_phone VARCHAR(20),
                        images JSONB,
                        tags TEXT[],
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        is_featured BOOLEAN DEFAULT FALSE,
                        view_count INTEGER DEFAULT 0,
                        favorite_count INTEGER DEFAULT 0
                    )
                """))

                # Create indexes for better performance
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);
                    CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace(category);
                    CREATE INDEX IF NOT EXISTS idx_marketplace_vendor_id ON marketplace(vendor_id);
                    CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace(created_at);
                    CREATE INDEX IF NOT EXISTS idx_marketplace_location ON marketplace(latitude, longitude);
                """))

            logger.info("✅ Marketplace table created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to create marketplace table: {e}")
            return False

    def create_categories_table(self) -> bool:
        """Create the categories table."""
        try:
            if self.check_table_exists('marketplace_categories'):
                logger.info("✅ Categories table already exists, skipping creation")
                return True

            logger.info("🏗️ Creating categories table...")
            
            with self.engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS marketplace_categories (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) UNIQUE NOT NULL,
                        description TEXT,
                        icon VARCHAR(50),
                        color VARCHAR(7),
                        is_active BOOLEAN DEFAULT TRUE,
                        sort_order INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))

            logger.info("✅ Categories table created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to create categories table: {e}")
            return False

    def create_subcategories_table(self) -> bool:
        """Create the subcategories table."""
        try:
            if self.check_table_exists('marketplace_subcategories'):
                logger.info("✅ Subcategories table already exists, skipping creation")
                return True

            logger.info("🏗️ Creating subcategories table...")
            
            with self.engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS marketplace_subcategories (
                        id SERIAL PRIMARY KEY,
                        category_id INTEGER REFERENCES marketplace_categories(id) ON DELETE CASCADE,
                        name VARCHAR(100) NOT NULL,
                        description TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        sort_order INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(category_id, name)
                    )
                """))

            logger.info("✅ Subcategories table created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to create subcategories table: {e}")
            return False

    def create_listing_images_table(self) -> bool:
        """Create the listing images table."""
        try:
            if self.check_table_exists('marketplace_listing_images'):
                logger.info("✅ Listing images table already exists, skipping creation")
                return True

            logger.info("🏗️ Creating listing images table...")
            
            with self.engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS marketplace_listing_images (
                        id SERIAL PRIMARY KEY,
                        listing_id INTEGER REFERENCES marketplace(id) ON DELETE CASCADE,
                        image_url VARCHAR(500) NOT NULL,
                        alt_text VARCHAR(255),
                        is_primary BOOLEAN DEFAULT FALSE,
                        sort_order INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))

            logger.info("✅ Listing images table created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to create listing images table: {e}")
            return False

    def create_favorites_table(self) -> bool:
        """Create the favorites table."""
        try:
            if self.check_table_exists('marketplace_favorites'):
                logger.info("✅ Favorites table already exists, skipping creation")
                return True

            logger.info("🏗️ Creating favorites table...")
            
            with self.engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS marketplace_favorites (
                        id SERIAL PRIMARY KEY,
                        listing_id INTEGER REFERENCES marketplace(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(listing_id, user_id)
                    )
                """))

            logger.info("✅ Favorites table created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to create favorites table: {e}")
            return False

    def add_sample_categories(self) -> bool:
        """Add sample categories to the database."""
        try:
            logger.info("📝 Adding sample categories...")
            
            sample_categories = [
                {"name": "Electronics", "description": "Electronic devices and gadgets", "icon": "📱", "color": "#007bff"},
                {"name": "Furniture", "description": "Home and office furniture", "icon": "🪑", "color": "#28a745"},
                {"name": "Clothing", "description": "Apparel and accessories", "icon": "👕", "color": "#dc3545"},
                {"name": "Books", "description": "Books and educational materials", "icon": "📚", "color": "#ffc107"},
                {"name": "Sports", "description": "Sports equipment and gear", "icon": "⚽", "color": "#17a2b8"},
                {"name": "Toys", "description": "Toys and games", "icon": "🧸", "color": "#fd7e14"},
                {"name": "Automotive", "description": "Car parts and accessories", "icon": "🚗", "color": "#6f42c1"},
                {"name": "Home & Garden", "description": "Home improvement and garden items", "icon": "🏠", "color": "#20c997"},
            ]
            
            with self.engine.begin() as conn:
                for category in sample_categories:
                    conn.execute(text("""
                        INSERT INTO marketplace_categories (name, description, icon, color)
                        VALUES (:name, :description, :icon, :color)
                        ON CONFLICT (name) DO NOTHING
                    """), category)

            logger.info("✅ Sample categories added successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add sample categories: {e}")
            return False

    def add_sample_listings(self) -> bool:
        """Add sample listings to the database."""
        try:
            logger.info("📝 Adding sample listings...")
            
            sample_listings = [
                {
                    "title": "iPhone 12 Pro - Excellent Condition",
                    "description": "iPhone 12 Pro in excellent condition. 128GB storage, comes with original box and charger.",
                    "price": 599.99,
                    "category": "Electronics",
                    "subcategory": "Phones",
                    "city": "Miami",
                    "state": "FL",
                    "zip_code": "33101",
                    "latitude": 25.7617,
                    "longitude": -80.1918,
                    "contact_email": "seller@example.com",
                    "contact_phone": "305-555-0123"
                },
                {
                    "title": "Leather Sofa - Like New",
                    "description": "Beautiful leather sofa, barely used. Perfect for living room or office.",
                    "price": 299.99,
                    "category": "Furniture",
                    "subcategory": "Living Room",
                    "city": "Miami",
                    "state": "FL",
                    "zip_code": "33102",
                    "latitude": 25.7617,
                    "longitude": -80.1918,
                    "contact_email": "furniture@example.com",
                    "contact_phone": "305-555-0456"
                },
                {
                    "title": "Men's Suit - Size 42R",
                    "description": "Professional men's suit, navy blue, size 42R. Perfect for interviews or special occasions.",
                    "price": 89.99,
                    "category": "Clothing",
                    "subcategory": "Men's Formal",
                    "city": "Miami",
                    "state": "FL",
                    "zip_code": "33103",
                    "latitude": 25.7617,
                    "longitude": -80.1918,
                    "contact_email": "clothing@example.com",
                    "contact_phone": "305-555-0789"
                }
            ]
            
            with self.engine.begin() as conn:
                for listing in sample_listings:
                    conn.execute(text("""
                        INSERT INTO marketplace (title, description, price, category, subcategory, 
                                               city, state, zip_code, latitude, longitude, 
                                               contact_email, contact_phone)
                        VALUES (:title, :description, :price, :category, :subcategory,
                                :city, :state, :zip_code, :latitude, :longitude,
                                :contact_email, :contact_phone)
                    """), listing)

            logger.info("✅ Sample listings added successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add sample listings: {e}")
            return False

    def run_migration(self) -> bool:
        """Run the complete marketplace migration."""
        logger.info("🚀 Starting unified marketplace migration...")
        
        try:
            # Connect to database
            if not self.connect():
                return False

            # Create tables
            tables_to_create = [
                self.create_marketplace_table,
                self.create_categories_table,
                self.create_subcategories_table,
                self.create_listing_images_table,
                self.create_favorites_table,
            ]
            
            for create_table in tables_to_create:
                if not create_table():
                    logger.error(f"❌ Failed to create table")
                    return False

            # Add sample data
            self.add_sample_categories()
            self.add_sample_listings()

            logger.info("🎉 Marketplace migration completed successfully!")
            return True

        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False

    def rollback(self) -> bool:
        """Rollback the marketplace migration."""
        logger.info("🔄 Rolling back marketplace migration...")
        
        try:
            if not self.connect():
                return False

            tables_to_drop = [
                'marketplace_favorites',
                'marketplace_listing_images', 
                'marketplace_subcategories',
                'marketplace_categories',
                'marketplace'
            ]
            
            with self.engine.begin() as conn:
                for table in tables_to_drop:
                    if self.check_table_exists(table):
                        conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                        logger.info(f"🗑️ Dropped table: {table}")

            logger.info("✅ Rollback completed successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Rollback failed: {e}")
            return False


def upgrade() -> bool:
    """Upgrade function for migration system."""
    migration = MarketplaceMigration()
    return migration.run_migration()


def downgrade() -> bool:
    """Downgrade function for migration system."""
    migration = MarketplaceMigration()
    return migration.rollback()


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Unified Marketplace Migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    parser.add_argument('--database-url', help='Database URL (optional)')
    
    args = parser.parse_args()
    
    migration = MarketplaceMigration(database_url=args.database_url)
    
    if args.rollback:
        success = migration.rollback()
    else:
        success = migration.run_migration()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())


def run_migration() -> bool:
    """Run migration function for API compatibility."""
    migration = MarketplaceMigration()
    return migration.run_migration()
