"""
Redis client utility for the backend application.
This module provides a centralized Redis client with connection pooling
and error handling for caching and session management.
"""

import os
import redis
from typing import Optional, Dict, Any
from utils.logging_config import get_logger

logger = get_logger(__name__)
# Global Redis client instance
_redis_client = None


def _create_redis_connection_pool(redis_url: str) -> redis.ConnectionPool:
    """
    Create a robust Redis connection pool with proper configuration.

    Args:
        redis_url: Redis connection URL (redis:// or rediss://)

    Returns:
        Configured Redis connection pool
    """
    # Parse URL to determine if TLS is needed
    use_tls = redis_url.startswith("rediss://")

    # Default timeout and connection settings
    socket_connect_timeout = float(os.getenv("CACHE_SOCKET_CONNECT_TIMEOUT_MS", "2000")) / 1000
    socket_timeout = float(os.getenv("CACHE_SOCKET_TIMEOUT_MS", "2000")) / 1000
    health_check_interval = int(os.getenv("CACHE_HEALTH_CHECK_INTERVAL", "30"))
    max_connections = int(os.getenv("CACHE_MAX_CONNECTIONS", "20"))

    # Create connection pool with robust settings
    # Note: SSL is handled automatically by the URL (rediss://)
    # Use only the essential parameters that are widely supported
    pool = redis.ConnectionPool.from_url(
        redis_url,
        socket_connect_timeout=socket_connect_timeout,
        socket_timeout=socket_timeout,
        max_connections=max_connections,
        decode_responses=True,
    )

    logger.info(
        f"Redis connection pool created: TLS={use_tls}, "
        f"timeouts=({socket_connect_timeout}s, {socket_timeout}s), "
        f"health_check={health_check_interval}s, max_conns={max_connections}"
    )

    return pool


def _create_redis_client_with_retry(redis_url: str) -> Optional[redis.Redis]:
    """
    Create Redis client with retry and backoff support.

    Args:
        redis_url: Redis connection URL

    Returns:
        Configured Redis client or None if initialization fails
    """
    try:
        # Create connection pool
        pool = _create_redis_connection_pool(redis_url)

        # Create client with retry support (redis-py 5.0+)
        client = redis.Redis(
            connection_pool=pool,
            retry_on_timeout=True,
        )

        # Add retry and backoff if available (redis-py 5.0+)
        try:
            from redis.retry import Retry
            from redis.backoff import ExponentialBackoff

            retry_policy = Retry(
                ExponentialBackoff(),
                retries=3
            )
            client.retry = retry_policy
            logger.info("Redis retry policy configured with exponential backoff")
        except ImportError:
            logger.info("Redis retry policy not available (redis-py < 5.0)")

        # Test connection
        client.ping()
        logger.info(f"Redis client initialized successfully with URL: {redis_url[:50]}...")
        return client

    except Exception as e:
        logger.error(f"Failed to initialize Redis client: {e}")
        return None


def get_redis_client() -> Optional[redis.Redis]:
    """
    Get Redis client instance with connection pooling.
    Returns:
        Redis client instance or None if Redis is not available
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        # Try REDIS_URL first (preferred for Redis Cloud)
        redis_url = os.getenv("REDIS_URL")
        if redis_url and redis_url != "memory://":
            _redis_client = _create_redis_client_with_retry(redis_url)
            if _redis_client:
                return _redis_client

        # Fallback to individual environment variables
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_db = int(os.getenv("REDIS_DB", 0))
        redis_password = os.getenv("REDIS_PASSWORD")
        redis_ssl = os.getenv("REDIS_SSL", "false").lower() == "true"

        # Construct URL for consistency
        if redis_ssl:
            fallback_url = f"rediss://{redis_host}:{redis_port}/{redis_db}"
        else:
            fallback_url = f"redis://{redis_host}:{redis_port}/{redis_db}"

        if redis_password:
            # Insert password into URL
            if redis_ssl:
                fallback_url = f"rediss://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"
            else:
                fallback_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"

        _redis_client = _create_redis_client_with_retry(fallback_url)
        if _redis_client:
            return _redis_client

        logger.warning("Redis not available, falling back to None")
        return None

    except Exception as e:
        logger.error(f"Failed to initialize Redis client: {e}")
        _redis_client = None
        return None


def close_redis_client():
    """Close Redis client connection."""
    global _redis_client
    if _redis_client:
        try:
            _redis_client.close()
            logger.info("Redis client connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis client: {e}")
        finally:
            _redis_client = None


def redis_health_check() -> bool:
    """
    Check Redis connection health.
    Returns:
        True if Redis is healthy, False otherwise
    """
    try:
        client = get_redis_client()
        if client:
            client.ping()
            return True
        return False
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False


def redis_info() -> Optional[dict]:
    """
    Get Redis server information.
    Returns:
        Redis info dict or None if not available
    """
    try:
        client = get_redis_client()
        if client:
            return client.info()
        return None
    except Exception as e:
        logger.error(f"Failed to get Redis info: {e}")
        return None


def get_redis_config() -> Dict[str, Any]:
    """
    Get current Redis configuration for debugging.

    Returns:
        Dictionary with Redis configuration details
    """
    config = {
        "redis_url": os.getenv("REDIS_URL"),
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", 6379)),
        "redis_db": int(os.getenv("REDIS_DB", 0)),
        "redis_ssl": os.getenv("REDIS_SSL", "false").lower() == "true",
        "socket_connect_timeout": float(os.getenv("CACHE_SOCKET_CONNECT_TIMEOUT_MS", "2000")) / 1000,
        "socket_timeout": float(os.getenv("CACHE_SOCKET_TIMEOUT_MS", "2000")) / 1000,
        "health_check_interval": int(os.getenv("CACHE_HEALTH_CHECK_INTERVAL", "30")),
        "max_connections": int(os.getenv("CACHE_MAX_CONNECTIONS", "20")),
    }

    # Add client status
    if _redis_client:
        config["client_available"] = True
        config["client_healthy"] = redis_health_check()
    else:
        config["client_available"] = False
        config["client_healthy"] = False

    return config
