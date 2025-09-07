"""
High-level authentication helpers bridging routes and low-level services.

These helpers centralize common flows such as extracting tokens from a request,
validating CSRF + reCAPTCHA, and creating an authenticated response that issues
cookies and persists session metadata.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from flask import jsonify, request as flask_request

from utils.logging_config import get_logger

logger = get_logger(__name__)


def extract_token_from_request(request=flask_request) -> Optional[str]:
    """Extract Bearer token from Authorization header or access_token cookie."""
    # Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        if token:
            return token
    # Cookie fallback
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None


def validate_auth_request(
    request=flask_request,
    *,
    enforce_recaptcha: bool = False,
) -> Tuple[bool, Optional[Any]]:
    """Validate CSRF and (optionally) reCAPTCHA for auth-sensitive endpoints.

    Returns a tuple of (is_valid, error_response). On success, error_response is None.
    """
    from services.auth import csrf_validate, verify_recaptcha_or_429

    # CSRF: double-submit cookie/header
    try:
        if not csrf_validate(request):
            logger.warning("CSRF validation failed")
            return False, jsonify({"error": "CSRF validation failed"}), 403
    except Exception as e:  # best-effort
        logger.warning(f"CSRF validation error: {e}")
        return False, jsonify({"error": "CSRF validation error"}), 400

    # reCAPTCHA: enforce when requested or when token provided in body/headers
    try:
        wants_recaptcha = enforce_recaptcha
        token_body = None
        try:
            data = request.get_json(silent=True) or {}
            token_body = (data or {}).get("recaptcha_token")
        except Exception:
            pass
        token_hdr = request.headers.get("X-Recaptcha-Token")

        if wants_recaptcha or token_body or token_hdr:
            err = verify_recaptcha_or_429(request)
            if err is not None:
                return False, err
    except Exception as e:
        # Do not hard-fail in non-production due to network/secret issues
        logger.debug(f"reCAPTCHA verification skipped: {e}")

    return True, None


def create_authenticated_response(
    response,
    *,
    auth_manager,
    user_id: str,
    email: str,
    roles: list[Dict[str, Any]] | None,
    is_guest: bool = False,
    request=flask_request,
) -> Tuple[Dict[str, Any], int]:
    """Issue cookies + persist session and return tokens for optional JSON body.

    This is a thin wrapper over services.auth.create_auth_response.
    """
    from services.auth import create_auth_response as _create

    ua = request.headers.get("User-Agent")
    ip = _get_client_ip(request)
    return _create(
        response,
        db_manager=auth_manager.db,
        user_id=user_id,
        email=email,
        roles=roles or [],
        is_guest=is_guest,
        user_agent=ua,
        ip=ip,
    )


def _get_client_ip(request=flask_request) -> Optional[str]:
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


def get_client_ip(request=flask_request) -> Optional[str]:
    """Public helper to get the client IP (proxy-aware)."""
    return _get_client_ip(request)


def build_user_payload(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize user info shape for API responses."""
    return {
        "id": user_info.get("user_id"),
        "name": user_info.get("name"),
        "email": user_info.get("email"),
        "email_verified": user_info.get("email_verified"),
        "roles": user_info.get("roles", []),
    }
