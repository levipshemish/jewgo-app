#!/usr/bin/env python3
"""
Simple health check endpoints for basic monitoring.
"""

from flask import Blueprint, jsonify
from datetime import datetime

simple_health_bp = Blueprint('simple_health', __name__)


@simple_health_bp.route('/healthz', methods=['GET'])
def healthz():
    """
    Simple health check - just verify the process is up.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'jewgo-backend',
        'version': '1.0.0'
    }), 200


@simple_health_bp.route('/readyz', methods=['GET'])
def readyz():
    """
    Simple readiness check.
    """
    return jsonify({
        'status': 'ready',
        'timestamp': datetime.utcnow().isoformat()
    }), 200
