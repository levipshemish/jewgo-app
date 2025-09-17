"""
Two-Factor Authentication API routes for v5 API.
Provides endpoints for 2FA management and verification.
"""

import os
from flask import request, jsonify, g

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from middleware.auth_decorators import auth_required, rate_limit_by_user
from services.two_factor_service import get_two_factor_service, TwoFactorError
from utils.logging_config import get_logger

logger = get_logger(__name__)

two_factor_bp = BlueprintFactoryV5.create_blueprint(
    'two_factor', __name__, '/api/v5/auth/2fa',
    config_override={
        'enable_cors': False,  # Nginx handles CORS
    }
)


@two_factor_bp.route('/status', methods=['GET'])
@auth_required
@rate_limit_by_user(max_requests=100, window_minutes=60)
def get_2fa_status():
    """Get current 2FA status for authenticated user."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        service = get_two_factor_service()
        is_enabled = service.is_enabled_for_user(user_id)
        
        return jsonify({
            'success': True,
            'data': {
                'enabled': is_enabled,
                'method': 'email' if is_enabled else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting 2FA status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get 2FA status',
            'code': 'SERVICE_ERROR'
        }), 500


@two_factor_bp.route('/enable', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=10, window_minutes=60)
def enable_2fa():
    """Enable 2FA for authenticated user."""
    try:
        user_id = getattr(g, 'user_id', None)
        user_email = getattr(g, 'current_user', {}).get('email')
        
        if not user_id or not user_email:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        service = get_two_factor_service()
        
        # Check if already enabled
        if service.is_enabled_for_user(user_id):
            return jsonify({
                'success': False,
                'error': '2FA is already enabled for your account',
                'code': 'ALREADY_ENABLED'
            }), 400
        
        result = service.enable_2fa_for_user(user_id, user_email)
        
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'enabled': True,
                'method': 'email',
                'backup_codes': result.get('backup_codes', [])
            }
        }), 200
        
    except TwoFactorError as e:
        logger.warning(f"2FA enable error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'TWO_FACTOR_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error enabling 2FA: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to enable 2FA',
            'code': 'SERVICE_ERROR'
        }), 500


@two_factor_bp.route('/disable', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=10, window_minutes=60)
def disable_2fa():
    """Disable 2FA for authenticated user."""
    try:
        user_id = getattr(g, 'user_id', None)
        user_email = getattr(g, 'current_user', {}).get('email')
        
        if not user_id or not user_email:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        service = get_two_factor_service()
        
        # Check if 2FA is enabled
        if not service.is_enabled_for_user(user_id):
            return jsonify({
                'success': False,
                'error': '2FA is not enabled for your account',
                'code': 'NOT_ENABLED'
            }), 400
        
        result = service.disable_2fa_for_user(user_id, user_email)
        
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'enabled': False,
                'method': None
            }
        }), 200
        
    except TwoFactorError as e:
        logger.warning(f"2FA disable error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'TWO_FACTOR_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error disabling 2FA: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to disable 2FA',
            'code': 'SERVICE_ERROR'
        }), 500


@two_factor_bp.route('/send-code', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=10, window_minutes=60)
def send_2fa_code():
    """Send 2FA verification code to authenticated user's email."""
    try:
        user_id = getattr(g, 'user_id', None)
        user_email = getattr(g, 'current_user', {}).get('email')
        
        if not user_id or not user_email:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        # Get IP address
        ip = request.headers.get('X-Forwarded-For')
        client_ip = ip.split(',')[0].strip() if ip else request.headers.get('X-Real-IP') or request.remote_addr
        
        service = get_two_factor_service()
        result = service.send_2fa_code(user_id, user_email, client_ip)
        
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'expires_in': result['expires_in'],
                'sent_to': f"{user_email[:3]}***@{user_email.split('@')[1]}"
            }
        }), 200
        
    except TwoFactorError as e:
        logger.warning(f"2FA code send error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'TWO_FACTOR_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error sending 2FA code: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to send verification code',
            'code': 'SERVICE_ERROR'
        }), 500


@two_factor_bp.route('/verify-code', methods=['POST'])
@auth_required
@rate_limit_by_user(max_requests=20, window_minutes=60)
def verify_2fa_code():
    """Verify 2FA code for authenticated user."""
    try:
        user_id = getattr(g, 'user_id', None)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        data = request.get_json(silent=True) or {}
        code = data.get('code', '').strip()
        
        if not code:
            return jsonify({
                'success': False,
                'error': 'Verification code is required',
                'code': 'MISSING_CODE'
            }), 400
        
        if len(code) != 6 or not code.isdigit():
            return jsonify({
                'success': False,
                'error': 'Invalid verification code format',
                'code': 'INVALID_FORMAT'
            }), 400
        
        # Get IP address
        ip = request.headers.get('X-Forwarded-For')
        client_ip = ip.split(',')[0].strip() if ip else request.headers.get('X-Real-IP') or request.remote_addr
        
        service = get_two_factor_service()
        result = service.verify_2fa_code(user_id, code, client_ip)
        
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'verified': True,
                'verified_at': result['verified_at']
            }
        }), 200
        
    except TwoFactorError as e:
        logger.warning(f"2FA code verify error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'TWO_FACTOR_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error verifying 2FA code: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to verify code',
            'code': 'SERVICE_ERROR'
        }), 500


# Public endpoint for 2FA verification during login (no auth required)
@two_factor_bp.route('/verify-login-code', methods=['POST'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def verify_login_2fa_code():
    """Verify 2FA code during login process (public endpoint)."""
    try:
        data = request.get_json(silent=True) or {}
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            return jsonify({
                'success': False,
                'error': 'Email and verification code are required',
                'code': 'MISSING_PARAMETERS'
            }), 400
        
        if len(code) != 6 or not code.isdigit():
            return jsonify({
                'success': False,
                'error': 'Invalid verification code format',
                'code': 'INVALID_FORMAT'
            }), 400
        
        # Get user ID from email
        from utils.postgres_auth import get_postgres_auth
        from sqlalchemy import text
        
        auth_manager = get_postgres_auth()
        
        with auth_manager.db.session_scope() as session:
            user_result = session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {'email': email}
            ).fetchone()
            
            if not user_result:
                return jsonify({
                    'success': False,
                    'error': 'User not found',
                    'code': 'USER_NOT_FOUND'
                }), 404
            
            user_id = user_result[0]
        
        # Get IP address
        ip = request.headers.get('X-Forwarded-For')
        client_ip = ip.split(',')[0].strip() if ip else request.headers.get('X-Real-IP') or request.remote_addr
        
        service = get_two_factor_service()
        result = service.verify_2fa_code(user_id, code, client_ip)
        
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'verified': True,
                'verified_at': result['verified_at'],
                'user_id': user_id  # Needed for login completion
            }
        }), 200
        
    except TwoFactorError as e:
        logger.warning(f"Login 2FA code verify error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'TWO_FACTOR_ERROR'
        }), 400
    except Exception as e:
        logger.error(f"Error verifying login 2FA code: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to verify code',
            'code': 'SERVICE_ERROR'
        }), 500


__all__ = ['two_factor_bp']
