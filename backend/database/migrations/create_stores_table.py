#!/usr/bin/env python3
"""Migration script to create the stores table.
This migration creates a new stores table with similar structure to restaurants.

Stores table will contain:
- Basic store information (name, description, address, etc.)
- Contact information (phone, website, email)
- Operating hours
- Store categories and types
- Location and distance data
- Ratings and reviews
- Images and media
"""

import os
import sys

from sqlalchemy import (
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError

# Configure logging using unified logging configuration
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def run_migration() -> bool | None:
    """Run the migration to create the stores table."""
    database_url = os.environ.get("DATABASE_URL")

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
                logger.info("Starting stores table creation")

                # Create stores table
                create_stores_table_sql = """
                CREATE TABLE IF NOT EXISTS stores (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    address TEXT,
                    city VARCHAR(100),
                    state VARCHAR(50),
                    zip_code VARCHAR(20),
                    country VARCHAR(50) DEFAULT 'USA',
                    latitude DECIMAL(10, 8),
                    longitude DECIMAL(11, 8),
                    phone_number VARCHAR(50),
                    website VARCHAR(500),
                    email VARCHAR(255),
                    
                    -- Store specific fields
                    store_type VARCHAR(100), -- grocery, clothing, electronics, etc.
                    store_category VARCHAR(100), -- kosher, general, specialty, etc.
                    business_hours TEXT,
                    hours_parsed BOOLEAN DEFAULT FALSE,
                    timezone VARCHAR(50),
                    
                    -- Location and distance
                    distance VARCHAR(50),
                    distance_miles DECIMAL(8, 2),
                    
                    -- Ratings and reviews
                    rating DECIMAL(3, 2),
                    review_count INTEGER DEFAULT 0,
                    star_rating DECIMAL(3, 2),
                    google_rating DECIMAL(3, 2),
                    
                    -- Images and media
                    image_url TEXT,
                    logo_url TEXT,
                    
                    -- Store features
                    has_parking BOOLEAN DEFAULT FALSE,
                    has_delivery BOOLEAN DEFAULT FALSE,
                    has_pickup BOOLEAN DEFAULT FALSE,
                    accepts_credit_cards BOOLEAN DEFAULT TRUE,
                    accepts_cash BOOLEAN DEFAULT TRUE,
                    
                    -- Kosher specific fields
                    kosher_certification VARCHAR(255),
                    kosher_category VARCHAR(100),
                    is_cholov_yisroel BOOLEAN DEFAULT FALSE,
                    is_pas_yisroel BOOLEAN DEFAULT FALSE,
                    
                    -- Status and metadata
                    is_active BOOLEAN DEFAULT TRUE,
                    is_verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    -- Search and filtering
                    search_vector tsvector,
                    tags TEXT[],
                    
                    -- Admin fields
                    admin_notes TEXT,
                    specials TEXT,
                    listing_type VARCHAR(100) DEFAULT 'store'
                );
                """

                # Create indexes for performance
                create_indexes_sql = """
                -- Basic indexes
                CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);
                CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
                CREATE INDEX IF NOT EXISTS idx_stores_store_type ON stores(store_type);
                CREATE INDEX IF NOT EXISTS idx_stores_store_category ON stores(store_category);
                CREATE INDEX IF NOT EXISTS idx_stores_kosher_category ON stores(kosher_category);
                CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
                CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON stores(is_verified);
                
                -- Location indexes
                CREATE INDEX IF NOT EXISTS idx_stores_latitude ON stores(latitude);
                CREATE INDEX IF NOT EXISTS idx_stores_longitude ON stores(longitude);
                CREATE INDEX IF NOT EXISTS idx_stores_distance_miles ON stores(distance_miles);
                
                -- Rating indexes
                CREATE INDEX IF NOT EXISTS idx_stores_rating ON stores(rating);
                CREATE INDEX IF NOT EXISTS idx_stores_review_count ON stores(review_count);
                
                -- Search index
                CREATE INDEX IF NOT EXISTS idx_stores_search_vector ON stores USING gin(search_vector);
                
                -- Composite indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_stores_city_store_type ON stores(city, store_type);
                CREATE INDEX IF NOT EXISTS idx_stores_city_kosher_category ON stores(city, kosher_category);
                CREATE INDEX IF NOT EXISTS idx_stores_rating_review_count ON stores(rating, review_count);
                """

                # Create full-text search trigger
                create_search_trigger_sql = """
                -- Create function to update search vector
                CREATE OR REPLACE FUNCTION stores_search_vector_update() RETURNS trigger AS $$
                BEGIN
                    NEW.search_vector :=
                        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.store_type, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.store_category, '')), 'C');
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Create trigger to automatically update search vector
                DROP TRIGGER IF EXISTS stores_search_vector_trigger ON stores;
                CREATE TRIGGER stores_search_vector_trigger
                    BEFORE INSERT OR UPDATE ON stores
                    FOR EACH ROW
                    EXECUTE FUNCTION stores_search_vector_update();
                """

                # Execute the SQL statements
                logger.info("Creating stores table...")
                conn.execute(text(create_stores_table_sql))
                
                logger.info("Creating indexes...")
                conn.execute(text(create_indexes_sql))
                
                logger.info("Creating search trigger...")
                conn.execute(text(create_search_trigger_sql))

                # Commit transaction
                trans.commit()
                logger.info("Successfully created stores table with all indexes and triggers")

                return True

            except SQLAlchemyError as e:
                # Rollback transaction on error
                trans.rollback()
                logger.error("Error creating stores table", error=str(e))
                return False

    except Exception as e:
        logger.error("Failed to create stores table", error=str(e))
        return False


if __name__ == "__main__":
    success = run_migration()
    if success:
        logger.info("Stores table migration completed successfully")
        sys.exit(0)
    else:
        logger.error("Stores table migration failed")
        sys.exit(1)
