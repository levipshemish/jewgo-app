#!/usr/bin/env python3
"""
API Response Caching System for JewGo App.

Provides intelligent caching for API responses with:
- Redis-based caching
- Cache invalidation strategies
- Response compression
- Cache warming
- Performance metrics
"""

import json
import hashlib
import time
import gzip
from typing import Any, Dict, Optional, Union, Callable
from datetime import datetime, timedelta
from functools import wraps

import redis
from flask import request, jsonify, current_app
from utils.logging_config import get_logger

logger = get_logger(__name__)


class APIResponseCache:
    """Intelligent API response caching system."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.default_ttl = 300  # 5 minutes
        self.compression_threshold = 1024  # Compress responses > 1KB
        self.cache_prefix = "api_cache:"
        self.metrics = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'invalidations': 0
        }
    
    def _get_cache_key(self, endpoint: str, params: Dict[str, Any] = None) -> str:
        """Generate cache key from endpoint and parameters."""
        # Create a deterministic key from endpoint and sorted parameters
        key_data = {
            'endpoint': endpoint,
            'params': sorted(params.items()) if params else {}
        }
        
        # Add user context if available
        if hasattr(request, 'user') and request.user:
            key_data['user_id'] = request.user.get('user_id')
        
        # Create hash for consistent key length
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"{self.cache_prefix}{endpoint}:{key_hash}"
    
    def _compress_response(self, data: str) -> bytes:
        """Compress response data if it exceeds threshold."""
        if len(data) > self.compression_threshold:
            return gzip.compress(data.encode('utf-8'))
        return data.encode('utf-8')
    
    def _decompress_response(self, data: bytes) -> str:
        """Decompress response data if it's compressed."""
        try:
            return gzip.decompress(data).decode('utf-8')
        except (gzip.BadGzipFile, UnicodeDecodeError):
            return data.decode('utf-8')
    
    def get(self, endpoint: str, params: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Get cached response for endpoint."""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._get_cache_key(endpoint, params)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                self.metrics['hits'] += 1
                logger.debug(f"Cache hit for {endpoint}")
                
                # Decompress if needed
                response_data = self._decompress_response(cached_data)
                return json.loads(response_data)
            else:
                self.metrics['misses'] += 1
                logger.debug(f"Cache miss for {endpoint}")
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for {endpoint}: {e}")
            return None
    
    def set(self, endpoint: str, data: Dict[str, Any], ttl: Optional[int] = None, 
            params: Dict[str, Any] = None) -> bool:
        """Cache response data for endpoint."""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self._get_cache_key(endpoint, params)
            response_data = json.dumps(data, default=str)
            
            # Compress if needed
            compressed_data = self._compress_response(response_data)
            
            # Set with TTL
            ttl = ttl or self.default_ttl
            self.redis_client.setex(cache_key, ttl, compressed_data)
            
            self.metrics['sets'] += 1
            logger.debug(f"Cached response for {endpoint} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for {endpoint}: {e}")
            return False
    
    def invalidate(self, endpoint: str, pattern: Optional[str] = None) -> int:
        """Invalidate cache entries for endpoint."""
        if not self.redis_client:
            return 0
        
        try:
            if pattern:
                # Invalidate by pattern
                cache_pattern = f"{self.cache_prefix}{endpoint}:*{pattern}*"
            else:
                # Invalidate all for endpoint
                cache_pattern = f"{self.cache_prefix}{endpoint}:*"
            
            keys = self.redis_client.keys(cache_pattern)
            if keys:
                deleted_count = self.redis_client.delete(*keys)
                self.metrics['invalidations'] += deleted_count
                logger.info(f"Invalidated {deleted_count} cache entries for {endpoint}")
                return deleted_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache invalidation error for {endpoint}: {e}")
            return 0
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics."""
        total_requests = self.metrics['hits'] + self.metrics['misses']
        hit_rate = (self.metrics['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.metrics['hits'],
            'misses': self.metrics['misses'],
            'sets': self.metrics['sets'],
            'invalidations': self.metrics['invalidations'],
            'hit_rate_percent': round(hit_rate, 2),
            'total_requests': total_requests
        }


def cache_response(ttl: int = 300, key_params: Optional[list] = None, 
                  condition: Optional[Callable] = None):
    """
    Decorator to cache API responses.
    
    Args:
        ttl: Time to live in seconds
        key_params: List of request parameters to include in cache key
        condition: Function to determine if response should be cached
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get cache instance
            cache = getattr(current_app, 'api_cache', None)
            if not cache:
                return func(*args, **kwargs)
            
            # Build cache parameters
            cache_params = {}
            if key_params:
                for param in key_params:
                    if param in request.args:
                        cache_params[param] = request.args.get(param)
            
            # Check cache first
            endpoint = f"{request.endpoint or func.__name__}"
            cached_response = cache.get(endpoint, cache_params)
            
            if cached_response:
                logger.debug(f"Serving cached response for {endpoint}")
                return jsonify(cached_response)
            
            # Execute function
            response = func(*args, **kwargs)
            
            # Check if we should cache this response
            should_cache = True
            if condition:
                should_cache = condition(response)
            
            # Cache successful responses
            if should_cache and hasattr(response, 'json') and response.status_code == 200:
                try:
                    response_data = response.get_json()
                    cache.set(endpoint, response_data, ttl, cache_params)
                except Exception as e:
                    logger.warning(f"Failed to cache response for {endpoint}: {e}")
            
            return response
        
        return wrapper
    return decorator


def invalidate_cache(endpoint: str, pattern: Optional[str] = None):
    """Helper function to invalidate cache."""
    cache = getattr(current_app, 'api_cache', None)
    if cache:
        cache.invalidate(endpoint, pattern)


# Global cache instance
api_response_cache = APIResponseCache()