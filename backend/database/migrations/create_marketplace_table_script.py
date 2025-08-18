#!/usr/bin/env python3
"""Migration script to create the marketplace table.
This creates the marketplace table with all required fields for product listings.
"""

import os
import sys
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Float, Boolean, DateTime, Text, Numeric, Date
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logging_config import get_logger

logger = get_logger(__name__)

def run_migration() -> bool:
    """Run the migration to create the marketplace table."""
    
    database_url = os.getenv('DATABASE_URL')
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
                logger.info("Creating marketplace table...")
                
                # Create marketplace table
                create_table_sql = """
                CREATE TABLE IF NOT EXISTS marketplace (
                    -- 🔒 System-Generated / Controlled
                    id SERIAL PRIMARY KEY,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    
                    -- 🧾 Required Fields
                    name VARCHAR(255) NOT NULL,
                    title VARCHAR(500) NOT NULL,
                    price NUMERIC(10, 2) NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    location VARCHAR(500) NOT NULL,
                    vendor_name VARCHAR(255) NOT NULL,
                    
                    -- 📍 Location Details
                    city VARCHAR(100) NOT NULL,
                    state VARCHAR(50) NOT NULL,
                    zip_code VARCHAR(20) NOT NULL,
                    latitude FLOAT,
                    longitude FLOAT,
                    
                    -- 🖼️ Product Images
                    product_image VARCHAR(2000),
                    additional_images VARCHAR(2000)[],
                    thumbnail VARCHAR(2000),
                    
                    -- 📋 Product Details
                    subcategory VARCHAR(100),
                    description TEXT,
                    original_price NUMERIC(10, 2),
                    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                    stock INTEGER NOT NULL DEFAULT 0,
                    is_available BOOLEAN NOT NULL DEFAULT TRUE,
                    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                    is_on_sale BOOLEAN NOT NULL DEFAULT FALSE,
                    discount_percentage INTEGER,
                    
                    -- 🏪 Vendor Information
                    vendor_id VARCHAR(100),
                    vendor_logo VARCHAR(2000),
                    vendor_address VARCHAR(500),
                    vendor_phone VARCHAR(50),
                    vendor_email VARCHAR(255),
                    vendor_website VARCHAR(500),
                    vendor_rating FLOAT,
                    vendor_review_count INTEGER NOT NULL DEFAULT 0,
                    vendor_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    vendor_is_premium BOOLEAN NOT NULL DEFAULT FALSE,
                    
                    -- 🧼 Kosher Certification
                    kosher_agency VARCHAR(100),
                    kosher_level VARCHAR(50),
                    kosher_certificate_number VARCHAR(100),
                    kosher_expiry_date DATE,
                    kosher_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    
                    -- 🥗 Dietary Information
                    is_gluten_free BOOLEAN NOT NULL DEFAULT FALSE,
                    is_dairy_free BOOLEAN NOT NULL DEFAULT FALSE,
                    is_nut_free BOOLEAN NOT NULL DEFAULT FALSE,
                    is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
                    is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
                    allergens VARCHAR(100)[],
                    
                    -- 🏷️ Product Metadata
                    tags VARCHAR(100)[],
                    specifications JSONB,
                    shipping_info JSONB,
                    
                    -- ⭐ Ratings & Reviews
                    rating FLOAT NOT NULL DEFAULT 0.0,
                    review_count INTEGER NOT NULL DEFAULT 0,
                    
                    -- 📊 Business Logic
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    priority INTEGER NOT NULL DEFAULT 0,
                    expiry_date DATE,
                    created_by VARCHAR(100),
                    approved_by VARCHAR(100),
                    approved_at TIMESTAMP,
                    
                    -- 📝 Additional Information
                    notes TEXT,
                    external_id VARCHAR(100),
                    source VARCHAR(50) NOT NULL DEFAULT 'manual'
                );
                """
                
                conn.execute(text(create_table_sql))
                
                # Create indexes
                indexes_sql = [
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_name ON marketplace(name);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace(category);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_subcategory ON marketplace(subcategory);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_vendor_name ON marketplace(vendor_name);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_price ON marketplace(price);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_is_featured ON marketplace(is_featured);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_is_on_sale ON marketplace(is_on_sale);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_rating ON marketplace(rating);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace(created_at);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_location ON marketplace(city, state);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_kosher_agency ON marketplace(kosher_agency);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_kosher_level ON marketplace(kosher_level);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_vendor_id ON marketplace(vendor_id);",
                    "CREATE INDEX IF NOT EXISTS idx_marketplace_external_id ON marketplace(external_id);"
                ]
                
                for index_sql in indexes_sql:
                    conn.execute(text(index_sql))
                
                # Create check constraints (with proper error handling)
                constraints_sql = [
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_price_positive') THEN ALTER TABLE marketplace ADD CONSTRAINT check_price_positive CHECK (price >= 0); END IF; END $$;",
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_positive') THEN ALTER TABLE marketplace ADD CONSTRAINT check_stock_positive CHECK (stock >= 0); END IF; END $$;",
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_rating_range') THEN ALTER TABLE marketplace ADD CONSTRAINT check_rating_range CHECK (rating >= 0 AND rating <= 5); END IF; END $$;",
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_discount_range') THEN ALTER TABLE marketplace ADD CONSTRAINT check_discount_range CHECK (discount_percentage >= 0 AND discount_percentage <= 100); END IF; END $$;",
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_status_valid') THEN ALTER TABLE marketplace ADD CONSTRAINT check_status_valid CHECK (status IN ('active', 'inactive', 'pending', 'sold_out')); END IF; END $$;",
                    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_kosher_level_valid') THEN ALTER TABLE marketplace ADD CONSTRAINT check_kosher_level_valid CHECK (kosher_level IN ('glatt', 'regular', 'chalav_yisrael', 'pas_yisrael')); END IF; END $$;"
                ]
                
                for constraint_sql in constraints_sql:
                    conn.execute(text(constraint_sql))
                
                # Add comments
                comments_sql = [
                    "COMMENT ON TABLE marketplace IS 'Marketplace product listings with kosher certification and vendor information';",
                    "COMMENT ON COLUMN marketplace.id IS 'Unique product identifier';",
                    "COMMENT ON COLUMN marketplace.name IS 'Product name (required)';",
                    "COMMENT ON COLUMN marketplace.title IS 'Product title/display name (required)';",
                    "COMMENT ON COLUMN marketplace.price IS 'Product price in USD (required)';",
                    "COMMENT ON COLUMN marketplace.category IS 'Main product category (required)';",
                    "COMMENT ON COLUMN marketplace.location IS 'Product location/address (required)';",
                    "COMMENT ON COLUMN marketplace.product_image IS 'Main product image URL';",
                    "COMMENT ON COLUMN marketplace.subcategory IS 'Product subcategory';",
                    "COMMENT ON COLUMN marketplace.description IS 'Product description';",
                    "COMMENT ON COLUMN marketplace.vendor_name IS 'Vendor/store name (required)';",
                    "COMMENT ON COLUMN marketplace.kosher_agency IS 'Kosher certification agency';",
                    "COMMENT ON COLUMN marketplace.kosher_level IS 'Kosher certification level';",
                    "COMMENT ON COLUMN marketplace.status IS 'Product status: active, inactive, pending, sold_out';",
                    "COMMENT ON COLUMN marketplace.rating IS 'Product rating from 0 to 5';",
                    "COMMENT ON COLUMN marketplace.stock IS 'Available stock quantity';",
                    "COMMENT ON COLUMN marketplace.is_available IS 'Whether product is available for purchase';",
                    "COMMENT ON COLUMN marketplace.is_featured IS 'Whether product is featured';",
                    "COMMENT ON COLUMN marketplace.is_on_sale IS 'Whether product is on sale';",
                    "COMMENT ON COLUMN marketplace.discount_percentage IS 'Discount percentage (0-100)';"
                ]
                
                for comment_sql in comments_sql:
                    conn.execute(text(comment_sql))
                
                # Commit transaction
                trans.commit()
                
                logger.info("✅ Marketplace table created successfully!")
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Failed to create marketplace table: {e}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("✅ Marketplace table migration completed successfully!")
        sys.exit(0)
    else:
        print("❌ Marketplace table migration failed!")
        sys.exit(1)
