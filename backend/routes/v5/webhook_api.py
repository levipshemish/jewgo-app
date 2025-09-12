#!/usr/bin/env python3
"""Consolidated v5 webhook API routes.

This route file consolidates all webhook functionality including deployment webhooks,
testing endpoints, status monitoring, and webhook management.
Replaces: deploy_webhook.py, test_webhook.py, webhook_status_api.py
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional, List, Union
import json
import hmac
import hashlib
import subprocess
import os
from datetime import datetime, timedelta
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
webhook_bp = BlueprintFactoryV5.create_blueprint(
    'webhook_api',
    __name__,
    url_prefix='/api/v5/webhooks',
    config_override={
        'enable_cors': False,  # Disabled - Nginx handles CORS
        'enable_health_check': False,  # Disable default health check, we'll add our own
        'auth_required': False,  # Webhooks use signature verification instead
        'enable_signature_verification': True,
        'enable_rate_limiting': True,
        'enable_idempotency': False,  # Webhooks are inherently idempotent
        'enable_observability': True,
        'enable_etag': False  # Webhook data is real-time
    }
)

# Global service instances
redis_manager = None
feature_flags = None

# Webhook configuration
WEBHOOK_CONFIG = {
    'github': {
        'secret_key': os.getenv('GITHUB_WEBHOOK_SECRET'),
        'allowed_events': ['push', 'pull_request', 'deployment'],
        'signature_header': 'X-Hub-Signature-256'
    },
    'deployment': {
        'auto_deploy': os.getenv('AUTO_DEPLOY', 'false').lower() == 'true',
        'deploy_script': os.getenv('DEPLOY_SCRIPT', './scripts/deploy.sh'),
        'rollback_script': os.getenv('ROLLBACK_SCRIPT', './scripts/rollback.sh'),
        'health_check_url': os.getenv('HEALTH_CHECK_URL', '/api/v5/monitoring/health')
    },
    'security': {
        'max_payload_size': 1024 * 1024,  # 1MB
        'rate_limit_per_minute': 10,
        'ip_whitelist': os.getenv('WEBHOOK_IP_WHITELIST', '').split(',') if os.getenv('WEBHOOK_IP_WHITELIST') else []
    }
}


def init_services(redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global redis_manager, feature_flags
    
    redis_manager = redis_manager_instance
    feature_flags = feature_flags_instance


def require_webhook_permission():
    """Decorator to require webhook management permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            required_permissions = ['manage_webhooks', 'deploy_application', 'view_webhooks']
            user_permissions = set(g.user_permissions)
            
            if not any(perm in user_permissions for perm in required_permissions):
                return jsonify({'error': 'Insufficient permissions for webhook access'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def verify_github_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature."""
    if not WEBHOOK_CONFIG['github']['secret_key']:
        logger.warning("GitHub webhook secret not configured")
        return False
    
    expected_signature = 'sha256=' + hmac.new(
        WEBHOOK_CONFIG['github']['secret_key'].encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


def verify_ip_whitelist(remote_addr: str) -> bool:
    """Verify if IP is in whitelist."""
    if not WEBHOOK_CONFIG['security']['ip_whitelist']:
        return True  # No whitelist configured
    
    return remote_addr in WEBHOOK_CONFIG['security']['ip_whitelist']


def log_webhook_event(event_type: str, payload: Dict[str, Any], status: str, details: str = ''):
    """Log webhook event for audit trail."""
    try:
        webhook_log = {
            'event_type': event_type,
            'status': status,
            'details': details,
            'payload_size': len(json.dumps(payload)),
            'timestamp': datetime.utcnow().isoformat(),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'correlation_id': getattr(g, 'correlation_id', None)
        }
        
        # Store in Redis for immediate access
        redis_manager.add_to_list('webhook_logs', webhook_log, max_length=10000)
        
        logger.info("Webhook event logged", 
                   event_type=event_type, 
                   status=status,
                   details=details)
        
    except Exception as e:
        logger.exception("Failed to log webhook event", event_type=event_type, error=str(e))


def execute_deployment(deployment_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute deployment process."""
    try:
        deployment_id = f"deploy_{int(datetime.utcnow().timestamp())}"
        
        # Log deployment start
        log_webhook_event('deployment_start', payload, 'started', f"Deployment {deployment_id} started")
        
        # Check if auto-deploy is enabled
        if not WEBHOOK_CONFIG['deployment']['auto_deploy']:
            return {
                'success': False,
                'message': 'Auto-deploy is disabled',
                'deployment_id': deployment_id
            }
        
        # Execute deployment script
        deploy_script = WEBHOOK_CONFIG['deployment']['deploy_script']
        if not os.path.exists(deploy_script):
            return {
                'success': False,
                'message': f'Deploy script not found: {deploy_script}',
                'deployment_id': deployment_id
            }
        
        # Run deployment
        result = subprocess.run(
            [deploy_script],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            # Deployment successful
            log_webhook_event('deployment_success', payload, 'completed', f"Deployment {deployment_id} completed successfully")
            
            return {
                'success': True,
                'message': 'Deployment completed successfully',
                'deployment_id': deployment_id,
                'output': result.stdout,
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            # Deployment failed
            log_webhook_event('deployment_failure', payload, 'failed', f"Deployment {deployment_id} failed: {result.stderr}")
            
            return {
                'success': False,
                'message': 'Deployment failed',
                'deployment_id': deployment_id,
                'error': result.stderr,
                'output': result.stdout,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except subprocess.TimeoutExpired:
        log_webhook_event('deployment_timeout', payload, 'timeout', f"Deployment {deployment_id} timed out")
        return {
            'success': False,
            'message': 'Deployment timed out',
            'deployment_id': deployment_id
        }
    except Exception as e:
        log_webhook_event('deployment_error', payload, 'error', f"Deployment {deployment_id} error: {str(e)}")
        return {
            'success': False,
            'message': f'Deployment error: {str(e)}',
            'deployment_id': deployment_id
        }


def perform_health_check() -> Dict[str, Any]:
    """Perform health check after deployment."""
    try:
        health_check_url = WEBHOOK_CONFIG['deployment']['health_check_url']
        
        # This would be a real HTTP request in production
        # For now, return a mock response
        return {
            'success': True,
            'status': 'healthy',
            'response_time_ms': 150,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Webhook endpoints
@webhook_bp.route('/github', methods=['POST'])
def github_webhook():
    """Handle GitHub webhook events."""
    try:
        # Fallback for feature flags
        local_flags = feature_flags or FeatureFlagsV5()
        
        # Check feature flag
        user_id = getattr(g, 'user_id', None)
        user_roles = [role.get('role') for role in getattr(g, 'user_roles', []) if role.get('role')]
        
        if not local_flags.is_enabled('webhook_api_v5', user_id=user_id, user_roles=user_roles):
            return jsonify({
                'success': False,
                'error': 'Webhook API v5 is not enabled for your account'
            }), 503
        
        # Verify IP whitelist
        if not verify_ip_whitelist(request.remote_addr):
            log_webhook_event('github_webhook', {}, 'rejected', 'IP not in whitelist')
            return jsonify({'error': 'IP not authorized'}), 403
        
        # Get signature
        signature = request.headers.get(WEBHOOK_CONFIG['github']['signature_header'])
        if not signature:
            log_webhook_event('github_webhook', {}, 'rejected', 'Missing signature')
            return jsonify({'error': 'Missing signature'}), 400
        
        # Get payload
        payload = request.get_data()
        if len(payload) > WEBHOOK_CONFIG['security']['max_payload_size']:
            log_webhook_event('github_webhook', {}, 'rejected', 'Payload too large')
            return jsonify({'error': 'Payload too large'}), 413
        
        # Verify signature
        if not verify_github_signature(payload, signature):
            log_webhook_event('github_webhook', {}, 'rejected', 'Invalid signature')
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Parse payload
        try:
            payload_data = json.loads(payload.decode('utf-8'))
        except json.JSONDecodeError:
            log_webhook_event('github_webhook', {}, 'rejected', 'Invalid JSON payload')
            return jsonify({'error': 'Invalid JSON payload'}), 400
        
        # Get event type
        event_type = request.headers.get('X-GitHub-Event')
        if not event_type:
            log_webhook_event('github_webhook', payload_data, 'rejected', 'Missing event type')
            return jsonify({'error': 'Missing event type'}), 400
        
        # Check if event type is allowed
        if event_type not in WEBHOOK_CONFIG['github']['allowed_events']:
            log_webhook_event('github_webhook', payload_data, 'rejected', f'Event type not allowed: {event_type}')
            return jsonify({'error': f'Event type not allowed: {event_type}'}), 400
        
        # Handle different event types
        if event_type == 'push':
            # Handle push event
            branch = payload_data.get('ref', '').replace('refs/heads/', '')
            if branch == 'main' or branch == 'master':
                # Trigger deployment for main branch
                deployment_result = execute_deployment('push', payload_data)
                
                if deployment_result['success']:
                    log_webhook_event('github_webhook', payload_data, 'processed', f'Push to {branch} triggered deployment')
                    return jsonify({
                        'message': 'Webhook processed successfully',
                        'deployment': deployment_result
                    })
                else:
                    log_webhook_event('github_webhook', payload_data, 'failed', f'Deployment failed: {deployment_result["message"]}')
                    return jsonify({
                        'message': 'Webhook processed but deployment failed',
                        'deployment': deployment_result
                    }), 500
            else:
                log_webhook_event('github_webhook', payload_data, 'ignored', f'Push to non-main branch: {branch}')
                return jsonify({'message': 'Webhook received but no action taken'})
        
        elif event_type == 'pull_request':
            # Handle pull request event
            action = payload_data.get('action')
            if action in ['opened', 'synchronize']:
                log_webhook_event('github_webhook', payload_data, 'processed', f'Pull request {action}')
                return jsonify({'message': 'Pull request webhook processed'})
            else:
                log_webhook_event('github_webhook', payload_data, 'ignored', f'Pull request action ignored: {action}')
                return jsonify({'message': 'Webhook received but no action taken'})
        
        elif event_type == 'deployment':
            # Handle deployment event
            deployment_result = execute_deployment('deployment', payload_data)
            
            if deployment_result['success']:
                log_webhook_event('github_webhook', payload_data, 'processed', 'Deployment webhook processed')
                return jsonify({
                    'message': 'Deployment webhook processed successfully',
                    'deployment': deployment_result
                })
            else:
                log_webhook_event('github_webhook', payload_data, 'failed', f'Deployment failed: {deployment_result["message"]}')
                return jsonify({
                    'message': 'Deployment webhook processed but deployment failed',
                    'deployment': deployment_result
                }), 500
        
        else:
            log_webhook_event('github_webhook', payload_data, 'ignored', f'Event type ignored: {event_type}')
            return jsonify({'message': 'Webhook received but no action taken'})
        
    except Exception as e:
        logger.exception("GitHub webhook processing failed", error=str(e))
        log_webhook_event('github_webhook', {}, 'error', f'Processing error: {str(e)}')
        return jsonify({'error': 'Webhook processing failed'}), 500


@webhook_bp.route('/test', methods=['POST'])
@require_webhook_permission()
def test_webhook():
    """Test webhook endpoint for validation."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        test_type = data.get('type', 'basic')
        
        if test_type == 'basic':
            # Basic connectivity test
            log_webhook_event('test_webhook', data, 'success', 'Basic connectivity test')
            return jsonify({
                'message': 'Webhook test successful',
                'timestamp': datetime.utcnow().isoformat(),
                'test_type': 'basic'
            })
        
        elif test_type == 'deployment':
            # Test deployment process
            deployment_result = execute_deployment('test', data)
            log_webhook_event('test_webhook', data, 'success' if deployment_result['success'] else 'failed', f'Deployment test: {deployment_result["message"]}')
            
            return jsonify({
                'message': 'Deployment test completed',
                'deployment': deployment_result,
                'timestamp': datetime.utcnow().isoformat()
            })
        
        elif test_type == 'health_check':
            # Test health check
            health_result = perform_health_check()
            log_webhook_event('test_webhook', data, 'success' if health_result['success'] else 'failed', f'Health check test: {health_result.get("error", "success")}')
            
            return jsonify({
                'message': 'Health check test completed',
                'health_check': health_result,
                'timestamp': datetime.utcnow().isoformat()
            })
        
        else:
            return jsonify({'error': 'Invalid test type'}), 400
        
    except Exception as e:
        logger.exception("Webhook test failed", error=str(e))
        log_webhook_event('test_webhook', {}, 'error', f'Test error: {str(e)}')
        return jsonify({'error': 'Webhook test failed'}), 500


@webhook_bp.route('/status', methods=['GET'])
@require_webhook_permission()
def webhook_status():
    """Get webhook status and configuration."""
    try:
        status_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'configuration': {
                'github_webhook_configured': bool(WEBHOOK_CONFIG['github']['secret_key']),
                'auto_deploy_enabled': WEBHOOK_CONFIG['deployment']['auto_deploy'],
                'allowed_events': WEBHOOK_CONFIG['github']['allowed_events'],
                'ip_whitelist_configured': bool(WEBHOOK_CONFIG['security']['ip_whitelist'])
            },
            'recent_events': [],
            'deployment_status': {
                'last_deployment': None,
                'deployment_count_today': 0
            }
        }
        
        # Get recent webhook events
        recent_events = redis_manager.get_from_list('webhook_logs', start=0, end=10)
        status_data['recent_events'] = recent_events
        
        # Get deployment statistics
        today = datetime.utcnow().date()
        deployment_count = 0
        last_deployment = None
        
        for event in recent_events:
            if event.get('event_type') in ['deployment_start', 'deployment_success', 'deployment_failure']:
                event_date = datetime.fromisoformat(event['timestamp']).date()
                if event_date == today:
                    deployment_count += 1
                if not last_deployment or event['timestamp'] > last_deployment:
                    last_deployment = event['timestamp']
        
        status_data['deployment_status']['deployment_count_today'] = deployment_count
        status_data['deployment_status']['last_deployment'] = last_deployment
        
        return jsonify(status_data)
        
    except Exception as e:
        logger.exception("Failed to get webhook status", error=str(e))
        return jsonify({'error': 'Failed to get webhook status'}), 500


@webhook_bp.route('/logs', methods=['GET'])
@require_webhook_permission()
def webhook_logs():
    """Get webhook event logs."""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(int(request.args.get('per_page', 50)), 500)
        event_type_filter = request.args.get('event_type')
        status_filter = request.args.get('status')
        
        # Get logs from Redis
        start_index = (page - 1) * per_page
        end_index = start_index + per_page - 1
        
        all_logs = redis_manager.get_from_list('webhook_logs', start=0, end=10000)
        
        # Apply filters
        filtered_logs = []
        for log in all_logs:
            if event_type_filter and log.get('event_type') != event_type_filter:
                continue
            if status_filter and log.get('status') != status_filter:
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
                'event_type': event_type_filter,
                'status': status_filter
            }
        })
        
    except Exception as e:
        logger.exception("Failed to get webhook logs", error=str(e))
        return jsonify({'error': 'Failed to get webhook logs'}), 500


@webhook_bp.route('/deploy', methods=['POST'])
@require_webhook_permission()
def manual_deploy():
    """Trigger manual deployment."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        deployment_type = data.get('type', 'manual')
        
        # Execute deployment
        deployment_result = execute_deployment(deployment_type, data)
        
        if deployment_result['success']:
            return jsonify({
                'message': 'Manual deployment completed successfully',
                'deployment': deployment_result
            })
        else:
            return jsonify({
                'message': 'Manual deployment failed',
                'deployment': deployment_result
            }), 500
        
    except Exception as e:
        logger.exception("Manual deployment failed", error=str(e))
        return jsonify({'error': 'Manual deployment failed'}), 500


@webhook_bp.route('/rollback', methods=['POST'])
@require_webhook_permission()
def rollback_deployment():
    """Rollback to previous deployment."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        rollback_to = data.get('rollback_to', 'previous')
        
        # Execute rollback
        rollback_script = WEBHOOK_CONFIG['deployment']['rollback_script']
        if not os.path.exists(rollback_script):
            return jsonify({'error': f'Rollback script not found: {rollback_script}'}), 500
        
        result = subprocess.run(
            [rollback_script, rollback_to],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            log_webhook_event('rollback', data, 'success', f'Rollback to {rollback_to} completed')
            return jsonify({
                'message': 'Rollback completed successfully',
                'rollback_to': rollback_to,
                'output': result.stdout,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            log_webhook_event('rollback', data, 'failed', f'Rollback to {rollback_to} failed: {result.stderr}')
            return jsonify({
                'message': 'Rollback failed',
                'rollback_to': rollback_to,
                'error': result.stderr,
                'output': result.stdout,
                'timestamp': datetime.utcnow().isoformat()
            }), 500
        
    except subprocess.TimeoutExpired:
        log_webhook_event('rollback', {}, 'timeout', 'Rollback timed out')
        return jsonify({'error': 'Rollback timed out'}), 500
    except Exception as e:
        logger.exception("Rollback failed", error=str(e))
        log_webhook_event('rollback', {}, 'error', f'Rollback error: {str(e)}')
        return jsonify({'error': 'Rollback failed'}), 500


# Health check endpoint
@webhook_bp.route('/health', methods=['GET'])
def webhook_health_check():
    """Health check for webhook API."""
    try:
        return jsonify({
            'blueprint': 'webhook_api',
            'status': 'healthy',
            'version': 'v5',
            'timestamp': datetime.utcnow().timestamp(),
            'correlation_id': getattr(g, 'correlation_id', None)
        })
    except Exception as e:
        logger.exception("Webhook health check failed", error=str(e))
        return jsonify({
            'blueprint': 'webhook_api',
            'status': 'unhealthy',
            'version': 'v5',
            'error': str(e),
            'timestamp': datetime.utcnow().timestamp(),
            'correlation_id': getattr(g, 'correlation_id', None)
        }), 500


# Error handlers
@webhook_bp.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@webhook_bp.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@webhook_bp.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@webhook_bp.errorhandler(413)
def payload_too_large(error):
    """Handle payload too large errors."""
    return jsonify({'error': 'Payload too large'}), 413


@webhook_bp.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Webhook API internal server error", error=str(error))
    return jsonify({'error': 'Webhook service unavailable'}), 500
