#!/usr/bin/env python3
"""
Simple webhook API for testing.
"""

from flask import Blueprint, jsonify

# Create simple blueprint
simple_webhook_api = Blueprint('simple_webhook_api', __name__, url_prefix='/api/v5/webhook')

@simple_webhook_api.route('/status', methods=['GET'])
def webhook_status():
    """Simple webhook status endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'webhook-api',
        'version': '1.0.0',
        'endpoints': {
            'status': '/api/v5/webhook/status'
        }
    })

@simple_webhook_api.route('/test', methods=['GET'])
def webhook_test():
    """Simple webhook test endpoint."""
    return jsonify({
        'message': 'Webhook API is working!',
        'timestamp': '2025-01-19T20:00:00Z'
    })