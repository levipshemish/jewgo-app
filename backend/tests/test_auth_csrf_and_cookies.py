from flask import Flask, make_response, Request
from services.auth import csrf, cookies


def test_csrf_issue_and_validate(monkeypatch):
    app = Flask(__name__)
    with app.test_request_context("/api/auth/csrf"):
        resp = make_response("")
        token = csrf.issue(resp)
        assert token and isinstance(token, str)
        # simulate a follow-up request with header and cookie
        headers = {
            "X-CSRF-Token": token,
            "Cookie": f"{csrf.CSRF_COOKIE_NAME}={token}",
        }
        with app.test_request_context("/some", headers=headers):
            from flask import request as _req
            assert csrf.validate(_req) is True


def test_cookies_set_and_clear(monkeypatch):
    app = Flask(__name__)
    with app.app_context():
        resp = make_response("")
        cookies.set_auth(resp, "access", "refresh", 3600)
        # Should have at least two Set-Cookie headers
        set_cookie_headers = [v for k, v in resp.headers.items() if k.lower() == "set-cookie"]
        assert any("access_token=" in v for v in set_cookie_headers)
        assert any("refresh_token=" in v for v in set_cookie_headers)

        # Clear
        resp2 = make_response("")
        cookies.clear_auth(resp2)
        cleared_headers = [v for k, v in resp2.headers.items() if k.lower() == "set-cookie"]
        assert any("access_token=" in v and "Max-Age=0" in v for v in cleared_headers)
        assert any("refresh_token=" in v and "Max-Age=0" in v for v in cleared_headers)
