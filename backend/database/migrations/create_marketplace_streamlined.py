#!/usr/bin/env python3
"""Database Migration: Create Streamlined Marketplace Schema.
=======================================================

This migration creates the streamlined marketplace schema with three creation paths:
- Regular (generic items)
- Vehicle (with vehicle-specific attributes)
- Appliance (with kosher flags)

Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""

import os
import sys
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, MetaData, String, Table, Text,
    create_engine, text, ForeignKey, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.exc import SQLAlchemyError

# Configure logging using unified logging configuration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.logging_config import get_logger

logger = get_logger(__name__)


def run_migration() -> bool:
    """Run the migration to create the streamlined marketplace schema."""
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
                logger.info("Starting streamlined marketplace schema creation")

                # 1. Create extensions
                logger.info("Creating PostgreSQL extensions")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gin"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))

                # 2. Create enum types
                logger.info("Creating enum types")
                
                # Listing kind enum (creation flow)
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE listing_kind AS ENUM ('regular','vehicle','appliance');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))

                # Transaction type enum
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE transaction_type AS ENUM ('sale');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))

                # Item condition enum
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE item_condition AS ENUM ('new','used_like_new','used_good','used_fair');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))

                # Kosher use enum
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE kosher_use AS ENUM ('meat','dairy','pareve','unspecified');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))

                # 3. Create categories table
                logger.info("Creating categories table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS categories (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        slug TEXT NOT NULL UNIQUE,
                        sort_order INT NOT NULL DEFAULT 100,
                        active BOOLEAN NOT NULL DEFAULT TRUE
                    )
                """))

                # 4. Create subcategories table
                logger.info("Creating subcategories table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS subcategories (
                        id SERIAL PRIMARY KEY,
                        category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                        name TEXT NOT NULL,
                        slug TEXT NOT NULL,
                        sort_order INT NOT NULL DEFAULT 100,
                        active BOOLEAN NOT NULL DEFAULT TRUE,
                        UNIQUE (category_id, slug)
                    )
                """))

                # 5. Create listings table
                logger.info("Creating listings table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listings (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        
                        -- Which creation flow
                        kind listing_kind NOT NULL,
                        txn_type transaction_type NOT NULL DEFAULT 'sale',
                        
                        -- Generic stuff every flow collects
                        title TEXT NOT NULL,
                        description TEXT,
                        price_cents INT NOT NULL DEFAULT 0,
                        currency TEXT NOT NULL DEFAULT 'USD',
                        condition item_condition NOT NULL,
                        
                        category_id INT NOT NULL REFERENCES categories(id),
                        subcategory_id INT REFERENCES subcategories(id),
                        
                        city TEXT,
                        region TEXT,
                        zip TEXT,
                        country TEXT DEFAULT 'US',
                        lat NUMERIC(9,6),
                        lng NUMERIC(9,6),
                        
                        seller_user_id TEXT, -- Will be UUID when users table is ready
                        
                        -- Per-kind attributes live here
                        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
                        
                        -- Endorsements
                        endorse_up INT NOT NULL DEFAULT 0,
                        endorse_down INT NOT NULL DEFAULT 0,
                        
                        status TEXT NOT NULL DEFAULT 'active',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                """))

                # 6. Create updated_at trigger function
                logger.info("Creating updated_at trigger function")
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION touch_updated_at()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at := now();
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                """))

                # 7. Create trigger for listings
                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trg_listings_touch ON listings;
                    CREATE TRIGGER trg_listings_touch
                    BEFORE UPDATE ON listings
                    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
                """))

                # 8. Create validation trigger for listing kind
                logger.info("Creating listing kind validation trigger")
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION validate_listing_kind()
                    RETURNS TRIGGER AS $$
                    DECLARE
                      k listing_kind;
                    BEGIN
                      k := NEW.kind;
                    
                      IF k = 'vehicle' THEN
                        IF NOT (NEW.attributes ? 'vehicle_type'
                            AND NEW.attributes ? 'year'
                            AND NEW.attributes ? 'mileage'
                            AND NEW.attributes ? 'make'
                            AND NEW.attributes ? 'model') THEN
                          RAISE EXCEPTION 'Vehicle listings require vehicle_type, year, mileage, make, model in attributes';
                        END IF;
                      ELSIF k = 'appliance' THEN
                        IF NOT (NEW.attributes ? 'appliance_type'
                            AND NEW.attributes ? 'kosher_use') THEN
                          RAISE EXCEPTION 'Appliance listings require appliance_type and kosher_use in attributes';
                        END IF;
                      ELSE
                        -- 'regular' path: we keep it open; no special required attributes
                        NULL;
                      END IF;
                    
                      RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                """))

                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trg_validate_listing_kind ON listings;
                    CREATE TRIGGER trg_validate_listing_kind
                    BEFORE INSERT OR UPDATE ON listings
                    FOR EACH ROW EXECUTE FUNCTION validate_listing_kind();
                """))

                # 9. Create indexes for listings
                logger.info("Creating indexes for listings")
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_cat_price_idx ON listings (category_id, price_cents, condition)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_city_idx ON listings (city, region)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_geo_idx ON listings (lat, lng)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_created_idx ON listings (created_at DESC)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_search_trgm_idx ON listings USING GIN ((title || ' ' || coalesce(description,'')) gin_trgm_ops)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS listings_attr_gin ON listings USING GIN (attributes)"))

                # 10. Create listing_images table
                logger.info("Creating listing_images table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listing_images (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                        url TEXT NOT NULL,
                        sort_order INT NOT NULL DEFAULT 1
                    )
                """))

                conn.execute(text("CREATE INDEX IF NOT EXISTS listing_images_listing_idx ON listing_images (listing_id, sort_order)"))

                # 11. Create endorsements table
                logger.info("Creating endorsements table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS endorsements (
                        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                        user_id TEXT NOT NULL, -- Will be UUID when users table is ready
                        value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        PRIMARY KEY (listing_id, user_id)
                    )
                """))

                # 12. Create endorsements trigger function
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION endorsements_apply_counts()
                    RETURNS TRIGGER AS $$
                    BEGIN
                      IF TG_OP = 'INSERT' THEN
                        IF NEW.value = 1 THEN
                          UPDATE listings SET endorse_up = endorse_up + 1 WHERE id = NEW.listing_id;
                        ELSE
                          UPDATE listings SET endorse_down = endorse_down + 1 WHERE id = NEW.listing_id;
                        END IF;
                      ELSIF TG_OP = 'UPDATE' THEN
                        IF OLD.value <> NEW.value THEN
                          IF NEW.value = 1 THEN
                            UPDATE listings SET endorse_up = endorse_up + 1,
                                                endorse_down = endorse_down - 1 WHERE id = NEW.listing_id;
                          ELSE
                            UPDATE listings SET endorse_down = endorse_down + 1,
                                                endorse_up = endorse_up - 1 WHERE id = NEW.listing_id;
                          END IF;
                        END IF;
                      ELSIF TG_OP = 'DELETE' THEN
                        IF OLD.value = 1 THEN
                          UPDATE listings SET endorse_up = endorse_up - 1 WHERE id = OLD.listing_id;
                        ELSE
                          UPDATE listings SET endorse_down = endorse_down - 1 WHERE id = OLD.listing_id;
                        END IF;
                      END IF;
                      RETURN NULL;
                    END;
                    $$ LANGUAGE plpgsql;
                """))

                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trg_endorsements_counts ON endorsements;
                    CREATE TRIGGER trg_endorsements_counts
                    AFTER INSERT OR UPDATE OR DELETE ON endorsements
                    FOR EACH ROW EXECUTE FUNCTION endorsements_apply_counts();
                """))

                # 13. Insert seed categories
                logger.info("Inserting seed categories")
                conn.execute(text("""
                    INSERT INTO categories (name, slug, sort_order) VALUES
                    ('Vehicles & Auto','vehicles-auto',10),
                    ('Appliances & Kitchen','appliances-kitchen',20),
                    ('Kitchen & Dining','kitchen-dining',21),
                    ('Furniture & Home Goods','home-furniture',30),
                    ('Electronics & Tech','electronics-tech',40),
                    ('Clothing & Accessories','clothing-accessories',50),
                    ('Travel & Luggage','travel-luggage',60),
                    ('Jewish Art & Collectibles','jewish-art',70),
                    ('Miscellaneous','misc',99)
                    ON CONFLICT (slug) DO NOTHING
                """))

                # Insert sample subcategories
                conn.execute(text("""
                    INSERT INTO subcategories (category_id,name,slug,sort_order) VALUES
                    ((SELECT id FROM categories WHERE slug='vehicles-auto'),'Cars','cars',1),
                    ((SELECT id FROM categories WHERE slug='vehicles-auto'),'Motorcycles','motorcycles',2),
                    ((SELECT id FROM categories WHERE slug='vehicles-auto'),'Scooters','scooters',3),
                    ((SELECT id FROM categories WHERE slug='vehicles-auto'),'Bicycles','bicycles',4),
                    ((SELECT id FROM categories WHERE slug='home-furniture'),'Sofas','sofas',1),
                    ((SELECT id FROM categories WHERE slug='home-furniture'),'Tables','tables',2),
                    ((SELECT id FROM categories WHERE slug='home-furniture'),'Beds','beds',3)
                    ON CONFLICT (category_id, slug) DO NOTHING
                """))

                # Commit transaction
                trans.commit()
                logger.info("✅ Streamlined marketplace schema created successfully")

                return True

            except Exception as e:
                trans.rollback()
                logger.exception("Error during streamlined marketplace schema creation")
                return False

    except SQLAlchemyError as e:
        logger.exception("Database error during migration", error=str(e))
        return False
    except Exception as e:
        logger.exception("Unexpected error during migration", error=str(e))
        return False


def rollback_migration() -> bool:
    """Rollback the migration by dropping the marketplace tables."""
    try:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False

        engine = create_engine(database_url)

        with engine.connect() as conn:
            trans = conn.begin()

            try:
                logger.info("Rolling back streamlined marketplace schema")

                # Drop tables in reverse order
                conn.execute(text("DROP TABLE IF EXISTS endorsements CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS listing_images CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS listings CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS subcategories CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS categories CASCADE"))

                # Drop functions
                conn.execute(text("DROP FUNCTION IF EXISTS endorsements_apply_counts() CASCADE"))
                conn.execute(text("DROP FUNCTION IF EXISTS validate_listing_kind() CASCADE"))
                conn.execute(text("DROP FUNCTION IF EXISTS touch_updated_at() CASCADE"))

                # Drop enum types
                conn.execute(text("DROP TYPE IF EXISTS kosher_use CASCADE"))
                conn.execute(text("DROP TYPE IF EXISTS item_condition CASCADE"))
                conn.execute(text("DROP TYPE IF EXISTS transaction_type CASCADE"))
                conn.execute(text("DROP TYPE IF EXISTS listing_kind CASCADE"))

                trans.commit()
                logger.info("✅ Streamlined marketplace schema rollback completed")

                return True

            except Exception as e:
                trans.rollback()
                logger.exception("Error during rollback")
                return False

    except Exception as e:
        logger.exception("Unexpected error during rollback", error=str(e))
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
