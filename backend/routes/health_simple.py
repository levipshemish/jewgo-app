#!/usr/bin/env python3
"""
Simple health check endpoints for monitoring.
"""

from flask import Blueprint, jsonify
import time
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

health_simple_bp = Blueprint('health_simple', __name__)


@health_simple_bp.route('/healthz', methods=['GET'])
def healthz():
    """
    Shallow health check - just verify the process is up.
    This should be fast and not depend on external services.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'jewgo-backend',
        'version': '1.0.0'
    }), 200


@health_simple_bp.route('/readyz', methods=['GET'])
def readyz():
    """
    Deep health check - verify all dependencies are reachable.
    This checks database, Redis, and other critical services.
    """
    checks = {
        'database': False,
        'redis': False,
        'overall': False
    }
    
    # Check database
    try:
        from database.connection_manager import get_connection_manager
        conn_manager = get_connection_manager()
        if conn_manager and conn_manager.is_connected():
            checks['database'] = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
    
    # Check Redis
    try:
        import redis
        redis_url = os.environ.get("REDIS_URL") or os.environ.get("CACHE_REDIS_URL")
        if redis_url and redis_url != "memory://":
            r = redis.from_url(redis_url)
            r.ping()
            checks['redis'] = True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
    
    # Overall status
    checks['overall'] = checks['database'] and checks['redis']
    
    status_code = 200 if checks['overall'] else 503
    
    return jsonify({
        'status': 'ready' if checks['overall'] else 'not_ready',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': checks
    }), status_code


@health_simple_bp.route('/metrics', methods=['GET'])
def metrics():
    """
    Simple metrics endpoint.
    """
    try:
        # Basic system metrics
        metrics_data = []
        
        # Add basic metrics
        metrics_data.append("# HELP http_requests_total Total HTTP requests")
        metrics_data.append("# TYPE http_requests_total counter")
        metrics_data.append("http_requests_total 0")
        
        metrics_data.append("# HELP system_uptime_seconds System uptime in seconds")
        metrics_data.append("# TYPE system_uptime_seconds gauge")
        metrics_data.append("system_uptime_seconds 0")
        
        metrics_text = '\n'.join(metrics_data)
        
        return metrics_text, 200, {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    except Exception as e:
        logger.error(f"Error generating metrics: {e}")
        return jsonify({'error': 'Failed to generate metrics'}), 500


@health_simple_bp.route('/monitoring/status', methods=['GET'])
def monitoring_status():
    """
    Get basic monitoring status.
    """
    try:
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'jewgo-backend',
            'version': '1.0.0',
            'monitoring': 'basic'
        }), 200
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        return jsonify({'error': 'Failed to get monitoring status'}), 500
