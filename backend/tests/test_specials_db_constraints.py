#!/usr/bin/env python3
from sqlalchemy import text
from database.database_manager_v5 import get_database_manager_v5


def test_mv_exists():
    dbm = get_database_manager_v5()
    with dbm.get_session() as session:
        result = session.execute(text("""
            SELECT COUNT(*) FROM pg_matviews WHERE matviewname = 'mv_active_specials'
        """)).scalar()
        assert result is not None


