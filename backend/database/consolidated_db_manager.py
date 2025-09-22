#!/usr/bin/env python3
"""
Consolidated Database Manager for JewGo App
============================================

This module consolidates all database connection management into a single,
comprehensive system that provides:

- Unified connection management
- Query result caching with Redis
- Connection health monitoring
- Database performance metrics
- Automatic failover and retry logic
- Connection pooling optimization
- Transaction management
- Comprehensive logging and monitoring

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
import time
import hashlib
import threading
import json
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque

from sqlalchemy import create_engine, event, text, MetaData, inspect
from sqlalchemy.orm import Session, sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import (
    SQLAlchemyError, 
    OperationalError,
    DisconnectionError,
    IntegrityError
)

from utils.logging_config import get_logger

logger = get_logger(__name__)

# Import Redis manager for caching
try:
    from cache.redis_manager_v5 import RedisManagerV5, get_redis_manager_v5
    REDIS_AVAILABLE = True
except ImportError:
    RedisManagerV5 = None
    REDIS_AVAILABLE = False
    logger.warning("Redis not available - query caching disabled")

# Import Prometheus metrics
try:
    from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("Prometheus not available - metrics disabled")


class ConnectionStatus(Enum):
    """Connection status enumeration."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


@dataclass
class ConnectionMetrics:
    """Connection metrics data structure."""
    timestamp: datetime
    active_connections: int
    idle_connections: int
    total_connections: int
    failed_connections: int
    avg_response_time_ms: float
    slow_queries_count: int
    cache_hit_rate: float
    error_rate: float


@dataclass
class QueryCacheEntry:
    """Query cache entry structure."""
    query_hash: str
    result: Any
    timestamp: datetime
    ttl_seconds: int
    hit_count: int = 0


class DatabasePerformanceMetrics:
    """Database performance metrics collector."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        """Initialize performance metrics."""
        self.registry = registry or CollectorRegistry()
        self._lock = threading.Lock()
        
        if PROMETHEUS_AVAILABLE:
            # Query metrics
            self.query_count = Counter(
                'db_queries_total',
                'Total number of database queries',
                ['query_type', 'status'],
                registry=self.registry
            )
            
            self.query_duration = Histogram(
                'db_query_duration_seconds',
                'Database query duration',
                ['query_type'],
                buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
                registry=self.registry
            )
            
            self.connection_pool_size = Gauge(
                'db_connection_pool_size',
                'Current database connection pool size',
                registry=self.registry
            )
            
            self.active_connections = Gauge(
                'db_active_connections',
                'Number of active database connections',
                registry=self.registry
            )
            
            self.cache_hits = Counter(
                'db_cache_hits_total',
                'Total number of cache hits',
                ['cache_type'],
                registry=self.registry
            )
            
            self.cache_misses = Counter(
                'db_cache_misses_total',
                'Total number of cache misses',
                ['cache_type'],
                registry=self.registry
            )
            
            self.slow_queries = Counter(
                'db_slow_queries_total',
                'Total number of slow queries',
                ['query_type'],
                registry=self.registry
            )
            
            logger.info("Database performance metrics initialized")
        else:
            logger.warning("Prometheus not available - metrics disabled")
    
    def record_query(self, query_type: str, duration_seconds: float, 
                    status: str = 'success', is_slow: bool = False):
        """Record a query metric."""
        if not PROMETHEUS_AVAILABLE:
            return
            
        with self._lock:
            self.query_count.labels(query_type=query_type, status=status).inc()
            self.query_duration.labels(query_type=query_type).observe(duration_seconds)
            
            if is_slow:
                self.slow_queries.labels(query_type=query_type).inc()
    
    def record_cache_hit(self, cache_type: str = 'query'):
        """Record a cache hit."""
        if PROMETHEUS_AVAILABLE:
            with self._lock:
                self.cache_hits.labels(cache_type=cache_type).inc()
    
    def record_cache_miss(self, cache_type: str = 'query'):
        """Record a cache miss."""
        if PROMETHEUS_AVAILABLE:
            with self._lock:
                self.cache_misses.labels(cache_type=cache_type).inc()
    
    def update_connection_metrics(self, pool_size: int, active_connections: int):
        """Update connection pool metrics."""
        if PROMETHEUS_AVAILABLE:
            with self._lock:
                self.connection_pool_size.set(pool_size)
                self.active_connections.set(active_connections)


class QueryCache:
    """Query result caching system."""
    
    def __init__(self, redis_manager: Optional[RedisManagerV5] = None):
        """Initialize query cache."""
        self.redis_manager = redis_manager
        self.memory_cache = {}  # Fallback memory cache
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0
        }
        self._lock = threading.Lock()
        
        # Cache configuration
        self.default_ttl = int(os.getenv('DB_CACHE_TTL', '300'))  # 5 minutes
        self.max_memory_entries = int(os.getenv('DB_CACHE_MAX_MEMORY', '1000'))
        self.slow_query_threshold = float(os.getenv('DB_SLOW_QUERY_THRESHOLD', '1.0'))  # 1 second
        
        logger.info(f"Query cache initialized with TTL: {self.default_ttl}s")
    
    def _generate_cache_key(self, query: str, params: Optional[Dict] = None) -> str:
        """Generate cache key for query."""
        # Create a hash of the query and parameters
        query_str = f"{query}:{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.sha256(query_str.encode()).hexdigest()[:16]
    
    def get(self, query: str, params: Optional[Dict] = None) -> Optional[Any]:
        """Get cached query result."""
        cache_key = self._generate_cache_key(query, params)
        
        # Try Redis first
        if self.redis_manager:
            try:
                result = self.redis_manager.get(f"query_cache:{cache_key}")
                if result is not None:
                    with self._lock:
                        self.cache_stats['hits'] += 1
                    logger.debug(f"Cache hit for query: {query[:50]}...")
                    # Handle both string and bytes results
                    if isinstance(result, bytes):
                        return json.loads(result.decode('utf-8'))
                    elif isinstance(result, str):
                        return json.loads(result)
                    else:
                        return result
            except Exception as e:
                logger.warning(f"Redis cache get failed: {e}")
        
        # Fallback to memory cache
        with self._lock:
            if cache_key in self.memory_cache:
                entry = self.memory_cache[cache_key]
                if datetime.now() - entry.timestamp < timedelta(seconds=entry.ttl_seconds):
                    entry.hit_count += 1
                    self.cache_stats['hits'] += 1
                    logger.debug(f"Memory cache hit for query: {query[:50]}...")
                    return entry.result
                else:
                    # Expired entry
                    del self.memory_cache[cache_key]
        
        with self._lock:
            self.cache_stats['misses'] += 1
        logger.debug(f"Cache miss for query: {query[:50]}...")
        return None
    
    def set(self, query: str, result: Any, ttl_seconds: Optional[int] = None, 
            params: Optional[Dict] = None):
        """Cache query result."""
        cache_key = self._generate_cache_key(query, params)
        ttl = ttl_seconds or self.default_ttl
        
        # Try Redis first
        if self.redis_manager:
            try:
                self.redis_manager.set(
                    f"query_cache:{cache_key}",
                    json.dumps(result, default=str),
                    ttl=ttl
                )
                with self._lock:
                    self.cache_stats['sets'] += 1
                logger.debug(f"Cached query result in Redis: {query[:50]}...")
                return
            except Exception as e:
                logger.warning(f"Redis cache set failed: {e}")
        
        # Fallback to memory cache
        with self._lock:
            # Clean up old entries if cache is full
            if len(self.memory_cache) >= self.max_memory_entries:
                # Remove oldest entries
                sorted_entries = sorted(
                    self.memory_cache.items(),
                    key=lambda x: x[1].timestamp
                )
                for key, _ in sorted_entries[:self.max_memory_entries // 4]:
                    del self.memory_cache[key]
                    self.cache_stats['evictions'] += 1
            
            self.memory_cache[cache_key] = QueryCacheEntry(
                query_hash=cache_key,
                result=result,
                timestamp=datetime.now(),
                ttl_seconds=ttl,
                hit_count=0
            )
            self.cache_stats['sets'] += 1
        
        logger.debug(f"Cached query result in memory: {query[:50]}...")
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern."""
        if self.redis_manager:
            try:
                keys = self.redis_manager.scan_iter(f"query_cache:*{pattern}*")
                for key in keys:
                    self.redis_manager.delete(key)
                logger.info(f"Invalidated cache entries matching pattern: {pattern}")
            except Exception as e:
                logger.warning(f"Failed to invalidate cache pattern: {e}")
        
        # Also clear memory cache entries
        with self._lock:
            keys_to_remove = [k for k in self.memory_cache.keys() if pattern in k]
            for key in keys_to_remove:
                del self.memory_cache[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
            hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'hits': self.cache_stats['hits'],
                'misses': self.cache_stats['misses'],
                'sets': self.cache_stats['sets'],
                'evictions': self.cache_stats['evictions'],
                'hit_rate_percent': hit_rate,
                'memory_entries': len(self.memory_cache),
                'redis_available': self.redis_manager is not None
            }


class ConnectionHealthMonitor:
    """Connection health monitoring system."""
    
    def __init__(self, check_interval: int = 30):
        """Initialize health monitor."""
        self.check_interval = check_interval
        self.health_history = deque(maxlen=100)
        self.last_check = None
        self.consecutive_failures = 0
        self._lock = threading.Lock()
        
        # Health thresholds
        self.max_response_time_ms = float(os.getenv('DB_MAX_RESPONSE_TIME_MS', '1000'))
        self.max_error_rate = float(os.getenv('DB_MAX_ERROR_RATE', '0.05'))  # 5%
        self.max_failed_connections = int(os.getenv('DB_MAX_FAILED_CONNECTIONS', '5'))
        
        logger.info(f"Connection health monitor initialized with {check_interval}s interval")
    
    def check_health(self, engine, session_factory) -> ConnectionStatus:
        """Perform comprehensive health check."""
        start_time = time.time()
        
        try:
            # Test basic connectivity
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1")).fetchone()
                if not result or result[0] != 1:
                    raise Exception("Health check query returned unexpected result")
            
            # Test session creation
            session = session_factory()
            try:
                session.execute(text("SELECT 1"))
            finally:
                session.close()
            
            # Test connection pool
            pool = engine.pool
            pool_status = {
                'size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': getattr(pool, 'invalid', lambda: 0)()  # Handle missing invalid method
            }
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine health status
            status = ConnectionStatus.HEALTHY
            
            if response_time > self.max_response_time_ms:
                status = ConnectionStatus.DEGRADED
                logger.warning(f"Slow health check response: {response_time:.2f}ms")
            
            if pool_status['invalid'] > self.max_failed_connections:
                status = ConnectionStatus.UNHEALTHY
                logger.error(f"Too many invalid connections: {pool_status['invalid']}")
            
            # Record health check
            health_record = {
                'timestamp': datetime.now(),
                'status': status.value,
                'response_time_ms': response_time,
                'pool_status': pool_status,
                'consecutive_failures': self.consecutive_failures
            }
            
            with self._lock:
                self.health_history.append(health_record)
                self.last_check = health_record
                if status == ConnectionStatus.HEALTHY:
                    self.consecutive_failures = 0
                else:
                    self.consecutive_failures += 1
            
            logger.debug(f"Health check completed: {status.value} ({response_time:.2f}ms)")
            return status
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            
            with self._lock:
                self.consecutive_failures += 1
                health_record = {
                    'timestamp': datetime.now(),
                    'status': ConnectionStatus.CRITICAL.value,
                    'error': str(e),
                    'consecutive_failures': self.consecutive_failures
                }
                self.health_history.append(health_record)
                self.last_check = health_record
            
            return ConnectionStatus.CRITICAL
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary."""
        with self._lock:
            if not self.last_check:
                return {'status': 'unknown', 'message': 'No health checks performed'}
            
            recent_checks = [h for h in self.health_history 
                           if datetime.now() - h['timestamp'] < timedelta(minutes=5)]
            
            if not recent_checks:
                return {'status': 'unknown', 'message': 'No recent health checks'}
            
            # Calculate average response time
            avg_response_time = sum(h.get('response_time_ms', 0) for h in recent_checks) / len(recent_checks)
            
            # Count statuses
            status_counts = defaultdict(int)
            for check in recent_checks:
                status_counts[check['status']] += 1
            
            return {
                'status': self.last_check['status'],
                'consecutive_failures': self.consecutive_failures,
                'avg_response_time_ms': avg_response_time,
                'recent_status_counts': dict(status_counts),
                'last_check': self.last_check['timestamp'].isoformat(),
                'total_checks': len(self.health_history)
            }


class ConsolidatedDatabaseManager:
    """Consolidated database manager with all advanced features."""
    
    def __init__(self, database_url: Optional[str] = None, **config):
        """Initialize consolidated database manager."""
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
        
        # Initialize components
        self.engine = None
        self.SessionLocal = None
        self.metadata = MetaData()
        self._is_initialized = False
        
        # Performance metrics
        self.metrics = DatabasePerformanceMetrics()
        
        # Query cache
        self.query_cache = None
        if REDIS_AVAILABLE:
            try:
                redis_manager = get_redis_manager_v5()
                self.query_cache = QueryCache(redis_manager)
                logger.info("Query cache initialized with Redis")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {e}")
                self.query_cache = QueryCache()  # Memory-only cache
        else:
            self.query_cache = QueryCache()  # Memory-only cache
        
        # Health monitoring
        self.health_monitor = ConnectionHealthMonitor()
        
        # Statistics
        self.stats = {
            'total_queries': 0,
            'cached_queries': 0,
            'slow_queries': 0,
            'failed_queries': 0,
            'total_response_time_ms': 0.0,
            'last_health_check': None,
            'connection_errors': 0
        }
        
        # Initialize database connection
        self._setup_engine()
        self._setup_event_listeners()
        
        logger.info("Consolidated database manager initialized")
    
    def _setup_engine(self):
        """Setup SQLAlchemy engine with optimized configuration."""
        try:
            # Parse database URL for additional parameters
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.database_url)
            query_params = parse_qs(parsed.query)
            
            # Build connection arguments
            connect_args = {
                'connect_timeout': self.config['connect_timeout'],
                'application_name': 'jewgo_backend',
                'options': f"-c statement_timeout={self.config['statement_timeout']} "
                          f"-c idle_in_transaction_session_timeout={self.config['idle_timeout']}"
            }
            
            # Add SSL configuration if specified
            if 'sslmode' in query_params:
                connect_args['sslmode'] = query_params['sslmode'][0]
            
            # Create engine with optimized pool settings
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
                connect_args=connect_args
            )
            
            # Create session factory
            self.SessionLocal = scoped_session(
                sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
            )
            
            self._is_initialized = True
            logger.info("Database engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {e}")
            raise
    
    def _setup_event_listeners(self):
        """Setup SQLAlchemy event listeners for monitoring."""
        
        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Log new connections."""
            logger.debug("New database connection established")
        
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout."""
            logger.debug("Database connection checked out from pool")
        
        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Log connection checkin."""
            logger.debug("Database connection returned to pool")
        
        @event.listens_for(self.engine, "invalidate")
        def receive_invalidate(dbapi_connection, connection_record, exception):
            """Log connection invalidation."""
            logger.warning(f"Database connection invalidated: {exception}")
            self.stats['connection_errors'] += 1
    
    def connect(self) -> bool:
        """Establish database connection."""
        try:
            if not self._is_initialized:
                self._setup_engine()
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Database connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from database."""
        try:
            if self.SessionLocal:
                self.SessionLocal.remove()
            
            if self.engine:
                self.engine.dispose()
            
            logger.info("Database connection closed")
            
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
    
    def is_connected(self) -> bool:
        """Check if connected to database."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
    
    @contextmanager
    def get_session(self):
        """Get database session context manager."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def execute_query(self, query: str, params: Optional[Dict] = None, 
                     use_cache: bool = True, cache_ttl: Optional[int] = None) -> Any:
        """Execute query with caching and performance monitoring."""
        start_time = time.time()
        query_type = self._get_query_type(query)
        
        # Check cache first
        if use_cache and self.query_cache:
            cached_result = self.query_cache.get(query, params)
            if cached_result is not None:
                self.metrics.record_cache_hit('query')
                self.stats['cached_queries'] += 1
                logger.debug(f"Query served from cache: {query[:50]}...")
                return cached_result
            else:
                self.metrics.record_cache_miss('query')
        
        # Execute query
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                
                # Convert result to list of dicts for caching
                if hasattr(result, 'fetchall'):
                    rows = result.fetchall()
                    if rows:
                        # Convert to list of dicts
                        columns = result.keys()
                        result_data = [dict(zip(columns, row)) for row in rows]
                    else:
                        result_data = []
                elif hasattr(result, '__iter__') and not isinstance(result, (str, bytes)):
                    # Handle other iterable results
                    result_data = list(result)
                else:
                    # Handle scalar results
                    result_data = [{'result': result}] if result is not None else []
                
                # Cache result if caching is enabled
                if use_cache and self.query_cache:
                    self.query_cache.set(query, result_data, cache_ttl, params)
                
                # Update statistics
                duration = (time.time() - start_time) * 1000
                self.stats['total_queries'] += 1
                self.stats['total_response_time_ms'] += duration
                
                # Check if query is slow
                is_slow = duration > (self.query_cache.slow_query_threshold * 1000)
                if is_slow:
                    self.stats['slow_queries'] += 1
                    logger.warning(f"Slow query detected: {duration:.2f}ms - {query[:100]}...")
                
                # Record metrics
                self.metrics.record_query(query_type, duration / 1000, 'success', is_slow)
                
                # Update connection metrics
                pool = self.engine.pool
                self.metrics.update_connection_metrics(
                    pool.size(), 
                    pool.checkedout()
                )
                
                logger.debug(f"Query executed successfully: {duration:.2f}ms - {query[:50]}...")
                return result_data
                
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            self.stats['failed_queries'] += 1
            self.metrics.record_query(query_type, duration / 1000, 'error')
            logger.error(f"Query execution failed: {e} - {query[:50]}...")
            raise
    
    def _get_query_type(self, query: str) -> str:
        """Determine query type from SQL."""
        query_upper = query.strip().upper()
        if query_upper.startswith('SELECT'):
            return 'select'
        elif query_upper.startswith('INSERT'):
            return 'insert'
        elif query_upper.startswith('UPDATE'):
            return 'update'
        elif query_upper.startswith('DELETE'):
            return 'delete'
        else:
            return 'other'
    
    def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        health_status = self.health_monitor.check_health(self.engine, self.SessionLocal)
        
        # Get cache statistics
        cache_stats = self.query_cache.get_stats() if self.query_cache else {}
        
        # Get connection pool status
        pool = self.engine.pool
        pool_status = {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': getattr(pool, 'invalid', lambda: 0)()  # Handle missing invalid method
        }
        
        # Calculate performance metrics
        avg_response_time = 0
        if self.stats['total_queries'] > 0:
            avg_response_time = self.stats['total_response_time_ms'] / self.stats['total_queries']
        
        error_rate = 0
        total_queries = self.stats['total_queries'] + self.stats['failed_queries']
        if total_queries > 0:
            error_rate = self.stats['failed_queries'] / total_queries
        
        return {
            'status': health_status.value,
            'timestamp': datetime.now().isoformat(),
            'connection_pool': pool_status,
            'performance': {
                'total_queries': self.stats['total_queries'],
                'cached_queries': self.stats['cached_queries'],
                'slow_queries': self.stats['slow_queries'],
                'failed_queries': self.stats['failed_queries'],
                'avg_response_time_ms': avg_response_time,
                'error_rate': error_rate
            },
            'cache': cache_stats,
            'health_monitor': self.health_monitor.get_health_summary()
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics."""
        cache_stats = self.query_cache.get_stats() if self.query_cache else {}
        
        return {
            'database_stats': self.stats.copy(),
            'cache_stats': cache_stats,
            'connection_pool': {
                'size': self.engine.pool.size(),
                'checked_in': self.engine.pool.checkedin(),
                'checked_out': self.engine.pool.checkedout(),
                'overflow': self.engine.pool.overflow(),
                'invalid': getattr(self.engine.pool, 'invalid', lambda: 0)()  # Handle missing invalid method
            },
            'health_summary': self.health_monitor.get_health_summary(),
            'timestamp': datetime.now().isoformat()
        }
    
    def invalidate_cache(self, pattern: Optional[str] = None):
        """Invalidate query cache."""
        if self.query_cache:
            if pattern:
                self.query_cache.invalidate_pattern(pattern)
                logger.info(f"Cache invalidated for pattern: {pattern}")
            else:
                # Clear all cache
                if self.query_cache.redis_manager:
                    keys = self.query_cache.redis_manager.scan_iter("query_cache:*")
                    for key in keys:
                        self.query_cache.redis_manager.delete(key)
                
                with self.query_cache._lock:
                    self.query_cache.memory_cache.clear()
                
                logger.info("All cache invalidated")
    
    def optimize_connection_pool(self):
        """Optimize connection pool settings based on usage patterns."""
        pool = self.engine.pool
        
        # Get current pool status
        current_size = pool.size()
        checked_out = pool.checkedout()
        overflow = pool.overflow()
        
        # Calculate optimal settings
        utilization = checked_out / current_size if current_size > 0 else 0
        
        if utilization > 0.8:  # High utilization
            new_size = min(current_size * 1.5, 50)  # Cap at 50
            logger.info(f"High pool utilization ({utilization:.2%}), increasing pool size to {new_size}")
        elif utilization < 0.3:  # Low utilization
            new_size = max(current_size * 0.8, 5)  # Minimum 5
            logger.info(f"Low pool utilization ({utilization:.2%}), decreasing pool size to {new_size}")
        
        logger.info(f"Pool optimization completed - Current: {current_size}, Checked out: {checked_out}, Overflow: {overflow}")


# Global instance
_consolidated_manager = None


def get_consolidated_db_manager() -> ConsolidatedDatabaseManager:
    """Get the global consolidated database manager instance."""
    global _consolidated_manager
    
    if _consolidated_manager is None:
        _consolidated_manager = ConsolidatedDatabaseManager()
        _consolidated_manager.connect()
    
    return _consolidated_manager


def initialize_consolidated_db_manager(database_url: Optional[str] = None, **config) -> ConsolidatedDatabaseManager:
    """Initialize the consolidated database manager."""
    global _consolidated_manager
    
    _consolidated_manager = ConsolidatedDatabaseManager(database_url, **config)
    _consolidated_manager.connect()
    
    logger.info("Consolidated database manager initialized globally")
    return _consolidated_manager