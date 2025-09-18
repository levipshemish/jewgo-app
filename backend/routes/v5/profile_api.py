"""
Profile API routes for user profile management.
Handles profile creation, username management, and OAuth account linking.
"""

import os
from flask import request, jsonify, g
from utils.blueprint_factory_v5 import BlueprintFactoryV5
from middleware.auth_decorators import auth_required, rate_limit_by_user
from services.profile_service import ProfileService, ProfileError
from services.oauth_service_v5 import OAuthService
from utils.logging_config import get_logger

logger = get_logger(__name__)

profile_bp = BlueprintFactoryV5.create_blueprint(
    'profile', __name__, '/api/v5/profile',
    config_override={
        'enable_cors': False,
    }
)

def _get_profile_service():
    """Get profile service instance."""
    return ProfileService()

def _get_oauth_service():
    """Get OAuth service instance."""
    return OAuthService()

@profile_bp.route('/me', methods=['GET'])
@auth_required
@rate_limit_by_user(max_requests=100, window_minutes=60)
def get_my_profile():
    """Get current user's profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        profile_service = _get_profile_service()
        profile = profile_service.get_profile(user_id)
        
        return jsonify({
            'success': True,
            'profile': profile,
            'has_profile': profile is not None
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting profile for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to get profile',
            'code': 'PROFILE_GET_ERROR'
        }), 500

@profile_bp.route('/create', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=10, window_minutes=60)
def create_profile():
    """Create a new profile for the current user."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required',
                'code': 'MISSING_DATA'
            }), 400

        username = data.get('username', '').strip()
        display_name = data.get('display_name', '').strip()

        if not username:
            return jsonify({
                'success': False,
                'error': 'Username is required',
                'code': 'MISSING_USERNAME'
            }), 400

        if not display_name:
            return jsonify({
                'success': False,
                'error': 'Display name is required',
                'code': 'MISSING_DISPLAY_NAME'
            }), 400

        profile_service = _get_profile_service()
        
        # Check if profile already exists
        if profile_service.has_profile(user_id):
            return jsonify({
                'success': False,
                'error': 'Profile already exists for this user',
                'code': 'PROFILE_EXISTS'
            }), 400

        # Create profile
        profile = profile_service.create_profile(
            user_id=user_id,
            username=username,
            display_name=display_name,
            bio=data.get('bio'),
            location=data.get('location'),
            website=data.get('website'),
            phone=data.get('phone'),
            avatar_url=data.get('avatar_url')
        )
        
        logger.info(f"Created profile for user {user_id} with username {username}")
        return jsonify({
            'success': True,
            'profile': profile,
            'message': 'Profile created successfully'
        }), 201
        
    except ProfileError as e:
        logger.warning(f"Profile creation failed for user {getattr(g, 'user_id', 'unknown')}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'PROFILE_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error creating profile for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to create profile',
            'code': 'PROFILE_CREATE_ERROR'
        }), 500

@profile_bp.route('/update', methods=['PUT'])
@auth_required
@rate_limit_by_user(max_requests=20, window_minutes=60)
def update_profile():
    """Update current user's profile."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required',
                'code': 'MISSING_DATA'
            }), 400

        profile_service = _get_profile_service()
        
        # Check if profile exists
        if not profile_service.has_profile(user_id):
            return jsonify({
                'success': False,
                'error': 'Profile not found. Create a profile first.',
                'code': 'PROFILE_NOT_FOUND'
            }), 404

        # Update profile
        success = profile_service.update_profile(user_id, data)
        
        if success:
            updated_profile = profile_service.get_profile(user_id)
            logger.info(f"Updated profile for user {user_id}")
            return jsonify({
                'success': True,
                'profile': updated_profile,
                'message': 'Profile updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Profile not found',
                'code': 'PROFILE_NOT_FOUND'
            }), 404
        
    except ProfileError as e:
        logger.warning(f"Profile update failed for user {getattr(g, 'user_id', 'unknown')}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'PROFILE_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error updating profile for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to update profile',
            'code': 'PROFILE_UPDATE_ERROR'
        }), 500

@profile_bp.route('/username/check', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=50, window_minutes=60)
def check_username():
    """Check if a username is available and valid."""
    try:
        data = request.get_json()
        if not data or 'username' not in data:
            return jsonify({
                'success': False,
                'error': 'Username is required',
                'code': 'MISSING_USERNAME'
            }), 400

        username = data['username'].strip()
        profile_service = _get_profile_service()
        
        user_id = getattr(g, 'user_id', None)
        
        is_valid = profile_service.is_username_valid(username)
        is_available = profile_service.is_username_available(username, exclude_user_id=user_id)
        
        return jsonify({
            'success': True,
            'username': username,
            'is_valid': is_valid,
            'is_available': is_available,
            'can_use': is_valid and is_available
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking username: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to check username',
            'code': 'USERNAME_CHECK_ERROR'
        }), 500

@profile_bp.route('/username/suggestions', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=20, window_minutes=60)
def suggest_usernames():
    """Get username suggestions based on a base name."""
    try:
        data = request.get_json()
        base_name = data.get('base_name', '').strip() if data else ''
        count = min(int(data.get('count', 5)) if data else 5, 10)  # Max 10 suggestions
        
        if not base_name:
            # Use current user's name as base
            user = getattr(g, 'current_user', {})
            base_name = user.get('name', 'user')
        
        profile_service = _get_profile_service()
        suggestions = profile_service.suggest_usernames(base_name, count)
        
        return jsonify({
            'success': True,
            'base_name': base_name,
            'suggestions': suggestions
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating username suggestions: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to generate username suggestions',
            'code': 'USERNAME_SUGGESTIONS_ERROR'
        }), 500

@profile_bp.route('/oauth/status', methods=['GET'])
@auth_required
@rate_limit_by_user(max_requests=100, window_minutes=60)
def get_oauth_status():
    """Get OAuth status for the current user."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        profile_service = _get_profile_service()
        oauth_status = profile_service.get_user_oauth_status(user_id)
        
        return jsonify({
            'success': True,
            'oauth_status': oauth_status
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting OAuth status for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to get OAuth status',
            'code': 'OAUTH_STATUS_ERROR'
        }), 500

@profile_bp.route('/oauth/link-google', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
def link_google_account():
    """Initiate Google OAuth linking for existing user."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        # Check if user already has OAuth linked
        profile_service = _get_profile_service()
        oauth_status = profile_service.get_user_oauth_status(user_id)
        
        if oauth_status['has_oauth']:
            return jsonify({
                'success': False,
                'error': f"Account already linked to {oauth_status['oauth_provider']}",
                'code': 'OAUTH_ALREADY_LINKED'
            }), 400

        # Generate OAuth authorization URL with link flag
        oauth_service = _get_oauth_service()
        auth_url, state = oauth_service.get_google_auth_url(
            return_to='/profile/settings?linked=google',
            link_user_id=user_id  # Special flag to indicate linking
        )
        
        logger.info(f"Generated Google OAuth link URL for user {user_id}")
        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'state': state,
            'message': 'Redirect to auth_url to link Google account'
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating Google link URL for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to generate OAuth link URL',
            'code': 'OAUTH_LINK_ERROR'
        }), 500

@profile_bp.route('/oauth/unlink', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=5, window_minutes=60)
def unlink_oauth_account():
    """Unlink OAuth account from current user."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'MISSING_USER_ID'
            }), 401

        profile_service = _get_profile_service()
        
        # Check OAuth status
        oauth_status = profile_service.get_user_oauth_status(user_id)
        
        if not oauth_status['has_oauth']:
            return jsonify({
                'success': False,
                'error': 'No OAuth account linked',
                'code': 'NO_OAUTH_LINKED'
            }), 400
        
        if not oauth_status['can_unlink']:
            return jsonify({
                'success': False,
                'error': 'Cannot unlink OAuth account: Set a password first',
                'code': 'CANNOT_UNLINK_NO_PASSWORD'
            }), 400

        # Unlink OAuth account
        success = profile_service.unlink_oauth_account(user_id)
        
        if success:
            logger.info(f"Unlinked OAuth account from user {user_id}")
            return jsonify({
                'success': True,
                'message': 'OAuth account unlinked successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to unlink OAuth account',
                'code': 'UNLINK_FAILED'
            }), 500
        
    except ProfileError as e:
        logger.warning(f"OAuth unlink failed for user {getattr(g, 'user_id', 'unknown')}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'PROFILE_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error unlinking OAuth account for user {getattr(g, 'user_id', 'unknown')}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to unlink OAuth account',
            'code': 'OAUTH_UNLINK_ERROR'
        }), 500
