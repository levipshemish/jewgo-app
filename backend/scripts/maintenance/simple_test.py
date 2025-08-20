import os

from database.database_manager_v3 import EnhancedDatabaseManager
from dotenv import load_dotenv

#!/usr/bin/env python3
"""Simple test to check database manager functionality."""


def test_database() -> None:
    """Test database connection and restaurant retrieval."""
    # Load environment variables
    load_dotenv()

    database_url = os.getenv("DATABASE_URL")

    # Create database manager
    db = EnhancedDatabaseManager(database_url)

    # Test connection
    if db.connect():
        # Test getting restaurants
        restaurants = db.get_restaurants(limit=10, as_dict=True)

        if restaurants:
            for _i, _restaurant in enumerate(restaurants[:3]):
                pass
        else:
            pass

        # Test health check
        if db.health_check():
            pass
        else:
            pass
    else:
        pass


if __name__ == "__main__":
    test_database()
