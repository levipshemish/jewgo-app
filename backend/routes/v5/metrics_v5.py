#!/usr/bin/env python3
"""Consolidated v5 metrics and analytics API routes.

This route file consolidates all metrics collection, performance monitoring,
and analytics endpoints with real-time data processing and caching.
Replaces: metrics_api.py, analytics_endpoints.py, and performance monitoring routes.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List, Union
import json
from datetime import datetime, timedelta
from functools import wraps
import time
from utils.logging_config import get_logger
from middleware.auth_v5 import AuthMiddlewareV5
from middleware.rate_limit_v5 import RateLimitMiddlewareV5
from middleware.observability_v5 import ObservabilityMiddlewareV5
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

# Create blueprint using the factory
metrics_v5 = BlueprintFactoryV5.create_blueprint(
    'metrics_v5',
    __name__,
    url_prefix='/api/v5/metrics',
    config_override={
        'enable_cors': True,
        'enable_auth': True,
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Metrics are inherently idempotent
        'enable_observability': True,
        'enable_etag': False  # Real-time metrics shouldn't be cached
    }
)

# Global service instances
redis_manager = None
feature_flags = None

# Metrics configuration
METRICS_CONFIG = {
    'retention_periods': {
        'real_time': 3600,      # 1 hour in seconds
        'hourly': 86400 * 7,    # 7 days
        'daily': 86400 * 90,    # 90 days
        'monthly': 86400 * 365  # 1 year
    },
    'aggregation_intervals': {
        'real_time': 60,        # 1 minute
        'hourly': 3600,         # 1 hour
        'daily': 86400          # 1 day
    },
    'metric_types': [
        'request_count',
        'response_time',
        'error_rate',
        'cache_hit_rate',
        'database_query_time',
        'memory_usage',
        'cpu_usage',
        'active_connections'
    ]
}


def init_services(redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global redis_manager, feature_flags
    
    redis_manager = redis_manager_instance
    feature_flags = feature_flags_instance


def require_metrics_permission():
    """Decorator to require metrics viewing permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            required_permissions = ['view_metrics', 'view_analytics']
            user_permissions = set(g.user_permissions)
            
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient permissions for metrics access'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_metric_key(metric_name: str, time_period: str, timestamp: datetime) -> str:
    """Generate Redis key for metric storage."""
    if time_period == 'real_time':
        # Round to minute for real-time metrics
        rounded_time = timestamp.replace(second=0, microsecond=0)
        return f"metrics:real_time:{metric_name}:{rounded_time.strftime('%Y-%m-%dT%H:%M')}"
    elif time_period == 'hourly':
        # Round to hour for hourly metrics
        rounded_time = timestamp.replace(minute=0, second=0, microsecond=0)
        return f"metrics:hourly:{metric_name}:{rounded_time.strftime('%Y-%m-%dT%H')}"
    elif time_period == 'daily':
        # Round to day for daily metrics
        rounded_time = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        return f"metrics:daily:{metric_name}:{rounded_time.strftime('%Y-%m-%d')}"
    else:
        raise ValueError(f"Invalid time period: {time_period}")


def aggregate_metrics(metric_name: str, time_period: str, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
    """Aggregate metrics for a given time period."""
    metrics = []
    current_time = start_time
    
    while current_time <= end_time:
        key = get_metric_key(metric_name, time_period, current_time)
        value = redis_manager.get(key, prefix='metrics')
        
        if value is not None:
            metrics.append({
                'timestamp': current_time.isoformat(),
                'value': value
            })
        
        # Increment time based on period
        if time_period == 'real_time':
            current_time += timedelta(minutes=1)
        elif time_period == 'hourly':
            current_time += timedelta(hours=1)
        elif time_period == 'daily':
            current_time += timedelta(days=1)
    
    # Calculate statistics
    if not metrics:
        return {
            'metric_name': metric_name,
            'time_period': time_period,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'data_points': [],
            'statistics': {
                'count': 0,
                'min': None,
                'max': None,
                'avg': None,
                'sum': 0
            }
        }
    
    values = [m['value'] for m in metrics]
    statistics = {
        'count': len(values),
        'min': min(values),
        'max': max(values),
        'avg': sum(values) / len(values),
        'sum': sum(values)
    }
    
    return {
        'metric_name': metric_name,
        'time_period': time_period,
        'start_time': start_time.isoformat(),
        'end_time': end_time.isoformat(),
        'data_points': metrics,
        'statistics': statistics
    }


# Metrics endpoints
@metrics_v5.route('/health', methods=['GET'])
@require_metrics_permission()
def metrics_health():
    """Get metrics service health status."""
    try:
        health_data = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'services': {
                'redis': 'healthy',
                'metrics_collection': 'healthy',
                'data_aggregation': 'healthy'
            },
            'configuration': METRICS_CONFIG
        }
        
        # Check Redis connectivity
        try:
            redis_manager.ping()
        except Exception as e:
            health_data['services']['redis'] = 'unhealthy'
            health_data['status'] = 'degraded'
            health_data['redis_error'] = str(e)
        
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("Failed to get metrics health", error=str(e))
        return jsonify({'error': 'Failed to get metrics health'}), 500


@metrics_v5.route('/<metric_name>', methods=['GET'])
@require_metrics_permission()
def get_metric(metric_name: str):
    """Get specific metric data."""
    try:
        if metric_name not in METRICS_CONFIG['metric_types']:
            return jsonify({'error': 'Invalid metric name'}), 400
        
        # Parse query parameters
        time_period = request.args.get('period', 'real_time')
        if time_period not in METRICS_CONFIG['retention_periods']:
            return jsonify({'error': 'Invalid time period'}), 400
        
        # Parse time range
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        
        if not start_time_str or not end_time_str:
            # Default to last hour for real-time, last 24 hours for others
            end_time = datetime.utcnow()
            if time_period == 'real_time':
                start_time = end_time - timedelta(hours=1)
            else:
                start_time = end_time - timedelta(days=1)
        else:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid time format'}), 400
        
        # Get metric data
        metric_data = aggregate_metrics(metric_name, time_period, start_time, end_time)
        
        return jsonify(metric_data)
        
    except Exception as e:
        logger.exception("Failed to get metric", metric_name=metric_name, error=str(e))
        return jsonify({'error': 'Failed to get metric data'}), 500


@metrics_v5.route('/dashboard', methods=['GET'])
@require_metrics_permission()
def metrics_dashboard():
    """Get metrics dashboard data."""
    try:
        # Parse query parameters
        time_period = request.args.get('period', 'real_time')
        if time_period not in METRICS_CONFIG['retention_periods']:
            return jsonify({'error': 'Invalid time period'}), 400
        
        # Parse time range
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        
        if not start_time_str or not end_time_str:
            # Default to last hour for real-time, last 24 hours for others
            end_time = datetime.utcnow()
            if time_period == 'real_time':
                start_time = end_time - timedelta(hours=1)
            else:
                start_time = end_time - timedelta(days=1)
        else:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid time format'}), 400
        
        # Get all metrics
        dashboard_data = {
            'time_period': time_period,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'metrics': {},
            'summary': {
                'total_requests': 0,
                'avg_response_time': 0,
                'error_rate': 0,
                'cache_hit_rate': 0
            }
        }
        
        # Collect all metrics
        for metric_name in METRICS_CONFIG['metric_types']:
            try:
                metric_data = aggregate_metrics(metric_name, time_period, start_time, end_time)
                dashboard_data['metrics'][metric_name] = metric_data
                
                # Update summary
                if metric_name == 'request_count':
                    dashboard_data['summary']['total_requests'] = metric_data['statistics']['sum']
                elif metric_name == 'response_time':
                    dashboard_data['summary']['avg_response_time'] = metric_data['statistics']['avg']
                elif metric_name == 'error_rate':
                    dashboard_data['summary']['error_rate'] = metric_data['statistics']['avg']
                elif metric_name == 'cache_hit_rate':
                    dashboard_data['summary']['cache_hit_rate'] = metric_data['statistics']['avg']
                    
            except Exception as e:
                logger.warning(f"Failed to get metric {metric_name}", error=str(e))
                dashboard_data['metrics'][metric_name] = {'error': str(e)}
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.exception("Failed to get metrics dashboard", error=str(e))
        return jsonify({'error': 'Failed to get dashboard data'}), 500


@metrics_v5.route('/alerts', methods=['GET'])
@require_metrics_permission()
def get_metrics_alerts():
    """Get active metrics alerts."""
    try:
        # Get alerts from Redis
        alerts = redis_manager.get_from_list('metrics_alerts', start=0, end=100)
        
        # Filter active alerts
        active_alerts = []
        for alert in alerts:
            if alert.get('status') == 'active':
                active_alerts.append(alert)
        
        return jsonify({
            'alerts': active_alerts,
            'count': len(active_alerts)
        })
        
    except Exception as e:
        logger.exception("Failed to get metrics alerts", error=str(e))
        return jsonify({'error': 'Failed to get alerts'}), 500


@metrics_v5.route('/alerts', methods=['POST'])
@require_metrics_permission()
def create_metrics_alert():
    """Create a new metrics alert."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['metric_name', 'condition', 'threshold', 'severity']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate metric name
        if data['metric_name'] not in METRICS_CONFIG['metric_types']:
            return jsonify({'error': 'Invalid metric name'}), 400
        
        # Validate condition
        valid_conditions = ['greater_than', 'less_than', 'equals', 'not_equals']
        if data['condition'] not in valid_conditions:
            return jsonify({'error': 'Invalid condition'}), 400
        
        # Validate severity
        valid_severities = ['low', 'medium', 'high', 'critical']
        if data['severity'] not in valid_severities:
            return jsonify({'error': 'Invalid severity'}), 400
        
        # Create alert
        alert = {
            'id': f"alert_{int(time.time())}",
            'metric_name': data['metric_name'],
            'condition': data['condition'],
            'threshold': data['threshold'],
            'severity': data['severity'],
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'created_by': getattr(g, 'user_id', None),
            'description': data.get('description', ''),
            'notification_channels': data.get('notification_channels', [])
        }
        
        # Store alert
        redis_manager.add_to_list('metrics_alerts', alert, max_length=1000)
        
        return jsonify({
            'message': 'Alert created successfully',
            'alert': alert
        }), 201
        
    except Exception as e:
        logger.exception("Failed to create metrics alert", error=str(e))
        return jsonify({'error': 'Failed to create alert'}), 500


@metrics_v5.route('/alerts/<alert_id>', methods=['PUT'])
@require_metrics_permission()
def update_metrics_alert(alert_id: str):
    """Update a metrics alert."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Get existing alert
        alerts = redis_manager.get_from_list('metrics_alerts', start=0, end=1000)
        alert_index = None
        existing_alert = None
        
        for i, alert in enumerate(alerts):
            if alert.get('id') == alert_id:
                alert_index = i
                existing_alert = alert
                break
        
        if not existing_alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        # Update alert
        updated_alert = existing_alert.copy()
        allowed_fields = ['condition', 'threshold', 'severity', 'status', 'description', 'notification_channels']
        
        for field in allowed_fields:
            if field in data:
                updated_alert[field] = data[field]
        
        updated_alert['updated_at'] = datetime.utcnow().isoformat()
        updated_alert['updated_by'] = getattr(g, 'user_id', None)
        
        # Update in Redis
        alerts[alert_index] = updated_alert
        redis_manager.set('metrics_alerts', alerts, ttl=86400 * 30)  # 30 days
        
        return jsonify({
            'message': 'Alert updated successfully',
            'alert': updated_alert
        })
        
    except Exception as e:
        logger.exception("Failed to update metrics alert", error=str(e))
        return jsonify({'error': 'Failed to update alert'}), 500


@metrics_v5.route('/alerts/<alert_id>', methods=['DELETE'])
@require_metrics_permission()
def delete_metrics_alert(alert_id: str):
    """Delete a metrics alert."""
    try:
        # Get existing alert
        alerts = redis_manager.get_from_list('metrics_alerts', start=0, end=1000)
        alert_index = None
        
        for i, alert in enumerate(alerts):
            if alert.get('id') == alert_id:
                alert_index = i
                break
        
        if alert_index is None:
            return jsonify({'error': 'Alert not found'}), 404
        
        # Remove alert
        deleted_alert = alerts.pop(alert_index)
        redis_manager.set('metrics_alerts', alerts, ttl=86400 * 30)  # 30 days
        
        return jsonify({
            'message': 'Alert deleted successfully',
            'alert': deleted_alert
        })
        
    except Exception as e:
        logger.exception("Failed to delete metrics alert", error=str(e))
        return jsonify({'error': 'Failed to delete alert'}), 500


# Error handlers
@metrics_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@metrics_v5.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@metrics_v5.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@metrics_v5.errorhandler(404)
def not_found(error):
    """Handle not found errors."""
    return jsonify({'error': 'Resource not found'}), 404


@metrics_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Metrics API internal server error", error=str(error))
    return jsonify({'error': 'Metrics service unavailable'}), 500
