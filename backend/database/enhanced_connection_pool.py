#!/usr/bin/env python3
"""
Enhanced Connection Pool Manager for JewGo Backend
=================================================

This module provides advanced connection pooling with:
- Health checks and automatic failover
- Connection lifecycle management
- Performance monitoring
- Load balancing across multiple database instances
- Connection warming and preloading

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import time
import threading
import random
from collections import deque, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from contextlib import contextmanager
import queue

from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.orm import sessionmaker, Session

from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class ConnectionHealth:
    """Connection health status."""
    connection_id: str
    is_healthy: bool
    last_check: datetime
    response_time_ms: float
    error_count: int = 0
    success_count: int = 0
    last_error: Optional[str] = None

    def get_success_rate(self) -> float:
        """Get connection success rate."""
        total = self.success_count + self.error_count
        return (self.success_count / total) if total > 0 else 0.0


@dataclass
class PoolMetrics:
    """Connection pool metrics."""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    failed_connections: int = 0
    connection_requests: int = 0
    connection_timeouts: int = 0
    avg_connection_time_ms: float = 0.0
    avg_query_time_ms: float = 0.0
    health_check_count: int = 0
    health_check_failures: int = 0
    last_health_check: Optional[datetime] = None


class ConnectionHealthChecker:
    """Manages connection health checks."""
    
    def __init__(self, check_interval: int = 30, timeout: int = 5):
        self.check_interval = check_interval
        self.timeout = timeout
        self.health_status = {}
        self.lock = threading.RLock()
        self.running = False
        self.thread = None
        
        # Health check queries
        self.health_queries = [
            "SELECT 1",
            "SELECT NOW()",
            "SELECT version()"
        ]

    def start(self, engines: List[Engine]):
        """Start health checking for multiple engines."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._health_check_loop, args=(engines,))
        self.thread.daemon = True
        self.thread.start()
        logger.info("Connection health checker started")

    def stop(self):
        """Stop health checking."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Connection health checker stopped")

    def _health_check_loop(self, engines: List[Engine]):
        """Main health check loop."""
        while self.running:
            try:
                for i, engine in enumerate(engines):
                    self._check_engine_health(f"engine_{i}", engine)
                
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
                time.sleep(self.check_interval)

    def _check_engine_health(self, engine_id: str, engine: Engine):
        """Check health of a specific engine."""
        start_time = time.time()
        
        try:
            with engine.connect() as conn:
                # Use a random health check query
                query = random.choice(self.health_queries)
                result = conn.execute(text(query))
                result.fetchone()  # Consume result
            
            response_time = (time.time() - start_time) * 1000
            
            with self.lock:
                if engine_id not in self.health_status:
                    self.health_status[engine_id] = ConnectionHealth(
                        connection_id=engine_id,
                        is_healthy=True,
                        last_check=datetime.now(),
                        response_time_ms=response_time
                    )
                
                health = self.health_status[engine_id]
                health.is_healthy = True
                health.last_check = datetime.now()
                health.response_time_ms = response_time
                health.success_count += 1
                health.last_error = None
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            
            with self.lock:
                if engine_id not in self.health_status:
                    self.health_status[engine_id] = ConnectionHealth(
                        connection_id=engine_id,
                        is_healthy=False,
                        last_check=datetime.now(),
                        response_time_ms=response_time
                    )
                
                health = self.health_status[engine_id]
                health.is_healthy = False
                health.last_check = datetime.now()
                health.response_time_ms = response_time
                health.error_count += 1
                health.last_error = str(e)
                
                logger.warning(f"Engine {engine_id} health check failed: {e}")

    def get_health_status(self, engine_id: str) -> Optional[ConnectionHealth]:
        """Get health status for a specific engine."""
        with self.lock:
            return self.health_status.get(engine_id)

    def get_all_health_status(self) -> Dict[str, ConnectionHealth]:
        """Get health status for all engines."""
        with self.lock:
            return self.health_status.copy()

    def is_engine_healthy(self, engine_id: str) -> bool:
        """Check if an engine is healthy."""
        health = self.get_health_status(engine_id)
        return health.is_healthy if health else False


class LoadBalancer:
    """Load balancer for multiple database connections."""
    
    def __init__(self, strategy: str = 'round_robin'):
        self.strategy = strategy
        self.engines = []
        self.engine_weights = {}
        self.current_index = 0
        self.lock = threading.RLock()
        
        # Load balancing strategies
        self.strategies = {
            'round_robin': self._round_robin,
            'random': self._random,
            'weighted': self._weighted,
            'least_connections': self._least_connections,
            'health_based': self._health_based
        }

    def add_engine(self, engine: Engine, weight: int = 1):
        """Add an engine to the load balancer."""
        with self.lock:
            self.engines.append(engine)
            self.engine_weights[len(self.engines) - 1] = weight
            logger.info(f"Added engine to load balancer with weight {weight}")

    def get_engine(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Optional[Engine]:
        """Get an engine using the configured strategy."""
        if not self.engines:
            return None
        
        strategy_func = self.strategies.get(self.strategy, self._round_robin)
        return strategy_func(health_checker)

    def _round_robin(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Engine:
        """Round-robin load balancing."""
        with self.lock:
            if not self.engines:
                return None
            
            # Skip unhealthy engines if health checker is available
            if health_checker:
                healthy_engines = []
                for i, engine in enumerate(self.engines):
                    if health_checker.is_engine_healthy(f"engine_{i}"):
                        healthy_engines.append((i, engine))
                
                if healthy_engines:
                    self.current_index = (self.current_index + 1) % len(healthy_engines)
                    return healthy_engines[self.current_index][1]
                else:
                    # Fallback to any engine if none are healthy
                    self.current_index = (self.current_index + 1) % len(self.engines)
                    return self.engines[self.current_index]
            else:
                self.current_index = (self.current_index + 1) % len(self.engines)
                return self.engines[self.current_index]

    def _random(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Engine:
        """Random load balancing."""
        if not self.engines:
            return None
        
        # Filter healthy engines if health checker is available
        if health_checker:
            healthy_engines = []
            for i, engine in enumerate(self.engines):
                if health_checker.is_engine_healthy(f"engine_{i}"):
                    healthy_engines.append(engine)
            
            if healthy_engines:
                return random.choice(healthy_engines)
            else:
                # Fallback to any engine
                return random.choice(self.engines)
        else:
            return random.choice(self.engines)

    def _weighted(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Engine:
        """Weighted load balancing."""
        if not self.engines:
            return None
        
        # Calculate total weight for healthy engines
        total_weight = 0
        healthy_engines = []
        
        for i, engine in enumerate(self.engines):
            if not health_checker or health_checker.is_engine_healthy(f"engine_{i}"):
                weight = self.engine_weights.get(i, 1)
                total_weight += weight
                healthy_engines.append((engine, weight))
        
        if not healthy_engines:
            # Fallback to any engine
            return random.choice(self.engines)
        
        # Select based on weight
        random_weight = random.uniform(0, total_weight)
        current_weight = 0
        
        for engine, weight in healthy_engines:
            current_weight += weight
            if random_weight <= current_weight:
                return engine
        
        return healthy_engines[-1][0]  # Fallback

    def _least_connections(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Engine:
        """Least connections load balancing."""
        if not self.engines:
            return None
        
        # This would require connection tracking per engine
        # For now, fallback to round-robin
        return self._round_robin(health_checker)

    def _health_based(self, health_checker: Optional[ConnectionHealthChecker] = None) -> Engine:
        """Health-based load balancing."""
        if not health_checker or not self.engines:
            return self._round_robin(health_checker)
        
        # Find the healthiest engine
        best_engine = None
        best_score = -1
        
        for i, engine in enumerate(self.engines):
            health = health_checker.get_health_status(f"engine_{i}")
            if health and health.is_healthy:
                # Score based on success rate and response time
                success_rate = health.get_success_rate()
                response_time_score = max(0, 1 - (health.response_time_ms / 1000))  # Normalize to 0-1
                score = success_rate * 0.7 + response_time_score * 0.3
                
                if score > best_score:
                    best_score = score
                    best_engine = engine
        
        return best_engine or self._round_robin(health_checker)


class EnhancedConnectionPool:
    """Enhanced connection pool with advanced features."""
    
    def __init__(self, 
                 database_urls: Union[str, List[str]],
                 pool_size: int = 20,
                 max_overflow: int = 30,
                 pool_timeout: int = 30,
                 pool_recycle: int = 3600,
                 load_balance_strategy: str = 'round_robin',
                 health_check_interval: int = 30):
        
        # Handle single URL or multiple URLs
        if isinstance(database_urls, str):
            self.database_urls = [database_urls]
        else:
            self.database_urls = database_urls
        
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.pool_recycle = pool_recycle
        
        # Initialize components
        self.engines = []
        self.session_factories = []
        self.load_balancer = LoadBalancer(load_balance_strategy)
        self.health_checker = ConnectionHealthChecker(health_check_interval)
        self.metrics = PoolMetrics()
        self.lock = threading.RLock()
        
        # Connection warming
        self.warm_connections = True
        self.warm_query = "SELECT 1"
        
        self._initialize_engines()
        self._start_health_checking()

    def _initialize_engines(self):
        """Initialize database engines."""
        for i, url in enumerate(self.database_urls):
            try:
                # Create engine with optimized settings
                engine = create_engine(
                    url,
                    pool_size=self.pool_size,
                    max_overflow=self.max_overflow,
                    pool_timeout=self.pool_timeout,
                    pool_recycle=self.pool_recycle,
                    pool_pre_ping=True,
                    echo=False,
                    connect_args={
                        'connect_timeout': 10,
                        'application_name': f'jewgo_app_pool_{i}'
                    }
                )
                
                # Create session factory
                session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
                
                self.engines.append(engine)
                self.session_factories.append(session_factory)
                self.load_balancer.add_engine(engine)
                
                # Add event listeners
                self._setup_engine_events(engine, i)
                
                logger.info(f"Initialized engine {i} for URL: {url[:50]}...")
                
            except Exception as e:
                logger.error(f"Failed to initialize engine {i}: {e}")

    def _setup_engine_events(self, engine: Engine, engine_id: int):
        """Setup event listeners for an engine."""
        
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            with self.lock:
                self.metrics.total_connections += 1
            logger.debug(f"New connection created for engine {engine_id}")

        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            with self.lock:
                self.metrics.active_connections += 1
                self.metrics.connection_requests += 1
            logger.debug(f"Connection checked out for engine {engine_id}")

        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            with self.lock:
                self.metrics.active_connections = max(0, self.metrics.active_connections - 1)
            logger.debug(f"Connection checked in for engine {engine_id}")

        @event.listens_for(engine, "invalidate")
        def receive_invalidate(dbapi_connection, connection_record, exception):
            with self.lock:
                self.metrics.failed_connections += 1
            logger.warning(f"Connection invalidated for engine {engine_id}: {exception}")

    def _start_health_checking(self):
        """Start health checking."""
        if self.engines:
            self.health_checker.start(self.engines)

    def get_session(self) -> Session:
        """Get a database session from the load balancer."""
        engine = self.load_balancer.get_engine(self.health_checker)
        if not engine:
            raise RuntimeError("No healthy database engines available")
        
        # Find corresponding session factory
        engine_index = self.engines.index(engine)
        session_factory = self.session_factories[engine_index]
        
        return session_factory()

    @contextmanager
    def session_scope(self):
        """Get a session context manager."""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def warm_connections(self, num_connections: int = None):
        """Warm up connections in the pool."""
        if not self.warm_connections:
            return
        
        num_connections = num_connections or min(self.pool_size, 5)
        logger.info(f"Warming {num_connections} connections per engine")
        
        for engine in self.engines:
            for _ in range(num_connections):
                try:
                    with engine.connect() as conn:
                        conn.execute(text(self.warm_query))
                except Exception as e:
                    logger.warning(f"Failed to warm connection: {e}")

    def get_pool_status(self) -> Dict[str, Any]:
        """Get comprehensive pool status."""
        with self.lock:
            status = {
                'engines': len(self.engines),
                'metrics': asdict(self.metrics),
                'load_balancer_strategy': self.load_balancer.strategy,
                'health_status': {}
            }
            
            # Add health status for each engine
            for i, engine in enumerate(self.engines):
                health = self.health_checker.get_health_status(f"engine_{i}")
                if health:
                    status['health_status'][f'engine_{i}'] = asdict(health)
                
                # Add pool-specific metrics
                try:
                    pool = engine.pool
                    status[f'engine_{i}_pool'] = {
                        'size': pool.size(),
                        'checked_out': pool.checkedout(),
                        'checked_in': pool.checkedin(),
                        'invalid': pool.invalid(),
                        'overflow': pool.overflow()
                    }
                except Exception as e:
                    status[f'engine_{i}_pool'] = {'error': str(e)}
            
            return status

    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary for all engines."""
        all_health = self.health_checker.get_all_health_status()
        
        healthy_count = sum(1 for health in all_health.values() if health.is_healthy)
        total_count = len(all_health)
        
        return {
            'total_engines': total_count,
            'healthy_engines': healthy_count,
            'unhealthy_engines': total_count - healthy_count,
            'health_percentage': (healthy_count / total_count * 100) if total_count > 0 else 0,
            'engines': {k: asdict(v) for k, v in all_health.items()}
        }

    def close(self):
        """Close all engines and stop health checking."""
        self.health_checker.stop()
        
        for engine in self.engines:
            try:
                engine.dispose()
            except Exception as e:
                logger.error(f"Error disposing engine: {e}")
        
        logger.info("Enhanced connection pool closed")


# Global enhanced connection pool instance
_enhanced_pool = None


def get_enhanced_connection_pool() -> EnhancedConnectionPool:
    """Get the global enhanced connection pool instance."""
    global _enhanced_pool
    
    if _enhanced_pool is None:
        import os
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        _enhanced_pool = EnhancedConnectionPool(
            database_urls=database_url,
            pool_size=int(os.getenv('DB_POOL_SIZE', '20')),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', '30')),
            pool_timeout=int(os.getenv('DB_POOL_TIMEOUT', '30')),
            pool_recycle=int(os.getenv('DB_POOL_RECYCLE', '3600')),
            load_balance_strategy=os.getenv('DB_LOAD_BALANCE_STRATEGY', 'round_robin'),
            health_check_interval=int(os.getenv('DB_HEALTH_CHECK_INTERVAL', '30'))
        )
        
        # Warm connections on startup
        _enhanced_pool.warm_connections()
    
    return _enhanced_pool
