import json
from flask import Flask


def generate_rsa_jwk_pair(kid: str = "testkid"):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from jwt.algorithms import RSAAlgorithm

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    # JWK as dict
    jwk_json = RSAAlgorithm.to_jwk(public_key)
    jwk = json.loads(jwk_json)
    jwk["kid"] = kid
    return private_key, {"keys": [jwk]}


def make_app():
    app = Flask(__name__)
    from routes.auth_api import auth_bp

    app.register_blueprint(auth_bp)
    return app


class DummyResp:
    def __init__(self, status_code=200, data=None):
        self.status_code = status_code
        self._data = data or {}

    def json(self):
        return self._data


def test_google_oauth_callback_success(monkeypatch):
    # Env setup
    monkeypatch.setenv("JWT_SECRET_KEY", "test_secret")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "client-secret")

    # Prepare JWKS and id_token
    priv, jwks = generate_rsa_jwk_pair()

    # Mock JWKS fetch
    import routes.auth_api as auth_api

    monkeypatch.setattr(auth_api, "_get_google_jwks", lambda: jwks)

    # Build id_token
    import jwt as pyjwt
    claims = {
        "iss": "https://accounts.google.com",
        "aud": "client-id",
        "sub": "google-sub-123",
        "email": "oauth.user@example.com",
        "name": "OAuth User",
    }
    id_token = pyjwt.encode(claims, priv, algorithm="RS256", headers={"kid": jwks["keys"][0]["kid"]})

    # Mock token exchange
    def fake_post(url, data=None, timeout=10):
        assert "oauth2.googleapis.com/token" in url
        return DummyResp(200, {
            "access_token": "ga",
            "refresh_token": "gr",
            "id_token": id_token,
            "expires_in": 3600,
            "token_type": "Bearer",
        })

    import requests
    monkeypatch.setattr(requests, "post", fake_post)

    # Patch auth manager getter to return a dummy with a minimal DB interface
    class _DummySession:
        def execute(self, *args, **kwargs):
            # Allow any SQL statement; act as if user insert/select works
            class R:
                def fetchone(self_inner):
                    return None  # force user creation path
            return R()

    class _DummyConnMgr:
        def __enter__(self):
            return _DummySession()

        def __exit__(self, exc_type, exc, tb):
            return False

    class _DummyDB:
        class connection_manager:  # noqa: N801
            def __init__(self):
                self._cm = _DummyConnMgr()

            def session_scope(self):
                return self._cm

    class _DummyAuth:
        def __init__(self):
            self.db = _DummyDB()

    monkeypatch.setattr(auth_api, "get_postgres_auth", lambda: _DummyAuth())

    # Build state (signed)
    state = auth_api._sign_state({"cv": "code-verifier", "ts": 0, "nonce": "n"})

    app = make_app()
    with app.test_client() as client:
        resp = client.get(f"/api/auth/oauth/google/callback?code=abc&state={state}&returnTo=%2F")
        # Should redirect and set cookies
        assert resp.status_code in (302, 303)
        set_cookie_headers = [v for k, v in resp.headers.items() if k.lower() == "set-cookie"]
        assert any("access_token=" in v for v in set_cookie_headers)
        assert any("refresh_token=" in v for v in set_cookie_headers)

