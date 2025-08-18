#!/usr/bin/env python3
"""
Deployment Script: Create Reviews Tables in Production
=====================================================
Safely creates the reviews and review_flags tables in the production database.
This script checks if the tables exist before creating them to avoid errors.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor


def check_and_create_reviews_tables():
    """Check if reviews tables exist and create them if they don't."""
    print("🔍 Checking reviews tables in production database...")

    # Get database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ Error: DATABASE_URL environment variable not set")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Check if reviews table exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'reviews'
            );
        """
        )

        reviews_exists = cursor.fetchone()[0]

        # Check if review_flags table exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'review_flags'
            );
        """
        )

        review_flags_exists = cursor.fetchone()[0]

        if reviews_exists and review_flags_exists:
            print("✅ Reviews and review_flags tables already exist!")
            conn.close()
            return True

        print("📝 Creating missing tables...")

        # Create reviews table if it doesn't exist
        if not reviews_exists:
            print("📝 Creating reviews table...")
            cursor.execute(
                """
                CREATE TABLE reviews (
                    id VARCHAR(50) PRIMARY KEY,
                    restaurant_id INTEGER NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    user_name VARCHAR(255) NOT NULL,
                    user_email VARCHAR(255),
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    title VARCHAR(255),
                    content TEXT NOT NULL,
                    images TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    moderator_notes TEXT,
                    verified_purchase BOOLEAN DEFAULT FALSE,
                    helpful_count INTEGER DEFAULT 0,
                    report_count INTEGER DEFAULT 0,
                    
                    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
                );
            """
            )

            # Create indexes for reviews table
            cursor.execute(
                "CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);"
            )
            cursor.execute("CREATE INDEX idx_reviews_user_id ON reviews(user_id);")
            cursor.execute("CREATE INDEX idx_reviews_status ON reviews(status);")
            cursor.execute(
                "CREATE INDEX idx_reviews_created_at ON reviews(created_at);"
            )
            cursor.execute("CREATE INDEX idx_reviews_rating ON reviews(rating);")

            print("✅ Reviews table created successfully!")

        # Create review_flags table if it doesn't exist
        if not review_flags_exists:
            print("📝 Creating review_flags table...")
            cursor.execute(
                """
                CREATE TABLE review_flags (
                    id VARCHAR(50) PRIMARY KEY,
                    review_id VARCHAR(50) NOT NULL,
                    reason VARCHAR(50) NOT NULL,
                    description TEXT,
                    reported_by VARCHAR(50) NOT NULL,
                    reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    resolved_by VARCHAR(50),
                    resolved_at TIMESTAMP,
                    resolution_notes TEXT,
                    
                    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
                );
            """
            )

            # Create indexes for review_flags table
            cursor.execute(
                "CREATE INDEX idx_review_flags_review_id ON review_flags(review_id);"
            )
            cursor.execute(
                "CREATE INDEX idx_review_flags_status ON review_flags(status);"
            )
            cursor.execute(
                "CREATE INDEX idx_review_flags_reported_at ON review_flags(reported_at);"
            )

            print("✅ Review_flags table created successfully!")

        # Commit changes
        conn.commit()
        print("🎉 All reviews tables created successfully!")

        # Verify tables exist
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_name IN ('reviews', 'review_flags');"
        )
        tables = [row[0] for row in cursor.fetchall()]
        print(f"📋 Verified tables: {', '.join(tables)}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        if "conn" in locals():
            conn.rollback()
            conn.close()
        return False


def test_reviews_api():
    """Test the reviews API endpoint after migration."""
    print("\n🧪 Testing reviews API endpoint...")

    try:
        import requests

        response = requests.get(
            "https://jewgo.onrender.com/api/reviews/?restaurantId=1566&status=approved&limit=1"
        )

        if response.status_code == 200:
            print("✅ Reviews API is working!")
            data = response.json()
            print(f"📊 Response: {data}")
        else:
            print(f"❌ Reviews API returned status {response.status_code}")
            print(f"📄 Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing API: {e}")


if __name__ == "__main__":
    print("🚀 Starting reviews migration deployment...")

    # Load environment variables if .env file exists
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    # Run migration
    success = check_and_create_reviews_tables()

    if success:
        print("\n✅ Migration completed successfully!")
        test_reviews_api()
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
