# !/usr/bin/env python3
"""Database Setup Script for JewGo
Helps configure and test PostgreSQL database connections.
"""
import os
from database_manager_v2 import Base, EnhancedDatabaseManager
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables
load_dotenv()


def test_postgresql_connection() -> bool | None:
    """Test PostgreSQL connection (fallback)."""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return False
        db = EnhancedDatabaseManager(database_url)
        return bool(db.connect())
    except Exception:
        return False


def test_postgresql_connection(database_url) -> bool | None:
    """Test PostgreSQL connection."""
    try:
        db = EnhancedDatabaseManager(database_url)
        return bool(db.connect())
    except Exception:
        return False


def create_tables(database_url) -> bool | None:
    """Create database tables."""
    try:
        engine = create_engine(database_url)
        Base.metadata.create_all(engine)
        return True
    except Exception:
        return False


def migrate_data_from_legacy() -> bool | None:
    """Migrate data from existing legacy database."""
    try:
        # This function is kept for potential future migrations
        # Currently no legacy migration is needed
        print("No legacy migration required")
        return True
    except Exception:
        return False


def show_database_info(database_url) -> None:
    """Show database information."""
    try:
        db = EnhancedDatabaseManager(database_url)
        if db.connect():
            stats = db.get_statistics()
        else:
            pass
    except Exception:
        pass


def main() -> None:
    """Main setup function."""
    # Check environment variables
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return
    # Test connection
    if "postgresql" in database_url:
        if not test_postgresql_connection(database_url):
            return
    else:
        print("Unsupported database type")
        return
    # Create tables
    if not create_tables(database_url):
        return
    # Show database info
    show_database_info(database_url)
    # Offer migration if needed
    migrate_choice = input(
        "🔄 Would you like to migrate data from legacy database? (y/n): ",
    ).lower()
    if migrate_choice == "y":
        migrate_data_from_legacy()


if __name__ == "__main__":
    main()
