#!/usr/bin/env python3
"""
Database Column Manager
======================

This utility consolidates functionality from duplicate add_missing_columns.py files:
- ./backend/database/migrations/add_missing_columns.py
- ./backend/scripts/maintenance/add_missing_columns.py

This is the single source of truth for database column management.
"""

import os
import sys
from typing import List, Dict, Optional, Any
from sqlalchemy import create_engine, text

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.logging_config import get_logger

logger = get_logger(__name__)


class DatabaseColumnManager:
    """Unified database column management utility."""

    def __init__(self, database_url: Optional[str] = None):
        """Initialize the column manager."""
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.engine = None
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")

    def connect(self) -> bool:
        """Connect to the database."""
        try:
            logger.info("🔗 Connecting to database...")
            self.engine = create_engine(self.database_url)
            
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            
            logger.info("✅ Database connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False

    def check_column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = :table_name
                    AND column_name = :column_name
                """), {"table_name": table_name, "column_name": column_name})
                return result.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking column existence: {e}")
            return False

    def add_column(self, table_name: str, column_name: str, column_type: str) -> bool:
        """Add a column to a table."""
        try:
            if self.check_column_exists(table_name, column_name):
                logger.info(f"Column {column_name} already exists in {table_name}, skipping")
                return True

            logger.info(f"Adding column {column_name} to {table_name}")
            
            with self.engine.begin() as conn:
                conn.execute(text(f"""
                    ALTER TABLE {table_name}
                    ADD COLUMN {column_name} {column_type}
                """))

            logger.info(f"✅ Successfully added column {column_name} to {table_name}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add column {column_name} to {table_name}: {e}")
            return False

    def add_restaurant_columns(self) -> bool:
        """Add missing columns to the restaurants table."""
        try:
            logger.info("🏗️ Adding missing columns to restaurants table...")
            
            # Define the columns to add
            columns_to_add = [
                ("cuisine_type", "VARCHAR(100)"),
                ("hechsher_details", "VARCHAR(500)"),
                ("description", "TEXT"),
                ("latitude", "FLOAT"),
                ("longitude", "FLOAT"),
                ("rating", "FLOAT"),
                ("review_count", "INTEGER"),
                ("google_rating", "FLOAT"),
                ("google_review_count", "INTEGER"),
                ("google_reviews", "TEXT"),
                ("hours", "TEXT"),
                ("current_time_local", "TIMESTAMP"),
                ("hours_parsed", "BOOLEAN DEFAULT FALSE"),
            ]
            
            success_count = 0
            total_columns = len(columns_to_add)
            
            for column_name, column_type in columns_to_add:
                if self.add_column("restaurants", column_name, column_type):
                    success_count += 1

            logger.info(f"✅ Added {success_count}/{total_columns} columns to restaurants table")
            return success_count == total_columns

        except Exception as e:
            logger.error(f"❌ Failed to add restaurant columns: {e}")
            return False

    def add_marketplace_columns(self) -> bool:
        """Add missing columns to the marketplace table."""
        try:
            logger.info("🏗️ Adding missing columns to marketplace table...")
            
            # Define the columns to add
            columns_to_add = [
                ("price_cents", "INTEGER"),
                ("currency", "VARCHAR(3) DEFAULT 'USD'"),
                ("condition", "VARCHAR(50)"),
                ("images", "JSONB"),
                ("tags", "TEXT[]"),
                ("expires_at", "TIMESTAMP"),
                ("is_featured", "BOOLEAN DEFAULT FALSE"),
                ("view_count", "INTEGER DEFAULT 0"),
                ("favorite_count", "INTEGER DEFAULT 0"),
            ]
            
            success_count = 0
            total_columns = len(columns_to_add)
            
            for column_name, column_type in columns_to_add:
                if self.add_column("marketplace", column_name, column_type):
                    success_count += 1

            logger.info(f"✅ Added {success_count}/{total_columns} columns to marketplace table")
            return success_count == total_columns

        except Exception as e:
            logger.error(f"❌ Failed to add marketplace columns: {e}")
            return False

    def add_user_columns(self) -> bool:
        """Add missing columns to the users table."""
        try:
            logger.info("🏗️ Adding missing columns to users table...")
            
            # Define the columns to add
            columns_to_add = [
                ("phone_number", "VARCHAR(20)"),
                ("address", "TEXT"),
                ("city", "VARCHAR(100)"),
                ("state", "VARCHAR(50)"),
                ("zip_code", "VARCHAR(20)"),
                ("latitude", "FLOAT"),
                ("longitude", "FLOAT"),
                ("preferences", "JSONB"),
                ("last_login", "TIMESTAMP"),
                ("is_verified", "BOOLEAN DEFAULT FALSE"),
            ]
            
            success_count = 0
            total_columns = len(columns_to_add)
            
            for column_name, column_type in columns_to_add:
                if self.add_column("users", column_name, column_type):
                    success_count += 1

            logger.info(f"✅ Added {success_count}/{total_columns} columns to users table")
            return success_count == total_columns

        except Exception as e:
            logger.error(f"❌ Failed to add user columns: {e}")
            return False

    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """Get all columns for a table."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = :table_name
                    ORDER BY ordinal_position
                """), {"table_name": table_name})
                
                columns = []
                for row in result.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "nullable": row[2] == "YES",
                        "default": row[3]
                    })
                
                return columns

        except Exception as e:
            logger.error(f"Error getting table columns: {e}")
            return []

    def validate_table_structure(self, table_name: str) -> Dict[str, Any]:
        """Validate the structure of a table."""
        try:
            logger.info(f"🔍 Validating table structure for {table_name}...")
            
            columns = self.get_table_columns(table_name)
            
            if not columns:
                return {
                    "valid": False,
                    "error": f"Table {table_name} not found or no columns"
                }
            
            # Check for required columns based on table type
            required_columns = self._get_required_columns(table_name)
            missing_columns = []
            
            for required_col in required_columns:
                if not any(col["name"] == required_col["name"] for col in columns):
                    missing_columns.append(required_col)
            
            return {
                "valid": len(missing_columns) == 0,
                "total_columns": len(columns),
                "missing_columns": missing_columns,
                "columns": columns
            }

        except Exception as e:
            logger.error(f"Error validating table structure: {e}")
            return {
                "valid": False,
                "error": str(e)
            }

    def _get_required_columns(self, table_name: str) -> List[Dict[str, str]]:
        """Get required columns for a specific table."""
        if table_name == "restaurants":
            return [
                {"name": "name", "type": "VARCHAR"},
                {"name": "address", "type": "TEXT"},
                {"name": "city", "type": "VARCHAR"},
                {"name": "state", "type": "VARCHAR"},
                {"name": "kosher_type", "type": "VARCHAR"},
            ]
        elif table_name == "marketplace":
            return [
                {"name": "title", "type": "VARCHAR"},
                {"name": "description", "type": "TEXT"},
                {"name": "price", "type": "DECIMAL"},
                {"name": "category", "type": "VARCHAR"},
                {"name": "status", "type": "VARCHAR"},
            ]
        elif table_name == "users":
            return [
                {"name": "email", "type": "VARCHAR"},
                {"name": "username", "type": "VARCHAR"},
                {"name": "created_at", "type": "TIMESTAMP"},
            ]
        else:
            return []

    def run_complete_migration(self) -> bool:
        """Run the complete column migration."""
        logger.info("🚀 Starting complete column migration...")
        
        try:
            # Connect to database
            if not self.connect():
                return False

            # Add columns to different tables
            migrations = [
                ("restaurants", self.add_restaurant_columns),
                ("marketplace", self.add_marketplace_columns),
                ("users", self.add_user_columns),
            ]
            
            success_count = 0
            total_migrations = len(migrations)
            
            for table_name, migration_func in migrations:
                logger.info(f"📋 Processing {table_name} table...")
                if migration_func():
                    success_count += 1
                    logger.info(f"✅ {table_name} migration completed")
                else:
                    logger.warning(f"⚠️ {table_name} migration failed")

            logger.info(f"🎉 Column migration completed: {success_count}/{total_migrations} successful")
            return success_count == total_migrations

        except Exception as e:
            logger.error(f"❌ Column migration failed: {e}")
            return False


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Database Column Manager')
    parser.add_argument('--table', help='Specific table to process (restaurants, marketplace, users)')
    parser.add_argument('--validate', action='store_true', help='Validate table structure')
    parser.add_argument('--database-url', help='Database URL (optional)')
    
    args = parser.parse_args()
    
    try:
        manager = DatabaseColumnManager(database_url=args.database_url)
        
        if args.validate:
            if args.table:
                result = manager.validate_table_structure(args.table)
                print(f"Table validation result: {result}")
            else:
                print("Please specify a table with --table for validation")
        elif args.table:
            if args.table == "restaurants":
                success = manager.add_restaurant_columns()
            elif args.table == "marketplace":
                success = manager.add_marketplace_columns()
            elif args.table == "users":
                success = manager.add_user_columns()
            else:
                print(f"Unknown table: {args.table}")
                return 1
        else:
            success = manager.run_complete_migration()
        
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"❌ Column manager failed: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
