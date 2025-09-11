#!/usr/bin/env python3
"""
Migration script to ensure Mikvah and Store models are properly integrated into v5.

This migration ensures that the Mikvah and Store models are properly loaded
and available in the entity repository v5 system.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
import logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def run_migration() -> bool:
    """Run the migration to ensure Mikvah and Store models are integrated."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return False
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if mikvahs table exists
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'mikvahs'
                );
            """))
            mikvahs_exists = result.scalar()
            
            # Check if stores table exists
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'stores'
                );
            """))
            stores_exists = result.scalar()
            
            logger.info(f"Mikvahs table exists: {mikvahs_exists}")
            logger.info(f"Stores table exists: {stores_exists}")
            
            # If tables don't exist, create them
            if not mikvahs_exists:
                logger.info("Creating mikvahs table...")
                connection.execute(text("""
                    CREATE TABLE mikvahs (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        address VARCHAR(500) NOT NULL,
                        city VARCHAR(100) NOT NULL,
                        state VARCHAR(50) NOT NULL,
                        zip_code VARCHAR(20) NOT NULL,
                        phone VARCHAR(20),
                        website VARCHAR(500),
                        email VARCHAR(255),
                        latitude DECIMAL(10, 8),
                        longitude DECIMAL(11, 8),
                        mikvah_type VARCHAR(50),
                        appointment_required BOOLEAN DEFAULT FALSE,
                        hours_monday VARCHAR(100),
                        hours_tuesday VARCHAR(100),
                        hours_wednesday VARCHAR(100),
                        hours_thursday VARCHAR(100),
                        hours_friday VARCHAR(100),
                        hours_saturday VARCHAR(100),
                        hours_sunday VARCHAR(100),
                        kosher_certification VARCHAR(100),
                        accessibility_features TEXT,
                        parking_available BOOLEAN DEFAULT FALSE,
                        rating DECIMAL(3, 2) DEFAULT 0.0,
                        review_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                logger.info("Mikvahs table created successfully")
            
            if not stores_exists:
                logger.info("Creating stores table...")
                connection.execute(text("""
                    CREATE TABLE stores (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        address VARCHAR(500) NOT NULL,
                        city VARCHAR(100) NOT NULL,
                        state VARCHAR(50) NOT NULL,
                        zip_code VARCHAR(20) NOT NULL,
                        phone VARCHAR(20),
                        website VARCHAR(500),
                        email VARCHAR(255),
                        latitude DECIMAL(10, 8),
                        longitude DECIMAL(11, 8),
                        store_type VARCHAR(50),
                        kosher_certification VARCHAR(100),
                        hours_monday VARCHAR(100),
                        hours_tuesday VARCHAR(100),
                        hours_wednesday VARCHAR(100),
                        hours_thursday VARCHAR(100),
                        hours_friday VARCHAR(100),
                        hours_saturday VARCHAR(100),
                        hours_sunday VARCHAR(100),
                        parking_available BOOLEAN DEFAULT FALSE,
                        delivery_available BOOLEAN DEFAULT FALSE,
                        rating DECIMAL(3, 2) DEFAULT 0.0,
                        review_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                logger.info("Stores table created successfully")
            
            # Create indexes for better performance
            logger.info("Creating indexes...")
            
            # Mikvahs indexes
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_mikvahs_location 
                ON mikvahs USING GIST (ll_to_earth(latitude, longitude));
            """))
            
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_mikvahs_city_state 
                ON mikvahs (city, state);
            """))
            
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_mikvahs_type 
                ON mikvahs (mikvah_type);
            """))
            
            # Stores indexes
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_stores_location 
                ON stores USING GIST (ll_to_earth(latitude, longitude));
            """))
            
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_stores_city_state 
                ON stores (city, state);
            """))
            
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_stores_type 
                ON stores (store_type);
            """))
            
            logger.info("Indexes created successfully")
            
            # Update migration tracking
            connection.execute(text("""
                INSERT INTO migration_history (migration_name, applied_at, description)
                VALUES ('v5_consolidation_008_mikvah_store_models', CURRENT_TIMESTAMP, 
                        'Ensure Mikvah and Store models are integrated into v5')
                ON CONFLICT (migration_name) DO NOTHING;
            """))
            
            connection.commit()
            logger.info("Migration completed successfully")
            return True
            
    except SQLAlchemyError as e:
        logger.error(f"Database error during migration: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during migration: {e}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
