#!/usr/bin/env python3
"""Database Migration: Create Profiles Table.
========================================
Creates the profiles table for storing user profile information.
"""


import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "create_profiles_table"
down_revision = "create_reviews_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create profiles table."""
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(50), primary_key=True),  # User ID from auth
        sa.Column("username", sa.String(30), unique=True, nullable=False),
        sa.Column("display_name", sa.String(50), nullable=False),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column(
            "preferences", JSONB, nullable=True
        ),  # Store user preferences as JSON
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    # Create indexes for better performance
    op.create_index("idx_profiles_username", "profiles", ["username"])
    op.create_index("idx_profiles_display_name", "profiles", ["display_name"])
    op.create_index("idx_profiles_created_at", "profiles", ["created_at"])

    # Add constraints
    op.create_check_constraint(
        "check_username_format", "profiles", "username ~ '^[a-zA-Z0-9_-]+$'"
    )

    op.create_check_constraint(
        "check_username_length",
        "profiles",
        "length(username) >= 3 AND length(username) <= 30",
    )

    op.create_check_constraint(
        "check_display_name_length",
        "profiles",
        "length(display_name) >= 1 AND length(display_name) <= 50",
    )

    op.create_check_constraint(
        "check_bio_length", "profiles", "bio IS NULL OR length(bio) <= 500"
    )

    op.create_check_constraint(
        "check_location_length",
        "profiles",
        "location IS NULL OR length(location) <= 100",
    )

    op.create_check_constraint(
        "check_website_length", "profiles", "website IS NULL OR length(website) <= 500"
    )

    op.create_check_constraint(
        "check_phone_format",
        "profiles",
        "phone IS NULL OR phone ~ '^[+]?[1-9][0-9]{0,15}$'",
    )


def downgrade() -> None:
    """Drop profiles table."""
    # Drop indexes
    op.drop_index("idx_profiles_username", "profiles")
    op.drop_index("idx_profiles_display_name", "profiles")
    op.drop_index("idx_profiles_created_at", "profiles")

    # Drop constraints
    op.drop_constraint("check_username_format", "profiles", type_="check")
    op.drop_constraint("check_username_length", "profiles", type_="check")
    op.drop_constraint("check_display_name_length", "profiles", type_="check")
    op.drop_constraint("check_bio_length", "profiles", type_="check")
    op.drop_constraint("check_location_length", "profiles", type_="check")
    op.drop_constraint("check_website_length", "profiles", type_="check")
    op.drop_constraint("check_phone_format", "profiles", type_="check")

    # Drop table
    op.drop_table("profiles")
