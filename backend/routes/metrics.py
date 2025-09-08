"""
Prometheus metrics endpoint for JewGo application
Provides comprehensive metrics for monitoring and alerting
"""

import time
import psutil
from datetime import datetime
from collections import defaultdict, deque
from typing import Dict, Any, Optional
from flask import Blueprint, jsonify, request
from prometheus_client import (
    Counter, Histogram, Gauge, Summary, 
    generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry, REGISTRY
)

# Create a custom registry for JewGo metrics
jewgo_registry = CollectorRegistry()

# HTTP Metrics
http_requests_total = Counter(
    'jewgo_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=jewgo_registry
)

http_request_duration_seconds = Histogram(
    'jewgo_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=jewgo_registry
)

# Database Metrics
database_queries_total = Counter(
    'jewgo_database_queries_total',
    'Total database queries',
    ['operation', 'table'],
    registry=jewgo_registry
)

database_query_duration_seconds = Histogram(
    'jewgo_database_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table'],
    registry=jewgo_registry
)

database_connections_active = Gauge(
    'jewgo_database_connections_active',
    'Active database connections',
    registry=jewgo_registry
)

database_connections_failed_total = Counter(
    'jewgo_database_connections_failed_total',
    'Total database connection failures',
    registry=jewgo_registry
)

database_slow_queries_total = Counter(
    'jewgo_database_slow_queries_total',
    'Total slow database queries',
    ['table'],
    registry=jewgo_registry
)

# Search Metrics
search_requests_total = Counter(
    'jewgo_search_requests_total',
    'Total search requests',
    ['provider', 'type', 'status'],
    registry=jewgo_registry
)

search_duration_seconds = Histogram(
    'jewgo_search_duration_seconds',
    'Search request duration in seconds',
    ['provider', 'type'],
    registry=jewgo_registry
)

search_no_results_total = Counter(
    'jewgo_search_no_results_total',
    'Total searches with no results',
    ['provider', 'type'],
    registry=jewgo_registry
)

# Cache Metrics
cache_requests_total = Counter(
    'jewgo_cache_requests_total',
    'Total cache requests',
    ['operation'],
    registry=jewgo_registry
)

cache_hits_total = Counter(
    'jewgo_cache_hits_total',
    'Total cache hits',
    ['operation'],
    registry=jewgo_registry
)

cache_errors_total = Counter(
    'jewgo_cache_errors_total',
    'Total cache errors',
    ['operation', 'error_type'],
    registry=jewgo_registry
)

cache_memory_usage_bytes = Gauge(
    'jewgo_cache_memory_usage_bytes',
    'Cache memory usage in bytes',
    registry=jewgo_registry
)

cache_memory_limit_bytes = Gauge(
    'jewgo_cache_memory_limit_bytes',
    'Cache memory limit in bytes',
    registry=jewgo_registry
)

# Business Metrics
users_registered_total = Counter(
    'jewgo_users_registered_total',
    'Total user registrations',
    ['method'],
    registry=jewgo_registry
)

users_active_total = Counter(
    'jewgo_users_active_total',
    'Total active users',
    registry=jewgo_registry
)

user_actions_total = Counter(
    'jewgo_user_actions_total',
    'Total user actions',
    ['action_type'],
    registry=jewgo_registry
)

restaurant_searches_total = Counter(
    'jewgo_restaurant_searches_total',
    'Total restaurant searches',
    ['search_type'],
    registry=jewgo_registry
)

synagogue_searches_total = Counter(
    'jewgo_synagogue_searches_total',
    'Total synagogue searches',
    ['search_type'],
    registry=jewgo_registry
)

# API Usage Metrics
api_requests_total = Counter(
    'jewgo_api_requests_total',
    'Total API requests',
    ['endpoint', 'method', 'status'],
    registry=jewgo_registry
)

api_request_duration_seconds = Histogram(
    'jewgo_api_request_duration_seconds',
    'API request duration in seconds',
    ['endpoint', 'method'],
    registry=jewgo_registry
)

# Error Metrics
errors_total = Counter(
    'jewgo_errors_total',
    'Total application errors',
    ['error_type', 'component'],
    registry=jewgo_registry
)

# Security Metrics
auth_failed_logins_total = Counter(
    'jewgo_auth_failed_logins_total',
    'Total failed login attempts',
    ['method'],
    registry=jewgo_registry
)

rate_limit_exceeded_total = Counter(
    'jewgo_rate_limit_exceeded_total',
    'Total rate limit violations',
    ['endpoint'],
    registry=jewgo_registry
)

# System Metrics
system_memory_usage_bytes = Gauge(
    'jewgo_system_memory_usage_bytes',
    'System memory usage in bytes',
    registry=jewgo_registry
)

system_cpu_usage_percent = Gauge(
    'jewgo_system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=jewgo_registry
)

# Performance Metrics
performance_metrics = defaultdict(lambda: deque(maxlen=1000))

# Create metrics blueprint
metrics_bp = Blueprint('metrics', __name__)

@metrics_bp.route('/metrics')
def prometheus_metrics():
    """Prometheus metrics endpoint"""
    # Update system metrics
    _update_system_metrics()
    
    # Update performance metrics
    _update_performance_metrics()
    
    return generate_latest(jewgo_registry), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@metrics_bp.route('/metrics/health')
def health_metrics():
    """Health check endpoint with basic metrics"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'uptime': time.time() - _get_start_time(),
        'version': '1.0.0'
    })

@metrics_bp.route('/metrics/custom')
def custom_metrics():
    """Custom application metrics in JSON format"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'performance': dict(performance_metrics),
        'system': {
            'memory_usage_mb': psutil.virtual_memory().used / 1024 / 1024,
            'cpu_percent': psutil.cpu_percent(),
            'disk_usage_percent': psutil.disk_usage('/').percent
        }
    })

@metrics_bp.route('/metrics/performance')
def performance_metrics_endpoint():
    """Performance-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'performance_metrics': dict(performance_metrics)
    })

@metrics_bp.route('/metrics/database')
def database_metrics_endpoint():
    """Database-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'database_metrics': {
            'active_connections': database_connections_active._value._value,
            'failed_connections': database_connections_failed_total._value._value,
            'slow_queries': sum(database_slow_queries_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/search')
def search_metrics_endpoint():
    """Search-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'search_metrics': {
            'total_requests': sum(search_requests_total._value._value.values()),
            'no_results': sum(search_no_results_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/cache')
def cache_metrics_endpoint():
    """Cache-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'cache_metrics': {
            'hit_rate': _calculate_cache_hit_rate(),
            'memory_usage': cache_memory_usage_bytes._value._value,
            'memory_limit': cache_memory_limit_bytes._value._value
        }
    })

@metrics_bp.route('/metrics/business')
def business_metrics_endpoint():
    """Business-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'business_metrics': {
            'total_users': sum(users_registered_total._value._value.values()),
            'active_users': users_active_total._value._value,
            'restaurant_searches': sum(restaurant_searches_total._value._value.values()),
            'synagogue_searches': sum(synagogue_searches_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/users')
def user_metrics_endpoint():
    """User-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'user_metrics': {
            'registrations': dict(users_registered_total._value._value),
            'active_users': users_active_total._value._value,
            'actions': dict(user_actions_total._value._value)
        }
    })

@metrics_bp.route('/metrics/restaurants')
def restaurant_metrics_endpoint():
    """Restaurant-specific metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'restaurant_metrics': {
            'searches': dict(restaurant_searches_total._value._value),
            'total_searches': sum(restaurant_searches_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/usage')
def usage_metrics_endpoint():
    """API usage metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'usage_metrics': {
            'api_requests': dict(api_requests_total._value._value),
            'total_requests': sum(api_requests_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/errors')
def error_metrics_endpoint():
    """Error tracking metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'error_metrics': {
            'errors_by_type': dict(errors_total._value._value),
            'total_errors': sum(errors_total._value._value.values())
        }
    })

@metrics_bp.route('/metrics/security')
def security_metrics_endpoint():
    """Security metrics"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'security_metrics': {
            'failed_logins': dict(auth_failed_logins_total._value._value),
            'rate_limit_violations': dict(rate_limit_exceeded_total._value._value)
        }
    })

# Helper functions
def _update_system_metrics():
    """Update system-level metrics"""
    try:
        memory = psutil.virtual_memory()
        system_memory_usage_bytes.set(memory.used)
        system_cpu_usage_percent.set(psutil.cpu_percent())
    except Exception as e:
        errors_total.labels(error_type='system_metrics', component='metrics').inc()

def _update_performance_metrics():
    """Update performance metrics"""
    try:
        # Add current performance data
        performance_metrics['timestamp'].append(datetime.utcnow().isoformat())
        performance_metrics['memory_usage'].append(psutil.virtual_memory().percent)
        performance_metrics['cpu_usage'].append(psutil.cpu_percent())
    except Exception as e:
        errors_total.labels(error_type='performance_metrics', component='metrics').inc()

def _calculate_cache_hit_rate():
    """Calculate cache hit rate"""
    try:
        total_requests = sum(cache_requests_total._value._value.values())
        total_hits = sum(cache_hits_total._value._value.values())
        return (total_hits / total_requests * 100) if total_requests > 0 else 0
    except:
        return 0

def _get_start_time():
    """Get application start time"""
    return getattr(_get_start_time, '_start_time', time.time())

# Set start time when module is imported
_get_start_time._start_time = time.time()

# Metric recording functions for use throughout the application
def record_http_request(method: str, endpoint: str, status: int, duration: float):
    """Record HTTP request metrics"""
    http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
    http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)

def record_database_query(operation: str, table: str, duration: float, is_slow: bool = False):
    """Record database query metrics"""
    database_queries_total.labels(operation=operation, table=table).inc()
    database_query_duration_seconds.labels(operation=operation, table=table).observe(duration)
    if is_slow:
        database_slow_queries_total.labels(table=table).inc()

def record_search_request(provider: str, search_type: str, status: str, duration: float, has_results: bool = True):
    """Record search request metrics"""
    search_requests_total.labels(provider=provider, type=search_type, status=status).inc()
    search_duration_seconds.labels(provider=provider, type=search_type).observe(duration)
    if not has_results:
        search_no_results_total.labels(provider=provider, type=search_type).inc()

def record_cache_operation(operation: str, hit: bool, error: Optional[str] = None):
    """Record cache operation metrics"""
    cache_requests_total.labels(operation=operation).inc()
    if hit:
        cache_hits_total.labels(operation=operation).inc()
    if error:
        cache_errors_total.labels(operation=operation, error_type=error).inc()

def record_user_action(action_type: str):
    """Record user action metrics"""
    user_actions_total.labels(action_type=action_type).inc()

def record_business_metric(metric_type: str, subtype: str = None):
    """Record business metrics"""
    if metric_type == 'restaurant_search':
        restaurant_searches_total.labels(search_type=subtype or 'general').inc()
    elif metric_type == 'synagogue_search':
        synagogue_searches_total.labels(search_type=subtype or 'general').inc()
    elif metric_type == 'user_registration':
        users_registered_total.labels(method=subtype or 'email').inc()

def record_error(error_type: str, component: str):
    """Record error metrics"""
    errors_total.labels(error_type=error_type, component=component).inc()

def record_security_event(event_type: str, details: Dict[str, str] = None):
    """Record security event metrics"""
    if event_type == 'failed_login':
        method = details.get('method', 'unknown') if details else 'unknown'
        auth_failed_logins_total.labels(method=method).inc()
    elif event_type == 'rate_limit':
        endpoint = details.get('endpoint', 'unknown') if details else 'unknown'
        rate_limit_exceeded_total.labels(endpoint=endpoint).inc()
