import os
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional


ALG = "HS256"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _secret() -> str:
    key = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET")
    if not key:
        raise RuntimeError("JWT_SECRET_KEY is required")
    return key


def _access_ttl_seconds(is_guest: bool = False) -> int:
    # Default 15 minutes, allow override
    try:
        return int(os.getenv("ACCESS_TTL_SECONDS", "900"))
    except Exception:
        return 900


def _refresh_ttl_seconds(is_guest: bool = False) -> int:
    # Default 45 days, allow override. Guests default 7 days if not overridden.
    if is_guest:
        return int(os.getenv("GUEST_REFRESH_TTL_SECONDS", str(7 * 24 * 3600)))
    return int(os.getenv("REFRESH_TTL_SECONDS", str(45 * 24 * 3600)))


def mint_access(user_id: str, email: str, roles: list[Dict[str, Any]] | None = None, *, is_guest: bool = False) -> tuple[str, int]:
    ttl = _access_ttl_seconds(is_guest)
    payload: Dict[str, Any] = {
        "type": "access",
        "uid": user_id,
        "email": email,
        "iat": int(_now().timestamp()),
        "exp": int((_now() + timedelta(seconds=ttl)).timestamp()),
        "jti": secrets.token_hex(16),
    }
    if roles:
        payload["roles"] = roles
    token = jwt.encode(payload, _secret(), algorithm=ALG)
    return token, ttl


def mint_refresh(user_id: str, *, sid: str, fid: str, is_guest: bool = False) -> tuple[str, int]:
    ttl = _refresh_ttl_seconds(is_guest)
    payload: Dict[str, Any] = {
        "type": "refresh",
        "uid": user_id,
        "sid": sid,
        "fid": fid,
        "iat": int(_now().timestamp()),
        "exp": int((_now() + timedelta(seconds=ttl)).timestamp()),
        "jti": secrets.token_hex(16),
    }
    token = jwt.encode(payload, _secret(), algorithm=ALG)
    return token, ttl


def verify(token: str, *, expected_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALG])
        if expected_type and payload.get("type") != expected_type:
            return None
        return payload
    except Exception:
        return None

