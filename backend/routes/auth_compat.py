"""
Authentication compatibility routes.

Provides compatibility endpoints for frontend calls that don't use v5 prefixes.
"""

from flask import Blueprint, request, jsonify, redirect, url_for
from utils.logging_config import get_logger

logger = get_logger(__name__)

# Create auth compatibility blueprint
auth_compat_bp = Blueprint('auth_compat', __name__)

@auth_compat_bp.route('/auth/sync-user', methods=['GET'])
def sync_user_compat():
    """
    Compatibility endpoint that redirects to v5 auth sync-user.
    
    Frontend calls /api/auth/sync-user but actual endpoint is /api/v5/auth/sync-user.
    This provides a redirect for compatibility.
    """
    try:
        # Forward the request to the v5 endpoint
        import requests
        
        # Get the full URL for the v5 endpoint
        base_url = request.url_root.rstrip('/')
        v5_url = f"{base_url}/api/v5/auth/sync-user"
        
        # Forward cookies and headers
        headers = {
            'Cookie': request.headers.get('Cookie', ''),
            'User-Agent': request.headers.get('User-Agent', ''),
            'Accept': request.headers.get('Accept', 'application/json')
        }
        
        # Make request to v5 endpoint
        response = requests.get(v5_url, headers=headers, timeout=10)
        
        # Return the same response
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"Error in auth sync compatibility endpoint: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'user': None,
            'authenticated': False,
            'message': 'Auth sync service temporarily unavailable'
        }), 500
