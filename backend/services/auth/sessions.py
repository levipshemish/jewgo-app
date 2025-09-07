import os
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple


def _now():
    return datetime.now(timezone.utc)


def _pepper() -> str:
    p = os.getenv("REFRESH_PEPPER")
    # In production, require an explicit pepper
    if not p and os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise RuntimeError("REFRESH_PEPPER is required in production")
    return p or "dev_pepper"


def _hash_refresh(token: str) -> str:
    return hashlib.sha256((token + _pepper()).encode("utf-8")).hexdigest()


def new_family_id() -> str:
    return str(uuid.uuid4())


def new_session_id() -> str:
    return str(uuid.uuid4())


def persist_initial(db_manager, *, user_id: str, refresh_token: str, sid: str, fid: str, user_agent: Optional[str], ip: Optional[str], ttl_seconds: int) -> None:
    from sqlalchemy import text
    expires_at = _now() + timedelta(seconds=ttl_seconds)
    token_hash = _hash_refresh(refresh_token)
    with db_manager.connection_manager.session_scope() as session:
        session.execute(
            text(
                """
                INSERT INTO auth_sessions (id, user_id, refresh_token_hash, family_id, rotated_from, user_agent, ip, created_at, last_used, expires_at)
                VALUES (:id, :uid, :hash, :fid, NULL, :ua, :ip, NOW(), NOW(), :exp)
                """
            ),
            {
                "id": sid,
                "uid": user_id,
                "hash": token_hash,
                "fid": fid,
                "ua": user_agent,
                "ip": ip,
                "exp": expires_at,
            },
        )


def rotate_or_reject(db_manager, *, user_id: str, provided_refresh: str, sid: str, fid: str, user_agent: Optional[str], ip: Optional[str], ttl_seconds: int) -> Optional[Tuple[str, str, int]]:
    """Atomically rotate refresh session or revoke family on reuse.

    Returns (new_sid, new_refresh_token, new_refresh_ttl) or None if reuse detected/rejected.
    """
    from sqlalchemy import text
    token_hash = _hash_refresh(provided_refresh)
    now = _now()
    with db_manager.connection_manager.session_scope() as session:
        # Verify the session row matches presented token and is not revoked/expired
        row = session.execute(
            text(
                """
                SELECT id, revoked_at, expires_at
                FROM auth_sessions
                WHERE id = :sid AND user_id = :uid
                """
            ),
            {"sid": sid, "uid": user_id},
        ).fetchone()

        if not row:
            # Unknown session id: revoke entire family defensively
            session.execute(text("UPDATE auth_sessions SET revoked_at = NOW() WHERE family_id = :fid AND revoked_at IS NULL"), {"fid": fid})
            return None

        if row.revoked_at is not None or row.expires_at <= now:
            # Reuse or expired; revoke family
            session.execute(text("UPDATE auth_sessions SET revoked_at = NOW() WHERE family_id = :fid AND revoked_at IS NULL"), {"fid": fid})
            return None

        # Check hash match to detect misuse
        real = session.execute(
            text("SELECT 1 FROM auth_sessions WHERE id = :sid AND refresh_token_hash = :h AND revoked_at IS NULL"),
            {"sid": sid, "h": token_hash},
        ).fetchone()
        if not real:
            # Provided token does not match stored hash: revoke family
            session.execute(text("UPDATE auth_sessions SET revoked_at = NOW() WHERE family_id = :fid AND revoked_at IS NULL"), {"fid": fid})
            return None

        # Rotate: revoke current and create new session in same family
        session.execute(
            text("UPDATE auth_sessions SET revoked_at = NOW(), last_used = NOW() WHERE id = :sid AND revoked_at IS NULL"),
            {"sid": sid},
        )

        # Create new session id and token
        new_sid = new_session_id()
        # The caller will mint the new refresh token so we can hash it here after they pass it back
        # For simplicity, mint here to keep rotation atomic
        from .tokens import mint_refresh

        new_token, new_ttl = mint_refresh(user_id, sid=new_sid, fid=fid)
        new_hash = _hash_refresh(new_token)
        expires_at = now + timedelta(seconds=new_ttl)

        session.execute(
            text(
                """
                INSERT INTO auth_sessions (id, user_id, refresh_token_hash, family_id, rotated_from, user_agent, ip, created_at, last_used, expires_at)
                VALUES (:id, :uid, :hash, :fid, :from_id, :ua, :ip, NOW(), NOW(), :exp)
                """
            ),
            {
                "id": new_sid,
                "uid": user_id,
                "hash": new_hash,
                "fid": fid,
                "from_id": sid,
                "ua": user_agent,
                "ip": ip,
                "exp": expires_at,
            },
        )

        return new_sid, new_token, new_ttl


def revoke_family(db_manager, *, fid: str) -> None:
    from sqlalchemy import text
    with db_manager.connection_manager.session_scope() as session:
        session.execute(text("UPDATE auth_sessions SET revoked_at = NOW() WHERE family_id = :fid AND revoked_at IS NULL"), {"fid": fid})
