#!/usr/bin/env python3
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from database.database_manager_v5 import get_database_manager_v5


@pytest.fixture
def seed_specials():
    """Seed minimal restaurants and specials, yield identifiers, and cleanup."""
    dbm = get_database_manager_v5()
    with dbm.get_session() as session:
        # Ensure lookup tables have required rows
        session.execute(text("""
            INSERT INTO discount_kinds(code, label) VALUES('percentage','Percentage')
            ON CONFLICT (code) DO NOTHING;
        """))
        session.execute(text("""
            INSERT INTO claim_statuses(code, label) VALUES('claimed','Claimed')
            ON CONFLICT (code) DO NOTHING;
        """))
        session.execute(text("""
            INSERT INTO media_kinds(code, label) VALUES('image','Image')
            ON CONFLICT (code) DO NOTHING;
        """))

        # Create a restaurant if not exists
        restaurant_id = session.execute(text("""
            INSERT INTO restaurants (name)
            VALUES ('Test Restaurant')
            RETURNING id
        """))
        rid = restaurant_id.scalar()

        now = datetime.now(timezone.utc)
        valid_from = now - timedelta(hours=1)
        valid_until = now + timedelta(hours=1)

        # Create active special
        special_row = session.execute(text("""
            INSERT INTO specials (
                restaurant_id, title, discount_type, discount_value, discount_label,
                valid_from, valid_until, max_claims_total, max_claims_per_user, per_visit,
                is_active
            ) VALUES (
                :rid, 'Active Special', 'percentage', 10.0, '10% off',
                :vf, :vu, 5, 1, false,
                true
            ) RETURNING id
        """), {"rid": rid, "vf": valid_from, "vu": valid_until})
        sid = special_row.scalar()

        # Create per-visit special
        special_row2 = session.execute(text("""
            INSERT INTO specials (
                restaurant_id, title, discount_type, discount_value, discount_label,
                valid_from, valid_until, max_claims_total, max_claims_per_user, per_visit,
                is_active
            ) VALUES (
                :rid, 'Per Visit Special', 'percentage', 15.0, '15% off',
                :vf, :vu, 100, 1, true,
                true
            ) RETURNING id
        """), {"rid": rid, "vf": valid_from, "vu": valid_until})
        sid_per_visit = special_row2.scalar()

        session.commit()

    yield {"restaurant_id": rid, "special_id": str(sid), "per_visit_special_id": str(sid_per_visit)}

    # Cleanup
    with dbm.get_session() as session:
        session.execute(text("DELETE FROM special_claims WHERE special_id IN (:sid1, :sid2)"), {"sid1": sid, "sid2": sid_per_visit})
        session.execute(text("DELETE FROM specials WHERE id IN (:sid1, :sid2)"), {"sid1": sid, "sid2": sid_per_visit})
        session.execute(text("DELETE FROM restaurants WHERE id = :rid"), {"rid": rid})
        session.commit()


