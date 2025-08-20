#!/usr/bin/env python3
"""Test Redis test endpoint."""

from app_factory import create_app


def test_redis_test_endpoint():
    """Test Redis test endpoint."""
    app = create_app()

    print("Testing Redis test endpoint...")

    with app.test_client() as client:
        response = client.get("/test-route")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.get_json()}")


if __name__ == "__main__":
    test_redis_test_endpoint()
