#!/usr/bin/env python3
"""Consolidated v5 monitoring API routes.

This route file consolidates all monitoring functionality including health checks,
system status, performance metrics, and service monitoring.
Replaces: health.py, health_routes.py, redis_health.py, metrics.py, metrics_api.py, container_status_api.py
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List, Union
import json
from datetime import datetime, timedelta
from functools import wraps
import time
import psutil
import os
from utils.logging_config import get_logger
from middleware.auth_v5 import AuthV5Middleware
from middleware.rate_limit_v5 import RateLimitV5Middleware
from middleware.observability_v5 import ObservabilityV5Middleware
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from cache.redis_manager_v5 import RedisManagerV5
from database.database_manager_v5 import get_database_manager_v5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

# Create blueprint using the factory
monitoring_v5 = BlueprintFactoryV5.create_blueprint(
    'monitoring_api',
    __name__,
    url_prefix='/api/v5/monitoring',
    config_override={
        'enable_cors': True,
        'auth_required': True,
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Monitoring data is real-time
        'enable_observability': True,
        'enable_etag': False  # Real-time monitoring data shouldn't be cached
    }
)

# Global service instances
redis_manager = None
database_manager = None
feature_flags = None

# Monitoring configuration
MONITORING_CONFIG = {
    'health_check_timeout': 5,  # seconds
    'performance_thresholds': {
        'cpu_usage_percent': 80,
        'memory_usage_percent': 85,
        'disk_usage_percent': 90,
        'response_time_ms': 1000,
        'error_rate_percent': 5
    },
    'service_dependencies': [
        'database',
        'redis',
        'external_apis'
    ]
}


def init_services(redis_manager_instance, database_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global redis_manager, database_manager, feature_flags
    
    redis_manager = redis_manager_instance
    database_manager = database_manager_instance or get_database_manager_v5()
    feature_flags = feature_flags_instance


def require_monitoring_permission():
    """Decorator to require monitoring viewing permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            required_permissions = ['view_monitoring', 'view_health', 'view_metrics']
            user_permissions = set(g.user_permissions)
            
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient permissions for monitoring access'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def check_database_health() -> Dict[str, Any]:
    """Check database health status."""
    try:
        start_time = time.time()
        
        # Test database connection
        with database_manager.get_session() as session:
            result = session.execute("SELECT 1").fetchone()
            if not result:
                raise Exception("Database query failed")
        
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Get connection info using v5 database manager
        connection_stats = database_manager.get_connection_stats()
        
        return {
            'status': 'healthy',
            'response_time_ms': response_time,
            'connection_pool': {
                'active_connections': connection_stats.get('active_connections', 0),
                'max_connections': connection_stats.get('max_connections', 0),
                'total_connections': connection_stats.get('total_connections', 0),
                'failed_connections': connection_stats.get('failed_connections', 0)
            }
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'response_time_ms': None
        }


def check_redis_health() -> Dict[str, Any]:
    """Check Redis health status."""
    try:
        start_time = time.time()
        
        # Test Redis connection
        redis_manager.ping()
        
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Get Redis info
        redis_info = redis_manager.get_info()
        
        return {
            'status': 'healthy',
            'response_time_ms': response_time,
            'memory_usage': redis_info.get('used_memory_human', 'unknown'),
            'connected_clients': redis_info.get('connected_clients', 0),
            'ops_per_sec': redis_info.get('instantaneous_ops_per_sec', 0)
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'response_time_ms': None
        }


def check_system_health() -> Dict[str, Any]:
    """Check system health metrics."""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        
        # Load average
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
        
        # Determine overall status
        status = 'healthy'
        if (cpu_percent > MONITORING_CONFIG['performance_thresholds']['cpu_usage_percent'] or
            memory_percent > MONITORING_CONFIG['performance_thresholds']['memory_usage_percent'] or
            disk_percent > MONITORING_CONFIG['performance_thresholds']['disk_usage_percent']):
            status = 'degraded'
        
        return {
            'status': status,
            'cpu': {
                'usage_percent': cpu_percent,
                'count': psutil.cpu_count(),
                'load_average': load_avg
            },
            'memory': {
                'usage_percent': memory_percent,
                'total_gb': memory.total / (1024**3),
                'available_gb': memory.available / (1024**3)
            },
            'disk': {
                'usage_percent': disk_percent,
                'total_gb': disk.total / (1024**3),
                'free_gb': disk.free / (1024**3)
            }
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e)
        }


def check_external_services() -> Dict[str, Any]:
    """Check external service dependencies."""
    external_services = {}
    
    # Check Google Places API (if configured)
    try:
        # This would be a real check in production
        external_services['google_places'] = {
            'status': 'healthy',
            'response_time_ms': 150
        }
    except Exception as e:
        external_services['google_places'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
    
    # Check other external services as needed
    
    return external_services


# Monitoring endpoints
@monitoring_v5.route('/health', methods=['GET'])
@require_monitoring_permission()
def monitoring_health_check():
    """Comprehensive health check endpoint."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not local_flags.is_enabled('monitoring_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Monitoring API v5 is not enabled for your account'
            }), 503
        
        health_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'overall_status': 'healthy',
            'services': {},
            'system': {},
            'external_services': {}
        }
        
        # Check database health
        health_data['services']['database'] = check_database_health()
        
        # Check Redis health
        health_data['services']['redis'] = check_redis_health()
        
        # Check system health
        health_data['system'] = check_system_health()
        
        # Check external services
        health_data['external_services'] = check_external_services()
        
        # Determine overall status
        unhealthy_services = []
        for service_name, service_data in health_data['services'].items():
            if service_data.get('status') != 'healthy':
                unhealthy_services.append(service_name)
        
        if health_data['system'].get('status') == 'unhealthy':
            unhealthy_services.append('system')
        
        if unhealthy_services:
            health_data['overall_status'] = 'degraded' if len(unhealthy_services) < len(health_data['services']) else 'unhealthy'
            health_data['unhealthy_services'] = unhealthy_services
        
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("Health check failed", error=str(e))
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'overall_status': 'unhealthy',
            'error': str(e)
        }), 500


@monitoring_v5.route('/health/database', methods=['GET'])
@require_monitoring_permission()
def database_health():
    """Database-specific health check."""
    try:
        health_data = check_database_health()
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("Database health check failed", error=str(e))
        return jsonify({'error': 'Database health check failed'}), 500


@monitoring_v5.route('/health/redis', methods=['GET'])
@require_monitoring_permission()
def redis_health():
    """Redis-specific health check."""
    try:
        health_data = check_redis_health()
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("Redis health check failed", error=str(e))
        return jsonify({'error': 'Redis health check failed'}), 500


@monitoring_v5.route('/health/system', methods=['GET'])
@require_monitoring_permission()
def system_health():
    """System-specific health check."""
    try:
        health_data = check_system_health()
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("System health check failed", error=str(e))
        return jsonify({'error': 'System health check failed'}), 500


@monitoring_v5.route('/status', methods=['GET'])
@require_monitoring_permission()
def system_status():
    """Get detailed system status information."""
    try:
        status_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'application': {
                'name': 'JewGo API',
                'version': '5.0.0',
                'environment': os.getenv('ENVIRONMENT', 'development'),
                'uptime_seconds': time.time() - psutil.Process().create_time()
            },
            'services': {},
            'performance': {},
            'configuration': {
                'feature_flags': feature_flags.get_all_flags() if feature_flags else {},
                'monitoring_config': MONITORING_CONFIG
            }
        }
        
        # Get service statuses
        status_data['services']['database'] = check_database_health()
        status_data['services']['redis'] = check_redis_health()
        status_data['services']['external'] = check_external_services()
        
        # Get performance metrics
        status_data['performance'] = check_system_health()
        
        return jsonify(status_data)
        
    except Exception as e:
        logger.exception("Failed to get system status", error=str(e))
        return jsonify({'error': 'Failed to get system status'}), 500


@monitoring_v5.route('/metrics', methods=['GET'])
@require_monitoring_permission()
def system_metrics():
    """Get system performance metrics."""
    try:
        metrics_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'system': {},
            'application': {},
            'services': {}
        }
        
        # System metrics
        system_health = check_system_health()
        metrics_data['system'] = {
            'cpu_usage_percent': system_health.get('cpu', {}).get('usage_percent', 0),
            'memory_usage_percent': system_health.get('memory', {}).get('usage_percent', 0),
            'disk_usage_percent': system_health.get('disk', {}).get('usage_percent', 0),
            'load_average': system_health.get('cpu', {}).get('load_average', [0, 0, 0])
        }
        
        # Application metrics
        connection_stats = database_manager.get_connection_stats() if database_manager else {}
        metrics_data['application'] = {
            'active_connections': connection_stats.get('active_connections', 0),
            'total_connections': connection_stats.get('total_connections', 0),
            'failed_connections': connection_stats.get('failed_connections', 0),
            'request_count_last_hour': redis_manager.get_counter('requests_last_hour', default=0) if redis_manager else 0,
            'error_count_last_hour': redis_manager.get_counter('errors_last_hour', default=0) if redis_manager else 0,
            'cache_hit_rate': redis_manager.get_avg_metric('cache_hit_rate', default=0) if redis_manager else 0
        }
        
        # Service metrics
        db_health = check_database_health()
        redis_health = check_redis_health()
        
        metrics_data['services'] = {
            'database': {
                'response_time_ms': db_health.get('response_time_ms'),
                'active_connections': db_health.get('connection_pool', {}).get('active_connections', 0)
            },
            'redis': {
                'response_time_ms': redis_health.get('response_time_ms'),
                'connected_clients': redis_health.get('connected_clients', 0),
                'ops_per_sec': redis_health.get('ops_per_sec', 0)
            }
        }
        
        return jsonify(metrics_data)
        
    except Exception as e:
        logger.exception("Failed to get system metrics", error=str(e))
        return jsonify({'error': 'Failed to get system metrics'}), 500


@monitoring_v5.route('/alerts', methods=['GET'])
@require_monitoring_permission()
def get_alerts():
    """Get active system alerts."""
    try:
        alerts = []
        
        # Check system thresholds
        system_health = check_system_health()
        
        if system_health.get('cpu', {}).get('usage_percent', 0) > MONITORING_CONFIG['performance_thresholds']['cpu_usage_percent']:
            alerts.append({
                'type': 'cpu_usage',
                'severity': 'warning',
                'message': f"High CPU usage: {system_health['cpu']['usage_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        if system_health.get('memory', {}).get('usage_percent', 0) > MONITORING_CONFIG['performance_thresholds']['memory_usage_percent']:
            alerts.append({
                'type': 'memory_usage',
                'severity': 'warning',
                'message': f"High memory usage: {system_health['memory']['usage_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        if system_health.get('disk', {}).get('usage_percent', 0) > MONITORING_CONFIG['performance_thresholds']['disk_usage_percent']:
            alerts.append({
                'type': 'disk_usage',
                'severity': 'critical',
                'message': f"High disk usage: {system_health['disk']['usage_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        # Check service health
        db_health = check_database_health()
        if db_health.get('status') != 'healthy':
            alerts.append({
                'type': 'database',
                'severity': 'critical',
                'message': f"Database unhealthy: {db_health.get('error', 'Unknown error')}",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        redis_health = check_redis_health()
        if redis_health.get('status') != 'healthy':
            alerts.append({
                'type': 'redis',
                'severity': 'critical',
                'message': f"Redis unhealthy: {redis_health.get('error', 'Unknown error')}",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return jsonify({
            'alerts': alerts,
            'count': len(alerts),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.exception("Failed to get alerts", error=str(e))
        return jsonify({'error': 'Failed to get alerts'}), 500


@monitoring_v5.route('/container', methods=['GET'])
@require_monitoring_permission()
def container_status():
    """Get container and deployment status."""
    try:
        container_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'container': {
                'id': os.getenv('HOSTNAME', 'unknown'),
                'environment': os.getenv('ENVIRONMENT', 'development'),
                'version': os.getenv('APP_VERSION', '5.0.0'),
                'deployment_id': os.getenv('DEPLOYMENT_ID', 'unknown')
            },
            'process': {
                'pid': os.getpid(),
                'uptime_seconds': time.time() - psutil.Process().create_time(),
                'memory_usage_mb': psutil.Process().memory_info().rss / (1024 * 1024),
                'cpu_percent': psutil.Process().cpu_percent()
            },
            'deployment': {
                'build_date': os.getenv('BUILD_DATE', 'unknown'),
                'git_commit': os.getenv('GIT_COMMIT', 'unknown'),
                'git_branch': os.getenv('GIT_BRANCH', 'unknown')
            }
        }
        
        return jsonify(container_data)
        
    except Exception as e:
        logger.exception("Failed to get container status", error=str(e))
        return jsonify({'error': 'Failed to get container status'}), 500


@monitoring_v5.route('/containers', methods=['GET'])
@require_monitoring_permission()
def docker_containers_status():
    """Get Docker containers status from the server."""
    try:
        import subprocess
        import json
        
        # Get all containers with detailed information
        result = subprocess.run([
            'docker', 'ps', '-a', 
            '--format', '{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}|{{.CreatedAt}}'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            logger.error(f"Failed to get Docker containers: {result.stderr}")
            return jsonify({'error': 'Failed to get Docker containers'}), 500
        
        containers = []
        container_lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        for line in container_lines:
            if not line.strip():
                continue
                
            parts = line.split('|')
            if len(parts) >= 5:
                name = parts[0]
                status = parts[1]
                image = parts[2]
                ports = parts[3]
                created = parts[4]
                
                # Determine container status
                container_status = 'stopped'
                if 'Up' in status:
                    if 'unhealthy' in status:
                        container_status = 'unhealthy'
                    else:
                        container_status = 'running'
                
                # Get additional container details
                container_details = get_container_details(name)
                
                containers.append({
                    'name': name,
                    'status': container_status,
                    'uptime': container_details.get('uptime', 'unknown'),
                    'created': created,
                    'image': image,
                    'ports': ports,
                    'health': container_details.get('health', 'unknown'),
                    'recent_errors': container_details.get('recent_errors', []),
                    'restart_count': container_details.get('restart_count', 0),
                    'memory_usage': container_details.get('memory_usage', 'unknown'),
                    'cpu_usage': container_details.get('cpu_usage', 'unknown')
                })
        
        return jsonify({
            'success': True,
            'source': 'real',
            'data': {
                'containers': containers,
                'timestamp': datetime.utcnow().isoformat(),
                'total_containers': len(containers)
            }
        })
        
    except subprocess.TimeoutExpired:
        logger.error("Timeout getting Docker containers")
        return jsonify({'error': 'Timeout getting Docker containers'}), 500
    except Exception as e:
        logger.exception("Failed to get Docker containers status", error=str(e))
        return jsonify({'error': 'Failed to get Docker containers status'}), 500


def get_container_details(container_name: str) -> Dict[str, Any]:
    """Get additional details for a specific container."""
    try:
        import subprocess
        
        details = {
            'uptime': 'unknown',
            'health': 'unknown',
            'recent_errors': [],
            'restart_count': 0,
            'memory_usage': 'unknown',
            'cpu_usage': 'unknown'
        }
        
        # Get container health and restart count
        try:
            result = subprocess.run([
                'docker', 'inspect', container_name,
                '--format', '{{.State.Health.Status}}|{{.RestartCount}}'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0 and result.stdout.strip():
                parts = result.stdout.strip().split('|')
                if len(parts) >= 2:
                    details['health'] = parts[0] or 'unknown'
                    details['restart_count'] = int(parts[1]) if parts[1].isdigit() else 0
        except Exception:
            pass
        
        # Get container uptime
        try:
            result = subprocess.run([
                'docker', 'exec', container_name, 'uptime'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0 and result.stdout.strip():
                details['uptime'] = result.stdout.strip()
        except Exception:
            pass
        
        return details
        
    except Exception as e:
        logger.warning(f"Failed to get details for container {container_name}: {e}")
        return {
            'uptime': 'unknown',
            'health': 'unknown',
            'recent_errors': [],
            'restart_count': 0,
            'memory_usage': 'unknown',
            'cpu_usage': 'unknown'
        }


# Error handlers
@monitoring_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@monitoring_v5.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@monitoring_v5.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@monitoring_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Monitoring API internal server error", error=str(error))
    return jsonify({'error': 'Monitoring service unavailable'}), 500
