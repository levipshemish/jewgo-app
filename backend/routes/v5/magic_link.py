"""
Magic Link authentication routes for v5 API.
Production-ready with safe redirects and rate limiting.
"""

import os
from flask import request, redirect, make_response, jsonify

from utils.blueprint_factory_v5 import BlueprintFactoryV5
from middleware.auth_decorators import rate_limit_by_user
from services.magic_link_service_v5 import MagicLinkService, MagicLinkError
from services.auth_service_v5 import AuthServiceV5
from services.auth.cookies import set_auth
from utils.logging_config import get_logger

logger = get_logger(__name__)

magic_link_bp = BlueprintFactoryV5.create_blueprint(
    'magic_link', __name__, '/api/v5/auth/magic'
)

auth_service = AuthServiceV5()


def _get_magic_link_service():
    from flask import current_app
    db_manager = current_app.config.get('DB_MANAGER')
    if not db_manager:
        raise RuntimeError("Database manager not configured")
    return MagicLinkService(db_manager)


@magic_link_bp.route('/send', methods=['POST'])
@rate_limit_by_user(max_requests=10, window_minutes=15)
def magic_link_send():
    """Create a magic link and send via email."""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip()
        return_to = data.get('returnTo') or '/'

        ip = request.headers.get('X-Forwarded-For')
        client_ip = ip.split(',')[0].strip() if ip else request.headers.get('X-Real-IP') or request.remote_addr

        svc = _get_magic_link_service()
        ok = svc.create_and_send_magic_link(email, return_to=return_to, ip_address=client_ip)
        if not ok:
            return jsonify({'success': False, 'error': 'Failed to send magic link'}), 500

        return jsonify({'success': True, 'message': 'Magic link sent'}), 200

    except MagicLinkError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Magic link send error: {e}")
        return jsonify({'success': False, 'error': 'Service unavailable'}), 503


@magic_link_bp.route('/consume', methods=['GET'])
@rate_limit_by_user(max_requests=20, window_minutes=60)
def magic_link_consume():
    """Consume a magic link and sign the user in, setting cookies and redirecting."""
    try:
        token = request.args.get('token')
        email = request.args.get('email')
        return_to = request.args.get('rt') or '/'

        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        if not token or not email:
            return redirect(f"{frontend_url}/auth/error?error=magic_link_invalid")

        svc = _get_magic_link_service()
        user_data = svc.consume_magic_link(token, email)

        tokens = auth_service.generate_tokens(user_data, remember_me=True)

        # Safe redirect: configured frontend + validated return_to (relative only)
        # Return_to could be any path; ensure it starts with '/'
        if not return_to.startswith('/'):
            return_to = '/' + return_to
        redirect_url = f"{frontend_url}{return_to}"

        response = make_response(redirect(redirect_url))
        set_auth(
            response,
            tokens.get('access_token', ''),
            tokens.get('refresh_token', ''),
            int(tokens.get('expires_in', 3600)),
        )
        return response

    except MagicLinkError as e:
        logger.error(f"Magic link consume error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=magic_link_invalid")
    except Exception as e:
        logger.error(f"Magic link consume unexpected error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/auth/error?error=service_error")


__all__ = ['magic_link_bp']

