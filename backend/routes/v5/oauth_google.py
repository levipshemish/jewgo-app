"""
Google OAuth authentication routes for v5 API.
Production-ready with security checks and safe redirects.
"""

import os
import time
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
    """Handle Google OAuth callback with comprehensive logging."""
    # Enhanced logging for OAuth debugging
    callback_id = f"oauth_{int(time.time())}_{request.remote_addr.replace('.', '')}"
    
    logger.info(f"[{callback_id}] Google OAuth callback initiated", extra={
        'callback_id': callback_id,
        'ip': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'referer': request.headers.get('Referer'),
        'query_params': dict(request.args)
    })
    
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        # Get configured frontend URL (never trust headers)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        logger.info(f"[{callback_id}] OAuth callback parameters", extra={
            'callback_id': callback_id,
            'has_code': bool(code),
            'code_length': len(code) if code else 0,
            'has_state': bool(state),
            'state_length': len(state) if state else 0,
            'has_error': bool(error),
            'error_value': error,
            'frontend_url': frontend_url
        })

        if error:
            logger.warning(f"[{callback_id}] Google OAuth returned error: {error}")
            return redirect(f"{frontend_url}/auth/error?error=oauth_denied")

        if not code or not state:
            logger.warning(f"[{callback_id}] Missing required OAuth parameters", extra={
                'callback_id': callback_id,
                'missing_code': not code,
                'missing_state': not state
            })
            return redirect(f"{frontend_url}/auth/error?error=missing_params")

        # Step 1: Initialize OAuth service
        logger.info(f"[{callback_id}] Initializing OAuth service")
        try:
            oauth_service = _get_oauth_service()
            logger.info(f"[{callback_id}] OAuth service initialized successfully")
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to initialize OAuth service: {e}", exc_info=True)
            return redirect(f"{frontend_url}/auth/error?error=oauth_failed")
        
        # Step 2: Handle Google callback (token exchange + profile fetch)
        logger.info(f"[{callback_id}] Processing Google OAuth callback")
        try:
            user_data, return_to = oauth_service.handle_google_callback(code, state)
            logger.info(f"[{callback_id}] Google OAuth callback processed successfully", extra={
                'callback_id': callback_id,
                'user_id': user_data.get('id', 'unknown'),
                'user_email': user_data.get('email', 'unknown'),
                'is_new_user': user_data.get('is_new', False),
                'return_to': return_to
            })
        except Exception as e:
            logger.error(f"[{callback_id}] Google OAuth callback processing failed: {e}", extra={
                'callback_id': callback_id,
                'exception_type': type(e).__name__,
                'code_prefix': code[:20] if code else None,
                'state_prefix': state[:20] if state else None
            }, exc_info=True)
            return redirect(f"{frontend_url}/auth/error?error=oauth_failed")

        # Step 3: Generate authentication tokens
        logger.info(f"[{callback_id}] Generating authentication tokens")
        try:
            tokens = auth_service.generate_tokens(user_data, remember_me=True)
            logger.info(f"[{callback_id}] Tokens generated successfully", extra={
                'callback_id': callback_id,
                'has_access_token': bool(tokens.get('access_token')),
                'has_refresh_token': bool(tokens.get('refresh_token')),
                'expires_in': tokens.get('expires_in'),
                'token_type': tokens.get('token_type')
            })
        except Exception as e:
            logger.error(f"[{callback_id}] Token generation failed: {e}", extra={
                'callback_id': callback_id,
                'user_id': user_data.get('id', 'unknown')
            }, exc_info=True)
            return redirect(f"{frontend_url}/auth/error?error=oauth_failed")

        # Step 4: Prepare redirect response
        redirect_url = f"{frontend_url}{return_to}"
        logger.info(f"[{callback_id}] Preparing redirect response", extra={
            'callback_id': callback_id,
            'redirect_url': redirect_url,
            'return_to': return_to
        })

        try:
            response = make_response(redirect(redirect_url))
            logger.info(f"[{callback_id}] Redirect response created successfully")
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to create redirect response: {e}", exc_info=True)
            return redirect(f"{frontend_url}/auth/error?error=oauth_failed")

        # Step 5: Set authentication cookies
        logger.info(f"[{callback_id}] Setting authentication cookies")
        try:
            set_auth(
                response,
                tokens.get('access_token', ''),
                tokens.get('refresh_token', ''),
                int(tokens.get('expires_in', 3600)),
            )
            logger.info(f"[{callback_id}] Authentication cookies set successfully")
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to set authentication cookies: {e}", exc_info=True)
            return redirect(f"{frontend_url}/auth/error?error=oauth_failed")

        # Step 6: Audit logging
        logger.info(f"[{callback_id}] Recording OAuth success audit log")
        try:
            from utils.postgres_auth import get_postgres_auth
            auth_manager = get_postgres_auth()
            auth_manager._log_auth_event(
                user_data['id'],
                'oauth_login_success',
                True,
                {'provider': 'google', 'is_new_user': user_data.get('is_new', False), 'callback_id': callback_id},
                request.headers.get('X-Real-IP') or request.remote_addr,
            )
            logger.info(f"[{callback_id}] Audit log recorded successfully")
        except Exception as e:
            logger.warning(f"[{callback_id}] Failed to log OAuth success: {e}")

        # Step 7: Final success
        logger.info(f"[{callback_id}] Google OAuth completed successfully", extra={
            'callback_id': callback_id,
            'user_id': user_data['id'],
            'redirect_url': redirect_url,
            'final_status': 'success'
        })
        return response

    except OAuthError as e:
        logger.error(f"[{callback_id}] Google OAuth callback OAuthError: {e}", extra={
            'callback_id': callback_id,
            'exception_type': 'OAuthError',
            'error_message': str(e)
        }, exc_info=True)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=oauth_failed")
    except Exception as e:
        logger.error(f"[{callback_id}] Google OAuth callback unexpected error: {e}", extra={
            'callback_id': callback_id,
            'exception_type': type(e).__name__,
            'error_message': str(e)
        }, exc_info=True)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=service_error")


__all__ = ['google_oauth_bp']

