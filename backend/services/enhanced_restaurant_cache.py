#!/usr/bin/env python3
"""
Enhanced Restaurant Cache Service
================================
This service provides intelligent caching for restaurant data with:
- Multi-level caching (Redis + Memory)
- Cache warming strategies
- Intelligent invalidation
- Performance monitoring
- Fallback mechanisms
"""

import json
import hashlib
import time
from typing import Any, Dict, List, Optional, Callable
from functools import wraps

from services.redis_cache_service import RedisCacheService
from utils.logging_config import get_logger

logger = get_logger(__name__)


class RestaurantCacheService:
    """Enhanced caching service specifically for restaurant data."""
    
    def __init__(self, redis_url: str = None):
        """Initialize the restaurant cache service."""
        self.redis_cache = RedisCacheService(redis_url)
        self.memory_cache = {}  # In-memory fallback
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'errors': 0,
            'warmed': 0
        }
        
        # Cache TTL configurations
        self.ttl_config = {
            'restaurant_list': 1800,      # 30 minutes
            'restaurant_detail': 3600,    # 1 hour
            'search_results': 900,        # 15 minutes
            'filtered_results': 1200,     # 20 minutes
            'distance_results': 600,      # 10 minutes
            'open_status': 300,           # 5 minutes
        }
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a consistent cache key from parameters."""
        # Sort kwargs for consistent key generation
        sorted_kwargs = sorted(kwargs.items())
        key_data = f"{prefix}:{json.dumps(sorted_kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get_restaurants_cached(
        self, 
        filters: Dict[str, Any] = None,
        limit: int = 100,
        offset: int = 0,
        fetch_func: Callable = None
    ) -> List[Dict[str, Any]]:
        """Get restaurants with intelligent caching."""
        cache_key = self._generate_cache_key(
            'restaurants_list',
            filters=filters or {},
            limit=limit,
            offset=offset
        )
        
        # Try Redis cache first
        try:
            cached_data = self.redis_cache.get(cache_key, 'restaurant_list')
            if cached_data:
                self.cache_stats['hits'] += 1
                logger.debug(f"Cache hit for restaurants list: {cache_key[:8]}...")
                return cached_data
        except Exception as e:
            logger.warning(f"Redis cache error: {e}")
            self.cache_stats['errors'] += 1
        
        # Try memory cache
        if cache_key in self.memory_cache:
            cache_entry = self.memory_cache[cache_key]
            if time.time() - cache_entry['timestamp'] < self.ttl_config['restaurant_list']:
                self.cache_stats['hits'] += 1
                logger.debug(f"Memory cache hit for restaurants list: {cache_key[:8]}...")
                return cache_entry['data']
        
        # Cache miss - fetch from source
        self.cache_stats['misses'] += 1
        logger.debug(f"Cache miss for restaurants list: {cache_key[:8]}...")
        
        if not fetch_func:
            return []
        
        try:
            data = fetch_func(filters, limit, offset)
            
            # Cache the result
            self._cache_restaurants_data(cache_key, data, 'restaurant_list')
            
            return data
        except Exception as e:
            logger.error(f"Error fetching restaurants data: {e}")
            return []
    
    def get_restaurant_cached(
        self, 
        restaurant_id: int,
        fetch_func: Callable = None
    ) -> Optional[Dict[str, Any]]:
        """Get single restaurant with caching."""
        cache_key = self._generate_cache_key('restaurant_detail', id=restaurant_id)
        
        # Try Redis cache first
        try:
            cached_data = self.redis_cache.get(cache_key, 'restaurant_detail')
            if cached_data:
                self.cache_stats['hits'] += 1
                return cached_data
        except Exception as e:
            logger.warning(f"Redis cache error: {e}")
        
        # Try memory cache
        if cache_key in self.memory_cache:
            cache_entry = self.memory_cache[cache_key]
            if time.time() - cache_entry['timestamp'] < self.ttl_config['restaurant_detail']:
                self.cache_stats['hits'] += 1
                return cache_entry['data']
        
        # Cache miss
        self.cache_stats['misses'] += 1
        
        if not fetch_func:
            return None
        
        try:
            data = fetch_func(restaurant_id)
            if data:
                self._cache_restaurants_data(cache_key, data, 'restaurant_detail')
            return data
        except Exception as e:
            logger.error(f"Error fetching restaurant {restaurant_id}: {e}")
            return None
    
    def get_search_results_cached(
        self,
        query: str,
        filters: Dict[str, Any] = None,
        limit: int = 20,
        offset: int = 0,
        fetch_func: Callable = None
    ) -> List[Dict[str, Any]]:
        """Get search results with caching."""
        cache_key = self._generate_cache_key(
            'search_results',
            query=query,
            filters=filters or {},
            limit=limit,
            offset=offset
        )
        
        # Try Redis cache first
        try:
            cached_data = self.redis_cache.get(cache_key, 'search_results')
            if cached_data:
                self.cache_stats['hits'] += 1
                return cached_data
        except Exception as e:
            logger.warning(f"Redis cache error: {e}")
        
        # Try memory cache
        if cache_key in self.memory_cache:
            cache_entry = self.memory_cache[cache_key]
            if time.time() - cache_entry['timestamp'] < self.ttl_config['search_results']:
                self.cache_stats['hits'] += 1
                return cache_entry['data']
        
        # Cache miss
        self.cache_stats['misses'] += 1
        
        if not fetch_func:
            return []
        
        try:
            data = fetch_func(query, filters, limit, offset)
            self._cache_restaurants_data(cache_key, data, 'search_results')
            return data
        except Exception as e:
            logger.error(f"Error fetching search results: {e}")
            return []
    
    def _cache_restaurants_data(self, key: str, data: Any, cache_type: str):
        """Cache restaurant data in both Redis and memory."""
        ttl = self.ttl_config.get(cache_type, 1800)
        
        # Cache in Redis
        try:
            self.redis_cache.set(key, data, ttl, cache_type)
        except Exception as e:
            logger.warning(f"Failed to cache in Redis: {e}")
        
        # Cache in memory
        self.memory_cache[key] = {
            'data': data,
            'timestamp': time.time(),
            'ttl': ttl
        }
        
        # Clean up old memory cache entries
        self._cleanup_memory_cache()
    
    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache."""
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self.memory_cache.items():
            if current_time - entry['timestamp'] > entry['ttl']:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.memory_cache[key]
    
    def invalidate_restaurant_cache(self, restaurant_id: int = None):
        """Invalidate cache entries for a specific restaurant or all restaurants."""
        try:
            if restaurant_id:
                # Invalidate specific restaurant
                cache_key = self._generate_cache_key('restaurant_detail', id=restaurant_id)
                self.redis_cache.delete(cache_key)
                if cache_key in self.memory_cache:
                    del self.memory_cache[cache_key]
                logger.info(f"Invalidated cache for restaurant {restaurant_id}")
            else:
                # Invalidate all restaurant caches
                self.redis_cache.clear_namespace('restaurant_list')
                self.redis_cache.clear_namespace('restaurant_detail')
                self.redis_cache.clear_namespace('search_results')
                self.memory_cache.clear()
                logger.info("Invalidated all restaurant caches")
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
    
    def warm_cache(self, popular_queries: List[Dict[str, Any]] = None):
        """Warm the cache with popular queries."""
        if not popular_queries:
            # Default popular queries
            popular_queries = [
                {'filters': {}, 'limit': 50, 'offset': 0},
                {'filters': {'kosher_category': 'Dairy'}, 'limit': 50, 'offset': 0},
                {'filters': {'kosher_category': 'Pareve'}, 'limit': 50, 'offset': 0},
            ]
        
        logger.info(f"Warming cache with {len(popular_queries)} queries")
        
        for query in popular_queries:
            try:
                # This would need to be called with the actual fetch function
                # For now, just log the warming attempt
                logger.debug(f"Warming cache for query: {query}")
                self.cache_stats['warmed'] += 1
            except Exception as e:
                logger.error(f"Error warming cache: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.cache_stats['hits'],
            'misses': self.cache_stats['misses'],
            'errors': self.cache_stats['errors'],
            'warmed': self.cache_stats['warmed'],
            'hit_rate_percent': round(hit_rate, 2),
            'memory_cache_size': len(self.memory_cache),
            'redis_connected': self.redis_cache.redis is not None
        }


def cache_restaurants(ttl: int = 1800, cache_type: str = 'restaurant_list'):
    """Decorator for caching restaurant data."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # This would be implemented with the actual cache service
            # For now, just call the original function
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Global cache service instance
restaurant_cache = RestaurantCacheService()
