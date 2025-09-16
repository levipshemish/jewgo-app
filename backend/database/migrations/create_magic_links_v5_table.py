#!/usr/bin/env python3
"""Migration script to create the magic_links_v5 table.

This migration creates the magic_links_v5 table for handling magic link authentication.
The table stores temporary magic link tokens for passwordless authentication.
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
    """Run the migration to create the magic_links_v5 table."""
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
                logger.info("Starting magic_links_v5 table creation")
                
                # Create magic_links_v5 table
                create_magic_links_table_sql = """
                CREATE TABLE IF NOT EXISTS magic_links_v5 (
                    id VARCHAR(255) PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    token_hash TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    used_at TIMESTAMP NULL,
                    is_used BOOLEAN DEFAULT FALSE
                );
                """
                
                # Create indexes for performance
                create_indexes_sql = """
                CREATE INDEX IF NOT EXISTS idx_magic_links_v5_email ON magic_links_v5 (email);
                CREATE INDEX IF NOT EXISTS idx_magic_links_v5_expires_at ON magic_links_v5 (expires_at);
                CREATE INDEX IF NOT EXISTS idx_magic_links_v5_created_at ON magic_links_v5 (created_at);
                CREATE INDEX IF NOT EXISTS idx_magic_links_v5_is_used ON magic_links_v5 (is_used);
                """
                
                # Execute table creation
                conn.execute(text(create_magic_links_table_sql))
                logger.info("magic_links_v5 table created successfully")
                
                # Execute index creation
                conn.execute(text(create_indexes_sql))
                logger.info("magic_links_v5 indexes created successfully")
                
                # Commit transaction
                trans.commit()
                logger.info("Magic links v5 migration completed successfully")
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Error during magic_links_v5 migration: {e}")
                raise
                
    except SQLAlchemyError as e:
        logger.error(f"Database error during magic_links_v5 migration: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during magic_links_v5 migration: {e}")
        return False


def rollback_migration() -> bool | None:
    """Rollback the magic_links_v5 table migration."""
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
                logger.info("Starting magic_links_v5 table rollback")
                
                # Drop table
                rollback_sql = """
                DROP TABLE IF EXISTS magic_links_v5 CASCADE;
                """
                
                # Execute rollback
                conn.execute(text(rollback_sql))
                logger.info("magic_links_v5 table dropped successfully")
                
                # Commit transaction
                trans.commit()
                logger.info("Magic links v5 rollback completed successfully")
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Error during magic_links_v5 rollback: {e}")
                raise
                
    except SQLAlchemyError as e:
        logger.error(f"Database error during magic_links_v5 rollback: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during magic_links_v5 rollback: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_migration()
    else:
        run_migration()
