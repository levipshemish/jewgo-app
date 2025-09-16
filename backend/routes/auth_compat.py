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
    Compatibility endpoint for frontend calls to /api/auth/sync-user.
    
    This duplicates the logic from the v5 endpoint to avoid dependency issues.
    """
    try:
        # Import the auth service
        from services.auth_service_v5 import AuthServiceV5
        from utils.auth_helpers import extract_token_from_request
        
        auth_service = AuthServiceV5()
        token = extract_token_from_request()
        
        if not token:
            return jsonify({
                'success': False,
                'user': None,
                'authenticated': False,
                'message': 'No authentication token provided'
            }), 200  # Return 200 for compatibility
        
        # Verify token and get user
        try:
            payload = auth_service.verify_token(token)
            if payload and payload.get('uid'):
                user_id = payload.get('uid')
                
                # Handle guest users
                if user_id.startswith('guest_'):
                    return jsonify({
                        'success': True,
                        'user': None,
                        'authenticated': False,
                        'guest': True,
                        'message': 'Guest user - no profile available'
                    }), 200
                
                # Get user profile
                profile = auth_service.get_user_profile(user_id)
                if profile:
                    return jsonify({
                        'success': True,
                        'user': profile,
                        'authenticated': True,
                        'message': 'User synchronized successfully'
                    }), 200
                else:
                    return jsonify({
                        'success': False,
                        'user': None,
                        'authenticated': False,
                        'message': 'User profile not found - please sign in again'
                    }), 200
            else:
                return jsonify({
                    'success': False,
                    'user': None,
                    'authenticated': False,
                    'message': 'Invalid authentication token'
                }), 200
        except Exception as e:
            logger.warning(f"Token verification failed in sync-user: {e}")
            return jsonify({
                'success': False,
                'user': None,
                'authenticated': False,
                'message': 'Authentication verification failed'
            }), 200
            
    except Exception as e:
        logger.error(f"Error in auth sync compatibility endpoint: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'user': None,
            'authenticated': False,
            'message': 'Auth sync service temporarily unavailable'
        }), 500
