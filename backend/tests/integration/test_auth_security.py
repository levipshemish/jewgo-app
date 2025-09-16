"""
Integration tests for authentication and security features.

Tests the complete authentication flow including decorators, rate limiting,
step-up authentication, and WebAuthn integration.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from flask import Flask

from middleware.auth_decorators import (
    auth_required, 
    admin_required, 
    optional_auth, 
    permission_required,
    rate_limit_by_user,
    step_up_required
)
from services.auth.webauthn_service import WebAuthnService
from middleware.error_handlers import register_error_handlers, register_custom_error_handlers

class TestAuthDecorators:
    """Test authentication decorators."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        # Register error handlers
        register_error_handlers(app)
        register_custom_error_handlers(app)
        
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def auth_service(self):
        """Create mock auth service."""
        with patch('middleware.auth_decorators.AuthServiceV5') as mock_service:
            service = MagicMock()
            mock_service.return_value = service
            yield service
    
    def test_auth_required_missing_token(self, app, client):
        """Test auth_required decorator with missing token."""
        
        @app.route('/protected')
        @auth_required
        def protected_endpoint():
            return {'message': 'success'}
        
        response = client.get('/protected')
        assert response.status_code == 401
        
        data = json.loads(response.data)
        assert data['error'] == 'Authentication required'
        assert data['code'] == 'MISSING_TOKEN'
    
    def test_auth_required_invalid_token(self, app, client, auth_service):
        """Test auth_required decorator with invalid token."""
        auth_service.verify_token.return_value = None
        
        @app.route('/protected')
        @auth_required
        def protected_endpoint():
            return {'message': 'success'}
        
        response = client.get('/protected', headers={
            'Authorization': 'Bearer invalid-token'
        })
        assert response.status_code == 401
        
        data = json.loads(response.data)
        assert data['error'] == 'Invalid or expired token'
        assert data['code'] == 'INVALID_TOKEN'
    
    def test_auth_required_valid_token(self, app, client, auth_service):
        """Test auth_required decorator with valid token."""
        # Mock valid token verification
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'email': 'test@example.com'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'email': 'test@example.com',
            'roles': [{'role': 'user'}],
            'permissions': ['read']
        }
        
        @app.route('/protected')
        @auth_required
        def protected_endpoint():
            from flask import g
            return {'user_id': g.current_user['id']}
        
        response = client.get('/protected', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['user_id'] == 'user123'
    
    def test_admin_required_non_admin(self, app, client, auth_service):
        """Test admin_required decorator with non-admin user."""
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'email': 'test@example.com'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'email': 'test@example.com',
            'roles': [{'role': 'user'}],
            'permissions': ['read']
        }
        
        @app.route('/admin')
        @auth_required
        @admin_required
        def admin_endpoint():
            return {'message': 'admin access'}
        
        response = client.get('/admin', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert data['error'] == 'Admin access required'
        assert data['code'] == 'INSUFFICIENT_PERMISSIONS'
    
    def test_admin_required_admin_user(self, app, client, auth_service):
        """Test admin_required decorator with admin user."""
        auth_service.verify_token.return_value = {
            'uid': 'admin123',
            'email': 'admin@example.com'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'admin123',
            'email': 'admin@example.com',
            'roles': [{'role': 'admin'}],
            'permissions': ['admin_access']
        }
        
        @app.route('/admin')
        @auth_required
        @admin_required
        def admin_endpoint():
            return {'message': 'admin access granted'}
        
        response = client.get('/admin', headers={
            'Authorization': 'Bearer admin-token'
        })
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['message'] == 'admin access granted'
    
    def test_permission_required_insufficient(self, app, client, auth_service):
        """Test permission_required decorator with insufficient permissions."""
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'email': 'test@example.com'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'email': 'test@example.com',
            'roles': [{'role': 'user'}],
            'permissions': ['read']
        }
        
        @app.route('/create')
        @auth_required
        @permission_required(['create_entities'])
        def create_endpoint():
            return {'message': 'created'}
        
        response = client.get('/create', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert 'Required permissions' in data['error']
        assert data['code'] == 'INSUFFICIENT_PERMISSIONS'
    
    def test_optional_auth_no_token(self, app, client):
        """Test optional_auth decorator without token."""
        
        @app.route('/optional')
        @optional_auth
        def optional_endpoint():
            from flask import g
            return {'authenticated': g.current_user is not None}
        
        response = client.get('/optional')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['authenticated'] is False
    
    def test_optional_auth_with_token(self, app, client, auth_service):
        """Test optional_auth decorator with valid token."""
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'email': 'test@example.com'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'email': 'test@example.com',
            'roles': [{'role': 'user'}],
            'permissions': ['read']
        }
        
        @app.route('/optional')
        @optional_auth
        def optional_endpoint():
            from flask import g
            return {
                'authenticated': g.current_user is not None,
                'user_id': g.current_user['id'] if g.current_user else None
            }
        
        response = client.get('/optional', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['authenticated'] is True
        assert data['user_id'] == 'user123'

class TestRateLimiting:
    """Test rate limiting functionality."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def redis_manager(self):
        """Create mock Redis manager."""
        with patch('middleware.auth_decorators.get_redis_manager_v5') as mock_redis:
            manager = MagicMock()
            mock_redis.return_value = manager
            manager.get.return_value = 0  # Start with 0 requests
            yield manager
    
    def test_rate_limit_under_limit(self, app, client, redis_manager):
        """Test rate limiting under the limit."""
        
        @app.route('/limited')
        @auth_required
        @rate_limit_by_user(max_requests=10, window_minutes=60)
        def limited_endpoint():
            return {'message': 'success'}
        
        # Mock authentication
        with patch('middleware.auth_decorators.auth_service') as mock_auth:
            mock_auth.verify_token.return_value = {'uid': 'user123'}
            mock_auth.get_user_profile.return_value = {
                'id': 'user123',
                'permissions': []
            }
            
            response = client.get('/limited', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 200
            
            # Verify Redis calls
            redis_manager.get.assert_called()
            redis_manager.incr.assert_called()
            redis_manager.expire.assert_called()
    
    def test_rate_limit_exceeded(self, app, client, redis_manager):
        """Test rate limiting when limit is exceeded."""
        redis_manager.get.return_value = 15  # Over the limit
        
        @app.route('/limited')
        @auth_required
        @rate_limit_by_user(max_requests=10, window_minutes=60)
        def limited_endpoint():
            return {'message': 'success'}
        
        # Mock authentication
        with patch('middleware.auth_decorators.auth_service') as mock_auth:
            mock_auth.verify_token.return_value = {'uid': 'user123'}
            mock_auth.get_user_profile.return_value = {
                'id': 'user123',
                'permissions': []
            }
            
            response = client.get('/limited', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 429
            
            data = json.loads(response.data)
            assert data['error'] == 'Rate limit exceeded'
            assert data['code'] == 'RATE_LIMIT_EXCEEDED'
            assert 'retry_after' in data

class TestStepUpAuthentication:
    """Test step-up authentication functionality."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def auth_service(self):
        """Create mock auth service."""
        with patch('middleware.auth_decorators.auth_service') as mock_service:
            yield mock_service
    
    def test_step_up_required_no_step_up(self, app, client, auth_service):
        """Test step-up required when user hasn't completed step-up."""
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'sid': 'session123'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'permissions': []
        }
        auth_service.session_has_step_up.return_value = False
        auth_service.create_step_up_challenge.return_value = 'challenge123'
        
        @app.route('/sensitive')
        @auth_required
        @step_up_required('password')
        def sensitive_endpoint():
            return {'message': 'sensitive operation'}
        
        response = client.get('/sensitive', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert data['error'] == 'Step-up authentication required'
        assert data['code'] == 'STEP_UP_REQUIRED'
        assert data['challenge_id'] == 'challenge123'
        assert data['required_method'] == 'password'
    
    def test_step_up_required_with_step_up(self, app, client, auth_service):
        """Test step-up required when user has completed step-up."""
        auth_service.verify_token.return_value = {
            'uid': 'user123',
            'sid': 'session123'
        }
        auth_service.get_user_profile.return_value = {
            'id': 'user123',
            'permissions': []
        }
        auth_service.session_has_step_up.return_value = True
        
        @app.route('/sensitive')
        @auth_required
        @step_up_required('password')
        def sensitive_endpoint():
            return {'message': 'sensitive operation completed'}
        
        response = client.get('/sensitive', headers={
            'Authorization': 'Bearer valid-token'
        })
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['message'] == 'sensitive operation completed'

class TestWebAuthnService:
    """Test WebAuthn service functionality."""
    
    @pytest.fixture
    def webauthn_service(self):
        """Create WebAuthn service with mocked Redis."""
        with patch('services.auth.webauthn_service.get_redis_manager_v5') as mock_redis:
            redis_manager = MagicMock()
            mock_redis.return_value = redis_manager
            
            service = WebAuthnService(redis_manager)
            service.enabled = True  # Force enable for testing
            yield service, redis_manager
    
    def test_webauthn_disabled(self):
        """Test WebAuthn service when disabled."""
        service = WebAuthnService()
        service.enabled = False
        
        assert not service.is_enabled()
        
        with pytest.raises(ValueError, match="WebAuthn is not enabled"):
            service.create_registration_challenge('user123', 'test@example.com', 'Test User')
    
    def test_create_registration_challenge(self, webauthn_service):
        """Test creating WebAuthn registration challenge."""
        service, redis_manager = webauthn_service
        
        options = service.create_registration_challenge(
            'user123', 
            'test@example.com', 
            'Test User'
        )
        
        assert 'challenge' in options
        assert options['rp']['name'] == 'JewGo'
        assert options['user']['name'] == 'test@example.com'
        assert options['user']['displayName'] == 'Test User'
        assert len(options['pubKeyCredParams']) == 2
        
        # Verify Redis storage
        redis_manager.set.assert_called()
    
    def test_create_authentication_challenge(self, webauthn_service):
        """Test creating WebAuthn authentication challenge."""
        service, redis_manager = webauthn_service
        
        # Mock user credentials
        service.get_user_credentials = MagicMock(return_value=[])
        
        options = service.create_authentication_challenge('user123')
        
        assert 'challenge' in options
        assert options['rpId'] == 'jewgo.app'
        assert options['userVerification'] == 'preferred'
        assert isinstance(options['allowCredentials'], list)
        
        # Verify Redis storage
        redis_manager.set.assert_called()
    
    def test_health_check(self, webauthn_service):
        """Test WebAuthn service health check."""
        service, redis_manager = webauthn_service
        
        # Mock Redis operations
        redis_manager.set.return_value = True
        redis_manager.exists.return_value = True
        redis_manager.delete.return_value = True
        
        health = service.health_check()
        
        assert health['status'] == 'healthy'
        assert health['enabled'] is True
        assert health['redis'] is True
        assert 'timestamp' in health

class TestErrorHandlers:
    """Test error handling functionality."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app with error handlers."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        register_error_handlers(app)
        register_custom_error_handlers(app)
        
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_404_error_handler(self, client):
        """Test 404 error handler."""
        response = client.get('/nonexistent')
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert data['error'] == 'Not found'
        assert data['code'] == 'NOT_FOUND'
    
    def test_500_error_handler_production(self, app, client):
        """Test 500 error handler in production mode."""
        with patch.dict('os.environ', {'FLASK_ENV': 'production'}):
            @app.route('/error')
            def error_endpoint():
                raise Exception("Test error")
            
            response = client.get('/error')
            assert response.status_code == 500
            
            data = json.loads(response.data)
            assert data['error'] == 'Internal server error'
            assert data['code'] == 'INTERNAL_ERROR'
            assert 'correlation_id' in data
            # Should not expose internal error details in production
            assert 'traceback' not in data
    
    def test_500_error_handler_development(self, app, client):
        """Test 500 error handler in development mode."""
        with patch.dict('os.environ', {'FLASK_ENV': 'development', 'DEBUG': 'true'}):
            @app.route('/error')
            def error_endpoint():
                raise Exception("Test error")
            
            response = client.get('/error')
            assert response.status_code == 500
            
            data = json.loads(response.data)
            assert data['error'] == 'Internal server error'
            assert data['code'] == 'INTERNAL_ERROR'
            assert 'correlation_id' in data
            # Should expose error details in development
            assert 'traceback' in data

class TestIntegrationFlow:
    """Test complete authentication integration flow."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app with all middleware."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        register_error_handlers(app)
        register_custom_error_handlers(app)
        
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_complete_auth_flow(self, app, client):
        """Test complete authentication flow from login to protected resource."""
        
        # Mock auth service
        with patch('middleware.auth_decorators.AuthServiceV5') as mock_auth_class:
            auth_service = MagicMock()
            mock_auth_class.return_value = auth_service
            
            # Mock successful authentication
            auth_service.verify_token.return_value = {
                'uid': 'user123',
                'email': 'test@example.com'
            }
            auth_service.get_user_profile.return_value = {
                'id': 'user123',
                'email': 'test@example.com',
                'roles': [{'role': 'admin'}],
                'permissions': ['admin_access', 'create_entities']
            }
            
            # Create protected endpoints
            @app.route('/public')
            @optional_auth
            def public_endpoint():
                from flask import g
                return {
                    'message': 'public access',
                    'authenticated': g.current_user is not None
                }
            
            @app.route('/protected')
            @auth_required
            def protected_endpoint():
                from flask import g
                return {
                    'message': 'protected access',
                    'user_id': g.current_user['id']
                }
            
            @app.route('/admin')
            @auth_required
            @admin_required
            def admin_endpoint():
                return {'message': 'admin access'}
            
            @app.route('/create')
            @auth_required
            @permission_required(['create_entities'])
            def create_endpoint():
                return {'message': 'create access'}
            
            # Test public access without auth
            response = client.get('/public')
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['authenticated'] is False
            
            # Test public access with auth
            response = client.get('/public', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['authenticated'] is True
            
            # Test protected access
            response = client.get('/protected', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['user_id'] == 'user123'
            
            # Test admin access
            response = client.get('/admin', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['message'] == 'admin access'
            
            # Test permission-based access
            response = client.get('/create', headers={
                'Authorization': 'Bearer valid-token'
            })
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['message'] == 'create access'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])