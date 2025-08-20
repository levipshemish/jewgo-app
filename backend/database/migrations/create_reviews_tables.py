import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY

#!/usr/bin/env python3
"""Database Migration: Create Reviews Tables.
========================================
Creates the reviews and review_flags tables for storing user reviews and moderation data.
"""

# revision identifiers, used by Alembic.
revision = "create_reviews_tables"
down_revision = "create_feedback_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create reviews and review_flags tables."""
    # Create reviews table
    op.create_table(
        "reviews",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("restaurant_id", sa.Integer, nullable=False),
        sa.Column("user_id", sa.String(50), nullable=False),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("images", ARRAY(sa.String), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column("moderator_notes", sa.Text, nullable=True),
        sa.Column("verified_purchase", sa.Boolean, nullable=False, default=False),
        sa.Column("helpful_count", sa.Integer, nullable=False, default=0),
        sa.Column("report_count", sa.Integer, nullable=False, default=0),
        # Foreign key to restaurants table
        sa.ForeignKeyConstraint(
            ["restaurant_id"],
            ["restaurants.id"],
            ondelete="CASCADE",
        ),
        # Check constraint for rating
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
        # Indexes for performance
        sa.Index("idx_reviews_restaurant_id", "restaurant_id"),
        sa.Index("idx_reviews_user_id", "user_id"),
        sa.Index("idx_reviews_status", "status"),
        sa.Index("idx_reviews_created_at", "created_at"),
        sa.Index("idx_reviews_rating", "rating"),
    )

    # Create review_flags table
    op.create_table(
        "review_flags",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("review_id", sa.String(50), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("reported_by", sa.String(50), nullable=False),
        sa.Column("reported_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("resolved_by", sa.String(50), nullable=True),
        sa.Column("resolved_at", sa.DateTime, nullable=True),
        sa.Column("resolution_notes", sa.Text, nullable=True),
        # Foreign key to reviews table
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete="CASCADE"),
        # Indexes for performance
        sa.Index("idx_review_flags_review_id", "review_id"),
        sa.Index("idx_review_flags_status", "status"),
        sa.Index("idx_review_flags_reported_at", "reported_at"),
    )

    # Add comments
    op.execute("COMMENT ON TABLE reviews IS 'User reviews for restaurants'")
    op.execute("COMMENT ON COLUMN reviews.id IS 'Unique review identifier'")
    op.execute("COMMENT ON COLUMN reviews.restaurant_id IS 'Associated restaurant ID'")
    op.execute("COMMENT ON COLUMN reviews.user_id IS 'User who wrote the review'")
    op.execute("COMMENT ON COLUMN reviews.user_name IS 'Display name of the reviewer'")
    op.execute("COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars'")
    op.execute("COMMENT ON COLUMN reviews.title IS 'Review title (optional)'")
    op.execute("COMMENT ON COLUMN reviews.content IS 'Review content text'")
    op.execute(
        "COMMENT ON COLUMN reviews.images IS 'Array of image URLs attached to review'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.status IS 'Review status: pending, approved, rejected, flagged'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.created_at IS 'Timestamp when review was created'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.updated_at IS 'Timestamp when review was last updated'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.moderator_notes IS 'Internal notes from moderators'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.verified_purchase IS 'Whether reviewer verified their visit'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.helpful_count IS 'Number of users who found review helpful'",
    )
    op.execute(
        "COMMENT ON COLUMN reviews.report_count IS 'Number of times review was reported'",
    )

    op.execute(
        "COMMENT ON TABLE review_flags IS 'Flags/reports for reviews requiring moderation'",
    )
    op.execute("COMMENT ON COLUMN review_flags.id IS 'Unique flag identifier'")
    op.execute("COMMENT ON COLUMN review_flags.review_id IS 'Associated review ID'")
    op.execute(
        "COMMENT ON COLUMN review_flags.reason IS 'Reason for flagging: inappropriate, spam, fake, offensive, irrelevant, other'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.description IS 'Detailed description of the flag'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.reported_by IS 'User who reported the review'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.reported_at IS 'Timestamp when review was flagged'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.status IS 'Flag status: pending, resolved, dismissed'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.resolved_by IS 'Moderator who resolved the flag'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.resolved_at IS 'Timestamp when flag was resolved'",
    )
    op.execute(
        "COMMENT ON COLUMN review_flags.resolution_notes IS 'Notes about flag resolution'",
    )


def downgrade() -> None:
    """Remove reviews and review_flags tables."""
    op.drop_table("review_flags")
    op.drop_table("reviews")
