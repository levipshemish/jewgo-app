from unittest.mock import Mock, patch

import pytest
from database.database_manager_v3 import EnhancedDatabaseManager
from sqlalchemy.exc import OperationalError

#!/usr/bin/env python3
"""Database Resilience Tests for JewGo Backend.
============================================

Tests for database connection resilience, retry logic, and error handling.

Author: JewGo Development Team
Version: 1.0
"""


def test_engine_has_pre_ping():
    """Test that engine is configured with pre_ping."""
    with patch.dict(
        "os.environ", {"DATABASE_URL": "postgresql://test:test@localhost/test"}
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        # Verify engine has pre_ping enabled
        assert db_manager.engine.pool._pre_ping is True


def test_engine_has_proper_pool_settings():
    """Test that engine has proper pool settings for TLS stability."""
    with patch.dict(
        "os.environ",
        {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "DB_POOL_SIZE": "5",
            "DB_MAX_OVERFLOW": "10",
            "DB_POOL_TIMEOUT": "30",
            "DB_POOL_RECYCLE": "180",
        },
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        # Verify pool settings
        assert db_manager.engine.pool.size() == 5
        assert db_manager.engine.pool._max_overflow == 10
        assert db_manager.engine.pool._timeout == 30
        assert db_manager.engine.pool._recycle == 180


def test_session_scope_context_manager():
    """Test session scope context manager."""
    with patch.dict(
        "os.environ", {"DATABASE_URL": "postgresql://test:test@localhost/test"}
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        with db_manager.session_scope() as session:
            assert session is not None
            # Session should be committed automatically on exit


def test_session_scope_handles_operational_error():
    """Test session scope handles OperationalError properly."""
    with patch.dict(
        "os.environ", {"DATABASE_URL": "postgresql://test:test@localhost/test"}
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        with pytest.raises(OperationalError):
            with db_manager.session_scope() as session:
                # Simulate an OperationalError
                raise OperationalError(
                    "SSL error: decryption failed or bad record mac", None, None
                )


def test_with_retry_functionality():
    """Test retry functionality for OperationalError."""
    with patch.dict(
        "os.environ", {"DATABASE_URL": "postgresql://test:test@localhost/test"}
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        # Mock function that fails twice then succeeds
        call_count = 0

        def failing_function():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise OperationalError("SSL error", None, None)
            return "success"

        result = db_manager.with_retry(failing_function, retries=2, delay=0.1)
        assert result == "success"
        assert call_count == 3


def test_with_retry_gives_up_after_max_retries():
    """Test retry gives up after maximum retries."""
    with patch.dict(
        "os.environ", {"DATABASE_URL": "postgresql://test:test@localhost/test"}
    ):
        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        def always_failing_function():
            raise OperationalError("SSL error", None, None)

        with pytest.raises(OperationalError):
            db_manager.with_retry(always_failing_function, retries=2, delay=0.1)


def test_connect_args_include_ssl_and_keepalives():
    """Test that connect_args include SSL and keepalive settings."""
    with patch.dict(
        "os.environ",
        {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "PGSSLMODE": "require",
            "PG_KEEPALIVES_IDLE": "30",
            "PG_KEEPALIVES_INTERVAL": "10",
            "PG_KEEPALIVES_COUNT": "3",
        },
    ):
        db_manager = EnhancedDatabaseManager()

        # Mock the create_engine call to capture connect_args
        with patch("sqlalchemy.create_engine") as mock_create_engine:
            db_manager.connect()

            # Verify create_engine was called
            mock_create_engine.assert_called_once()

            # Get the connect_args from the call
            call_args = mock_create_engine.call_args
            connect_args = call_args[1]["connect_args"]

            # Verify SSL and keepalive settings
            assert connect_args["sslmode"] == "require"
            assert connect_args["keepalives"] == 1
            assert connect_args["keepalives_idle"] == 30
            assert connect_args["keepalives_interval"] == 10
            assert connect_args["keepalives_count"] == 3
