#!/usr/bin/env python3
"""
Consolidated Database Connection Manager for JewGo App.
====================================================

This module consolidates the functionality from both:
- backend/database/connection_manager.py
- backend/utils/database_connection_manager.py

Eliminating ~400 lines of duplicate code while preserving all features.

Key Features:
- Unified session creation and management
- Context manager for automatic session handling
- Retry logic for database operations
- Connection pooling and SSL configuration
- Comprehensive error handling
- Support for both direct SQL and ORM operations
- Health checks and monitoring
- Backward compatibility with existing code

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
    result = db_manager.execute_query(
        "SELECT * FROM restaurants WHERE city = :city",
        {"city": "Miami"}
    )

Author: JewGo Development Team
Version: 2.0 (Consolidated)
Last Updated: 2024
"""

import os
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import ConfigManager at module level
try:
    from utils.unified_database_config import UnifiedDatabaseConfig as ConfigManager
except ImportError:
    # Fallback for when utils module is not available
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
    """
    Consolidated database connection manager with comprehensive session management.
    Combines features from both previous implementations.
    """

    def __init__(self, database_url: Optional[str] = None) -> None:
        """
        Initialize database connection manager with connection string.
        
        Args:
            database_url: Database connection URL. If not provided, uses DATABASE_URL environment variable.
        """
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
        
        logger.info(
            "Database connection manager initialized",
            database_url=self.database_url[:50] + "...",
        )

    def connect(self) -> bool:
        """
        Connect to the database and create session factory.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        if self._is_connected:
            logger.info("Database already connected")
            return True
            
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
                attempt=self._connection_attempts + 1,
            )
            return False

    def _configure_ssl(self) -> None:
        """Configure SSL settings for database connection."""
        # Parse the database URL to check if it's local
        parsed = urlparse(self.database_url)
        is_local = parsed.hostname in ('localhost', '127.0.0.1', '::1')
        
        if not is_local:
            # Force SSL for remote connections
            if 'sslmode' not in self.database_url:
                if '?' in self.database_url:
                    self.database_url += '&sslmode=require'
                else:
                    self.database_url += '?sslmode=require'
                logger.info("Added SSL requirement for remote database connection")

    def _create_engine(self) -> None:
        """Create SQLAlchemy engine with optimized settings."""
        # Get configuration values
        pool_size = ConfigManager.get_db_pool_size()
        max_overflow = ConfigManager.get_db_max_overflow()
        pool_timeout = ConfigManager.get_db_pool_timeout()
        pool_recycle = ConfigManager.get_db_pool_recycle()
        
        # Connection arguments for PostgreSQL
        connect_args = {
            "keepalives_idle": ConfigManager.get_pg_keepalives_idle(),
            "keepalives_interval": ConfigManager.get_pg_keepalives_interval(),
            "keepalives_count": ConfigManager.get_pg_keepalives_count(),
            "statement_timeout": ConfigManager.get_pg_statement_timeout(),
            "idle_in_transaction_session_timeout": ConfigManager.get_pg_idle_tx_timeout(),
        }
        
        # Add SSL configuration if specified
        ssl_mode = ConfigManager.get_pg_sslmode()
        ssl_root_cert = ConfigManager.get_pg_sslrootcert()
        
        if ssl_mode and ssl_mode != 'disable':
            connect_args["sslmode"] = ssl_mode
            if ssl_root_cert:
                connect_args["sslrootcert"] = ssl_root_cert
        
        # Create engine with optimized settings
        self.engine = create_engine(
            self.database_url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
            pool_recycle=pool_recycle,
            pool_pre_ping=True,
            echo=False,  # Set to True for SQL debugging
            connect_args=connect_args,
        )
        
        # Add connection event listeners
        self._add_connection_listeners()
        
        logger.info(
            "Database engine created",
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
        )

    def _add_connection_listeners(self) -> None:
        """Add SQLAlchemy event listeners for connection monitoring."""
        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Log new database connections."""
            logger.debug("New database connection established")
            
            # Set PostgreSQL-specific connection parameters
            try:
                with dbapi_connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = %s", (ConfigManager.get_pg_statement_timeout(),))
                    cursor.execute("SET idle_in_transaction_session_timeout = %s", (ConfigManager.get_pg_idle_tx_timeout(),))
            except Exception:
                # Non-fatal: leave default settings if SET fails
                pass

        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout events."""
            logger.debug("Database connection checked out")

        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Log connection checkin events."""
            logger.debug("Database connection checked in")

    def _test_connection(self) -> None:
        """Test database connectivity."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text("SELECT 1"))
                test_value = result.scalar()
                if test_value != 1:
                    raise Exception("Database connectivity test failed")
                logger.info("Database connectivity test passed")
        except Exception as e:
            logger.error("Database connectivity test failed", error=str(e))
            raise

    def _create_session_factory(self) -> None:
        """Create session factory for database sessions."""
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autocommit=False,
            autoflush=False,
        )
        self._session_factory = self.SessionLocal
        logger.info("Session factory created")

    def get_session(self) -> Session:
        """Get a new database session."""
        if not self._is_connected:
            raise RuntimeError("Database not connected. Call connect() first.")
        if not self._session_factory:
            raise RuntimeError("Session factory not initialized")
        return self._session_factory()

    @contextmanager
    def session_scope(self):
        """
        Context manager for database sessions with automatic cleanup.
        
        Yields:
            Session: Database session
            
        Example:
            with db_manager.session_scope() as session:
                result = session.execute(text("SELECT * FROM restaurants"))
                return result.fetchall()
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_session_context(self):
        """Get a session context manager (alias for session_scope)."""
        return self.session_scope()

    def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a SELECT query and return results.
        
        Args:
            query: SQL SELECT query string
            params: Query parameters (optional)
            
        Returns:
            List[Dict[str, Any]]: Query results as list of dictionaries
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            columns = result.keys()
            return [dict(zip(columns, row)) for row in result.fetchall()]

    def execute_update(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Execute an UPDATE/DELETE query and return affected row count.
        
        Args:
            query: SQL UPDATE/DELETE query string
            params: Query parameters (optional)
            
        Returns:
            int: Number of affected rows
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            return result.rowcount

    def execute_insert(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Execute an INSERT query and return the inserted ID.
        
        Args:
            query: SQL INSERT query string
            params: Query parameters (optional)
            
        Returns:
            Any: Inserted ID or result
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            session.commit()
            return result

    def with_retry(self, fn, retries: int = 2, delay: float = 0.2):
        """
        Retry function with exponential backoff for OperationalError.
        
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
        """
        Perform comprehensive database health check.
        
        Returns:
            Dict[str, Any]: Health check results including:
                - status: "healthy" or "unhealthy"
                - test_result: Basic connectivity test result
                - version: PostgreSQL version
                - connection_count: Current active connections
                - connected: Connection manager state
                - error: Error details if unhealthy
        """
        if not self._is_connected:
            return {
                "status": "disconnected",
                "error": "Database not connected",
                "connected": False
            }
        
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

    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._is_connected

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

    def disconnect(self) -> None:
        """Disconnect from database (alias for close method for backward compatibility)."""
        self.close()

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
    """
    Get or create global database connection manager instance.
    
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


# Backward compatibility aliases
connection_manager = get_db_manager
