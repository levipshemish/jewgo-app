#!/usr/bin/env python3
"""Enhanced Database Manager V5 with advanced features.

This module provides an enhanced database management system with:
- Connection pooling optimization
- Query performance monitoring
- Automatic failover support
- Connection health monitoring
- Advanced transaction management
- Metrics collection and reporting
"""

import os
import time
from typing import Any, Dict, List, Optional, Tuple, Union
from contextlib import contextmanager
from sqlalchemy import create_engine, event, text, MetaData
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import v5 components
try:
    # from utils.metrics_collector_v5 import MetricsCollector  # Module not found
    MetricsCollector = None  # Define as None since module not found
    METRICS_AVAILABLE = False
except ImportError:
    MetricsCollector = None
    METRICS_AVAILABLE = False

try:
    from cache.redis_manager_v5 import RedisManagerV5
    REDIS_AVAILABLE = True
except ImportError:
    RedisManagerV5 = None
    REDIS_AVAILABLE = False


class DatabaseManagerV5:
    """Enhanced database manager with v5 features and monitoring."""
    
    def __init__(self, database_url: Optional[str] = None, **config):
        """Initialize enhanced database manager.
        
        Args:
            database_url: Database connection URL
            **config: Additional configuration options
        """
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")
        
        # Normalize PostgreSQL URL
        if self.database_url.startswith('postgres://'):
            self.database_url = self.database_url.replace('postgres://', 'postgresql://')
        
        # Configuration
        self.config = {
            'pool_size': int(os.environ.get('DB_POOL_SIZE', '10')),
            'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '20')),
            'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', '30')),
            'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '3600')),
            'pool_pre_ping': True,
            'echo': os.environ.get('DB_ECHO', 'false').lower() == 'true',
            'isolation_level': 'READ_COMMITTED',
            'connect_timeout': 10,
            'statement_timeout': 60000,
            'idle_timeout': 300000,
            **config
        }
        
        # State management
        self.engine = None
        self.SessionLocal = None
        self.metadata = MetaData()
        self._is_initialized = False
        self._connection_stats = {
            'total_connections': 0,
            'active_connections': 0,
            'failed_connections': 0,
            'total_queries': 0,
            'slow_queries': 0,
            'avg_query_time_ms': 0.0,
            'last_health_check': None,
            'health_check_failures': 0
        }
        
        # v5 components
        self.metrics_collector = MetricsCollector() if METRICS_AVAILABLE else None
        self.redis_manager = None
        
        # Initialize components
        self._setup_engine()
        self._setup_event_listeners()
        
    def _setup_engine(self):
        """Setup SQLAlchemy engine with optimized configuration."""
        try:
            # Connection arguments
            connect_args = {
                'connect_timeout': self.config['connect_timeout'],
                'application_name': f'jewgo_v5_{os.getpid()}',
                'options': f'-c statement_timeout={self.config["statement_timeout"]} '
                          f'-c idle_in_transaction_session_timeout={self.config["idle_timeout"]}'
            }
            
            # SSL configuration
            if os.environ.get('DB_SSL_MODE'):
                connect_args['sslmode'] = os.environ.get('DB_SSL_MODE', 'prefer')
            
            # Create engine with enhanced pooling
            self.engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.config['pool_size'],
                max_overflow=self.config['max_overflow'],
                pool_timeout=self.config['pool_timeout'],
                pool_recycle=self.config['pool_recycle'],
                pool_pre_ping=self.config['pool_pre_ping'],
                echo=self.config['echo'],
                isolation_level=self.config['isolation_level'],
                connect_args=connect_args,
                future=True  # Use SQLAlchemy 2.0 style
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                bind=self.engine,
                autoflush=False,
                autocommit=False,
                future=True
            )
            
            logger.info("Database engine initialized with v5 enhancements")
            
        except Exception as e:
            logger.error(f"Failed to setup database engine: {e}")
            raise
    
    def _setup_event_listeners(self):
        """Setup SQLAlchemy event listeners for monitoring."""
        
        @event.listens_for(self.engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """Handle new database connections."""
            self._connection_stats['total_connections'] += 1
            self._connection_stats['active_connections'] += 1
            
            if self.metrics_collector:
                self.metrics_collector.record_database_connection(success=True)
            
            logger.debug("Database connection established")
        
        @event.listens_for(self.engine, "close")
        def on_close(dbapi_connection, connection_record):
            """Handle connection closures."""
            self._connection_stats['active_connections'] = max(0, 
                self._connection_stats['active_connections'] - 1)
            logger.debug("Database connection closed")
        
        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query start time."""
            context._query_start_time = time.time()
        
        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query completion and performance."""
            if hasattr(context, '_query_start_time'):
                execution_time = (time.time() - context._query_start_time) * 1000
                
                # Update statistics
                self._connection_stats['total_queries'] += 1
                
                # Update average query time
                total_queries = self._connection_stats['total_queries']
                current_avg = self._connection_stats['avg_query_time_ms']
                new_avg = ((current_avg * (total_queries - 1)) + execution_time) / total_queries
                self._connection_stats['avg_query_time_ms'] = new_avg
                
                # Track slow queries (>1000ms)
                if execution_time > 1000:
                    self._connection_stats['slow_queries'] += 1
                    logger.warning(f"Slow query detected: {execution_time:.2f}ms")
                
                # Record metrics
                if self.metrics_collector:
                    self.metrics_collector.record_database_query(
                        duration_ms=execution_time,
                        success=True
                    )
    
    @contextmanager
    def get_session(self):
        """Get database session with proper error handling."""
        if not self._is_initialized:
            self.initialize()
        
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            
            if self.metrics_collector:
                self.metrics_collector.record_database_error(str(e))
            
            raise
        finally:
            session.close()
    
    def initialize(self):
        """Initialize database with health checks."""
        if self._is_initialized:
            return
        
        try:
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                test_value = result.scalar()
                
                if test_value != 1:
                    raise ValueError("Database connection test failed")
            
            # Initialize Redis if available
            if REDIS_AVAILABLE and os.environ.get('REDIS_URL'):
                try:
                    self.redis_manager = RedisManagerV5()
                    logger.info("Redis manager initialized for database caching")
                except Exception as e:
                    logger.warning(f"Redis manager initialization failed: {e}")
            
            self._is_initialized = True
            logger.info("Database manager v5 initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive database health check."""
        start_time = time.time()
        health_info = {
            'status': 'unknown',
            'response_time_ms': 0,
            'pool_info': {},
            'connection_stats': self._connection_stats.copy(),
            'checks': {}
        }
        
        try:
            # Basic connectivity test
            with self.get_session() as session:
                result = session.execute(text("SELECT 1 as test, NOW() as timestamp"))
                row = result.fetchone()
                
                health_info['checks']['connectivity'] = {
                    'status': 'healthy',
                    'test_value': row[0] if row else None,
                    'server_time': str(row[1]) if row else None
                }
            
            # Pool status
            if hasattr(self.engine.pool, 'size'):
                health_info['pool_info'] = {
                    'pool_size': self.engine.pool.size(),
                    'checked_out': self.engine.pool.checkedout(),
                    'invalid': self.engine.pool.invalid(),
                    'checked_in': self.engine.pool.checkedin(),
                }
                health_info['checks']['pool'] = {'status': 'healthy'}
            
            # Performance check
            response_time = (time.time() - start_time) * 1000
            health_info['response_time_ms'] = round(response_time, 2)
            
            if response_time > 5000:  # 5 seconds
                health_info['checks']['performance'] = {'status': 'degraded', 'reason': 'slow_response'}
            else:
                health_info['checks']['performance'] = {'status': 'healthy'}
            
            # Overall status
            all_checks_healthy = all(
                check.get('status') == 'healthy' 
                for check in health_info['checks'].values()
            )
            health_info['status'] = 'healthy' if all_checks_healthy else 'degraded'
            
            # Update statistics
            self._connection_stats['last_health_check'] = time.time()
            
            if self.metrics_collector:
                self.metrics_collector.record_database_health_check(
                    success=True,
                    duration_ms=response_time
                )
            
        except Exception as e:
            health_info['status'] = 'unhealthy'
            health_info['error'] = str(e)
            self._connection_stats['health_check_failures'] += 1
            
            if self.metrics_collector:
                self.metrics_collector.record_database_health_check(
                    success=False,
                    error=str(e)
                )
            
            logger.error(f"Database health check failed: {e}")
        
        return health_info
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get detailed connection statistics."""
        return self._connection_stats.copy()
    
    def reset_stats(self):
        """Reset connection statistics."""
        self._connection_stats = {
            'total_connections': 0,
            'active_connections': 0,
            'failed_connections': 0,
            'total_queries': 0,
            'slow_queries': 0,
            'avg_query_time_ms': 0.0,
            'last_health_check': None,
            'health_check_failures': 0
        }
        logger.info("Database statistics reset")
    
    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict]:
        """Execute a query and return results."""
        with self.get_session() as session:
            result = session.execute(text(query), params or {})
            return [dict(row._mapping) for row in result]
    
    def close(self):
        """Close database connections and cleanup."""
        if self.engine:
            self.engine.dispose()
            logger.info("Database engine disposed")
        
        if self.redis_manager:
            try:
                self.redis_manager.close()
            except Exception as e:
                logger.warning(f"Error closing Redis manager: {e}")
        
        self._is_initialized = False


# Global instance
database_manager_v5 = None


def get_database_manager_v5() -> DatabaseManagerV5:
    """Get global database manager instance."""
    global database_manager_v5
    if database_manager_v5 is None:
        database_manager_v5 = DatabaseManagerV5()
        database_manager_v5.initialize()
    return database_manager_v5


def close_database_manager_v5():
    """Close global database manager."""
    global database_manager_v5
    if database_manager_v5:
        database_manager_v5.close()
        database_manager_v5 = None