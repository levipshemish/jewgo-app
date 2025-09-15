"""
Authentication middleware for Flask.

Provides automatic token extraction (header or cookies), context population,
optional authentication support, and opportunistic token refresh when the
access token is near expiry. Works alongside RBAC decorators.
"""

from __future__ import annotations

import time
from typing import Optional

from flask import g, request

from utils.logging_config import get_logger
from utils.postgres_auth import get_postgres_auth
from services.auth.token_manager_v5 import TokenManagerV5

logger = get_logger(__name__)


def register_auth_middleware(app) -> None:
    """Register before/after request hooks enabling cookie-based auth integration."""
    from utils.auth_helpers import extract_token_from_request

    token_manager_v5 = TokenManagerV5()

    @app.before_request
    def _auth_context_loader():
        try:
            token = extract_token_from_request(request)
            if not token:
                return  # No auth present; continue

            payload = token_manager_v5.verify_token(token)
            if not payload or payload.get('type') != 'access':
                return  # Invalid token; context remains unauthenticated

            uid = payload.get('uid')
            if not uid:
                return

            # Load user info from DB
            auth_manager = get_postgres_auth()
            with auth_manager.db.connection_manager.session_scope() as session:
                from sqlalchemy import text
                row = session.execute(
                    text(
                        """
                        SELECT u.id, u.email,
                               COALESCE(
                                   JSON_AGG(JSON_BUILD_OBJECT('role', ur.role, 'level', ur.level))
                                   FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid AND u.is_active = TRUE
                        GROUP BY u.id, u.email
                        """
                    ),
                    {"uid": uid},
                ).fetchone()
            if not row:
                return
            import json as _json
            roles = _json.loads(row.roles) if row.roles else []
            user_info = {'user_id': row.id, 'email': row.email, 'roles': roles, 'token_payload': payload}

            # Populate request context
            g.user = user_info
            g.user_id = user_info.get('user_id')
            g.user_roles = user_info.get('roles', [])

            # Opportunistic refresh if access token is near expiry
            try:
                _attempt_refresh_if_needed(auth_manager, user_info)
            except Exception as e:
                logger.debug(f"Auto-refresh check skipped: {e}")
        except Exception as e:
            logger.debug(f"Auth middleware skipping due to error: {e}")

    @app.after_request
    def _attach_cookies(resp):
        try:
            if getattr(g, '_auth_set_cookie', None):
                from services.auth.cookies import set_auth
                at, rt, ttl = g._auth_set_cookie
                set_auth(resp, at, rt, int(ttl))
                logger.debug("Auth middleware attached refreshed cookies")
                del g._auth_set_cookie
        except Exception as e:
            logger.debug(f"Cookie attach error: {e}")
        return resp


def _attempt_refresh_if_needed(auth_manager, user_info) -> None:
    """If access token expires soon and a refresh cookie is available, rotate it.

    This does not raise on failure; it's best-effort to smooth UX.
    """
    from services.auth.token_manager_v5 import TokenManagerV5
    verify_v5 = TokenManagerV5().verify_token
    from services.auth.sessions import rotate_or_reject

    # How soon to refresh before expiry (seconds)
    refresh_window = int(__import__('os').getenv('ACCESS_REFRESH_WINDOW_SECONDS', '120'))

    payload = user_info.get('token_payload') or {}
    exp: Optional[int] = payload.get('exp')
    uid: Optional[str] = payload.get('user_id') or payload.get('uid')
    if not exp or not uid:
        return
    now = int(time.time())
    if (exp - now) > refresh_window:
        return  # not near expiry

    # Need a valid refresh token cookie
    rt = request.cookies.get('refresh_token')
    if not rt:
        return
    rt_payload = verify_v5(rt)
    if not rt_payload or rt_payload.get('type') != 'refresh':
        return

    sid = rt_payload.get('sid')
    fid = rt_payload.get('fid')
    if not sid or not fid:
        return

    ua = request.headers.get('User-Agent')
    rotate_res = rotate_or_reject(
        auth_manager.db,
        user_id=uid,
        provided_refresh=rt,
        sid=sid,
        fid=fid,
        user_agent=ua,
        ip=_client_ip(),
        ttl_seconds=int(__import__('os').getenv('REFRESH_TTL_SECONDS', str(45 * 24 * 3600))),
    )
    if not rotate_res:
        logger.info("Refresh reuse detected in middleware; family revoked")
        return

    new_sid, new_rt, new_rt_ttl = rotate_res

    # Mint a new access token using TokenManagerV5 for consistent claims
    tm = TokenManagerV5()

    # Query roles + email to mint an access token
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
            {"uid": uid},
        ).fetchone()
    email = row.email if row else ''
    import json as _json
    roles = _json.loads(row.roles) if row and row.roles else []
    new_access, access_ttl = tm.mint_access_token(uid, email, roles)

    # Stash into Flask g; the registered after_request will apply cookies
    g._auth_set_cookie = (new_access, new_rt, access_ttl)


def _client_ip() -> Optional[str]:
    # Common proxy headers
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        try:
            return xff.split(",")[0].strip()
        except Exception:
            return xff
    xrip = request.headers.get("X-Real-IP")
    if xrip:
        return xrip
    return request.remote_addr
