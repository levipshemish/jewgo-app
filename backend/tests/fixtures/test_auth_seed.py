#!/usr/bin/env python3
import os
import pytest
from sqlalchemy import text
from database.database_manager_v5 import get_database_manager_v5
from services.auth.token_manager_v5 import TokenManagerV5


@pytest.fixture
def staff_user_token(monkeypatch):
    """Seed a staff user with roles and return Authorization headers.

    Ensures JWT_SECRET_KEY is present for TokenManagerV5.
    """
    if not os.getenv('JWT_SECRET_KEY'):
        monkeypatch.setenv('JWT_SECRET_KEY', 'test-secret-key')

    dbm = get_database_manager_v5()
    with dbm.get_session() as session:
        # Create user
        user_id = session.execute(text("""
            INSERT INTO users (email, name, is_active)
            VALUES ('staff@test.local', 'Staff Test', TRUE)
            RETURNING id
        """))
        uid = user_id.scalar()
        # Assign role: staff level sufficient for redeem flow (level >= 5)
        session.execute(text("""
            INSERT INTO user_roles (user_id, role, level, is_active)
            VALUES (:uid, 'staff', 6, TRUE)
        """), {"uid": uid})
        session.commit()

    tm = TokenManagerV5()
    token, _ = tm.mint_access_token(str(uid), 'staff@test.local', roles=[{"role": "staff", "level": 6}])

    yield {"Authorization": f"Bearer {token}"}

    # Cleanup
    with dbm.get_session() as session:
        session.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": uid})
        session.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
        session.commit()


