#!/usr/bin/env python3
"""Check both marketplace tables and their data."""

import os

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

# Load environment variables
load_dotenv()


def check_marketplace_tables():
    """Check both marketplace tables and their data."""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False

    # Convert SQLAlchemy URL to psycopg2 format
    if database_url.startswith("postgresql+psycopg://"):
        database_url = database_url.replace("postgresql+psycopg://", "postgresql://")

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("🔍 Checking marketplace tables...")

        # Check "Marketplace listings" table
        print("\n📋 Checking 'Marketplace listings' table:")
        try:
            cursor.execute('SELECT COUNT(*) as count FROM "Marketplace listings"')
            count = cursor.fetchone()["count"]
            print(f"📊 Total items: {count}")

            if count > 0:
                cursor.execute(
                    'SELECT id, title, type, price_cents, status, created_at FROM "Marketplace listings" LIMIT 3'
                )
                items = cursor.fetchall()
                print("📝 Sample items:")
                for item in items:
                    print(f'  ID: {item["id"]}')
                    print(f'  Title: {item["title"]}')
                    print(f'  Type: {item["type"]}')
                    print(f'  Price: ${item["price_cents"]/100:.2f}')
                    print(f'  Status: {item["status"]}')
                    print("  ---")
        except Exception as e:
            print(f'❌ Error checking "Marketplace listings": {e}')

        # Check "marketplace" table
        print("\n📋 Checking 'marketplace' table:")
        try:
            cursor.execute("SELECT COUNT(*) as count FROM marketplace")
            count = cursor.fetchone()["count"]
            print(f"📊 Total items: {count}")

            if count > 0:
                cursor.execute(
                    "SELECT id, title, name, price, category, status, created_at FROM marketplace LIMIT 3"
                )
                items = cursor.fetchall()
                print("📝 Sample items:")
                for item in items:
                    print(f'  ID: {item["id"]}')
                    print(f'  Title: {item.get("title", "N/A")}')
                    print(f'  Name: {item.get("name", "N/A")}')
                    print(f'  Price: ${item.get("price", "N/A")}')
                    print(f'  Category: {item.get("category", "N/A")}')
                    print(f'  Status: {item.get("status", "N/A")}')
                    print("  ---")
        except Exception as e:
            print(f"❌ Error checking marketplace: {e}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


if __name__ == "__main__":
    check_marketplace_tables()
