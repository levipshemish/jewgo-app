import importlib
import pytest


def make_client(monkeypatch, role='super_admin', authed=True):
    # Patch decorators and current user
    sec = importlib.import_module('backend.utils.security')
    api_v4 = importlib.import_module('backend.routes.api_v4')

    def passthrough(f):
        return f

    monkeypatch.setattr(sec, 'require_admin_auth', passthrough, raising=False)

    def get_user():
        if not authed:
            return None
        return { 'id': 'admin-1', 'email': 'admin@example.com', 'role': role, 'adminRole': role }

    monkeypatch.setattr(api_v4, 'get_current_supabase_user', get_user, raising=False)

    from backend.app_factory_full import create_app
    app, socketio = create_app()  # Unpack the tuple
    app.config['TESTING'] = True
    return app.test_client()


class MockSvc:
    def __init__(self, ok=True):
        self.ok = ok
    def assign_user_role(self, **kwargs):
        return { 'success': True } if self.ok else { 'success': False, 'error': 'Failed', 'error_type': 'conflict', 'status_code': 409 }
    def revoke_user_role(self, **kwargs):
        return { 'success': True } if self.ok else { 'success': False, 'error': 'Failed', 'error_type': 'not_found', 'status_code': 404 }
    def get_user_roles(self, **kwargs):
        return { 'users': [], 'total': 0, 'page': 1, 'limit': kwargs.get('limit', 50), 'has_more': False }
    def get_available_roles(self):
        return [ { 'name': 'moderator', 'level': 1 } ]
    def get_active_super_admin_count(self):
        return 2


def test_assign_happy_path(monkeypatch):
    api_v4 = importlib.import_module('backend.routes.api_v4')
    monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockSvc(True), raising=False)
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/assign', json={'user_id':'u','role':'moderator'})
    assert resp.status_code == 200


def test_assign_invalid_role(monkeypatch):
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/assign', json={'user_id':'u','role':'invalid'})
    assert resp.status_code == 400


def test_assign_non_super_admin_forbidden(monkeypatch):
    c = make_client(monkeypatch, 'moderator', True)
    resp = c.post('/api/v4/admin/roles/assign', json={'user_id':'u','role':'moderator'})
    assert resp.status_code == 403


def test_assign_missing_body(monkeypatch):
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/assign', data='')
    assert resp.status_code == 400


def test_revoke_happy_path(monkeypatch):
    api_v4 = importlib.import_module('backend.routes.api_v4')
    monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockSvc(True), raising=False)
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/revoke', json={'user_id':'u','role':'moderator'})
    assert resp.status_code == 200


def test_revoke_self_super_admin_blocked(monkeypatch):
    # current user id will be admin-1 from make_client; try revoking same
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/revoke', json={'user_id':'admin-1','role':'super_admin'})
    assert resp.status_code == 409


def test_revoke_last_super_admin_blocked(monkeypatch):
    api_v4 = importlib.import_module('backend.routes.api_v4')
    svc = MockSvc(True)
    svc.get_active_super_admin_count = lambda: 1
    monkeypatch.setattr(api_v4, 'create_user_service', lambda: svc, raising=False)
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.post('/api/v4/admin/roles/revoke', json={'user_id':'u','role':'super_admin'})
    assert resp.status_code == 409


def test_revoke_unauthenticated(monkeypatch):
    c = make_client(monkeypatch, 'super_admin', authed=False)
    resp = c.post('/api/v4/admin/roles/revoke', json={'user_id':'u','role':'moderator'})
    assert resp.status_code in (401, 503)


def test_get_roles(monkeypatch):
    api_v4 = importlib.import_module('backend.routes.api_v4')
    monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockSvc(True), raising=False)
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.get('/api/v4/admin/roles?page=2&limit=10&search=john&include_all=true')
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'data' in data and 'users' in data['data']


def test_get_available_roles(monkeypatch):
    api_v4 = importlib.import_module('backend.routes.api_v4')
    monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockSvc(True), raising=False)
    c = make_client(monkeypatch, 'super_admin', True)
    resp = c.get('/api/v4/admin/roles/available')
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'data' in data and isinstance(data['data'], list)

