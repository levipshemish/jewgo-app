#!/usr/bin/env python3
"""
Proper health check endpoints that integrate with existing monitoring system.
"""

from flask import Blueprint, jsonify
import time
import logging
import os
from datetime import datetime
from monitoring.v4_monitoring import v4_monitor, get_v4_metrics_summary, get_v4_alerts
from monitoring.performance_monitor import performance_monitor

logger = logging.getLogger(__name__)

health_proper_bp = Blueprint('health_proper', __name__)


@health_proper_bp.route('/healthz', methods=['GET'])
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


@health_proper_bp.route('/readyz', methods=['GET'])
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


@health_proper_bp.route('/metrics', methods=['GET'])
def metrics():
    """
    Prometheus metrics endpoint using existing monitoring system.
    This should only be accessible internally (behind auth/VPN).
    """
    try:
        # Get metrics from existing v4 monitoring system
        metrics_summary = get_v4_metrics_summary(hours=1)
        
        # Get performance metrics
        performance_stats = performance_monitor.get_overall_stats(hours=1)
        
        # Format as Prometheus-style metrics
        prometheus_metrics = []
        
        # System metrics
        if 'system' in metrics_summary:
            if 'memory' in metrics_summary['system']:
                prometheus_metrics.append(f"memory_usage_percent {metrics_summary['system']['memory']['avg_percent']}")
            if 'cpu' in metrics_summary['system']:
                prometheus_metrics.append(f"cpu_usage_percent {metrics_summary['system']['cpu']['avg_percent']}")
        
        # Performance metrics
        if 'performance' in metrics_summary:
            for endpoint, stats in metrics_summary['performance'].items():
                prometheus_metrics.append(f'http_request_duration_seconds{{endpoint="{endpoint}"}} {stats["avg_response_time_ms"]/1000}')
                prometheus_metrics.append(f'http_requests_total{{endpoint="{endpoint}"}} {stats["request_count"]}')
        
        # Distance filtering metrics
        if 'distance_filtering' in performance_stats:
            df_stats = performance_stats['distance_filtering']
            prometheus_metrics.append(f'distance_filtering_avg_time_ms {df_stats["avg_query_time_ms"]}')
            prometheus_metrics.append(f'distance_filtering_queries_total {df_stats["total_queries"]}')
        
        # Open now filtering metrics
        if 'open_now_filtering' in performance_stats:
            on_stats = performance_stats['open_now_filtering']
            prometheus_metrics.append(f'open_now_filtering_avg_time_ms {on_stats["avg_query_time_ms"]}')
            prometheus_metrics.append(f'open_now_filtering_queries_total {on_stats["total_queries"]}')
        
        metrics_text = '\n'.join(prometheus_metrics)
        
        return metrics_text, 200, {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    except Exception as e:
        logger.error(f"Error generating metrics: {e}")
        return jsonify({'error': 'Failed to generate metrics'}), 500


@health_proper_bp.route('/monitoring/status', methods=['GET'])
def monitoring_status():
    """
    Get comprehensive monitoring status using existing systems.
    """
    try:
        # Get metrics summary
        metrics_summary = get_v4_metrics_summary(hours=1)
        
        # Get performance stats
        performance_stats = performance_monitor.get_overall_stats(hours=1)
        
        # Get active alerts
        active_alerts = get_v4_alerts()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics_summary,
            'performance': performance_stats,
            'alerts': {
                'active_count': len(active_alerts),
                'alerts': active_alerts
            }
        }), 200
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        return jsonify({'error': 'Failed to get monitoring status'}), 500
