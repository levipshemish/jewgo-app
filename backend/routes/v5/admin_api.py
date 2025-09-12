#!/usr/bin/env python3
"""Consolidated v5 admin API routes with comprehensive administrative functionality.

This route file consolidates all administrative functionality including user management,
system monitoring, analytics, bulk operations, and content moderation.
Replaces: admin_api.py, user_management.py, analytics_api.py, and other admin routes.
"""

from flask import Blueprint, request, jsonify, g, Response
from typing import Dict, Any, Optional, List, Union
import json
from datetime import datetime, timedelta
from functools import wraps
import csv
import io
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from database.services.restaurant_service_v5 import RestaurantServiceV5
from database.services.synagogue_service_v5 import SynagogueServiceV5
from database.services.mikvah_service_v5 import MikvahServiceV5
from database.services.store_service_v5 import StoreServiceV5
from middleware.auth_v5 import AuthV5Middleware
from middleware.rate_limit_v5 import RateLimitV5Middleware
from middleware.observability_v5 import ObservabilityV5Middleware
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

# Create blueprint using the factory
admin_bp = BlueprintFactoryV5.create_blueprint(
    'admin_api',
    __name__,
    url_prefix='/api/v5/admin',
    config_override={
        'enable_cors': False,  # Disabled - Nginx handles CORS
        'auth_required': True,
        'min_role_level': 10,
        'audit_logging': True,
        'enable_rate_limiting': True,
        'enable_idempotency': True,
        'enable_observability': True,
        'rate_limit_tier': 'admin'
    }
)

# Global service instances
entity_repository = None
services = {}
redis_manager = None
feature_flags = None

# Admin permission levels
ADMIN_PERMISSIONS = {
    'super_admin': ['*'],  # All permissions
    'system_admin': [
        'manage_users', 'manage_system', 'view_analytics', 'manage_content',
        'bulk_operations', 'manage_feature_flags'
    ],
    'data_admin': [
        'manage_content', 'bulk_operations', 'view_analytics', 'moderate_content'
    ],
    'moderator': [
        'moderate_content', 'view_content', 'limited_bulk_operations'
    ]
}

# Analytics configuration
ANALYTICS_CONFIG = {
    'retention_days': 90,
    'batch_size': 1000,
    'cache_ttl': 300,  # 5 minutes
    'export_formats': ['json', 'csv', 'xlsx'],
    'max_export_records': 50000
}


def init_services(connection_manager, redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global entity_repository, services, redis_manager, feature_flags
    
    entity_repository = EntityRepositoryV5(connection_manager)
    redis_manager = redis_manager_instance
    feature_flags = feature_flags_instance
    
    # Initialize specialized services with correct parameters
    # RestaurantServiceV5 and SynagogueServiceV5 expect event_publisher, not feature_flags
    # MikvahServiceV5 and StoreServiceV5 expect feature_flags
    services = {
        'restaurants': RestaurantServiceV5(entity_repository, redis_manager_instance, None),  # Pass None for event_publisher
        'synagogues': SynagogueServiceV5(entity_repository, redis_manager_instance, None),    # Pass None for event_publisher
        'mikvahs': MikvahServiceV5(entity_repository, redis_manager_instance, feature_flags_instance),
        'stores': StoreServiceV5(entity_repository, redis_manager_instance, feature_flags_instance)
    }


def require_admin_permission(required_permissions: List[str]):
    """Decorator to require specific admin permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_roles') or not g.user_roles:
                return jsonify({'error': 'Admin authentication required'}), 401
            
            # Extract role names from role objects
            user_role_names = set([r if isinstance(r, str) else r.get('role') for r in (g.user_roles or []) if r])
            admin_roles = set(ADMIN_PERMISSIONS.keys())
            
            if not user_role_names & admin_roles and not getattr(g, 'is_admin', False):
                return jsonify({'error': 'Admin access required'}), 403
            
            # Check if user has super_admin (all permissions)
            if 'super_admin' in user_role_names:
                return f(*args, **kwargs)
            
            # Check specific permissions
            user_permissions = set()
            for role in user_role_names:
                if role in ADMIN_PERMISSIONS:
                    user_permissions.update(ADMIN_PERMISSIONS[role])
            
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient admin permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_admin_action(action: str, details: Dict[str, Any]):
    """Log admin action for audit trail."""
    try:
        audit_record = {
            'action': action,
            'user_id': getattr(g, 'user_id', None),
            'user_email': getattr(g, 'user_email', None),
            'user_roles': getattr(g, 'user_roles', []),
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'correlation_id': getattr(g, 'correlation_id', None)
        }
        
        # Store in Redis for immediate access and database for persistence
        redis_manager.add_to_list('admin_audit_log', audit_record, max_length=10000)
        
        logger.info("Admin action logged", 
                   action=action, 
                   user_id=audit_record['user_id'],
                   details=details)
        
    except Exception as e:
        logger.exception("Failed to log admin action", action=action, error=str(e))


# System monitoring and health endpoints
@admin_bp.route('/health/system', methods=['GET'])
@require_admin_permission(['view_analytics', 'manage_system'])
def system_health():
    """Get comprehensive system health status."""
    try:
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not feature_flags.is_enabled('admin_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Admin API v5 is not enabled for your account'
            }), 503
        
        health_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'overall_status': 'healthy',
            'services': {},
            'database': {},
            'redis': {},
            'performance': {}
        }
        
        # Check database health
        try:
            db_stats = entity_repository.get_health_stats()
            health_data['database'] = {
                'status': 'healthy',
                'connection_count': db_stats.get('active_connections', 0),
                'query_performance': db_stats.get('avg_query_time_ms', 0),
                'storage_usage': db_stats.get('storage_usage_mb', 0)
            }
        except Exception as e:
            health_data['database'] = {'status': 'unhealthy', 'error': str(e)}
            health_data['overall_status'] = 'degraded'
        
        # Check Redis health
        try:
            redis_info = redis_manager.get_info()
            health_data['redis'] = {
                'status': 'healthy',
                'memory_usage': redis_info.get('used_memory_human', 'unknown'),
                'connected_clients': redis_info.get('connected_clients', 0),
                'ops_per_sec': redis_info.get('instantaneous_ops_per_sec', 0)
            }
        except Exception as e:
            health_data['redis'] = {'status': 'unhealthy', 'error': str(e)}
            health_data['overall_status'] = 'degraded'
        
        # Check service health
        for service_name, service in services.items():
            try:
                if hasattr(service, 'health_check'):
                    service_health = service.health_check()
                    health_data['services'][service_name] = service_health
                else:
                    health_data['services'][service_name] = {'status': 'unknown'}
            except Exception as e:
                health_data['services'][service_name] = {'status': 'unhealthy', 'error': str(e)}
                if health_data['overall_status'] == 'healthy':
                    health_data['overall_status'] = 'degraded'
        
        # Performance metrics
        health_data['performance'] = {
            'request_count_last_hour': redis_manager.get_counter('requests_last_hour', default=0),
            'error_rate_last_hour': redis_manager.get_counter('errors_last_hour', default=0),
            'avg_response_time_ms': redis_manager.get_avg_metric('response_time_ms', default=0)
        }
        
        log_admin_action('system_health_check', {'status': health_data['overall_status']})
        
        return jsonify(health_data)
        
    except Exception as e:
        logger.exception("Failed to get system health", error=str(e))
        return jsonify({'error': 'Failed to retrieve system health'}), 500


@admin_bp.route('/analytics/dashboard', methods=['GET'])
@require_admin_permission(['view_analytics'])
def analytics_dashboard():
    """Get analytics dashboard data."""
    try:
        days = min(int(request.args.get('days', 7)), 90)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Cache key for dashboard data
        cache_key = f"admin_dashboard:{days}:{start_date.strftime('%Y-%m-%d')}"
        cached = redis_manager.get(cache_key, prefix='admin')
        if cached:
            return jsonify(cached)
        
        dashboard_data = {
            'period': {'start': start_date.isoformat(), 'end': end_date.isoformat(), 'days': days},
            'entities': {},
            'usage': {},
            'performance': {},
            'errors': {},
            'top_searches': []
        }
        
        # Entity statistics
        for entity_type in ['restaurants', 'synagogues', 'mikvahs', 'stores']:
            try:
                stats = get_entity_analytics(entity_type, start_date, end_date)
                dashboard_data['entities'][entity_type] = stats
            except Exception as e:
                logger.warning(f"Failed to get {entity_type} analytics", error=str(e))
                dashboard_data['entities'][entity_type] = {'error': str(e)}
        
        # Usage statistics
        dashboard_data['usage'] = {
            'total_requests': get_metric_sum('api_requests', start_date, end_date),
            'unique_users': get_metric_count('unique_users', start_date, end_date),
            'search_requests': get_metric_sum('search_requests', start_date, end_date),
            'mobile_usage_percent': get_metric_avg('mobile_usage_percent', start_date, end_date)
        }
        
        # Performance statistics
        dashboard_data['performance'] = {
            'avg_response_time_ms': get_metric_avg('response_time_ms', start_date, end_date),
            'p95_response_time_ms': get_metric_percentile('response_time_ms', 95, start_date, end_date),
            'error_rate_percent': get_metric_avg('error_rate_percent', start_date, end_date),
            'cache_hit_rate_percent': get_metric_avg('cache_hit_rate_percent', start_date, end_date)
        }
        
        # Top searches
        dashboard_data['top_searches'] = get_top_searches(limit=10, days=days)
        
        # Cache dashboard data
        redis_manager.set(cache_key, dashboard_data, ttl=ANALYTICS_CONFIG['cache_ttl'], prefix='admin')
        
        log_admin_action('view_analytics_dashboard', {'period_days': days})
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.exception("Failed to get analytics dashboard", error=str(e))
        return jsonify({'error': 'Failed to retrieve analytics'}), 500


@admin_bp.route('/users', methods=['GET'])
@require_admin_permission(['manage_users'])
def get_users():
    """Get users with filtering and pagination."""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(int(request.args.get('per_page', 50)), 500)
        search = request.args.get('search', '').strip()
        role_filter = request.args.get('role')
        status_filter = request.args.get('status')
        
        filters = {}
        if search:
            filters['search'] = search
        if role_filter:
            filters['role'] = role_filter
        if status_filter:
            filters['status'] = status_filter
        
        # Get users from database (would implement in entity repository)
        users_result = get_users_paginated(filters, page, per_page)
        
        log_admin_action('list_users', {
            'filters': filters,
            'page': page,
            'per_page': per_page,
            'result_count': len(users_result['users'])
        })
        
        return jsonify(users_result)
        
    except Exception as e:
        logger.exception("Failed to get users", error=str(e))
        return jsonify({'error': 'Failed to retrieve users'}), 500


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@require_admin_permission(['manage_users'])
def get_user(user_id: int):
    """Get detailed user information."""
    try:
        # Get user details (would implement in entity repository)
        user_data = get_user_details(user_id)
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        log_admin_action('view_user_details', {'user_id': user_id})
        
        return jsonify(user_data)
        
    except Exception as e:
        logger.exception("Failed to get user", user_id=user_id, error=str(e))
        return jsonify({'error': 'Failed to retrieve user'}), 500


@admin_bp.route('/users/<int:user_id>/roles', methods=['PUT'])
@require_admin_permission(['manage_users'])
def update_user_roles(user_id: int):
    """Update user roles."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        new_roles = data.get('roles', [])
        
        if not isinstance(new_roles, list):
            return jsonify({'error': 'Roles must be a list'}), 400
        
        # Validate roles
        valid_roles = ['user', 'moderator', 'data_admin', 'system_admin', 'super_admin']
        invalid_roles = [role for role in new_roles if role not in valid_roles]
        if invalid_roles:
            return jsonify({'error': f'Invalid roles: {invalid_roles}'}), 400
        
        # Update user roles (would implement in entity repository)
        success = update_user_roles_in_db(user_id, new_roles)
        if not success:
            return jsonify({'error': 'Failed to update user roles'}), 400
        
        log_admin_action('update_user_roles', {
            'user_id': user_id,
            'new_roles': new_roles,
            'updated_by': g.user_id
        })
        
        return jsonify({'success': True, 'message': 'User roles updated successfully'})
        
    except Exception as e:
        logger.exception("Failed to update user roles", user_id=user_id, error=str(e))
        return jsonify({'error': 'Failed to update user roles'}), 500


@admin_bp.route('/bulk/<entity_type>/import', methods=['POST'])
@require_admin_permission(['bulk_operations'])
def bulk_import(entity_type: str):
    """Bulk import entities from CSV/JSON."""
    try:
        if entity_type not in services:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400
        
        # Determine file format
        file_format = request.form.get('format', 'csv').lower()
        if file_format not in ['csv', 'json']:
            return jsonify({'error': 'Unsupported file format'}), 400
        
        # Parse file content
        try:
            if file_format == 'csv':
                content = file.read().decode('utf-8')
                data = list(csv.DictReader(io.StringIO(content)))
            else:  # json
                data = json.load(file)
                
            if not isinstance(data, list):
                return jsonify({'error': 'Data must be an array of objects'}), 400
                
        except Exception as e:
            return jsonify({'error': f'Failed to parse file: {str(e)}'}), 400
        
        # Process bulk import
        service = services[entity_type]
        results = {'success': 0, 'failed': 0, 'errors': []}
        
        for i, item_data in enumerate(data[:ANALYTICS_CONFIG['max_export_records']]):
            try:
                # Create entity
                if entity_type == 'restaurants':
                    result = service.create_restaurant(item_data)
                elif entity_type == 'synagogues':
                    result = service.create_synagogue(item_data)
                elif entity_type == 'mikvahs':
                    result = service.create_mikvah(item_data)
                elif entity_type == 'stores':
                    result = service.create_store(item_data)
                
                if result:
                    results['success'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f'Row {i+1}: Failed to create entity')
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f'Row {i+1}: {str(e)}')
        
        log_admin_action('bulk_import', {
            'entity_type': entity_type,
            'file_format': file_format,
            'total_records': len(data),
            'success_count': results['success'],
            'failed_count': results['failed']
        })
        
        return jsonify({
            'message': f'Bulk import completed',
            'results': results,
            'entity_type': entity_type
        })
        
    except Exception as e:
        logger.exception("Failed to perform bulk import", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Bulk import failed'}), 500


@admin_bp.route('/bulk/<entity_type>/export', methods=['GET'])
@require_admin_permission(['bulk_operations'])
def bulk_export(entity_type: str):
    """Bulk export entities to CSV/JSON."""
    try:
        if entity_type not in services:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        export_format = request.args.get('format', 'json').lower()
        if export_format not in ANALYTICS_CONFIG['export_formats']:
            return jsonify({'error': 'Unsupported export format'}), 400
        
        # Get filters
        filters = {}
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('created_after'):
            filters['created_after'] = request.args.get('created_after')
        
        # Get entities
        service = services[entity_type]
        all_entities = []
        cursor = None
        
        # Fetch all entities with pagination
        while len(all_entities) < ANALYTICS_CONFIG['max_export_records']:
            if entity_type == 'restaurants':
                result = service.get_restaurants(filters, cursor, 1000, 'created_at_asc')
            elif entity_type == 'synagogues':
                result = service.get_synagogues(filters, cursor, 1000, 'created_at_asc')
            elif entity_type == 'mikvahs':
                result = service.get_mikvahs(filters, cursor, 1000, 'created_at_asc')
            elif entity_type == 'stores':
                result = service.get_stores(filters, cursor, 1000, 'created_at_asc')
            
            all_entities.extend(result['data'])
            
            if not result['pagination'].get('has_more'):
                break
                
            cursor = result['pagination'].get('next_cursor')
        
        # Format export data
        if export_format == 'json':
            response = jsonify(all_entities)
            response.headers['Content-Disposition'] = f'attachment; filename={entity_type}_export.json'
        elif export_format == 'csv':
            # Convert to CSV
            output = io.StringIO()
            if all_entities:
                writer = csv.DictWriter(output, fieldnames=all_entities[0].keys())
                writer.writeheader()
                writer.writerows(all_entities)
            
            response = Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename={entity_type}_export.csv'}
            )
        
        log_admin_action('bulk_export', {
            'entity_type': entity_type,
            'format': export_format,
            'record_count': len(all_entities),
            'filters': filters
        })
        
        return response
        
    except Exception as e:
        logger.exception("Failed to perform bulk export", entity_type=entity_type, error=str(e))
        return jsonify({'error': 'Bulk export failed'}), 500


@admin_bp.route('/feature-flags', methods=['GET'])
@require_admin_permission(['manage_feature_flags'])
def get_feature_flags():
    """Get all feature flags and their status."""
    try:
        flags = feature_flags.get_all_flags()
        
        log_admin_action('view_feature_flags', {'flag_count': len(flags)})
        
        return jsonify({
            'feature_flags': flags,
            'count': len(flags)
        })
        
    except Exception as e:
        logger.exception("Failed to get feature flags", error=str(e))
        return jsonify({'error': 'Failed to retrieve feature flags'}), 500


@admin_bp.route('/feature-flags/<flag_name>', methods=['PUT'])
@require_admin_permission(['manage_feature_flags'])
def update_feature_flag(flag_name: str):
    """Update a feature flag configuration."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Update feature flag
        success = feature_flags.update_flag(flag_name, data)
        if not success:
            return jsonify({'error': 'Failed to update feature flag'}), 400
        
        log_admin_action('update_feature_flag', {
            'flag_name': flag_name,
            'new_config': data
        })
        
        return jsonify({'success': True, 'message': 'Feature flag updated successfully'})
        
    except Exception as e:
        logger.exception("Failed to update feature flag", flag_name=flag_name, error=str(e))
        return jsonify({'error': 'Failed to update feature flag'}), 500


@admin_bp.route('/audit-log', methods=['GET'])
@require_admin_permission(['manage_system'])
def get_audit_log():
    """Get admin audit log entries."""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(int(request.args.get('per_page', 50)), 500)
        user_filter = request.args.get('user_id')
        action_filter = request.args.get('action')
        
        # Get audit log entries from Redis
        audit_entries = redis_manager.get_from_list('admin_audit_log', 
                                                   start=(page-1)*per_page,
                                                   end=page*per_page-1)
        
        # Apply filters
        if user_filter or action_filter:
            filtered_entries = []
            for entry in audit_entries:
                if user_filter and entry.get('user_id') != int(user_filter):
                    continue
                if action_filter and action_filter not in entry.get('action', ''):
                    continue
                filtered_entries.append(entry)
            audit_entries = filtered_entries
        
        total_entries = redis_manager.get_list_length('admin_audit_log')
        
        log_admin_action('view_audit_log', {
            'page': page,
            'per_page': per_page,
            'filters': {'user_id': user_filter, 'action': action_filter}
        })
        
        return jsonify({
            'audit_entries': audit_entries,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_entries,
                'has_more': (page * per_page) < total_entries
            }
        })
        
    except Exception as e:
        logger.exception("Failed to get audit log", error=str(e))
        return jsonify({'error': 'Failed to retrieve audit log'}), 500


# Helper functions (these would be implemented with actual database queries)
def get_entity_analytics(entity_type: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Get analytics for a specific entity type."""
    # Placeholder implementation
    return {
        'total_count': 0,
        'new_this_period': 0,
        'updated_this_period': 0,
        'active_count': 0,
        'growth_rate_percent': 0.0
    }


def get_metric_sum(metric_name: str, start_date: datetime, end_date: datetime) -> int:
    """Get sum of a metric over a time period."""
    # Placeholder implementation
    return 0


def get_metric_count(metric_name: str, start_date: datetime, end_date: datetime) -> int:
    """Get count of a metric over a time period."""
    # Placeholder implementation
    return 0


def get_metric_avg(metric_name: str, start_date: datetime, end_date: datetime) -> float:
    """Get average of a metric over a time period."""
    # Placeholder implementation
    return 0.0


def get_metric_percentile(metric_name: str, percentile: int, start_date: datetime, end_date: datetime) -> float:
    """Get percentile of a metric over a time period."""
    # Placeholder implementation
    return 0.0


def get_top_searches(limit: int = 10, days: int = 7) -> List[Dict[str, Any]]:
    """Get top search queries."""
    # Placeholder implementation
    return []


def get_users_paginated(filters: Dict[str, Any], page: int, per_page: int) -> Dict[str, Any]:
    """Get paginated users with filters."""
    # Placeholder implementation
    return {
        'users': [],
        'pagination': {'page': page, 'per_page': per_page, 'total': 0, 'has_more': False}
    }


def get_user_details(user_id: int) -> Optional[Dict[str, Any]]:
    """Get detailed user information."""
    # Placeholder implementation
    return None


def update_user_roles_in_db(user_id: int, roles: List[str]) -> bool:
    """Update user roles in database."""
    # Placeholder implementation
    return True


# Error handlers
@admin_bp.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Admin authentication required'}), 401


@admin_bp.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient admin permissions'}), 403


@admin_bp.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Admin API internal server error", error=str(error))
    return jsonify({'error': 'Admin service unavailable'}), 500
