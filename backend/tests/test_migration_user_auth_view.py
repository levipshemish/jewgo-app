import os


def read_migration() -> str:
    here = os.path.dirname(os.path.dirname(__file__))
    # backend/tests/ -> backend/
    backend_dir = os.path.dirname(here)
    migration_path = os.path.join(backend_dir, "migrations", "postgres_auth_migration.sql")
    with open(migration_path, "r", encoding="utf-8") as f:
        return f.read()


def test_user_auth_info_view_no_created_updated_columns():
    sql = read_migration()
    assert "CREATE OR REPLACE VIEW user_auth_info" in sql
    # Ensure we do not reference non-existent columns
    assert "u.created_at" not in sql
    assert "u.updated_at" not in sql


def test_refresh_hash_index_present():
    sql = read_migration()
    assert "idx_auth_sessions_rthash" in sql
    assert "auth_sessions(refresh_token_hash)" in sql

