from alembic import op
import sqlalchemy as sa


def upgrade():
    """Create tables needed for Admin Dashboard metrics and Store Admin metrics.

    Tables:
    - admin_roles
    - admin_config
    - audit_logs
    - marketplace_orders
    - marketplace_messages
    - vendor_admins
    """
    # admin_roles
    op.create_table(
        "admin_roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=50), nullable=False, index=True),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("assigned_by", sa.String(length=50), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=False), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # admin_config (simple KV for admin UI/config)
    op.create_table(
        "admin_config",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
    )

    # audit_logs (general admin auditing)
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("user_id", sa.String(length=50), nullable=False, index=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=50), nullable=True),
        sa.Column("old_data", sa.Text(), nullable=True),
        sa.Column("new_data", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=False), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("ipAddress", sa.String(length=45), nullable=True),
        sa.Column("userAgent", sa.Text(), nullable=True),
        sa.Column("sessionId", sa.String(length=100), nullable=True),
        sa.Column("correlationId", sa.String(length=100), nullable=True),
        sa.Column("auditLevel", sa.String(length=20), server_default=sa.text("'info'"), nullable=False),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("deletedAt", sa.DateTime(timezone=False), nullable=True),
    )
    op.create_index("idx_audit_logs_user", "audit_logs", ["user_id"]) 
    op.create_index("idx_audit_logs_entity_type", "audit_logs", ["entity_type"]) 
    op.create_index("idx_audit_logs_entity", "audit_logs", ["entity_id"]) 
    op.create_index("idx_audit_logs_timestamp", "audit_logs", ["timestamp"]) 
    op.create_index("idx_audit_logs_level", "audit_logs", ["auditLevel"]) 
    op.create_index("idx_audit_logs_corr", "audit_logs", ["correlationId"]) 
    op.create_index("idx_audit_logs_deleted", "audit_logs", ["deletedAt"]) 

    # marketplace_orders
    op.create_table(
        "marketplace_orders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("vendor_id", sa.String(length=100), nullable=False, index=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),  # pending|paid|shipped|cancelled
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
    )
    op.create_index("idx_marketplace_order_vendor", "marketplace_orders", ["vendor_id"]) 
    op.create_index(
        "idx_marketplace_order_status_created",
        "marketplace_orders",
        ["status", "created_at"],
    )

    # marketplace_messages
    op.create_table(
        "marketplace_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("vendor_id", sa.String(length=100), nullable=False),
        sa.Column("sender_id", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),  # unread|read
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("body", sa.String(length=2000), nullable=True),
    )
    op.create_index(
        "idx_marketplace_message_vendor_status",
        "marketplace_messages",
        ["vendor_id", "status"],
    )
    op.create_index(
        "idx_marketplace_message_vendor_created",
        "marketplace_messages",
        ["vendor_id", "created_at"],
    )

    # vendor_admins mapping
    op.create_table(
        "vendor_admins",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("vendor_id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.String(length=50), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),  # owner|manager
        sa.Column("created_at", sa.DateTime(timezone=False), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("vendor_id", "user_id", name="uq_vendor_user"),
    )
    op.create_index("idx_vendor_admin_user", "vendor_admins", ["user_id"]) 


def downgrade():
    """Drop tables created in upgrade()."""
    op.drop_index("idx_vendor_admin_user", table_name="vendor_admins")
    op.drop_table("vendor_admins")

    op.drop_index("idx_marketplace_message_vendor_created", table_name="marketplace_messages")
    op.drop_index("idx_marketplace_message_vendor_status", table_name="marketplace_messages")
    op.drop_table("marketplace_messages")

    op.drop_index("idx_marketplace_order_status_created", table_name="marketplace_orders")
    op.drop_index("idx_marketplace_order_vendor", table_name="marketplace_orders")
    op.drop_table("marketplace_orders")

    op.drop_index("idx_audit_logs_deleted", table_name="audit_logs")
    op.drop_index("idx_audit_logs_corr", table_name="audit_logs")
    op.drop_index("idx_audit_logs_level", table_name="audit_logs")
    op.drop_index("idx_audit_logs_timestamp", table_name="audit_logs")
    op.drop_index("idx_audit_logs_entity", table_name="audit_logs")
    op.drop_index("idx_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("idx_audit_logs_user", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_table("admin_config")
    op.drop_table("admin_roles")

