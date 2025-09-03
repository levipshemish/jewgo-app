# !/usr/bin/env python3
"""Cache Manager for JewGo Backend.
==============================
This module provides caching functionality using Redis with memory fallback
to improve API performance and reduce database load.
Features:
- Redis-based caching with memory fallback
- TTL-based cache expiration
- Intelligent cache key generation
- Cache invalidation patterns
- Decorator-based caching
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
import hashlib
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Dict, Optional
import redis
from utils.logging_config import get_logger

logger = get_logger(__name__)
# In-memory cache fallback
_memory_cache: Dict[str, Dict[str, Any]] = {}


class CacheManager:
    """Cache manager with Redis and memory fallback."""

    def __init__(self, redis_url: Optional[str] = None) -> None:
        """Initialize cache manager."""
        self.redis_url = redis_url or os.getenv("REDIS_URL")
        self.redis_client = None
        self.use_redis = False
        if self.redis_url:
            try:
                self.redis_client = redis.from_url(self.redis_url)
                # Test connection
                self.redis_client.ping()
                self.use_redis = True
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.warning(f"Redis cache not available, using memory fallback: {e}")
                self.use_redis = False
        else:
            logger.info("No Redis URL provided, using memory cache")

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from prefix and arguments."""
        key_parts = [prefix]
        if args:
            key_parts.extend([str(arg) for arg in args])
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            key_parts.extend([f"{k}:{v}" for k, v in sorted_kwargs])
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            if self.use_redis and self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            else:
                # Memory cache
                if key in _memory_cache:
                    cache_entry = _memory_cache[key]
                    if cache_entry["expires_at"] > datetime.now():
                        return cache_entry["value"]
                    else:
                        # Remove expired entry
                        del _memory_cache[key]
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
        return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL."""
        try:
            if self.use_redis and self.redis_client:
                return self.redis_client.setex(key, ttl, json.dumps(value))
            else:
                # Memory cache
                expires_at = datetime.now() + timedelta(seconds=ttl)
                _memory_cache[key] = {"value": value, "expires_at": expires_at}
                return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            if self.use_redis and self.redis_client:
                return bool(self.redis_client.delete(key))
            else:
                # Memory cache
                if key in _memory_cache:
                    del _memory_cache[key]
                    return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
        return False

    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        try:
            if self.use_redis and self.redis_client:
                keys = self.redis_client.keys(pattern)
                if keys:
                    return self.redis_client.delete(*keys)
            else:
                # Memory cache - simple pattern matching
                deleted_count = 0
                keys_to_delete = []
                for key in _memory_cache:
                    if pattern.replace("*", "") in key:
                        keys_to_delete.append(key)
                for key in keys_to_delete:
                    del _memory_cache[key]
                    deleted_count += 1
                return deleted_count
        except Exception as e:
            logger.error(f"Error clearing cache pattern {pattern}: {e}")
        return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            if self.use_redis and self.redis_client:
                info = self.redis_client.info()
                return {
                    "type": "redis",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                }
            else:
                return {
                    "type": "memory",
                    "entries": len(_memory_cache),
                    "memory_usage": "unknown",
                }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"type": "error", "error": str(e)}


# Global cache manager instance
_cache_manager = CacheManager()
# Public export for external imports
cache_manager = _cache_manager


def get_cache(key: str) -> Optional[Any]:
    """Get value from global cache."""
    return _cache_manager.get(key)


def set_cache(key: str, value: Any, ttl: int = 300) -> bool:
    """Set value in global cache."""
    return _cache_manager.set(key, value, ttl)


def delete_cache(key: str) -> bool:
    """Delete value from global cache."""
    return _cache_manager.delete(key)


def clear_cache_pattern(pattern: str) -> int:
    """Clear all keys matching pattern from global cache."""
    return _cache_manager.clear_pattern(pattern)


def cached(ttl: int = 300, key_prefix: str = "cache") -> Callable:
    """Decorator for caching function results."""

    def cached_decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _cache_manager._generate_key(
                key_prefix, func.__name__, *args, **kwargs
            )
            # Try to get from cache
            cached_result = get_cache(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            # Execute function and cache result
            result = func(*args, **kwargs)
            set_cache(cache_key, result, ttl)
            logger.debug(f"Cache miss for {func.__name__}, cached result")
            return result

        return wrapper

    return cached_decorator


def invalidate_cache(pattern: str) -> Callable:
    """Decorator for invalidating cache after function execution."""

    def invalidate_cache_decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            clear_cache_pattern(pattern)
            logger.debug(f"Invalidated cache pattern: {pattern}")
            return result

        return wrapper

    return invalidate_cache_decorator


def get_cache_stats() -> Dict[str, Any]:
    """Get global cache statistics."""
    return _cache_manager.get_stats()
