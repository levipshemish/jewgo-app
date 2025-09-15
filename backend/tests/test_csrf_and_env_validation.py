from unittest.mock import patch
from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    from routes.v5.auth_api import auth_bp
    app.register_blueprint(auth_bp)
    return app


def test_csrf_required_for_forgot_password(monkeypatch):
    app = create_app()
    client = app.test_client()

    # Without CSRF header -> expect 403
    rv = client.post('/api/v5/auth/forgot-password', json={"email": "user@example.com"})
    assert rv.status_code == 403

    # Get CSRF token + cookie
    rv2 = client.get('/api/v5/auth/csrf')
    assert rv2.status_code == 200
    csrf_token = rv2.json['data']['csrf_token']

    # With CSRF header and cookie -> expect 200 (mock service)
    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.initiate_password_reset.return_value = True
        rv3 = client.post(
            '/api/v5/auth/forgot-password',
            json={"email": "user@example.com"},
            headers={'X-CSRF-Token': csrf_token}
        )
        assert rv3.status_code == 200


def test_csrf_required_for_reset_password(monkeypatch):
    app = create_app()
    client = app.test_client()

    # Missing CSRF -> 403
    rv = client.post('/api/v5/auth/reset-password', json={"token": "t", "new_password": "StrongP@ss1!"})
    assert rv.status_code == 403

    # Fetch CSRF token
    rv2 = client.get('/api/v5/auth/csrf')
    assert rv2.status_code == 200
    token = rv2.json['data']['csrf_token']

    # With CSRF -> 200
    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.reset_password_with_token.return_value = True
        rv3 = client.post(
            '/api/v5/auth/reset-password',
            json={"token": "t", "new_password": "StrongP@ss1!"},
            headers={'X-CSRF-Token': token}
        )
        assert rv3.status_code == 200


def test_env_validation_includes_jwt_and_pepper(monkeypatch):
    # Minimal env setup for production checks
    monkeypatch.setenv('FLASK_ENV', 'production')
    monkeypatch.delenv('JWT_SECRET_KEY', raising=False)
    monkeypatch.delenv('JWT_ISSUER', raising=False)
    monkeypatch.delenv('JWT_AUDIENCE', raising=False)
    monkeypatch.delenv('REFRESH_PEPPER', raising=False)
    
    from utils.config_validator import ConfigValidator
    v = ConfigValidator()
    v.validate_all()
    # Ensure the new keys are flagged when missing
    missing = {e['key'] for e in v.errors}
    assert 'JWT_SECRET_KEY' in missing
    assert 'JWT_ISSUER' in missing
    assert 'JWT_AUDIENCE' in missing
    assert 'REFRESH_PEPPER' in missing

