#!/usr/bin/env python3
"""Minimal feature flags API for v5 to satisfy frontend usage.

Exposes read-only endpoints for client feature flag checks.
"""

from flask import jsonify, request
from utils.blueprint_factory_v5 import BlueprintFactoryV5

feature_flags_bp = BlueprintFactoryV5.create_blueprint(
    'feature_flags_api', __name__, url_prefix='/api/v5/feature-flags', config_override={
        'enable_etag': False,
        'auth_required': False,
    }
)

@feature_flags_bp.route('/', methods=['GET'])
def list_flags():
    # Minimal static flags; extend with real provider if needed
    flags = {
        'entity_api_v5': True,
        'search_api_v5': True,
        'admin_api_v5': True,
    }
    return jsonify({'success': True, 'data': flags})

@feature_flags_bp.route('/<flag_name>', methods=['GET'])
def get_flag(flag_name: str):
    default = request.args.get('default', 'false').lower() == 'true'
    enabled = flag_name in {'entity_api_v5', 'search_api_v5', 'admin_api_v5'} or default
    return jsonify({'success': True, 'data': {'name': flag_name, 'enabled': enabled}})

__all__ = ['feature_flags_bp']

