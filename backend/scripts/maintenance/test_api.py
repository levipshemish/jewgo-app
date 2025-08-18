import os

from dotenv import load_dotenv





import requests

#!/usr/bin/env python3
"""Test script to verify the API endpoint is working correctly."""

def test_api() -> None:
    """Test the restaurants API endpoint."""
    # Load environment variables
    load_dotenv()

    # Get the backend URL
    backend_url = os.getenv("NEXT_PUBLIC_BACKEND_URL", "https://jewgo.onrender.com")

    try:
        # Test the restaurants endpoint
        response = requests.get(f"{backend_url}/api/restaurants?limit=5", timeout=10)

        if response.status_code == 200:
            data = response.json()
            restaurants = data.get("restaurants", [])

            if restaurants:
                for _i, _restaurant in enumerate(restaurants[:3]):
                    pass
            else:
                pass
        else:
            pass

    except requests.exceptions.RequestException as e:
        pass
    except Exception as e:
        pass


if __name__ == "__main__":
    test_api()
