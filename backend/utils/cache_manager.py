#!/usr/bin/env python3
"""Cache Manager for JewGo Backend.
===============================

Provides Redis-based caching functionality for improved API performance.
Implements intelligent caching strategies for restaurant data, search results,
and frequently accessed information.

Author: JewGo Development Team
Version: 2.0
Last Updated: 2024
"""

import hashlib
import json
import os
import pickle
import traceback
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, List, Optional, Union

from utils.logging_config import get_logger

try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = get_logger(__name__)
"""Cache Manager for JewGo Backend.
===============================

Provides Redis-based caching functionality for improved API performance.
Implements intelligent caching strategies for restaurant data, search results,
and frequently accessed information.

Author: JewGo Development Team
Version: 2.0
Last Updated: 2024
"""

try:
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, falling back to in-memory cache")


class CacheError(Exception):
    """Base exception for cache-related errors."""

    pass


class CacheConnectionError(CacheError):
    """Raised when unable to connect to cache backend."""

    pass


class CacheOperationError(CacheError):
    """Raised when cache operations fail."""

    pass


class CacheManager:
    """Redis-based cache manager with fallback to in-memory caching."""

    def __init__(self, redis_url: str | None = None, default_ttl: int = 300) -> None:
        """Initialize cache manager.

        Args:
            redis_url: Redis connection URL
            default_ttl: Default cache TTL in seconds

        """
        self.default_ttl = default_ttl
        self.redis_client = None
        self.memory_cache = {}
        # Base prefix for restaurant list caching
        self.RESTAURANTS_LIST_PREFIX = "restaurants:list"

        # Health tracking
        self._is_healthy = True
        self._last_error = None
        self._error_count = 0

        if REDIS_AVAILABLE and redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
                # Test connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.error(
                    "Failed to connect to Redis, using memory cache",
                    error=str(e),
                    traceback=traceback.format_exc(),
                )
                self.redis_client = None
                self._is_healthy = False
                self._last_error = {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                    "type": "connection_error",
                }
        else:
            logger.info("Using in-memory cache (Redis not available)")

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a cache key from prefix and arguments."""
        key_parts = [prefix]

        # Add positional arguments
        for arg in args:
            key_parts.append(str(arg))

        # Add keyword arguments (sorted for consistency)
        for key, value in sorted(kwargs.items()):
            key_parts.append(f"{key}:{value}")

        key_string = ":".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()

    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache.

        Args:
            key: Cache key
            default: Default value if key not found

        Returns:
            Cached value or default

        Raises:
            CacheOperationError: If cache operation fails
        """
        try:
            if self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    return pickle.loads(value)
            # Memory cache
            elif key in self.memory_cache:
                data = self.memory_cache[key]
                if data["expires_at"] > datetime.now():
                    return data["value"]
                del self.memory_cache[key]
        except Exception as e:
            self._log_cache_error("get", key, e)
            raise CacheOperationError(f"Failed to get cache key '{key}': {str(e)}")

        return default

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds

        Returns:
            True if successful

        Raises:
            CacheOperationError: If cache operation fails
        """
        try:
            ttl = ttl or self.default_ttl

            if self.redis_client:
                result = self.redis_client.setex(
                    key,
                    ttl,
                    pickle.dumps(value),
                )
                return bool(result)
            # Memory cache
            self.memory_cache[key] = {
                "value": value,
                "expires_at": datetime.now() + timedelta(seconds=ttl),
            }
            return True
        except Exception as e:
            self._log_cache_error("set", key, e)
            raise CacheOperationError(f"Failed to set cache key '{key}': {str(e)}")

    def delete(self, key: str) -> bool:
        """Delete value from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if successful

        Raises:
            CacheOperationError: If cache operation fails
        """
        try:
            if self.redis_client:
                return bool(self.redis_client.delete(key))
            if key in self.memory_cache:
                del self.memory_cache[key]
            return True
        except Exception as e:
            self._log_cache_error("delete", key, e)
            raise CacheOperationError(f"Failed to delete cache key '{key}': {str(e)}")

    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern.

        Args:
            pattern: Pattern to match keys

        Returns:
            Number of keys deleted

        Raises:
            CacheOperationError: If cache operation fails
        """
        try:
            if self.redis_client:
                keys = self.redis_client.keys(pattern)
                if keys:
                    return self.redis_client.delete(*keys)
            else:
                # Memory cache - simple pattern matching
                deleted = 0
                keys_to_delete = [k for k in self.memory_cache if pattern in k]
                for key in keys_to_delete:
                    del self.memory_cache[key]
                    deleted += 1
                return deleted
        except Exception as e:
            self._log_cache_error("clear_pattern", pattern, e)
            raise CacheOperationError(f"Failed to clear pattern '{pattern}': {str(e)}")

    def _log_cache_error(self, operation: str, key: str, error: Exception) -> None:
        """Log cache errors with context."""
        self._error_count += 1
        self._last_error = {
            "operation": operation,
            "key": key,
            "error": str(error),
            "timestamp": datetime.now().isoformat(),
            "type": type(error).__name__,
        }

        logger.error(
            "Cache operation failed",
            operation=operation,
            key=key,
            error=str(error),
            error_type=type(error).__name__,
            error_count=self._error_count,
            cache_type="redis" if self.redis_client else "memory",
            traceback=traceback.format_exc(),
        )

    def get_health_status(self) -> dict:
        """Get cache health status for monitoring."""
        status = {
            "is_healthy": self._is_healthy,
            "cache_type": "redis" if self.redis_client else "memory",
            "error_count": self._error_count,
            "last_error": self._last_error,
            "memory_cache_size": len(self.memory_cache),
            "timestamp": datetime.now().isoformat(),
        }

        # Test Redis connection if available
        if self.redis_client:
            try:
                self.redis_client.ping()
                status["redis_connected"] = True
                status["redis_info"] = self.redis_client.info()
            except Exception as e:
                status["redis_connected"] = False
                status["redis_error"] = str(e)
                self._is_healthy = False

        return status

    def reset_health_status(self) -> None:
        """Reset health status counters."""
        self._is_healthy = True
        self._error_count = 0
        self._last_error = None
        logger.info("Cache health status reset")

    def invalidate_restaurant_cache(self, restaurant_id: int | None = None) -> None:
        """Invalidate restaurant-related cache.

        Args:
            restaurant_id: Specific restaurant ID to invalidate, or None for all
        """
        try:
            if restaurant_id:
                self.clear_pattern(f"restaurant:{restaurant_id}:*")
            else:
                self.clear_pattern("restaurant:*")
            self.clear_pattern("search:*")
            self.clear_pattern("statistics:*")
        except CacheOperationError as e:
            logger.warning("Failed to invalidate restaurant cache", error=str(e))

    def _restaurants_key(
        self, limit: int | None = None, offset: int | None = None
    ) -> str:
        """Build a cache key for restaurant lists, optionally including pagination."""
        if limit is None and offset is None:
            return self.RESTAURANTS_LIST_PREFIX
        return f"{self.RESTAURANTS_LIST_PREFIX}:l{limit or 0}:o{offset or 0}"

    def cache_restaurants(self, restaurants: list[dict], ttl: int = 600) -> bool:
        """Cache restaurant list using a legacy stable key (no pagination)."""
        try:
            return self.set(self._restaurants_key(), restaurants, ttl)
        except CacheOperationError:
            return False

    def cache_restaurants_paginated(
        self,
        restaurants: list[dict],
        limit: int,
        offset: int,
        ttl: int = 600,
    ) -> bool:
        """Cache restaurant list with pagination-aware key."""
        try:
            return self.set(self._restaurants_key(limit, offset), restaurants, ttl)
        except CacheOperationError:
            return False

    def get_cached_restaurants(self) -> list[dict] | None:
        """Get cached restaurant list using the legacy stable key."""
        try:
            return self.get(self._restaurants_key())
        except CacheOperationError:
            return None

    def get_cached_restaurants_paginated(
        self, limit: int, offset: int
    ) -> list[dict] | None:
        """Get cached restaurant list for specific pagination parameters."""
        try:
            return self.get(self._restaurants_key(limit, offset))
        except CacheOperationError:
            return None

    def cache_search_results(
        self,
        query: str,
        filters: dict,
        results: list[dict],
        ttl: int = 300,
    ) -> bool:
        """Cache search results."""
        try:
            key = self._generate_key("search", query, **filters)
            return self.set(key, results, ttl)
        except CacheOperationError:
            return False

    def get_cached_search_results(self, query: str, filters: dict) -> list[dict] | None:
        """Get cached search results."""
        try:
            key = self._generate_key("search", query, **filters)
            return self.get(key)
        except CacheOperationError:
            return None


# Global cache manager instance
cache_manager = CacheManager(
    redis_url=os.environ.get("REDIS_URL"),
    default_ttl=300,
)


def cached(ttl: int = 300, key_prefix: str = "default"):
    """Decorator for caching function results.

    Args:
        ttl: Cache TTL in seconds
        key_prefix: Prefix for cache key

    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache_manager._generate_key(key_prefix, *args, **kwargs)

            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug("Cache hit", function_name=func.__name__)
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            logger.debug("Cache miss, cached result", function_name=func.__name__)

            return result

        return wrapper

    return decorator


def invalidate_cache(pattern: str):
    """Decorator to invalidate cache after function execution."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            cache_manager.clear_pattern(pattern)
            return result

        return wrapper

    return decorator
