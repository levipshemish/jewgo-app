"""
Authentication services facade.

This package aggregates the low-level authentication service modules and
exposes convenient, high-level helpers so other parts of the application
can import from `services.auth` directly.

Exports:
- Tokens: `mint_access`, `mint_refresh`, `verify`
- Sessions: `new_family_id`, `new_session_id`, `persist_initial`,
  `rotate_or_reject`, `revoke_family`
- Cookies: `set_auth`, `clear_auth`
- CSRF: `csrf_issue`, `csrf_validate`, `csrf_protect`
- reCAPTCHA: `verify_recaptcha_or_429` (best-effort import)

Convenience helpers:
- `create_auth_response(...)`
- `verify_request_auth(...)`
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from .tokens import mint_access, mint_refresh, verify
from .sessions import (
    new_family_id,
    new_session_id,
    persist_initial,
    rotate_or_reject,
    revoke_family,
)
from .cookies import set_auth, clear_auth
from .csrf import issue as csrf_issue, validate as csrf_validate, protect as csrf_protect

try:  # Optional at import-time in some environments
    from .recaptcha import verify_or_429 as verify_recaptcha_or_429  # type: ignore
except Exception:  # pragma: no cover - fallback
    def verify_recaptcha_or_429(_request):  # type: ignore
        return None


def create_auth_response(
    response,
    *,
    db_manager,
    user_id: str,
    email: str,
    roles: list[Dict[str, Any]] | None,
    is_guest: bool = False,
    user_agent: Optional[str] = None,
    ip: Optional[str] = None,
) -> Tuple[Dict[str, Any], int]:
    """Mint tokens, persist session, and set HttpOnly cookies on the response.

    Returns a tuple of (tokens_dict, access_ttl_seconds) for optional JSON body use.
    """
    # Create new session family + ids
    fid = new_family_id()
    sid = new_session_id()

    refresh_token, refresh_ttl = mint_refresh(user_id, sid=sid, fid=fid, is_guest=is_guest)
    # Persist initial session in DB (refresh token hash + metadata)
    persist_initial(
        db_manager,
        user_id=user_id,
        refresh_token=refresh_token,
        sid=sid,
        fid=fid,
        user_agent=user_agent,
        ip=ip,
        ttl_seconds=refresh_ttl,
    )

    access_token, access_ttl = mint_access(user_id, email, roles or [], is_guest=is_guest)

    # Set cookie headers onto response
    set_auth(response, access_token, refresh_token, access_ttl)

    tokens = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": access_ttl,
    }
    return tokens, access_ttl


def verify_request_auth(request) -> Optional[Dict[str, Any]]:
    """Extract an access token from Authorization header or cookies and verify it.

    Returns the JWT payload dict when valid; otherwise None.
    """
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        return None
    return verify(token, expected_type="access")


__all__ = [
    # tokens
    "mint_access",
    "mint_refresh",
    "verify",
    # sessions
    "new_family_id",
    "new_session_id",
    "persist_initial",
    "rotate_or_reject",
    "revoke_family",
    # cookies
    "set_auth",
    "clear_auth",
    # csrf
    "csrf_issue",
    "csrf_validate",
    "csrf_protect",
    # recaptcha
    "verify_recaptcha_or_429",
    # helpers
    "create_auth_response",
    "verify_request_auth",
]

