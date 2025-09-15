from unittest.mock import patch
from flask import Flask


def create_app_with_auth_bp():
    app = Flask(__name__)
    app.config['TESTING'] = True
    from routes.v5.auth_api import auth_bp
    app.register_blueprint(auth_bp)
    return app


def test_verify_email_redirect_success(monkeypatch):
    app = create_app_with_auth_bp()

    # Ensure frontend URL is stable for assertion
    monkeypatch.setenv('FRONTEND_URL', 'http://frontend.example')

    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.verify_email.return_value = True

        client = app.test_client()
        rv = client.get('/api/v5/auth/verify-email?token=ok')
        assert rv.status_code == 302
        assert rv.headers['Location'] == 'http://frontend.example/auth/verify-success'


def test_verify_email_redirect_error(monkeypatch):
    app = create_app_with_auth_bp()
    monkeypatch.setenv('FRONTEND_URL', 'http://frontend.example')

    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.verify_email.return_value = False

        client = app.test_client()
        rv = client.get('/api/v5/auth/verify-email?token=bad')
        assert rv.status_code == 302
        assert rv.headers['Location'] == 'http://frontend.example/auth/verify-error?code=INVALID_OR_EXPIRED'


def test_verify_email_missing_token_redirect(monkeypatch):
    app = create_app_with_auth_bp()
    monkeypatch.setenv('FRONTEND_URL', 'http://frontend.example')

    client = app.test_client()
    rv = client.get('/api/v5/auth/verify-email')
    assert rv.status_code == 302
    assert rv.headers['Location'] == 'http://frontend.example/auth/verify-error?code=MISSING_TOKEN'


def test_forgot_password_accepted(monkeypatch):
    app = create_app_with_auth_bp()
    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.initiate_password_reset.return_value = True
        client = app.test_client()
        rv = client.post('/api/v5/auth/forgot-password', json={'email': 'user@example.com'})
        assert rv.status_code == 200
        assert rv.json['success'] is True


def test_reset_password_flow(monkeypatch):
    app = create_app_with_auth_bp()
    with patch('routes.v5.auth_api.get_postgres_auth') as gpa:
        gpa.return_value.reset_password_with_token.return_value = True
        client = app.test_client()
        rv = client.post('/api/v5/auth/reset-password', json={'token': 't', 'new_password': 'StrongP@ssw0rd!'})
        assert rv.status_code == 200
        assert rv.json['success'] is True

