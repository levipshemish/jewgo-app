# !/usr/bin/env python3
"""Database connection manager for JewGo App.
This module handles database connections, session management, and connection pooling.
Separated from business logic to follow single responsibility principle.
"""
import os
import time
from typing import Optional, Dict, Any
from urllib.parse import urlparse
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import v5 metrics collection
try:
    # from utils.metrics_collector_v5 import MetricsCollector  # Module not found
    MetricsCollector = None  # Define as None since module not found
    METRICS_AVAILABLE = False
except ImportError:
    MetricsCollector = None
    METRICS_AVAILABLE = False
# Import ConfigManager at module level
try:
    from utils.unified_database_config import UnifiedDatabaseConfig as ConfigManager
except ImportError:
    logger.warning("UnifiedDatabaseConfig not available, using fallback")
    import os
    
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
    """Manages database connections, sessions, and connection pooling with v5 enhancements."""

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
        
        # v5 enhancements: metrics and monitoring
        self._metrics_collector = MetricsCollector() if METRICS_AVAILABLE else None
        self._connection_stats = {
            "total_connections": 0,
            "active_connections": 0,
            "failed_connections": 0,
            "connection_time_avg_ms": 0,
            "last_connection_time": None,
            "health_check_count": 0,
            "health_check_failures": 0
        }

    # Removed duplicate boolean health_check; structured health_check is defined below

    def connect(self) -> bool:
        """Establish database connection with retry logic and v5 metrics."""
        if self._is_connected:
            # Perform health check to ensure connection is still valid
            if self.health_check():
                logger.info("Database already connected and healthy")
                return True
            else:
                logger.warning("Database connection unhealthy, reconnecting")
                self._is_connected = False
        
        connection_start = time.time()
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
                
                # v5: Update connection metrics
                connection_time = (time.time() - connection_start) * 1000
                self._connection_stats["total_connections"] += 1
                self._connection_stats["active_connections"] += 1
                self._connection_stats["connection_time_avg_ms"] = (
                    (self._connection_stats["connection_time_avg_ms"] * 
                     (self._connection_stats["total_connections"] - 1) + connection_time) /
                    self._connection_stats["total_connections"]
                )
                self._connection_stats["last_connection_time"] = time.time()
                
                if self._metrics_collector:
                    self._metrics_collector.record_database_connection(
                        success=True,
                        duration_ms=connection_time
                    )
                
                logger.info("Database connection established successfully", 
                          extra={"connection_time_ms": connection_time})
                
                # Mark startup as complete and recreate engine with full settings if needed
                if not hasattr(self, '_startup_complete'):
                    self._startup_complete = True
                    # Optionally recreate engine with full pool settings
                    # This could be done on first heavy load instead
                
                return True
            except Exception as e:
                self._connection_attempts += 1
                self._connection_stats["failed_connections"] += 1
                
                if self._metrics_collector:
                    self._metrics_collector.record_database_connection(
                        success=False,
                        error=str(e)
                    )
                
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
        # Build connection arguments with optimized timeouts for startup
        connect_args = {
            "connect_timeout": 5,  # Reduced from 10 for faster startup
            "application_name": "jewgo_app",
        }
        # Check if using provider pooled connection (which may not support statement_timeout)
        is_api_pooler = (
            "pooler" in parsed_url.hostname if parsed_url.hostname else False
        )
        if not is_api_pooler:
            # Only add statement_timeout for non-pooled connections
            connect_args["options"] = (
                f"-c statement_timeout={ConfigManager.get_pg_statement_timeout()}"
                f" -c idle_in_transaction_session_timeout={ConfigManager.get_pg_idle_tx_timeout()}"
            )
        else:
            logger.info(
                "Using api.jewgo.app pooled connection - skipping statement_timeout parameter"
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
        # Determine if this is startup phase or runtime
        is_startup = not hasattr(self, '_startup_complete')
        
        if is_startup:
            # Conservative settings for startup
            pool_size = min(ConfigManager.get_db_pool_size(), 3)
            max_overflow = min(ConfigManager.get_db_max_overflow(), 5)
            pool_timeout = min(ConfigManager.get_db_pool_timeout(), 10)
            logger.info("Using startup connection pool settings", 
                       pool_size=pool_size, max_overflow=max_overflow)
        else:
            # Full settings for runtime
            pool_size = ConfigManager.get_db_pool_size()
            max_overflow = ConfigManager.get_db_max_overflow()
            pool_timeout = ConfigManager.get_db_pool_timeout()
            logger.info("Using runtime connection pool settings", 
                       pool_size=pool_size, max_overflow=max_overflow)
        
        # Create engine with appropriate connection pooling
        engine = create_engine(
            self.database_url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
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
        def set_postgresql_optimizations(dbapi_connection, connection_record):
            """Set PostgreSQL optimizations for better performance.
            Wrapped in try/except for pooled providers that may reject SETs.
            """
            if engine.dialect.name == "postgresql":
                try:
                    cursor = dbapi_connection.cursor()
                    cursor.execute("SET statement_timeout = 30000")  # 30 seconds
                    cursor.execute(
                        "SET idle_in_transaction_session_timeout = 60000"
                    )  # 60 seconds
                    cursor.close()
                except Exception:
                    # Non-fatal: leave default settings if SET fails
                    pass

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

    # Removed duplicate simple close; enhanced close is defined below

    def disconnect(self):
        """Disconnect from the database (alias for close)."""
        self.close()

    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._is_connected

    def health_check(self) -> dict:
        """Perform database health check with v5 metrics."""
        if not self._is_connected:
            return {"status": "disconnected", "error": "Database not connected"}
        
        start_time = time.time()
        self._connection_stats["health_check_count"] += 1
        
        try:
            with self.get_session() as session:
                # Test basic query
                result = session.execute(text("SELECT 1 as test"))
                test_value = result.scalar()
                
                response_time_ms = (time.time() - start_time) * 1000
                
                if test_value == 1:
                    if self._metrics_collector:
                        self._metrics_collector.record_database_health_check(
                            success=True,
                            duration_ms=response_time_ms
                        )
                    
                    return {
                        "status": "healthy",
                        "response_time_ms": round(response_time_ms, 2),
                        "connection_stats": self._connection_stats.copy(),
                        "pool_status": self.get_pool_status()
                    }
                else:
                    self._connection_stats["health_check_failures"] += 1
                    return {"status": "unhealthy", "error": "Unexpected test result"}
        except Exception as e:
            self._connection_stats["health_check_failures"] += 1
            
            if self._metrics_collector:
                self._metrics_collector.record_database_health_check(
                    success=False,
                    error=str(e)
                )
            
            return {"status": "unhealthy", "error": str(e)}

    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status information."""
        if not self.engine or not hasattr(self.engine, 'pool'):
            return {"error": "Pool not available"}
        
        try:
            pool = self.engine.pool
            return {
                "size": pool.size(),
                "checked_out": pool.checkedout(),
                "invalid": pool.invalid(),
                "checked_in": pool.checkedin(),
            }
        except Exception as e:
            return {"error": f"Could not get pool status: {e}"}

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get v5 connection statistics."""
        return self._connection_stats.copy()

    def reset_connection_stats(self):
        """Reset v5 connection statistics."""
        self._connection_stats = {
            "total_connections": 0,
            "active_connections": 0,
            "failed_connections": 0,
            "connection_time_avg_ms": 0,
            "last_connection_time": None,
            "health_check_count": 0,
            "health_check_failures": 0
        }
        logger.info("Connection statistics reset")

    def close(self):
        """Close database connection and cleanup resources with v5 metrics."""
        if self.engine:
            self.engine.dispose()
            self._connection_stats["active_connections"] = max(0, self._connection_stats["active_connections"] - 1)
            logger.info("Database connection closed")
        self._is_connected = False
        self._session_factory = None


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


def get_connection_manager() -> DatabaseConnectionManager:
    """Get or create a global connection manager instance."""
    global connection_manager
    if connection_manager is None:
        connection_manager = DatabaseConnectionManager()
        connection_manager.connect()
    return connection_manager
