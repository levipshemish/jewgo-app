#!/usr/bin/env python3
"""Debug script to test database manager initialization in Flask app context."""

import os

from app_factory import create_app, deps
from dotenv import load_dotenv


def debug_database_manager() -> None:
    """Debug the database manager initialization."""
    # Load environment variables
    load_dotenv()

    # Create Flask app
    app = create_app()

    # Test database manager in app context
    with app.app_context():
        # Get the database manager
        db_manager = deps.get("get_db_manager")()

        if db_manager:
            # Test connection
            if db_manager.test_connection():
                # Test getting restaurants
                restaurants = db_manager.get_restaurants(limit=5, as_dict=True)

                if restaurants:
                    pass
            else:
                pass
        else:
            pass


if __name__ == "__main__":
    debug_database_manager()
