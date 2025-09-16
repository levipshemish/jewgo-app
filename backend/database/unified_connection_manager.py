#!/usr/bin/env python3
"""
Unified Database Connection Manager for JewGo App.

This module consolidates all database connection management patterns across the application
into a single, consistent interface. It replaces the multiple connection managers with
a unified approach that provides:

- Consistent session management
- Connection pooling optimization  
- Error handling and retry logic
- Health monitoring
- Performance metrics
- Transaction management
- Connection lifecycle management

This manager serves as the single source of truth for all database connections.
"""

import os
import time
import threading
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union, Callable
from urllib.parse import urlparse
from datetime import datetime

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import (
    SQLAlchemyError, 
    OperationalError
)

from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import configuration manager
try:
    from utils.unified_database_config import UnifiedDatabaseConfig as ConfigManager
except ImportError:
    logger.warning("UnifiedDatabaseConfig not available, using fallback")
    
    class ConfigManager:
        @staticmethod
        def get_database_url():
            url = os.getenv("DATABASE_URL")
            if not url and os.getenv("FLASK_ENV") == "production":
                raise RuntimeError("DATABASE_URL is required in production")
            return url

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
            return os.getenv("PGSSLMODE", "prefer")

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


class ConnectionMetrics:
    """Connection metrics collector for monitoring database performance."""
    
    def __init__(self):
        self.connection_count = 0
        self.active_connections = 0
        self.total_queries = 0
        self.failed_queries = 0
        self.query_times = []
        self.connection_errors = []
        self._lock = threading.Lock()
    
    def record_connection(self):
        with self._lock:
            self.connection_count += 1
            self.active_connections += 1
    
    def record_disconnection(self):
        with self._lock:
            self.active_connections = max(0, self.active_connections - 1)
    
    def record_query(self, execution_time: float, success: bool = True):
        with self._lock:
            self.total_queries += 1
            self.query_times.append(execution_time)
            if not success:
                self.failed_queries += 1
            
            # Keep only last 1000 query times for memory efficiency
            if len(self.query_times) > 1000:
                self.query_times = self.query_times[-1000:]
    
    def record_error(self, error: Exception):
        with self._lock:
            self.connection_errors.append({
                'error': str(error),
                'type': type(error).__name__,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Keep only last 100 errors for memory efficiency
            if len(self.connection_errors) > 100:
                self.connection_errors = self.connection_errors[-100:]
    
    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            avg_query_time = sum(self.query_times) / len(self.query_times) if self.query_times else 0
            return {
                'total_connections': self.connection_count,
                'active_connections': self.active_connections,
                'total_queries': self.total_queries,
                'failed_queries': self.failed_queries,
                'success_rate': (self.total_queries - self.failed_queries) / max(1, self.total_queries),
                'average_query_time': avg_query_time,
                'recent_errors': self.connection_errors[-10:] if self.connection_errors else []
            }


class UnifiedConnectionManager:
    """
    Unified database connection manager that consolidates all connection patterns.
    
    This class provides a single interface for all database operations across the application,
    replacing the multiple connection managers with consistent behavior.
    """
    
    def __init__(self, database_url: Optional[str] = None, **config):
        """
        Initialize the unified connection manager.
        
        Args:
            database_url: Database connection URL. If not provided, uses DATABASE_URL env var.
            **config: Additional configuration options
        """
        self.database_url = database_url or ConfigManager.get_database_url()
        self.config = config
        
        # Validate database URL
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Fix database URL format if needed
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://")
            logger.info("Fixed database URL format from postgres:// to postgresql://")
        
        # Initialize components
        self.engine = None
        self.SessionLocal = None
        self._is_connected = False
        self._connection_lock = threading.Lock()
        self.metrics = ConnectionMetrics()
        
        logger.info("Unified connection manager initialized")
    
    def connect(self) -> bool:
        """
        Establish database connection with optimized configuration.
        
        Returns:
            True if connection successful, False otherwise
        """
        with self._connection_lock:
            if self._is_connected and self.engine:
                return True
            
            try:
                # Build connection arguments
                connect_args = self._build_connect_args()
                
                # Create engine with optimized configuration
                self.engine = create_engine(
                    self.database_url,
                    poolclass=QueuePool,
                    pool_size=ConfigManager.get_db_pool_size(),
                    max_overflow=ConfigManager.get_db_max_overflow(),
                    pool_timeout=ConfigManager.get_db_pool_timeout(),
                    pool_recycle=ConfigManager.get_db_pool_recycle(),
                    pool_pre_ping=True,  # Validate connections before use
                    connect_args=connect_args,
                    echo=os.getenv('DB_ECHO', 'false').lower() == 'true',
                    future=True  # Use SQLAlchemy 2.0 style
                )
                
                # Register event listeners
                self._register_event_listeners()
                
                # Test connection
                self._test_connection()
                
                # Create session factory
                self._create_session_factory()
                
                self._is_connected = True
                self.metrics.record_connection()
                
                logger.info("Database connection established successfully")
                return True
                
            except Exception as e:
                logger.error(f"Failed to establish database connection: {e}")
                self.metrics.record_error(e)
                self._is_connected = False
                return False
    
    def disconnect(self):
        """Cleanly disconnect from database."""
        with self._connection_lock:
            if self.engine:
                self.engine.dispose()
                self.engine = None
            
            if self.SessionLocal:
                self.SessionLocal.remove()
                self.SessionLocal = None
            
            self._is_connected = False
            self.metrics.record_disconnection()
            logger.info("Database connection closed")
    
    def is_connected(self) -> bool:
        """Check if database connection is active."""
        return self._is_connected and self.engine is not None
    
    @contextmanager
    def session_scope(self):
        """
        Context manager for database sessions with comprehensive error handling.
        
        This is the recommended way to perform database operations.
        
        Yields:
            Session: SQLAlchemy session object
            
        Example:
            with connection_manager.session_scope() as session:
                result = session.execute(text("SELECT * FROM users"))
                return result.fetchall()
        """
        if not self.is_connected():
            if not self.connect():
                raise RuntimeError("Failed to establish database connection")
        
        session = self.get_session()
        start_time = time.time()
        
        try:
            yield session
            session.commit()
            
            execution_time = time.time() - start_time
            self.metrics.record_query(execution_time, success=True)
            
        except OperationalError as e:
            session.rollback()
            execution_time = time.time() - start_time
            self.metrics.record_query(execution_time, success=False)
            self.metrics.record_error(e)
            
            logger.error(f"Database operational error: {e}")
            
            # Try to reconnect on connection errors
            if self._is_connection_error(e):
                logger.info("Attempting to reconnect to database")
                self.disconnect()
                if self.connect():
                    logger.info("Database reconnection successful")
                else:
                    logger.error("Database reconnection failed")
            
            raise
            
        except SQLAlchemyError as e:
            session.rollback()
            execution_time = time.time() - start_time
            self.metrics.record_query(execution_time, success=False)
            self.metrics.record_error(e)
            
            logger.error(f"Database error: {e}")
            raise
            
        except Exception as e:
            session.rollback()
            execution_time = time.time() - start_time
            self.metrics.record_query(execution_time, success=False)
            self.metrics.record_error(e)
            
            logger.error(f"Unexpected error in database operation: {e}")
            raise
            
        finally:
            session.close()
    
    def get_session(self) -> Session:
        """
        Get a new database session.
        
        Returns:
            Session: SQLAlchemy session object
            
        Raises:
            RuntimeError: If database connection is not established
        """
        if not self.is_connected():
            if not self.connect():
                raise RuntimeError("Database not connected. Failed to establish connection.")
        
        if not self.SessionLocal:
            raise RuntimeError("Session factory not initialized")
        
        return self.SessionLocal()
    
    def execute_query(
        self, 
        query: str, 
        params: Optional[Dict[str, Any]] = None,
        fetch_mode: str = 'all'
    ) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        """
        Execute a query with automatic session management.
        
        Args:
            query: SQL query string
            params: Query parameters
            fetch_mode: 'all', 'one', or 'none' for different fetch modes
            
        Returns:
            Query results based on fetch_mode
        """
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            
            if fetch_mode == 'all':
                rows = result.fetchall()
                return [dict(row._mapping) for row in rows] if rows else []
            elif fetch_mode == 'one':
                row = result.fetchone()
                return dict(row._mapping) if row else None
            else:  # fetch_mode == 'none'
                return None
    
    def execute_transaction(self, operations: List[Callable[[Session], Any]]) -> List[Any]:
        """
        Execute multiple operations in a single transaction.
        
        Args:
            operations: List of functions that take a session and return a result
            
        Returns:
            List of results from each operation
        """
        results = []
        
        with self.session_scope() as session:
            for operation in operations:
                result = operation(session)
                results.append(result)
        
        return results
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check.
        
        Returns:
            Health status dictionary with detailed information
        """
        try:
            # Test basic connectivity
            start_time = time.time()
            
            with self.session_scope() as session:
                result = session.execute(text("SELECT 1 as health_check"))
                result.fetchone()
            
            response_time = time.time() - start_time
            stats = self.metrics.get_stats()
            
            return {
                'status': 'healthy',
                'response_time': response_time,
                'connected': self.is_connected(),
                'database_url_host': urlparse(self.database_url).hostname,
                'metrics': stats,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.metrics.record_error(e)
            logger.error(f"Database health check failed: {e}")
            
            return {
                'status': 'unhealthy',
                'error': str(e),
                'connected': self.is_connected(),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get detailed connection information."""
        if not self.engine:
            return {'status': 'not_connected'}
        
        pool = self.engine.pool
        
        return {
            'status': 'connected' if self.is_connected() else 'disconnected',
            'database_url': self.database_url.split('@')[1] if '@' in self.database_url else 'hidden',
            'pool_size': pool.size(),
            'checked_out_connections': pool.checkedout(),
            'overflow_connections': pool.overflow(),
            'invalid_connections': pool.invalidated(),
            'metrics': self.metrics.get_stats()
        }
    
    def _build_connect_args(self) -> Dict[str, Any]:
        """Build connection arguments for the database engine."""
        connect_args = {}
        
        # PostgreSQL-specific connection arguments
        if 'postgresql' in self.database_url:
            # Note: Basic connection arguments disabled due to DSN compatibility issues
            # The statement_timeout and related parameters were causing connection failures
            # when passed as connection arguments. Future implementation should use
            # server-side configuration or session-level settings instead.
            pass
            
            # SSL configuration
            ssl_mode = ConfigManager.get_pg_sslmode()
            if ssl_mode:
                connect_args['sslmode'] = ssl_mode
            
            ssl_cert = ConfigManager.get_pg_sslrootcert()
            if ssl_cert:
                connect_args['sslrootcert'] = ssl_cert
        
        return connect_args
    
    def _register_event_listeners(self):
        """Register SQLAlchemy event listeners for monitoring and logging."""
        
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set database-specific pragmas and settings."""
            if 'sqlite' in self.database_url:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
        
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout."""
            logger.debug("Connection checked out from pool")
        
        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Log connection checkin."""
            logger.debug("Connection checked in to pool")
    
    def _test_connection(self):
        """Test database connection."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            logger.info("Database connection test successful")
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            raise
    
    def _create_session_factory(self):
        """Create SQLAlchemy session factory."""
        self.SessionLocal = scoped_session(
            sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine,
                expire_on_commit=False,
            )
        )
    
    def _is_connection_error(self, error: Exception) -> bool:
        """Check if error is a connection-related error that warrants reconnection."""
        connection_error_messages = [
            'server closed the connection unexpectedly',
            'connection to server',
            'could not connect to server',
            'connection timed out',
            'connection reset by peer'
        ]
        
        error_str = str(error).lower()
        return any(msg in error_str for msg in connection_error_messages)


# Global instance management
_unified_connection_manager = None
_manager_lock = threading.Lock()


def get_unified_connection_manager() -> UnifiedConnectionManager:
    """
    Get the global unified connection manager instance.
    
    Returns:
        UnifiedConnectionManager: Global connection manager instance
    """
    global _unified_connection_manager
    
    with _manager_lock:
        if _unified_connection_manager is None:
            _unified_connection_manager = UnifiedConnectionManager()
            
            # Establish initial connection
            if not _unified_connection_manager.connect():
                logger.warning("Failed to establish initial database connection")
        
        return _unified_connection_manager


def reset_unified_connection_manager():
    """Reset the global connection manager (useful for testing)."""
    global _unified_connection_manager
    
    with _manager_lock:
        if _unified_connection_manager:
            _unified_connection_manager.disconnect()
        _unified_connection_manager = None


# Convenience aliases for backward compatibility
UnifiedDatabaseManager = UnifiedConnectionManager
get_connection_manager = get_unified_connection_manager
