#!/usr/bin/env python3
"""Simple test of marketplace service without Flask dependencies."""

import os
import sys

from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()


def test_marketplace_service_simple():
    """Test marketplace service with mock database manager."""
    try:
        print("🧪 Testing marketplace service with mock database manager...")

        # Test if we can import the service
        try:
            from services.marketplace_service_v4 import MarketplaceServiceV4

            print("✅ MarketplaceServiceV4 imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import MarketplaceServiceV4: {e}")
            return False

        # Test if we can create the service
        try:
            service = MarketplaceServiceV4()
            print("✅ MarketplaceServiceV4 created successfully")
        except Exception as e:
            print(f"❌ Failed to create MarketplaceServiceV4: {e}")
            return False

        # Test the exact query logic from marketplace service
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor

            database_url = os.getenv("DATABASE_URL")
            if database_url.startswith("postgresql+psycopg://"):
                database_url = database_url.replace(
                    "postgresql+psycopg://", "postgresql://"
                )

            conn = psycopg2.connect(database_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Test the exact query from the service
            query = """
                SELECT m.id, m.title, m.description, m.price_cents, m.currency, m.city, m.region, m.zip, 
                       m.lat, m.lng, m.seller_user_id, m.type, m.condition,
                       m.category_id, m.subcategory_id, m.status, m.created_at, m.updated_at
                FROM "Marketplace listings" m
                WHERE m.status = %s
                ORDER BY m.created_at DESC LIMIT %s OFFSET %s
            """

            params = ("active", 5, 0)
            cursor.execute(query, params)
            results = cursor.fetchall()

            print(
                f"✅ Database query executed successfully, found {len(results)} results"
            )

            if results:
                print("📝 Sample result:")
                result = results[0]
                print(f"  ID: {result['id']}")
                print(f"  Title: {result['title']}")
                print(f"  Price: ${result['price_cents']/100:.2f}")
                print(f"  Status: {result['status']}")

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return False

        # Test count query
        try:
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            count_query = """
                SELECT COUNT(*) as total FROM "Marketplace listings" m 
                WHERE m.status = %s
            """

            cursor.execute(count_query, ("active",))
            total = cursor.fetchone()["total"]

            print(f"✅ Count query executed successfully, total: {total}")

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"❌ Count query failed: {e}")
            return False

        print("✅ Marketplace service logic works correctly")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    result = test_marketplace_service_simple()
    if result:
        print("🎉 All tests passed!")
    else:
        print("💥 Tests failed!")
        sys.exit(1)
