#!/usr/bin/env python3
"""Database Setup Script for JewGo
Helps configure and test PostgreSQL database connections.
"""

import os

from database_manager import DatabaseManager as OldDB
from database_manager_v2 import Base, EnhancedDatabaseManager
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables
load_dotenv()


def test_sqlite_connection() -> bool | None:
    """Test SQLite connection (fallback)."""
    try:
        db = EnhancedDatabaseManager("sqlite:///restaurants.db")
        return bool(db.connect())
    except Exception as e:
        return False


def test_postgresql_connection(database_url) -> bool | None:
    """Test PostgreSQL connection."""
    try:
        db = EnhancedDatabaseManager(database_url)
        return bool(db.connect())
    except Exception as e:
        return False


def create_tables(database_url) -> bool | None:
    """Create database tables."""
    try:
        engine = create_engine(database_url)
        Base.metadata.create_all(engine)
        return True
    except Exception as e:
        return False


def migrate_data_from_sqlite() -> bool | None:
    """Migrate data from existing SQLite database."""
    try:
        # Connect to old SQLite database
        old_db = OldDB()
        if not old_db.connect():
            return False

        # Get database URL from environment
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return False

        # Connect to new PostgreSQL database
        new_db = EnhancedDatabaseManager(database_url)
        if not new_db.connect():
            return False

        # Get all restaurants from SQLite
        restaurants = old_db.search_restaurants(limit=10000)

        # Migrate each restaurant
        migrated_count = 0
        for restaurant in restaurants:
            if new_db.add_restaurant(restaurant):
                migrated_count += 1
            else:
                pass

        return True

    except Exception as e:
        return False


def show_database_info(database_url) -> None:
    """Show database information."""
    try:
        db = EnhancedDatabaseManager(database_url)
        if db.connect():
            stats = db.get_statistics()
        else:
            pass
    except Exception as e:
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
    elif not test_sqlite_connection():
        return

    # Create tables
    if not create_tables(database_url):
        return

    # Show database info
    show_database_info(database_url)

    # Offer migration if using PostgreSQL
    if "postgresql" in database_url:
        migrate_choice = input(
            "🔄 Would you like to migrate data from SQLite? (y/n): ",
        ).lower()
        if migrate_choice == "y":
            migrate_data_from_sqlite()


if __name__ == "__main__":
    main()
