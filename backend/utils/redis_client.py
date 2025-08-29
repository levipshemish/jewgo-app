"""
Redis client utility for the backend application.

This module provides a centralized Redis client with connection pooling
and error handling for caching and session management.
"""

import os
import redis
from typing import Optional
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Global Redis client instance
_redis_client = None


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
        # Get Redis configuration from environment
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_db = int(os.getenv("REDIS_DB", 0))
        redis_password = os.getenv("REDIS_PASSWORD")
        redis_ssl = os.getenv("REDIS_SSL", "false").lower() == "true"

        # Create Redis client with connection pooling
        _redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            ssl=redis_ssl,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )

        # Test connection
        _redis_client.ping()
        logger.info(f"Redis client initialized successfully: {redis_host}:{redis_port}")

        return _redis_client

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
