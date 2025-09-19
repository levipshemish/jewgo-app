#!/usr/bin/env python3
"""
Webhook API routes with signature verification.
Handles secure webhook endpoints for external integrations.
"""

from flask import request, jsonify
from typing import Dict, Any
import json
from utils.logging_config import get_logger
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from services.webhook_signature_service import require_webhook_signature, webhook_signature_service

logger = get_logger(__name__)

# Create blueprint using the factory
webhook_api = BlueprintFactoryV5.create_blueprint(
    'webhook_api',
    __name__,
    url_prefix='/api/v5/webhook',
    config_override={
        'enable_cors': False,  # Disabled - Nginx handles CORS
        'enable_auth': False,  # Webhooks use signature verification instead
        'enable_rate_limiting': True,
        'enable_idempotency': True,  # Webhooks should be idempotent
        'enable_observability': True,
        'enable_etag': False,  # Webhooks are real-time
        'bypass_csrf': True  # Webhooks bypass CSRF protection
    }
)


@webhook_api.route('/deploy', methods=['POST'])
@require_webhook_signature
def webhook_deploy():
    """
    Handle deployment webhook with signature verification.
    This endpoint is called by external CI/CD systems.
    """
    try:
        payload = request.get_json()
        
        logger.info(
            "Deployment webhook received",
            extra={
                'webhook_type': 'deploy',
                'payload_keys': list(payload.keys()) if payload else [],
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent')
            }
        )
        
        # Process deployment webhook
        result = process_deployment_webhook(payload)
        
        return jsonify({
            'status': 'success',
            'message': 'Deployment webhook processed',
            'data': result
        })
        
    except Exception as e:
        logger.exception("Deployment webhook processing failed", error=str(e))
        return jsonify({
            'status': 'error',
            'message': 'Webhook processing failed'
        }), 500


@webhook_api.route('/github', methods=['POST'])
@require_webhook_signature
def webhook_github():
    """
    Handle GitHub webhook with signature verification.
    This endpoint is called by GitHub for repository events.
    """
    try:
        payload = request.get_json()
        event_type = request.headers.get('X-GitHub-Event')
        
        logger.info(
            "GitHub webhook received",
            extra={
                'webhook_type': 'github',
                'event_type': event_type,
                'payload_keys': list(payload.keys()) if payload else [],
                'ip': request.remote_addr
            }
        )
        
        # Process GitHub webhook based on event type
        result = process_github_webhook(payload, event_type)
        
        return jsonify({
            'status': 'success',
            'message': f'GitHub {event_type} webhook processed',
            'data': result
        })
        
    except Exception as e:
        logger.exception("GitHub webhook processing failed", error=str(e))
        return jsonify({
            'status': 'error',
            'message': 'GitHub webhook processing failed'
        }), 500


@webhook_api.route('/status', methods=['GET'])
def webhook_status():
    """
    Public webhook status endpoint for health checks.
    This endpoint does not require signature verification.
    """
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'webhook-api',
            'version': '1.0.0',
            'endpoints': {
                'deploy': '/api/v5/webhook/deploy',
                'github': '/api/v5/webhook/github',
                'status': '/api/v5/webhook/status'
            },
            'signature_verification': 'enabled'
        })
        
    except Exception as e:
        logger.exception("Webhook status check failed", error=str(e))
        return jsonify({
            'status': 'error',
            'message': 'Status check failed'
        }), 500


def process_deployment_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process deployment webhook payload.
    
    Args:
        payload: Webhook payload data
        
    Returns:
        Dict[str, Any]: Processing result
    """
    # Extract relevant information from payload
    repository = payload.get('repository', {}).get('name', 'unknown')
    branch = payload.get('ref', 'unknown').replace('refs/heads/', '')
    commit_sha = payload.get('head_commit', {}).get('id', 'unknown')
    
    logger.info(
        "Processing deployment webhook",
        extra={
            'repository': repository,
            'branch': branch,
            'commit_sha': commit_sha[:8] if commit_sha != 'unknown' else 'unknown'
        }
    )
    
    # Here you would implement your deployment logic
    # For example:
    # - Trigger CI/CD pipeline
    # - Update application configuration
    # - Send notifications
    
    return {
        'repository': repository,
        'branch': branch,
        'commit_sha': commit_sha,
        'processed_at': '2025-01-19T20:00:00Z',
        'status': 'processed'
    }


def process_github_webhook(payload: Dict[str, Any], event_type: str) -> Dict[str, Any]:
    """
    Process GitHub webhook payload based on event type.
    
    Args:
        payload: Webhook payload data
        event_type: GitHub event type (push, pull_request, etc.)
        
    Returns:
        Dict[str, Any]: Processing result
    """
    repository = payload.get('repository', {}).get('name', 'unknown')
    
    logger.info(
        f"Processing GitHub {event_type} webhook",
        extra={
            'repository': repository,
            'event_type': event_type
        }
    )
    
    # Handle different GitHub event types
    if event_type == 'push':
        return process_push_event(payload)
    elif event_type == 'pull_request':
        return process_pull_request_event(payload)
    elif event_type == 'issues':
        return process_issues_event(payload)
    else:
        return {
            'event_type': event_type,
            'repository': repository,
            'status': 'acknowledged',
            'message': f'Event type {event_type} acknowledged but not processed'
        }


def process_push_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process GitHub push event."""
    repository = payload.get('repository', {}).get('name', 'unknown')
    branch = payload.get('ref', 'unknown').replace('refs/heads/', '')
    commits = payload.get('commits', [])
    
    return {
        'event_type': 'push',
        'repository': repository,
        'branch': branch,
        'commit_count': len(commits),
        'status': 'processed'
    }


def process_pull_request_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process GitHub pull request event."""
    repository = payload.get('repository', {}).get('name', 'unknown')
    pr_number = payload.get('number', 'unknown')
    action = payload.get('action', 'unknown')
    
    return {
        'event_type': 'pull_request',
        'repository': repository,
        'pr_number': pr_number,
        'action': action,
        'status': 'processed'
    }


def process_issues_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process GitHub issues event."""
    repository = payload.get('repository', {}).get('name', 'unknown')
    issue_number = payload.get('issue', {}).get('number', 'unknown')
    action = payload.get('action', 'unknown')
    
    return {
        'event_type': 'issues',
        'repository': repository,
        'issue_number': issue_number,
        'action': action,
        'status': 'processed'
    }