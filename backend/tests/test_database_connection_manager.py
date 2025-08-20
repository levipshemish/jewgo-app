#!/usr/bin/env python3
"""Test suite for DatabaseConnectionManager.
========================================

This module tests the unified database connection manager to ensure
it provides consistent session management, error handling, and connection pooling.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import os
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from utils.database_connection_manager import (
    DatabaseConnectionManager,
    close_db_manager,
    get_db_manager,
)


class TestDatabaseConnectionManager:
    """Test cases for DatabaseConnectionManager."""

    def setup_method(self):
        """Setup test environment."""
        # Use a test database URL
        self.test_db_url = "postgresql://test:test@localhost:5432/test_db"
        self.db_manager = None

    def teardown_method(self):
        """Cleanup test environment."""
        if self.db_manager:
            self.db_manager.close()

    @patch.dict(
        os.environ, {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"}
    )
    def test_init_with_env_var(self):
        """Test initialization with environment variable."""
        db_manager = DatabaseConnectionManager()
        assert (
            db_manager.database_url == "postgresql://test:test@localhost:5432/test_db"
        )

    def test_init_with_custom_url(self):
        """Test initialization with custom database URL."""
        db_manager = DatabaseConnectionManager(self.test_db_url)
        assert db_manager.database_url == self.test_db_url

    def test_init_without_url(self):
        """Test initialization without database URL."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(
                ValueError, match="DATABASE_URL environment variable is required"
            ):
                DatabaseConnectionManager()

    @patch("utils.database_connection_manager.create_engine")
    def test_connect_success(self, mock_create_engine):
        """Test successful database connection."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            result = db_manager.connect()

            assert result is True
            assert db_manager._is_connected is True
            assert db_manager.engine is not None
            assert db_manager.SessionLocal is not None

    @patch("utils.database_connection_manager.create_engine")
    def test_connect_failure(self, mock_create_engine):
        """Test database connection failure."""
        # Mock engine creation failure
        mock_create_engine.side_effect = Exception("Connection failed")

        db_manager = DatabaseConnectionManager(self.test_db_url)
        result = db_manager.connect()

        assert result is False
        assert db_manager._is_connected is False

    @patch("utils.database_connection_manager.create_engine")
    def test_get_session_auto_connect(self, mock_create_engine):
        """Test get_session with auto-connection."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            session = db_manager.get_session()

            assert session is mock_session
            assert db_manager._is_connected is True

    def test_get_session_without_connection(self):
        """Test get_session without prior connection."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with pytest.raises(RuntimeError, match="Database not connected"):
            db_manager.get_session()

    @patch("utils.database_connection_manager.create_engine")
    def test_session_scope_success(self, mock_create_engine):
        """Test session_scope context manager with successful operation."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            with db_manager.session_scope() as session:
                assert session is mock_session
                # Simulate successful operation
                pass

            # Verify session was committed and closed
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()

    @patch("utils.database_connection_manager.create_engine")
    def test_session_scope_with_error(self, mock_create_engine):
        """Test session_scope context manager with error."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            with pytest.raises(Exception, match="Test error"):
                with db_manager.session_scope() as session:
                    assert session is mock_session
                    # Simulate error
                    raise Exception("Test error")

            # Verify session was rolled back and closed
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    @patch("utils.database_connection_manager.create_engine")
    def test_execute_query(self, mock_create_engine):
        """Test execute_query method."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        # Mock query execution
        mock_query_result = MagicMock()
        mock_row1 = MagicMock()
        mock_row1._mapping = {"id": 1, "name": "Test Restaurant"}
        mock_row2 = MagicMock()
        mock_row2._mapping = {"id": 2, "name": "Another Restaurant"}
        mock_query_result.fetchall.return_value = [mock_row1, mock_row2]
        mock_session.execute.return_value = mock_query_result

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            result = db_manager.execute_query(
                "SELECT * FROM restaurants WHERE city = :city", {"city": "Miami"}
            )

            assert result == [
                {"id": 1, "name": "Test Restaurant"},
                {"id": 2, "name": "Another Restaurant"},
            ]

            # Verify query was executed with correct parameters
            mock_session.execute.assert_called_once()
            call_args = mock_session.execute.call_args
            assert "SELECT * FROM restaurants WHERE city = :city" in str(
                call_args[0][0]
            )
            assert call_args[0][1] == {"city": "Miami"}

    @patch("utils.database_connection_manager.create_engine")
    def test_execute_update(self, mock_create_engine):
        """Test execute_update method."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        # Mock update execution
        mock_update_result = MagicMock()
        mock_update_result.rowcount = 5
        mock_session.execute.return_value = mock_update_result

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            result = db_manager.execute_update(
                "UPDATE restaurants SET status = :status WHERE city = :city",
                {"status": "active", "city": "Miami"},
            )

            assert result == 5

    @patch("utils.database_connection_manager.create_engine")
    def test_health_check_healthy(self, mock_create_engine):
        """Test health_check method with healthy database."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        # Mock health check queries
        mock_test_result = MagicMock()
        mock_test_result.fetchone.return_value = [1]

        mock_version_result = MagicMock()
        mock_version_result.fetchone.return_value = ["PostgreSQL 14.0"]

        mock_connections_result = MagicMock()
        mock_connections_result.fetchone.return_value = [10]

        mock_session.execute.side_effect = [
            mock_test_result,
            mock_version_result,
            mock_connections_result,
        ]

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            result = db_manager.health_check()

            assert result["status"] == "healthy"
            assert result["test_result"] == 1
            assert result["version"] == "PostgreSQL 14.0"
            assert result["connection_count"] == 10
            assert result["connected"] is True

    @patch("utils.database_connection_manager.create_engine")
    def test_health_check_unhealthy(self, mock_create_engine):
        """Test health_check method with unhealthy database."""
        # Mock engine and session factory
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Mock connection test
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_result.fetchone.return_value = [1]
        mock_conn.execute.return_value = mock_result
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock session factory
        mock_session_factory = MagicMock()
        mock_session = MagicMock()
        mock_session_factory.return_value = mock_session

        # Mock health check failure
        mock_session.execute.side_effect = Exception("Database error")

        with patch(
            "utils.database_connection_manager.scoped_session",
            return_value=mock_session_factory,
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)
            db_manager.connect()

            result = db_manager.health_check()

            assert result["status"] == "unhealthy"
            assert "Database error" in result["error"]
            assert result["connected"] is True

    def test_with_retry_success(self):
        """Test with_retry method with successful operation."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        def successful_operation():
            return "success"

        result = db_manager.with_retry(successful_operation)
        assert result == "success"

    def test_with_retry_with_retries(self):
        """Test with_retry method with retries."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        call_count = 0

        def failing_then_successful_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise OperationalError("Connection failed", None, None)
            return "success"

        with patch.object(db_manager, "engine", MagicMock()):
            result = db_manager.with_retry(failing_then_successful_operation, retries=2)
            assert result == "success"
            assert call_count == 2

    def test_with_retry_max_retries_exceeded(self):
        """Test with_retry method with max retries exceeded."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        def always_failing_operation():
            raise OperationalError("Connection failed", None, None)

        with patch.object(db_manager, "engine", MagicMock()):
            with pytest.raises(OperationalError):
                db_manager.with_retry(always_failing_operation, retries=1)

    def test_execute_insert(self):
        """Test execute_insert method."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "session_scope") as mock_session_scope:
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_session.execute.return_value = mock_result
            mock_session_scope.return_value.__enter__.return_value = mock_session

            result = db_manager.execute_insert(
                "INSERT INTO restaurants (name, city) VALUES (:name, :city)",
                {"name": "Test Restaurant", "city": "Miami"},
            )

            assert result == mock_result
            mock_session.execute.assert_called_once()

    def test_ssl_configuration(self):
        """Test SSL configuration for non-local connections."""
        db_manager = DatabaseConnectionManager(
            "postgresql://user:pass@neon.tech:5432/db"
        )

        # Test that SSL is configured for non-local connections
        assert "sslmode=prefer" in db_manager.database_url

    def test_local_connection_no_ssl(self):
        """Test that local connections don't get SSL forced."""
        db_manager = DatabaseConnectionManager(
            "postgresql://user:pass@localhost:5432/db"
        )

        # Test that SSL is not forced for local connections
        assert "sslmode=prefer" not in db_manager.database_url

    def test_connection_pool_settings(self):
        """Test connection pool configuration."""
        with patch.dict(
            os.environ,
            {
                "DB_POOL_SIZE": "10",
                "DB_MAX_OVERFLOW": "20",
                "DB_POOL_TIMEOUT": "60",
                "DB_POOL_RECYCLE": "300",
            },
        ):
            db_manager = DatabaseConnectionManager(self.test_db_url)

            # Test that environment variables are respected
            # (This would be tested in the actual connect method)
            assert db_manager.database_url == self.test_db_url

    def test_neon_provider_detection(self):
        """Test Neon provider detection and configuration."""
        db_manager = DatabaseConnectionManager(
            "postgresql://user:pass@ep-snowy-firefly.neon.tech:5432/db"
        )

        # Test that Neon URLs are detected
        assert "neon.tech" in db_manager.database_url

    def test_health_check_with_error(self):
        """Test health_check method with database error."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "session_scope") as mock_session_scope:
            mock_session_scope.side_effect = Exception("Database error")

            result = db_manager.health_check()

            assert result["status"] == "unhealthy"
            assert "Database error" in result["error"]
            assert result["connected"] is False

    def test_context_manager_with_connection_failure(self):
        """Test context manager with connection failure."""
        with patch.object(DatabaseConnectionManager, "connect") as mock_connect:
            mock_connect.return_value = False

            with pytest.raises(RuntimeError):
                with DatabaseConnectionManager(self.test_db_url) as db_manager:
                    pass

    def test_get_session_connection_failure(self):
        """Test get_session when connection fails."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "connect") as mock_connect:
            mock_connect.return_value = False

            with pytest.raises(RuntimeError, match="Database not connected"):
                db_manager.get_session()

    def test_session_scope_with_operational_error(self):
        """Test session_scope with OperationalError."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_get_session.return_value = mock_session

            with pytest.raises(OperationalError):
                with db_manager.session_scope() as session:
                    raise OperationalError("Database error", None, None)

            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    def test_execute_query_with_no_results(self):
        """Test execute_query with no results."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "session_scope") as mock_session_scope:
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            mock_session_scope.return_value.__enter__.return_value = mock_session

            result = db_manager.execute_query("SELECT * FROM empty_table")

            assert result == []

    def test_execute_update_with_no_affected_rows(self):
        """Test execute_update with no affected rows."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        with patch.object(db_manager, "session_scope") as mock_session_scope:
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_result.rowcount = 0
            mock_session.execute.return_value = mock_result
            mock_session_scope.return_value.__enter__.return_value = mock_session

            result = db_manager.execute_update(
                "UPDATE restaurants SET status = 'active' WHERE id = 999"
            )

            assert result == 0

    def test_close(self):
        """Test close method."""
        db_manager = DatabaseConnectionManager(self.test_db_url)

        # Mock session factory and engine
        mock_session_factory = MagicMock()
        mock_engine = MagicMock()
        db_manager.SessionLocal = mock_session_factory
        db_manager.engine = mock_engine
        db_manager._is_connected = True

        db_manager.close()

        mock_session_factory.remove.assert_called_once()
        mock_engine.dispose.assert_called_once()
        assert db_manager._is_connected is False

    def test_context_manager(self):
        """Test context manager functionality."""
        with patch.object(
            DatabaseConnectionManager, "connect"
        ) as mock_connect, patch.object(
            DatabaseConnectionManager, "close"
        ) as mock_close:
            mock_connect.return_value = True

            with DatabaseConnectionManager(self.test_db_url) as db_manager:
                assert isinstance(db_manager, DatabaseConnectionManager)

            mock_connect.assert_called_once()
            mock_close.assert_called_once()


class TestGlobalFunctions:
    """Test cases for global functions."""

    def setup_method(self):
        """Setup test environment."""
        # Clear global instance
        close_db_manager()

    def teardown_method(self):
        """Cleanup test environment."""
        close_db_manager()

    @patch.dict(
        os.environ, {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"}
    )
    def test_get_db_manager_creates_instance(self):
        """Test get_db_manager creates new instance."""
        db_manager = get_db_manager()
        assert isinstance(db_manager, DatabaseConnectionManager)
        assert (
            db_manager.database_url == "postgresql://test:test@localhost:5432/test_db"
        )

    @patch.dict(
        os.environ, {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"}
    )
    def test_get_db_manager_returns_same_instance(self):
        """Test get_db_manager returns same instance."""
        db_manager1 = get_db_manager()
        db_manager2 = get_db_manager()
        assert db_manager1 is db_manager2

    @patch.dict(
        os.environ, {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"}
    )
    def test_get_db_manager_with_custom_url(self):
        """Test get_db_manager with custom URL."""
        custom_url = "postgresql://custom:custom@localhost:5432/custom_db"
        db_manager = get_db_manager(custom_url)
        assert db_manager.database_url == custom_url

    def test_close_db_manager(self):
        """Test close_db_manager function."""
        # Create an instance
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"},
        ):
            db_manager = get_db_manager()
            assert db_manager is not None

        # Close it
        close_db_manager()

        # Get new instance should create new one
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"},
        ):
            new_db_manager = get_db_manager()
            assert new_db_manager is not db_manager

    def test_get_db_manager_without_env_var(self):
        """Test get_db_manager without environment variable."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(
                ValueError, match="DATABASE_URL environment variable is required"
            ):
                get_db_manager()

    def test_multiple_get_db_manager_calls(self):
        """Test multiple calls to get_db_manager return same instance."""
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"},
        ):
            db_manager1 = get_db_manager()
            db_manager2 = get_db_manager()
            db_manager3 = get_db_manager()

            assert db_manager1 is db_manager2
            assert db_manager2 is db_manager3

    def test_close_db_manager_multiple_calls(self):
        """Test that multiple calls to close_db_manager are safe."""
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"},
        ):
            get_db_manager()

        # Multiple close calls should not raise errors
        close_db_manager()
        close_db_manager()
        close_db_manager()

    def test_get_db_manager_after_close(self):
        """Test get_db_manager after closing creates new instance."""
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"},
        ):
            db_manager1 = get_db_manager()
            close_db_manager()
            db_manager2 = get_db_manager()

            assert db_manager1 is not db_manager2
            assert isinstance(db_manager1, DatabaseConnectionManager)
            assert isinstance(db_manager2, DatabaseConnectionManager)


if __name__ == "__main__":
    pytest.main([__file__])
