from utils.logging_config import get_logger
from utils.error_handler import handle_cache_operation

import json
import hashlib
import time
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Cache Manager v4 for DatabaseManager v4 with Redis integration and performance optimizations."""

try:
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None



class CacheManagerV4:
    """Enhanced cache manager with Redis integration and performance optimizations."""

    def __init__(
        self,
        redis_url: Optional[str] = None,
        default_ttl: int = 3600,  # 1 hour default
        enable_cache: bool = True,
        cache_prefix: str = "jewgo:v4:",
    ) -> None:
        """Initialize the cache manager.

        Args:
            redis_url: Redis connection URL
            default_ttl: Default time-to-live in seconds
            enable_cache: Whether to enable caching
            cache_prefix: Prefix for cache keys
        """
        self.default_ttl = default_ttl
        self.enable_cache = enable_cache
        self.cache_prefix = cache_prefix
        self.redis_client = None
        self._is_healthy = True
        self._last_error = None
        self._error_count = 0

        if enable_cache and REDIS_AVAILABLE:
            self._initialize_redis(redis_url)
        elif enable_cache and not REDIS_AVAILABLE:
            logger.warning("Redis not available, falling back to in-memory cache")
            self._initialize_memory_cache()

    def _initialize_redis(self, redis_url: Optional[str]) -> None:
        """Initialize Redis connection."""
        try:
            if redis_url:
                self.redis_client = redis.from_url(redis_url)
            else:
                # Default to localhost
                self.redis_client = redis.Redis(host='localhost', port=6379, db=0)

            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache initialized successfully")
            self._is_healthy = True

        except Exception as e:
            logger.error("Failed to initialize Redis cache", error=str(e))
            self._is_healthy = False
            self._last_error = str(e)
            self.redis_client = None

    def _initialize_memory_cache(self) -> None:
        """Initialize in-memory cache as fallback."""
        self._memory_cache = {}
        logger.info("In-memory cache initialized as fallback")

    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a unique cache key."""
        # Create a string representation of the arguments
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            key_parts.append(str(arg))
        
        # Add keyword arguments (sorted for consistency)
        for key, value in sorted(kwargs.items()):
            key_parts.append(f"{key}:{value}")
        
        # Create a hash of the key parts
        key_string = ":".join(key_parts)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"{self.cache_prefix}{key_hash}"

    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from cache."""
        if not self.enable_cache:
            return default

        try:
            if self.redis_client:
                value = self.redis_client.get(key)
                if value is not None:
                    return json.loads(value)
            elif hasattr(self, '_memory_cache'):
                if key in self._memory_cache:
                    cache_entry = self._memory_cache[key]
                    if cache_entry['expires_at'] > datetime.now():
                        return cache_entry['value']
                    else:
                        # Remove expired entry
                        del self._memory_cache[key]

            return default

        except Exception as e:
            self._handle_cache_error("get", e)
            return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set a value in cache."""
        if not self.enable_cache:
            return False

        try:
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)

            if self.redis_client:
                return self.redis_client.setex(key, ttl, serialized_value)
            elif hasattr(self, '_memory_cache'):
                expires_at = datetime.now() + timedelta(seconds=ttl)
                self._memory_cache[key] = {
                    'value': value,
                    'expires_at': expires_at
                }
                return True

            return False

        except Exception as e:
            self._handle_cache_error("set", e)
            return False

    def delete(self, key: str) -> bool:
        """Delete a value from cache."""
        if not self.enable_cache:
            return False

        try:
            if self.redis_client:
                return bool(self.redis_client.delete(key))
            elif hasattr(self, '_memory_cache'):
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    return True

            return False

        except Exception as e:
            self._handle_cache_error("delete", e)
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete multiple keys matching a pattern."""
        if not self.enable_cache:
            return 0

        try:
            if self.redis_client:
                keys = self.redis_client.keys(pattern)
                if keys:
                    return self.redis_client.delete(*keys)
            elif hasattr(self, '_memory_cache'):
                deleted_count = 0
                keys_to_delete = [k for k in self._memory_cache.keys() if pattern in k]
                for key in keys_to_delete:
                    del self._memory_cache[key]
                    deleted_count += 1
                return deleted_count

            return 0

        except Exception as e:
            self._handle_cache_error("delete_pattern", e)
            return 0

    def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        if not self.enable_cache:
            return False

        try:
            if self.redis_client:
                return bool(self.redis_client.exists(key))
            elif hasattr(self, '_memory_cache'):
                if key in self._memory_cache:
                    cache_entry = self._memory_cache[key]
                    if cache_entry['expires_at'] > datetime.now():
                        return True
                    else:
                        # Remove expired entry
                        del self._memory_cache[key]

            return False

        except Exception as e:
            self._handle_cache_error("exists", e)
            return False

    def clear(self) -> bool:
        """Clear all cache entries."""
        if not self.enable_cache:
            return False

        try:
            if self.redis_client:
                return bool(self.redis_client.flushdb())
            elif hasattr(self, '_memory_cache'):
                self._memory_cache.clear()
                return True

            return False

        except Exception as e:
            self._handle_cache_error("clear", e)
            return False

    def get_or_set(self, key: str, default_func, ttl: Optional[int] = None) -> Any:
        """Get a value from cache or set it using a default function."""
        value = self.get(key)
        if value is not None:
            return value

        # Value not in cache, compute it
        value = default_func()
        self.set(key, value, ttl)
        return value

    def invalidate_restaurant_cache(self, restaurant_id: Optional[int] = None) -> int:
        """Invalidate restaurant-related cache entries."""
        if restaurant_id:
            pattern = f"{self.cache_prefix}restaurant:{restaurant_id}:*"
        else:
            pattern = f"{self.cache_prefix}restaurant:*"
        
        return self.delete_pattern(pattern)

    def invalidate_review_cache(self, review_id: Optional[str] = None, restaurant_id: Optional[int] = None) -> int:
        """Invalidate review-related cache entries."""
        if review_id:
            pattern = f"{self.cache_prefix}review:{review_id}:*"
        elif restaurant_id:
            pattern = f"{self.cache_prefix}review:restaurant:{restaurant_id}:*"
        else:
            pattern = f"{self.cache_prefix}review:*"
        
        return self.delete_pattern(pattern)

    def invalidate_user_cache(self, user_id: Optional[str] = None) -> int:
        """Invalidate user-related cache entries."""
        if user_id:
            pattern = f"{self.cache_prefix}user:{user_id}:*"
        else:
            pattern = f"{self.cache_prefix}user:*"
        
        return self.delete_pattern(pattern)

    def invalidate_image_cache(self, restaurant_id: Optional[int] = None) -> int:
        """Invalidate image-related cache entries."""
        if restaurant_id:
            pattern = f"{self.cache_prefix}image:restaurant:{restaurant_id}:*"
        else:
            pattern = f"{self.cache_prefix}image:*"
        
        return self.delete_pattern(pattern)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        stats = {
            "enabled": self.enable_cache,
            "healthy": self._is_healthy,
            "error_count": self._error_count,
            "last_error": self._last_error,
        }

        try:
            if self.redis_client:
                info = self.redis_client.info()
                stats.update({
                    "type": "redis",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                })
            elif hasattr(self, '_memory_cache'):
                stats.update({
                    "type": "memory",
                    "cache_size": len(self._memory_cache),
                })

        except Exception as e:
            logger.error("Error getting cache stats", error=str(e))
            stats["error"] = str(e)

        return stats

    def health_check(self) -> bool:
        """Check cache health."""
        if not self.enable_cache:
            return True

        try:
            if self.redis_client:
                self.redis_client.ping()
                self._is_healthy = True
                return True
            elif hasattr(self, '_memory_cache'):
                # Memory cache is always healthy
                self._is_healthy = True
                return True

            return False

        except Exception as e:
            self._is_healthy = False
            self._last_error = str(e)
            self._error_count += 1
            logger.error("Cache health check failed", error=str(e))
            return False

    def _handle_cache_error(self, operation: str, error: Exception) -> None:
        """Handle cache errors."""
        self._error_count += 1
        self._last_error = str(error)
        logger.error(f"Cache {operation} error", error=str(error))

    @handle_cache_operation
    def close(self) -> None:
        """Close cache connections."""
        if self.redis_client:
            self.redis_client.close()
            logger.info("Redis cache connection closed")


class CacheDecorator:
    """Decorator for caching function results."""

    def __init__(self, cache_manager: CacheManagerV4, ttl: Optional[int] = None, key_prefix: str = ""):
        """Initialize the cache decorator.

        Args:
            cache_manager: Cache manager instance
            ttl: Time-to-live for cached values
            key_prefix: Prefix for cache keys
        """
        self.cache_manager = cache_manager
        self.ttl = ttl
        self.key_prefix = key_prefix

    def __call__(self, func):
        """Decorator implementation."""
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = self.cache_manager._generate_cache_key(
                f"{self.key_prefix}{func.__name__}",
                *args,
                **kwargs
            )

            # Try to get from cache
            cached_result = self.cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            self.cache_manager.set(cache_key, result, self.ttl)
            return result

        return wrapper


# Convenience functions for common cache operations
def cache_restaurant(ttl: int = 1800):  # 30 minutes
    """Decorator for caching restaurant-related functions."""
    def decorator(func):
        return CacheDecorator(
            cache_manager=func.__self__.cache_manager if hasattr(func.__self__, 'cache_manager') else None,
            ttl=ttl,
            key_prefix="restaurant:"
        )(func)
    return decorator


def cache_review(ttl: int = 900):  # 15 minutes
    """Decorator for caching review-related functions."""
    def decorator(func):
        return CacheDecorator(
            cache_manager=func.__self__.cache_manager if hasattr(func.__self__, 'cache_manager') else None,
            ttl=ttl,
            key_prefix="review:"
        )(func)
    return decorator


def cache_user(ttl: int = 3600):  # 1 hour
    """Decorator for caching user-related functions."""
    def decorator(func):
        return CacheDecorator(
            cache_manager=func.__self__.cache_manager if hasattr(func.__self__, 'cache_manager') else None,
            ttl=ttl,
            key_prefix="user:"
        )(func)
    return decorator


def cache_statistics(ttl: int = 300):  # 5 minutes
    """Decorator for caching statistics functions."""
    def decorator(func):
        return CacheDecorator(
            cache_manager=func.__self__.cache_manager if hasattr(func.__self__, 'cache_manager') else None,
            ttl=ttl,
            key_prefix="stats:"
        )(func)
    return decorator
