#!/usr/bin/env python3
"""Database Migration: Create Specials System.
===========================================
Creates the complete specials system with lookup tables, main specials table,
media attachments, claims tracking, and analytics events.

This migration implements:
- Lookup tables for extensible discount types, claim statuses, and media kinds
- Main specials table with TSTZRANGE for efficient time queries
- Media attachments table for images/videos
- Claims tracking with unique constraints for user limits
- Analytics events table for tracking user interactions
- Performance indexes using GiST for time-range queries
- Materialized view for frequently accessed active specials
"""
import os
import sys
from sqlalchemy import (
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def run_migration() -> bool | None:
    """Run the migration to create the specials system."""
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
                logger.info("Starting specials system creation")
                
                # 1. Create lookup tables
                logger.info("Creating lookup tables")
                create_lookup_tables(conn)
                
                # 2. Create main specials table
                logger.info("Creating main specials table")
                create_specials_table(conn)
                
                # 3. Create special_media table
                logger.info("Creating special_media table")
                create_special_media_table(conn)
                
                # 4. Create special_claims table
                logger.info("Creating special_claims table")
                create_special_claims_table(conn)
                
                # 5. Create special_events table
                logger.info("Creating special_events table")
                create_special_events_table(conn)
                
                # 6. Create indexes for performance
                logger.info("Creating performance indexes")
                create_performance_indexes(conn)
                
                # 7. Create uniqueness constraints
                logger.info("Creating uniqueness constraints")
                create_uniqueness_constraints(conn)
                
                # 8. Create triggers for updated_at
                logger.info("Creating triggers")
                create_triggers(conn)
                
                # 9. Create materialized view
                logger.info("Creating materialized view")
                create_materialized_view(conn)
                
                # 10. Seed lookup tables with initial data
                logger.info("Seeding lookup tables")
                seed_lookup_tables(conn)
                
                # Commit the transaction
                trans.commit()
                logger.info("✅ Successfully completed specials system creation")
                
                # Verify the changes
                verify_migration(conn)
                
                return True
                
            except Exception as e:
                # Rollback the transaction
                trans.rollback()
                logger.exception("Error during migration, rolling back")
                raise e
                
    except SQLAlchemyError:
        logger.exception("Database error during migration")
        return False
    except Exception:
        logger.exception("Unexpected error during migration")
        return False


def create_lookup_tables(conn):
    """Create lookup tables for extensible enums."""
    
    # Discount kinds table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS discount_kinds (
            code TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    
    # Claim statuses table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS claim_statuses (
            code TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    
    # Media kinds table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS media_kinds (
            code TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))


def create_specials_table(conn):
    """Create the main specials table."""
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS specials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
            
            -- Content
            title VARCHAR(255) NOT NULL,
            subtitle VARCHAR(255),
            description TEXT,
            
            -- Discount Configuration
            discount_type TEXT NOT NULL REFERENCES discount_kinds(code),
            discount_value NUMERIC(10,2),
            discount_label VARCHAR(100) NOT NULL,
            
            -- Time Windows (using TSTZRANGE for efficiency)
            valid_from TIMESTAMPTZ NOT NULL,
            valid_until TIMESTAMPTZ NOT NULL,
            valid_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_until, '[)')) STORED,
            
            -- Limits & Rules
            max_claims_total INTEGER,
            max_claims_per_user INTEGER DEFAULT 1,
            per_visit BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            
            -- Terms & Conditions
            requires_code BOOLEAN DEFAULT FALSE,
            code_hint VARCHAR(100),
            terms TEXT,
            
            -- Media
            hero_image_url TEXT,
            
            -- Audit Trail
            created_by VARCHAR(50) REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            deleted_at TIMESTAMPTZ,
            
            -- Constraints
            CONSTRAINT ck_valid_window CHECK (valid_until > valid_from),
            CONSTRAINT ck_pct_value CHECK (
                discount_type <> 'percentage'
                OR discount_value IS NULL
                OR (discount_value > 0 AND discount_value <= 100)
            ),
            CONSTRAINT ck_positive_limits CHECK (
                (max_claims_total IS NULL OR max_claims_total > 0) AND
                (max_claims_per_user IS NULL OR max_claims_per_user > 0)
            )
        )
    """))


def create_special_media_table(conn):
    """Create the special media attachments table."""
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS special_media (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            special_id UUID NOT NULL REFERENCES specials(id) ON DELETE CASCADE,
            kind TEXT NOT NULL DEFAULT 'image' REFERENCES media_kinds(code),
            url TEXT NOT NULL,
            alt_text TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            
            CONSTRAINT ck_positive_position CHECK (position >= 0)
        )
    """))


def create_special_claims_table(conn):
    """Create the special claims tracking table."""
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS special_claims (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            special_id UUID NOT NULL REFERENCES specials(id) ON DELETE CASCADE,
            
            -- User/Guest Identity
            user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
            guest_session_id VARCHAR(50), -- Guest session identifier (no FK for now)
            
            -- Claim Details
            claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ip_address INET,
            user_agent TEXT,
            
            -- Status & Redemption
            status TEXT NOT NULL DEFAULT 'claimed' REFERENCES claim_statuses(code),
            redeemed_at TIMESTAMPTZ,
            redeemed_by VARCHAR(50) REFERENCES users(id),
            revoked_at TIMESTAMPTZ,
            revoke_reason TEXT,
            
            -- Generated column for daily limits
            claim_day DATE GENERATED ALWAYS AS ((claimed_at AT TIME ZONE 'UTC')::date) STORED,
            
            -- Constraints
            CONSTRAINT ck_user_or_guest CHECK (
                (user_id IS NOT NULL AND guest_session_id IS NULL)
                OR (user_id IS NULL AND guest_session_id IS NOT NULL)
            )
        )
    """))


def create_special_events_table(conn):
    """Create the special analytics events table."""
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS special_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            special_id UUID NOT NULL REFERENCES specials(id) ON DELETE CASCADE,
            user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
            guest_session_id VARCHAR(50), -- Guest session identifier (no FK for now)
            event_type TEXT NOT NULL CHECK (event_type IN ('view','share','click','claim')),
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ip_address INET,
            user_agent TEXT,
            
            CONSTRAINT ck_ev_user_or_guest CHECK (
                (user_id IS NOT NULL AND guest_session_id IS NULL)
                OR (user_id IS NULL AND guest_session_id IS NOT NULL)
            )
        )
    """))


def create_performance_indexes(conn):
    """Create performance indexes for efficient queries."""
    
    # Specials table indexes
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_specials_restaurant_active_now 
        ON specials USING GIST (valid_range)
        WHERE is_active AND deleted_at IS NULL
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_specials_restaurant_id 
        ON specials (restaurant_id)
        WHERE is_active AND deleted_at IS NULL
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_specials_valid_range_gist 
        ON specials USING GIST (valid_range)
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_specials_created_at 
        ON specials (created_at DESC)
    """))
    
    # Special media indexes
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_media_special_id_pos 
        ON special_media (special_id, position)
    """))
    
    # Special claims indexes
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_claims_special_id 
        ON special_claims (special_id)
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_claims_user_id 
        ON special_claims (user_id)
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_claims_guest_session_id 
        ON special_claims (guest_session_id)
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_claims_status 
        ON special_claims (status)
    """))
    
    # Special events indexes
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_events_special_id_time 
        ON special_events (special_id, occurred_at)
    """))
    
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_special_events_type_time 
        ON special_events (event_type, occurred_at)
    """))


def create_uniqueness_constraints(conn):
    """Create uniqueness constraints for claim limits."""
    
    # One claim per user per special (simplified - will be enforced at application level)
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_once_per_user
        ON special_claims (special_id, user_id)
        WHERE user_id IS NOT NULL
    """))
    
    # One claim per guest per special (simplified - will be enforced at application level)
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_once_per_guest
        ON special_claims (special_id, guest_session_id)
        WHERE guest_session_id IS NOT NULL
    """))
    
    # One claim per day per user (simplified - will be enforced at application level)
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_daily_user
        ON special_claims (special_id, user_id, claim_day)
        WHERE user_id IS NOT NULL
    """))
    
    # One claim per day per guest (simplified - will be enforced at application level)
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_daily_guest
        ON special_claims (special_id, guest_session_id, claim_day)
        WHERE guest_session_id IS NOT NULL
    """))


def create_triggers(conn):
    """Create triggers for automatic timestamp updates."""
    
    # Updated_at trigger function
    conn.execute(text("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS trigger AS $$
        BEGIN 
            NEW.updated_at = now(); 
            RETURN NEW; 
        END; 
        $$ LANGUAGE plpgsql
    """))
    
    # Trigger for specials table
    conn.execute(text("""
        DROP TRIGGER IF EXISTS trg_specials_updated_at ON specials;
        CREATE TRIGGER trg_specials_updated_at
            BEFORE UPDATE ON specials
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    """))


def create_materialized_view(conn):
    """Create materialized view for frequently accessed active specials."""
    conn.execute(text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_specials AS
        SELECT 
            s.id,
            s.restaurant_id,
            s.title,
            s.subtitle,
            s.discount_label,
            s.valid_from,
            s.valid_until,
            s.max_claims_total,
            s.max_claims_per_user,
            s.per_visit,
            s.hero_image_url,
            s.created_at
        FROM specials s
        WHERE s.is_active
          AND s.deleted_at IS NULL
          AND s.valid_range @> now()
        WITH NO DATA
    """))
    
    # Create index on materialized view
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_mv_active_specials_restaurant_id 
        ON mv_active_specials (restaurant_id)
    """))


def seed_lookup_tables(conn):
    """Seed lookup tables with initial data."""
    
    # Discount kinds
    discount_kinds = [
        ('percentage', 'Percentage Off', 'Percentage discount (e.g., 20% off)'),
        ('fixed_amount', 'Fixed Amount Off', 'Fixed dollar amount off (e.g., $5 off)'),
        ('bogo', 'Buy One Get One', 'Buy one item, get another free or discounted'),
        ('free_item', 'Free Item', 'Free item with purchase'),
        ('other', 'Other', 'Other type of discount or promotion')
    ]
    
    for code, label, description in discount_kinds:
        conn.execute(text("""
            INSERT INTO discount_kinds (code, label, description)
            VALUES (:code, :label, :description)
            ON CONFLICT (code) DO NOTHING
        """), {"code": code, "label": label, "description": description})
    
    # Claim statuses
    claim_statuses = [
        ('claimed', 'Claimed', 'Special has been claimed by user'),
        ('redeemed', 'Redeemed', 'Claim has been redeemed at restaurant'),
        ('expired', 'Expired', 'Claim expired due to time limit'),
        ('cancelled', 'Cancelled', 'Claim was cancelled by user'),
        ('revoked', 'Revoked', 'Claim was revoked by restaurant/admin')
    ]
    
    for code, label, description in claim_statuses:
        conn.execute(text("""
            INSERT INTO claim_statuses (code, label, description)
            VALUES (:code, :label, :description)
            ON CONFLICT (code) DO NOTHING
        """), {"code": code, "label": label, "description": description})
    
    # Media kinds
    media_kinds = [
        ('image', 'Image', 'Static image file (JPG, PNG, WebP)'),
        ('video', 'Video', 'Video file (MP4, WebM)'),
        ('other', 'Other', 'Other media type')
    ]
    
    for code, label, description in media_kinds:
        conn.execute(text("""
            INSERT INTO media_kinds (code, label, description)
            VALUES (:code, :label, :description)
            ON CONFLICT (code) DO NOTHING
        """), {"code": code, "label": label, "description": description})


def verify_migration(conn):
    """Verify that the migration was successful."""
    logger.info("Verifying migration results")
    
    # Check table existence
    tables = ['discount_kinds', 'claim_statuses', 'media_kinds', 'specials', 
              'special_media', 'special_claims', 'special_events']
    
    for table in tables:
        result = conn.execute(text(f"""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_name = '{table}'
        """))
        if result.fetchone()[0] > 0:
            logger.info(f"✅ Table {table} created successfully")
        else:
            logger.warning(f"❌ Table {table} not found")
    
    # Check materialized view
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM pg_matviews 
        WHERE matviewname = 'mv_active_specials'
    """))
    if result.fetchone()[0] > 0:
        logger.info("✅ Materialized view mv_active_specials created successfully")
    else:
        logger.warning("❌ Materialized view mv_active_specials not found")
    
    # Check lookup table data
    for table in ['discount_kinds', 'claim_statuses', 'media_kinds']:
        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
        count = result.fetchone()[0]
        logger.info(f"✅ {table} seeded with {count} records")
    
    # Check indexes
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE tablename IN ('specials', 'special_media', 'special_claims', 'special_events')
    """))
    index_count = result.fetchone()[0]
    logger.info(f"✅ Created {index_count} performance indexes")


def rollback_migration() -> bool | None:
    """Rollback the migration by removing all specials system tables."""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False
        
        engine = create_engine(database_url)
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                logger.info("Starting rollback of specials system")
                
                # Drop in reverse dependency order
                tables_to_drop = [
                    'mv_active_specials',  # Materialized view first
                    'special_events',
                    'special_claims', 
                    'special_media',
                    'specials',
                    'discount_kinds',
                    'claim_statuses',
                    'media_kinds'
                ]
                
                for table in tables_to_drop:
                    try:
                        if table == 'mv_active_specials':
                            conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {table}"))
                        else:
                            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                        logger.info(f"Dropped {table}")
                    except SQLAlchemyError as e:
                        logger.warning(f"Could not drop {table}: {e}")
                
                # Drop trigger function
                conn.execute(text("DROP FUNCTION IF EXISTS set_updated_at() CASCADE"))
                
                trans.commit()
                logger.info("✅ Successfully completed rollback")
                return True
                
            except Exception as e:
                trans.rollback()
                logger.exception("Error during rollback, rolling back")
                raise e
                
    except SQLAlchemyError:
        logger.exception("Database error during rollback")
        return False
    except Exception:
        logger.exception("Unexpected error during rollback")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Create specials system database schema"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration instead of running it",
    )
    args = parser.parse_args()
    
    if args.rollback:
        logger.info("Running rollback...")
        success = rollback_migration()
    else:
        logger.info("Running migration...")
        success = run_migration()
    
    if success:
        logger.info("✅ Migration completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed")
        sys.exit(1)
