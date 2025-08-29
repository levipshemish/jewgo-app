# !/usr/bin/env python3
"""
Database Migration: Update Kosher Category Constraints
====================================================
This migration script updates the database constraints to use capitalized
kosher category values instead of lowercase.
Author: JewGo Development Team
Version: 1.0
Date: 2025-01-17
"""
import os
import sys
from typing import List

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


def get_existing_constraints(conn) -> List[str]:
    """Get existing check constraints on kosher_category column."""
    logger = get_logger(__name__)
    try:
        result = conn.execute(
            text(
                """
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'restaurants'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%kosher_category%'
        """
            )
        )
        constraints = [row[0] for row in result.fetchall()]
        logger.info(
            "Found existing kosher_category constraints", constraints=constraints
        )
        return constraints
    except SQLAlchemyError as e:
        logger.error("Error getting existing constraints", error=str(e))
        raise


def drop_existing_constraints(conn, constraints: List[str]) -> bool:
    """Drop existing kosher_category check constraints."""
    logger = get_logger(__name__)
    try:
        for constraint_name in constraints:
            logger.info(f"Dropping constraint: {constraint_name}")
            conn.execute(
                text(f"ALTER TABLE restaurants DROP CONSTRAINT {constraint_name}")
            )
        logger.info("Successfully dropped all existing kosher_category constraints")
        return True
    except SQLAlchemyError as e:
        logger.error("Error dropping constraints", error=str(e))
        raise


def add_new_constraints(conn) -> bool:
    """Add new kosher_category check constraints with capitalized values."""
    logger = get_logger(__name__)
    try:
        # Add new constraint with capitalized values
        new_constraint_sql = """
            ALTER TABLE restaurants
            ADD CONSTRAINT restaurants_kosher_category_check
            CHECK (kosher_category IN ('Meat', 'Dairy', 'Pareve', 'Fish', 'Unknown'))
        """
        logger.info("Adding new kosher_category constraint with capitalized values")
        conn.execute(text(new_constraint_sql))
        logger.info("Successfully added new kosher_category constraint")
        return True
    except SQLAlchemyError as e:
        logger.error("Error adding new constraint", error=str(e))
        raise


def verify_constraints(conn) -> bool:
    """Verify that the new constraints are working correctly."""
    logger = get_logger(__name__)
    try:
        # Test inserting valid values
        test_values = ["Meat", "Dairy", "Pareve", "Fish", "Unknown"]
        for test_value in test_values:
            # This should not raise an error
            result = conn.execute(
                text(
                    """
                SELECT COUNT(*) FROM restaurants
                WHERE kosher_category = :test_value
            """
                ),
                {"test_value": test_value},
            )
            count = result.fetchone()[0]
            logger.info(
                f"Verified constraint allows: {test_value} (found {count} records)"
            )
        # Test that invalid values are rejected (by checking current data)
        result = conn.execute(
            text(
                """
            SELECT COUNT(*) FROM restaurants
            WHERE kosher_category NOT IN ('Meat', 'Dairy', 'Pareve', 'Fish', 'Unknown')
        """
            )
        )
        invalid_count = result.fetchone()[0]
        if invalid_count == 0:
            logger.info("✅ All kosher_category values are valid")
            return True
        else:
            logger.warning(f"⚠️ Found {invalid_count} invalid kosher_category values")
            return False
    except SQLAlchemyError as e:
        logger.error("Error verifying constraints", error=str(e))
        raise


def run_migration() -> bool:
    """Run the complete constraint update migration."""
    logger = get_logger(__name__)
    logger.info("Starting kosher category constraint update migration")
    try:
        engine = get_database_connection()
        with engine.connect() as conn:
            # Start transaction
            with conn.begin():
                logger.info("Getting existing constraints...")
                existing_constraints = get_existing_constraints(conn)
                if existing_constraints:
                    logger.info("Dropping existing constraints...")
                    drop_existing_constraints(conn, existing_constraints)
                logger.info("Adding new constraints...")
                add_new_constraints(conn)
                logger.info("Verifying constraints...")
                verify_constraints(conn)
                print("✅ Constraint migration completed successfully!")
                print(f"📊 Dropped {len(existing_constraints)} old constraints")
                print("🔒 Added new constraint with capitalized values")
                return True
    except Exception as e:
        logger.error("Constraint migration failed", error=str(e))
        print(f"❌ Constraint migration failed: {str(e)}")
        return False


def show_current_constraints() -> None:
    """Show current constraints on the restaurants table."""
    logger = get_logger(__name__)
    try:
        engine = get_database_connection()
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT
                    conname as constraint_name,
                    pg_get_constraintdef(oid) as constraint_definition
                FROM pg_constraint
                WHERE conrelid = 'restaurants'::regclass
                AND contype = 'c'
                ORDER BY conname
            """
                )
            )
            constraints = result.fetchall()
            print("🔍 Current Check Constraints on restaurants table:")
            print("=" * 60)
            if constraints:
                for constraint in constraints:
                    print(f"📋 {constraint[0]}: {constraint[1]}")
            else:
                print("📋 No check constraints found")
    except Exception as e:
        logger.error("Error showing constraints", error=str(e))
        print(f"❌ Error showing constraints: {str(e)}")


if __name__ == "__main__":
    print("🚀 Starting Kosher Category Constraint Update Migration")
    print("=" * 60)
    # Show current constraints first
    print("\n🔍 Current constraints before migration:")
    show_current_constraints()
    # Run migration
    success = run_migration()
    if success:
        print("\n🔍 Current constraints after migration:")
        show_current_constraints()
    print("\n" + "=" * 60)
    if success:
        print("✅ Constraint migration completed successfully!")
    else:
        print("❌ Constraint migration failed!")
        sys.exit(1)
