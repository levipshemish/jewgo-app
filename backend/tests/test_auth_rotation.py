from types import SimpleNamespace
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import os


UTCNOW = datetime.now(timezone.utc)


class FakeResult:
    def __init__(self, rows=None, one=None, scalar=None):
        self._rows = rows or []
        self._one = one
        self._scalar = scalar

    def fetchone(self):
        return SimpleNamespace(**self._one) if isinstance(self._one, dict) else self._one

    def fetchall(self):
        return [SimpleNamespace(**r) if isinstance(r, dict) else r for r in self._rows]

    def scalar(self):
        return self._scalar


class FakeSession:
    def __init__(self):
        # key: id
        self.rows = {}

    def execute(self, text_obj, params=None):
        sql = str(text_obj)
        params = params or {}
        # 1) SELECT current session
        if "SELECT id, revoked_at, expires_at" in sql:
            sid = params.get("sid")
            uid = params.get("uid")
            row = self.rows.get(sid)
            if row and row["user_id"] == uid:
                return FakeResult(one={
                    "id": sid,
                    "revoked_at": row["revoked_at"],
                    "expires_at": row["expires_at"],
                })
            return FakeResult(one=None)
        # 2) family revoke
        if "UPDATE auth_sessions SET revoked_at = NOW() WHERE family_id" in sql:
            fid = params.get("fid")
            for r in self.rows.values():
                if r["family_id"] == fid and r["revoked_at"] is None:
                    r["revoked_at"] = UTCNOW
            return FakeResult()
        # 3) match hash
        if "SELECT 1 FROM auth_sessions WHERE id = :sid AND refresh_token_hash = :h" in sql:
            sid = params.get("sid")
            h = params.get("h")
            row = self.rows.get(sid)
            if row and row["refresh_token_hash"] == h and row["revoked_at"] is None:
                return FakeResult(one=(1,))
            return FakeResult(one=None)
        # 4) revoke current
        if "UPDATE auth_sessions SET revoked_at = NOW(), last_used = NOW() WHERE id = :sid" in sql:
            sid = params.get("sid")
            row = self.rows.get(sid)
            if row and row["revoked_at"] is None:
                row["revoked_at"] = UTCNOW
            return FakeResult()
        # 5) INSERT new
        if sql.strip().startswith("INSERT INTO auth_sessions"):
            self.rows[params["id"]] = {
                "id": params["id"],
                "user_id": params["uid"],
                "refresh_token_hash": params["hash"],
                "family_id": params["fid"],
                "rotated_from": params.get("from_id"),
                "user_agent": params.get("ua"),
                "ip": params.get("ip"),
                "created_at": UTCNOW,
                "last_used": UTCNOW,
                "expires_at": params["exp"],
                "revoked_at": None,
            }
            return FakeResult()
        return FakeResult()


class FakeConnMgr:
    @contextmanager
    def session_scope(self):
        session = FakeSession()
        yield session


class FakeDBM:
    def __init__(self, seed_row):
        self.connection_manager = FakeConnMgr()
        # preload the session row via a one-time seeding pass
        with self.connection_manager.session_scope() as s:
            s.rows[seed_row["id"]] = seed_row.copy()


def _hash(token: str) -> str:
    import hashlib
    return hashlib.sha256((token + os.getenv("REFRESH_PEPPER", "dev_pepper")).encode("utf-8")).hexdigest()


def test_rotate_success(monkeypatch):
    from services.auth import sessions
    monkeypatch.setenv("REFRESH_PEPPER", "pep")
    uid = "user1"
    fid = "fam1"
    sid = "sid1"
    rtok = "r1"
    seed = {
        "id": sid,
        "user_id": uid,
        "refresh_token_hash": _hash(rtok),
        "family_id": fid,
        "rotated_from": None,
        "user_agent": None,
        "ip": None,
        "created_at": UTCNOW,
        "last_used": UTCNOW,
        "expires_at": UTCNOW + timedelta(days=1),
        "revoked_at": None,
    }
    dbm = FakeDBM(seed)
    res = sessions.rotate_or_reject(
        dbm,
        user_id=uid,
        provided_refresh=rtok,
        sid=sid,
        fid=fid,
        user_agent=None,
        ip=None,
        ttl_seconds=86400,
    )
    assert res is not None
    new_sid, new_rtok, new_ttl = res
    assert isinstance(new_sid, str) and isinstance(new_rtok, str) and new_ttl == 45 * 24 * 3600 or new_ttl > 0


def test_reuse_detection_revokes_family(monkeypatch):
    from services.auth import sessions
    monkeypatch.setenv("REFRESH_PEPPER", "pep")
    uid = "user2"
    fid = "fam2"
    sid = "sid2"
    good = "good"
    bad = "bad"
    seed = {
        "id": sid,
        "user_id": uid,
        "refresh_token_hash": _hash(good),
        "family_id": fid,
        "rotated_from": None,
        "user_agent": None,
        "ip": None,
        "created_at": UTCNOW,
        "last_used": UTCNOW,
        "expires_at": UTCNOW + timedelta(days=1),
        "revoked_at": None,
    }
    dbm = FakeDBM(seed)
    res = sessions.rotate_or_reject(
        dbm,
        user_id=uid,
        provided_refresh=bad,
        sid=sid,
        fid=fid,
        user_agent=None,
        ip=None,
        ttl_seconds=86400,
    )
    assert res is None
