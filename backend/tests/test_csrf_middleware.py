"""
Integration tests for CSRF Middleware

Tests CSRF protection across all mutating endpoints, blueprint integration,
and proper error handling.
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock
from flask import Flask, Blueprint, request, jsonify, g

from middleware.csrf_v5 import (
    CSRFMiddleware, 
    register_csrf_middleware, 
    register_csrf_blueprint_protection,
    csrf_exempt,
    require_csrf
)
from utils.csrf_manager import CSRFManager, init_csrf_manager


class TestCSRFMiddleware:
    """Test cases for CSRF middleware functionality."""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        # Initialize CSRF manager with test secret
        init_csrf_manager('test-csrf-secret')
        
        # Create test routes
        @app.route('/api/test', methods=['GET', 'POST'])
        def test_endpoint():
            return jsonify({'success': True, 'method': request.method})
        
        @app.route('/api/protected', methods=['POST'])
        def protected_endpoint():
            return jsonify({'success': True, 'protected': True})
        
        @app.route('/api/exempt', methods=['POST'])
        @csrf_exempt
        def exempt_endpoint():
            return jsonify({'success': True, 'exempt': True})
        
        @app.route('/api/required', methods=['POST'])
        @require_csrf
        def required_endpoint():
            return jsonify({'success': True, 'required': True})
        
        @app.route('/non-api/test', methods=['POST'])
        def non_api_endpoint():
            return jsonify({'success': True, 'non_api': True})
        
        # Mock user context for authenticated requests
        @app.before_request
        def mock_auth_context():
            if request.headers.get('X-Mock-User-ID'):
                g.user = {'user_id': request.headers.get('X-Mock-User-ID')}
            else:
                g.user = None
        
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        register_csrf_middleware(app)
        return app.test_client()
    
    @pytest.fixture
    def csrf_token(self, client):
        """Get CSRF token for testing."""
        response = client.get('/api/v5/auth/csrf')
        if response.status_code == 200:
            data = json.loads(response.data)
            return data['data']['csrf_token']
        
        # Fallback: generate token manually
        csrf_manager = CSRFManager('test-csrf-secret')
        return csrf_manager.generate_token('anon:127.0.0.1')
    
    def test_get_request_not_protected(self, client):
        """Test that GET requests are not protected by CSRF."""
        response = client.get('/api/test')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['method'] == 'GET'
    
    def test_post_request_requires_csrf_token(self, client):
        """Test that POST requests require CSRF token."""
        response = client.post('/api/test')
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'CSRF token required' in data['error']['message']
    
    def test_post_request_with_valid_csrf_token(self, client, csrf_token):
        """Test that POST requests work with valid CSRF token."""
        response = client.post(
            '/api/test',
            headers={'X-CSRF-Token': csrf_token}
        )
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['method'] == 'POST'
    
    def test_post_request_with_invalid_csrf_token(self, client):
        """Test that POST requests fail with invalid CSRF token."""
        response = client.post(
            '/api/test',
            headers={'X-CSRF-Token': 'invalid-token'}
        )
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid CSRF token' in data['error']['message']
    
    def test_csrf_token_in_different_headers(self, client, csrf_token):
        """Test CSRF token extraction from different headers."""
        # Test X-CSRF-Token header
        response = client.post(
            '/api/test',
            headers={'X-CSRF-Token': csrf_token}
        )
        assert response.status_code == 200
        
        # Test X-CSRFToken header (alternative)
        response = client.post(
            '/api/test',
            headers={'X-CSRFToken': csrf_token}
        )
        assert response.status_code == 200
    
    def test_csrf_token_in_form_data(self, client, csrf_token):
        """Test CSRF token extraction from form data."""
        response = client.post(
            '/api/test',
            data={'csrf_token': csrf_token, 'other_field': 'value'}
        )
        assert response.status_code == 200
    
    def test_csrf_token_in_json_body(self, client, csrf_token):
        """Test CSRF token extraction from JSON body."""
        response = client.post(
            '/api/test',
            json={'csrf_token': csrf_token, 'other_field': 'value'},
            content_type='application/json'
        )
        assert response.status_code == 200
    
    def test_csrf_token_in_cookie(self, client, csrf_token):
        """Test CSRF token extraction from cookie (double-submit pattern)."""
        # Set cookie using the test client's cookie jar
        client.set_cookie('localhost', '_csrf_token', csrf_token)
        
        response = client.post('/api/test')
        assert response.status_code == 200
    
    def test_mutating_methods_protected(self, client, csrf_token):
        """Test that all mutating HTTP methods are protected."""
        methods = ['POST', 'PUT', 'PATCH', 'DELETE']
        
        for method in methods:
            # Without CSRF token - should fail
            response = client.open('/api/test', method=method)
            assert response.status_code == 403, f"{method} should require CSRF token"
            
            # With CSRF token - should succeed
            response = client.open(
                '/api/test',
                method=method,
                headers={'X-CSRF-Token': csrf_token}
            )
            assert response.status_code == 200, f"{method} should work with CSRF token"
    
    def test_non_api_endpoints_not_protected(self, client):
        """Test that non-API endpoints are not protected."""
        response = client.post('/non-api/test')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['non_api'] is True
    
    def test_csrf_exempt_decorator(self, client):
        """Test that @csrf_exempt decorator works."""
        response = client.post('/api/exempt')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['exempt'] is True
    
    def test_require_csrf_decorator(self, client, csrf_token):
        """Test that @require_csrf decorator works."""
        # Without CSRF token - should fail
        response = client.post('/api/required')
        assert response.status_code == 403
        
        # With CSRF token - should succeed
        response = client.post(
            '/api/required',
            headers={'X-CSRF-Token': csrf_token}
        )
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['required'] is True
    
    def test_authenticated_user_session_id(self, client, csrf_token):
        """Test CSRF protection with authenticated user."""
        # Mock authenticated user
        response = client.post(
            '/api/test',
            headers={
                'X-CSRF-Token': csrf_token,
                'X-Mock-User-ID': 'test-user-123'
            }
        )
        assert response.status_code == 200
    
    def test_error_response_format(self, client):
        """Test that CSRF error responses have correct format."""
        response = client.post('/api/test')
        assert response.status_code == 403
        
        data = json.loads(response.data)
        
        # Check response structure
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        assert 'timestamp' in data
        
        # Check error structure
        error = data['error']
        assert 'type' in error
        assert 'message' in error
        assert 'code' in error
        assert error['type'] == 'CSRF_PROTECTION_FAILED'
        assert error['code'] == 403
        
        # Check security headers
        assert response.headers.get('X-Frame-Options') == 'DENY'
        assert response.headers.get('X-Content-Type-Options') == 'nosniff'
        assert response.headers.get('Referrer-Policy') == 'no-referrer'
    
    def test_client_ip_extraction(self, client, csrf_token):
        """Test client IP extraction for anonymous sessions."""
        # Test with X-Forwarded-For header
        response = client.post(
            '/api/test',
            headers={
                'X-CSRF-Token': csrf_token,
                'X-Forwarded-For': '192.168.1.100, 10.0.0.1'
            }
        )
        assert response.status_code == 200
        
        # Test with X-Real-IP header
        response = client.post(
            '/api/test',
            headers={
                'X-CSRF-Token': csrf_token,
                'X-Real-IP': '192.168.1.200'
            }
        )
        assert response.status_code == 200


class TestCSRFBlueprintProtection:
    """Test cases for blueprint-specific CSRF protection."""
    
    @pytest.fixture
    def app_with_blueprint(self):
        """Create Flask app with protected blueprint."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        # Initialize CSRF manager
        init_csrf_manager('test-csrf-secret')
        
        # Create test blueprint
        test_bp = Blueprint('test_bp', __name__, url_prefix='/api/v1')
        
        @test_bp.route('/test', methods=['GET', 'POST'])
        def blueprint_test():
            return jsonify({'success': True, 'blueprint': True})
        
        @test_bp.route('/protected', methods=['POST'])
        def blueprint_protected():
            return jsonify({'success': True, 'protected': True})
        
        # Register blueprint with CSRF protection
        register_csrf_blueprint_protection(test_bp)
        app.register_blueprint(test_bp)
        
        return app
    
    @pytest.fixture
    def client_with_blueprint(self, app_with_blueprint):
        """Create test client with blueprint."""
        return app_with_blueprint.test_client()
    
    def test_blueprint_csrf_protection(self, client_with_blueprint):
        """Test that blueprint CSRF protection works."""
        # GET should work without CSRF token
        response = client_with_blueprint.get('/api/v1/test')
        assert response.status_code == 200
        
        # POST should require CSRF token
        response = client_with_blueprint.post('/api/v1/test')
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert 'CSRF token required' in data['error']['message']
    
    def test_blueprint_csrf_with_valid_token(self, client_with_blueprint):
        """Test blueprint CSRF protection with valid token."""
        # Generate CSRF token
        csrf_manager = CSRFManager('test-csrf-secret')
        csrf_token = csrf_manager.generate_token('anon:127.0.0.1')
        
        response = client_with_blueprint.post(
            '/api/v1/test',
            headers={'X-CSRF-Token': csrf_token}
        )
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['blueprint'] is True


class TestCSRFMiddlewareIntegration:
    """Integration tests for CSRF middleware with auth system."""
    
    @pytest.fixture
    def app_with_auth(self):
        """Create Flask app with auth integration."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['TESTING'] = True
        
        # Initialize CSRF manager
        init_csrf_manager('test-csrf-secret')
        
        # Mock auth blueprint
        auth_bp = Blueprint('auth_api', __name__, url_prefix='/api/v5/auth')
        
        @auth_bp.route('/csrf', methods=['GET'])
        def csrf_token():
            from utils.csrf_manager import get_csrf_manager
            csrf_manager = get_csrf_manager()
            
            session_id = 'anon:127.0.0.1'
            csrf_token = csrf_manager.generate_token(session_id)
            
            from flask import make_response
            response_data = {
                'success': True,
                'data': {'csrf_token': csrf_token}
            }
            
            response = make_response(jsonify(response_data))
            cookie_config = csrf_manager.get_csrf_cookie_config()
            response.set_cookie('_csrf_token', csrf_token, **cookie_config)
            
            return response
        
        @auth_bp.route('/login', methods=['POST'])
        def login():
            return jsonify({'success': True, 'logged_in': True})
        
        app.register_blueprint(auth_bp)
        register_csrf_middleware(app)
        
        return app
    
    @pytest.fixture
    def client_with_auth(self, app_with_auth):
        """Create test client with auth integration."""
        return app_with_auth.test_client()
    
    def test_csrf_token_endpoint(self, client_with_auth):
        """Test CSRF token endpoint."""
        response = client_with_auth.get('/api/v5/auth/csrf')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'csrf_token' in data['data']
        
        # Check that cookie was set in headers
        set_cookie_header = response.headers.get('Set-Cookie', '')
        assert '_csrf_token=' in set_cookie_header
    
    def test_auth_endpoint_csrf_protection(self, client_with_auth):
        """Test that auth endpoints are protected by CSRF."""
        # Login should require CSRF token
        response = client_with_auth.post('/api/v5/auth/login')
        assert response.status_code == 403
        
        # Get CSRF token
        csrf_response = client_with_auth.get('/api/v5/auth/csrf')
        csrf_data = json.loads(csrf_response.data)
        csrf_token = csrf_data['data']['csrf_token']
        
        # Login with CSRF token should work
        response = client_with_auth.post(
            '/api/v5/auth/login',
            headers={'X-CSRF-Token': csrf_token},
            json={'email': 'test@example.com', 'password': 'password'}
        )
        assert response.status_code == 200
    
    def test_csrf_cookie_configuration(self, client_with_auth):
        """Test CSRF cookie configuration."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            response = client_with_auth.get('/api/v5/auth/csrf')
            assert response.status_code == 200
            
            # Check cookie attributes in Set-Cookie header
            set_cookie_header = response.headers.get('Set-Cookie', '')
            assert '_csrf_token=' in set_cookie_header
            # Note: In testing, some cookie attributes might not be fully testable
    
    def test_error_handling_in_csrf_middleware(self, client_with_auth):
        """Test error handling in CSRF middleware."""
        # Test with malformed CSRF token
        response = client_with_auth.post(
            '/api/v5/auth/login',
            headers={'X-CSRF-Token': 'malformed-token'},
            json={'email': 'test@example.com', 'password': 'password'}
        )
        assert response.status_code == 403
        
        data = json.loads(response.data)
        assert 'Invalid CSRF token' in data['error']['message']


class TestCSRFMiddlewareConfiguration:
    """Test cases for CSRF middleware configuration."""
    
    def test_exempt_endpoints_configuration(self):
        """Test that exempt endpoints are properly configured."""
        middleware = CSRFMiddleware()
        
        # Check that CSRF endpoint itself is exempt
        assert 'auth_api.csrf_token' in middleware.EXEMPT_ENDPOINTS
        
        # Check that health endpoints are exempt
        assert 'monitoring_v5.health' in middleware.EXEMPT_ENDPOINTS
        assert 'monitoring_v5.metrics' in middleware.EXEMPT_ENDPOINTS
    
    def test_protected_methods_configuration(self):
        """Test that protected methods are properly configured."""
        middleware = CSRFMiddleware()
        
        expected_methods = {'POST', 'PUT', 'PATCH', 'DELETE'}
        assert middleware.PROTECTED_METHODS == expected_methods
    
    def test_middleware_initialization(self):
        """Test CSRF middleware initialization."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret'
        
        # Initialize CSRF manager first
        init_csrf_manager('test-csrf-secret')
        
        # Test initialization
        middleware = CSRFMiddleware(app)
        assert middleware.app is app
        assert middleware.csrf_manager is not None
    
    def test_middleware_registration(self):
        """Test CSRF middleware registration."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret'
        
        # Initialize CSRF manager first
        init_csrf_manager('test-csrf-secret')
        
        # Test registration
        register_csrf_middleware(app)
        
        # Verify that before_request hook was registered
        assert len(app.before_request_funcs[None]) > 0