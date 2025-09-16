#!/usr/bin/env python3
"""
Comprehensive Health Check Endpoints
Provides detailed health checks for monitoring and alerting.
"""

import asyncio
import os
from flask import Blueprint, jsonify, request
from datetime import datetime, timezone

from services.comprehensive_health_service import health_service

health_bp = Blueprint("health", __name__)


@health_bp.route("/healthz")
def healthz():
    """Kubernetes-style liveness probe - basic health check."""
    try:
        summary = health_service.get_health_summary()
        return jsonify({"ok": True, **summary})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 503


@health_bp.route("/readyz")
def readyz():
    """Kubernetes-style readiness probe - service ready to accept traffic."""
    try:
        # Quick check for essential services
        database_url = os.getenv('DATABASE_URL')
        redis_url = os.getenv('REDIS_URL')
        
        if not database_url or not redis_url:
            return jsonify({
                "status": "not_ready",
                "error": "Essential services not configured"
            }), 503
        
        summary = health_service.get_health_summary()
        return jsonify({"status": "ready", **summary})
    except Exception as e:
        return jsonify({
            "status": "not_ready", 
            "error": str(e)
        }), 503


@health_bp.route("/health")
async def health():
    """Comprehensive health check with detailed status."""
    try:
        # Check if this is a quick health check (HEAD request or query param)
        quick_check = request.method == 'HEAD' or request.args.get('quick') == 'true'
        
        if quick_check:
            summary = health_service.get_health_summary()
            return jsonify(summary)
        
        # Run comprehensive health checks
        health_status = await health_service.run_all_health_checks()
        
        # Determine HTTP status code
        http_status = 200
        if health_status['status'] == 'unhealthy':
            http_status = 503
        elif health_status['status'] == 'degraded':
            http_status = 200  # Still operational but with warnings
        
        return jsonify(health_status), http_status
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": f"Health check failed: {str(e)}"
        }), 503


@health_bp.route("/livez")
def livez():
    """Simple liveness check - service is running."""
    return jsonify({
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(health_service.get_uptime_seconds(), 2)
    })


@health_bp.route("/health/detailed")
async def health_detailed():
    """Detailed health check with all system components."""
    try:
        health_status = await health_service.run_all_health_checks()
        
        # Add additional system information
        import os
        import sys
        
        health_status['system'] = {
            "python_version": sys.version,
            "environment": os.getenv('NODE_ENV', 'development'),
            "pid": os.getpid(),
            "platform": sys.platform
        }
        
        # Determine HTTP status code
        http_status = 200
        if health_status['status'] == 'unhealthy':
            http_status = 503
        elif health_status['status'] == 'degraded':
            http_status = 200
        
        return jsonify(health_status), http_status
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": f"Detailed health check failed: {str(e)}"
        }), 503


@health_bp.route("/health/auth")
async def health_auth():
    """Authentication-specific health checks."""
    try:
        # Run only auth-related health checks
        auth_checks = await asyncio.gather(
            health_service.check_jwt_keys(),
            health_service.check_csrf_config(),
            health_service.check_cors_origins(),
            health_service.check_session_system(),
            return_exceptions=True
        )
        
        results = {}
        overall_status = "healthy"
        warnings = []
        errors = []
        
        for check in auth_checks:
            if isinstance(check, Exception):
                results["error"] = {
                    "status": "unhealthy",
                    "error": str(check)
                }
                overall_status = "unhealthy"
                errors.append(str(check))
            else:
                results[check.name] = {
                    "status": check.status,
                    "response_time_ms": round(check.response_time_ms, 2),
                    "details": check.details,
                    "error": check.error,
                    "warnings": check.warnings
                }
                
                if check.status == "unhealthy":
                    overall_status = "unhealthy"
                    if check.error:
                        errors.append(check.error)
                elif check.status == "degraded":
                    if overall_status == "healthy":
                        overall_status = "degraded"
                    if check.warnings:
                        warnings.extend(check.warnings)
        
        response_data = {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": results,
            "warnings": warnings if warnings else None,
            "errors": errors if errors else None
        }
        
        http_status = 200
        if overall_status == 'unhealthy':
            http_status = 503
        elif overall_status == 'degraded':
            http_status = 200
        
        return jsonify(response_data), http_status
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": f"Auth health check failed: {str(e)}"
        }), 503
