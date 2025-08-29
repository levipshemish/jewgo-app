#!/usr/bin/env python3
"""Database Migration: Create Marketplace Table.
===========================================
Creates the marketplace table for storing marketplace product listings.
This follows the same design pattern as the restaurants table with
comprehensive fields for product management, vendor information, and
kosher certification details.
"""


import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

# revision identifiers, used by Alembic.
revision = "create_marketplace_table"
down_revision = "create_reviews_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create marketplace table with comprehensive product and vendor information."""

    # Create marketplace table
    op.create_table(
        "marketplace",
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
        sa.Column("name", sa.String(255), nullable=False),  # Product name
        sa.Column(
            "title", sa.String(500), nullable=False
        ),  # Product title/display name
        sa.Column("price", sa.Numeric(10, 2), nullable=False),  # Product price
        sa.Column("category", sa.String(100), nullable=False),  # Main category
        sa.Column("location", sa.String(500), nullable=False),  # Location/address
        # 📍 Location Details
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("zip_code", sa.String(20), nullable=False),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        # 🖼️ Product Images
        sa.Column(
            "product_image", sa.String(2000), nullable=True
        ),  # Main product image
        sa.Column(
            "additional_images", ARRAY(sa.String), nullable=True
        ),  # Additional product images
        sa.Column("thumbnail", sa.String(2000), nullable=True),  # Thumbnail image
        # 📋 Product Details
        sa.Column("subcategory", sa.String(100), nullable=True),  # Subcategory
        sa.Column("description", sa.Text, nullable=True),  # Product description
        sa.Column(
            "original_price", sa.Numeric(10, 2), nullable=True
        ),  # Original price for sales
        sa.Column("currency", sa.String(10), default="USD", nullable=False),
        sa.Column("stock", sa.Integer, default=0, nullable=False),  # Stock quantity
        sa.Column("is_available", sa.Boolean, default=True, nullable=False),
        sa.Column("is_featured", sa.Boolean, default=False, nullable=False),
        sa.Column("is_on_sale", sa.Boolean, default=False, nullable=False),
        sa.Column(
            "discount_percentage", sa.Integer, nullable=True
        ),  # Discount percentage
        # 🏪 Vendor Information
        sa.Column("vendor_name", sa.String(255), nullable=False),  # Vendor/store name
        sa.Column("vendor_id", sa.String(100), nullable=True),  # Vendor identifier
        sa.Column("vendor_logo", sa.String(2000), nullable=True),  # Vendor logo
        sa.Column("vendor_address", sa.String(500), nullable=True),  # Vendor address
        sa.Column("vendor_phone", sa.String(50), nullable=True),  # Vendor phone
        sa.Column("vendor_email", sa.String(255), nullable=True),  # Vendor email
        sa.Column("vendor_website", sa.String(500), nullable=True),  # Vendor website
        sa.Column("vendor_rating", sa.Float, nullable=True),  # Vendor rating
        sa.Column("vendor_review_count", sa.Integer, default=0, nullable=False),
        sa.Column("vendor_is_verified", sa.Boolean, default=False, nullable=False),
        sa.Column("vendor_is_premium", sa.Boolean, default=False, nullable=False),
        # 🧼 Kosher Certification
        sa.Column(
            "kosher_agency", sa.String(100), nullable=True
        ),  # Kosher certification agency
        sa.Column(
            "kosher_level", sa.String(50), nullable=True
        ),  # Glatt, regular, chalav_yisrael, pas_yisrael
        sa.Column("kosher_certificate_number", sa.String(100), nullable=True),
        sa.Column("kosher_expiry_date", sa.Date, nullable=True),
        sa.Column("kosher_is_verified", sa.Boolean, default=False, nullable=False),
        # 🥗 Dietary Information
        sa.Column("is_gluten_free", sa.Boolean, default=False, nullable=False),
        sa.Column("is_dairy_free", sa.Boolean, default=False, nullable=False),
        sa.Column("is_nut_free", sa.Boolean, default=False, nullable=False),
        sa.Column("is_vegan", sa.Boolean, default=False, nullable=False),
        sa.Column("is_vegetarian", sa.Boolean, default=False, nullable=False),
        sa.Column("allergens", ARRAY(sa.String), nullable=True),  # Array of allergens
        # 🏷️ Product Metadata
        sa.Column("tags", ARRAY(sa.String), nullable=True),  # Product tags
        sa.Column("specifications", JSONB, nullable=True),  # Product specifications
        sa.Column("shipping_info", JSONB, nullable=True),  # Shipping information
        # ⭐ Ratings & Reviews
        sa.Column("rating", sa.Float, default=0.0, nullable=False),
        sa.Column("review_count", sa.Integer, default=0, nullable=False),
        # 📊 Business Logic
        sa.Column(
            "status", sa.String(20), default="active", nullable=False
        ),  # active, inactive, pending, sold_out
        sa.Column(
            "priority", sa.Integer, default=0, nullable=False
        ),  # For featured/sorting
        sa.Column("expiry_date", sa.Date, nullable=True),  # Product expiry date
        sa.Column(
            "created_by", sa.String(100), nullable=True
        ),  # Who created the listing
        sa.Column(
            "approved_by", sa.String(100), nullable=True
        ),  # Who approved the listing
        sa.Column("approved_at", sa.DateTime, nullable=True),  # When it was approved
        # 📝 Additional Information
        sa.Column("notes", sa.Text, nullable=True),  # Internal notes
        sa.Column("external_id", sa.String(100), nullable=True),  # External system ID
        sa.Column(
            "source", sa.String(50), default="manual", nullable=False
        ),  # manual, import, api
        # Check constraints
        sa.CheckConstraint("price >= 0", name="check_price_positive"),
        sa.CheckConstraint("stock >= 0", name="check_stock_positive"),
        sa.CheckConstraint("rating >= 0 AND rating <= 5", name="check_rating_range"),
        sa.CheckConstraint(
            "discount_percentage >= 0 AND discount_percentage <= 100",
            name="check_discount_range",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'pending', 'sold_out')",
            name="check_status_valid",
        ),
        sa.CheckConstraint(
            "kosher_level IN ('glatt', 'regular', 'chalav_yisrael', 'pas_yisrael')",
            name="check_kosher_level_valid",
        ),
        # Indexes for performance
        sa.Index("idx_marketplace_name", "name"),
        sa.Index("idx_marketplace_category", "category"),
        sa.Index("idx_marketplace_subcategory", "subcategory"),
        sa.Index("idx_marketplace_vendor_name", "vendor_name"),
        sa.Index("idx_marketplace_price", "price"),
        sa.Index("idx_marketplace_status", "status"),
        sa.Index("idx_marketplace_is_featured", "is_featured"),
        sa.Index("idx_marketplace_is_on_sale", "is_on_sale"),
        sa.Index("idx_marketplace_rating", "rating"),
        sa.Index("idx_marketplace_created_at", "created_at"),
        sa.Index("idx_marketplace_location", "city", "state"),
        sa.Index("idx_marketplace_kosher_agency", "kosher_agency"),
        sa.Index("idx_marketplace_kosher_level", "kosher_level"),
        sa.Index("idx_marketplace_vendor_id", "vendor_id"),
        sa.Index("idx_marketplace_external_id", "external_id"),
        # Full-text search index
        sa.Index(
            "idx_marketplace_search",
            "name",
            "title",
            "description",
            postgresql_using="gin",
        ),
    )

    # Add table and column comments
    op.execute(
        "COMMENT ON TABLE marketplace IS 'Marketplace product listings with kosher certification and vendor information'"
    )
    op.execute("COMMENT ON COLUMN marketplace.id IS 'Unique product identifier'")
    op.execute("COMMENT ON COLUMN marketplace.name IS 'Product name (required)'")
    op.execute(
        "COMMENT ON COLUMN marketplace.title IS 'Product title/display name (required)'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.price IS 'Product price in USD (required)'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.category IS 'Main product category (required)'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.location IS 'Product location/address (required)'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.product_image IS 'Main product image URL'"
    )
    op.execute("COMMENT ON COLUMN marketplace.subcategory IS 'Product subcategory'")
    op.execute("COMMENT ON COLUMN marketplace.description IS 'Product description'")
    op.execute(
        "COMMENT ON COLUMN marketplace.vendor_name IS 'Vendor/store name (required)'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.kosher_agency IS 'Kosher certification agency'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.kosher_level IS 'Kosher certification level'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.status IS 'Product status: active, inactive, pending, sold_out'"
    )
    op.execute("COMMENT ON COLUMN marketplace.rating IS 'Product rating from 0 to 5'")
    op.execute("COMMENT ON COLUMN marketplace.stock IS 'Available stock quantity'")
    op.execute(
        "COMMENT ON COLUMN marketplace.is_available IS 'Whether product is available for purchase'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.is_featured IS 'Whether product is featured'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.is_on_sale IS 'Whether product is on sale'"
    )
    op.execute(
        "COMMENT ON COLUMN marketplace.discount_percentage IS 'Discount percentage (0-100)'"
    )


def downgrade() -> None:
    """Drop marketplace table."""
    op.drop_table("marketplace")
