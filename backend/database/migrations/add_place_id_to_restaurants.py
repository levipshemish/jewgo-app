#!/usr/bin/env python3
"""
Migration: Add restaurants.place_id column (VARCHAR(255))

Purpose
- Align live schema with ORM model which references `restaurants.place_id`.
- Prevent ProgrammingError: column restaurants.place_id does not exist.

Up
- Add nullable column `place_id VARCHAR(255)` to `restaurants` if missing.

Down (Rollback)
- Drop column `place_id` if it exists.

Notes
- Uses DATABASE_URL from environment (no .env file reads).
- Safe to run multiple times; checks for column existence.
"""
import os
from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

logger = get_logger(__name__)


def _get_engine():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    # Normalize URL scheme if needed
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://")
        logger.info("Fixed database URL scheme to postgresql://")
    # Keep connect_args minimal for wide provider compatibility
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        connect_args={
            "connect_timeout": 15,
            "application_name": "jewgo-migration-add-place-id",
        },
    )
    return engine


def _column_exists(conn, table: str, column: str) -> bool:
    rs = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = :table AND column_name = :column
            LIMIT 1
            """
        ),
        {"table": table, "column": column},
    )
    return rs.fetchone() is not None


def upgrade() -> bool:
    """Apply migration: add restaurants.place_id if missing."""
    try:
        engine = _get_engine()
        with engine.begin() as conn:
            if _column_exists(conn, "restaurants", "place_id"):
                logger.info("Column already exists; skipping", table="restaurants", column="place_id")
                return True
            logger.info("Adding column", table="restaurants", column="place_id", type="VARCHAR(255)")
            conn.execute(text("ALTER TABLE restaurants ADD COLUMN place_id VARCHAR(255)"))
            logger.info("Column added successfully", table="restaurants", column="place_id")
        return True
    except Exception as e:
        logger.exception("Migration failed", error=str(e))
        return False


def downgrade() -> bool:
    """Rollback migration: drop restaurants.place_id if present."""
    try:
        engine = _get_engine()
        with engine.begin() as conn:
            if not _column_exists(conn, "restaurants", "place_id"):
                logger.info("Column not present; nothing to drop", table="restaurants", column="place_id")
                return True
            logger.info("Dropping column", table="restaurants", column="place_id")
            conn.execute(text("ALTER TABLE restaurants DROP COLUMN place_id"))
            logger.info("Column dropped", table="restaurants", column="place_id")
        return True
    except Exception as e:
        logger.exception("Rollback failed", error=str(e))
        return False


if __name__ == "__main__":
    ok = upgrade()
    raise SystemExit(0 if ok else 1)

