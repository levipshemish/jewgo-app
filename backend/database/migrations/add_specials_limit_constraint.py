import json

from alembic import op




import sqlalchemy as sa


#!/usr/bin/env python3
"""Database Migration: Add Specials Limit Constraint.
================================================

This migration adds a database constraint to enforce that each restaurant
can have a maximum of 3 specials. This ensures data integrity at the
database level.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

# revision identifiers, used by Alembic.
revision = "add_specials_limit_constraint"
down_revision = "enable_trigram_search"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add constraint to limit specials to 3 per restaurant."""
    # Create a function to check the number of specials
    op.execute(
        """
        CREATE OR REPLACE FUNCTION check_specials_limit()
        RETURNS TRIGGER AS $$
        DECLARE
            specials_count INTEGER;
        BEGIN
            -- Check if specials field is being updated
            IF TG_OP = 'UPDATE' AND NEW.specials IS NOT NULL THEN
                -- Parse JSON and count specials
                BEGIN
                    specials_count := json_array_length(NEW.specials::json);
                EXCEPTION
                    WHEN OTHERS THEN
                        -- If parsing fails, assume it's not a valid JSON array
                        specials_count := 0;
                END;

                -- Check if count exceeds limit
                IF specials_count > 3 THEN
                    RAISE EXCEPTION 'Restaurant cannot have more than 3 specials. Current count: %', specials_count;
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """,
    )

    # Create trigger to enforce the constraint
    op.execute(
        """
        CREATE TRIGGER enforce_specials_limit
        BEFORE UPDATE ON restaurants
        FOR EACH ROW
        EXECUTE FUNCTION check_specials_limit();
    """,
    )

    # Add a check constraint for INSERT operations
    op.execute(
        """
        CREATE OR REPLACE FUNCTION check_specials_limit_insert()
        RETURNS TRIGGER AS $$
        DECLARE
            specials_count INTEGER;
        BEGIN
            -- Check if specials field is being inserted
            IF NEW.specials IS NOT NULL THEN
                -- Parse JSON and count specials
                BEGIN
                    specials_count := json_array_length(NEW.specials::json);
                EXCEPTION
                    WHEN OTHERS THEN
                        -- If parsing fails, assume it's not a valid JSON array
                        specials_count := 0;
                END;

                -- Check if count exceeds limit
                IF specials_count > 3 THEN
                    RAISE EXCEPTION 'Restaurant cannot have more than 3 specials. Current count: %', specials_count;
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """,
    )

    # Create trigger for INSERT operations
    op.execute(
        """
        CREATE TRIGGER enforce_specials_limit_insert
        BEFORE INSERT ON restaurants
        FOR EACH ROW
        EXECUTE FUNCTION check_specials_limit_insert();
    """,
    )

    # Add a comment to the table documenting the constraint
    op.execute(
        """
        COMMENT ON TABLE restaurants IS 'Restaurants table with constraint: maximum 3 specials per restaurant';
    """,
    )

    # Add a comment to the specials column
    op.execute(
        """
        COMMENT ON COLUMN restaurants.specials IS 'JSON array of specials (max 3 per restaurant)';
    """,
    )


def downgrade() -> None:
    """Remove the specials limit constraint."""
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS enforce_specials_limit ON restaurants;")
    op.execute("DROP TRIGGER IF EXISTS enforce_specials_limit_insert ON restaurants;")

    # Drop functions
    op.execute("DROP FUNCTION IF EXISTS check_specials_limit();")
    op.execute("DROP FUNCTION IF EXISTS check_specials_limit_insert();")

    # Remove comments
    op.execute("COMMENT ON TABLE restaurants IS NULL;")
    op.execute("COMMENT ON COLUMN restaurants.specials IS NULL;")
