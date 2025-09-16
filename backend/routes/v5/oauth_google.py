"""
Google OAuth authentication routes for v5 API.
Production-ready with security checks and safe redirects.
"""

import os
from flask import request, redirect, make_response, jsonify

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from middleware.auth_decorators import rate_limit_by_user
from services.oauth_service_v5 import OAuthService, OAuthError
from services.auth_service_v5 import AuthServiceV5
from services.auth.cookies import set_auth
from utils.logging_config import get_logger

logger = get_logger(__name__)

google_oauth_bp = BlueprintFactoryV5.create_blueprint(
    'google_oauth', __name__, '/api/v5/auth/google',
    config_override={
        'enable_cors': False,  # Nginx handles CORS to prevent duplicate headers
    }
)

auth_service = AuthServiceV5()


def _get_oauth_service():
    from flask import current_app
    db_manager = current_app.config.get('DB_MANAGER')
    if not db_manager:
        raise RuntimeError("Database manager not configured")
    return OAuthService(db_manager)


@google_oauth_bp.route('/start', methods=['GET'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def google_oauth_start():
    """Initiate Google OAuth flow."""
    try:
        # Check if Google OAuth is configured
        if not os.getenv('GOOGLE_CLIENT_ID'):
            return jsonify({
                'success': False,
                'error': 'Google OAuth not configured',
                'code': 'SERVICE_NOT_CONFIGURED',
            }), 501

        return_to = request.args.get('returnTo', '/')
        oauth_service = _get_oauth_service()

        auth_url = oauth_service.get_google_auth_url(return_to)

        logger.info(f"Google OAuth initiated, return_to: {return_to}")
        return redirect(auth_url)

    except ValueError as e:
        logger.error(f"Google OAuth configuration error: {e}")
        return jsonify({
            'success': False,
            'error': 'OAuth service not properly configured',
            'code': 'SERVICE_NOT_CONFIGURED',
        }), 501
    except OAuthError as e:
        logger.error(f"Google OAuth start error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'OAUTH_START_FAILED',
        }), 400
    except Exception as e:
        logger.error(f"Google OAuth start unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': 'OAuth service unavailable',
            'code': 'SERVICE_ERROR',
        }), 503


@google_oauth_bp.route('/callback', methods=['GET'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def google_oauth_callback():
    """Handle Google OAuth callback."""
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        # Get configured frontend URL (never trust headers)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

        if error:
            logger.warning(f"Google OAuth error: {error}")
            return redirect(f"{frontend_url}/auth/error?error=oauth_denied")

        if not code or not state:
            logger.warning("Missing code or state in Google OAuth callback")
            return redirect(f"{frontend_url}/auth/error?error=missing_params")

        oauth_service = _get_oauth_service()
        user_data, return_to = oauth_service.handle_google_callback(code, state)

        tokens = auth_service.generate_tokens(user_data, remember_me=True)

        # Safe redirect: configured frontend + validated return_to (relative only)
        redirect_url = f"{frontend_url}{return_to}"

        response = make_response(redirect(redirect_url))

        set_auth(
            response,
            tokens.get('access_token', ''),
            tokens.get('refresh_token', ''),
            int(tokens.get('expires_in', 3600)),
        )

        # Audit log
        try:
            from utils.postgres_auth import get_postgres_auth
            auth_manager = get_postgres_auth()
            auth_manager._log_auth_event(
                user_data['id'],
                'oauth_login_success',
                True,
                {'provider': 'google', 'is_new_user': user_data.get('is_new', False)},
                request.headers.get('X-Real-IP') or request.remote_addr,
            )
        except Exception as e:
            logger.warning(f"Failed to log OAuth success: {e}")

        logger.info(f"Google OAuth successful for user {user_data['id']}")
        return response

    except OAuthError as e:
        logger.error(f"Google OAuth callback error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=oauth_failed")
    except Exception as e:
        logger.error(f"Google OAuth callback unexpected error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=service_error")


__all__ = ['google_oauth_bp']

