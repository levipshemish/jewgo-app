"""
Redis Cache Service for JewGo Backend
====================================

This service provides advanced Redis caching capabilities for the JewGo backend,
including distributed caching, intelligent invalidation, and performance optimization.

Features:
- Distributed caching with Redis
- Intelligent cache invalidation
- Cache warming strategies
- Performance monitoring
- Fallback mechanisms
- Cache compression

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import json
import logging
import time
import hashlib
import pickle
import gzip
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import redis
from redis.exceptions import RedisError, ConnectionError
import os

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """Configuration for cache operations."""

    ttl: int = 3600  # Default TTL in seconds
    compress: bool = True  # Enable compression for large objects
    compress_threshold: int = 1024  # Minimum size for compression
    namespace: str = "jewgo"  # Cache namespace
    retry_attempts: int = 3  # Number of retry attempts
    retry_delay: float = 0.1  # Delay between retries


@dataclass
class CacheStats:
    """Cache performance statistics."""

    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    compression_ratio: float = 0.0
    avg_response_time_ms: float = 0.0


class RedisCacheService:
    """Advanced Redis caching service with intelligent features."""

    def __init__(
        self,
        redis_url: str = None,
        config: CacheConfig = None,
        enable_compression: bool = True,
    ):
        """Initialize the Redis cache service."""
        self.config = config or CacheConfig()
        self.enable_compression = enable_compression
        self.stats = CacheStats()
        self.response_times = []

        # Initialize Redis connection
        try:
            if redis_url:
                self.redis = redis.from_url(redis_url)
            else:
                # Fallback to environment variables
                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", 6379))
                redis_password = os.getenv("REDIS_PASSWORD")
                redis_db = int(os.getenv("REDIS_DB", 0))

                self.redis = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    db=redis_db,
                    decode_responses=False,  # Keep as bytes for compression
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                )

            # Test connection
            self.redis.ping()
            logger.info("Redis cache service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")
            self.redis = None

    def _generate_key(self, key: str, namespace: str = None) -> str:
        """Generate a namespaced cache key."""
        namespace = namespace or self.config.namespace
        return f"{namespace}:{key}"

    def _compress_data(self, data: Any) -> bytes:
        """Compress data using gzip."""
        try:
            serialized = pickle.dumps(data)
            if len(serialized) > self.config.compress_threshold:
                compressed = gzip.compress(serialized)
                compression_ratio = len(compressed) / len(serialized)
                self.stats.compression_ratio = (
                    self.stats.compression_ratio + compression_ratio
                ) / 2
                return b"gzip:" + compressed
            return b"pickle:" + serialized
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return b"pickle:" + pickle.dumps(data)

    def _decompress_data(self, data: bytes) -> Any:
        """Decompress data."""
        try:
            if data.startswith(b"gzip:"):
                compressed = data[5:]
                serialized = gzip.decompress(compressed)
                return pickle.loads(serialized)
            elif data.startswith(b"pickle:"):
                serialized = data[7:]
                return pickle.loads(serialized)
            else:
                # Legacy format
                return pickle.loads(data)
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            return None

    def get(self, key: str, namespace: str = None) -> Optional[Any]:
        """Get value from cache with retry logic."""
        start_time = time.time()
        cache_key = self._generate_key(key, namespace)

        if not self.redis:
            self.stats.misses += 1
            return None

        for attempt in range(self.config.retry_attempts):
            try:
                data = self.redis.get(cache_key)
                if data is not None:
                    result = self._decompress_data(data)
                    self.stats.hits += 1

                    # Record response time
                    response_time = (time.time() - start_time) * 1000
                    self.response_times.append(response_time)
                    if len(self.response_times) > 100:
                        self.response_times.pop(0)

                    self.stats.avg_response_time_ms = sum(self.response_times) / len(
                        self.response_times
                    )
                    return result
                else:
                    self.stats.misses += 1
                    return None

            except (RedisError, ConnectionError) as e:
                logger.warning(f"Redis get attempt {attempt + 1} failed: {e}")
                if attempt < self.config.retry_attempts - 1:
                    time.sleep(self.config.retry_delay)
                else:
                    self.stats.errors += 1
                    return None

        return None

    def set(self, key: str, value: Any, ttl: int = None, namespace: str = None) -> bool:
        """Set value in cache with retry logic."""
        start_time = time.time()
        cache_key = self._generate_key(key, namespace)
        ttl = ttl or self.config.ttl

        if not self.redis:
            return False

        try:
            compressed_data = self._compress_data(value)

            for attempt in range(self.config.retry_attempts):
                try:
                    success = self.redis.setex(cache_key, ttl, compressed_data)
                    if success:
                        self.stats.sets += 1

                        # Record response time
                        response_time = (time.time() - start_time) * 1000
                        self.response_times.append(response_time)
                        if len(self.response_times) > 100:
                            self.response_times.pop(0)

                        self.stats.avg_response_time_ms = sum(
                            self.response_times
                        ) / len(self.response_times)
                        return True
                    return False

                except (RedisError, ConnectionError) as e:
                    logger.warning(f"Redis set attempt {attempt + 1} failed: {e}")
                    if attempt < self.config.retry_attempts - 1:
                        time.sleep(self.config.retry_delay)
                    else:
                        self.stats.errors += 1
                        return False

        except Exception as e:
            logger.error(f"Cache set failed: {e}")
            self.stats.errors += 1
            return False

        return False

    def delete(self, key: str, namespace: str = None) -> bool:
        """Delete value from cache."""
        cache_key = self._generate_key(key, namespace)

        if not self.redis:
            return False

        try:
            result = self.redis.delete(cache_key)
            if result > 0:
                self.stats.deletes += 1
                return True
            return False
        except Exception as e:
            logger.error(f"Cache delete failed: {e}")
            self.stats.errors += 1
            return False

    def delete_pattern(self, pattern: str, namespace: str = None) -> int:
        """Delete multiple keys matching a pattern."""
        if not self.redis:
            return 0

        try:
            full_pattern = self._generate_key(pattern, namespace)
            keys = self.redis.keys(full_pattern)
            if keys:
                deleted = self.redis.delete(*keys)
                self.stats.deletes += deleted
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern failed: {e}")
            self.stats.errors += 1
            return 0

    def get_or_set(
        self, key: str, default_func, ttl: int = None, namespace: str = None
    ) -> Any:
        """Get value from cache or set default if not exists."""
        result = self.get(key, namespace)
        if result is not None:
            return result

        # Generate default value
        try:
            default_value = default_func()
            self.set(key, default_value, ttl, namespace)
            return default_value
        except Exception as e:
            logger.error(f"Default function failed: {e}")
            return None

    def cache_restaurants_with_distance(
        self,
        latitude: float,
        longitude: float,
        max_distance_miles: float,
        filters: Dict[str, Any],
        restaurants: List[Dict[str, Any]],
        ttl: int = 1800,  # 30 minutes
    ) -> bool:
        """Cache distance-filtered restaurants with intelligent key generation."""
        try:
            # Create cache key based on parameters
            key_parts = [
                "restaurants",
                "distance",
                f"lat_{latitude:.6f}",
                f"lng_{longitude:.6f}",
                f"dist_{max_distance_miles}",
                hashlib.md5(json.dumps(filters, sort_keys=True).encode()).hexdigest()[
                    :8
                ],
            ]
            cache_key = ":".join(key_parts)

            return self.set(cache_key, restaurants, ttl, "distance_filtering")

        except Exception as e:
            logger.error(f"Failed to cache distance restaurants: {e}")
            return False

    def get_cached_restaurants_with_distance(
        self,
        latitude: float,
        longitude: float,
        max_distance_miles: float,
        filters: Dict[str, Any],
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached distance-filtered restaurants."""
        try:
            # Create cache key based on parameters
            key_parts = [
                "restaurants",
                "distance",
                f"lat_{latitude:.6f}",
                f"lng_{longitude:.6f}",
                f"dist_{max_distance_miles}",
                hashlib.md5(json.dumps(filters, sort_keys=True).encode()).hexdigest()[
                    :8
                ],
            ]
            cache_key = ":".join(key_parts)

            return self.get(cache_key, "distance_filtering")

        except Exception as e:
            logger.error(f"Failed to get cached distance restaurants: {e}")
            return None

    def cache_open_now_status(
        self,
        restaurant_ids: List[int],
        open_status: Dict[int, bool],
        ttl: int = 300,  # 5 minutes
    ) -> bool:
        """Cache open now status for restaurants."""
        try:
            cache_key = f"open_now:{hashlib.md5(str(sorted(restaurant_ids)).encode()).hexdigest()[:8]}"
            return self.set(cache_key, open_status, ttl, "open_now")
        except Exception as e:
            logger.error(f"Failed to cache open now status: {e}")
            return False

    def get_cached_open_now_status(
        self, restaurant_ids: List[int]
    ) -> Optional[Dict[int, bool]]:
        """Get cached open now status for restaurants."""
        try:
            cache_key = f"open_now:{hashlib.md5(str(sorted(restaurant_ids)).encode()).hexdigest()[:8]}"
            return self.get(cache_key, "open_now")
        except Exception as e:
            logger.error(f"Failed to get cached open now status: {e}")
            return None

    def warm_cache(self, warmup_data: Dict[str, Any]) -> bool:
        """Warm up cache with frequently accessed data."""
        try:
            success_count = 0
            total_count = 0

            for key, (value, ttl) in warmup_data.items():
                if self.set(key, value, ttl):
                    success_count += 1
                total_count += 1

            logger.info(
                f"Cache warming completed: {success_count}/{total_count} items cached"
            )
            return success_count == total_count

        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        total_requests = self.stats.hits + self.stats.misses
        hit_rate = (self.stats.hits / total_requests * 100) if total_requests > 0 else 0

        return {
            "hits": self.stats.hits,
            "misses": self.stats.misses,
            "sets": self.stats.sets,
            "deletes": self.stats.deletes,
            "errors": self.stats.errors,
            "hit_rate_percent": hit_rate,
            "compression_ratio": self.stats.compression_ratio,
            "avg_response_time_ms": self.stats.avg_response_time_ms,
            "total_requests": total_requests,
        }

    def clear_stats(self):
        """Clear performance statistics."""
        self.stats = CacheStats()
        self.response_times = []

    def health_check(self) -> bool:
        """Check Redis connection health."""
        if not self.redis:
            return False

        try:
            self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    def flush_all(self) -> bool:
        """Flush all cache data (use with caution)."""
        if not self.redis:
            return False

        try:
            self.redis.flushdb()
            logger.warning("All cache data flushed")
            return True
        except Exception as e:
            logger.error(f"Cache flush failed: {e}")
            return False


# Global cache service instance
cache_service = RedisCacheService()


def cache_decorator(ttl: int = 3600, namespace: str = None):
    """Decorator for automatic caching of function results."""

    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}_{v}" for k, v in sorted(kwargs.items())])
            cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try to get from cache
            result = cache_service.get(cache_key, namespace)
            if result is not None:
                return result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl, namespace)
            return result

        return wrapper

    return decorator
