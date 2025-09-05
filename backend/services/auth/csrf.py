import os
import secrets
from functools import wraps
from typing import Callable


CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_CANDIDATES = [
    "X-CSRF-Token",
    "X-CSRFToken",
    "X-XSRF-TOKEN",
]


def _cookie_security():
    try:
        from config.settings import ENVIRONMENT
    except Exception:
        ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    secure = ENVIRONMENT == "production"
    samesite = "Lax"
    domain = os.getenv("COOKIE_DOMAIN")
    return secure, samesite, domain


def issue(response):
    """Issue a non-HttpOnly CSRF cookie and return the token."""
    token = secrets.token_urlsafe(32)
    secure, samesite, domain = _cookie_security()
    ttl = int(os.getenv("CSRF_TTL_SECONDS", "7200"))  # default 2 hours
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        max_age=ttl,
        domain=domain,
    )
    return token


def _extract_header_token(request) -> str | None:
    for header in CSRF_HEADER_CANDIDATES:
        value = request.headers.get(header)
        if value:
            return value
    return None


def validate(request) -> bool:
    """Validate that header token matches cookie token (double-submit)."""
    header_token = _extract_header_token(request)
    if not header_token:
        return False
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    if not cookie_token:
        return False
    return secrets.compare_digest(str(header_token), str(cookie_token))


def protect(f: Callable):
    """Decorator to enforce CSRF on mutating methods when enabled.

    CSRF is enforced if CSRF_ENABLED=true or ENVIRONMENT=production. In other
    cases (e.g., local dev), it is skipped to avoid development friction.
    """

    @wraps(f)
    def wrapper(*args, **kwargs):
        from flask import request, jsonify

        method = request.method.upper()
        unsafe = method in {"POST", "PUT", "PATCH", "DELETE"}
        env = os.getenv("ENVIRONMENT", "development").lower()
        enabled = os.getenv("CSRF_ENABLED", "false").lower() == "true" or env == "production"

        if unsafe and enabled:
            if not validate(request):
                return (
                    jsonify({"error": "CSRF token missing or invalid"}),
                    429,
                )
        return f(*args, **kwargs)

    return wrapper

