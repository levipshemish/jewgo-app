import os
from typing import Tuple


def _cookie_security() -> Tuple[bool, str, str | None]:
    """Return (secure, samesite, domain) for cookies based on environment."""
    try:
        from config.settings import ENVIRONMENT
    except Exception:
        ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    secure = ENVIRONMENT == "production"
    # Cross-site requests from jewgo.app -> api.jewgo.app need SameSite=None
    # Default to None in production, Lax otherwise (can be overridden)
    samesite = os.getenv("COOKIE_SAMESITE",
                         "None" if ENVIRONMENT == "production" else "Lax")
    domain = os.getenv("COOKIE_DOMAIN")
    return secure, samesite, domain


def set_auth(response, access_token: str, refresh_token: str, access_expires_in: int) -> None:
    """Set HttpOnly auth cookies on a Flask response object."""
    secure, samesite, domain = _cookie_security()
    refresh_ttl = int(os.getenv("REFRESH_TTL_SECONDS", str(45 * 24 * 3600)))

    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=int(access_expires_in),
        domain=domain,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=refresh_ttl,
        domain=domain,
    )


def clear_auth(response) -> None:
    """Clear all known auth cookies (new and legacy)."""
    secure, samesite, domain = _cookie_security()
    for name in [
        "access_token",
        "refresh_token",
        "auth_access_token",
        "auth_refresh_token",
    ]:
        response.set_cookie(
            name,
            "",
            max_age=0,
            httponly=True,
            secure=secure,
            samesite=samesite,
            domain=domain,
        )
