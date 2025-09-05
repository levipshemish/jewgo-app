"""
PostgreSQL-based authentication API endpoints.

This module provides REST API endpoints for user authentication, registration,
and account management using PostgreSQL instead of Supabase.
"""

from flask import Blueprint, request, jsonify, current_app, make_response, redirect
from werkzeug.exceptions import BadRequest
from utils.logging_config import get_logger
from utils.error_handler import ValidationError, AuthenticationError
from utils.postgres_auth import get_postgres_auth
from utils.rbac import require_auth, require_admin, get_current_user_id, optional_auth
from utils.rate_limiter import rate_limit
import re
import os

# Auth helpers
from services.auth.cookies import set_auth, clear_auth
from services.auth.csrf import protect as csrf_protect, issue as csrf_issue
from utils.metrics import inc_login, inc_refresh, inc_guest, observe_refresh_latency, inc_logout, inc_oauth
try:
    from services.auth.recaptcha import verify_or_429 as verify_recaptcha_or_429
except Exception:
    # Fallback if module not available
    def verify_recaptcha_or_429(_request):  # type: ignore
        return None

logger = get_logger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def get_client_ip() -> str:
    """Get client IP address from request."""
    # Check for X-Forwarded-For header (common in proxy setups)
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    # Check for X-Real-IP header (common in nginx setups)
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    # Fall back to remote address
    else:
        return request.remote_addr


def _build_google_redirect_uri() -> str:
    """Compute redirect URI for Google OAuth callback based on request host or env."""
    # Prefer explicit PUBLIC_URL if set
    public_url = os.getenv('PUBLIC_BACKEND_URL') or os.getenv('BACKEND_URL')
    if public_url:
        base = public_url.rstrip('/')
        return f"{base}/api/auth/oauth/google/callback"
    # Fall back to request
    scheme = request.headers.get('X-Forwarded-Proto', request.scheme)
    host = request.headers.get('X-Forwarded-Host') or request.host
    return f"{scheme}://{host}/api/auth/oauth/google/callback"


def _sign_state(payload: dict) -> str:
    import jwt as _jwt
    secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET') or 'dev_secret'
    return _jwt.encode(payload, secret, algorithm='HS256')


def _unsign_state(token: str) -> dict | None:
    import jwt as _jwt
    secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET') or 'dev_secret'
    try:
        return _jwt.decode(token, secret, algorithms=['HS256'])
    except Exception:
        return None


# --- Google ID token verification via JWKS ---
_GOOGLE_JWKS_CACHE: dict | None = None
_GOOGLE_JWKS_TS: float | None = None


def _get_google_jwks() -> dict | None:
    """Fetch Google's JWKS with basic in-memory caching."""
    import time
    global _GOOGLE_JWKS_CACHE, _GOOGLE_JWKS_TS
    # refresh every hour
    if _GOOGLE_JWKS_CACHE and _GOOGLE_JWKS_TS and (time.time() - _GOOGLE_JWKS_TS) < 3600:
        return _GOOGLE_JWKS_CACHE
    try:
        import requests as _requests
        resp = _requests.get('https://www.googleapis.com/oauth2/v3/certs', timeout=5)
        if resp.status_code == 200:
            _GOOGLE_JWKS_CACHE = resp.json()
            _GOOGLE_JWKS_TS = time.time()
            return _GOOGLE_JWKS_CACHE
        logger.warning(f"Failed to fetch Google JWKS: {resp.status_code}")
    except Exception as e:
        logger.error(f"Google JWKS fetch error: {e}")
    return None


def _verify_google_id_token(id_token: str, audience: str) -> dict | None:
    import jwt as _jwt
    from jwt import algorithms
    import json as _json
    try:
        header = _jwt.get_unverified_header(id_token)
        kid = header.get('kid')
        if not kid:
            return None
        jwks = _get_google_jwks()
        if not jwks:
            return None
        key = None
        for jwk in jwks.get('keys', []):
            if jwk.get('kid') == kid:
                key = jwk
                break
        if not key:
            return None
        public_key = algorithms.RSAAlgorithm.from_jwk(_json.dumps(key))
        claims = _jwt.decode(
            id_token,
            public_key,
            algorithms=['RS256'],
            audience=audience,
            issuer=['https://accounts.google.com', 'accounts.google.com'],
        )
        return claims
    except Exception as e:
        logger.warning(f"Google id_token verification failed: {e}")
        return None


@auth_bp.route('/csrf', methods=['GET'])
def csrf_token():
    """Issue a non-HttpOnly CSRF cookie and return the token in body."""
    resp = make_response(jsonify({}))
    token = csrf_issue(resp)
    return make_response(jsonify({"token": token}), 200)


@auth_bp.route('/oauth/google/start', methods=['GET'])
def oauth_google_start():
    """Initiate Google OAuth with PKCE and return redirect URL or redirect directly."""
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not client_id:
        return jsonify({'error': 'Google OAuth not configured'}), 501

    import secrets, hashlib, base64, time
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b'=').decode('ascii')
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).rstrip(b'=').decode('ascii')
    state = _sign_state({'cv': code_verifier, 'ts': int(time.time()), 'nonce': secrets.token_hex(8)})

    params = {
        'client_id': client_id,
        'redirect_uri': _build_google_redirect_uri(),
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
        'access_type': 'offline',
        'prompt': 'consent',
    }
    from urllib.parse import urlencode
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    if request.args.get('redirect') == 'true':
        inc_oauth('start', 'success')
        return redirect(url, code=302)
    inc_oauth('start', 'success')
    return jsonify({'url': url})


@auth_bp.route('/oauth/google/callback', methods=['GET'])
def oauth_google_callback():
    """Handle Google OAuth callback, exchange code, upsert account, set cookies, redirect back."""
    error = request.args.get('error')
    if error:
        return jsonify({'error': error}), 400
    code = request.args.get('code')
    state = request.args.get('state')
    if not code or not state:
        return jsonify({'error': 'Missing code or state'}), 400

    st = _unsign_state(state)
    if not st or 'cv' not in st:
        return jsonify({'error': 'Invalid state'}), 400
    code_verifier = st['cv']

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    redirect_uri = _build_google_redirect_uri()

    # Exchange code for tokens
    import requests as _requests
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'code_verifier': code_verifier,
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri,
    }
    try:
        token_resp = _requests.post('https://oauth2.googleapis.com/token', data=data, timeout=10)
        if token_resp.status_code != 200:
            inc_oauth('callback', 'failure')
            return jsonify({'error': 'Token exchange failed'}), 400
        tok = token_resp.json()
    except Exception as e:
        logger.error(f"Google token exchange error: {e}")
        inc_oauth('callback', 'failure')
        return jsonify({'error': 'Token exchange error'}), 500

    id_token = tok.get('id_token')
    access_token = tok.get('access_token')
    refresh_token = tok.get('refresh_token')
    expires_in = tok.get('expires_in')
    if not id_token:
        return jsonify({'error': 'Missing id_token'}), 400

    # Verify id_token via Google JWKS
    claims = _verify_google_id_token(id_token, audience=client_id)
    if not claims:
        inc_oauth('callback', 'failure')
        return jsonify({'error': 'Invalid id_token'}), 400

    sub = claims.get('sub')
    email = claims.get('email')
    name = claims.get('name')
    if not sub or not email:
        inc_oauth('callback', 'failure')
        return jsonify({'error': 'Insufficient profile'}), 400

    # Upsert user + account
    try:
        from sqlalchemy import text
        from utils.postgres_auth import get_postgres_auth as _get_auth
        auth_manager = _get_auth()
        dbm = auth_manager.db
        with dbm.connection_manager.session_scope() as session:
            # Ensure user exists
            row = session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email}).fetchone()
            if row:
                user_id = row[0]
            else:
                user_id = __import__('secrets').token_hex(16)
                session.execute(text("INSERT INTO users (id, name, email, email_verified) VALUES (:id, :n, :e, TRUE)"), {"id": user_id, "n": name, "e": email})
                session.execute(text("INSERT INTO user_roles (user_id, role, level, granted_at, is_active) VALUES (:id, 'user', 1, NOW(), TRUE)"), {"id": user_id})
            # Upsert account
            session.execute(
                text(
                    """
                    INSERT INTO accounts (id, userId, type, provider, providerAccountId, access_token, refresh_token, expires_at, token_type, scope, id_token, session_state)
                    VALUES (:id, :uid, 'oauth', 'google', :paid, :at, :rt, :exp, :tt, :sc, :idt, NULL)
                    ON CONFLICT (id) DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at, id_token = EXCLUDED.id_token
                    """
                ),
                {
                    "id": f"google_{sub}",
                    "uid": user_id,
                    "paid": sub,
                    "at": access_token,
                    "rt": refresh_token,
                    "exp": int(expires_in) if expires_in else None,
                    "tt": tok.get('token_type'),
                    "sc": tok.get('scope'),
                    "idt": id_token,
                },
            )
    except Exception as e:
        logger.error(f"Account upsert error: {e}")
        inc_oauth('callback', 'failure')
        return jsonify({'error': 'Account upsert failed'}), 500

    # Issue our cookies (session family)
    try:
        from services.auth import tokens as jwt_tokens
        from services.auth import sessions as sess
        roles = [{'role': 'user', 'level': 1}]  # For brevity; would query actual roles
        fid = sess.new_family_id()
        sid = sess.new_session_id()
        rtok, rttl = jwt_tokens.mint_refresh(user_id, sid=sid, fid=fid, is_guest=False)
        ua = request.headers.get('User-Agent')
        sess.persist_initial(auth_manager.db, user_id=user_id, refresh_token=rtok, sid=sid, fid=fid, user_agent=ua, ip=get_client_ip(), ttl_seconds=rttl)
        atok, attl = jwt_tokens.mint_access(user_id, email, roles, is_guest=False)
        out = make_response(redirect(request.args.get('returnTo') or '/'))
        set_auth(out, atok, rtok, attl)
        inc_oauth('callback', 'success')
        return out
    except Exception as e:
        logger.error(f"OAuth cookie issuance error: {e}")
        inc_oauth('callback', 'failure')
        return jsonify({'error': 'Login finalize failed'}), 500


@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600)  # 5 registrations per hour
def register():
    """Register a new user account."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validate required fields
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Create user account
        auth_manager = get_postgres_auth()
        user_info = auth_manager.create_user(email, password, name)
        
        # Remove sensitive information from response
        response_data = {
            'user': {
                'id': user_info['user_id'],
                'email': user_info['email'],
                'name': user_info['name'],
                'email_verified': user_info['email_verified']
            },
            'message': 'Account created successfully. Please check your email for verification.'
        }
        
        logger.info(f"User registration successful: {email}")
        return jsonify(response_data), 201
        
    except ValidationError as e:
        logger.warning(f"Registration validation error: {e}")
        return jsonify({'error': str(e)}), 400
    except AuthenticationError as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=900)  # 10 login attempts per 15 minutes
@csrf_protect
def login():
    """Authenticate user and return tokens."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Get client IP for logging
        client_ip = get_client_ip()
        
        # Optional reCAPTCHA verification (when token provided or prod enforced)
        try:
            recaptcha_token = data.get('recaptcha_token')
            if recaptcha_token:
                err = verify_recaptcha_or_429(request)
                if err is not None:
                    return err
        except Exception:
            # Do not fail login hard if verifier unavailable in dev
            pass

        # Authenticate user
        auth_manager = get_postgres_auth()
        user_info = auth_manager.authenticate_user(email, password, client_ip)
        
        if not user_info:
            inc_login('failure', 'password')
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate tokens with session family + rotation support
        from services.auth import tokens as jwt_tokens
        from services.auth import sessions as sess

        roles = user_info.get('roles', [])
        is_guest = bool(user_info.get('is_guest')) or any(r.get('role') == 'guest' for r in roles)

        fid = sess.new_family_id()
        sid = sess.new_session_id()
        refresh_token, refresh_ttl = jwt_tokens.mint_refresh(user_info['user_id'], sid=sid, fid=fid, is_guest=is_guest)
        # Persist initial session
        try:
            user_agent = request.headers.get('User-Agent')
            sess.persist_initial(auth_manager.db, user_id=user_info['user_id'], refresh_token=refresh_token, sid=sid, fid=fid, user_agent=user_agent, ip=client_ip, ttl_seconds=refresh_ttl)
        except Exception as e:
            logger.error(f"Failed to persist auth session: {e}")
            return jsonify({'error': 'Login failed'}), 500

        access_token, access_ttl = jwt_tokens.mint_access(user_info['user_id'], user_info['email'], roles, is_guest=is_guest)
        tokens = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': access_ttl,
        }

        # Prepare response payload (keep JSON tokens for backward compatibility)
        response_data = {
            'user': {
                'id': user_info['user_id'],
                'name': user_info['name'],
                'email': user_info['email'],
                'email_verified': user_info['email_verified'],
                'roles': user_info.get('roles', [])
            },
            'tokens': tokens
        }
        # Build response and set HttpOnly cookies (aligned via helper)
        resp = make_response(jsonify(response_data), 200)
        set_auth(resp, tokens['access_token'], tokens['refresh_token'], int(tokens.get('expires_in', 3600)))

        logger.info(f"User login successful: {email}")
        inc_login('success', 'password')
        return resp
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@rate_limit(max_requests=60, window_seconds=3600)  # 60 refresh attempts per hour
@csrf_protect
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        refresh_token = data.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Validate refresh token and rotate session
        from services.auth import tokens as jwt_tokens
        import time
        start = time.perf_counter()
        payload = jwt_tokens.verify(refresh_token, expected_type='refresh')
        if not payload:
            inc_refresh('failure')
            return jsonify({'error': 'Invalid or expired refresh token'}), 401

        auth_manager = get_postgres_auth()
        try:
            from services.auth import sessions as sess
            user_agent = request.headers.get('User-Agent')
            rotate_res = sess.rotate_or_reject(
                auth_manager.db,
                user_id=payload['uid'],
                provided_refresh=refresh_token,
                sid=payload['sid'],
                fid=payload['fid'],
                user_agent=user_agent,
                ip=get_client_ip(),
                ttl_seconds=int(os.getenv('REFRESH_TTL_SECONDS', str(45 * 24 * 3600))),
            )
            if rotate_res is None:
                inc_refresh('reuse')
                return jsonify({'error': 'Refresh reuse detected; session revoked'}), 401
            new_sid, new_refresh, new_refresh_ttl = rotate_res

            # Mint new access token
            # Query DB for email and roles
            with auth_manager.db.connection_manager.session_scope() as session:
                from sqlalchemy import text
                row = session.execute(
                    text(
                        """
                        SELECT u.email,
                               COALESCE(
                                   JSON_AGG(JSON_BUILD_OBJECT('role', ur.role, 'level', ur.level))
                                   FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid
                        GROUP BY u.email
                        """
                    ),
                    {"uid": payload['uid']},
                ).fetchone()
            email = row.email if row else ''
            import json as _json
            roles = _json.loads(row.roles) if row and row.roles else []

            is_guest = any(r.get('role') == 'guest' for r in roles)
            new_access, access_ttl = jwt_tokens.mint_access(payload['uid'], email, roles, is_guest=is_guest)

            new_tokens = {
                'access_token': new_access,
                'refresh_token': new_refresh,
                'token_type': 'Bearer',
                'expires_in': access_ttl,
            }
        except Exception as e:
            logger.error(f"Refresh rotation error: {e}")
            return jsonify({'error': 'Token refresh failed'}), 500

        # Build response and set cookies (rotation)
        resp = make_response(jsonify(new_tokens), 200)
        set_auth(resp, new_tokens['access_token'], new_tokens['refresh_token'], int(new_tokens.get('expires_in', 3600)))

        observe_refresh_latency(time.perf_counter() - start)
        inc_refresh('success')
        logger.debug("Token refresh successful")
        return resp
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500


@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=3600)  # 10 verification attempts per hour
def verify_email():
    """Verify user email with verification token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        verification_token = data.get('verification_token')
        if not verification_token:
            return jsonify({'error': 'Verification token is required'}), 400
        
        # Verify email
        auth_manager = get_postgres_auth()
        success = auth_manager.verify_email(verification_token)
        
        if not success:
            return jsonify({'error': 'Invalid or expired verification token'}), 400
        
        logger.info("Email verification successful")
        return jsonify({'message': 'Email verified successfully'}), 200
        
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        return jsonify({'error': 'Email verification failed'}), 500


@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get current user profile information."""
    try:
        from flask import g
        user_info = g.user
        
        # Return user profile (excluding sensitive data)
        profile_data = {
            'id': user_info['user_id'],
            'name': user_info['name'],
            'email': user_info['email'],
            'email_verified': user_info['email_verified'],
            'roles': user_info.get('roles', []),
            'last_login': user_info.get('last_login')
        }
        
        return jsonify({'user': profile_data}), 200
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return jsonify({'error': 'Failed to retrieve profile'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Update user profile information."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        user_id = get_current_user_id()
        name = data.get('name', '').strip()
        
        # Only allow updating name for now
        # Email changes would require verification process
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        # Update profile in database
        from utils.postgres_auth import get_postgres_auth
        auth_manager = get_postgres_auth()
        
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(
                text("UPDATE users SET name = :name, updated_at = NOW() WHERE id = :user_id"),
                {'name': name, 'user_id': user_id}
            )
            conn.commit()
        
        logger.info(f"Profile updated for user {user_id}")
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
@rate_limit(max_requests=5, window_seconds=3600)  # 5 password changes per hour
def change_password():
    """Change user password."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        user_id = get_current_user_id()
        from flask import g
        email = g.user['email']
        
        # Verify current password
        auth_manager = get_postgres_auth()
        user_info = auth_manager.authenticate_user(email, current_password)
        
        if not user_info:
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password strength
        password_validation = auth_manager.password_security.validate_password_strength(new_password)
        if not password_validation['is_valid']:
            return jsonify({
                'error': 'Password requirements not met',
                'details': password_validation['issues']
            }), 400
        
        # Hash new password
        new_password_hash = auth_manager.password_security.hash_password(new_password)
        
        # Update password in database
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(
                text("UPDATE users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :user_id"),
                {'password_hash': new_password_hash, 'user_id': user_id}
            )
            conn.commit()
        
        # Log password change
        auth_manager._log_auth_event(user_id, 'password_changed', True)
        
        logger.info(f"Password changed for user {user_id}")
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({'error': 'Failed to change password'}), 500


@auth_bp.route('/logout', methods=['POST', 'GET'])
@optional_auth  # Optional auth because logout should work even with invalid tokens
@csrf_protect
def logout():
    """Logout user (client-side token invalidation)."""
    try:
        # In a JWT-based system, logout is primarily handled client-side
        # by removing tokens from storage. For enhanced security, we could:
        # 1. Maintain a token blacklist (expensive)
        # 2. Use short-lived tokens with refresh tokens
        # 3. Log the logout event
        
        user_id = get_current_user_id()
        if user_id:
            auth_manager = get_postgres_auth()
            auth_manager._log_auth_event(user_id, 'logout', True)
            logger.info(f"User logout: {user_id}")
        
        # Revoke session family if possible, then clear cookies
        try:
            from services.auth.tokens import verify
            from services.auth.sessions import revoke_family
            # Prefer cookie refresh_token to identify family
            rt = request.cookies.get('refresh_token')
            if rt:
                payload = verify(rt, expected_type='refresh')
                if payload and payload.get('fid'):
                    revoke_family(get_postgres_auth().db, fid=payload['fid'])
        except Exception as e:
            logger.debug(f"Logout family revoke skipped: {e}")

        # Determine optional returnTo for redirect-after-logout (only allow safe relative paths)
        return_to = request.args.get('returnTo')
        is_safe_rel = isinstance(return_to, str) and return_to.startswith('/') and not return_to.startswith('//')

        resp = make_response(jsonify({'message': 'Logged out successfully'}), 200)
        clear_auth(resp)

        # If safe returnTo present, redirect
        if is_safe_rel:
            redir = redirect(return_to, code=302)
            # carry cookie clearing headers from resp to redirect response
            for k, v in resp.headers.items():
                if k.lower() == 'set-cookie':
                    redir.headers.add(k, v)
            inc_logout('success')
            return redir

        inc_logout('success')
        return resp
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'message': 'Logged out successfully'}), 200  # Always return success


# Admin endpoints for user management
@auth_bp.route('/admin/users', methods=['GET'])
@require_admin
def admin_list_users():
    """Admin endpoint to list users with pagination."""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        search = request.args.get('search', '').strip()
        
        offset = (page - 1) * per_page
        
        auth_manager = get_postgres_auth()
        
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            
            # Build search condition
            where_clause = ""
            params = {'limit': per_page, 'offset': offset}
            
            if search:
                where_clause = "WHERE u.email ILIKE :search OR u.name ILIKE :search"
                params['search'] = f"%{search}%"
            
            # Get users with roles
            query = f"""
                SELECT u.id, u.name, u.email, u.email_verified, u.failed_login_attempts,
                       u.locked_until, u.last_login, u.created_at,
                       COALESCE(
                           JSON_AGG(
                               JSON_BUILD_OBJECT(
                                   'role', ur.role,
                                   'level', ur.level,
                                   'granted_at', ur.granted_at
                               )
                           ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                           '[]'
                       ) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                {where_clause}
                GROUP BY u.id, u.name, u.email, u.email_verified, u.failed_login_attempts,
                         u.locked_until, u.last_login, u.created_at
                ORDER BY u.created_at DESC
                LIMIT :limit OFFSET :offset
            """
            
            results = conn.execute(text(query), params).fetchall()
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM users u {where_clause}"
            count_params = {'search': params.get('search')} if search else {}
            total_count = conn.execute(text(count_query), count_params).scalar()
            
            # Format response
            users = []
            for row in results:
                user_data = row._asdict()
                import json
                user_data['roles'] = json.loads(user_data['roles'])
                users.append(user_data)
            
            return jsonify({
                'users': users,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': (total_count + per_page - 1) // per_page
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Admin list users error: {e}")
        return jsonify({'error': 'Failed to list users'}), 500


@auth_bp.route('/admin/users/<user_id>/roles', methods=['POST'])
@require_admin
def admin_assign_role(user_id: str):
    """Admin endpoint to assign role to user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        role = data.get('role')
        level = data.get('level')
        
        if not role or level is None:
            return jsonify({'error': 'Role and level are required'}), 400
        
        # Get current admin user ID
        granted_by = get_current_user_id()
        
        # Assign role
        auth_manager = get_postgres_auth()
        success = auth_manager.assign_user_role(user_id, role, level, granted_by)
        
        if not success:
            return jsonify({'error': 'Failed to assign role'}), 500
        
        logger.info(f"Role '{role}' assigned to user {user_id} by admin {granted_by}")
        return jsonify({'message': f"Role '{role}' assigned successfully"}), 200
        
    except Exception as e:
        logger.error(f"Admin assign role error: {e}")
        return jsonify({'error': 'Failed to assign role'}), 500


@auth_bp.route('/admin/users/<user_id>/roles/<role>', methods=['DELETE'])
@require_admin
def admin_revoke_role(user_id: str, role: str):
    """Admin endpoint to revoke role from user."""
    try:
        auth_manager = get_postgres_auth()
        success = auth_manager.revoke_user_role(user_id, role)
        
        if not success:
            return jsonify({'error': 'Failed to revoke role'}), 500
        
        granted_by = get_current_user_id()
        logger.info(f"Role '{role}' revoked from user {user_id} by admin {granted_by}")
        return jsonify({'message': f"Role '{role}' revoked successfully"}), 200
        
    except Exception as e:
        logger.error(f"Admin revoke role error: {e}")
        return jsonify({'error': 'Failed to revoke role'}), 500


# Health check endpoint
@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the auth service."""
    try:
        # Test database connection
        auth_manager = get_postgres_auth()
        with auth_manager.db.get_db_connection() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1")).fetchone()
        
        return jsonify({
            'status': 'healthy',
            'service': 'postgres_auth',
            'timestamp': '2025-01-15T00:00:00Z'
        }), 200
        
    except Exception as e:
        logger.error(f"Auth service health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'postgres_auth',
            'error': str(e)
        }), 503


# Error handlers for the blueprint
@auth_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """Handle validation errors."""
    return jsonify({'error': str(error)}), 400


@auth_bp.errorhandler(AuthenticationError)
def handle_auth_error(error):
    """Handle authentication errors."""
    return jsonify({'error': str(error)}), 401


@auth_bp.errorhandler(BadRequest)
def handle_bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Invalid request format'}), 400


@auth_bp.errorhandler(500)
def handle_internal_error(error):
    """Handle internal server errors."""
    logger.error(f"Internal server error in auth API: {error}")
    return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/me', methods=['GET'])
@rate_limit(max_requests=100, window_seconds=3600)
def me():
    """Return current user info by verifying access token from header or cookies."""
    try:
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            token = request.cookies.get('access_token')
        if not token:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        auth_manager = get_postgres_auth()
        user_info = auth_manager.verify_access_token(token)
        if not user_info:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401

        # Shape response as { success, data }
        data = {
            'id': user_info['user_id'],
            'name': user_info.get('name'),
            'email': user_info.get('email'),
            'email_verified': user_info.get('email_verified'),
            'roles': user_info.get('roles', []),
        }
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        logger.error(f"/me error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@auth_bp.route('/guest', methods=['POST'])
@rate_limit(max_requests=30, window_seconds=3600)
@csrf_protect
def guest_login():
    """Create a guest user and issue cookies. Shorter refresh TTL is configured via env."""
    try:
        client_ip = get_client_ip()
        auth_manager = get_postgres_auth()
        user_info = auth_manager.create_guest_user(client_ip)

        from services.auth import tokens as jwt_tokens
        from services.auth import sessions as sess

        roles = user_info.get('roles', [])
        fid = sess.new_family_id()
        sid = sess.new_session_id()
        refresh_token, refresh_ttl = jwt_tokens.mint_refresh(user_info['user_id'], sid=sid, fid=fid, is_guest=True)
        user_agent = request.headers.get('User-Agent')
        sess.persist_initial(auth_manager.db, user_id=user_info['user_id'], refresh_token=refresh_token, sid=sid, fid=fid, user_agent=user_agent, ip=client_ip, ttl_seconds=refresh_ttl)
        access_token, access_ttl = jwt_tokens.mint_access(user_info['user_id'], user_info['email'], roles, is_guest=True)

        tokens = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': access_ttl,
        }

        resp_body = {
            'user': {
                'id': user_info['user_id'],
                'name': user_info['name'],
                'email': user_info['email'],
                'email_verified': user_info['email_verified'],
                'roles': roles,
                'is_guest': True,
            },
            'tokens': tokens,
        }
        resp = make_response(jsonify(resp_body), 200)

        # Use helper to set cookies
        set_auth(resp, tokens['access_token'], tokens['refresh_token'], int(tokens.get('expires_in', 3600)))

        inc_guest('created')
        return resp
    except Exception as e:
        logger.error(f"Guest login error: {e}")
        return jsonify({'error': 'Guest login failed'}), 500
