"""
Redis Type Definitions for JewGo Backend

This module provides comprehensive type definitions for Redis operations,
including cache management, session handling, and rate limiting.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Union,
    Protocol,
    TypedDict,
    Literal,
    TypeVar,
    Generic,
    Callable,
    Awaitable,
)
from dataclasses import dataclass, field

# Type variables for generic operations
T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")


# Redis Data Types
class RedisDataType(str, Enum):
    """Redis data types enumeration."""

    STRING = "string"
    HASH = "hash"
    LIST = "list"
    SET = "set"
    ZSET = "zset"
    STREAM = "stream"
    JSON = "json"


# Redis Connection Types
class RedisConnectionConfig(TypedDict, total=False):
    """Redis connection configuration."""

    host: str
    port: int
    db: int
    password: Optional[str]
    username: Optional[str]
    ssl: bool
    ssl_cert_reqs: Optional[str]
    decode_responses: bool
    socket_timeout: Optional[float]
    socket_connect_timeout: Optional[float]
    retry_on_timeout: bool
    max_connections: Optional[int]
    health_check_interval: Optional[int]


class RedisUrlConfig(TypedDict):
    """Redis URL configuration."""

    url: str
    decode_responses: bool


# Cache Entry Types
@dataclass
class CacheEntry(Generic[T]):
    """Generic cache entry with metadata."""

    key: str
    value: T
    timestamp: datetime
    ttl: int
    data_type: RedisDataType = RedisDataType.STRING

    def is_expired(self) -> bool:
        """Check if cache entry is expired."""
        return datetime.now() > self.timestamp + timedelta(seconds=self.ttl)

    def time_to_live(self) -> int:
        """Get remaining time to live in seconds."""
        if self.is_expired():
            return 0
        return int(
            (
                self.timestamp + timedelta(seconds=self.ttl) - datetime.now()
            ).total_seconds()
        )


@dataclass
class CacheStats:
    """Cache statistics."""

    total_keys: int
    memory_usage: int
    hit_count: int
    miss_count: int
    eviction_count: int
    expired_count: int
    last_cleanup: datetime

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0.0


# Session Types
@dataclass
class SessionData:
    """Session data structure."""

    session_id: str
    user_id: Optional[str]
    data: Dict[str, Any]
    created_at: datetime
    expires_at: datetime
    last_accessed: datetime

    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.now() > self.expires_at

    def time_to_live(self) -> int:
        """Get remaining session time in seconds."""
        if self.is_expired():
            return 0
        return int((self.expires_at - datetime.now()).total_seconds())


# Rate Limiting Types
@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""

    max_requests: int
    window_seconds: int
    key_prefix: str = "rate_limit"
    block_duration: int = 0  # Additional block time after limit exceeded

    def get_key(self, identifier: str) -> str:
        """Generate rate limit key."""
        return f"{self.key_prefix}:{identifier}"


@dataclass
class RateLimitResult:
    """Rate limiting result."""

    allowed: bool
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None
    limit_exceeded: bool = False


# Cache Manager Protocol
class CacheManagerProtocol(Protocol):
    """Protocol for cache manager implementations."""

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        ...

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL."""
        ...

    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        ...

    def exists(self, key: str) -> bool:
        """Check if key exists."""
        ...

    def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for key."""
        ...

    def ttl(self, key: str) -> int:
        """Get time to live for key."""
        ...


# Redis Client Protocol
class RedisClientProtocol(Protocol):
    """Protocol for Redis client implementations."""

    def ping(self) -> bool:
        """Ping Redis server."""
        ...

    def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        ...

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set key-value pair."""
        ...

    def setex(self, key: str, time: int, value: str) -> bool:
        """Set key-value pair with expiration."""
        ...

    def delete(self, *keys: str) -> int:
        """Delete keys."""
        ...

    def exists(self, *keys: str) -> int:
        """Check if keys exist."""
        ...

    def expire(self, key: str, time: int) -> bool:
        """Set expiration for key."""
        ...

    def ttl(self, key: str) -> int:
        """Get time to live for key."""
        ...

    def incr(self, key: str) -> int:
        """Increment key value."""
        ...

    def decr(self, key: str) -> int:
        """Decrement key value."""
        ...

    def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field value."""
        ...

    def hset(self, name: str, key: str, value: str) -> int:
        """Set hash field value."""
        ...

    def hgetall(self, name: str) -> Dict[str, str]:
        """Get all hash fields."""
        ...

    def lpush(self, name: str, *values: str) -> int:
        """Push values to list left."""
        ...

    def rpush(self, name: str, *values: str) -> int:
        """Push values to list right."""
        ...

    def lpop(self, name: str) -> Optional[str]:
        """Pop value from list left."""
        ...

    def rpop(self, name: str) -> Optional[str]:
        """Pop value from list right."""
        ...

    def lrange(self, name: str, start: int, end: int) -> List[str]:
        """Get list range."""
        ...

    def sadd(self, name: str, *values: str) -> int:
        """Add values to set."""
        ...

    def srem(self, name: str, *values: str) -> int:
        """Remove values from set."""
        ...

    def smembers(self, name: str) -> set[str]:
        """Get all set members."""
        ...

    def zadd(self, name: str, mapping: Dict[str, float]) -> int:
        """Add values to sorted set."""
        ...

    def zrange(self, name: str, start: int, end: int, desc: bool = False) -> List[str]:
        """Get sorted set range."""
        ...

    def zscore(self, name: str, value: str) -> Optional[float]:
        """Get sorted set score."""
        ...


# Cache Operation Types
class CacheOperation(str, Enum):
    """Cache operation types."""

    GET = "get"
    SET = "set"
    DELETE = "delete"
    EXISTS = "exists"
    EXPIRE = "expire"
    TTL = "ttl"
    INCR = "incr"
    DECR = "decr"


@dataclass
class CacheOperationResult(Generic[T]):
    """Result of cache operation."""

    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    operation: Optional[CacheOperation] = None
    key: Optional[str] = None
    duration_ms: Optional[float] = None


# Memory Cache Types (for fallback)
class MemoryCacheEntry(TypedDict):
    """Memory cache entry structure."""

    value: Any
    expires_at: datetime
    access_count: int
    last_accessed: datetime


# Cache Key Generation Types
class CacheKeyGenerator(Protocol):
    """Protocol for cache key generators."""

    def generate_key(self, prefix: str, *args: Any, **kwargs: Any) -> str:
        """Generate cache key from prefix and arguments."""
        ...


# Cache Invalidation Types
class CacheInvalidationStrategy(str, Enum):
    """Cache invalidation strategies."""

    TTL = "ttl"
    LRU = "lru"
    LFU = "lfu"
    RANDOM = "random"
    MANUAL = "manual"


@dataclass
class CacheInvalidationConfig:
    """Cache invalidation configuration."""

    strategy: CacheInvalidationStrategy
    max_size: int = 1000
    cleanup_interval: int = 300  # seconds
    eviction_policy: str = "lru"


# Session Management Types
class SessionManagerProtocol(Protocol):
    """Protocol for session manager implementations."""

    def create_session(
        self, user_id: Optional[str], data: Dict[str, Any], ttl: int = 3600
    ) -> str:
        """Create new session."""
        ...

    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session data."""
        ...

    def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Update session data."""
        ...

    def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        ...

    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        ...


# Rate Limiting Types
class RateLimiterProtocol(Protocol):
    """Protocol for rate limiter implementations."""

    def is_allowed(self, identifier: str, config: RateLimitConfig) -> RateLimitResult:
        """Check if request is allowed."""
        ...

    def record_request(
        self, identifier: str, config: RateLimitConfig
    ) -> RateLimitResult:
        """Record a request."""
        ...

    def reset_limits(self, identifier: str, config: RateLimitConfig) -> bool:
        """Reset rate limits for identifier."""
        ...


# Redis Error Types
class RedisErrorType(str, Enum):
    """Redis error types."""

    CONNECTION_ERROR = "connection_error"
    TIMEOUT_ERROR = "timeout_error"
    AUTHENTICATION_ERROR = "authentication_error"
    PERMISSION_ERROR = "permission_error"
    DATA_ERROR = "data_error"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class RedisErrorInfo:
    """Redis error information."""

    error_type: RedisErrorType
    message: str
    original_error: Optional[Exception] = None
    operation: Optional[str] = None
    key: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


# Health Check Types
@dataclass
class RedisHealthStatus:
    """Redis health status."""

    is_healthy: bool
    response_time_ms: float
    memory_usage: Optional[int] = None
    connected_clients: Optional[int] = None
    uptime_seconds: Optional[int] = None
    last_error: Optional[RedisErrorInfo] = None
    timestamp: datetime = field(default_factory=datetime.now)


# Utility Types
class CacheDecoratorConfig(TypedDict, total=False):
    """Configuration for cache decorators."""

    ttl: int
    key_prefix: str
    key_generator: Optional[CacheKeyGenerator]
    on_error: Literal["raise", "return_none", "fallback"]
    fallback_value: Any


# Async Redis Types (for future async support)
class AsyncRedisClientProtocol(Protocol):
    """Protocol for async Redis client implementations."""

    async def ping(self) -> bool:
        """Ping Redis server."""
        ...

    async def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        ...

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set key-value pair."""
        ...

    async def delete(self, *keys: str) -> int:
        """Delete keys."""
        ...


# Type Aliases for Common Patterns
RedisValue = Union[str, int, float, bool, Dict[str, Any], List[Any]]
RedisKey = str
RedisTTL = int
CacheCallback = Callable[[], T]
AsyncCacheCallback = Callable[[], Awaitable[T]]


# Validation Types
class RedisValidationResult(TypedDict):
    """Redis validation result."""

    is_valid: bool
    errors: List[str]
    warnings: List[str]


# Monitoring Types
@dataclass
class RedisMetrics:
    """Redis performance metrics."""

    total_operations: int
    successful_operations: int
    failed_operations: int
    average_response_time_ms: float
    cache_hit_rate: float
    memory_usage_bytes: int
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        return (
            self.successful_operations / self.total_operations
            if self.total_operations > 0
            else 0.0
        )
