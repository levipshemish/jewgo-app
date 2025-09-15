#!/usr/bin/env python3
"""
Database Query Optimizer for JewGo Backend
==========================================

This module provides advanced database optimization features including:
- Query result caching with intelligent invalidation
- Advanced indexing strategies
- Query performance monitoring
- Connection pooling optimization
- Query plan analysis and optimization

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import hashlib
import json
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Tuple, Callable
from dataclasses import dataclass, asdict
from functools import wraps
import re

from sqlalchemy import text, event, create_engine
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from utils.logging_config import get_logger
from cache.advanced_cache_manager import get_advanced_cache_manager, cache_result

logger = get_logger(__name__)


@dataclass
class QueryMetrics:
    """Query performance metrics."""
    query_hash: str
    query_text: str
    execution_count: int = 0
    total_execution_time_ms: float = 0.0
    min_execution_time_ms: float = float('inf')
    max_execution_time_ms: float = 0.0
    avg_execution_time_ms: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    last_executed: Optional[datetime] = None
    slow_query_threshold_ms: float = 1000.0
    is_slow_query: bool = False

    def record_execution(self, execution_time_ms: float, cache_hit: bool = False):
        """Record a query execution."""
        self.execution_count += 1
        self.total_execution_time_ms += execution_time_ms
        self.min_execution_time_ms = min(self.min_execution_time_ms, execution_time_ms)
        self.max_execution_time_ms = max(self.max_execution_time_ms, execution_time_ms)
        self.avg_execution_time_ms = self.total_execution_time_ms / self.execution_count
        self.last_executed = datetime.now()
        
        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        self.is_slow_query = self.avg_execution_time_ms > self.slow_query_threshold_ms


@dataclass
class IndexRecommendation:
    """Database index recommendation."""
    table_name: str
    columns: List[str]
    index_type: str  # 'btree', 'gin', 'gist', 'hash'
    reason: str
    estimated_benefit: str
    priority: int  # 1-10, higher is more important
    sql_statement: str


class QueryAnalyzer:
    """Analyzes queries for optimization opportunities."""
    
    def __init__(self):
        self.query_patterns = {
            'distance_filtering': r'earth_distance|ST_Distance|ll_to_earth',
            'text_search': r'to_tsvector|plainto_tsquery|ts_rank',
            'date_filtering': r'date_trunc|extract.*epoch|created_at|updated_at',
            'aggregation': r'COUNT|SUM|AVG|MAX|MIN|GROUP BY',
            'sorting': r'ORDER BY',
            'pagination': r'LIMIT|OFFSET',
            'joins': r'JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN'
        }
        
        self.optimization_rules = {
            'distance_filtering': self._optimize_distance_queries,
            'text_search': self._optimize_text_search_queries,
            'date_filtering': self._optimize_date_queries,
            'aggregation': self._optimize_aggregation_queries,
            'sorting': self._optimize_sorting_queries,
            'pagination': self._optimize_pagination_queries
        }

    def analyze_query(self, query_text: str) -> Dict[str, Any]:
        """Analyze a query for optimization opportunities."""
        analysis = {
            'query_type': 'unknown',
            'patterns_detected': [],
            'optimization_suggestions': [],
            'index_recommendations': [],
            'complexity_score': 0
        }
        
        # Detect query patterns
        for pattern_name, pattern in self.query_patterns.items():
            if re.search(pattern, query_text, re.IGNORECASE):
                analysis['patterns_detected'].append(pattern_name)
                analysis['complexity_score'] += 1
        
        # Determine query type
        if 'SELECT' in query_text.upper():
            analysis['query_type'] = 'select'
        elif 'INSERT' in query_text.upper():
            analysis['query_type'] = 'insert'
        elif 'UPDATE' in query_text.upper():
            analysis['query_type'] = 'update'
        elif 'DELETE' in query_text.upper():
            analysis['query_type'] = 'delete'
        
        # Generate optimization suggestions
        for pattern in analysis['patterns_detected']:
            if pattern in self.optimization_rules:
                suggestions = self.optimization_rules[pattern](query_text)
                analysis['optimization_suggestions'].extend(suggestions)
        
        # Generate index recommendations
        analysis['index_recommendations'] = self._generate_index_recommendations(query_text)
        
        return analysis

    def _optimize_distance_queries(self, query_text: str) -> List[str]:
        """Optimize distance-based queries."""
        suggestions = []
        
        if 'earth_distance' in query_text.lower():
            suggestions.append("Consider using ST_Distance for better performance with spatial indexes")
        
        if 'latitude' in query_text.lower() and 'longitude' in query_text.lower():
            suggestions.append("Ensure spatial index exists on (latitude, longitude) columns")
            suggestions.append("Consider using PostGIS ST_DWithin for radius queries")
        
        return suggestions

    def _optimize_text_search_queries(self, query_text: str) -> List[str]:
        """Optimize text search queries."""
        suggestions = []
        
        if 'to_tsvector' in query_text.lower():
            suggestions.append("Ensure GIN index exists on tsvector columns")
            suggestions.append("Consider using ts_rank for relevance scoring")
        
        if 'ILIKE' in query_text.upper():
            suggestions.append("Consider using full-text search instead of ILIKE for better performance")
        
        return suggestions

    def _optimize_date_queries(self, query_text: str) -> List[str]:
        """Optimize date-based queries."""
        suggestions = []
        
        if 'created_at' in query_text.lower() or 'updated_at' in query_text.lower():
            suggestions.append("Ensure B-tree index exists on timestamp columns")
            suggestions.append("Consider partitioning large tables by date")
        
        if 'date_trunc' in query_text.lower():
            suggestions.append("Consider pre-computing date truncations in materialized views")
        
        return suggestions

    def _optimize_aggregation_queries(self, query_text: str) -> List[str]:
        """Optimize aggregation queries."""
        suggestions = []
        
        if 'GROUP BY' in query_text.upper():
            suggestions.append("Ensure indexes exist on GROUP BY columns")
            suggestions.append("Consider using materialized views for complex aggregations")
        
        if 'COUNT(*)' in query_text.upper():
            suggestions.append("Consider using COUNT(1) instead of COUNT(*) for better performance")
        
        return suggestions

    def _optimize_sorting_queries(self, query_text: str) -> List[str]:
        """Optimize sorting queries."""
        suggestions = []
        
        if 'ORDER BY' in query_text.upper():
            suggestions.append("Ensure indexes exist on ORDER BY columns")
            suggestions.append("Consider using covering indexes for ORDER BY + SELECT combinations")
        
        return suggestions

    def _optimize_pagination_queries(self, query_text: str) -> List[str]:
        """Optimize pagination queries."""
        suggestions = []
        
        if 'OFFSET' in query_text.upper():
            suggestions.append("Consider using cursor-based pagination instead of OFFSET for large datasets")
            suggestions.append("Ensure ORDER BY columns are indexed for efficient pagination")
        
        return suggestions

    def _generate_index_recommendations(self, query_text: str) -> List[IndexRecommendation]:
        """Generate index recommendations based on query analysis."""
        recommendations = []
        
        # Extract table and column information (simplified)
        # In a real implementation, you'd use a SQL parser
        
        # Distance queries
        if re.search(r'latitude.*longitude|longitude.*latitude', query_text, re.IGNORECASE):
            recommendations.append(IndexRecommendation(
                table_name='restaurants',
                columns=['latitude', 'longitude'],
                index_type='gist',
                reason='Spatial queries for distance filtering',
                estimated_benefit='High - enables efficient radius searches',
                priority=9,
                sql_statement='CREATE INDEX CONCURRENTLY idx_restaurants_location_gist ON restaurants USING gist (ll_to_earth(latitude, longitude));'
            ))
        
        # Text search
        if re.search(r'name.*ILIKE|description.*ILIKE', query_text, re.IGNORECASE):
            recommendations.append(IndexRecommendation(
                table_name='restaurants',
                columns=['name'],
                index_type='gin',
                reason='Full-text search on restaurant names',
                estimated_benefit='High - enables fast text search',
                priority=8,
                sql_statement='CREATE INDEX CONCURRENTLY idx_restaurants_name_gin ON restaurants USING gin (to_tsvector(\'english\', name));'
            ))
        
        # Date filtering
        if re.search(r'created_at|updated_at', query_text, re.IGNORECASE):
            recommendations.append(IndexRecommendation(
                table_name='restaurants',
                columns=['created_at'],
                index_type='btree',
                reason='Date range queries and sorting',
                estimated_benefit='Medium - improves date filtering performance',
                priority=6,
                sql_statement='CREATE INDEX CONCURRENTLY idx_restaurants_created_at ON restaurants (created_at);'
            ))
        
        return recommendations


class QueryCache:
    """Intelligent query result caching with invalidation strategies."""
    
    def __init__(self, cache_manager=None):
        self.cache_manager = cache_manager or get_advanced_cache_manager()
        self.cache_ttl = {
            'select': 1800,    # 30 minutes for SELECT queries
            'aggregation': 3600,  # 1 hour for aggregations
            'count': 300,      # 5 minutes for COUNT queries
            'distance': 600,   # 10 minutes for distance queries
        }
        self.invalidation_patterns = defaultdict(list)

    def get_cache_key(self, query_text: str, params: Dict[str, Any] = None) -> str:
        """Generate cache key for query."""
        # Normalize query text
        normalized_query = re.sub(r'\s+', ' ', query_text.strip())
        
        # Include parameters in hash
        key_data = normalized_query
        if params:
            key_data += json.dumps(params, sort_keys=True)
        
        return f"query_cache:{hashlib.md5(key_data.encode()).hexdigest()}"

    def get(self, query_text: str, params: Dict[str, Any] = None) -> Optional[Any]:
        """Get cached query result."""
        cache_key = self.get_cache_key(query_text, params)
        return self.cache_manager.get(cache_key)

    def set(self, query_text: str, result: Any, params: Dict[str, Any] = None, 
            query_type: str = 'select', tags: List[str] = None) -> bool:
        """Cache query result."""
        cache_key = self.get_cache_key(query_text, params)
        ttl = self.cache_ttl.get(query_type, self.cache_ttl['select'])
        
        # Add query type as tag
        cache_tags = tags or []
        cache_tags.append(f"query_type:{query_type}")
        
        return self.cache_manager.set(cache_key, result, ttl=ttl, tags=cache_tags)

    def invalidate_by_table(self, table_name: str):
        """Invalidate cache entries for a specific table."""
        tags = [f"table:{table_name}"]
        return self.cache_manager.invalidate_by_tags(tags)

    def invalidate_by_pattern(self, pattern: str):
        """Invalidate cache entries matching a pattern."""
        # This would require more sophisticated pattern matching
        # For now, we'll use a simple approach
        tags = [f"pattern:{pattern}"]
        return self.cache_manager.invalidate_by_tags(tags)


class ConnectionPoolOptimizer:
    """Optimizes database connection pooling."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.original_pool = None
        self.optimized_pool = None
        self.monitoring_active = False
        self.pool_metrics = {
            'checkouts': 0,
            'checkins': 0,
            'invalid_connections': 0,
            'overflow_connections': 0,
            'pool_exhaustions': 0
        }

    def optimize_pool_settings(self, 
                              pool_size: int = 20,
                              max_overflow: int = 30,
                              pool_timeout: int = 30,
                              pool_recycle: int = 3600,
                              pool_pre_ping: bool = True) -> bool:
        """Optimize connection pool settings."""
        try:
            # Create optimized pool
            self.optimized_pool = QueuePool(
                creator=self.engine.pool._creator,
                pool_size=pool_size,
                max_overflow=max_overflow,
                timeout=pool_timeout,
                recycle=pool_recycle,
                pre_ping=pool_pre_ping
            )
            
            # Replace engine's pool
            self.original_pool = self.engine.pool
            self.engine.pool = self.optimized_pool
            
            logger.info(f"Connection pool optimized: size={pool_size}, overflow={max_overflow}")
            return True
        except Exception as e:
            logger.error(f"Failed to optimize connection pool: {e}")
            return False

    def start_monitoring(self):
        """Start monitoring connection pool metrics."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        # Add event listeners
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            self.pool_metrics['checkouts'] += 1
            if connection_record.invalid:
                self.pool_metrics['invalid_connections'] += 1

        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            self.pool_metrics['checkins'] += 1

        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            if hasattr(connection_record, 'overflow') and connection_record.overflow:
                self.pool_metrics['overflow_connections'] += 1

        logger.info("Connection pool monitoring started")

    def get_pool_metrics(self) -> Dict[str, Any]:
        """Get connection pool metrics."""
        if not self.engine or not hasattr(self.engine, 'pool'):
            return {'error': 'Pool not available'}
        
        try:
            pool = self.engine.pool
            return {
                'size': pool.size(),
                'checked_out': pool.checkedout(),
                'checked_in': pool.checkedin(),
                'invalid': pool.invalid(),
                'overflow': pool.overflow(),
                'metrics': self.pool_metrics.copy()
            }
        except Exception as e:
            return {'error': f"Could not get pool metrics: {e}"}


class DatabaseOptimizer:
    """Main database optimization class."""
    
    def __init__(self, connection_manager=None):
        self.connection_manager = connection_manager
        self.query_analyzer = QueryAnalyzer()
        self.query_cache = QueryCache()
        self.pool_optimizer = None
        self.query_metrics = {}
        self.slow_queries = deque(maxlen=1000)
        self.lock = threading.RLock()
        
        # Performance thresholds
        self.slow_query_threshold_ms = 1000.0
        self.cache_hit_rate_threshold = 0.8

    def initialize(self):
        """Initialize the database optimizer."""
        if self.connection_manager and self.connection_manager.engine:
            self.pool_optimizer = ConnectionPoolOptimizer(self.connection_manager.engine)
            self.pool_optimizer.start_monitoring()
            logger.info("Database optimizer initialized")

    def execute_optimized_query(self, 
                               query_text: str, 
                               params: Dict[str, Any] = None,
                               use_cache: bool = True,
                               cache_ttl: Optional[int] = None) -> Any:
        """Execute a query with optimization."""
        start_time = time.time()
        query_hash = hashlib.md5(query_text.encode()).hexdigest()
        
        # Check cache first
        if use_cache:
            cached_result = self.query_cache.get(query_text, params)
            if cached_result is not None:
                self._record_query_metrics(query_hash, query_text, 0, cache_hit=True)
                return cached_result
        
        # Execute query
        try:
            with self.connection_manager.get_session() as session:
                if params:
                    result = session.execute(text(query_text), params)
                else:
                    result = session.execute(text(query_text))
                
                # Convert result to list of dicts for caching
                if result.returns_rows:
                    columns = result.keys()
                    rows = [dict(zip(columns, row)) for row in result.fetchall()]
                else:
                    rows = result.rowcount
                
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Record metrics
                self._record_query_metrics(query_hash, query_text, execution_time_ms, cache_hit=False)
                
                # Cache result if appropriate
                if use_cache and execution_time_ms > 100:  # Only cache queries that take > 100ms
                    query_type = self._determine_query_type(query_text)
                    self.query_cache.set(query_text, rows, params, query_type)
                
                return rows
                
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self._record_query_metrics(query_hash, query_text, execution_time_ms, cache_hit=False, error=str(e))
            raise

    def analyze_slow_queries(self) -> List[Dict[str, Any]]:
        """Analyze slow queries and provide recommendations."""
        slow_queries = []
        
        with self.lock:
            for query_hash, metrics in self.query_metrics.items():
                if metrics.is_slow_query:
                    analysis = self.query_analyzer.analyze_query(metrics.query_text)
                    slow_queries.append({
                        'query_hash': query_hash,
                        'metrics': asdict(metrics),
                        'analysis': analysis
                    })
        
        return slow_queries

    def get_index_recommendations(self) -> List[IndexRecommendation]:
        """Get index recommendations based on query analysis."""
        recommendations = []
        
        with self.lock:
            for metrics in self.query_metrics.values():
                if metrics.execution_count > 10:  # Only for frequently executed queries
                    analysis = self.query_analyzer.analyze_query(metrics.query_text)
                    recommendations.extend(analysis['index_recommendations'])
        
        # Remove duplicates and sort by priority
        unique_recommendations = {}
        for rec in recommendations:
            key = (rec.table_name, tuple(rec.columns), rec.index_type)
            if key not in unique_recommendations or rec.priority > unique_recommendations[key].priority:
                unique_recommendations[key] = rec
        
        return sorted(unique_recommendations.values(), key=lambda x: x.priority, reverse=True)

    def warm_cache(self, queries: List[Tuple[str, Dict[str, Any]]]) -> Dict[str, bool]:
        """Warm cache with frequently used queries."""
        results = {}
        
        for query_text, params in queries:
            try:
                # Execute query to populate cache
                self.execute_optimized_query(query_text, params, use_cache=True)
                results[query_text] = True
            except Exception as e:
                logger.error(f"Failed to warm cache for query: {e}")
                results[query_text] = False
        
        return results

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics."""
        with self.lock:
            total_queries = sum(m.execution_count for m in self.query_metrics.values())
            total_cache_hits = sum(m.cache_hits for m in self.query_metrics.values())
            total_cache_misses = sum(m.cache_misses for m in self.query_metrics.values())
            
            cache_hit_rate = 0.0
            if total_cache_hits + total_cache_misses > 0:
                cache_hit_rate = total_cache_hits / (total_cache_hits + total_cache_misses)
            
            slow_query_count = sum(1 for m in self.query_metrics.values() if m.is_slow_query)
            
            return {
                'total_queries': total_queries,
                'unique_queries': len(self.query_metrics),
                'cache_hit_rate': round(cache_hit_rate, 3),
                'slow_query_count': slow_query_count,
                'slow_query_percentage': round((slow_query_count / len(self.query_metrics) * 100) if self.query_metrics else 0, 2),
                'pool_metrics': self.pool_optimizer.get_pool_metrics() if self.pool_optimizer else {},
                'cache_metrics': self.query_cache.cache_manager.get_metrics()
            }

    def _record_query_metrics(self, query_hash: str, query_text: str, 
                            execution_time_ms: float, cache_hit: bool = False, error: str = None):
        """Record query execution metrics."""
        with self.lock:
            if query_hash not in self.query_metrics:
                self.query_metrics[query_hash] = QueryMetrics(
                    query_hash=query_hash,
                    query_text=query_text
                )
            
            metrics = self.query_metrics[query_hash]
            metrics.record_execution(execution_time_ms, cache_hit)
            
            # Track slow queries
            if metrics.is_slow_query:
                self.slow_queries.append({
                    'query_hash': query_hash,
                    'execution_time_ms': execution_time_ms,
                    'timestamp': datetime.now(),
                    'error': error
                })

    def _determine_query_type(self, query_text: str) -> str:
        """Determine query type for caching strategy."""
        query_lower = query_text.lower()
        
        if 'count(' in query_lower:
            return 'count'
        elif any(agg in query_lower for agg in ['sum(', 'avg(', 'max(', 'min(', 'group by']):
            return 'aggregation'
        elif any(dist in query_lower for dist in ['earth_distance', 'st_distance', 'latitude', 'longitude']):
            return 'distance'
        else:
            return 'select'


# Decorator for automatic query optimization
def optimized_query(use_cache: bool = True, cache_ttl: Optional[int] = None, tags: List[str] = None):
    """Decorator for automatic query optimization."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get database optimizer
            optimizer = get_database_optimizer()
            
            # Execute function with optimization
            return optimizer.execute_optimized_query(
                query_text=func.__doc__ or str(func),
                params=kwargs,
                use_cache=use_cache,
                cache_ttl=cache_ttl
            )
        return wrapper
    return decorator


# Global database optimizer instance
_database_optimizer = None


def get_database_optimizer() -> DatabaseOptimizer:
    """Get the global database optimizer instance."""
    global _database_optimizer
    
    if _database_optimizer is None:
        from database.connection_manager import get_connection_manager
        _database_optimizer = DatabaseOptimizer(get_connection_manager())
        _database_optimizer.initialize()
    
    return _database_optimizer
