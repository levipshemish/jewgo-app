#!/usr/bin/env python3
"""Debug marketplace API."""

import os
import subprocess
import time

import requests


def test_basic_endpoints():
    """Test basic endpoints."""
    base_url = "http://localhost:5001"

    # Test basic health
    try:
        print("Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health: {response.status_code}")
    except Exception as e:
        print(f"Health error: {e}")

    # Test api v4 health
    try:
        print("Testing API v4 health...")
        response = requests.get(f"{base_url}/api/v4/health", timeout=5)
        print(f"API v4 health: {response.status_code}")
    except Exception as e:
        print(f"API v4 health error: {e}")

    # Test marketplace categories
    try:
        print("Testing marketplace categories...")
        response = requests.get(f"{base_url}/api/v4/marketplace/categories", timeout=5)
        print(f"Categories: {response.status_code}")
        if response.status_code != 200:
            print(f"Response text: {response.text}")
    except Exception as e:
        print(f"Categories error: {e}")


def main():
    """Main function."""
    print("🔍 Debugging marketplace API")
    print("=" * 40)

    # Set environment variables
    env = os.environ.copy()
    env["PORT"] = "5001"
    env[
        "DATABASE_URL"
    ] = "postgresql+psycopg://neondb_owner:npg_75MGzUgStfuO@ep-snowy-firefly-aeeo0tbc-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    # Start server
    print("🚀 Starting server...")
    process = subprocess.Popen(
        ["python", "app.py"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )

    try:
        # Wait for server
        print("⏳ Waiting for server...")
        time.sleep(8)

        # Test endpoints
        test_basic_endpoints()

    finally:
        # Stop server
        print("\n🛑 Stopping server...")
        process.terminate()
        process.wait()
        print("✅ Done")


if __name__ == "__main__":
    main()
