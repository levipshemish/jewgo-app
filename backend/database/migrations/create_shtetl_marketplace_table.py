#!/usr/bin/env python3
"""Database Migration: Create Shtetl Marketplace Table.
=======================================================
Creates a separate shtetl_marketplace table specifically for 
Jewish community marketplace items, completely independent 
from the regular marketplace table.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY

# revision identifiers, used by Alembic.
revision = "create_shtetl_marketplace_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create shtetl_marketplace table for Jewish community items."""

    # Create shtetl_marketplace table
    op.create_table(
        "shtetl_marketplace",
        # 🔒 System-Generated / Controlled
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        
        # 🧾 Required Fields
        sa.Column("title", sa.String(500), nullable=False),  # Item title
        sa.Column("description", sa.Text, nullable=True),    # Item description
        sa.Column("price_cents", sa.Integer, nullable=False, default=0),  # Price in cents (0 for Gemach)
        sa.Column("currency", sa.String(10), default="USD", nullable=False),
        
        # 📍 Location Details
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("zip_code", sa.String(20), nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        
        # 🏛️ Jewish Community Categories
        sa.Column("category_name", sa.String(100), nullable=False),  # Judaica, Holiday Items, etc.
        sa.Column("subcategory", sa.String(100), nullable=True),     # Mezuzot, Passover, etc.
        
        # 🖼️ Images
        sa.Column("thumbnail", sa.String(2000), nullable=True),
        sa.Column("images", ARRAY(sa.String), nullable=True),
        
        # 👤 Community Seller Information
        sa.Column("seller_name", sa.String(255), nullable=False),
        sa.Column("seller_phone", sa.String(50), nullable=True),
        sa.Column("seller_email", sa.String(255), nullable=True),
        sa.Column("seller_user_id", sa.String(100), nullable=True),  # Link to user account
        
        # 🍃 Kosher & Jewish Community Features
        sa.Column("kosher_agency", sa.String(100), nullable=True),     # OU, OK, Star-K, etc.
        sa.Column("kosher_level", sa.String(50), nullable=True),       # Glatt, Cholov Yisrael, etc.
        sa.Column("kosher_verified", sa.Boolean, default=False, nullable=False),
        sa.Column("rabbi_endorsed", sa.Boolean, default=False, nullable=False),
        sa.Column("community_verified", sa.Boolean, default=False, nullable=False),
        
        # 🎁 Gemach (Free Loan) Features
        sa.Column("is_gemach", sa.Boolean, default=False, nullable=False),  # Free community loan
        sa.Column("gemach_type", sa.String(50), nullable=True),  # baby_items, books, etc.
        sa.Column("loan_duration_days", sa.Integer, nullable=True),  # Expected loan duration
        sa.Column("return_condition", sa.String(200), nullable=True),  # Return conditions
        
        # 🗓️ Jewish Calendar Features
        sa.Column("holiday_category", sa.String(50), nullable=True),  # passover, sukkot, etc.
        sa.Column("seasonal_item", sa.Boolean, default=False, nullable=False),
        sa.Column("available_until", sa.Date, nullable=True),  # Expiration for seasonal items
        
        # 📊 Item Metadata
        sa.Column("condition", sa.String(20), default="good", nullable=False),  # new, like_new, good, fair
        sa.Column("stock_quantity", sa.Integer, default=1, nullable=False),
        sa.Column("is_available", sa.Boolean, default=True, nullable=False),
        sa.Column("is_featured", sa.Boolean, default=False, nullable=False),
        
        # ⭐ Community Ratings
        sa.Column("rating", sa.Float, default=0.0, nullable=False),
        sa.Column("review_count", sa.Integer, default=0, nullable=False),
        
        # 📊 Business Logic
        sa.Column("status", sa.String(20), default="active", nullable=False),  # active, sold, loaned, inactive
        sa.Column("transaction_type", sa.String(20), default="sale", nullable=False),  # sale, gemach, trade
        
        # 🔍 Search and Discovery
        sa.Column("tags", ARRAY(sa.String), nullable=True),  # Searchable tags
        sa.Column("keywords", sa.String(500), nullable=True),  # Search keywords
        
        # 📝 Additional Community Information
        sa.Column("pickup_instructions", sa.Text, nullable=True),  # How to arrange pickup/delivery
        sa.Column("notes", sa.Text, nullable=True),  # Additional notes
        sa.Column("contact_preference", sa.String(20), default="phone", nullable=False),  # phone, email, whatsapp
        
        # Check constraints
        sa.CheckConstraint("price_cents >= 0", name="check_shtetl_price_positive"),
        sa.CheckConstraint("stock_quantity >= 0", name="check_shtetl_stock_positive"),
        sa.CheckConstraint("rating >= 0 AND rating <= 5", name="check_shtetl_rating_range"),
        sa.CheckConstraint(
            "status IN ('active', 'sold', 'loaned', 'inactive', 'pending')",
            name="check_shtetl_status_valid",
        ),
        sa.CheckConstraint(
            "condition IN ('new', 'like_new', 'good', 'fair')",
            name="check_shtetl_condition_valid",
        ),
        sa.CheckConstraint(
            "transaction_type IN ('sale', 'gemach', 'trade', 'donation')",
            name="check_shtetl_transaction_type_valid",
        ),
        sa.CheckConstraint(
            "contact_preference IN ('phone', 'email', 'whatsapp', 'text')",
            name="check_shtetl_contact_preference_valid",
        ),
        
        # Indexes for performance
        sa.Index("idx_shtetl_title", "title"),
        sa.Index("idx_shtetl_category", "category_name"),
        sa.Index("idx_shtetl_subcategory", "subcategory"),
        sa.Index("idx_shtetl_seller_name", "seller_name"),
        sa.Index("idx_shtetl_price", "price_cents"),
        sa.Index("idx_shtetl_status", "status"),
        sa.Index("idx_shtetl_is_gemach", "is_gemach"),
        sa.Index("idx_shtetl_is_featured", "is_featured"),
        sa.Index("idx_shtetl_kosher_agency", "kosher_agency"),
        sa.Index("idx_shtetl_community_verified", "community_verified"),
        sa.Index("idx_shtetl_created_at", "created_at"),
        sa.Index("idx_shtetl_location", "city", "state"),
        sa.Index("idx_shtetl_holiday_category", "holiday_category"),
        sa.Index("idx_shtetl_seller_user_id", "seller_user_id"),
        sa.Index("idx_shtetl_transaction_type", "transaction_type"),
        
        # Full-text search index
        sa.Index(
            "idx_shtetl_search",
            "title",
            "description",
            "keywords",
            postgresql_using="gin",
        ),
    )

    # Add table and column comments
    op.execute(
        "COMMENT ON TABLE shtetl_marketplace IS 'Shtetl marketplace for Jewish community items, Gemach loans, and kosher products'"
    )
    op.execute("COMMENT ON COLUMN shtetl_marketplace.id IS 'Unique shtetl item identifier'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.title IS 'Item title (required)'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.price_cents IS 'Price in cents, 0 for Gemach items'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.is_gemach IS 'True if this is a free community loan item'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.kosher_agency IS 'Kosher certification agency (OU, OK, etc.)'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.community_verified IS 'Verified by community members'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.holiday_category IS 'Jewish holiday category (passover, sukkot, etc.)'")
    op.execute("COMMENT ON COLUMN shtetl_marketplace.transaction_type IS 'sale, gemach, trade, or donation'")


def downgrade() -> None:
    """Drop shtetl_marketplace table."""
    op.drop_table("shtetl_marketplace")