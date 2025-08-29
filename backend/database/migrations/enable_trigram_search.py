from alembic import op

#!/usr/bin/env python3
"""Database Migration: Enable Trigram Search.
========================================

This migration enables PostgreSQL trigram extension for fuzzy search capabilities.
The pg_trgm extension provides similarity functions for fuzzy string matching.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

# revision identifiers, used by Alembic.
revision = "enable_trigram_search"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Enable trigram extension and create search indexes."""
    # Enable the pg_trgm extension for fuzzy search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Create GIN indexes for fast trigram similarity searches
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
        ON restaurants USING gin (name gin_trgm_ops)
    """,
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_city_trgm
        ON restaurants USING gin (city gin_trgm_ops)
    """,
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_certifying_agency_trgm
        ON restaurants USING gin (certifying_agency gin_trgm_ops)
    """,
    )

    # Create composite indexes for common search patterns
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_name_city_trgm
        ON restaurants USING gin ((name || ' ' || city) gin_trgm_ops)
    """,
    )

    # Create full-text search indexes
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_fts
        ON restaurants USING gin (
            to_tsvector('english',
                coalesce(name, '') || ' ' ||
                coalesce(city, '') || ' ' ||
                coalesce(certifying_agency, '') || ' ' ||
                coalesce(short_description, '')
            )
        )
    """,
    )

    # Create indexes for common filter combinations
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_kosher_category_city
        ON restaurants (kosher_category, city)
    """,
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_certifying_agency_state
        ON restaurants (certifying_agency, state)
    """,
    )

    # Create partial indexes for active restaurants
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_restaurants_active
        ON restaurants (name, city, kosher_category)
        WHERE updated_at > NOW() - INTERVAL '1 year'
    """,
    )


def downgrade() -> None:
    """Remove trigram indexes and extension."""
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_restaurants_name_trgm")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_city_trgm")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_certifying_agency_trgm")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_name_city_trgm")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_fts")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_kosher_category_city")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_certifying_agency_state")
    op.execute("DROP INDEX IF EXISTS idx_restaurants_active")

    # Note: We don't drop the pg_trgm extension as it might be used by other parts of the system
