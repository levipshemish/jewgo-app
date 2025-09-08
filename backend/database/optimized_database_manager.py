#!/usr/bin/env python3
"""
Optimized Database Manager for JewGo
===================================
This module provides optimized database operations with:
- Connection pooling
- Query optimization
- Result caching
- Performance monitoring
- Prepared statements
"""

import time
import logging
from typing import Any, Dict, List, Optional, Tuple
from contextlib import contextmanager
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Engine

from utils.logging_config import get_logger
from services.redis_cache_service import RedisCacheService

logger = get_logger(__name__)


class OptimizedDatabaseManager:
    """Optimized database manager with connection pooling and caching."""
    
    def __init__(self, database_url: str, redis_url: str = None):
        """Initialize the optimized database manager."""
        self.database_url = database_url
        self.redis_cache = RedisCacheService(redis_url) if redis_url else None
        
        # Connection pool configuration
        self.engine = self._create_optimized_engine()
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Query cache configuration
        self.query_cache_ttl = {
            'restaurant_list': 1800,      # 30 minutes
            'restaurant_detail': 3600,    # 1 hour
            'search_results': 900,        # 15 minutes
            'count_queries': 300,         # 5 minutes
        }
        
        # Performance monitoring
        self.query_stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_query_time': 0.0,
            'slow_queries': 0
        }
    
    def _create_optimized_engine(self) -> Engine:
        """Create an optimized SQLAlchemy engine with connection pooling."""
        return create_engine(
            self.database_url,
            # Connection pooling
            poolclass=QueuePool,
            pool_size=20,                    # Number of connections to maintain
            max_overflow=30,                 # Additional connections when needed
            pool_timeout=30,                 # Timeout for getting connection
            pool_recycle=3600,               # Recycle connections every hour
            pool_pre_ping=True,              # Verify connections before use
            
            # Performance optimizations
            echo=False,                      # Set to True for SQL debugging
            echo_pool=False,                 # Set to True for pool debugging
            
            # Connection arguments
            connect_args={
                'connect_timeout': 10,
                'application_name': 'jewgo_backend',
                'options': '-c default_transaction_isolation=read committed'
            }
        )
    
    @contextmanager
    def get_session(self):
        """Get a database session with automatic cleanup."""
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
    
    def _generate_cache_key(self, query_type: str, **params) -> str:
        """Generate a cache key for query results."""
        import hashlib
        import json
        
        # Sort parameters for consistent key generation
        sorted_params = sorted(params.items())
        key_data = f"{query_type}:{json.dumps(sorted_params, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _execute_cached_query(
        self, 
        query_type: str, 
        query_func: callable, 
        cache_ttl: int = None,
        **params
    ) -> Any:
        """Execute a query with caching."""
        start_time = time.time()
        self.query_stats['total_queries'] += 1
        
        # Generate cache key
        cache_key = self._generate_cache_key(query_type, **params)
        
        # Try to get from cache first
        if self.redis_cache:
            try:
                cached_result = self.redis_cache.get(cache_key, query_type)
                if cached_result is not None:
                    self.query_stats['cache_hits'] += 1
                    logger.debug(f"Cache hit for {query_type}: {cache_key[:8]}...")
                    return cached_result
            except Exception as e:
                logger.warning(f"Cache retrieval error: {e}")
        
        self.query_stats['cache_misses'] += 1
        
        # Execute query
        try:
            result = query_func()
            
            # Cache the result
            if self.redis_cache and result is not None:
                ttl = cache_ttl or self.query_cache_ttl.get(query_type, 1800)
                try:
                    self.redis_cache.set(cache_key, result, ttl, query_type)
                except Exception as e:
                    logger.warning(f"Cache storage error: {e}")
            
            # Update performance stats
            query_time = time.time() - start_time
            self._update_query_stats(query_time)
            
            if query_time > 1.0:  # Slow query threshold
                self.query_stats['slow_queries'] += 1
                logger.warning(f"Slow query detected: {query_type} took {query_time:.2f}s")
            
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"Database query error: {e}")
            raise
    
    def _update_query_stats(self, query_time: float):
        """Update query performance statistics."""
        total_queries = self.query_stats['total_queries']
        current_avg = self.query_stats['avg_query_time']
        
        # Calculate running average
        self.query_stats['avg_query_time'] = (
            (current_avg * (total_queries - 1) + query_time) / total_queries
        )
    
    def get_restaurants_optimized(
        self,
        filters: Dict[str, Any] = None,
        limit: int = 100,
        offset: int = 0,
        order_by: str = 'name'
    ) -> List[Dict[str, Any]]:
        """Get restaurants with optimized query and caching."""
        
        def execute_query():
            with self.get_session() as session:
                # Build optimized query
                query = text("""
                    SELECT 
                        id, name, address, city, state, zip_code,
                        latitude, longitude, phone_number, website,
                        kosher_category, certifying_agency, status,
                        google_rating, google_review_count, price_range,
                        is_cholov_yisroel, is_pas_yisroel, cholov_stam,
                        created_at, updated_at
                    FROM restaurants 
                    WHERE status = 'active'
                """)
                
                # Add filters
                if filters:
                    if 'kosher_category' in filters:
                        query = text(str(query) + " AND kosher_category = :kosher_category")
                    if 'city' in filters:
                        query = text(str(query) + " AND city ILIKE :city")
                    if 'state' in filters:
                        query = text(str(query) + " AND state = :state")
                
                # Add ordering and pagination
                query = text(str(query) + f" ORDER BY {order_by} LIMIT :limit OFFSET :offset")
                
                # Execute query
                result = session.execute(query, {
                    'kosher_category': filters.get('kosher_category') if filters else None,
                    'city': f"%{filters.get('city')}%" if filters and filters.get('city') else None,
                    'state': filters.get('state') if filters else None,
                    'limit': limit,
                    'offset': offset
                })
                
                # Convert to list of dictionaries
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        
        return self._execute_cached_query(
            'restaurant_list',
            execute_query,
            filters=filters or {},
            limit=limit,
            offset=offset,
            order_by=order_by
        )
    
    def get_restaurant_by_id_optimized(self, restaurant_id: int) -> Optional[Dict[str, Any]]:
        """Get single restaurant with optimized query and caching."""
        
        def execute_query():
            with self.get_session() as session:
                query = text("""
                    SELECT 
                        id, name, address, city, state, zip_code,
                        latitude, longitude, phone_number, website,
                        kosher_category, certifying_agency, status,
                        google_rating, google_review_count, price_range,
                        is_cholov_yisroel, is_pas_yisroel, cholov_stam,
                        hours, hours_parsed, created_at, updated_at
                    FROM restaurants 
                    WHERE id = :restaurant_id AND status = 'active'
                """)
                
                result = session.execute(query, {'restaurant_id': restaurant_id})
                row = result.fetchone()
                
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        
        return self._execute_cached_query(
            'restaurant_detail',
            execute_query,
            restaurant_id=restaurant_id
        )
    
    def search_restaurants_optimized(
        self,
        query_text: str,
        filters: Dict[str, Any] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Search restaurants with optimized full-text search."""
        
        def execute_query():
            with self.get_session() as session:
                # Use PostgreSQL full-text search
                query = text("""
                    SELECT 
                        id, name, address, city, state, zip_code,
                        latitude, longitude, phone_number, website,
                        kosher_category, certifying_agency, status,
                        google_rating, google_review_count, price_range,
                        is_cholov_yisroel, is_pas_yisroel, cholov_stam,
                        ts_rank(to_tsvector('english', name || ' ' || COALESCE(address, '')), 
                                plainto_tsquery('english', :query_text)) as rank
                    FROM restaurants 
                    WHERE status = 'active'
                    AND to_tsvector('english', name || ' ' || COALESCE(address, '')) 
                        @@ plainto_tsquery('english', :query_text)
                """)
                
                # Add filters
                if filters:
                    if 'kosher_category' in filters:
                        query = text(str(query) + " AND kosher_category = :kosher_category")
                    if 'city' in filters:
                        query = text(str(query) + " AND city ILIKE :city")
                
                # Add ordering and pagination
                query = text(str(query) + " ORDER BY rank DESC, name LIMIT :limit OFFSET :offset")
                
                result = session.execute(query, {
                    'query_text': query_text,
                    'kosher_category': filters.get('kosher_category') if filters else None,
                    'city': f"%{filters.get('city')}%" if filters and filters.get('city') else None,
                    'limit': limit,
                    'offset': offset
                })
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        
        return self._execute_cached_query(
            'search_results',
            execute_query,
            query_text=query_text,
            filters=filters or {},
            limit=limit,
            offset=offset
        )
    
    def get_restaurants_count_optimized(self, filters: Dict[str, Any] = None) -> int:
        """Get total count of restaurants with caching."""
        
        def execute_query():
            with self.get_session() as session:
                query = text("SELECT COUNT(*) FROM restaurants WHERE status = 'active'")
                
                if filters:
                    if 'kosher_category' in filters:
                        query = text(str(query) + " AND kosher_category = :kosher_category")
                    if 'city' in filters:
                        query = text(str(query) + " AND city ILIKE :city")
                    if 'state' in filters:
                        query = text(str(query) + " AND state = :state")
                
                result = session.execute(query, {
                    'kosher_category': filters.get('kosher_category') if filters else None,
                    'city': f"%{filters.get('city')}%" if filters and filters.get('city') else None,
                    'state': filters.get('state') if filters else None
                })
                
                return result.scalar()
        
        return self._execute_cached_query(
            'count_queries',
            execute_query,
            filters=filters or {}
        )
    
    def get_restaurants_by_distance_optimized(
        self,
        latitude: float,
        longitude: float,
        max_distance_miles: float = 50,
        filters: Dict[str, Any] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get restaurants within distance using optimized spatial query."""
        
        def execute_query():
            with self.get_session() as session:
                # Use PostgreSQL earthdistance extension for efficient distance calculations
                query = text("""
                    SELECT 
                        id, name, address, city, state, zip_code,
                        latitude, longitude, phone_number, website,
                        kosher_category, certifying_agency, status,
                        google_rating, google_review_count, price_range,
                        is_cholov_yisroel, is_pas_yisroel, cholov_stam,
                        earth_distance(ll_to_earth(:lat, :lng), ll_to_earth(latitude, longitude)) * 0.000621371 as distance_miles
                    FROM restaurants 
                    WHERE status = 'active'
                    AND latitude IS NOT NULL 
                    AND longitude IS NOT NULL
                    AND earth_distance(ll_to_earth(:lat, :lng), ll_to_earth(latitude, longitude)) * 0.000621371 <= :max_distance
                """)
                
                # Add filters
                if filters:
                    if 'kosher_category' in filters:
                        query = text(str(query) + " AND kosher_category = :kosher_category")
                    if 'city' in filters:
                        query = text(str(query) + " AND city ILIKE :city")
                
                # Add ordering and pagination
                query = text(str(query) + " ORDER BY distance_miles LIMIT :limit")
                
                result = session.execute(query, {
                    'lat': latitude,
                    'lng': longitude,
                    'max_distance': max_distance_miles,
                    'kosher_category': filters.get('kosher_category') if filters else None,
                    'city': f"%{filters.get('city')}%" if filters and filters.get('city') else None,
                    'limit': limit
                })
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        
        return self._execute_cached_query(
            'distance_results',
            execute_query,
            latitude=latitude,
            longitude=longitude,
            max_distance_miles=max_distance_miles,
            filters=filters or {},
            limit=limit
        )
    
    def invalidate_cache(self, cache_type: str = None):
        """Invalidate query cache."""
        if self.redis_cache:
            try:
                if cache_type:
                    self.redis_cache.clear_namespace(cache_type)
                else:
                    # Clear all restaurant-related caches
                    for cache_type in self.query_cache_ttl.keys():
                        self.redis_cache.clear_namespace(cache_type)
                logger.info(f"Invalidated cache: {cache_type or 'all'}")
            except Exception as e:
                logger.error(f"Cache invalidation error: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get database performance statistics."""
        total_queries = self.query_stats['total_queries']
        cache_hit_rate = (
            (self.query_stats['cache_hits'] / total_queries * 100) 
            if total_queries > 0 else 0
        )
        
        return {
            'total_queries': total_queries,
            'cache_hits': self.query_stats['cache_hits'],
            'cache_misses': self.query_stats['cache_misses'],
            'cache_hit_rate_percent': round(cache_hit_rate, 2),
            'avg_query_time_ms': round(self.query_stats['avg_query_time'] * 1000, 2),
            'slow_queries': self.query_stats['slow_queries'],
            'pool_size': self.engine.pool.size(),
            'checked_in_connections': self.engine.pool.checkedin(),
            'checked_out_connections': self.engine.pool.checkedout(),
            'overflow_connections': self.engine.pool.overflow(),
            'redis_connected': self.redis_cache is not None and self.redis_cache.redis is not None
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform database health check."""
        try:
            with self.get_session() as session:
                # Test basic connectivity
                result = session.execute(text("SELECT 1")).scalar()
                
                # Get database info
                db_info = session.execute(text("""
                    SELECT 
                        current_database() as database_name,
                        version() as version,
                        current_user as current_user
                """)).fetchone()
                
                return {
                    'status': 'healthy',
                    'connected': True,
                    'database_name': db_info[0],
                    'version': db_info[1],
                    'current_user': db_info[2],
                    'pool_stats': self.get_performance_stats()
                }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e)
            }
