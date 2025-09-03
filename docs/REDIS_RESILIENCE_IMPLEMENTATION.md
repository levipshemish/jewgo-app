# Redis Resilience Implementation

## Overview

This document describes the implementation of robust Redis connection handling to resolve frequent "Connection reset by peer" errors from Redis Cloud. The solution implements connection pooling, health checks, retry logic, and circuit breaker patterns to ensure reliable cache operations.

## Problem Statement

The application was experiencing frequent Redis connection issues:
- **"Connection reset by peer"** errors causing cache failures
- Idle/TCP timeouts from Redis Cloud
- Missing health checks and connection keepalive
- Insufficient timeout configuration
- No retry logic for transient errors
- No circuit breaker to prevent cascading failures

## Solution Architecture

### 1. Enhanced Redis Client (`backend/utils/redis_client.py`)

**Key Features:**
- **Connection Pooling**: Uses `redis.ConnectionPool.from_url()` with bounded connections
- **TLS Support**: Automatically detects `rediss://` URLs and enables SSL
- **Health Checks**: Configurable `health_check_interval` (default: 30s)
- **Keepalive**: TCP keepalive with configurable parameters
- **Timeouts**: Configurable socket connect and operation timeouts
- **Retry Support**: Built-in retry on timeout with exponential backoff

**Configuration Options:**
```bash
# Environment Variables
CACHE_SOCKET_CONNECT_TIMEOUT_MS=2000    # 2.0s connection timeout
CACHE_SOCKET_TIMEOUT_MS=2000            # 2.0s operation timeout
CACHE_HEALTH_CHECK_INTERVAL=30          # 30s health check interval
CACHE_MAX_CONNECTIONS=20                # Maximum pool connections
```

**Connection Pool Settings:**
```python
pool = redis.ConnectionPool.from_url(
    redis_url,
    ssl=use_tls,                        # Auto-detect from rediss://
    socket_connect_timeout=2.0,         # Fast connection timeout
    socket_timeout=2.0,                 # Fast operation timeout
    socket_keepalive=True,              # Enable TCP keepalive
    socket_keepalive_options={
        'TCP_KEEPIDLE': 60,             # Start keepalive after 60s
        'TCP_KEEPINTVL': 30,            # Send keepalive every 30s
        'TCP_KEEPCNT': 3,               # Allow 3 failed keepalives
    },
    health_check_interval=30,           # Proactive PING on reuse
    retry_on_timeout=True,              # Built-in retry
    max_connections=20,                 # Bounded connection pool
)
```

### 2. Enhanced Cache Manager (`backend/utils/cache_manager_v4.py`)

**Key Features:**
- **Circuit Breaker**: Prevents cascading failures after N consecutive errors
- **Retry Logic**: Exponential backoff for transient errors (GET, MGET operations)
- **Error Classification**: Distinguishes between transient and permanent errors
- **Memory Fallback**: Graceful degradation when Redis is unavailable
- **Structured Logging**: Enhanced error reporting with context

**Circuit Breaker States:**
- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Circuit open, all requests fail fast (return cache miss)
- **HALF_OPEN**: Testing if Redis is healthy again

**Retry Configuration:**
```python
cache_manager = CacheManagerV4(
    max_retries=2,           # Maximum retry attempts
    retry_delay=0.1,         # Base delay (exponential backoff)
)
```

**Error Classification:**
```python
def _is_transient_error(self, error: Exception) -> bool:
    """Determine if an error is transient and should be retried."""
    if isinstance(error, (ConnectionError, RedisError)):
        return True
    if isinstance(error, TimeoutError):
        return True
    if "Connection reset by peer" in str(error):
        return True
    return False
```

### 3. Configuration Updates

**Environment Configuration:**
```bash
# Production Redis URL (TLS enabled)
REDIS_URL=rediss://redis:6379

# Enhanced cache configuration
CACHE_SOCKET_CONNECT_TIMEOUT_MS=2000
CACHE_SOCKET_TIMEOUT_MS=2000
CACHE_HEALTH_CHECK_INTERVAL=30
CACHE_MAX_CONNECTIONS=20
CACHE_MAX_RETRIES=2
CACHE_RETRY_DELAY=0.1
```

**Configuration Class:**
```python
# backend/config/config.py
CACHE_SOCKET_CONNECT_TIMEOUT_MS = int(os.getenv("CACHE_SOCKET_CONNECT_TIMEOUT_MS", "2000"))
CACHE_SOCKET_TIMEOUT_MS = int(os.getenv("CACHE_SOCKET_TIMEOUT_MS", "2000"))
CACHE_HEALTH_CHECK_INTERVAL = int(os.getenv("CACHE_HEALTH_CHECK_INTERVAL", "30"))
CACHE_MAX_CONNECTIONS = int(os.getenv("CACHE_MAX_CONNECTIONS", "20"))
CACHE_MAX_RETRIES = int(os.getenv("CACHE_MAX_RETRIES", "2"))
CACHE_RETRY_DELAY = float(os.getenv("CACHE_RETRY_DELAY", "0.1"))
```

## Usage Examples

### Basic Cache Operations

```python
from utils.cache_manager_v4 import CacheManagerV4

# Initialize with enhanced configuration
cache_manager = CacheManagerV4(
    redis_url="rediss://user:pass@host:6379",
    max_retries=2,
    retry_delay=0.1
)

# Operations automatically use retry logic and circuit breaker
value = cache_manager.get("key", default="default_value")
success = cache_manager.set("key", "value", ttl=3600)
deleted = cache_manager.delete("key")
```

### Circuit Breaker Status

```python
# Check circuit breaker state
if cache_manager.circuit_breaker.is_open():
    print("Circuit breaker is OPEN - Redis operations are failing fast")

# Get detailed status
stats = cache_manager.get_cache_stats()
print(f"Circuit breaker state: {stats['circuit_breaker_state']}")
print(f"Failure count: {stats['circuit_breaker_failures']}")
```

### Error Handling

```python
try:
    value = cache_manager.get("key")
except Exception as e:
    # Errors are automatically classified and logged
    # Transient errors trigger retries
    # Circuit breaker opens after threshold
    pass
```

## Testing

Comprehensive test suite covering all resilience features:

```bash
# Run Redis resilience tests
cd backend
python -m pytest tests/test_redis_resilience.py -v

# Test coverage includes:
# - Circuit breaker state transitions
# - Retry logic with exponential backoff
# - Error classification and handling
# - Memory cache fallback
# - Redis client integration
```

## Monitoring and Observability

### Health Checks

```python
# Check cache health
is_healthy = cache_manager.health_check()

# Get detailed statistics
stats = cache_manager.get_cache_stats()
```

### Logging

Structured logging with context:
```json
{
    "operation": "get",
    "error_type": "connection_reset_peer",
    "error_message": "Connection reset by peer",
    "error_count": 3,
    "circuit_breaker_state": "CLOSED"
}
```

### Metrics

Key metrics to monitor:
- `cache_get_error_total`: Total cache get errors
- `cache_timeout_total`: Total timeout errors
- `circuit_open_total`: Circuit breaker opens
- `redis_connection_pool_size`: Active connections
- `redis_health_check_interval`: Health check frequency

## Deployment Considerations

### Environment Variables

**Required for Production:**
```bash
REDIS_URL=rediss://user:pass@host:6379  # TLS enabled
CACHE_SOCKET_CONNECT_TIMEOUT_MS=2000    # Fast connection timeout
CACHE_SOCKET_TIMEOUT_MS=2000            # Fast operation timeout
CACHE_HEALTH_CHECK_INTERVAL=30          # Regular health checks
```

**Optional (with defaults):**
```bash
CACHE_MAX_CONNECTIONS=20                # Connection pool size
CACHE_MAX_RETRIES=2                     # Retry attempts
CACHE_RETRY_DELAY=0.1                   # Base retry delay
```

### Redis Cloud Configuration

1. **Use TLS**: Ensure `REDIS_URL` starts with `rediss://`
2. **Connection Limits**: Set appropriate `CACHE_MAX_CONNECTIONS`
3. **Timeout Tuning**: Adjust timeouts based on network latency
4. **Health Checks**: Enable proactive connection validation

### Performance Impact

- **Connection Pooling**: Reduces connection overhead
- **Health Checks**: Minimal overhead (30s intervals)
- **Retry Logic**: Only triggered on transient errors
- **Circuit Breaker**: Fast fail prevents cascading failures

## Troubleshooting

### Common Issues

1. **Circuit Breaker Stuck Open**
   - Check Redis connectivity
   - Verify timeout values
   - Monitor error logs

2. **High Retry Count**
   - Check network stability
   - Verify Redis Cloud status
   - Review timeout configuration

3. **Memory Cache Fallback**
   - Redis client unavailable
   - Circuit breaker open
   - Check initialization logs

### Debug Commands

```python
# Get Redis configuration
from utils.redis_client import get_redis_config
config = get_redis_config()
print(config)

# Check cache manager status
stats = cache_manager.get_cache_stats()
print(stats)

# Test Redis connectivity
from utils.redis_client import redis_health_check
is_healthy = redis_health_check()
print(f"Redis healthy: {is_healthy}")
```

## Migration Guide

### From Previous Implementation

1. **Update Environment Variables:**
   ```bash
   # Old
   REDIS_URL=redis://host:6379
   
   # New (with TLS)
   REDIS_URL=rediss://host:6379
   ```

2. **Add New Configuration:**
   ```bash
   CACHE_SOCKET_CONNECT_TIMEOUT_MS=2000
   CACHE_SOCKET_TIMEOUT_MS=2000
   CACHE_HEALTH_CHECK_INTERVAL=30
   ```

3. **Update Code:**
   ```python
   # Old
   cache_manager = CacheManagerV4(redis_url=redis_url)
   
   # New (with resilience options)
   cache_manager = CacheManagerV4(
       redis_url=redis_url,
       max_retries=2,
       retry_delay=0.1
   )
   ```

### Backward Compatibility

- All existing cache operations continue to work
- New resilience features are opt-in
- Memory cache fallback maintains functionality
- No breaking changes to public API

## Future Enhancements

### Planned Features

1. **Advanced Circuit Breaker**
   - Configurable failure thresholds
   - Different thresholds for different operations
   - Metrics and alerting integration

2. **Enhanced Monitoring**
   - Prometheus metrics export
   - Distributed tracing integration
   - Performance dashboards

3. **Advanced Retry Strategies**
   - Jitter for distributed systems
   - Different strategies per operation type
   - Configurable backoff algorithms

### Configuration Management

1. **Dynamic Configuration**
   - Runtime configuration updates
   - A/B testing for different strategies
   - Feature flags for resilience features

2. **Environment-Specific Tuning**
   - Development vs production settings
   - Region-specific timeout values
   - Load-based configuration

## Conclusion

This Redis resilience implementation provides:

- **Robust Connection Handling**: Connection pooling, health checks, and keepalive
- **Intelligent Error Recovery**: Retry logic with exponential backoff
- **Failure Isolation**: Circuit breaker prevents cascading failures
- **Graceful Degradation**: Memory cache fallback when Redis is unavailable
- **Comprehensive Monitoring**: Health checks, metrics, and structured logging

The solution significantly improves application reliability when using Redis Cloud and provides a foundation for further resilience enhancements.
