# !/usr/bin/env python3
"""Neon PostgreSQL Setup Script for JewGo
Quick setup for Neon Tech PostgreSQL database.
"""
import os
import subprocess
import sys
import time
import requests
from database_manager import DatabaseManager as OldDB
from database_manager_v2 import Base
from database_manager_v2 import EnhancedDatabaseManager as NewDB
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables
load_dotenv(".env")


def setup_neon_database() -> bool | None:
    """Setup Neon PostgreSQL database."""
    # Check if DATABASE_URL is set
    database_url = os.environ.get("DATABASE_URL")
    if (
        not database_url
        or "neon.tech" not in database_url
        or "username:password" in database_url
    ):
        return False
    # Test connection
    try:
        db = NewDB(database_url)
        if db.connect():
            # Create tables
            engine = create_engine(database_url)
            Base.metadata.create_all(engine)
            # Show database info
            stats = db.get_statistics()
            # Offer migration
            if stats.get("total_restaurants", 0) == 0:
                migrate_choice = input("Migrate data from SQLite? (y/n): ").lower()
                if migrate_choice == "y":
                    migrate_from_sqlite(database_url)
            return True
        return False
    except Exception as e:
        return False


def migrate_from_sqlite(database_url) -> bool | None:
    """Migrate data from SQLite to Neon PostgreSQL."""
    try:
        # Connect to old SQLite database
        old_db = OldDB()
        if not old_db.connect():
            return False
        # Connect to new Neon PostgreSQL database
        new_db = NewDB(database_url)
        if not new_db.connect():
            return False
        # Get all restaurants from SQLite
        restaurants = old_db.search_restaurants(limit=10000)
        # Migrate each restaurant
        migrated_count = 0
        for i, restaurant in enumerate(restaurants, 1):
            if new_db.add_restaurant(restaurant):
                migrated_count += 1
                if i % 50 == 0:  # Progress indicator
                    pass
            else:
                pass
        # Show final statistics
        stats = new_db.get_statistics()
        return True
    except Exception as e:
        return False


def test_api() -> None:
    """Test the API with Neon database."""
    try:
        # Start the production Flask app
        process = subprocess.Popen(
            [sys.executable, "app_production.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Wait for server to start
        time.sleep(3)
        # Test endpoints
        try:
            response = requests.get("http://localhost:8081/", timeout=5)
            if response.status_code == 200:
                pass
            else:
                pass
        except:
            pass
        try:
            response = requests.get("http://localhost:8081/health", timeout=5)
            if response.status_code == 200:
                pass
            else:
                pass
        except:
            pass
        try:
            response = requests.get("http://localhost:8081/api/restaurants", timeout=5)
            if response.status_code == 200:
                data = response.json()
            else:
                pass
        except:
            pass
        # Stop the server
        process.terminate()
    except Exception as e:
        pass


def main() -> None:
    """Main setup function."""
    if setup_neon_database():
        # Offer to test API
        test_choice = input("\n🧪 Would you like to test the API? (y/n): ").lower()
        if test_choice == "y":
            test_api()
    else:
        pass


if __name__ == "__main__":
    main()
