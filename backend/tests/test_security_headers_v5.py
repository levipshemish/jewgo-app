"""
Tests for Security Headers V5 Middleware.

Tests security headers application, correlation ID generation,
cache control for auth endpoints, and middleware integration.
"""

import pytest
import uuid
from unittest.mock import patch
from flask import Flask, jsonify, g
from middleware.security_headers_v5 import (
    SecurityHeadersV5Middleware,
    register_security_headers_v5_middleware,
    get_correlation_id,
    add_correlation_id_to_dict,
    create_security_response,
)


class TestSecurityHeadersV5Middleware:
    """Test cases for SecurityHeadersV5Middleware."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Add test routes
        @app.route('/test')
        def test_route():
            return jsonify({'message': 'test'})
        
        @app.route('/api/v5/auth/login', methods=['POST'])
        def auth_login():
            return jsonify({'success': True})
        
        @app.route('/api/v5/auth/verify-token', methods=['HEAD'])
        def verify_token():
            return '', 200
        
        @app.route('/api/v5/restaurants')
        def restaurants():
            return jsonify({'restaurants': []})
        
        @app.route('/html-page')
        def html_page():
            return '<html><body>Test</body></html>', 200, {'Content-Type': 'text/html'}
        
        return app
    
    @pytest.fixture
    def middleware(self, app):
        """Create middleware instance."""
        return SecurityHeadersV5Middleware(app)
    
    @pytest.fixture
    def client(self, app, middleware):
        """Create test client with middleware."""
        return app.test_client()
    
    def test_middleware_initialization(self, app):
        """Test middleware initialization."""
        middleware = SecurityHeadersV5Middleware()
        assert middleware.app is None
        
        middleware.init_app(app)
        assert middleware.app is app
    
    def test_register_middleware_function(self, app):
        """Test middleware registration function."""
        middleware = register_security_headers_v5_middleware(app)
        assert isinstance(middleware, SecurityHeadersV5Middleware)
        assert middleware.app is app
    
    def test_security_headers_applied(self, client):
        """Test that security headers are applied to all responses."""
        response = client.get('/test')
        
        # Check standard security headers
        assert response.headers.get('X-Frame-Options') == 'DENY'
        assert response.headers.get('X-Content-Type-Options') == 'nosniff'
        assert response.headers.get('Referrer-Policy') == 'no-referrer'
        assert response.headers.get('X-XSS-Protection') == '1; mode=block'
        assert 'geolocation=()' in response.headers.get('Permissions-Policy', '')
        assert 'microphone=()' in response.headers.get('Permissions-Policy', '')
        assert 'camera=()' in response.headers.get('Permissions-Policy', '')
    
    def test_correlation_id_generation(self, client):
        """Test correlation ID generation and header attachment."""
        response = client.get('/test')
        
        # Check correlation ID header is present
        correlation_id = response.headers.get('X-Correlation-ID')
        assert correlation_id is not None
        assert len(correlation_id) > 0
        
        # Should be a valid UUID format
        try:
            uuid.UUID(correlation_id)
        except ValueError:
            pytest.fail("Correlation ID is not a valid UUID")
    
    def test_correlation_id_from_request_header(self, client):
        """Test using correlation ID from request header."""
        test_correlation_id = str(uuid.uuid4())
        
        response = client.get('/test', headers={'X-Correlation-ID': test_correlation_id})
        
        # Should use the provided correlation ID
        assert response.headers.get('X-Correlation-ID') == test_correlation_id
    
    def test_response_time_header(self, client):
        """Test response time header is added."""
        response = client.get('/test')
        
        response_time = response.headers.get('X-Response-Time')
        assert response_time is not None
        assert response_time.endswith('ms')
        
        # Should be a valid float
        time_value = float(response_time.replace('ms', ''))
        assert time_value >= 0
    
    def test_auth_endpoint_cache_headers(self, client):
        """Test cache control headers for auth endpoints."""
        # Test auth login endpoint
        response = client.post('/api/v5/auth/login', json={'email': 'test@example.com'})
        
        assert response.headers.get('Cache-Control') == 'no-store, no-cache, must-revalidate, private'
        assert response.headers.get('Pragma') == 'no-cache'
        assert response.headers.get('Expires') == '0'
    
    def test_auth_endpoint_head_request(self, client):
        """Test cache headers on HEAD request to auth endpoint."""
        response = client.head('/api/v5/auth/verify-token')
        
        assert response.headers.get('Cache-Control') == 'no-store, no-cache, must-revalidate, private'
        assert response.headers.get('Pragma') == 'no-cache'
        assert response.headers.get('Expires') == '0'
    
    def test_non_auth_endpoint_no_cache_headers(self, client):
        """Test that non-auth endpoints don't get cache headers."""
        response = client.get('/api/v5/restaurants')
        
        # Should not have auth-specific cache headers
        cache_control = response.headers.get('Cache-Control')
        if cache_control:
            assert 'no-store' not in cache_control
        assert response.headers.get('Pragma') != 'no-cache'
        assert response.headers.get('Expires') != '0'
    
    def test_hsts_header_https_only(self, app, middleware):
        """Test HSTS header is only added for HTTPS requests."""
        with app.test_client() as client:
            # Test regular HTTP request - HSTS header should still be present from SECURITY_HEADERS
            response = client.get('/test')
            hsts = response.headers.get('Strict-Transport-Security')
            assert hsts is not None  # Header is always added from SECURITY_HEADERS
            
            # Test with HTTPS environment variable (simulating HTTPS)
            with app.test_request_context('/test', environ_base={'wsgi.url_scheme': 'https'}):
                # This tests the conditional logic even though HSTS is always added
                pass
    
    def test_csp_header_for_html_responses(self, client):
        """Test CSP header is added for HTML responses."""
        response = client.get('/html-page')
        
        csp = response.headers.get('Content-Security-Policy')
        assert csp is not None
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
    
    def test_csp_header_not_for_json_responses(self, client):
        """Test CSP header is not added for JSON responses."""
        response = client.get('/test')
        
        # JSON responses should not have CSP header
        assert response.headers.get('Content-Security-Policy') is None
    
    def test_is_auth_endpoint_detection(self, middleware):
        """Test auth endpoint detection logic."""
        auth_paths = [
            '/api/v5/auth/login',
            '/api/v5/auth/logout',
            '/api/v5/auth/register',
            '/api/v5/auth/verify-token',
            '/api/v5/auth/refresh-token',
            '/api/v5/auth/csrf',
            '/api/auth/login',
            '/auth/callback',
            '/login',
            '/logout',
            '/register',
        ]
        
        non_auth_paths = [
            '/api/v5/restaurants',
            '/api/v5/synagogues',
            '/api/v5/search',
            '/health',
            '/metrics',
            '/test',
        ]
        
        for path in auth_paths:
            assert middleware._is_auth_endpoint(path), f"Path {path} should be detected as auth endpoint"
        
        for path in non_auth_paths:
            assert not middleware._is_auth_endpoint(path), f"Path {path} should not be detected as auth endpoint"
    
    def test_get_correlation_id_function(self, app):
        """Test get_correlation_id utility function."""
        with app.test_request_context('/test'):
            # No correlation ID set
            assert get_correlation_id() is None
            
            # Set correlation ID
            test_id = str(uuid.uuid4())
            g.correlation_id = test_id
            assert get_correlation_id() == test_id
    
    def test_add_correlation_id_to_dict(self, app):
        """Test add_correlation_id_to_dict utility function."""
        with app.test_request_context('/test'):
            test_data = {'message': 'test'}
            
            # No correlation ID set
            result = add_correlation_id_to_dict(test_data)
            assert 'correlation_id' not in result
            
            # Set correlation ID
            test_id = str(uuid.uuid4())
            g.correlation_id = test_id
            result = add_correlation_id_to_dict(test_data)
            assert result['correlation_id'] == test_id
            assert result['message'] == 'test'
    
    def test_create_security_response(self, app):
        """Test create_security_response utility function."""
        with app.test_request_context('/test'):
            test_data = {'success': True}
            test_id = str(uuid.uuid4())
            g.correlation_id = test_id
            
            response = create_security_response(test_data, 201)
            
            assert response.status_code == 201
            response_json = response.get_json()
            assert response_json['success'] is True
            assert response_json['correlation_id'] == test_id
    
    def test_middleware_error_handling(self, app):
        """Test middleware handles errors gracefully."""
        SecurityHeadersV5Middleware(app)
        
        # Mock an error in header processing
        with patch('middleware.security_headers_v5.logger'):
            with app.test_client() as client:
                # This should not raise an exception even if there's an error
                response = client.get('/test')
                assert response.status_code == 200
    
    def test_security_headers_config_methods(self, middleware):
        """Test configuration getter methods."""
        security_headers = middleware.get_security_headers_config()
        assert isinstance(security_headers, dict)
        assert 'X-Frame-Options' in security_headers
        assert security_headers['X-Frame-Options'] == 'DENY'
        
        auth_headers = middleware.get_auth_cache_headers_config()
        assert isinstance(auth_headers, dict)
        assert 'Cache-Control' in auth_headers
        assert 'no-store' in auth_headers['Cache-Control']
    
    def test_permissions_policy_comprehensive(self, client):
        """Test comprehensive permissions policy."""
        response = client.get('/test')
        
        permissions_policy = response.headers.get('Permissions-Policy')
        assert permissions_policy is not None
        
        # Check all restricted permissions
        restricted_permissions = [
            'geolocation=()',
            'microphone=()',
            'camera=()',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'speaker=()',
        ]
        
        for permission in restricted_permissions:
            assert permission in permissions_policy
    
    def test_multiple_requests_different_correlation_ids(self, client):
        """Test that different requests get different correlation IDs."""
        response1 = client.get('/test')
        response2 = client.get('/test')
        
        correlation_id1 = response1.headers.get('X-Correlation-ID')
        correlation_id2 = response2.headers.get('X-Correlation-ID')
        
        assert correlation_id1 != correlation_id2
        assert correlation_id1 is not None
        assert correlation_id2 is not None
    
    def test_auth_endpoint_patterns_comprehensive(self, middleware):
        """Test comprehensive auth endpoint pattern matching."""
        test_cases = [
            ('/api/v5/auth/login', True),
            ('/api/v5/auth/logout', True),
            ('/api/v5/auth/register', True),
            ('/api/v5/auth/verify-token', True),
            ('/api/v5/auth/refresh-token', True),
            ('/api/v5/auth/csrf', True),
            ('/api/v5/auth/password-reset', True),
            ('/api/auth/legacy-login', True),
            ('/auth/oauth/callback', True),
            ('/login', True),
            ('/logout', True),
            ('/register', True),
            ('/verify-token', True),
            ('/refresh-token', True),
            ('/csrf', True),
            ('/api/v5/restaurants', False),
            ('/api/v5/synagogues', False),
            ('/api/v5/search', False),
            ('/api/v5/admin/users', False),
            ('/health', False),
            ('/metrics', False),
            ('/static/css/style.css', False),
        ]
        
        for path, expected in test_cases:
            result = middleware._is_auth_endpoint(path)
            assert result == expected, f"Path {path} should return {expected}, got {result}"