import types
from contextlib import contextmanager
from unittest.mock import patch

from flask import Flask, g


class _DummySession:
    def __init__(self, row):
        self._row = row

    def execute(self, *args, **kwargs):
        class _Res:
            def __init__(self, row):
                self._row = row

            def fetchone(self):
                return self._row

        return _Res(self._row)


class _DummyRow:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)


class _DummyConnMgr:
    @contextmanager
    def session_scope(self):
        yield _DummySession(
            _DummyRow(
                id="user-123",
                email="user@example.com",
                name="Test User",
                email_verified=True,
                roles='[]',
            )
        )


class _DummyDB:
    def __init__(self):
        self.connection_manager = _DummyConnMgr()


class _DummyAuthMgr:
    def __init__(self):
        self.db = _DummyDB()


def _dummy_postgres_auth():
    return _DummyAuthMgr()


def _dummy_valid_access_payload():
    return {
        "type": "access",
        "uid": "user-123",
        "email": "user@example.com",
        "jti": "abc123",
        "iss": "jewgo.app",
        "aud": "jewgo.app",
        "exp": 9999999999,
        "iat": 1,
    }


def test_auth_v5_middleware_verifies_with_v5_and_populates_context():
    app = Flask(__name__)

    with patch("middleware.auth_v5.TokenManagerV5") as TM, \
        patch("middleware.auth_v5.get_postgres_auth", _dummy_postgres_auth):
        TM.return_value.verify_token.return_value = _dummy_valid_access_payload()

        from middleware.auth_v5 import AuthV5Middleware

        AuthV5Middleware(app)
        with app.test_request_context("/api/v5/test", headers={"Authorization": "Bearer token"}):
            # Trigger before_request hook
            for func in app.before_request_funcs.get(None, []):
                func()
            assert getattr(g, "user_id", None) == "user-123"
            assert isinstance(getattr(g, "user_roles", []), list)


def test_auth_middleware_verifies_with_v5_and_populates_context():
    app = Flask(__name__)

    with patch("middleware.auth_middleware.TokenManagerV5") as TM, \
        patch("middleware.auth_middleware.get_postgres_auth", _dummy_postgres_auth):
        TM.return_value.verify_token.return_value = _dummy_valid_access_payload()

        from middleware.auth_middleware import register_auth_middleware

        register_auth_middleware(app)
        with app.test_request_context("/api/v4/test", headers={"Authorization": "Bearer token"}):
            for func in app.before_request_funcs.get(None, []):
                func()
            assert getattr(g, "user_id", None) == "user-123"


def test_rbac_require_auth_uses_v5_verification_and_db_load():
    app = Flask(__name__)

    with patch("utils.rbac.TokenManagerV5") as TM, \
        patch("utils.rbac.get_postgres_auth", _dummy_postgres_auth):
        TM.return_value.verify_token.return_value = _dummy_valid_access_payload()

        from utils.rbac import require_auth

        @app.route("/secure")
        @require_auth
        def secure():
            return "ok", 200

        client = app.test_client()
        rv = client.get("/secure", headers={"Authorization": "Bearer token"})
        assert rv.status_code == 200


def test_invalid_token_results_in_unauthenticated():
    app = Flask(__name__)

    with patch("middleware.auth_v5.TokenManagerV5") as TM:
        TM.return_value.verify_token.return_value = None
        from middleware.auth_v5 import AuthV5Middleware

        AuthV5Middleware(app)
        with app.test_request_context("/api/v5/test", headers={"Authorization": "Bearer bad"}):
            for func in app.before_request_funcs.get(None, []):
                func()
            assert getattr(g, "user_id", None) is None

