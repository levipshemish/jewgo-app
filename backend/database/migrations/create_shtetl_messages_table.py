#!/usr/bin/env python3
"""Database Migration: Create Shtetl Messages Table.
===================================================
Creates a shtetl_messages table for Jewish community marketplace messaging.
This table stores communication between customers and store owners, including inquiries, support, and order-related messages.
"""

import uuid
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

# revision identifiers, used by Alembic.
revision = "create_shtetl_messages_table"
down_revision = "create_shtetl_orders_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create shtetl_messages table for Jewish community messaging."""

    # Create shtetl_messages table
    op.create_table(
        "shtetl_messages",
        # 🔒 System-Generated / Controlled
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("message_id", sa.String(100), unique=True, nullable=False),  # UUID for message
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
        
        # 👤 User Information
        sa.Column("sender_user_id", sa.String(100), nullable=False),  # Link to sender account
        sa.Column("sender_name", sa.String(255), nullable=False),
        sa.Column("sender_email", sa.String(255), nullable=False),
        sa.Column("sender_type", sa.String(20), nullable=False),  # customer, store_owner, admin
        
        sa.Column("recipient_user_id", sa.String(100), nullable=False),  # Link to recipient account
        sa.Column("recipient_name", sa.String(255), nullable=False),
        sa.Column("recipient_email", sa.String(255), nullable=False),
        sa.Column("recipient_type", sa.String(20), nullable=False),  # customer, store_owner, admin
        
        # 💬 Message Content
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("message_text", sa.Text, nullable=False),
        sa.Column("message_type", sa.String(50), nullable=False, default="general"),  # general, inquiry, support, order, kosher, etc.
        sa.Column("priority", sa.String(20), default="normal", nullable=False),  # low, normal, high, urgent
        
        # 🔗 Related Entities
        sa.Column("order_id", sa.String(100), nullable=True),  # Link to order if message is order-related
        sa.Column("product_id", sa.String(100), nullable=True),  # Link to product if message is product-related
        sa.Column("listing_id", sa.String(100), nullable=True),  # Link to marketplace listing
        
        # 📧 Message Status & Delivery
        sa.Column("message_status", sa.String(20), nullable=False, default="sent"),  # sent, delivered, read, replied, archived
        sa.Column("read_at", sa.DateTime, nullable=True),
        sa.Column("replied_at", sa.DateTime, nullable=True),
        sa.Column("archived_at", sa.DateTime, nullable=True),
        
        # 🔄 Threading & Conversation
        sa.Column("parent_message_id", sa.String(100), nullable=True),  # Link to parent message for threading
        sa.Column("thread_id", sa.String(100), nullable=True),  # Group messages in conversation
        sa.Column("is_reply", sa.Boolean, default=False, nullable=False),
        sa.Column("reply_count", sa.Integer, default=0, nullable=False),
        
        # 🍃 Kosher & Jewish Community Features
        sa.Column("kosher_related", sa.Boolean, default=False, nullable=False),
        sa.Column("kosher_question_type", sa.String(100), nullable=True),  # certification, ingredients, preparation, etc.
        sa.Column("hechsher_inquiry", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_related", sa.Boolean, default=False, nullable=False),
        sa.Column("holiday_related", sa.Boolean, default=False, nullable=False),
        sa.Column("community_question", sa.Boolean, default=False, nullable=False),
        
        # 📋 Categories & Tags
        sa.Column("category", sa.String(50), nullable=True),  # general, product, order, kosher, delivery, payment, etc.
        sa.Column("tags", ARRAY(sa.String), nullable=True),
        sa.Column("keywords", sa.String(500), nullable=True),
        
        # 📎 Attachments & Media
        sa.Column("has_attachments", sa.Boolean, default=False, nullable=False),
        sa.Column("attachment_urls", ARRAY(sa.String), nullable=True),
        sa.Column("attachment_types", ARRAY(sa.String), nullable=True),
        
        # 🔔 Notifications & Alerts
        sa.Column("email_sent", sa.Boolean, default=False, nullable=False),
        sa.Column("sms_sent", sa.Boolean, default=False, nullable=False),
        sa.Column("push_notification_sent", sa.Boolean, default=False, nullable=False),
        sa.Column("in_app_notification_sent", sa.Boolean, default=False, nullable=False),
        
        # ⏰ Timing & Scheduling
        sa.Column("scheduled_send_time", sa.DateTime, nullable=True),
        sa.Column("is_scheduled", sa.Boolean, default=False, nullable=False),
        sa.Column("timezone", sa.String(50), nullable=True),
        
        # 📊 Analytics & Tracking
        sa.Column("source", sa.String(50), nullable=True),  # web, mobile, email, phone, etc.
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("location_data", JSONB, nullable=True),
        
        # 🏷️ Internal Management
        sa.Column("is_internal", sa.Boolean, default=False, nullable=False),  # Internal admin messages
        sa.Column("is_automated", sa.Boolean, default=False, nullable=False),  # System-generated messages
        sa.Column("template_id", sa.String(100), nullable=True),  # Email template used
        sa.Column("campaign_id", sa.String(100), nullable=True),  # Marketing campaign
        
        # 📝 Notes & Metadata
        sa.Column("internal_notes", sa.Text, nullable=True),
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column("metadata", JSONB, nullable=True),  # Additional structured data
        
        # 🔒 Privacy & Security
        sa.Column("is_encrypted", sa.Boolean, default=False, nullable=False),
        sa.Column("encryption_key_id", sa.String(100), nullable=True),
        sa.Column("retention_policy", sa.String(50), nullable=True),  # short_term, long_term, permanent
        
        # 📅 Jewish Calendar Integration
        sa.Column("jewish_date", sa.String(50), nullable=True),  # Hebrew date
        sa.Column("holiday_aware", sa.Boolean, default=False, nullable=False),
        sa.Column("shabbos_aware", sa.Boolean, default=False, nullable=False),
        
        # 🔗 External Integrations
        sa.Column("external_message_id", sa.String(255), nullable=True),
        sa.Column("integration_data", JSONB, nullable=True),  # Data from external messaging systems
    )

    # Create indexes for performance
    op.create_index("idx_shtetl_messages_store_id", "shtetl_messages", ["store_id"])
    op.create_index("idx_shtetl_messages_sender_user_id", "shtetl_messages", ["sender_user_id"])
    op.create_index("idx_shtetl_messages_recipient_user_id", "shtetl_messages", ["recipient_user_id"])
    op.create_index("idx_shtetl_messages_message_id", "shtetl_messages", ["message_id"])
    op.create_index("idx_shtetl_messages_message_status", "shtetl_messages", ["message_status"])
    op.create_index("idx_shtetl_messages_created_at", "shtetl_messages", ["created_at"])
    op.create_index("idx_shtetl_messages_read_at", "shtetl_messages", ["read_at"])
    op.create_index("idx_shtetl_messages_thread_id", "shtetl_messages", ["thread_id"])
    op.create_index("idx_shtetl_messages_parent_message_id", "shtetl_messages", ["parent_message_id"])
    op.create_index("idx_shtetl_messages_order_id", "shtetl_messages", ["order_id"])
    op.create_index("idx_shtetl_messages_product_id", "shtetl_messages", ["product_id"])
    op.create_index("idx_shtetl_messages_message_type", "shtetl_messages", ["message_type"])
    op.create_index("idx_shtetl_messages_priority", "shtetl_messages", ["priority"])
    
    # Composite indexes for common queries
    op.create_index("idx_shtetl_messages_store_status", "shtetl_messages", ["store_id", "message_status"])
    op.create_index("idx_shtetl_messages_sender_status", "shtetl_messages", ["sender_user_id", "message_status"])
    op.create_index("idx_shtetl_messages_recipient_status", "shtetl_messages", ["recipient_user_id", "message_status"])
    op.create_index("idx_shtetl_messages_store_date", "shtetl_messages", ["store_id", "created_at"])
    op.create_index("idx_shtetl_messages_thread_date", "shtetl_messages", ["thread_id", "created_at"])
    op.create_index("idx_shtetl_messages_kosher_type", "shtetl_messages", ["kosher_related", "message_type"])

    # Create full-text search index
    op.execute("""
        CREATE INDEX idx_shtetl_messages_search_vector 
        ON shtetl_messages 
        USING gin(to_tsvector('english', 
            COALESCE(subject, '') || ' ' || 
            COALESCE(message_text, '') || ' ' || 
            COALESCE(sender_name, '') || ' ' || 
            COALESCE(recipient_name, '') || ' ' || 
            COALESCE(store_name, '') || ' ' || 
            COALESCE(keywords, '')
        ))
    """)


def downgrade() -> None:
    """Drop shtetl_messages table."""
    op.drop_index("idx_shtetl_messages_search_vector", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_kosher_type", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_thread_date", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_store_date", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_recipient_status", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_sender_status", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_store_status", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_priority", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_message_type", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_product_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_order_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_parent_message_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_thread_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_read_at", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_created_at", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_message_status", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_message_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_recipient_user_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_sender_user_id", "shtetl_messages")
    op.drop_index("idx_shtetl_messages_store_id", "shtetl_messages")
    op.drop_table("shtetl_messages")
