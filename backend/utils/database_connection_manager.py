import os
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Unified Database Connection Manager for JewGo App.
===============================================

This module provides a unified database connection management system that consolidates
all database connection patterns across the JewGo application. It provides consistent
session management, error handling, and connection pooling for all database operations.

Key Features:
- Unified session creation and management
- Context manager for automatic session handling
- Retry logic for database operations
- Connection pooling and SSL configuration
- Comprehensive error handling
- Support for both direct SQL and ORM operations

Usage Examples:
    # Using context manager (recommended)
    with db_manager.session_scope() as session:
        result = session.execute(text("SELECT * FROM restaurants"))
        return result.fetchall()
    
    # Using direct session
    session = db_manager.get_session()
    try:
        result = session.execute(text("SELECT * FROM restaurants"))
        session.commit()
        return result.fetchall()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
    
    # Using execute_query helper
    result = db_manager.execute_query("SELECT * FROM restaurants WHERE city = :city", {"city": "Miami"})

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


class DatabaseConnectionManager:
    """Unified database connection manager with comprehensive session management."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        """Initialize database connection manager with connection string.

        Args:
            database_url: Database connection URL. If not provided, uses DATABASE_URL environment variable.
        """
        self.database_url = database_url or os.environ.get("DATABASE_URL")

        # Validate that DATABASE_URL is provided
        if not self.database_url:
            msg = "DATABASE_URL environment variable is required"
            raise ValueError(msg)

        # Fix database URL format if needed (postgres:// -> postgresql://)
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://")
            logger.info("Fixed database URL format from postgres:// to postgresql://")

        # Initialize SQLAlchemy components
        self.engine = None
        self.SessionLocal = None
        self._is_connected = False

        logger.info(
            "Database connection manager initialized",
            database_url=self.database_url[:50] + "...",
        )

    def connect(self) -> bool:
        """Connect to the database and create session factory.

        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            # Ensure SSL for all non-local Postgres connections
            self._configure_ssl()

            # Create the engine with optimized settings
            self._create_engine()

            # Test the connection
            self._test_connection()

            # Create session factory
            self._create_session_factory()

            self._is_connected = True
            logger.info("Database connection successful")
            return True

        except Exception as e:
            logger.exception(
                "Failed to connect to database",
                error=str(e),
                database_url=self.database_url[:50] + "...",
            )
            return False

    def _configure_ssl(self) -> None:
        """Configure SSL settings for database connection."""
        try:
            parsed = urlparse(self.database_url)
            hostname = (parsed.hostname or "").lower()
            is_local = hostname in ("localhost", "127.0.0.1")

            if (
                parsed.scheme.startswith("postgres")
                and (not is_local)
                and ("sslmode=" not in (parsed.query or ""))
            ):
                # Use sslmode=prefer for better compatibility with Neon and other providers
                new_query = (
                    f"{parsed.query}&sslmode=prefer"
                    if parsed.query
                    else "sslmode=prefer"
                )
                self.database_url = urlunparse(parsed._replace(query=new_query))
                logger.info(
                    "Added sslmode=prefer to database URL for non-local connection",
                    hostname=hostname,
                )
        except Exception as e:
            # Non-fatal: continue without altering URL
            logger.warning(
                "Failed to normalize database URL for SSL; continuing", error=str(e)
            )

    def _create_engine(self) -> None:
        """Create SQLAlchemy engine with optimized settings."""
        # Connection pool and TCP keepalive settings
        keepalives_idle = int(os.environ.get("PG_KEEPALIVES_IDLE", "30"))
        keepalives_interval = int(os.environ.get("PG_KEEPALIVES_INTERVAL", "10"))
        keepalives_count = int(os.environ.get("PG_KEEPALIVES_COUNT", "3"))
        statement_timeout = os.environ.get("PG_STATEMENT_TIMEOUT", "30000")  # ms
        idle_tx_timeout = os.environ.get("PG_IDLE_TX_TIMEOUT", "60000")  # ms

        connect_args = {
            "connect_timeout": 30,
            "application_name": "jewgo-backend",
            "sslmode": os.environ.get("PGSSLMODE", "require"),
            "keepalives": 1,
            "keepalives_idle": keepalives_idle,
            "keepalives_interval": keepalives_interval,
            "keepalives_count": keepalives_count,
            "options": f"-c statement_timeout={statement_timeout} -c idle_in_transaction_session_timeout={idle_tx_timeout}",
        }

        # Optional certificate pinning
        if os.environ.get("PGSSLROOTCERT"):
            connect_args["sslrootcert"] = os.environ.get("PGSSLROOTCERT")

        # Detect Neon and remove unsupported startup options
        parsed = urlparse(self.database_url)
        hostname = (parsed.hostname or "").lower()
        is_neon = "neon.tech" in hostname
        if is_neon:
            connect_args.pop("options", None)

        self.engine = create_engine(
            self.database_url,
            echo=False,
            pool_size=int(os.environ.get("DB_POOL_SIZE", "5")),
            max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "10")),
            pool_timeout=int(os.environ.get("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.environ.get("DB_POOL_RECYCLE", "180")),  # 3 minutes
            pool_pre_ping=True,
            connect_args=connect_args,
        )

        # Set per-connection timeouts for Neon
        if is_neon:
            self._setup_neon_timeouts(statement_timeout, idle_tx_timeout)

    def _setup_neon_timeouts(
        self, statement_timeout: str, idle_tx_timeout: str
    ) -> None:
        """Setup per-connection timeouts for Neon database."""
        try:

            @event.listens_for(self.engine, "connect")
            def _set_timeouts_on_connect(dbapi_connection, connection_record):
                try:
                    with dbapi_connection.cursor() as cursor:
                        cursor.execute(f"SET statement_timeout = {statement_timeout}")
                        cursor.execute(
                            f"SET idle_in_transaction_session_timeout = {idle_tx_timeout}"
                        )
                        logger.debug(
                            "Successfully set Neon timeouts",
                            statement_timeout=statement_timeout,
                            idle_tx_timeout=idle_tx_timeout,
                        )
                except Exception as e:
                    logger.warning(
                        "Failed to set Neon timeouts on connection",
                        error=str(e),
                        error_type=type(e).__name__,
                        statement_timeout=statement_timeout,
                        idle_tx_timeout=idle_tx_timeout,
                    )
                    # Non-fatal: leave defaults if SET fails

        except Exception as e:
            logger.warning(
                "Failed to setup Neon timeout event listener",
                error=str(e),
                error_type=type(e).__name__,
            )
            # Non-fatal: proceed without event listener if unsupported

    def _test_connection(self) -> None:
        """Test database connection."""
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()  # Consume the result

    def _create_session_factory(self) -> None:
        """Create SQLAlchemy session factory."""
        self.SessionLocal = scoped_session(
            sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine,
                expire_on_commit=False,
            )
        )

    def get_session(self) -> Session:
        """Get a new database session, auto-connecting if needed.

        Returns:
            Session: SQLAlchemy session object

        Raises:
            RuntimeError: If database connection fails
        """
        if not self.SessionLocal:
            # Attempt a lazy connect so callers don't have to remember connect()
            connected = self.connect()
            if not connected or not self.SessionLocal:
                msg = "Database not connected. Call connect() first."
                raise RuntimeError(msg)
        return self.SessionLocal()

    @contextmanager
    def session_scope(self):
        """Context manager for database sessions with proper error handling.

        Yields:
            Session: SQLAlchemy session object

        Example:
            with db_manager.session_scope() as session:
                result = session.execute(text("SELECT * FROM restaurants"))
                return result.fetchall()
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except OperationalError as e:
            session.rollback()
            logger.error("Database operational error", error=str(e))
            raise
        except Exception as e:
            session.rollback()
            logger.error("Database error", error=str(e))
            raise
        finally:
            session.close()

    def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results as list of dictionaries.

        Args:
            query: SQL query string
            params: Query parameters (optional)

        Returns:
            List[Dict[str, Any]]: Query results as list of dictionaries

        Raises:
            SQLAlchemyError: If query execution fails
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            return [dict(row._mapping) for row in result.fetchall()]

    def execute_update(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> int:
        """Execute an UPDATE query and return number of affected rows.

        Args:
            query: SQL UPDATE query string
            params: Query parameters (optional)

        Returns:
            int: Number of affected rows

        Raises:
            SQLAlchemyError: If query execution fails
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            return result.rowcount

    def execute_insert(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Execute an INSERT query and return the inserted ID.

        Args:
            query: SQL INSERT query string
            params: Query parameters (optional)

        Returns:
            Any: Inserted ID or result

        Raises:
            SQLAlchemyError: If query execution fails
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            session.commit()
            return result

    def with_retry(self, fn, retries: int = 2, delay: float = 0.2):
        """Retry function with exponential backoff for OperationalError.

        Args:
            fn: Function to retry
            retries: Number of retry attempts
            delay: Initial delay between retries (will be multiplied by retry number)

        Returns:
            Any: Result of the function

        Raises:
            OperationalError: If all retries fail
        """
        for i in range(retries + 1):
            try:
                return fn()
            except OperationalError:
                if i == retries:
                    raise
                time.sleep(delay * (i + 1))
                # Dispose engine to drop broken connections before retry
                try:
                    if self.engine:
                        self.engine.dispose()
                except Exception:
                    pass

    def health_check(self) -> Dict[str, Any]:
        """Perform database health check.

        Returns:
            Dict[str, Any]: Health check results
        """
        try:
            with self.session_scope() as session:
                # Test basic connectivity
                result = session.execute(text("SELECT 1 as test"))
                test_result = result.fetchone()

                # Get database info
                version_result = session.execute(text("SELECT version()"))
                version = version_result.fetchone()[0]

                # Get connection count
                connections_result = session.execute(
                    text(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
                    )
                )
                connection_count = connections_result.fetchone()[0]

                return {
                    "status": "healthy",
                    "test_result": test_result[0] if test_result else None,
                    "version": version,
                    "connection_count": connection_count,
                    "connected": self._is_connected,
                }
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e),
                "connected": self._is_connected,
            }

    def close(self) -> None:
        """Close database connections and cleanup resources."""
        try:
            if self.SessionLocal:
                self.SessionLocal.remove()
            if self.engine:
                self.engine.dispose()
            self._is_connected = False
            logger.info("Database connections closed")
        except Exception as e:
            logger.error("Error closing database connections", error=str(e))

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Global instance for easy access
_db_manager = None


def get_db_manager(database_url: Optional[str] = None) -> DatabaseConnectionManager:
    """Get or create global database connection manager instance.

    Args:
        database_url: Database connection URL (optional)

    Returns:
        DatabaseConnectionManager: Database connection manager instance
    """
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseConnectionManager(database_url)
    return _db_manager


def close_db_manager() -> None:
    """Close the global database connection manager."""
    global _db_manager
    if _db_manager:
        _db_manager.close()
        _db_manager = None
