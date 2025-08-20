import os

from app_factory import create_app
from dotenv import load_dotenv

#!/usr/bin/env python3
"""Test Flask app initialization and database manager."""


def test_flask_app() -> None:
    """Test Flask app initialization."""
    # Load environment variables
    load_dotenv()

    app = create_app()

    with app.test_client() as client:
        response = client.get("/api/restaurants?limit=5")

        if response.status_code == 200:
            data = response.get_json()
            restaurants = data.get("restaurants", [])

            if restaurants:
                pass
            else:
                pass
        else:
            pass


if __name__ == "__main__":
    test_flask_app()
