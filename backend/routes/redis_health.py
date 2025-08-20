#!/usr/bin/env python3
"""Redis Health Monitoring Routes.
============================

Provides endpoints for monitoring Redis health and performance.

Author: JewGo Development Team
Version: 2.0
Last Updated: 2024
"""

import json
import os
import time
from typing import Any, Dict

import redis
from flask import Blueprint, current_app, jsonify
from utils.api_response import redis_health_response, redis_stats_response
from utils.cache_manager import cache_manager
from utils.config_manager import ConfigManager
from utils.logging_config import get_logger

logger = get_logger(__name__)

redis_bp = Blueprint("redis_health", __name__, url_prefix="/api/redis")


@redis_bp.route("/ping", methods=["GET"])
def redis_ping():
    """Test endpoint to verify Redis routes are working."""
    return {
        "message": "Redis routes are working",
        "blueprint": "redis_health",
        "timestamp": time.time(),
    }


@redis_bp.route("/health", methods=["GET"])
def redis_health_check_route():
    """Check Redis health and connection status."""
    try:
        # Check both REDIS_URL and CACHE_REDIS_URL
        redis_url = ConfigManager.get_redis_url() or os.environ.get("CACHE_REDIS_URL")
        if not redis_url or redis_url == "memory://":
            return redis_health_response(
                status="not_configured", error="Redis URL not configured"
            )

        # Test Redis connection
        r = redis.from_url(redis_url)
        start_time = time.time()
        r.ping()
        ping_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Get Redis info
        info = r.info()

        # Test basic operations
        test_key = f"health_check_{int(time.time())}"
        test_value = "test"

        # Test set operation
        start_time = time.time()
        r.setex(test_key, 60, test_value)
        set_time = (time.time() - start_time) * 1000

        # Test get operation
        start_time = time.time()
        retrieved = r.get(test_key)
        get_time = (time.time() - start_time) * 1000

        # Clean up test key
        r.delete(test_key)

        return redis_health_response(
            status="healthy",
            redis_url=redis_url,
            ping_time_ms=ping_time,
            set_time_ms=set_time,
            get_time_ms=get_time,
            redis_version=info.get("redis_version", "Unknown"),
            connected_clients=info.get("connected_clients", 0),
            used_memory_human=info.get("used_memory_human", "Unknown"),
            total_commands_processed=info.get("total_commands_processed", 0),
        )

    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        return redis_health_response(status="unhealthy", error=str(e))


@redis_bp.route("/stats", methods=["GET"])
def redis_stats():
    """Get detailed Redis statistics."""
    try:
        # Check both REDIS_URL and CACHE_REDIS_URL
        redis_url = ConfigManager.get_redis_url() or os.environ.get("CACHE_REDIS_URL")
        if not redis_url or redis_url == "memory://":
            return redis_stats_response(
                status="not_configured", error="Redis URL not configured"
            )

        r = redis.from_url(redis_url)
        info = r.info()

        # Get cache statistics from Flask-Cache if available
        cache_stats = {}
        if hasattr(current_app, "cache"):
            try:
                # Try to get cache statistics
                cache_stats = {
                    "cache_type": getattr(current_app.cache, "config", {}).get(
                        "CACHE_TYPE", "unknown"
                    ),
                    "cache_timeout": getattr(current_app.cache, "config", {}).get(
                        "CACHE_DEFAULT_TIMEOUT", 0
                    ),
                }
            except Exception:
                cache_stats = {"error": "Could not retrieve cache stats"}

        stats = {
            "redis_info": {
                "version": info.get("redis_version"),
                "uptime_in_seconds": info.get("uptime_in_seconds"),
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human"),
                "used_memory_peak_human": info.get("used_memory_peak_human"),
                "total_commands_processed": info.get("total_commands_processed"),
                "total_connections_received": info.get("total_connections_received"),
                "keyspace_hits": info.get("keyspace_hits"),
                "keyspace_misses": info.get("keyspace_misses"),
                "expired_keys": info.get("expired_keys"),
                "evicted_keys": info.get("evicted_keys"),
                "keyspace": info.get("db0", {}),
            },
            "cache_stats": cache_stats,
        }

        return redis_stats_response(status="ok", stats=stats)

    except Exception as e:
        logger.error("Redis stats failed", error=str(e))
        return redis_stats_response(status="error", error=str(e))


@redis_bp.route("/test", methods=["POST"])
def redis_test():
    """Test Redis operations with custom data."""
    try:
        redis_url = ConfigManager.get_redis_url()
        if not redis_url or redis_url == "memory://":
            return (
                jsonify(
                    {"status": "not_configured", "message": "Redis URL not configured"}
                ),
                200,
            )

        r = redis.from_url(redis_url)

        # Test various operations
        test_results = {}

        # Test string operations
        test_key = f"test_string_{int(time.time())}"
        r.setex(test_key, 60, "test_value")
        test_results["string_set"] = r.get(test_key) == b"test_value"
        r.delete(test_key)

        # Test hash operations
        test_hash = f"test_hash_{int(time.time())}"
        r.hset(test_hash, "field1", "value1")
        r.hset(test_hash, "field2", "value2")
        test_results["hash_set"] = r.hget(test_hash, "field1") == b"value1"
        test_results["hash_get_all"] = r.hgetall(test_hash) == {
            b"field1": b"value1",
            b"field2": b"value2",
        }
        r.delete(test_hash)

        # Test list operations
        test_list = f"test_list_{int(time.time())}"
        r.lpush(test_list, "item1", "item2", "item3")
        test_results["list_push"] = r.llen(test_list) == 3
        test_results["list_pop"] = r.lpop(test_list) == b"item3"
        r.delete(test_list)

        # Test set operations
        test_set = f"test_set_{int(time.time())}"
        r.sadd(test_set, "member1", "member2")
        test_results["set_add"] = r.scard(test_set) == 2
        test_results["set_members"] = r.smembers(test_set) == {b"member1", b"member2"}
        r.delete(test_set)

        return (
            jsonify(
                {
                    "status": "success",
                    "test_results": test_results,
                    "all_tests_passed": all(test_results.values()),
                    "timestamp": time.time(),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error("Redis test failed", error=str(e))
        return (
            jsonify({"status": "error", "error": str(e), "timestamp": time.time()}),
            503,
        )


@redis_bp.route("/cache-health", methods=["GET"])
def cache_health_check():
    """Check cache manager health and performance."""
    try:
        # Get cache health status
        health_status = cache_manager.get_health_status()

        # Add additional cache metrics
        cache_metrics = {
            "cache_operations": {
                "total_operations": health_status.get("error_count", 0)
                + 100,  # Estimate
                "error_rate": health_status.get("error_count", 0)
                / max(health_status.get("error_count", 0) + 100, 1)
                * 100,
                "last_error": health_status.get("last_error"),
            },
            "cache_performance": {
                "cache_type": health_status.get("cache_type", "unknown"),
                "memory_cache_size": health_status.get("memory_cache_size", 0),
                "redis_connected": health_status.get("redis_connected", False),
            },
            "recommendations": [],
        }

        # Generate recommendations based on health status
        if health_status.get("error_count", 0) > 10:
            cache_metrics["recommendations"].append(
                "High error rate detected - check Redis connectivity"
            )

        if (
            health_status.get("cache_type") == "memory"
            and health_status.get("redis_connected") is False
        ):
            cache_metrics["recommendations"].append(
                "Using memory cache - Redis connection failed"
            )

        if health_status.get("memory_cache_size", 0) > 1000:
            cache_metrics["recommendations"].append(
                "Large memory cache - consider Redis for better performance"
            )

        return (
            jsonify(
                {
                    "status": "healthy"
                    if health_status.get("is_healthy", False)
                    else "unhealthy",
                    "cache_health": health_status,
                    "cache_metrics": cache_metrics,
                    "timestamp": time.time(),
                }
            ),
            200,
        )

    except ImportError as e:
        logger.error("Cache manager import failed", error=str(e))
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "Cache manager not available",
                    "details": str(e),
                    "timestamp": time.time(),
                }
            ),
            503,
        )
    except Exception as e:
        logger.error("Cache health check failed", error=str(e))
        return (
            jsonify({"status": "error", "error": str(e), "timestamp": time.time()}),
            503,
        )
