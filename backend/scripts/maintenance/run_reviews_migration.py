import psycopg2
from dotenv import load_dotenv

from utils.config_manager import ConfigManager





#!/usr/bin/env python3
"""Manual Migration Script: Create Reviews Tables.
=============================================
Creates the reviews and review_flags tables for storing user reviews and moderation data.
"""

# Load environment variables
load_dotenv()


def run_migration() -> bool | None:
    """Create reviews and review_flags tables."""
    database_url = ConfigManager.get_database_url()
    if not database_url:
        return False

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Check if reviews table already exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'reviews'
            );
        """,
        )

        if cursor.fetchone()[0]:
            conn.close()
            return True

        # Create reviews table
        cursor.execute(
            """
            CREATE TABLE reviews (
                id VARCHAR(50) PRIMARY KEY,
                restaurant_id INTEGER NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                title VARCHAR(255),
                content TEXT NOT NULL,
                images TEXT[],
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                moderator_notes TEXT,
                verified_purchase BOOLEAN DEFAULT FALSE,
                helpful_count INTEGER DEFAULT 0,
                report_count INTEGER DEFAULT 0,

                FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            );
        """,
        )

        # Create indexes for reviews table
        cursor.execute(
            "CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);",
        )
        cursor.execute("CREATE INDEX idx_reviews_user_id ON reviews(user_id);")
        cursor.execute("CREATE INDEX idx_reviews_status ON reviews(status);")
        cursor.execute("CREATE INDEX idx_reviews_created_at ON reviews(created_at);")
        cursor.execute("CREATE INDEX idx_reviews_rating ON reviews(rating);")

        # Create review_flags table
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
        """,
        )

        # Create indexes for review_flags table
        cursor.execute(
            "CREATE INDEX idx_review_flags_review_id ON review_flags(review_id);",
        )
        cursor.execute("CREATE INDEX idx_review_flags_status ON review_flags(status);")
        cursor.execute(
            "CREATE INDEX idx_review_flags_reported_at ON review_flags(reported_at);",
        )

        # Add comments
        cursor.execute("COMMENT ON TABLE reviews IS 'User reviews for restaurants';")
        cursor.execute("COMMENT ON COLUMN reviews.id IS 'Unique review identifier';")
        cursor.execute(
            "COMMENT ON COLUMN reviews.restaurant_id IS 'Associated restaurant ID';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.user_id IS 'User who wrote the review';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.user_name IS 'Display name of the reviewer';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';",
        )
        cursor.execute("COMMENT ON COLUMN reviews.title IS 'Review title (optional)';")
        cursor.execute("COMMENT ON COLUMN reviews.content IS 'Review content text';")
        cursor.execute(
            "COMMENT ON COLUMN reviews.images IS 'Array of image URLs attached to review';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.status IS 'Review status: pending, approved, rejected, flagged';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.created_at IS 'Timestamp when review was created';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.updated_at IS 'Timestamp when review was last updated';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.moderator_notes IS 'Internal notes from moderators';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.verified_purchase IS 'Whether reviewer verified their visit';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.helpful_count IS 'Number of users who found review helpful';",
        )
        cursor.execute(
            "COMMENT ON COLUMN reviews.report_count IS 'Number of times review was reported';",
        )

        cursor.execute(
            "COMMENT ON TABLE review_flags IS 'Flags/reports for reviews requiring moderation';",
        )
        cursor.execute("COMMENT ON COLUMN review_flags.id IS 'Unique flag identifier';")
        cursor.execute(
            "COMMENT ON COLUMN review_flags.review_id IS 'Associated review ID';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.reason IS 'Reason for flagging: inappropriate, spam, fake, offensive, irrelevant, other';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.description IS 'Detailed description of the flag';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.reported_by IS 'User who reported the review';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.reported_at IS 'Timestamp when review was flagged';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.status IS 'Flag status: pending, resolved, dismissed';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.resolved_by IS 'Moderator who resolved the flag';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.resolved_at IS 'Timestamp when flag was resolved';",
        )
        cursor.execute(
            "COMMENT ON COLUMN review_flags.resolution_notes IS 'Notes about flag resolution';",
        )

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        if "conn" in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == "__main__":
    run_migration()
