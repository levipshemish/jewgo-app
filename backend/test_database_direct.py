#!/usr/bin/env python3
"""Direct database test without importing marketplace service."""

import os
import sys

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def test_database_direct():
    """Test database connection and marketplace query directly."""
    try:
        print("🧪 Testing database connection and marketplace query directly...")

        # Test database connection
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor

            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                print("❌ DATABASE_URL not found in environment")
                return False

            if database_url.startswith("postgresql+psycopg://"):
                database_url = database_url.replace(
                    "postgresql+psycopg://", "postgresql://"
                )

            print(f"🔗 Connecting to database...")
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Database connection successful")

        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False

        # Test marketplace query
        try:
            query = """
                SELECT m.id, m.title, m.description, m.price_cents, m.currency, m.city, m.region, m.zip, 
                       m.lat, m.lng, m.seller_user_id, m.type, m.condition,
                       m.category_id, m.subcategory_id, m.status, m.created_at, m.updated_at
                FROM "Marketplace listings" m
                WHERE m.status = %s
                ORDER BY m.created_at DESC LIMIT %s OFFSET %s
            """

            params = ("active", 5, 0)
            print(f"🔍 Executing query with params: {params}")
            cursor.execute(query, params)
            results = cursor.fetchall()

            print(f"✅ Query executed successfully, found {len(results)} results")

            if results:
                print("📝 Sample results:")
                for i, result in enumerate(results[:3]):
                    print(f"  Result {i+1}:")
                    print(f"    ID: {result['id']}")
                    print(f"    Title: {result['title']}")
                    print(f"    Price: ${result['price_cents']/100:.2f}")
                    print(f"    Status: {result['status']}")
                    print("    ---")
            else:
                print("⚠️  No results found")

        except Exception as e:
            print(f"❌ Query execution failed: {e}")
            cursor.close()
            conn.close()
            return False

        # Test count query
        try:
            count_query = """
                SELECT COUNT(*) as total FROM "Marketplace listings" m 
                WHERE m.status = %s
            """

            cursor.execute(count_query, ("active",))
            total = cursor.fetchone()["total"]

            print(f"✅ Count query executed successfully, total: {total}")

        except Exception as e:
            print(f"❌ Count query failed: {e}")
            cursor.close()
            conn.close()
            return False

        cursor.close()
        conn.close()

        print("✅ All database tests passed!")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    result = test_database_direct()
    if result:
        print("🎉 Database tests passed!")
    else:
        print("💥 Database tests failed!")
        sys.exit(1)
