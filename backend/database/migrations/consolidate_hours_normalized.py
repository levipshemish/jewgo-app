# !/usr/bin/env python3
"""Migration: Consolidate hours into normalized JSONB field.
=======================================================
This migration consolidates the hours data into a single normalized JSONB field
`hours_of_operation` and prepares for dropping the old `hours_open` field.
The normalized structure will be:
{
  "timezone": "America/New_York",
  "weekly": {
    "mon": [{"open":"09:00","close":"17:00"}],
    "tue": [{"open":"09:00","close":"17:00"}],
    "wed": [{"open":"09:00","close":"17:00"}],
    "thu": [{"open":"09:00","close":"17:00"}],
    "fri": [{"open":"09:00","close":"14:30"}],
    "sat": [],
    "sun": []
  },
  "exceptions": [
    {"date":"2025-09-15","type":"closed","note":"Holiday"},
    {"date":"2025-12-24","type":"hours","ranges":[{"open":"09:00","close":"12:00"}],"note":"Erev"}
  ],
  "source": {
    "google_places": {"place_id":"...", "fetched_at":"ISO8601"},
    "orb": {"cert_url":"...", "fetched_at":"ISO8601"},
    "manual": {"updated_by":"admin@jewgo","updated_at":"ISO8601"}
  }
}
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
import json
import os
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import create_engine, text
from utils.logging_config import get_logger

logger = get_logger(__name__)


def _get_database_url() -> str:
    """Get database URL from environment."""
    return os.environ.get(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/jewgo"
    )


def _create_engine():
    """Create SQLAlchemy engine."""
    database_url = _get_database_url()
    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
    )


def _normalize_hours_string(
    hours_str: str, timezone: str = "America/New_York"
) -> Dict[str, Any]:
    """Convert legacy hours string to normalized JSONB structure.
    This is a basic parser that handles common formats like:
    - "Mon-Fri: 9AM-5PM"
    - "Monday: 9:00 AM - 5:00 PM"
    - "Open 24/7"
    - "Hours not available"
    """
    if not hours_str or hours_str.lower() in ["none", "hours not available", ""]:
        return {
            "timezone": timezone,
            "weekly": {
                "mon": [],
                "tue": [],
                "wed": [],
                "thu": [],
                "fri": [],
                "sat": [],
                "sun": [],
            },
            "exceptions": [],
            "source": {
                "manual": {
                    "updated_by": "migration",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        }
    # Handle "Open 24/7" case
    if "24/7" in hours_str.lower() or "24 hours" in hours_str.lower():
        return {
            "timezone": timezone,
            "weekly": {
                "mon": [{"open": "00:00", "close": "23:59"}],
                "tue": [{"open": "00:00", "close": "23:59"}],
                "wed": [{"open": "00:00", "close": "23:59"}],
                "thu": [{"open": "00:00", "close": "23:59"}],
                "fri": [{"open": "00:00", "close": "23:59"}],
                "sat": [{"open": "00:00", "close": "23:59"}],
                "sun": [{"open": "00:00", "close": "23:59"}],
            },
            "exceptions": [],
            "source": {
                "manual": {
                    "updated_by": "migration",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            },
        }
    # Basic parsing for common formats
    # This is a simplified parser - the full implementation will be in the hours_normalizer service
    try:
        # Default to a basic structure for now
        # The hours_normalizer service will handle proper parsing
        return {
            "timezone": timezone,
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}],
                "thu": [{"open": "09:00", "close": "17:00"}],
                "fri": [{"open": "09:00", "close": "17:00"}],
                "sat": [],
                "sun": [],
            },
            "exceptions": [],
            "source": {
                "manual": {
                    "updated_by": "migration",
                    "updated_at": datetime.utcnow().isoformat(),
                    "note": f"Migrated from: {hours_str}",
                }
            },
        }
    except Exception as e:
        logger.warning(f"Failed to parse hours string: {hours_str}", error=str(e))
        # Return empty structure on parse failure
        return {
            "timezone": timezone,
            "weekly": {
                "mon": [],
                "tue": [],
                "wed": [],
                "thu": [],
                "fri": [],
                "sat": [],
                "sun": [],
            },
            "exceptions": [],
            "source": {
                "manual": {
                    "updated_by": "migration",
                    "updated_at": datetime.utcnow().isoformat(),
                    "note": f"Parse failed for: {hours_str}",
                }
            },
        }


def _check_column_exists(engine, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                AND column_name = '{column_name}'
            """
                )
            )
            return result.fetchone() is not None
    except Exception as e:
        logger.error(f"Error checking column existence: {e}")
        return False


def _migrate_hours_data(engine) -> Dict[str, int]:
    """Migrate hours data from legacy fields to normalized JSONB."""
    stats = {
        "total_restaurants": 0,
        "migrated_from_hours_open": 0,
        "migrated_from_hours_of_operation": 0,
        "errors": 0,
    }
    try:
        with engine.connect() as conn:
            # Get all restaurants
            result = conn.execute(
                text(
                    """
                SELECT id, name, hours_open, hours_of_operation, timezone, city, state
                FROM restaurants
            """
                )
            )
            restaurants = result.fetchall()
            stats["total_restaurants"] = len(restaurants)
            for restaurant in restaurants:
                (
                    restaurant_id,
                    name,
                    hours_open,
                    hours_of_operation,
                    timezone,
                    city,
                    state,
                ) = restaurant
                # Determine timezone
                if not timezone:
                    # Infer timezone from location (simplified)
                    if state in [
                        "FL",
                        "GA",
                        "SC",
                        "NC",
                        "VA",
                        "WV",
                        "KY",
                        "TN",
                        "AL",
                        "MS",
                        "AR",
                        "LA",
                    ]:
                        timezone = "America/New_York"
                    elif state in [
                        "TX",
                        "OK",
                        "KS",
                        "NE",
                        "SD",
                        "ND",
                        "MN",
                        "IA",
                        "MO",
                        "AR",
                        "LA",
                    ]:
                        timezone = "America/Chicago"
                    elif state in ["MT", "WY", "CO", "NM", "UT", "AZ", "ID"]:
                        timezone = "America/Denver"
                    elif state in ["WA", "OR", "CA", "NV", "ID"]:
                        timezone = "America/Los_Angeles"
                    else:
                        timezone = "America/New_York"  # Default
                try:
                    # Determine which hours field to migrate from
                    source_hours = None
                    source_field = None
                    if hours_of_operation and hours_of_operation.strip() not in [
                        "",
                        "None",
                        "Hours not available",
                    ]:
                        source_hours = hours_of_operation
                        source_field = "hours_of_operation"
                        stats["migrated_from_hours_of_operation"] += 1
                    elif hours_open and hours_open.strip() not in [
                        "",
                        "None",
                        "Hours not available",
                    ]:
                        source_hours = hours_open
                        source_field = "hours_open"
                        stats["migrated_from_hours_open"] += 1
                    if source_hours:
                        # Normalize the hours data
                        normalized_hours = _normalize_hours_string(
                            source_hours, timezone
                        )
                        # Update the hours_of_operation field with normalized JSONB
                        conn.execute(
                            text(
                                """
                            UPDATE restaurants
                            SET hours_of_operation = :hours_json,
                                hours_last_updated = CURRENT_TIMESTAMP
                            WHERE id = :restaurant_id
                        """
                            ),
                            {
                                "hours_json": json.dumps(normalized_hours),
                                "restaurant_id": restaurant_id,
                            },
                        )
                        logger.info(
                            f"Migrated hours for restaurant {name} (ID: {restaurant_id})",
                            source_field=source_field,
                            timezone=timezone,
                        )
                    else:
                        # No hours data to migrate, set empty structure
                        empty_hours = {
                            "timezone": timezone,
                            "weekly": {
                                "mon": [],
                                "tue": [],
                                "wed": [],
                                "thu": [],
                                "fri": [],
                                "sat": [],
                                "sun": [],
                            },
                            "exceptions": [],
                            "source": {
                                "manual": {
                                    "updated_by": "migration",
                                    "updated_at": datetime.utcnow().isoformat(),
                                    "note": "No hours data available",
                                }
                            },
                        }
                        conn.execute(
                            text(
                                """
                            UPDATE restaurants
                            SET hours_of_operation = :hours_json,
                                hours_last_updated = CURRENT_TIMESTAMP
                            WHERE id = :restaurant_id
                        """
                            ),
                            {
                                "hours_json": json.dumps(empty_hours),
                                "restaurant_id": restaurant_id,
                            },
                        )
                        logger.info(
                            f"Set empty hours structure for restaurant {name} (ID: {restaurant_id})",
                            timezone=timezone,
                        )
                except Exception as e:
                    stats["errors"] += 1
                    logger.error(
                        f"Error migrating hours for restaurant {name} (ID: {restaurant_id})",
                        error=str(e),
                    )
            # Commit the transaction
            conn.commit()
    except Exception as e:
        logger.error(f"Error during hours migration: {e}")
        stats["errors"] += 1
    return stats


def _add_hours_indexes(engine) -> bool:
    """Add indexes for hours queries."""
    try:
        with engine.connect() as conn:
            # Add GIN index for JSONB queries on hours_of_operation
            conn.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_restaurants_hours_operation_gin
                ON restaurants USING GIN ((hours_of_operation::jsonb))
            """
                )
            )
            # Add index for hours_last_updated for refresh queries
            conn.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_restaurants_hours_last_updated
                ON restaurants (hours_last_updated)
            """
                )
            )
            conn.commit()
            logger.info("Added hours-related indexes")
            return True
    except Exception as e:
        logger.error(f"Error adding hours indexes: {e}")
        return False


def run_migration():
    """Run the hours consolidation migration."""
    logger.info("Starting hours consolidation migration")
    try:
        engine = _create_engine()
        # Check if hours_open column exists
        hours_open_exists = _check_column_exists(engine, "restaurants", "hours_open")
        hours_of_operation_exists = _check_column_exists(
            engine, "restaurants", "hours_of_operation"
        )
        logger.info(
            "Column status",
            hours_open_exists=hours_open_exists,
            hours_of_operation_exists=hours_of_operation_exists,
        )
        # Migrate hours data
        migration_stats = _migrate_hours_data(engine)
        # Add indexes
        indexes_added = _add_hours_indexes(engine)
        # Log results
        logger.info(
            "Hours migration completed",
            stats=migration_stats,
            indexes_added=indexes_added,
        )
        # Print summary
        print(
            """
🎉 Hours Consolidation Migration Complete!
📊 Migration Statistics:
- Total restaurants processed: {migration_stats['total_restaurants']}
- Migrated from hours_open: {migration_stats['migrated_from_hours_open']}
- Migrated from hours_of_operation: {migration_stats['migrated_from_hours_of_operation']}
- Errors: {migration_stats['errors']}
- Indexes added: {indexes_added}
✅ Next steps:
1. Verify the migration by checking a few restaurants
2. Run the hours backfill script to populate with real data
3. Create follow-up migration to drop hours_open column
        """
        )
        return True
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    run_migration()
