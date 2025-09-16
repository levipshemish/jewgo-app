# !/usr/bin/env python3
"""Database Cleanup Migration.
==========================
This migration removes unused columns and models from the JewGo database
as documented in the cleanup plan.
Author: JewGo Development Team
Version: 1.0
"""
import argparse
import builtins
import contextlib
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
# Configure logging
logger = get_logger(__name__)


class DatabaseCleanupMigration:
    """Migration to clean up unused database columns and models."""

    def __init__(self, database_url: str | None = None) -> None:
        """Initialize the migration.
        Args:
            database_url: Database connection URL (optional, will use env var)
        """
        # Load environment variables from .env file
        try:
            load_dotenv()
        except ImportError:
            pass  # dotenv not available, use system environment
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        if not self.database_url:
            msg = "DATABASE_URL environment variable not set"
            raise ValueError(msg)
        self.engine = None
        self.connection = None

    def connect(self) -> bool:
        """Connect to the database."""
        try:
            self.engine = create_engine(self.database_url)
            self.connection = self.engine.connect()
            # Start a transaction
            self.transaction = self.connection.begin()
            logger.info("Database connection established")
            return True
        except Exception as e:
            logger.exception("Failed to connect to database", error=str(e))
            return False

    def disconnect(self) -> None:
        """Disconnect from the database."""
        if hasattr(self, "transaction") and self.transaction:
            with contextlib.suppress(builtins.BaseException):
                self.transaction.rollback()
        if self.connection:
            self.connection.close()
        if self.engine:
            self.engine.dispose()
        logger.info("Database connection closed")

    def backup_table(self, table_name: str) -> bool:
        """Create a backup of a table before modification.
        Args:
            table_name: Name of the table to backup
        Returns:
            True if backup successful, False otherwise
        """
        try:
            backup_table_name = (
                f"{table_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            # Create backup table
            create_backup_sql = """
            CREATE TABLE {backup_table_name} AS
            SELECT * FROM {table_name}
            """
            self.connection.execute(text(create_backup_sql))
            self.transaction.commit()
            logger.info("Created backup table", backup_table_name=backup_table_name)
            return True
        except Exception as e:
            logger.exception(
                "Failed to create backup", table_name=table_name, error=str(e)
            )
            return False

    def check_column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table.
        Args:
            table_name: Name of the table
            column_name: Name of the column
        Returns:
            True if column exists, False otherwise
        """
        try:
            # PostgreSQL-specific query to check column existence
            check_sql = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table_name
            AND column_name = :column_name
            """
            result = self.connection.execute(
                text(check_sql),
                {"table_name": table_name, "column_name": column_name},
            )
            return result.fetchone() is not None
        except Exception as e:
            logger.exception(
                "Failed to check column",
                table_name=table_name,
                column_name=column_name,
                error=str(e),
            )
            return False

    def check_table_exists(self, table_name: str) -> bool:
        """Check if a table exists.
        Args:
            table_name: Name of the table
        Returns:
            True if table exists, False otherwise
        """
        try:
            # PostgreSQL-specific query to check table existence
            check_sql = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = :table_name
            """
            result = self.connection.execute(
                text(check_sql), {"table_name": table_name}
            )
            return result.fetchone() is not None
        except Exception as e:
            logger.exception(
                "Failed to check table", table_name=table_name, error=str(e)
            )
            return False

    def remove_column(
        self, table_name: str, column_name: str, create_backup: bool = True
    ) -> bool:
        """Remove a column from a table.
        Args:
            table_name: Name of the table
            column_name: Name of the column to remove
            create_backup: Whether to create a backup before removal
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if column exists
            if not self.check_column_exists(table_name, column_name):
                logger.info(
                    "Column does not exist in table, skipping",
                    column_name=column_name,
                    table_name=table_name,
                )
                return True
            # Create backup if requested
            if create_backup:
                if not self.backup_table(table_name):
                    logger.warning(
                        "Failed to create backup for table, proceeding anyway",
                        table_name=table_name,
                    )
            # Remove column
            drop_sql = f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS {column_name}"
            self.connection.execute(text(drop_sql))
            self.transaction.commit()
            logger.info(
                "Successfully removed column from table",
                column_name=column_name,
                table_name=table_name,
            )
            return True
        except Exception as e:
            logger.exception(
                "Failed to remove column from table",
                column_name=column_name,
                table_name=table_name,
                error=str(e),
            )
            return False

    def drop_table(self, table_name: str, create_backup: bool = True) -> bool:
        """Drop a table.
        Args:
            table_name: Name of the table to drop
            create_backup: Whether to create a backup before dropping
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if table exists
            if not self.check_table_exists(table_name):
                logger.info("Table does not exist, skipping", table_name=table_name)
                return True
            # Create backup if requested
            if create_backup:
                if not self.backup_table(table_name):
                    logger.warning(
                        "Failed to create backup for table, proceeding anyway",
                        table_name=table_name,
                    )
            # Drop table
            drop_sql = f"DROP TABLE IF EXISTS {table_name}"
            self.connection.execute(text(drop_sql))
            self.transaction.commit()
            logger.info("Successfully dropped table", table_name=table_name)
            return True
        except Exception as e:
            logger.exception(
                "Failed to drop table", table_name=table_name, error=str(e)
            )
            return False

    def run_cleanup_migration(self, dry_run: bool = False) -> dict:
        """Run the complete cleanup migration.
        Args:
            dry_run: If True, only show what would be done without making changes
        Returns:
            Dictionary with migration results
        """
        results = {
            "success": True,
            "operations": [],
            "errors": [],
            "backups_created": [],
        }
        try:
            if not self.connect():
                results["success"] = False
                results["errors"].append("Failed to connect to database")
                return results
            logger.info("Starting database cleanup migration", dry_run=dry_run)
            # Define operations to perform
            operations = [
                # Remove unused columns from restaurants table
                {
                    "type": "remove_column",
                    "table": "restaurants",
                    "column": "current_time_local",
                    "description": "Remove unused current_time_local column",
                },
                {
                    "type": "remove_column",
                    "table": "restaurants",
                    "column": "hours_parsed",
                    "description": "Remove unused hours_parsed column",
                },
                # Note: user_email column is kept as it's used in reviews
                # Drop unused tables
                {
                    "type": "drop_table",
                    "table": "review_flags",
                    "description": "Drop unused review_flags table",
                },
            ]
            # Execute operations
            for operation in operations:
                try:
                    if dry_run:
                        # Just log what would be done
                        logger.info(
                            "DRY RUN: Would execute operation",
                            operation_type=operation["type"],
                            description=operation["description"],
                        )
                        results["operations"].append(
                            {
                                "operation": operation,
                                "status": "would_execute",
                                "message": "Dry run - no changes made",
                            }
                        )
                    else:
                        # Actually execute the operation
                        if operation["type"] == "remove_column":
                            success = self.remove_column(
                                operation["table"],
                                operation["column"],
                            )
                        elif operation["type"] == "drop_table":
                            success = self.drop_table(operation["table"])
                        else:
                            success = False
                            results["errors"].append(
                                f"Unknown operation type: {operation['type']}"
                            )
                        if success:
                            results["operations"].append(
                                {
                                    "operation": operation,
                                    "status": "success",
                                    "message": "Operation completed successfully",
                                }
                            )
                        else:
                            results["operations"].append(
                                {
                                    "operation": operation,
                                    "status": "failed",
                                    "message": "Operation failed",
                                }
                            )
                            results["errors"].append(
                                f"Failed to execute: {operation['description']}"
                            )
                except Exception as e:
                    error_msg = f"Error executing {operation['description']}: {e}"
                    logger.exception(error_msg)
                    results["errors"].append(error_msg)
                    results["operations"].append(
                        {
                            "operation": operation,
                            "status": "error",
                            "message": str(e),
                        }
                    )
            # Check if any operations failed
            if any(op["status"] in ["failed", "error"] for op in results["operations"]):
                results["success"] = False
            logger.info("Database cleanup migration completed")
            return results
        except Exception as e:
            error_msg = f"Migration failed: {e}"
            logger.exception(error_msg)
            results["success"] = False
            results["errors"].append(error_msg)
            return results
        finally:
            self.disconnect()

    def verify_migration(self) -> dict:
        """Verify that the migration was successful.
        Returns:
            Dictionary with verification results
        """
        results = {
            "success": True,
            "verifications": [],
            "errors": [],
        }
        try:
            if not self.connect():
                results["success"] = False
                results["errors"].append("Failed to connect to database")
                return results
            # Verify columns were removed
            columns_to_check = [
                ("restaurants", "current_time_local"),
                ("restaurants", "hours_parsed"),
            ]
            for table, column in columns_to_check:
                exists = self.check_column_exists(table, column)
                if exists:
                    results["verifications"].append(
                        {
                            "check": f"Column {column} in {table}",
                            "status": "failed",
                            "message": "Column still exists",
                        }
                    )
                    results["success"] = False
                else:
                    results["verifications"].append(
                        {
                            "check": f"Column {column} in {table}",
                            "status": "success",
                            "message": "Column successfully removed",
                        }
                    )
            # Verify tables were dropped
            tables_to_check = ["review_flags"]
            for table in tables_to_check:
                exists = self.check_table_exists(table)
                if exists:
                    results["verifications"].append(
                        {
                            "check": f"Table {table}",
                            "status": "failed",
                            "message": "Table still exists",
                        }
                    )
                    results["success"] = False
                else:
                    results["verifications"].append(
                        {
                            "check": f"Table {table}",
                            "status": "success",
                            "message": "Table successfully dropped",
                        }
                    )
            return results
        except Exception as e:
            error_msg = f"Verification failed: {e}"
            logger.exception(error_msg)
            results["success"] = False
            results["errors"].append(error_msg)
            return results
        finally:
            self.disconnect()


def main() -> int | None:
    """Main function to run the migration."""
    parser = argparse.ArgumentParser(description="Database Cleanup Migration")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument(
        "--verify", action="store_true", help="Verify the migration was successful"
    )
    parser.add_argument(
        "--database-url",
        help="Database connection URL (optional, uses DATABASE_URL env var)",
    )
    args = parser.parse_args()
    try:
        migration = DatabaseCleanupMigration(database_url=args.database_url)
        if args.verify:
            results = migration.verify_migration()
            for verification in results["verifications"]:
                status_emoji = "✅" if verification["status"] == "success" else "❌"
            if results["errors"]:
                for _error in results["errors"]:
                    pass
            if results["success"]:
                return 0
            return 1
        results = migration.run_cleanup_migration(dry_run=args.dry_run)
        for operation in results["operations"]:
            status_emoji = "✅" if operation["status"] == "success" else "❌"
        if results["errors"]:
            for _error in results["errors"]:
                pass
        if results["success"]:
            return 0
        return 1
    except Exception:
        return 1


if __name__ == "__main__":
    sys.exit(main())
