#!/usr/bin/env python3
"""Database Migration: Create Orders Tables.
========================================
Creates the orders and order_items tables for storing customer orders and order details.
"""

import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "create_orders_tables"
down_revision = "create_reviews_tables"
branch_labels = None
depends_on = None


def generate_order_number() -> str:
    """Generate a unique order number."""
    return f"ORD-{uuid.uuid4().hex[:8].upper()}"


def upgrade() -> None:
    """Create orders and order_items tables."""
    # Create orders table
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column("order_number", sa.String(50), unique=True, nullable=False),
        sa.Column("restaurant_id", sa.Integer, nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_phone", sa.String(50), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=False),
        sa.Column("delivery_address", sa.Text, nullable=True),
        sa.Column("delivery_instructions", sa.Text, nullable=True),
        sa.Column("order_type", sa.String(20), nullable=False),  # 'pickup' or 'delivery'
        sa.Column("payment_method", sa.String(20), nullable=False),  # 'cash', 'card', 'online'
        sa.Column("estimated_time", sa.String(100), nullable=True),
        sa.Column("subtotal", sa.Float, nullable=False, default=0.0),
        sa.Column("tax", sa.Float, nullable=False, default=0.0),
        sa.Column("delivery_fee", sa.Float, nullable=False, default=0.0),
        sa.Column("total", sa.Float, nullable=False, default=0.0),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        # Foreign key to restaurants table
        sa.ForeignKeyConstraint(
            ["restaurant_id"],
            ["restaurants.id"],
            ondelete="CASCADE",
        ),
        # Check constraints
        sa.CheckConstraint(
            "order_type IN ('pickup', 'delivery')", 
            name="check_order_type"
        ),
        sa.CheckConstraint(
            "payment_method IN ('cash', 'card', 'online')", 
            name="check_payment_method"
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')", 
            name="check_order_status"
        ),
        sa.CheckConstraint("subtotal >= 0", name="check_subtotal_positive"),
        sa.CheckConstraint("tax >= 0", name="check_tax_positive"),
        sa.CheckConstraint("delivery_fee >= 0", name="check_delivery_fee_positive"),
        sa.CheckConstraint("total >= 0", name="check_total_positive"),
        # Indexes for performance
        sa.Index("idx_orders_restaurant_id", "restaurant_id"),
        sa.Index("idx_orders_order_number", "order_number"),
        sa.Index("idx_orders_customer_email", "customer_email"),
        sa.Index("idx_orders_status", "status"),
        sa.Index("idx_orders_created_at", "created_at"),
    )

    # Create order_items table
    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("created_at", sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column("order_id", sa.Integer, nullable=False),
        sa.Column("item_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("price", sa.Float, nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False, default=1),
        sa.Column("special_instructions", sa.Text, nullable=True),
        sa.Column("subtotal", sa.Float, nullable=False),
        # Foreign key to orders table
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="CASCADE",
        ),
        # Check constraints
        sa.CheckConstraint("price >= 0", name="check_item_price_positive"),
        sa.CheckConstraint("quantity > 0", name="check_item_quantity_positive"),
        sa.CheckConstraint("subtotal >= 0", name="check_item_subtotal_positive"),
        # Indexes for performance
        sa.Index("idx_order_items_order_id", "order_id"),
        sa.Index("idx_order_items_item_id", "item_id"),
    )

    # Add comments
    op.execute("COMMENT ON TABLE orders IS 'Customer orders placed through JewGo platform'")
    op.execute("COMMENT ON COLUMN orders.id IS 'Unique order identifier'")
    op.execute("COMMENT ON COLUMN orders.order_number IS 'Human-readable order number'")
    op.execute("COMMENT ON COLUMN orders.restaurant_id IS 'Associated restaurant ID'")
    op.execute("COMMENT ON COLUMN orders.customer_name IS 'Customer name'")
    op.execute("COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number'")
    op.execute("COMMENT ON COLUMN orders.customer_email IS 'Customer email address'")
    op.execute("COMMENT ON COLUMN orders.delivery_address IS 'Delivery address (optional for pickup)'")
    op.execute("COMMENT ON COLUMN orders.delivery_instructions IS 'Special delivery instructions'")
    op.execute("COMMENT ON COLUMN orders.order_type IS 'Order type: pickup or delivery'")
    op.execute("COMMENT ON COLUMN orders.payment_method IS 'Payment method: cash, card, or online'")
    op.execute("COMMENT ON COLUMN orders.estimated_time IS 'Estimated pickup/delivery time'")
    op.execute("COMMENT ON COLUMN orders.subtotal IS 'Order subtotal before tax and fees'")
    op.execute("COMMENT ON COLUMN orders.tax IS 'Tax amount'")
    op.execute("COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee (if applicable)'")
    op.execute("COMMENT ON COLUMN orders.total IS 'Total order amount'")
    op.execute("COMMENT ON COLUMN orders.status IS 'Order status: pending, confirmed, preparing, ready, delivered, cancelled'")

    op.execute("COMMENT ON TABLE order_items IS 'Individual items in customer orders'")
    op.execute("COMMENT ON COLUMN order_items.id IS 'Unique order item identifier'")
    op.execute("COMMENT ON COLUMN order_items.order_id IS 'Associated order ID'")
    op.execute("COMMENT ON COLUMN order_items.item_id IS 'Menu item identifier'")
    op.execute("COMMENT ON COLUMN order_items.name IS 'Menu item name'")
    op.execute("COMMENT ON COLUMN order_items.price IS 'Unit price of the item'")
    op.execute("COMMENT ON COLUMN order_items.quantity IS 'Quantity ordered'")
    op.execute("COMMENT ON COLUMN order_items.special_instructions IS 'Special instructions for this item'")
    op.execute("COMMENT ON COLUMN order_items.subtotal IS 'Item subtotal (price * quantity)'")


def downgrade() -> None:
    """Drop orders and order_items tables."""
    op.drop_table("order_items")
    op.drop_table("orders")
