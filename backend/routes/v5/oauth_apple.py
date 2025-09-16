"""
Apple OAuth authentication routes for v5 API.
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

apple_oauth_bp = BlueprintFactoryV5.create_blueprint(
    'apple_oauth', __name__, '/api/v5/auth/apple',
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


@apple_oauth_bp.route('/start', methods=['GET'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def apple_oauth_start():
    """Initiate Apple OAuth flow."""
    try:
        # Check if Apple OAuth is configured
        if not os.getenv('APPLE_CLIENT_ID'):
            return jsonify({
                'success': False,
                'error': 'Apple OAuth not configured',
                'code': 'SERVICE_NOT_CONFIGURED',
            }), 501

        return_to = request.args.get('returnTo', '/')
        oauth_service = _get_oauth_service()

        auth_url = oauth_service.get_apple_auth_url(return_to)
        logger.info(f"Apple OAuth initiated, return_to: {return_to}")
        return redirect(auth_url)

    except ValueError as e:
        logger.error(f"Apple OAuth configuration error: {e}")
        return jsonify({
            'success': False,
            'error': 'OAuth service not properly configured',
            'code': 'SERVICE_NOT_CONFIGURED',
        }), 501
    except OAuthError as e:
        logger.error(f"Apple OAuth start error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'OAUTH_START_FAILED',
        }), 400
    except Exception as e:
        logger.error(f"Apple OAuth start unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': 'OAuth service unavailable',
            'code': 'SERVICE_ERROR',
        }), 503


@apple_oauth_bp.route('/callback', methods=['GET', 'POST'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def apple_oauth_callback():
    """Handle Apple OAuth callback."""
    try:
        if request.method == 'POST':
            code = request.form.get('code')
            state = request.form.get('state')
            user_data = request.form.get('user')
            error = request.form.get('error')
        else:
            code = request.args.get('code')
            state = request.args.get('state')
            user_data = request.args.get('user')
            error = request.args.get('error')

        # Get configured frontend URL (never trust headers)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

        if error:
            logger.warning(f"Apple OAuth error: {error}")
            return redirect(f"{frontend_url}/auth/error?error=oauth_denied")

        if not code or not state:
            logger.warning("Missing code or state in Apple OAuth callback")
            return redirect(f"{frontend_url}/auth/error?error=missing_params")

        oauth_service = _get_oauth_service()
        user_data, return_to = oauth_service.handle_apple_callback(code, state, user_data)

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
                {'provider': 'apple', 'is_new_user': user_data.get('is_new', False)},
                request.headers.get('X-Real-IP') or request.remote_addr,
            )
        except Exception as e:
            logger.warning(f"Failed to log OAuth success: {e}")

        logger.info(f"Apple OAuth successful for user {user_data['id']}")
        return response

    except OAuthError as e:
        logger.error(f"Apple OAuth callback error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=oauth_failed")
    except Exception as e:
        logger.error(f"Apple OAuth callback unexpected error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=service_error")


__all__ = ['apple_oauth_bp']

