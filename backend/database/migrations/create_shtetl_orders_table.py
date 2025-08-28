#!/usr/bin/env python3
"""Database Migration: Create Shtetl Orders Table.
==================================================
Creates a shtetl_orders table for Jewish community marketplace order management.
This table stores order information, customer details, and order status for store transactions.
"""

import uuid
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

# revision identifiers, used by Alembic.
revision = "create_shtetl_orders_table"
down_revision = "create_shtetl_stores_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create shtetl_orders table for Jewish community order management."""

    # Create shtetl_orders table
    op.create_table(
        "shtetl_orders",
        # 🔒 System-Generated / Controlled
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.String(100), unique=True, nullable=False),  # UUID for order
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        
        # 🏪 Store Information
        sa.Column("store_id", sa.String(100), nullable=False),  # Link to store
        sa.Column("store_name", sa.String(255), nullable=False),
        
        # 👤 Customer Information
        sa.Column("customer_user_id", sa.String(100), nullable=False),  # Link to customer account
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=False),
        sa.Column("customer_phone", sa.String(50), nullable=True),
        
        # 📍 Delivery Information
        sa.Column("delivery_address", sa.String(500), nullable=True),
        sa.Column("delivery_city", sa.String(100), nullable=True),
        sa.Column("delivery_state", sa.String(50), nullable=True),
        sa.Column("delivery_zip_code", sa.String(20), nullable=True),
        sa.Column("delivery_instructions", sa.Text, nullable=True),
        
        # 🛒 Order Details
        sa.Column("order_items", JSONB, nullable=False),  # JSON array of order items
        sa.Column("subtotal", sa.Float, nullable=False, default=0.0),
        sa.Column("tax_amount", sa.Float, nullable=False, default=0.0),
        sa.Column("delivery_fee", sa.Float, nullable=False, default=0.0),
        sa.Column("discount_amount", sa.Float, nullable=False, default=0.0),
        sa.Column("total_amount", sa.Float, nullable=False, default=0.0),
        
        # 💳 Payment Information
        sa.Column("payment_method", sa.String(50), nullable=True),  # credit_card, paypal, etc.
        sa.Column("payment_status", sa.String(20), nullable=False, default="pending"),  # pending, paid, failed, refunded
        sa.Column("payment_transaction_id", sa.String(255), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        
        # 📦 Order Status & Fulfillment
        sa.Column("order_status", sa.String(20), nullable=False, default="pending"),  # pending, confirmed, processing, shipped, delivered, cancelled
        sa.Column("fulfillment_method", sa.String(20), nullable=False, default="pickup"),  # pickup, delivery, shipping
        sa.Column("estimated_delivery_date", sa.DateTime, nullable=True),
        sa.Column("actual_delivery_date", sa.DateTime, nullable=True),
        sa.Column("tracking_number", sa.String(255), nullable=True),
        sa.Column("carrier", sa.String(100), nullable=True),
        
        # 🕒 Scheduling & Timing
        sa.Column("preferred_delivery_date", sa.DateTime, nullable=True),
        sa.Column("preferred_delivery_time", sa.String(50), nullable=True),  # morning, afternoon, evening
        sa.Column("is_urgent", sa.Boolean, default=False, nullable=False),
        sa.Column("is_scheduled", sa.Boolean, default=False, nullable=False),
        
        # 🍃 Kosher & Jewish Community Features
        sa.Column("kosher_certification_required", sa.Boolean, default=False, nullable=False),
        sa.Column("kosher_agency_preference", sa.String(100), nullable=True),
        sa.Column("is_cholov_yisroel", sa.Boolean, default=False, nullable=False),
        sa.Column("is_pas_yisroel", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_delivery", sa.Boolean, default=False, nullable=False),
        sa.Column("holiday_delivery", sa.Boolean, default=False, nullable=False),
        sa.Column("special_instructions", sa.Text, nullable=True),  # Kosher instructions, etc.
        
        # 📝 Notes & Communication
        sa.Column("customer_notes", sa.Text, nullable=True),
        sa.Column("store_notes", sa.Text, nullable=True),
        sa.Column("internal_notes", sa.Text, nullable=True),
        
        # ⭐ Reviews & Feedback
        sa.Column("customer_rating", sa.Integer, nullable=True),  # 1-5 stars
        sa.Column("customer_review", sa.Text, nullable=True),
        sa.Column("review_date", sa.DateTime, nullable=True),
        sa.Column("store_response", sa.Text, nullable=True),
        
        # 🔄 Returns & Refunds
        sa.Column("return_requested", sa.Boolean, default=False, nullable=False),
        sa.Column("return_reason", sa.String(255), nullable=True),
        sa.Column("return_date", sa.DateTime, nullable=True),
        sa.Column("refund_amount", sa.Float, nullable=True),
        sa.Column("refund_status", sa.String(20), nullable=True),  # pending, processed, completed
        
        # 📊 Analytics & Tracking
        sa.Column("source", sa.String(50), nullable=True),  # web, mobile, phone, etc.
        sa.Column("referral_code", sa.String(100), nullable=True),
        sa.Column("campaign_id", sa.String(100), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(100), nullable=True),
        
        # 🔔 Notifications
        sa.Column("email_sent", sa.Boolean, default=False, nullable=False),
        sa.Column("sms_sent", sa.Boolean, default=False, nullable=False),
        sa.Column("push_notification_sent", sa.Boolean, default=False, nullable=False),
        
        # 🏷️ Tags & Categories
        sa.Column("tags", ARRAY(sa.String), nullable=True),
        sa.Column("order_type", sa.String(50), nullable=True),  # regular, bulk, wholesale, gift
        sa.Column("priority", sa.String(20), default="normal", nullable=False),  # low, normal, high, urgent
        
        # 📅 Jewish Calendar Integration
        sa.Column("jewish_date", sa.String(50), nullable=True),  # Hebrew date
        sa.Column("holiday_aware", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_aware", sa.Boolean, default=False, nullable=False),
        
        # 🔗 External Integrations
        sa.Column("external_order_id", sa.String(255), nullable=True),
        sa.Column("integration_data", JSONB, nullable=True),  # Data from external systems
    )

    # Create indexes for performance
    op.create_index("idx_shtetl_orders_store_id", "shtetl_orders", ["store_id"])
    op.create_index("idx_shtetl_orders_customer_user_id", "shtetl_orders", ["customer_user_id"])
    op.create_index("idx_shtetl_orders_order_id", "shtetl_orders", ["order_id"])
    op.create_index("idx_shtetl_orders_order_status", "shtetl_orders", ["order_status"])
    op.create_index("idx_shtetl_orders_payment_status", "shtetl_orders", ["payment_status"])
    op.create_index("idx_shtetl_orders_created_at", "shtetl_orders", ["created_at"])
    op.create_index("idx_shtetl_orders_delivery_date", "shtetl_orders", ["estimated_delivery_date"])
    op.create_index("idx_shtetl_orders_total_amount", "shtetl_orders", ["total_amount"])
    
    # Composite indexes for common queries
    op.create_index("idx_shtetl_orders_store_status", "shtetl_orders", ["store_id", "order_status"])
    op.create_index("idx_shtetl_orders_customer_status", "shtetl_orders", ["customer_user_id", "order_status"])
    op.create_index("idx_shtetl_orders_store_date", "shtetl_orders", ["store_id", "created_at"])
    op.create_index("idx_shtetl_orders_payment_date", "shtetl_orders", ["payment_status", "created_at"])

    # Create full-text search index
    op.execute("""
        CREATE INDEX idx_shtetl_orders_search_vector 
        ON shtetl_orders 
        USING gin(to_tsvector('english', 
            COALESCE(order_id, '') || ' ' || 
            COALESCE(customer_name, '') || ' ' || 
            COALESCE(customer_email, '') || ' ' || 
            COALESCE(store_name, '') || ' ' || 
            COALESCE(delivery_city, '') || ' ' || 
            COALESCE(tracking_number, '')
        ))
    """)


def downgrade() -> None:
    """Drop shtetl_orders table."""
    op.drop_index("idx_shtetl_orders_search_vector", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_payment_date", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_store_date", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_customer_status", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_store_status", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_total_amount", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_delivery_date", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_created_at", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_payment_status", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_order_status", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_order_id", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_customer_user_id", "shtetl_orders")
    op.drop_index("idx_shtetl_orders_store_id", "shtetl_orders")
    op.drop_table("shtetl_orders")
