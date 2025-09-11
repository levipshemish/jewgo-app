#!/usr/bin/env python3
"""V5 Feature Flags API routes.

Provides endpoints for managing and querying feature flags
with consistent patterns, authentication, and monitoring.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List
import json
from datetime import datetime
from functools import wraps
from utils.logging_config import get_logger
from middleware.auth_v5 import AuthV5Middleware
from middleware.rate_limit_v5 import RateLimitV5Middleware
from middleware.observability_v5 import ObservabilityV5Middleware
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)

# Create blueprint using the factory
feature_flags_bp = BlueprintFactoryV5.create_blueprint(
    'feature_flags_api',
    __name__,
    url_prefix='/api/v5/feature-flags',
    config_override={
        'enable_cors': True,
        'enable_auth': True,
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Feature flags are real-time
        'enable_observability': True,
        'enable_etag': False  # Feature flags are real-time
    }
)

# Global service instances
redis_manager = None
feature_flags = None


def init_services(redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global redis_manager, feature_flags
    
    redis_manager = redis_manager_instance
    feature_flags = feature_flags_instance


def require_feature_flags_permission():
    """Decorator to require feature flags management permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            required_permissions = ['manage_feature_flags', 'view_feature_flags']
            user_permissions = set(g.user_permissions)
            
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient permissions for feature flags access'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_feature_flag_event(event_type: str, flag_name: str, details: str = ''):
    """Log feature flag event for audit trail."""
    try:
        event_log = {
            'event_type': event_type,
            'flag_name': flag_name,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': getattr(g, 'user_id', None),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'correlation_id': getattr(g, 'correlation_id', None)
        }
        
        # Store in Redis for immediate access
        redis_manager.add_to_list('feature_flag_logs', event_log, max_length=10000)
        
        logger.info("Feature flag event logged", 
                   event_type=event_type, 
                   flag_name=flag_name,
                   details=details)
        
    except Exception as e:
        logger.exception("Failed to log feature flag event", event_type=event_type, flag_name=flag_name, error=str(e))


# Feature flags endpoints
@feature_flags_bp.route('/', methods=['GET'])
@require_feature_flags_permission()
def get_feature_flags():
    """Get all feature flags."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Get all feature flags
        flags = local_flags.get_all_flags()
        
        # Filter based on user permissions
        user_roles = getattr(g, 'user_roles', [])
        filtered_flags = {}
        
        for flag_name, flag_data in flags.items():
            # Check if user has permission to view this flag
            if local_flags.can_view_flag(flag_name, user_roles):
                filtered_flags[flag_name] = flag_data
        
        return jsonify({
            'success': True,
            'data': filtered_flags,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.exception("Failed to get feature flags", error=str(e))
        return jsonify({'error': 'Failed to get feature flags'}), 500


@feature_flags_bp.route('/<flag_name>', methods=['GET'])
@require_feature_flags_permission()
def get_feature_flag(flag_name: str):
    """Get specific feature flag."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check if flag exists
        if not local_flags.flag_exists(flag_name):
            return jsonify({'error': 'Feature flag not found'}), 404
        
        # Check if user has permission to view this flag
        user_roles = getattr(g, 'user_roles', [])
        if not local_flags.can_view_flag(flag_name, user_roles):
            return jsonify({'error': 'Insufficient permissions to view this flag'}), 403
        
        # Get flag data
        flag_data = local_flags.get_flag(flag_name)
        
        return jsonify({
            'success': True,
            'data': flag_data,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.exception("Failed to get feature flag", flag_name=flag_name, error=str(e))
        return jsonify({'error': 'Failed to get feature flag'}), 500


@feature_flags_bp.route('/<flag_name>', methods=['PUT'])
@require_feature_flags_permission()
def update_feature_flag(flag_name: str):
    """Update feature flag."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check if flag exists
        if not local_flags.flag_exists(flag_name):
            return jsonify({'error': 'Feature flag not found'}), 404
        
        # Check if user has permission to modify this flag
        user_roles = getattr(g, 'user_roles', [])
        if not local_flags.can_modify_flag(flag_name, user_roles):
            return jsonify({'error': 'Insufficient permissions to modify this flag'}), 403
        
        # Parse request body
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        
        # Validate required fields
        if 'enabled' not in data:
            return jsonify({'error': 'enabled field is required'}), 400
        
        # Update flag
        success = local_flags.set_flag(flag_name, data['enabled'], data.get('metadata', {}))
        
        if success:
            log_feature_flag_event('flag_updated', flag_name, f"Flag updated to {data['enabled']}")
            
            return jsonify({
                'success': True,
                'message': 'Feature flag updated successfully',
                'data': local_flags.get_flag(flag_name),
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to update feature flag'}), 500
        
    except Exception as e:
        logger.exception("Failed to update feature flag", flag_name=flag_name, error=str(e))
        return jsonify({'error': 'Failed to update feature flag'}), 500


@feature_flags_bp.route('/<flag_name>', methods=['DELETE'])
@require_feature_flags_permission()
def delete_feature_flag(flag_name: str):
    """Delete feature flag."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check if flag exists
        if not local_flags.flag_exists(flag_name):
            return jsonify({'error': 'Feature flag not found'}), 404
        
        # Check if user has permission to delete this flag
        user_roles = getattr(g, 'user_roles', [])
        if not local_flags.can_delete_flag(flag_name, user_roles):
            return jsonify({'error': 'Insufficient permissions to delete this flag'}), 403
        
        # Delete flag
        success = local_flags.delete_flag(flag_name)
        
        if success:
            log_feature_flag_event('flag_deleted', flag_name, 'Flag deleted')
            
            return jsonify({
                'success': True,
                'message': 'Feature flag deleted successfully',
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to delete feature flag'}), 500
        
    except Exception as e:
        logger.exception("Failed to delete feature flag", flag_name=flag_name, error=str(e))
        return jsonify({'error': 'Failed to delete feature flag'}), 500


@feature_flags_bp.route('/<flag_name>/toggle', methods=['POST'])
@require_feature_flags_permission()
def toggle_feature_flag(flag_name: str):
    """Toggle feature flag on/off."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check if flag exists
        if not local_flags.flag_exists(flag_name):
            return jsonify({'error': 'Feature flag not found'}), 404
        
        # Check if user has permission to modify this flag
        user_roles = getattr(g, 'user_roles', [])
        if not local_flags.can_modify_flag(flag_name, user_roles):
            return jsonify({'error': 'Insufficient permissions to modify this flag'}), 403
        
        # Get current flag state
        current_flag = local_flags.get_flag(flag_name)
        new_state = not current_flag.get('enabled', False)
        
        # Toggle flag
        success = local_flags.set_flag(flag_name, new_state, current_flag.get('metadata', {}))
        
        if success:
            log_feature_flag_event('flag_toggled', flag_name, f"Flag toggled to {new_state}")
            
            return jsonify({
                'success': True,
                'message': f'Feature flag toggled to {new_state}',
                'data': local_flags.get_flag(flag_name),
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to toggle feature flag'}), 500
        
    except Exception as e:
        logger.exception("Failed to toggle feature flag", flag_name=flag_name, error=str(e))
        return jsonify({'error': 'Failed to toggle feature flag'}), 500


@feature_flags_bp.route('/logs', methods=['GET'])
@require_feature_flags_permission()
def get_feature_flag_logs():
    """Get feature flag event logs."""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(int(request.args.get('per_page', 50)), 500)
        flag_name_filter = request.args.get('flag_name')
        event_type_filter = request.args.get('event_type')
        
        # Get logs from Redis
        start_index = (page - 1) * per_page
        end_index = start_index + per_page - 1
        
        all_logs = redis_manager.get_from_list('feature_flag_logs', start=0, end=10000)
        
        # Apply filters
        filtered_logs = []
        for log in all_logs:
            if flag_name_filter and log.get('flag_name') != flag_name_filter:
                continue
            if event_type_filter and log.get('event_type') != event_type_filter:
                continue
            filtered_logs.append(log)
        
        # Paginate
        total_logs = len(filtered_logs)
        paginated_logs = filtered_logs[start_index:end_index + 1]
        
        return jsonify({
            'logs': paginated_logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_logs,
                'has_more': (page * per_page) < total_logs
            },
            'filters': {
                'flag_name': flag_name_filter,
                'event_type': event_type_filter
            }
        })
        
    except Exception as e:
        logger.exception("Failed to get feature flag logs", error=str(e))
        return jsonify({'error': 'Failed to get feature flag logs'}), 500


# Error handlers
@feature_flags_bp.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@feature_flags_bp.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@feature_flags_bp.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@feature_flags_bp.errorhandler(404)
def not_found(error):
    """Handle not found errors."""
    return jsonify({'error': 'Feature flag not found'}), 404


@feature_flags_bp.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Feature flags API internal server error", error=str(error))
    return jsonify({'error': 'Feature flags service unavailable'}), 500