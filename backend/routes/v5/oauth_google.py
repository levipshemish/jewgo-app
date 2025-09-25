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
from urllib.parse import quote_plus

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
    """Initiate Google OAuth flow with cbid cookie."""
    try:
        # Check if Google OAuth is configured
        if not os.getenv('GOOGLE_CLIENT_ID'):
            return jsonify({
                'success': False,
                'error': 'Google OAuth not configured',
                'code': 'SERVICE_NOT_CONFIGURED',
            }), 501

        return_to = request.args.get('returnTo', '/')
        link_user_id = request.args.get('linkUserId')
        oauth_service = _get_oauth_service()

        auth_url, cbid = oauth_service.get_google_auth_url(return_to, link_user_id)

        logger.info(f"Google OAuth initiated, return_to: {return_to}, cbid: {cbid}")
        
        # Create response with redirect
        response = make_response(redirect(auth_url))
        
        # Set oauth_cbid cookie
        from services.auth.cookies import CookiePolicyManager
        policy_manager = CookiePolicyManager()
        cookie_config = policy_manager.get_cookie_config()
        
        response.set_cookie(
            'oauth_cbid',
            cbid,
            httponly=True,
            secure=cookie_config.get('secure', True),
            samesite=cookie_config.get('samesite', 'None'),
            max_age=900,  # 15 minutes
            domain=cookie_config.get('domain'),
            path='/'
        )
        
        return response

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
    """Handle Google OAuth callback with step-level diagnostics and cbid correlation."""
    # Enhanced logging for OAuth debugging with cbid correlation
    callback_id = f"oauth_{int(time.time())}_{request.remote_addr.replace('.', '')}"
    
    logger.info(f"[{callback_id}] callback_start", extra={
        'cbid': callback_id,
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
        
        # Helper for consistent error redirects with step-level error codes
        def _error_redirect(step: str, error_code: str = 'oauth_failed', description: str | None = None):
            ts = int(time.time() * 1000)
            # Prefer description for more specific provider errors when available; fallback to step
            details_value = description or step
            return redirect(
                f"{frontend_url}/auth/error?error={error_code}"
                f"&error_step={quote_plus(step)}"
                f"&description={quote_plus(details_value)}"
                f"&details={quote_plus(details_value)}"
                f"&timestamp={ts}"
                f"&cbid={quote_plus(callback_id)}"
            )
        
        logger.info(f"[{callback_id}] callback_start", extra={
            'cbid': callback_id,
            'hasCode': bool(code),
            'hasState': bool(state),
            'hasError': bool(error),
            'errorValue': error,
            'frontendUrl': frontend_url
        })

        if error:
            logger.warning(f"[{callback_id}] Google OAuth returned error: {error}")
            return _error_redirect('provider_denied', 'oauth_denied')

        if not code or not state:
            logger.warning(f"[{callback_id}] Missing required OAuth parameters", extra={
                'cbid': callback_id,
                'missingCode': not code,
                'missingState': not state
            })
            return _error_redirect('missing_params', 'missing_params')

        # Step 1: Initialize OAuth service
        logger.info(f"[{callback_id}] Initializing OAuth service")
        try:
            oauth_service = _get_oauth_service()
            logger.info(f"[{callback_id}] OAuth service initialized successfully")
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to initialize OAuth service: {e}", exc_info=True)
            return _error_redirect('service_init_failed', 'service_error')
        
        # Step 2: Handle Google callback (token exchange + profile fetch)
        logger.info(f"[{callback_id}] Processing Google OAuth callback")
        try:
            user_data, return_to = oauth_service.handle_google_callback(code, state, callback_id)
            logger.info(f"[{callback_id}] Google OAuth callback processed successfully", extra={
                'cbid': callback_id,
                'userId': user_data.get('id', 'unknown'),
                'userEmail': user_data.get('email', 'unknown'),
                'isNewUser': user_data.get('is_new', False),
                'returnTo': return_to
            })
        except Exception as e:
            logger.error(f"[{callback_id}] Google OAuth callback processing failed: {e}", extra={
                'cbid': callback_id,
                'exceptionType': type(e).__name__,
                'codePrefix': code[:20] if code else None,
                'statePrefix': state[:20] if state else None
            }, exc_info=True)
            # Try to surface provider error code for easier diagnosis (e.g., invalid_grant, invalid_client)
            err_msg = (str(e) or '').lower()
            provider_error = None
            for token in ['invalid_grant', 'invalid_client', 'redirect_uri_mismatch', 'access_denied', 'unauthorized_client']:
                if token in err_msg:
                    provider_error = token
                    break
            return _error_redirect('callback_processing_failed', 'oauth_failed', provider_error)

        # Step 3: Generate authentication tokens
        logger.info(f"[{callback_id}] Generating authentication tokens")
        try:
            tokens = auth_service.generate_tokens(user_data, remember_me=True)
            logger.info(f"[{callback_id}] token_generation", extra={
                'cbid': callback_id,
                'hasAccessToken': bool(tokens.get('access_token')),
                'hasRefreshToken': bool(tokens.get('refresh_token')),
                'expiresIn': tokens.get('expires_in'),
                'tokenType': tokens.get('token_type')
            })
        except Exception as e:
            logger.error(f"[{callback_id}] Token generation failed: {e}", extra={
                'cbid': callback_id,
                'userId': user_data.get('id', 'unknown')
            }, exc_info=True)
            return _error_redirect('token_generation_failed', 'session_write_failed')

        # Step 4: Prepare redirect response
        redirect_url = f"{frontend_url}{return_to}"
        logger.info(f"[{callback_id}] Preparing redirect response", extra={
            'cbid': callback_id,
            'redirectUrl': redirect_url,
            'returnTo': return_to
        })

        try:
            response = make_response(redirect(redirect_url))
            logger.info(f"[{callback_id}] Redirect response created successfully")
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to create redirect response: {e}", exc_info=True)
            return _error_redirect('redirect_creation_failed', 'service_error')

        # Step 5: Set authentication cookies
        logger.info(f"[{callback_id}] Setting authentication cookies")
        try:
            set_auth(
                response,
                tokens.get('access_token', ''),
                tokens.get('refresh_token', ''),
                int(tokens.get('expires_in', 3600)),
            )
            logger.info(f"[{callback_id}] session_write", extra={
                'cbid': callback_id,
                'ok': True
            })
        except Exception as e:
            logger.error(f"[{callback_id}] Failed to set authentication cookies: {e}", exc_info=True)
            return _error_redirect('cookie_set_failed', 'session_write_failed')

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
            'cbid': callback_id,
            'userId': user_data['id'],
            'redirectUrl': redirect_url,
            'finalStatus': 'success'
        })
        return response

    except OAuthError as e:
        logger.error(f"[{callback_id}] Google OAuth callback OAuthError: {e}", extra={
            'callback_id': callback_id,
            'exception_type': 'OAuthError',
            'error_message': str(e)
        }, exc_info=True)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        # Use a lightweight local helper to avoid nested scope issues
        ts = int(time.time() * 1000)
        return redirect(f"{frontend_url}/auth/error?error=oauth_failed&error_step={quote_plus('oauth_error')}&details={quote_plus('oauth_error')}&timestamp={ts}&cbid={quote_plus(callback_id)}")
    except Exception as e:
        logger.error(f"[{callback_id}] Google OAuth callback unexpected error: {e}", extra={
            'callback_id': callback_id,
            'exception_type': type(e).__name__,
            'error_message': str(e)
        }, exc_info=True)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        ts = int(time.time() * 1000)
        return redirect(f"{frontend_url}/auth/error?error=service_error&error_step={quote_plus('unexpected_error')}&details={quote_plus('unexpected_error')}&timestamp={ts}&cbid={quote_plus(callback_id)}")


__all__ = ['google_oauth_bp']

