"""
Security Audit API endpoints for monitoring and analysis.
Provides security metrics and audit log access for administrators.
"""

from datetime import datetime, timedelta
from flask import request, jsonify, g

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from middleware.auth_decorators import auth_required, rate_limit_by_user
from services.security_audit_service import get_security_audit_service, SecurityEventType
from utils.logging_config import get_logger
from utils.security import require_admin

logger = get_logger(__name__)

security_audit_bp = BlueprintFactoryV5.create_blueprint(
    'security_audit', __name__, '/api/v5/security',
    config_override={
        'enable_cors': False,  # Nginx handles CORS
    }
)


@security_audit_bp.route('/metrics', methods=['GET'])
@auth_required
@require_admin(min_level="admin")  # Require admin access
@rate_limit_by_user(max_requests=100, window_minutes=60)
def get_security_metrics():
    """Get security metrics for monitoring dashboard."""
    try:
        hours = int(request.args.get('hours', 24))
        hours = min(hours, 168)  # Max 7 days
        
        service = get_security_audit_service()
        metrics = service.get_security_metrics(hours)
        
        return jsonify({
            'success': True,
            'data': metrics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting security metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get security metrics',
            'code': 'SERVICE_ERROR'
        }), 500


@security_audit_bp.route('/alerts', methods=['GET'])
@auth_required
@require_admin(min_level="admin")  # Require admin access
@rate_limit_by_user(max_requests=50, window_minutes=60)
def get_security_alerts():
    """Get recent security alerts."""
    try:
        hours = int(request.args.get('hours', 24))
        hours = min(hours, 168)  # Max 7 days
        
        service = get_security_audit_service()
        alerts = service.get_security_alerts(hours)
        
        return jsonify({
            'success': True,
            'data': {
                'alerts': alerts,
                'period_hours': hours,
                'total_alerts': len(alerts)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting security alerts: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get security alerts',
            'code': 'SERVICE_ERROR'
        }), 500


@security_audit_bp.route('/user/<user_id>/summary', methods=['GET'])
@auth_required
@require_admin(min_level="admin")  # Require admin access
@rate_limit_by_user(max_requests=50, window_minutes=60)
def get_user_security_summary(user_id):
    """Get security summary for a specific user."""
    try:
        days = int(request.args.get('days', 30))
        days = min(days, 365)  # Max 1 year
        
        service = get_security_audit_service()
        summary = service.get_user_security_summary(user_id, days)
        
        return jsonify({
            'success': True,
            'data': summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user security summary: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get user security summary',
            'code': 'SERVICE_ERROR'
        }), 500


@security_audit_bp.route('/search', methods=['POST'])
@auth_required
@require_admin(min_level="admin")  # Require admin access
@rate_limit_by_user(max_requests=20, window_minutes=60)
def search_audit_logs():
    """Search audit logs with filters."""
    try:
        data = request.get_json(silent=True) or {}
        
        # Parse filters
        user_id = data.get('user_id')
        ip_address = data.get('ip_address')
        action = data.get('action')
        success = data.get('success')
        limit = min(int(data.get('limit', 100)), 1000)  # Max 1000 results
        
        # Parse date range
        start_date = None
        end_date = None
        
        if data.get('start_date'):
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        
        if data.get('end_date'):
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        
        service = get_security_audit_service()
        results = service.search_audit_logs(
            user_id=user_id,
            ip_address=ip_address,
            action=action,
            success=success,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'data': {
                'results': results,
                'total_results': len(results),
                'filters_applied': {
                    'user_id': user_id,
                    'ip_address': ip_address,
                    'action': action,
                    'success': success,
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None,
                    'limit': limit
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching audit logs: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to search audit logs',
            'code': 'SERVICE_ERROR'
        }), 500


@security_audit_bp.route('/cleanup', methods=['POST'])
@auth_required
@require_admin(min_level="system_admin")  # Require system admin
@rate_limit_by_user(max_requests=5, window_minutes=60)
def cleanup_old_logs():
    """Clean up old audit logs (admin only)."""
    try:
        service = get_security_audit_service()
        result = service.cleanup_old_logs()
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error cleaning up audit logs: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to clean up audit logs',
            'code': 'SERVICE_ERROR'
        }), 500


@security_audit_bp.route('/health', methods=['GET'])
def security_audit_health():
    """Health check for security audit service."""
    try:
        service = get_security_audit_service()
        
        # Test database connectivity
        with service.db_connection.session_scope() as session:
            result = session.execute(text("SELECT 1")).scalar()
            
        return jsonify({
            'success': True,
            'status': 'healthy',
            'service': 'security_audit',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Security audit health check failed: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'service': 'security_audit',
            'timestamp': datetime.utcnow().isoformat()
        }), 503


__all__ = ['security_audit_bp']
