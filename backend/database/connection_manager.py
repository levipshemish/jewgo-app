#!/usr/bin/env python3
"""Database connection manager for JewGo App.

This module handles database connections, session management, and connection pooling.
Separated from business logic to follow single responsibility principle.
"""

import os
import time
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import ConfigManager at module level
try:
    from utils.unified_database_config import ConfigManager
except ImportError:
    # Fallback for when utils module is not available
    import os

    class ConfigManager:
        @staticmethod
        def get_database_url():
            return os.getenv("DATABASE_URL")

        @staticmethod
        def get_pg_keepalives_idle():
            return int(os.getenv("PG_KEEPALIVES_IDLE", "60"))

        @staticmethod
        def get_pg_keepalives_interval():
            return int(os.getenv("PG_KEEPALIVES_INTERVAL", "20"))

        @staticmethod
        def get_pg_keepalives_count():
            return int(os.getenv("PG_KEEPALIVES_COUNT", "5"))

        @staticmethod
        def get_pg_statement_timeout():
            return os.getenv("PG_STATEMENT_TIMEOUT", "60000")

        @staticmethod
        def get_pg_idle_tx_timeout():
            return os.getenv("PG_IDLE_TX_TIMEOUT", "120000")

        @staticmethod
        def get_pg_sslmode():
            return os.getenv("PG_SSLMODE", "prefer")

        @staticmethod
        def get_pg_sslrootcert():
            return os.getenv("PG_SSLROOTCERT")

        @staticmethod
        def get_db_pool_size():
            return int(os.getenv("DB_POOL_SIZE", "5"))

        @staticmethod
        def get_db_max_overflow():
            return int(os.getenv("DB_MAX_OVERFLOW", "10"))

        @staticmethod
        def get_db_pool_timeout():
            return int(os.getenv("DB_POOL_TIMEOUT", "30"))

        @staticmethod
        def get_db_pool_recycle():
            return int(os.getenv("DB_POOL_RECYCLE", "180"))


class DatabaseConnectionManager:
    """Manages database connections, sessions, and connection pooling."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        """Initialize connection manager with connection string."""
        self.database_url = database_url or ConfigManager.get_database_url()

        # Validate that DATABASE_URL is provided
        if not self.database_url:
            msg = "DATABASE_URL environment variable is required"
            raise ValueError(msg)

        # Fix database URL format if needed (postgres:// -> postgresql://)
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace(
                "postgres://", "postgresql://"
            )
            logger.info("Fixed database URL format from postgres:// to postgresql://")

        # Initialize SQLAlchemy components
        self.engine = None
        self.SessionLocal = None
        self._session_factory = None

        # Connection state
        self._is_connected = False
        self._connection_attempts = 0
        self._max_retries = 3

    def connect(self) -> bool:
        """Establish database connection with retry logic."""
        if self._is_connected:
            logger.info("Database already connected")
            return True

        while self._connection_attempts < self._max_retries:
            try:
                logger.info("Attempting database connection")

                # Create engine with optimized settings
                self.engine = self._create_engine()

                # Test connection
                with self.engine.connect() as connection:
                    connection.execute(text("SELECT 1"))

                # Create session factory
                self._session_factory = sessionmaker(
                    bind=self.engine, autocommit=False, autoflush=False
                )

                self._is_connected = True
                self._connection_attempts = 0
                logger.info("Database connection established successfully")
                return True

            except Exception as e:
                self._connection_attempts += 1
                logger.error(
                    f"Database connection attempt {self._connection_attempts} failed: {e}"
                )

                if self._connection_attempts < self._max_retries:
                    wait_time = 2**self._connection_attempts  # Exponential backoff
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Max connection attempts reached")
                    return False

        return False

    def _create_engine(self):
        """Create SQLAlchemy engine with optimized settings."""
        # Parse database URL
        parsed_url = urlparse(self.database_url)

        # Build connection arguments
        connect_args = {
            "connect_timeout": 10,
            "application_name": "jewgo_app",
        }

        # Check if using Neon pooled connection (which doesn't support statement_timeout)
        is_neon_pooler = (
            "pooler" in parsed_url.hostname if parsed_url.hostname else False
        )

        if not is_neon_pooler:
            # Only add statement_timeout for non-pooled connections
            connect_args["options"] = (
                f"-c statement_timeout={ConfigManager.get_pg_statement_timeout()}"
                f" -c idle_in_transaction_session_timeout={ConfigManager.get_pg_idle_tx_timeout()}"
            )
        else:
            logger.info(
                "Using Neon pooled connection - skipping statement_timeout parameter"
            )

        # Add SSL configuration if specified
        if ConfigManager.get_pg_sslmode():
            connect_args["sslmode"] = ConfigManager.get_pg_sslmode()
            if ConfigManager.get_pg_sslrootcert():
                connect_args["sslrootcert"] = ConfigManager.get_pg_sslrootcert()

        # Add TCP keepalive settings
        connect_args.update(
            {
                "keepalives_idle": ConfigManager.get_pg_keepalives_idle(),
                "keepalives_interval": ConfigManager.get_pg_keepalives_interval(),
                "keepalives_count": ConfigManager.get_pg_keepalives_count(),
            }
        )

        # Create engine with connection pooling
        engine = create_engine(
            self.database_url,
            pool_size=ConfigManager.get_db_pool_size(),
            max_overflow=ConfigManager.get_db_max_overflow(),
            pool_timeout=ConfigManager.get_db_pool_timeout(),
            pool_recycle=ConfigManager.get_db_pool_recycle(),
            pool_pre_ping=True,
            echo=False,  # Set to True for SQL debugging
            connect_args=connect_args,
        )

        # Add connection event listeners
        self._setup_connection_events(engine)

        return engine

    def _setup_connection_events(self, engine):
        """Setup SQLAlchemy connection event listeners."""

        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set SQLite pragmas for better performance."""
            if engine.dialect.name == "sqlite":
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA cache_size=10000")
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.close()

        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout events."""
            logger.debug("Database connection checked out")

        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Log connection checkin events."""
            logger.debug("Database connection checked in")

    def get_session(self) -> Session:
        """Get a new database session."""
        if not self._is_connected:
            raise RuntimeError("Database not connected. Call connect() first.")

        if not self._session_factory:
            raise RuntimeError("Session factory not initialized")

        return self._session_factory()

    def get_session_context(self):
        """Get a session context manager."""
        if not self._is_connected:
            raise RuntimeError("Database not connected. Call connect() first.")

        if not self._session_factory:
            raise RuntimeError("Session factory not initialized")

        return SessionContextManager(self._session_factory)

    def session_scope(self):
        """Get a session context manager (alias for get_session_context)."""
        return self.get_session_context()

    def close(self):
        """Close database connection and cleanup resources."""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")

        self._is_connected = False
        self._session_factory = None

    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._is_connected

    def health_check(self) -> dict:
        """Perform database health check."""
        if not self._is_connected:
            return {"status": "disconnected", "error": "Database not connected"}

        try:
            with self.get_session() as session:
                # Test basic query
                result = session.execute(text("SELECT 1 as test"))
                test_value = result.scalar()

                if test_value == 1:
                    return {
                        "status": "healthy",
                        "response_time_ms": 0,  # Could add timing here
                    }
                else:
                    return {"status": "unhealthy", "error": "Unexpected test result"}

        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


class SessionContextManager:
    """Context manager for database sessions."""

    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.session = None

    def __enter__(self):
        """Enter session context."""
        self.session = self.session_factory()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit session context with proper cleanup."""
        if self.session:
            try:
                if exc_type is not None:
                    # Rollback on exception
                    self.session.rollback()
                    logger.error(f"Session rolled back due to exception: {exc_val}")
                else:
                    # Commit on success
                    self.session.commit()
            except Exception as e:
                logger.error(f"Error during session cleanup: {e}")
                self.session.rollback()
            finally:
                self.session.close()
                self.session = None


# Global connection manager instance - will be initialized when needed
connection_manager = None
