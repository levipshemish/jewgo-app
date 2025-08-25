#!/usr/bin/env python3
"""Migration script to create the shuls table.
This migration creates a new shuls table with structure adapted for synagogue facilities.

Shuls table will contain:
- Basic synagogue information (name, description, address, etc.)
- Contact information (phone, website, email)
- Operating hours and services
- Synagogue types and denominations
- Location and distance data
- Ratings and reviews
- Images and media
- Religious and cultural information
"""

import os
import sys
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError

# Configure logging using unified logging configuration
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def run_migration() -> bool | None:
    """Run the migration to create the shuls table."""
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
                logger.info("Starting shuls table creation")

                # Create shuls table
                create_shuls_table_sql = """
                CREATE TABLE IF NOT EXISTS shuls (
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
                    
                    -- Shul specific fields
                    shul_type VARCHAR(100), -- orthodox, conservative, reform, etc.
                    shul_category VARCHAR(100), -- ashkenazi, sephardic, chabad, etc.
                    denomination VARCHAR(100), -- orthodox, conservative, reform, etc.
                    business_hours TEXT,
                    hours_parsed BOOLEAN DEFAULT FALSE,
                    timezone VARCHAR(50),
                    
                    -- Services and minyanim
                    has_daily_minyan BOOLEAN DEFAULT FALSE,
                    has_shabbat_services BOOLEAN DEFAULT TRUE,
                    has_holiday_services BOOLEAN DEFAULT TRUE,
                    has_women_section BOOLEAN DEFAULT TRUE,
                    has_mechitza BOOLEAN DEFAULT TRUE,
                    has_separate_entrance BOOLEAN DEFAULT FALSE,
                    
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
                    
                    -- Shul facilities and features
                    has_parking BOOLEAN DEFAULT FALSE,
                    has_disabled_access BOOLEAN DEFAULT FALSE,
                    has_kiddush_facilities BOOLEAN DEFAULT FALSE,
                    has_social_hall BOOLEAN DEFAULT FALSE,
                    has_library BOOLEAN DEFAULT FALSE,
                    has_hebrew_school BOOLEAN DEFAULT FALSE,
                    has_adult_education BOOLEAN DEFAULT FALSE,
                    has_youth_programs BOOLEAN DEFAULT FALSE,
                    has_senior_programs BOOLEAN DEFAULT FALSE,
                    
                    -- Religious and cultural
                    rabbi_name VARCHAR(255),
                    rabbi_phone VARCHAR(50),
                    rabbi_email VARCHAR(255),
                    religious_authority VARCHAR(255),
                    community_affiliation VARCHAR(255),
                    kosher_certification VARCHAR(255),
                    
                    -- Membership and fees
                    membership_required BOOLEAN DEFAULT FALSE,
                    membership_fee DECIMAL(10, 2),
                    fee_currency VARCHAR(3) DEFAULT 'USD',
                    accepts_visitors BOOLEAN DEFAULT TRUE,
                    visitor_policy TEXT,
                    
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
                    listing_type VARCHAR(100) DEFAULT 'shul'
                );
                """

                # Create indexes for performance
                create_indexes_sql = """
                -- Basic indexes
                CREATE INDEX IF NOT EXISTS idx_shuls_name ON shuls(name);
                CREATE INDEX IF NOT EXISTS idx_shuls_city ON shuls(city);
                CREATE INDEX IF NOT EXISTS idx_shuls_shul_type ON shuls(shul_type);
                CREATE INDEX IF NOT EXISTS idx_shuls_shul_category ON shuls(shul_category);
                CREATE INDEX IF NOT EXISTS idx_shuls_denomination ON shuls(denomination);
                CREATE INDEX IF NOT EXISTS idx_shuls_is_active ON shuls(is_active);
                CREATE INDEX IF NOT EXISTS idx_shuls_is_verified ON shuls(is_verified);
                
                -- Location indexes
                CREATE INDEX IF NOT EXISTS idx_shuls_latitude ON shuls(latitude);
                CREATE INDEX IF NOT EXISTS idx_shuls_longitude ON shuls(longitude);
                CREATE INDEX IF NOT EXISTS idx_shuls_distance_miles ON shuls(distance_miles);
                
                -- Rating indexes
                CREATE INDEX IF NOT EXISTS idx_shuls_rating ON shuls(rating);
                CREATE INDEX IF NOT EXISTS idx_shuls_review_count ON shuls(review_count);
                
                -- Service indexes
                CREATE INDEX IF NOT EXISTS idx_shuls_has_daily_minyan ON shuls(has_daily_minyan);
                CREATE INDEX IF NOT EXISTS idx_shuls_has_shabbat_services ON shuls(has_shabbat_services);
                CREATE INDEX IF NOT EXISTS idx_shuls_has_women_section ON shuls(has_women_section);
                CREATE INDEX IF NOT EXISTS idx_shuls_has_mechitza ON shuls(has_mechitza);
                
                -- Search index
                CREATE INDEX IF NOT EXISTS idx_shuls_search_vector ON shuls USING gin(search_vector);
                
                -- Composite indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_shuls_city_shul_type ON shuls(city, shul_type);
                CREATE INDEX IF NOT EXISTS idx_shuls_city_denomination ON shuls(city, denomination);
                CREATE INDEX IF NOT EXISTS idx_shuls_city_has_daily_minyan ON shuls(city, has_daily_minyan);
                CREATE INDEX IF NOT EXISTS idx_shuls_rating_review_count ON shuls(rating, review_count);
                """

                # Create full-text search trigger
                create_search_trigger_sql = """
                -- Create function to update search vector
                CREATE OR REPLACE FUNCTION shuls_search_vector_update() RETURNS trigger AS $$
                BEGIN
                    NEW.search_vector :=
                        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.shul_type, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.shul_category, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.denomination, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.rabbi_name, '')), 'C');
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Create trigger to automatically update search vector
                DROP TRIGGER IF EXISTS shuls_search_vector_trigger ON shuls;
                CREATE TRIGGER shuls_search_vector_trigger
                    BEFORE INSERT OR UPDATE ON shuls
                    FOR EACH ROW
                    EXECUTE FUNCTION shuls_search_vector_update();
                """

                # Execute the SQL statements
                logger.info("Creating shuls table...")
                conn.execute(text(create_shuls_table_sql))
                
                logger.info("Creating indexes...")
                conn.execute(text(create_indexes_sql))
                
                logger.info("Creating search trigger...")
                conn.execute(text(create_search_trigger_sql))

                # Commit transaction
                trans.commit()
                logger.info("Successfully created shuls table with all indexes and triggers")

                return True

            except SQLAlchemyError as e:
                # Rollback transaction on error
                trans.rollback()
                logger.error("Error creating shuls table", error=str(e))
                return False

    except Exception as e:
        logger.error("Failed to create shuls table", error=str(e))
        return False


if __name__ == "__main__":
    success = run_migration()
    if success:
        logger.info("Shuls table migration completed successfully")
        sys.exit(0)
    else:
        logger.error("Shuls table migration failed")
        sys.exit(1)
