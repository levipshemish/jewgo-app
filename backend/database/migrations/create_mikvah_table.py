#!/usr/bin/env python3
"""Migration script to create the mikvah table.
This migration creates a new mikvah table with structure adapted for mikvah facilities.

Mikvah table will contain:
- Basic mikvah information (name, description, address, etc.)
- Contact information (phone, website, email)
- Operating hours and appointment system
- Mikvah types and facilities
- Location and distance data
- Ratings and reviews
- Images and media
- Religious and cultural information
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
    """Run the migration to create the mikvah table."""
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
                logger.info("Starting mikvah table creation")

                # Create mikvah table
                create_mikvah_table_sql = """
                CREATE TABLE IF NOT EXISTS mikvah (
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
                    
                    -- Mikvah specific fields
                    mikvah_type VARCHAR(100), -- women's, men's, both, etc.
                    mikvah_category VARCHAR(100), -- community, private, hotel, etc.
                    business_hours TEXT,
                    hours_parsed BOOLEAN DEFAULT FALSE,
                    timezone VARCHAR(50),
                    
                    -- Appointment and access
                    requires_appointment BOOLEAN DEFAULT FALSE,
                    appointment_phone VARCHAR(50),
                    appointment_website VARCHAR(500),
                    walk_in_available BOOLEAN DEFAULT FALSE,
                    advance_booking_days INTEGER DEFAULT 0,
                    
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
                    
                    -- Mikvah facilities and features
                    has_changing_rooms BOOLEAN DEFAULT TRUE,
                    has_shower_facilities BOOLEAN DEFAULT TRUE,
                    has_towels_provided BOOLEAN DEFAULT FALSE,
                    has_soap_provided BOOLEAN DEFAULT FALSE,
                    has_hair_dryers BOOLEAN DEFAULT FALSE,
                    has_private_entrance BOOLEAN DEFAULT FALSE,
                    has_disabled_access BOOLEAN DEFAULT FALSE,
                    has_parking BOOLEAN DEFAULT FALSE,
                    
                    -- Religious and cultural
                    rabbinical_supervision VARCHAR(255),
                    kosher_certification VARCHAR(255),
                    community_affiliation VARCHAR(255),
                    religious_authority VARCHAR(255),
                    
                    -- Fees and payment
                    fee_amount DECIMAL(10, 2),
                    fee_currency VARCHAR(3) DEFAULT 'USD',
                    accepts_credit_cards BOOLEAN DEFAULT FALSE,
                    accepts_cash BOOLEAN DEFAULT TRUE,
                    accepts_checks BOOLEAN DEFAULT FALSE,
                    
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
                    listing_type VARCHAR(100) DEFAULT 'mikvah'
                );
                """

                # Create indexes for performance
                create_indexes_sql = """
                -- Basic indexes
                CREATE INDEX IF NOT EXISTS idx_mikvah_name ON mikvah(name);
                CREATE INDEX IF NOT EXISTS idx_mikvah_city ON mikvah(city);
                CREATE INDEX IF NOT EXISTS idx_mikvah_mikvah_type ON mikvah(mikvah_type);
                CREATE INDEX IF NOT EXISTS idx_mikvah_mikvah_category ON mikvah(mikvah_category);
                CREATE INDEX IF NOT EXISTS idx_mikvah_is_active ON mikvah(is_active);
                CREATE INDEX IF NOT EXISTS idx_mikvah_is_verified ON mikvah(is_verified);
                
                -- Location indexes
                CREATE INDEX IF NOT EXISTS idx_mikvah_latitude ON mikvah(latitude);
                CREATE INDEX IF NOT EXISTS idx_mikvah_longitude ON mikvah(longitude);
                CREATE INDEX IF NOT EXISTS idx_mikvah_distance_miles ON mikvah(distance_miles);
                
                -- Rating indexes
                CREATE INDEX IF NOT EXISTS idx_mikvah_rating ON mikvah(rating);
                CREATE INDEX IF NOT EXISTS idx_mikvah_review_count ON mikvah(review_count);
                
                -- Appointment indexes
                CREATE INDEX IF NOT EXISTS idx_mikvah_requires_appointment ON mikvah(requires_appointment);
                CREATE INDEX IF NOT EXISTS idx_mikvah_walk_in_available ON mikvah(walk_in_available);
                
                -- Search index
                CREATE INDEX IF NOT EXISTS idx_mikvah_search_vector ON mikvah USING gin(search_vector);
                
                -- Composite indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_mikvah_city_mikvah_type ON mikvah(city, mikvah_type);
                CREATE INDEX IF NOT EXISTS idx_mikvah_city_requires_appointment ON mikvah(city, requires_appointment);
                CREATE INDEX IF NOT EXISTS idx_mikvah_rating_review_count ON mikvah(rating, review_count);
                """

                # Create full-text search trigger
                create_search_trigger_sql = """
                -- Create function to update search vector
                CREATE OR REPLACE FUNCTION mikvah_search_vector_update() RETURNS trigger AS $$
                BEGIN
                    NEW.search_vector :=
                        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.mikvah_type, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.mikvah_category, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.rabbinical_supervision, '')), 'C');
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Create trigger to automatically update search vector
                DROP TRIGGER IF EXISTS mikvah_search_vector_trigger ON mikvah;
                CREATE TRIGGER mikvah_search_vector_trigger
                    BEFORE INSERT OR UPDATE ON mikvah
                    FOR EACH ROW
                    EXECUTE FUNCTION mikvah_search_vector_update();
                """

                # Execute the SQL statements
                logger.info("Creating mikvah table...")
                conn.execute(text(create_mikvah_table_sql))

                logger.info("Creating indexes...")
                conn.execute(text(create_indexes_sql))

                logger.info("Creating search trigger...")
                conn.execute(text(create_search_trigger_sql))

                # Commit transaction
                trans.commit()
                logger.info(
                    "Successfully created mikvah table with all indexes and triggers"
                )

                return True

            except SQLAlchemyError as e:
                # Rollback transaction on error
                trans.rollback()
                logger.error("Error creating mikvah table", error=str(e))
                return False

    except Exception as e:
        logger.error("Failed to create mikvah table", error=str(e))
        return False


if __name__ == "__main__":
    success = run_migration()
    if success:
        logger.info("Mikvah table migration completed successfully")
        sys.exit(0)
    else:
        logger.error("Mikvah table migration failed")
        sys.exit(1)
