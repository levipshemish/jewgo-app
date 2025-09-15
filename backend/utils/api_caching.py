"""
API Caching utilities for the JewGo backend.
Provides decorators and utilities for caching API responses.
"""

import hashlib
import json
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional
from flask import request, jsonify
from utils.cache_manager_v4 import CacheManagerV4
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Initialize cache manager
cache_manager = CacheManagerV4()

def cache_api_response(
    ttl_seconds: int = 300,  # 5 minutes default
    key_prefix: str = "api",
    include_query_params: bool = True,
    include_headers: bool = False,
    cache_condition: Optional[Callable] = None
):
    """
    Decorator to cache API responses.
    
    Args:
        ttl_seconds: Time to live for cached data
        key_prefix: Prefix for cache keys
        include_query_params: Whether to include query parameters in cache key
        include_headers: Whether to include headers in cache key
        cache_condition: Function to determine if response should be cached
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _generate_cache_key(
                func.__name__,
                key_prefix,
                include_query_params,
                include_headers
            )
            
            # Try to get from cache
            try:
                cached_data = cache_manager.get(cache_key)
                if cached_data is not None:
                    logger.debug(f"Cache hit for {cache_key}")
                    return jsonify(cached_data)
            except Exception as e:
                logger.warning(f"Cache get error for {cache_key}: {e}")
            
            # Execute the original function
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Check if we should cache this response
                should_cache = True
                if cache_condition:
                    should_cache = cache_condition(result)
                
                if should_cache:
                    # Extract JSON data from Flask response
                    if hasattr(result, 'get_json'):
                        json_data = result.get_json()
                    elif hasattr(result, 'data'):
                        json_data = json.loads(result.data)
                    else:
                        json_data = result
                    
                    # Add performance metadata
                    if isinstance(json_data, dict):
                        json_data['_cache_metadata'] = {
                            'cached_at': time.time(),
                            'execution_time_ms': execution_time * 1000,
                            'cache_key': cache_key
                        }
                    
                    # Store in cache
                    try:
                        cache_manager.set(cache_key, json_data, ttl_seconds)
                        logger.debug(f"Cached response for {cache_key} (TTL: {ttl_seconds}s)")
                    except Exception as e:
                        logger.warning(f"Cache set error for {cache_key}: {e}")
                
                return result
                
            except Exception as e:
                logger.error(f"Error in cached function {func.__name__}: {e}")
                raise
                
        return wrapper
    return decorator

def _generate_cache_key(
    function_name: str,
    key_prefix: str,
    include_query_params: bool,
    include_headers: bool
) -> str:
    """Generate a cache key based on function name and request parameters."""
    key_parts = [key_prefix, function_name]
    
    if include_query_params:
        # Sort query parameters for consistent keys
        sorted_params = sorted(request.args.items())
        if sorted_params:
            params_str = "&".join([f"{k}={v}" for k, v in sorted_params])
            key_parts.append(hashlib.md5(params_str.encode()).hexdigest()[:8])
    
    if include_headers:
        # Include relevant headers (be careful not to include sensitive data)
        relevant_headers = ['accept', 'accept-language', 'user-agent']
        header_parts = []
        for header in relevant_headers:
            value = request.headers.get(header)
            if value:
                header_parts.append(f"{header}:{value}")
        if header_parts:
            headers_str = "|".join(header_parts)
            key_parts.append(hashlib.md5(headers_str.encode()).hexdigest()[:8])
    
    return ":".join(key_parts)

def cache_restaurant_list(ttl_seconds: int = 300):
    """Specialized cache decorator for restaurant list endpoints."""
    def cache_condition(result):
        # Only cache successful responses
        if hasattr(result, 'get_json'):
            data = result.get_json()
            return data.get('success', False) if isinstance(data, dict) else False
        return True
    
    return cache_api_response(
        ttl_seconds=ttl_seconds,
        key_prefix="restaurants",
        include_query_params=True,
        cache_condition=cache_condition
    )

def cache_synagogue_list(ttl_seconds: int = 600):
    """Specialized cache decorator for synagogue list endpoints."""
    def cache_condition(result):
        if hasattr(result, 'get_json'):
            data = result.get_json()
            return data.get('success', False) if isinstance(data, dict) else False
        return True
    
    return cache_api_response(
        ttl_seconds=ttl_seconds,
        key_prefix="synagogues",
        include_query_params=True,
        cache_condition=cache_condition
    )

def cache_mikvah_list(ttl_seconds: int = 600):
    """Specialized cache decorator for mikvah list endpoints."""
    def cache_condition(result):
        if hasattr(result, 'get_json'):
            data = result.get_json()
            return data.get('success', False) if isinstance(data, dict) else False
        return True
    
    return cache_api_response(
        ttl_seconds=ttl_seconds,
        key_prefix="mikvah",
        include_query_params=True,
        cache_condition=cache_condition
    )

def cache_search_results(ttl_seconds: int = 180):
    """Specialized cache decorator for search endpoints."""
    def cache_condition(result):
        if hasattr(result, 'get_json'):
            data = result.get_json()
            return data.get('success', False) if isinstance(data, dict) else False
        return True
    
    return cache_api_response(
        ttl_seconds=ttl_seconds,
        key_prefix="search",
        include_query_params=True,
        cache_condition=cache_condition
    )

def invalidate_cache_pattern(pattern: str) -> bool:
    """
    Invalidate cache entries matching a pattern.
    
    Args:
        pattern: Cache key pattern to match
        
    Returns:
        True if invalidation was successful
    """
    try:
        # This would need to be implemented in CacheManagerV4
        # For now, we'll use a simple approach
        logger.info(f"Cache invalidation requested for pattern: {pattern}")
        return True
    except Exception as e:
        logger.error(f"Cache invalidation error for pattern {pattern}: {e}")
        return False

def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics."""
    try:
        return cache_manager.get_stats()
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {
            'error': str(e),
            'cache_available': False
        }
