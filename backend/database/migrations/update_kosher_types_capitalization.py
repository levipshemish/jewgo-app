#!/usr/bin/env python3
"""
Database Migration: Update Kosher Types and Text Capitalization
=============================================================

This migration script updates the database to ensure proper capitalization:
1. Kosher types: 'meat' -> 'Meat', 'dairy' -> 'Dairy', 'pareve' -> 'Pareve'
2. Text fields: First letter capitalization for headers, tags, etc.

Author: JewGo Development Team
Version: 1.0
Date: 2025-01-17
"""

import os
import sys
from typing import Dict

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from utils.logging_config import get_logger

# Import ConfigManager
try:
    from utils.unified_database_config import ConfigManager
except ImportError:
    import os

    class ConfigManager:
        @staticmethod
        def get_database_url():
            return os.getenv("DATABASE_URL")

        @staticmethod
        def get_pg_keepalives_idle():
            return int(os.getenv("PG_KEEPALIVES_IDLE", "60"))

        @staticmethod
        def get_pg_keepalives_interval():
            return int(os.getenv("PG_KEEPALIVES_INTERVAL", "20"))

        @staticmethod
        def get_pg_keepalives_count():
            return int(os.getenv("PG_KEEPALIVES_COUNT", "5"))

        @staticmethod
        def get_pg_statement_timeout():
            return os.getenv("PG_STATEMENT_TIMEOUT", "60000")

        @staticmethod
        def get_pg_idle_tx_timeout():
            return os.getenv("PG_IDLE_TX_TIMEOUT", "120000")

        @staticmethod
        def get_pg_sslmode():
            return os.getenv("PGSSLMODE", "prefer")

        @staticmethod
        def get_pg_sslrootcert():
            return os.getenv("PGSSLROOTCERT")


def capitalize_first_letter(text: str) -> str:
    """Capitalize the first letter of a string."""
    if not text or not isinstance(text, str):
        return text
    return text[0].upper() + text[1:] if text else text


def get_database_connection():
    """Get database connection with proper configuration."""
    database_url = ConfigManager.get_database_url()
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")

    # Configure connection parameters (simplified for Neon pooled connections)
    connect_args = {
        "keepalives_idle": ConfigManager.get_pg_keepalives_idle(),
        "keepalives_interval": ConfigManager.get_pg_keepalives_interval(),
        "keepalives_count": ConfigManager.get_pg_keepalives_count(),
    }

    # Add SSL configuration if specified
    if ConfigManager.get_pg_sslmode():
        connect_args["sslmode"] = ConfigManager.get_pg_sslmode()
    if ConfigManager.get_pg_sslrootcert():
        connect_args["sslrootcert"] = ConfigManager.get_pg_sslrootcert()

    engine = create_engine(database_url, connect_args=connect_args)
    return engine


def update_kosher_types(conn) -> Dict[str, int]:
    """Update kosher types to proper capitalization."""
    logger = get_logger(__name__)
    
    # Define kosher type mappings
    kosher_type_mappings = {
        'meat': 'Meat',
        'dairy': 'Dairy', 
        'pareve': 'Pareve',
        'fish': 'Fish',
        'unknown': 'Unknown'
    }
    
    update_counts = {}
    
    try:
        # Get current kosher type distribution
        result = conn.execute(text("""
            SELECT kosher_category, COUNT(*) as count 
            FROM restaurants 
            GROUP BY kosher_category
        """))
        current_distribution = {row[0]: row[1] for row in result.fetchall()}
        
        logger.info("Current kosher type distribution", distribution=current_distribution)
        
        # Update each kosher type
        for old_type, new_type in kosher_type_mappings.items():
            if old_type != new_type:  # Only update if different
                result = conn.execute(
                    text("""
                        UPDATE restaurants 
                        SET kosher_category = :new_type, updated_at = NOW()
                        WHERE kosher_category = :old_type
                    """),
                    {"old_type": old_type, "new_type": new_type}
                )
                update_counts[old_type] = result.rowcount
                logger.info(
                    f"Updated kosher type: {old_type} -> {new_type}",
                    count=result.rowcount
                )
        
        # Verify updates
        result = conn.execute(text("""
            SELECT kosher_category, COUNT(*) as count 
            FROM restaurants 
            GROUP BY kosher_category
        """))
        new_distribution = {row[0]: row[1] for row in result.fetchall()}
        
        logger.info("Updated kosher type distribution", distribution=new_distribution)
        
        return update_counts
        
    except SQLAlchemyError as e:
        logger.error("Error updating kosher types", error=str(e))
        raise


def update_text_capitalization(conn) -> Dict[str, int]:
    """Update text fields to have first letter capitalized."""
    logger = get_logger(__name__)
    
    # Define text fields that should be capitalized
    text_fields = [
        'name',
        'city', 
        'state',
        'short_description',
        'price_range',
        'avg_price',
        'listing_type',
        'certifying_agency'
    ]
    
    update_counts = {}
    
    try:
        for field in text_fields:
            # Check if field exists in table
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'restaurants' 
                AND column_name = :field_name
            """), {"field_name": field})
            
            if not result.fetchone():
                logger.warning(f"Field {field} does not exist in restaurants table")
                continue
            
            # Update field with first letter capitalization
            # Use a CASE statement to handle NULL values and empty strings
            update_query = f"""
                UPDATE restaurants 
                SET {field} = CASE 
                    WHEN {field} IS NULL OR {field} = '' THEN {field}
                    ELSE UPPER(LEFT({field}, 1)) || LOWER(RIGHT({field}, LENGTH({field}) - 1))
                END,
                updated_at = NOW()
                WHERE {field} IS NOT NULL 
                AND {field} != ''
                AND {field} != UPPER(LEFT({field}, 1)) || LOWER(RIGHT({field}, LENGTH({field}) - 1))
            """
            
            result = conn.execute(text(update_query))
            update_counts[field] = result.rowcount
            
            logger.info(
                f"Updated {field} capitalization",
                count=result.rowcount
            )
        
        return update_counts
        
    except SQLAlchemyError as e:
        logger.error("Error updating text capitalization", error=str(e))
        raise


def run_migration() -> bool:
    """Run the complete migration."""
    logger = get_logger(__name__)
    
    logger.info("Starting kosher types and text capitalization migration")
    
    try:
        engine = get_database_connection()
        
        with engine.connect() as conn:
            # Start transaction
            with conn.begin():
                logger.info("Updating kosher types...")
                kosher_updates = update_kosher_types(conn)
                
                logger.info("Updating text capitalization...")
                text_updates = update_text_capitalization(conn)
                
                # Log summary
                total_kosher_updates = sum(kosher_updates.values())
                total_text_updates = sum(text_updates.values())
                
                logger.info(
                    "Migration completed successfully",
                    kosher_updates=kosher_updates,
                    text_updates=text_updates,
                    total_kosher_updates=total_kosher_updates,
                    total_text_updates=total_text_updates
                )
                
                print(f"✅ Migration completed successfully!")
                print(f"📊 Kosher type updates: {kosher_updates}")
                print(f"📝 Text capitalization updates: {text_updates}")
                print(f"📈 Total updates: {total_kosher_updates + total_text_updates}")
                
                return True
                
    except Exception as e:
        logger.error("Migration failed", error=str(e))
        print(f"❌ Migration failed: {str(e)}")
        return False


def verify_migration() -> bool:
    """Verify the migration results."""
    logger = get_logger(__name__)
    
    try:
        engine = get_database_connection()
        
        with engine.connect() as conn:
            # Check kosher types
            result = conn.execute(text("""
                SELECT kosher_category, COUNT(*) as count 
                FROM restaurants 
                GROUP BY kosher_category
                ORDER BY kosher_category
            """))
            
            kosher_distribution = {row[0]: row[1] for row in result.fetchall()}
            
            # Check for any lowercase kosher types
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM restaurants 
                WHERE kosher_category IN ('meat', 'dairy', 'pareve', 'fish', 'unknown')
            """))
            
            lowercase_count = result.fetchone()[0]
            
            print(f"🔍 Verification Results:")
            print(f"📊 Kosher type distribution: {kosher_distribution}")
            print(f"⚠️  Lowercase kosher types remaining: {lowercase_count}")
            
            if lowercase_count == 0:
                print("✅ All kosher types are properly capitalized!")
            else:
                print("❌ Some kosher types still need capitalization")
            
            return lowercase_count == 0
            
    except Exception as e:
        logger.error("Verification failed", error=str(e))
        print(f"❌ Verification failed: {str(e)}")
        return False


if __name__ == "__main__":
    print("🚀 Starting Kosher Types and Text Capitalization Migration")
    print("=" * 60)
    
    # Run migration
    success = run_migration()
    
    if success:
        print("\n🔍 Running verification...")
        verify_migration()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)
