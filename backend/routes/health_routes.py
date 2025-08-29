#!/usr/bin/env python3
"""Health Check Routes for JewGo Backend.
=====================================

This module provides health check endpoints for monitoring the application
status, database connectivity, and cache performance.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import time
from datetime import datetime
from typing import Any, Dict

from flask import Blueprint, jsonify, request
from utils.logging_config import get_logger

try:
    from utils.cache_manager import get_cache_stats

    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False

logger = get_logger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    start_time = time.time()

    try:
        # Basic health status
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "4.0.0",
            "environment": "production",
            "response_time_ms": 0,
        }

        # Add cache status if available
        if CACHE_AVAILABLE:
            try:
                cache_stats = get_cache_stats()
                health_data["cache"] = cache_stats
            except Exception as e:
                logger.warning(f"Failed to get cache stats: {e}")
                health_data["cache"] = {"status": "error", "error": str(e)}

        # Calculate response time
        response_time = (time.time() - start_time) * 1000
        health_data["response_time_ms"] = round(response_time, 2)

        return jsonify(health_data)

    except Exception as e:
        logger.exception("Health check failed")
        return (
            jsonify(
                {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "response_time_ms": round((time.time() - start_time) * 1000, 2),
                }
            ),
            500,
        )


@health_bp.route("/health/detailed", methods=["GET"])
def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with database and service status."""
    start_time = time.time()

    try:
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "4.0.0",
            "environment": "production",
            "services": {},
            "response_time_ms": 0,
        }

        # Check database connectivity
        try:
            from database.database_manager_v3 import EnhancedDatabaseManager

            db_manager = EnhancedDatabaseManager()
            db_manager.connect()

            # Test a simple query
            with db_manager.session as session:
                result = session.execute("SELECT 1").scalar()
                if result == 1:
                    health_data["services"]["database"] = {
                        "status": "healthy",
                        "connection": "active",
                    }
                else:
                    health_data["services"]["database"] = {
                        "status": "unhealthy",
                        "error": "Database query failed",
                    }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_data["services"]["database"] = {
                "status": "unhealthy",
                "error": str(e),
            }
            health_data["status"] = "degraded"

        # Check cache status
        if CACHE_AVAILABLE:
            try:
                cache_stats = get_cache_stats()
                health_data["services"]["cache"] = cache_stats
            except Exception as e:
                logger.warning(f"Cache health check failed: {e}")
                health_data["services"]["cache"] = {"status": "error", "error": str(e)}

        # Check external services
        try:
            import requests

            # Test Google Places API availability (if configured)
            google_api_key = request.headers.get(
                "X-Google-API-Key"
            ) or request.args.get("google_api_key")
            if google_api_key:
                response = requests.get(
                    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
                    params={
                        "input": "test",
                        "inputtype": "textquery",
                        "key": google_api_key,
                    },
                    timeout=5,
                )
                health_data["services"]["google_places"] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_code": response.status_code,
                }
        except Exception as e:
            logger.warning(f"Google Places health check failed: {e}")
            health_data["services"]["google_places"] = {
                "status": "error",
                "error": str(e),
            }

        # Calculate response time
        response_time = (time.time() - start_time) * 1000
        health_data["response_time_ms"] = round(response_time, 2)

        # Determine overall status
        if health_data["status"] != "degraded":
            all_healthy = all(
                service.get("status") in ["healthy", "ok"]
                for service in health_data["services"].values()
            )
            if not all_healthy:
                health_data["status"] = "degraded"

        return jsonify(health_data)

    except Exception as e:
        logger.exception("Detailed health check failed")
        return (
            jsonify(
                {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "response_time_ms": round((time.time() - start_time) * 1000, 2),
                }
            ),
            500,
        )


@health_bp.route("/health/ready", methods=["GET"])
def readiness_check() -> Dict[str, Any]:
    """Readiness check for load balancers and orchestration systems."""
    try:
        # Check if the application is ready to serve requests
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()
        db_manager.connect()

        # Test database connection
        with db_manager.session as session:
            result = session.execute("SELECT 1").scalar()
            if result != 1:
                return (
                    jsonify(
                        {
                            "status": "not_ready",
                            "timestamp": datetime.utcnow().isoformat(),
                            "error": "Database not ready",
                        }
                    ),
                    503,
                )

        return jsonify({"status": "ready", "timestamp": datetime.utcnow().isoformat()})

    except Exception as e:
        logger.exception("Readiness check failed")
        return (
            jsonify(
                {
                    "status": "not_ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                }
            ),
            503,
        )
