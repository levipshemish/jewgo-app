from flask import Flask, jsonify, g


def make_app_with_admin_route(monkeypatch, level):
    app = Flask(__name__)
    from utils import security

    # Monkeypatch require_auth to inject roles into g and pass through
    def fake_require_auth(f):
        def wrapper(*args, **kwargs):
            g.user = {"user_id": "u1", "email": "u@example.com"}
            g.user_id = "u1"
            g.user_roles = [{"role": "admin", "level": level}]
            return f(*args, **kwargs)

        return wrapper

    monkeypatch.setattr(security, "require_auth", fake_require_auth)

    @app.route("/admin/protected")
    @security.require_admin("admin")
    def protected():
        return jsonify({"ok": True})

    return app


def test_admin_route_allows_admin(monkeypatch):
    app = make_app_with_admin_route(monkeypatch, level=10)
    with app.test_client() as client:
        resp = client.get("/admin/protected")
        assert resp.status_code == 200
        assert resp.get_json().get("ok") is True


def test_admin_route_denies_non_admin(monkeypatch):
    app = make_app_with_admin_route(monkeypatch, level=1)
    with app.test_client() as client:
        resp = client.get("/admin/protected")
        # require_role_level returns 403 via utils.rbac if level insufficient; our wrapper returns JSON error
        assert resp.status_code in (401, 403)

