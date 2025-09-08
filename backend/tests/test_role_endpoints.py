import json
import pytest


def create_test_client(monkeypatch, super_admin: bool = True):
    # Bypass admin auth decorator in routes by patching before app creation
    import importlib
    from backend import utils as backend_utils
    sec = importlib.import_module('backend.utils.security')

    def passthrough(f):
        return f

    # Patch the correct decorator that's actually used by the route
    monkeypatch.setattr(sec, 'require_super_admin_auth', passthrough, raising=False)

    # Patch current user accessor used in routes
    def get_user():
        return {
            'id': 'admin-1',
            'email': 'admin@example.com',
            'role': 'super_admin' if super_admin else 'moderator',
            'adminRole': 'super_admin' if super_admin else 'moderator',
        }

    # Legacy Supabase accessor removed; routes use RBAC via PostgreSQL

    from backend.app_factory_full import create_app
    app, socketio = create_app()  # Unpack the tuple
    app.config['TESTING'] = True
    return app.test_client()


class TestRoleEndpoints:
    def test_assign_requires_super_admin(self, monkeypatch):
        client = create_test_client(monkeypatch, super_admin=False)
        resp = client.post('/api/v4/admin/roles/assign', json={
            'user_id': 'u1', 'role': 'moderator'
        })
        assert resp.status_code == 403

    def test_assign_validation(self, monkeypatch):
        client = create_test_client(monkeypatch)
        # Missing fields
        resp = client.post('/api/v4/admin/roles/assign', json={})
        assert resp.status_code == 400

    def test_assign_success(self, monkeypatch):
        client = create_test_client(monkeypatch)
        # Mock service to return success
        import importlib
        api_v4 = importlib.import_module('backend.routes.api_v4')

        class MockService:
            def assign_user_role(self, **kwargs):
                return { 'success': True }

        monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockService(), raising=False)

        resp = client.post('/api/v4/admin/roles/assign', json={
            'user_id': 'u1', 'role': 'moderator'
        })
        assert resp.status_code == 200

    def test_revoke_last_super_admin_blocked(self, monkeypatch):
        client = create_test_client(monkeypatch)
        import importlib
        api_v4 = importlib.import_module('backend.routes.api_v4')

        class MockService:
            def get_active_super_admin_count(self):
                return 1
            def revoke_user_role(self, **kwargs):
                return { 'success': False, 'error': 'blocked' }

        monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockService(), raising=False)

        resp = client.post('/api/v4/admin/roles/revoke', json={
            'user_id': 'u1', 'role': 'super_admin'
        })
        assert resp.status_code == 409

    def test_revoke_success(self, monkeypatch):
        client = create_test_client(monkeypatch)
        import importlib
        api_v4 = importlib.import_module('backend.routes.api_v4')

        class MockService:
            def get_active_super_admin_count(self):
                return 2
            def revoke_user_role(self, **kwargs):
                return { 'success': True }

        monkeypatch.setattr(api_v4, 'create_user_service', lambda: MockService(), raising=False)

        resp = client.post('/api/v4/admin/roles/revoke', json={
            'user_id': 'u1', 'role': 'moderator'
        })
        assert resp.status_code == 200
