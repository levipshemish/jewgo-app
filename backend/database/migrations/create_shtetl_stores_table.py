#!/usr/bin/env python3
"""Database Migration: Create Shtetl Stores Table.
==================================================
Creates a shtetl_stores table for Jewish community marketplace store management.
This table stores store information, settings, and metadata for store owners.
"""

import uuid
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

# revision identifiers, used by Alembic.
revision = "create_shtetl_stores_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create shtetl_stores table for Jewish community store management."""

    # Create shtetl_stores table
    op.create_table(
        "shtetl_stores",
        # 🔒 System-Generated / Controlled
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("store_id", sa.String(100), unique=True, nullable=False),  # UUID for store
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        
        # 👤 Store Owner Information
        sa.Column("owner_user_id", sa.String(100), nullable=False),  # Link to user account
        sa.Column("owner_name", sa.String(255), nullable=False),
        sa.Column("owner_email", sa.String(255), nullable=False),
        sa.Column("owner_phone", sa.String(50), nullable=True),
        
        # 🏪 Store Basic Information
        sa.Column("store_name", sa.String(255), nullable=False),
        sa.Column("store_description", sa.Text, nullable=True),
        sa.Column("store_type", sa.String(100), nullable=False),  # grocery, clothing, electronics, etc.
        sa.Column("store_category", sa.String(100), nullable=False),  # kosher, general, specialty, etc.
        sa.Column("subcategory", sa.String(100), nullable=True),
        
        # 📍 Location Details
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("zip_code", sa.String(20), nullable=True),
        sa.Column("country", sa.String(50), default="USA", nullable=False),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        
        # 📞 Contact Information
        sa.Column("phone_number", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        
        # 🕒 Business Hours
        sa.Column("business_hours", sa.Text, nullable=True),
        sa.Column("hours_parsed", sa.Boolean, default=False, nullable=False),
        sa.Column("timezone", sa.String(50), nullable=True),
        
        # 🚚 Delivery Settings
        sa.Column("delivery_enabled", sa.Boolean, default=False, nullable=False),
        sa.Column("delivery_radius_miles", sa.Float, default=10.0, nullable=False),
        sa.Column("delivery_fee", sa.Float, default=0.0, nullable=False),
        sa.Column("delivery_minimum", sa.Float, default=0.0, nullable=False),
        sa.Column("pickup_enabled", sa.Boolean, default=True, nullable=False),
        
        # 🍃 Kosher & Jewish Community Features
        sa.Column("kosher_certification", sa.String(255), nullable=True),
        sa.Column("kosher_agency", sa.String(100), nullable=True),
        sa.Column("kosher_level", sa.String(50), nullable=True),
        sa.Column("is_cholov_yisroel", sa.Boolean, default=False, nullable=False),
        sa.Column("is_pas_yisroel", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_orders", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_delivery", sa.Boolean, default=False, nullable=False),
        
        # 🎨 Store Customization
        sa.Column("logo_url", sa.String(2000), nullable=True),
        sa.Column("banner_url", sa.String(2000), nullable=True),
        sa.Column("color_scheme", sa.String(50), default="blue", nullable=False),
        sa.Column("custom_domain", sa.String(255), nullable=True),
        
        # 💳 Payment & Billing
        sa.Column("plan_type", sa.String(20), default="free", nullable=False),  # free, basic, premium
        sa.Column("plan_start_date", sa.DateTime, nullable=True),
        sa.Column("plan_end_date", sa.DateTime, nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        
        # 📊 Store Statistics
        sa.Column("total_products", sa.Integer, default=0, nullable=False),
        sa.Column("total_orders", sa.Integer, default=0, nullable=False),
        sa.Column("total_revenue", sa.Float, default=0.0, nullable=False),
        sa.Column("total_customers", sa.Integer, default=0, nullable=False),
        sa.Column("average_rating", sa.Float, default=0.0, nullable=False),
        sa.Column("review_count", sa.Integer, default=0, nullable=False),
        
        # 🔍 Search and Discovery
        sa.Column("search_vector", sa.Text, nullable=True),  # Full-text search
        sa.Column("tags", ARRAY(sa.String), nullable=True),
        sa.Column("keywords", sa.String(500), nullable=True),
        
        # 📈 Store Status & Approval
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("is_approved", sa.Boolean, default=False, nullable=False),
        sa.Column("approval_date", sa.DateTime, nullable=True),
        sa.Column("approved_by", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), default="pending", nullable=False),  # pending, active, suspended, closed
        
        # 🔒 Security & Verification
        sa.Column("is_verified", sa.Boolean, default=False, nullable=False),
        sa.Column("verification_date", sa.DateTime, nullable=True),
        sa.Column("verification_method", sa.String(50), nullable=True),
        sa.Column("business_license", sa.String(255), nullable=True),
        sa.Column("tax_id", sa.String(100), nullable=True),
        
        # 📝 Admin & Notes
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column("internal_notes", sa.Text, nullable=True),
        sa.Column("featured_store", sa.Boolean, default=False, nullable=False),
        sa.Column("featured_until", sa.DateTime, nullable=True),
        
        # 🎯 Marketing & SEO
        sa.Column("meta_title", sa.String(255), nullable=True),
        sa.Column("meta_description", sa.Text, nullable=True),
        sa.Column("social_media", JSONB, nullable=True),  # JSON object for social media links
        sa.Column("seo_keywords", ARRAY(sa.String), nullable=True),
        
        # 📊 Analytics & Tracking
        sa.Column("google_analytics_id", sa.String(100), nullable=True),
        sa.Column("facebook_pixel_id", sa.String(100), nullable=True),
        sa.Column("last_activity", sa.DateTime, nullable=True),
        sa.Column("last_order_date", sa.DateTime, nullable=True),
        
        # 🔄 Integration Settings
        sa.Column("integrations", JSONB, nullable=True),  # JSON object for third-party integrations
        sa.Column("webhook_url", sa.String(500), nullable=True),
        sa.Column("api_key", sa.String(255), nullable=True),
        
        # 📋 Store Policies
        sa.Column("return_policy", sa.Text, nullable=True),
        sa.Column("shipping_policy", sa.Text, nullable=True),
        sa.Column("privacy_policy", sa.Text, nullable=True),
        sa.Column("terms_of_service", sa.Text, nullable=True),
        
        # 🎁 Special Features
        sa.Column("gift_cards_enabled", sa.Boolean, default=False, nullable=False),
        sa.Column("loyalty_program", sa.Boolean, default=False, nullable=False),
        sa.Column("bulk_orders", sa.Boolean, default=False, nullable=False),
        sa.Column("wholesale_enabled", sa.Boolean, default=False, nullable=False),
        
        # 📱 Mobile & App Settings
        sa.Column("mobile_optimized", sa.Boolean, default=True, nullable=False),
        sa.Column("push_notifications", sa.Boolean, default=True, nullable=False),
        sa.Column("sms_notifications", sa.Boolean, default=False, nullable=False),
        
        # 🔔 Notification Settings
        sa.Column("email_notifications", sa.Boolean, default=True, nullable=False),
        sa.Column("order_notifications", sa.Boolean, default=True, nullable=False),
        sa.Column("inventory_alerts", sa.Boolean, default=True, nullable=False),
        sa.Column("review_notifications", sa.Boolean, default=True, nullable=False),
        
        # 📊 Performance Metrics
        sa.Column("page_views", sa.Integer, default=0, nullable=False),
        sa.Column("unique_visitors", sa.Integer, default=0, nullable=False),
        sa.Column("conversion_rate", sa.Float, default=0.0, nullable=False),
        sa.Column("average_order_value", sa.Float, default=0.0, nullable=False),
        
        # 🏆 Awards & Recognition
        sa.Column("awards", ARRAY(sa.String), nullable=True),
        sa.Column("certifications", ARRAY(sa.String), nullable=True),
        sa.Column("community_verified", sa.Boolean, default=False, nullable=False),
        sa.Column("rabbi_endorsed", sa.Boolean, default=False, nullable=False),
        
        # 📅 Jewish Calendar Integration
        sa.Column("jewish_holiday_hours", JSONB, nullable=True),  # Special hours for Jewish holidays
        sa.Column("shabbos_hours", sa.Text, nullable=True),
        sa.Column("holiday_closures", ARRAY(sa.String), nullable=True),
        
        # 🔗 Community Connections
        sa.Column("synagogue_affiliations", ARRAY(sa.String), nullable=True),
        sa.Column("community_organizations", ARRAY(sa.String), nullable=True),
        sa.Column("charity_partnerships", ARRAY(sa.String), nullable=True),
        
        # 📍 Location Services
        sa.Column("distance_miles", sa.Float, nullable=True),
        sa.Column("delivery_zones", JSONB, nullable=True),  # JSON array of delivery zones
        sa.Column("pickup_locations", JSONB, nullable=True),  # JSON array of pickup locations
    )

    # Create indexes for performance
    op.create_index("idx_shtetl_stores_owner_user_id", "shtetl_stores", ["owner_user_id"])
    op.create_index("idx_shtetl_stores_store_id", "shtetl_stores", ["store_id"])
    op.create_index("idx_shtetl_stores_city", "shtetl_stores", ["city"])
    op.create_index("idx_shtetl_stores_state", "shtetl_stores", ["state"])
    op.create_index("idx_shtetl_stores_store_type", "shtetl_stores", ["store_type"])
    op.create_index("idx_shtetl_stores_store_category", "shtetl_stores", ["store_category"])
    op.create_index("idx_shtetl_stores_plan_type", "shtetl_stores", ["plan_type"])
    op.create_index("idx_shtetl_stores_is_active", "shtetl_stores", ["is_active"])
    op.create_index("idx_shtetl_stores_is_approved", "shtetl_stores", ["is_approved"])
    op.create_index("idx_shtetl_stores_status", "shtetl_stores", ["status"])
    op.create_index("idx_shtetl_stores_kosher_agency", "shtetl_stores", ["kosher_agency"])
    op.create_index("idx_shtetl_stores_latitude", "shtetl_stores", ["latitude"])
    op.create_index("idx_shtetl_stores_longitude", "shtetl_stores", ["longitude"])
    op.create_index("idx_shtetl_stores_rating", "shtetl_stores", ["average_rating"])
    op.create_index("idx_shtetl_stores_created_at", "shtetl_stores", ["created_at"])
    op.create_index("idx_shtetl_stores_updated_at", "shtetl_stores", ["updated_at"])
    
    # Composite indexes for common queries
    op.create_index("idx_shtetl_stores_city_store_type", "shtetl_stores", ["city", "store_type"])
    op.create_index("idx_shtetl_stores_city_kosher", "shtetl_stores", ["city", "kosher_agency"])
    op.create_index("idx_shtetl_stores_active_approved", "shtetl_stores", ["is_active", "is_approved"])
    op.create_index("idx_shtetl_stores_plan_active", "shtetl_stores", ["plan_type", "is_active"])

    # Create full-text search index
    op.execute("""
        CREATE INDEX idx_shtetl_stores_search_vector 
        ON shtetl_stores 
        USING gin(to_tsvector('english', 
            COALESCE(store_name, '') || ' ' || 
            COALESCE(store_description, '') || ' ' || 
            COALESCE(city, '') || ' ' || 
            COALESCE(store_type, '') || ' ' || 
            COALESCE(store_category, '')
        ))
    """)


def downgrade() -> None:
    """Drop shtetl_stores table."""
    op.drop_index("idx_shtetl_stores_search_vector", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_plan_active", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_active_approved", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_city_kosher", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_city_store_type", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_updated_at", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_created_at", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_rating", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_longitude", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_latitude", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_kosher_agency", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_status", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_is_approved", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_is_active", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_plan_type", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_store_category", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_store_type", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_state", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_city", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_store_id", "shtetl_stores")
    op.drop_index("idx_shtetl_stores_owner_user_id", "shtetl_stores")
    op.drop_table("shtetl_stores")
