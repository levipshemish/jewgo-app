#!/usr/bin/env python3
"""Cache Manager v4 for DatabaseManager v4 with Redis integration and performance optimizations."""
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from redis.exceptions import (
    ConnectionError,
    TimeoutError,
    RedisError,
)
from utils.logging_config import get_logger
from utils.error_handler import handle_cache_operation
logger = get_logger(__name__)
# Global memory cache instance
memory_cache = None
class CircuitBreaker:
    """Simple circuit breaker for Redis operations."""
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                logger.warning("Circuit breaker is OPEN, skipping Redis operation")
                return None
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info("Circuit breaker reset to CLOSED")
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(f"Circuit breaker opened after {self.failure_count} failures")
            raise e
    def is_open(self) -> bool:
        """Check if circuit breaker is open."""
        return self.state == "OPEN"
class CacheManagerV4:
    """Enhanced cache manager with Redis and memory fallback."""
    def __init__(
        self,
        redis_url: Optional[str] = None,
        enable_cache: bool = True,
        cache_prefix: str = "jewgo:",
        default_ttl: int = 3600,
        max_retries: int = 2,
        retry_delay: float = 0.1,
    ) -> None:
        """Initialize cache manager.
        Args:
            redis_url: Redis connection URL
            enable_cache: Whether to enable caching
            cache_prefix: Prefix for cache keys
            default_ttl: Default time-to-live in seconds
            max_retries: Maximum retry attempts for transient errors
            retry_delay: Base delay between retries (will be exponential)
        """
        self.enable_cache = enable_cache
        self.cache_prefix = cache_prefix
        self.default_ttl = default_ttl
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        # Redis client and health tracking
        self.redis_client = None
        self._is_healthy = False
        self._last_error = None
        self._error_count = 0
        # Circuit breaker for Redis operations
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60)
        # Initialize cache backends
        if self.enable_cache:
            self._initialize_redis(redis_url)
            self._initialize_memory_cache()
    def _initialize_redis(self, redis_url: Optional[str]) -> None:
        """Initialize Redis connection."""
        try:
            if redis_url:
                # Use the enhanced Redis client factory
                from utils.redis_client import get_redis_client
                self.redis_client = get_redis_client()
                
                # Test connection
                if self.redis_client:
                    self.redis_client.ping()
                    logger.info("Redis cache initialized successfully")
                    self._is_healthy = True
                else:
                    logger.warning("Redis client not available, using memory cache only")
                    self._is_healthy = False
            else:
                # No Redis URL provided, use memory cache only
                self.redis_client = None
                self._is_healthy = False
                logger.info("No Redis URL provided, using memory cache only")
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
    def _is_transient_error(self, error: Exception) -> bool:
        """Determine if an error is transient and should be retried."""
        if isinstance(error, (ConnectionError, RedisError)):
            return True
        if isinstance(error, TimeoutError):
            return True
        if "Connection reset by peer" in str(error):
            return True
        return False
    def _retry_operation(self, operation_name: str, operation_func, *args, **kwargs):
        """Retry an operation with exponential backoff for transient errors."""
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                return operation_func(*args, **kwargs)
            except Exception as e:
                last_error = e
                if not self._is_transient_error(e) or attempt == self.max_retries:
                    # Don't retry non-transient errors or after max attempts
                    break
                # Calculate delay with exponential backoff
                delay = self.retry_delay * (2 ** attempt)
                logger.warning(
                    f"Redis {operation_name} attempt {attempt + 1} failed, "
                    f"retrying in {delay:.2f}s: {e}"
                )
                time.sleep(delay)
        # If we get here, all retries failed
        raise last_error
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from cache with retry logic."""
        if not self.enable_cache:
            return default
        try:
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_get():
                    return self.redis_client.get(key)
                value = self._retry_operation("get", redis_get)
                if value is not None:
                    return json.loads(value)
            elif hasattr(self, "_memory_cache"):
                if key in self._memory_cache:
                    cache_entry = self._memory_cache[key]
                    if cache_entry["expires_at"] > datetime.now():
                        return cache_entry["value"]
                    else:
                        # Remove expired entry
                        del self._memory_cache[key]
            return default
        except Exception as e:
            self._handle_cache_error("get", e)
            return default
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set a value in cache with retry logic."""
        if not self.enable_cache:
            return False
        try:
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_set():
                    return self.redis_client.setex(key, ttl, serialized_value)
                return self._retry_operation("set", redis_set)
            elif self.redis_client and self.circuit_breaker.is_open():
                # Redis is available but circuit breaker is open - return False
                return False
            elif hasattr(self, "_memory_cache"):
                # Fall back to memory cache only when Redis is not available
                expires_at = datetime.now() + timedelta(seconds=ttl)
                self._memory_cache[key] = {"value": value, "expires_at": expires_at}
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
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_delete():
                    return self.redis_client.delete(key)
                return bool(self._retry_operation("delete", redis_delete))
            elif hasattr(self, "_memory_cache"):
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
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_delete_pattern():
                    keys = self.redis_client.keys(pattern)
                    if keys:
                        return self.redis_client.delete(*keys)
                    return 0
                return self._retry_operation("delete_pattern", redis_delete_pattern)
            elif hasattr(self, "_memory_cache"):
                # Simple pattern matching for memory cache
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
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_exists():
                    return self.redis_client.exists(key)
                return bool(self._retry_operation("exists", redis_exists))
            elif hasattr(self, "_memory_cache"):
                if key in self._memory_cache:
                    cache_entry = self._memory_cache[key]
                    if cache_entry["expires_at"] > datetime.now():
                        return True
                    else:
                        # Remove expired entry
                        del self._memory_cache[key]
            return False
        except Exception as e:
            self._handle_cache_error("exists", e)
            return False
    def clear(self) -> bool:
        """Clear all cache data."""
        if not self.enable_cache:
            return False
        try:
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_clear():
                    return self.redis_client.flushdb()
                return bool(self._retry_operation("clear", redis_clear))
            elif hasattr(self, "_memory_cache"):
                self._memory_cache.clear()
                return True
            return False
        except Exception as e:
            self._handle_cache_error("clear", e)
            return False
    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache."""
        if not self.enable_cache:
            return {}
        try:
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_get_many():
                    # Use pipeline for efficiency
                    pipe = self.redis_client.pipeline()
                    for key in keys:
                        pipe.get(key)
                    results = pipe.execute()
                    # Parse results
                    parsed_results = {}
                    for key, value in zip(keys, results):
                        if value is not None:
                            try:
                                parsed_results[key] = json.loads(value)
                            except (json.JSONDecodeError, TypeError):
                                # Skip invalid JSON
                                continue
                    return parsed_results
                return self._retry_operation("get_many", redis_get_many)
            elif hasattr(self, "_memory_cache"):
                # Memory cache implementation
                results = {}
                current_time = datetime.now()
                for key in keys:
                    if key in self._memory_cache:
                        cache_entry = self._memory_cache[key]
                        if cache_entry["expires_at"] > current_time:
                            results[key] = cache_entry["value"]
                        else:
                            # Remove expired entry
                            del self._memory_cache[key]
                return results
            return {}
        except Exception as e:
            self._handle_cache_error("get_many", e)
            return {}
    def set_many(self, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values in cache."""
        if not self.enable_cache:
            return False
        try:
            ttl = ttl or self.default_ttl
            if self.redis_client and not self.circuit_breaker.is_open():
                def redis_set_many():
                    # Use pipeline for efficiency
                    pipe = self.redis_client.pipeline()
                    for key, value in data.items():
                        serialized_value = json.dumps(value, default=str)
                        pipe.setex(key, ttl, serialized_value)
                    pipe.execute()
                    return True
                return self._retry_operation("set_many", redis_set_many)
            elif hasattr(self, "_memory_cache"):
                # Memory cache implementation
                current_time = datetime.now()
                expires_at = current_time + timedelta(seconds=ttl)
                for key, value in data.items():
                    self._memory_cache[key] = {"value": value, "expires_at": expires_at}
                return True
            return False
        except Exception as e:
            self._handle_cache_error("set_many", e)
            return False
    def get_cached_restaurant_details(self, restaurant_id: str) -> Optional[Dict[str, Any]]:
        """Get cached restaurant details."""
        if not self.enable_cache:
            return None
        try:
            cache_key = self._generate_cache_key("restaurant_details", restaurant_id)
            cached_data = self.get(cache_key)
            if cached_data:
                logger.debug(f"Cache hit for restaurant {restaurant_id}")
                return cached_data
            logger.debug(f"Cache miss for restaurant {restaurant_id}")
            return None
        except Exception as e:
            self._handle_cache_error("get_cached_restaurant_details", e)
            return None
    def cache_restaurant_details(self, restaurant_id: str, data: Dict[str, Any], ttl: int = 1800) -> bool:
        """Cache restaurant details."""
        if not self.enable_cache:
            return False
        try:
            cache_key = self._generate_cache_key("restaurant_details", restaurant_id)
            success = self.set(cache_key, data, ttl)
            if success:
                logger.debug(f"Cached restaurant {restaurant_id} for {ttl}s")
            return success
        except Exception as e:
            self._handle_cache_error("cache_restaurant_details", e)
            return False
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics and health information."""
        stats = {
            "enable_cache": self.enable_cache,
            "cache_prefix": self.cache_prefix,
            "default_ttl": self.default_ttl,
            "is_healthy": self._is_healthy,
            "error_count": self._error_count,
            "last_error": self._last_error,
            "circuit_breaker_state": self.circuit_breaker.state,
            "circuit_breaker_failures": self.circuit_breaker.failure_count,
        }
        # Add Redis-specific stats
        if self.redis_client:
            try:
                info = self.redis_client.info()
                stats["redis"] = {
                    "type": "redis",
                    "version": info.get("redis_version", "Unknown"),
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "Unknown"),
                }
            except Exception as e:
                stats["redis"] = {"type": "redis", "error": str(e)}
        else:
            stats["redis"] = {"type": "none"}
        # Add memory cache stats
        if hasattr(self, "_memory_cache"):
            stats["memory_cache"] = {
                "type": "memory",
                "size": len(self._memory_cache),
            }
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
            elif hasattr(self, "_memory_cache"):
                # Memory cache is always healthy
                self._is_healthy = True
                return True
            else:
                self._is_healthy = False
                return False
        except Exception as e:
            self._is_healthy = False
            self._last_error = str(e)
            self._error_count += 1
            logger.error("Cache health check failed", error=str(e))
            return False
    def _handle_cache_error(self, operation: str, error: Exception) -> None:
        """Handle cache errors with enhanced classification and logging."""
        self._error_count += 1
        self._last_error = str(error)
        # Classify error type for better handling
        if "Connection reset by peer" in str(error):
            error_type = "connection_reset_peer"
            error_level = "warning"
        else:
            error_type = "unknown"
            error_level = "error"
        # Log with structured information
        log_data = {
            "operation": operation,
            "error_type": error_type,
            "error_message": str(error),
            "error_count": self._error_count,
            "circuit_breaker_state": self.circuit_breaker.state,
        }
        if error_level == "warning":
            logger.warning(f"Cache {operation} transient error", **log_data)
        else:
            logger.error(f"Cache {operation} error", **log_data)
        # Update circuit breaker
        if self._is_transient_error(error):
            self.circuit_breaker.failure_count += 1
            if self.circuit_breaker.failure_count >= self.circuit_breaker.failure_threshold:
                self.circuit_breaker.state = "OPEN"
                self.circuit_breaker.last_failure_time = time.time()
                logger.error(f"Circuit breaker opened after {self.circuit_breaker.failure_count} failures")
    @handle_cache_operation
    def close(self) -> None:
        """Close cache connections."""
        if self.redis_client:
            self.redis_client.close()
            logger.info("Redis cache connection closed")
class CacheDecorator:
    """Decorator for caching function results."""
    def __init__(
        self,
        cache_manager: CacheManagerV4,
        ttl: Optional[int] = None,
        key_prefix: str = "",
    ):
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
                f"{self.key_prefix}{func.__name__}", *args, **kwargs
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
    def cache_restaurant_decorator(func):
        return CacheDecorator(
            cache_manager=(
                func.__self__.cache_manager
                if hasattr(func.__self__, "cache_manager")
                else None
            ),
            ttl=ttl,
            key_prefix="restaurant:",
        )(func)
    return cache_restaurant_decorator
def cache_review(ttl: int = 900):  # 15 minutes
    """Decorator for caching review-related functions."""
    def cache_review_decorator(func):
        return CacheDecorator(
            cache_manager=(
                func.__self__.cache_manager
                if hasattr(func.__self__, "cache_manager")
                else None
            ),
            ttl=ttl,
            key_prefix="review:",
        )(func)
    return cache_review_decorator
def cache_user(ttl: int = 3600):  # 1 hour
    """Decorator for caching user-related functions."""
    def cache_user_decorator(func):
        return CacheDecorator(
            cache_manager=(
                func.__self__.cache_manager
                if hasattr(func.__self__, "cache_manager")
                else None
            ),
            ttl=ttl,
            key_prefix="user:",
        )(func)
    return cache_user_decorator
