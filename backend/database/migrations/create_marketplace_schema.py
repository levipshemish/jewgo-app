#!/usr/bin/env python3
"""Database Migration: Create Marketplace Schema.
============================================

This migration creates the complete marketplace schema including:
- Enum types for listing_type, item_condition, kosher_use
- Core tables: users, usernames, categories, subcategories, gemachs
- Main listings table with all constraints and indexes
- Supporting tables: listing_endorsements, listing_transactions, listing_images

Author: JewGo Development Team
Version: 4.0
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
    """Run the migration to create the marketplace schema."""
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
                logger.info("Starting marketplace schema creation")

                # 1. Create extensions
                logger.info("Creating PostgreSQL extensions")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gin"))

                # 2. Create enum types
                logger.info("Creating enum types")
                
                # Listing type enum
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE listing_type AS ENUM ('sale', 'free', 'borrow', 'gemach');
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

                # 3. Create users table (extend existing if needed)
                logger.info("Creating/updating users table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        display_name TEXT NOT NULL,
                        username CITEXT UNIQUE,
                        photo_url TEXT,
                        email CITEXT UNIQUE,
                        phone_e164 TEXT UNIQUE,
                        created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
                        status TEXT NOT NULL DEFAULT 'active',
                        is_verified BOOLEAN NOT NULL DEFAULT FALSE
                    )
                """))

                # Add marketplace-specific columns if they don't exist
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username CITEXT UNIQUE"))
                except:
                    pass  # Column might already exist

                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 TEXT UNIQUE"))
                except:
                    pass

                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE"))
                except:
                    pass

                # 4. Create usernames table
                logger.info("Creating usernames table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS usernames (
                        handle CITEXT PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
                    )
                """))

                # 5. Create categories table
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

                # 6. Create subcategories table
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

                # 7. Create gemachs table
                logger.info("Creating gemachs table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS gemachs (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        name TEXT NOT NULL,
                        verified BOOLEAN NOT NULL DEFAULT TRUE,
                        phone TEXT,
                        email CITEXT,
                        address1 TEXT,
                        city TEXT,
                        region TEXT,
                        zip TEXT,
                        country TEXT DEFAULT 'US',
                        lat NUMERIC(9,6),
                        lng NUMERIC(9,6),
                        hours TEXT,
                        eligibility TEXT,
                        notes TEXT
                    )
                """))

                # Create indexes for gemachs
                conn.execute(text("CREATE INDEX IF NOT EXISTS gemachs_city_idx ON gemachs (city, region)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS gemachs_geo_idx ON gemachs (lat, lng)"))

                # 8. Create listings table
                logger.info("Creating listings table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listings (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        title TEXT NOT NULL,
                        description TEXT,
                        type listing_type NOT NULL,
                        category_id INT NOT NULL REFERENCES categories(id),
                        subcategory_id INT REFERENCES subcategories(id),
                        price_cents INT NOT NULL DEFAULT 0,
                        currency TEXT NOT NULL DEFAULT 'USD',
                        condition item_condition,
                        city TEXT,
                        region TEXT,
                        zip TEXT,
                        country TEXT DEFAULT 'US',
                        lat NUMERIC(9,6),
                        lng NUMERIC(9,6),
                        seller_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        seller_gemach_id UUID REFERENCES gemachs(id) ON DELETE SET NULL,
                        available_from TIMESTAMPTZ,
                        available_to TIMESTAMPTZ,
                        loan_terms JSONB,
                        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
                        endorse_up INT NOT NULL DEFAULT 0,
                        endorse_down INT NOT NULL DEFAULT 0,
                        status TEXT NOT NULL DEFAULT 'active',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                """))

                # 9. Create updated_at trigger function
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

                # 10. Create trigger for listings
                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trg_listings_touch ON listings;
                    CREATE TRIGGER trg_listings_touch
                    BEFORE UPDATE ON listings
                    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
                """))

                # 11. Add business rule constraints
                logger.info("Adding business rule constraints")
                
                # Free listings must have price = 0
                try:
                    conn.execute(text("""
                        ALTER TABLE listings
                        ADD CONSTRAINT chk_free_price
                        CHECK ( (type <> 'free') OR (price_cents = 0) )
                    """))
                except:
                    pass  # Constraint might already exist

                # Borrow/gemach must have loan_terms
                try:
                    conn.execute(text("""
                        ALTER TABLE listings
                        ADD CONSTRAINT chk_borrow_terms
                        CHECK (
                            (type NOT IN ('borrow','gemach'))
                            OR (loan_terms IS NOT NULL AND jsonb_typeof(loan_terms) = 'object')
                        )
                    """))
                except:
                    pass

                # Gemach requires gemach_id, others must not
                try:
                    conn.execute(text("""
                        ALTER TABLE listings
                        ADD CONSTRAINT chk_gemach_seller
                        CHECK (
                            (type <> 'gemach' AND seller_gemach_id IS NULL)
                            OR (type = 'gemach' AND seller_gemach_id IS NOT NULL)
                        )
                    """))
                except:
                    pass

                # Sale/free must have user_id, not gemach_id
                try:
                    conn.execute(text("""
                        ALTER TABLE listings
                        ADD CONSTRAINT chk_sale_seller
                        CHECK (
                            (type IN ('sale', 'free') AND seller_user_id IS NOT NULL AND seller_gemach_id IS NULL)
                            OR (type IN ('borrow', 'gemach'))
                        )
                    """))
                except:
                    pass

                # 12. Create indexes for listings
                logger.info("Creating indexes for listings")
                
                # Search and filtering indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_type_status ON listings (type, status)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_category_subcategory ON listings (category_id, subcategory_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_price_range ON listings (price_cents) WHERE price_cents > 0"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC)"))
                
                # Full-text search index
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_listings_search 
                    ON listings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
                """))
                
                # JSONB indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_attributes_gin ON listings USING gin(attributes)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_loan_terms_gin ON listings USING gin(loan_terms)"))
                
                # Location indexes
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_location ON listings (city, region)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_geo ON listings (lat, lng)"))
                
                # Common marketplace queries
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_listings_marketplace 
                    ON listings (type, status, created_at DESC) 
                    WHERE status = 'active'
                """))
                
                # Location-based searches
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_listings_location_search 
                    ON listings (city, region, type, status) 
                    WHERE status = 'active'
                """))
                
                # Price-based filtering
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_listings_price_filter 
                    ON listings (price_cents, type, status) 
                    WHERE status = 'active' AND price_cents > 0
                """))

                # 13. Create listing_endorsements table
                logger.info("Creating listing_endorsements table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listing_endorsements (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        endorsement_type TEXT NOT NULL CHECK (endorsement_type IN ('up', 'down')),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        UNIQUE(listing_id, user_id)
                    )
                """))

                # 14. Create endorsement count update trigger
                logger.info("Creating endorsement count update trigger")
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION update_endorsement_counts()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        IF TG_OP = 'INSERT' THEN
                            IF NEW.endorsement_type = 'up' THEN
                                UPDATE listings SET endorse_up = endorse_up + 1 WHERE id = NEW.listing_id;
                            ELSE
                                UPDATE listings SET endorse_down = endorse_down + 1 WHERE id = NEW.listing_id;
                            END IF;
                        ELSIF TG_OP = 'DELETE' THEN
                            IF OLD.endorsement_type = 'up' THEN
                                UPDATE listings SET endorse_up = endorse_up - 1 WHERE id = OLD.listing_id;
                            ELSE
                                UPDATE listings SET endorse_down = endorse_down - 1 WHERE id = OLD.listing_id;
                            END IF;
                        ELSIF TG_OP = 'UPDATE' THEN
                            IF OLD.endorsement_type = 'up' AND NEW.endorsement_type = 'down' THEN
                                UPDATE listings SET endorse_up = endorse_up - 1, endorse_down = endorse_down + 1 WHERE id = NEW.listing_id;
                            ELSIF OLD.endorsement_type = 'down' AND NEW.endorsement_type = 'up' THEN
                                UPDATE listings SET endorse_down = endorse_down - 1, endorse_up = endorse_up + 1 WHERE id = NEW.listing_id;
                            END IF;
                        END IF;
                        RETURN COALESCE(NEW, OLD);
                    END;
                    $$ LANGUAGE plpgsql;
                """))

                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trg_endorsement_counts ON listing_endorsements;
                    CREATE TRIGGER trg_endorsement_counts
                    AFTER INSERT OR UPDATE OR DELETE ON listing_endorsements
                    FOR EACH ROW EXECUTE FUNCTION update_endorsement_counts();
                """))

                # 15. Create listing_transactions table
                logger.info("Creating listing_transactions table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listing_transactions (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        listing_id UUID NOT NULL REFERENCES listings(id),
                        buyer_user_id UUID NOT NULL REFERENCES users(id),
                        seller_user_id UUID REFERENCES users(id),
                        seller_gemach_id UUID REFERENCES gemachs(id),
                        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('reserved', 'completed', 'cancelled')),
                        price_cents INT,
                        notes TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                """))

                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_transactions_listing ON listing_transactions (listing_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON listing_transactions (buyer_user_id)"))

                # 16. Create listing_images table
                logger.info("Creating listing_images table")
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS listing_images (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                        image_url TEXT NOT NULL,
                        alt_text TEXT,
                        sort_order INT NOT NULL DEFAULT 0,
                        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                """))

                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listing_images_order ON listing_images (listing_id, sort_order)"))

                # 17. Insert sample categories
                logger.info("Inserting sample categories")
                conn.execute(text("""
                    INSERT INTO categories (name, slug, sort_order) VALUES
                    ('Electronics', 'electronics', 10),
                    ('Furniture', 'furniture', 20),
                    ('Clothing', 'clothing', 30),
                    ('Books', 'books', 40),
                    ('Kitchen & Dining', 'kitchen-dining', 50),
                    ('Baby & Kids', 'baby-kids', 60),
                    ('Sports & Outdoors', 'sports-outdoors', 70),
                    ('Tools & Hardware', 'tools-hardware', 80),
                    ('Jewelry & Accessories', 'jewelry-accessories', 90),
                    ('Other', 'other', 100)
                    ON CONFLICT (slug) DO NOTHING
                """))

                # Insert sample subcategories
                conn.execute(text("""
                    INSERT INTO subcategories (category_id, name, slug, sort_order) 
                    SELECT c.id, 'Smartphones', 'smartphones', 10
                    FROM categories c WHERE c.slug = 'electronics'
                    ON CONFLICT (category_id, slug) DO NOTHING
                """))

                conn.execute(text("""
                    INSERT INTO subcategories (category_id, name, slug, sort_order) 
                    SELECT c.id, 'Laptops', 'laptops', 20
                    FROM categories c WHERE c.slug = 'electronics'
                    ON CONFLICT (category_id, slug) DO NOTHING
                """))

                # Commit transaction
                trans.commit()
                logger.info("✅ Marketplace schema created successfully")

                return True

            except Exception as e:
                trans.rollback()
                logger.exception("Error during marketplace schema creation")
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
                logger.info("Rolling back marketplace schema")

                # Drop tables in reverse order
                conn.execute(text("DROP TABLE IF EXISTS listing_images CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS listing_transactions CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS listing_endorsements CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS listings CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS gemachs CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS subcategories CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS categories CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS usernames CASCADE"))

                # Drop functions
                conn.execute(text("DROP FUNCTION IF EXISTS update_endorsement_counts() CASCADE"))
                conn.execute(text("DROP FUNCTION IF EXISTS touch_updated_at() CASCADE"))

                # Drop enum types
                conn.execute(text("DROP TYPE IF EXISTS kosher_use CASCADE"))
                conn.execute(text("DROP TYPE IF EXISTS item_condition CASCADE"))
                conn.execute(text("DROP TYPE IF EXISTS listing_type CASCADE"))

                trans.commit()
                logger.info("✅ Marketplace schema rollback completed")

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
