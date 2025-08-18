from alembic import op




import sqlalchemy as sa


#!/usr/bin/env python3
"""Database Migration: Create Feedback Table.
========================================
Creates the feedback table for storing user feedback submissions.
"""

# revision identifiers, used by Alembic.
revision = "create_feedback_table"
down_revision = "add_specials_limit_constraint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create feedback table."""
    op.create_table(
        "feedback",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column(
            "type",
            sa.String(20),
            nullable=False,
        ),  # correction, suggestion, general
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "priority",
            sa.String(10),
            nullable=False,
            default="medium",
        ),  # low, medium, high
        sa.Column("restaurant_id", sa.Integer, nullable=True),
        sa.Column("restaurant_name", sa.String(255), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column(
            "attachments",
            sa.Text,
            nullable=True,
        ),  # JSON array of attachment info
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            default="pending",
        ),  # pending, in_progress, resolved, closed
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("referrer", sa.Text, nullable=True),
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column("assigned_to", sa.String(100), nullable=True),
        # Foreign key to restaurants table
        sa.ForeignKeyConstraint(
            ["restaurant_id"],
            ["restaurants.id"],
            ondelete="SET NULL",
        ),
        # Indexes for performance
        sa.Index("idx_feedback_type", "type"),
        sa.Index("idx_feedback_status", "status"),
        sa.Index("idx_feedback_priority", "priority"),
        sa.Index("idx_feedback_restaurant_id", "restaurant_id"),
        sa.Index("idx_feedback_created_at", "created_at"),
        sa.Index("idx_feedback_contact_email", "contact_email"),
    )

    # Add comments
    op.execute(
        "COMMENT ON TABLE feedback IS 'User feedback submissions for restaurants and general app feedback'",
    )
    op.execute("COMMENT ON COLUMN feedback.id IS 'Unique feedback identifier'")
    op.execute(
        "COMMENT ON COLUMN feedback.type IS 'Type of feedback: correction, suggestion, general'",
    )
    op.execute("COMMENT ON COLUMN feedback.category IS 'Specific category of feedback'")
    op.execute(
        "COMMENT ON COLUMN feedback.description IS 'Detailed description of the feedback'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.priority IS 'Priority level: low, medium, high'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.restaurant_id IS 'Associated restaurant ID (if applicable)'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.restaurant_name IS 'Associated restaurant name (if applicable)'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.contact_email IS 'User contact email for follow-up'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.attachments IS 'JSON array of attachment information'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.status IS 'Current status: pending, in_progress, resolved, closed'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.created_at IS 'Timestamp when feedback was submitted'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.updated_at IS 'Timestamp when feedback was last updated'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.user_agent IS 'User agent string from submission'",
    )
    op.execute("COMMENT ON COLUMN feedback.ip_address IS 'IP address of submitter'")
    op.execute("COMMENT ON COLUMN feedback.referrer IS 'Referrer URL'")
    op.execute(
        "COMMENT ON COLUMN feedback.admin_notes IS 'Admin notes and internal comments'",
    )
    op.execute(
        "COMMENT ON COLUMN feedback.assigned_to IS 'Team member assigned to handle this feedback'",
    )


def downgrade() -> None:
    """Remove feedback table."""
    op.drop_table("feedback")
