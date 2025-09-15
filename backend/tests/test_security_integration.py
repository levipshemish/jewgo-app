#!/usr/bin/env python3
"""
Comprehensive Security Integration Tests

Tests for CSRF protection, JWT token rotation, replay attack prevention,
CORS validation, and other security features as specified in the auth
security hardening requirements.
"""

import pytest
import json
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import Flask, g
import jwt

# Add backend directory to path
import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from services.auth_service_v5 import AuthServiceV5
from services.abuse_control_service import AbuseControlService, AbuseControlResult
from middleware.auth_decorators import auth_required, admin_required, step_up_required
from utils.postgres_auth import TokenManager, PasswordSecurity
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager


class TestCSRFProtection:
    """Test CSRF protection implementation."""
    
    @pytest.fixture
    def app(self):
        """Create test application with CSRF protection."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['CSRF_SECRET'] = 'test-csrf-secret'
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_csrf_token_generation(self, app):
        """Test CSRF token generation and validation."""
        with app.test_request_context():
            # Mock CSRF manager
            from utils.csrf_manager import CSRFManager
            csrf_manager = CSRFManager('test-secret')
            
            session_id = 'test-session-123'
            user_agent = 'Mozilla/5.0 Test Browser'
            
            # Generate token
            token = csrf_manager.generate_token(session_id, user_agent)
            assert token is not None
            assert len(token) > 20  # Should be a substantial token
            
            # Validate token
            is_valid = csrf_manager.validate_token(token, session_id, user_agent)
            assert is_valid is True
            
            # Test with wrong session ID
            is_valid_wrong_session = csrf_manager.validate_token(token, 'wrong-session', user_agent)
            assert is_valid_wrong_session is False
            
            # Test with wrong user agent
            is_valid_wrong_ua = csrf_manager.validate_token(token, session_id, 'Wrong Browser')
            assert is_valid_wrong_ua is False
    
    def test_csrf_missing_token_rejection(self, client):
        """Test rejection of requests without CSRF token."""
        # Test POST request without CSRF token
        response = client.post('/api/v5/auth/login', 
                             json={'email': 'test@example.com', 'password': 'test123'},
                             headers={'Content-Type': 'application/json'})
        
        # Should be rejected with 403
        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error']['type'] == 'CSRF_INVALID'
    
    def test_csrf_invalid_token_rejection(self, client):
        """Test rejection of requests with invalid CSRF token."""
        # Test POST request with invalid CSRF token
        response = client.post('/api/v5/auth/login',
                             json={'email': 'test@example.com', 'password': 'test123'},
                             headers={
                                 'Content-Type': 'application/json',
                                 'X-CSRF-Token': 'invalid-token'
                             })
        
        # Should be rejected with 403
        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error']['type'] == 'CSRF_INVALID'
    
    def test_csrf_timing_attack_resistance(self, app):
        """Test CSRF validation timing attack resistance."""
        with app.test_request_context():
            from utils.csrf_manager import CSRFManager
            csrf_manager = CSRFManager('test-secret')
            
            session_id = 'test-session-123'
            user_agent = 'Mozilla/5.0 Test Browser'
            
            # Generate valid token
            valid_token = csrf_manager.generate_token(session_id, user_agent)
            
            # Measure timing for valid token
            start_time = time.time()
            csrf_manager.validate_token(valid_token, session_id, user_agent)
            valid_time = time.time() - start_time
            
            # Measure timing for invalid token
            start_time = time.time()
            csrf_manager.validate_token('invalid-token', session_id, user_agent)
            invalid_time = time.time() - start_time
            
            # Timing difference should be minimal (within 10ms)
            timing_diff = abs(valid_time - invalid_time)
            assert timing_diff < 0.01, f"Timing attack vulnerability detected: {timing_diff}s difference"
    
    def test_csrf_endpoint_issuance(self, client):
        """Test CSRF token issuance endpoint."""
        # Get CSRF token
        response = client.get('/api/v5/auth/csrf')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'csrf_token' in data
        
        # Check that CSRF cookie is set
        csrf_cookie = None
        for cookie in response.headers.get_list('Set-Cookie'):
            if cookie.startswith('csrf_token='):
                csrf_cookie = cookie
                break
        
        assert csrf_cookie is not None, "CSRF cookie not set"


class TestTokenRotation:
    """Test JWT token rotation and session family management."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        return app
    
    @pytest.fixture
    def auth_service(self):
        """Create auth service instance."""
        return AuthServiceV5()
    
    def test_successful_token_rotation(self, auth_service):
        """Test successful token rotation flow."""
        # Mock user data
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate initial tokens
        initial_tokens = auth_service.generate_tokens(user_data)
        assert 'access_token' in initial_tokens
        assert 'refresh_token' in initial_tokens
        
        # Refresh tokens
        success, new_tokens = auth_service.refresh_access_token(initial_tokens['refresh_token'])
        assert success is True
        assert new_tokens is not None
        assert 'access_token' in new_tokens
        assert 'refresh_token' in new_tokens
        
        # New tokens should be different from initial tokens
        assert new_tokens['access_token'] != initial_tokens['access_token']
        assert new_tokens['refresh_token'] != initial_tokens['refresh_token']
    
    def test_replay_attack_detection(self, auth_service):
        """Test detection and handling of replay attacks."""
        # Mock user data
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate initial tokens
        initial_tokens = auth_service.generate_tokens(user_data)
        refresh_token = initial_tokens['refresh_token']
        
        # First refresh should succeed
        success, new_tokens = auth_service.refresh_access_token(refresh_token)
        assert success is True
        
        # Second use of same refresh token should fail (replay attack)
        success, _ = auth_service.refresh_access_token(refresh_token)
        assert success is False
    
    def test_family_revocation(self, auth_service):
        """Test family-wide token revocation."""
        # Mock user data
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate tokens
        tokens = auth_service.generate_tokens(user_data)
        
        # Invalidate token (simulating family revocation)
        success = auth_service.invalidate_token(tokens['access_token'])
        assert success is True
        
        # Verify token is blacklisted
        is_blacklisted = auth_service.is_token_blacklisted(tokens['access_token'])
        assert is_blacklisted is True
    
    def test_concurrent_refresh_handling(self, auth_service):
        """Test handling of concurrent refresh requests."""
        import threading
        import queue
        
        # Mock user data
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate initial tokens
        initial_tokens = auth_service.generate_tokens(user_data)
        refresh_token = initial_tokens['refresh_token']
        
        results = queue.Queue()
        
        def refresh_worker():
            """Worker function for concurrent refresh attempts."""
            success, tokens = auth_service.refresh_access_token(refresh_token)
            results.put((success, tokens))
        
        # Start multiple concurrent refresh attempts
        threads = []
        for _ in range(3):
            thread = threading.Thread(target=refresh_worker)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Collect results
        success_count = 0
        while not results.empty():
            success, _ = results.get()
            if success:
                success_count += 1
        
        # Only one refresh should succeed
        assert success_count == 1, f"Expected 1 successful refresh, got {success_count}"


class TestCORSValidation:
    """Test CORS validation and preflight handling."""
    
    @pytest.fixture
    def app(self):
        """Create test application with CORS configuration."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['CORS_ORIGINS'] = ['https://jewgo.app', 'https://*.vercel.app']
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_cors_preflight_requests(self, client):
        """Test CORS preflight request handling."""
        # Test preflight request with valid origin
        response = client.options('/api/v5/auth/login',
                                headers={
                                    'Origin': 'https://jewgo.app',
                                    'Access-Control-Request-Method': 'POST',
                                    'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
                                })
        
        assert response.status_code == 200
        
        # Check CORS headers
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Headers' in response.headers
        assert 'Access-Control-Allow-Credentials' in response.headers
        
        # Verify HEAD method is included
        allowed_methods = response.headers['Access-Control-Allow-Methods']
        assert 'HEAD' in allowed_methods
    
    def test_cors_invalid_origin_rejection(self, client):
        """Test rejection of requests from invalid origins."""
        # Test request with invalid origin
        response = client.post('/api/v5/auth/login',
                             json={'email': 'test@example.com', 'password': 'test123'},
                             headers={
                                 'Origin': 'https://malicious-site.com',
                                 'Content-Type': 'application/json'
                             })
        
        # Should be rejected
        assert response.status_code in [403, 400]
    
    def test_cors_credentials_support(self, client):
        """Test CORS credentials support."""
        # Test preflight with credentials
        response = client.options('/api/v5/auth/login',
                                headers={
                                    'Origin': 'https://jewgo.app',
                                    'Access-Control-Request-Method': 'POST',
                                    'Access-Control-Request-Headers': 'Content-Type, Authorization'
                                })
        
        assert response.status_code == 200
        assert response.headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_cors_vary_header(self, client):
        """Test Vary header is set for CORS responses."""
        response = client.options('/api/v5/auth/login',
                                headers={
                                    'Origin': 'https://jewgo.app',
                                    'Access-Control-Request-Method': 'POST'
                                })
        
        assert response.status_code == 200
        assert 'Vary' in response.headers
        assert 'Origin' in response.headers['Vary']


class TestSecurityHeaders:
    """Test security headers implementation."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_security_headers_present(self, client):
        """Test that required security headers are present."""
        response = client.get('/api/v5/auth/health')
        
        # Check required security headers
        required_headers = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy'
        ]
        
        for header in required_headers:
            assert header in response.headers, f"Missing security header: {header}"
        
        # Check specific values
        assert response.headers['X-Frame-Options'] == 'DENY'
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert response.headers['Referrer-Policy'] == 'no-referrer'
    
    def test_cache_control_headers(self, client):
        """Test cache control headers for auth endpoints."""
        response = client.get('/api/v5/auth/health')
        
        # Auth endpoints should have no-cache headers
        assert 'Cache-Control' in response.headers
        cache_control = response.headers['Cache-Control']
        assert 'no-cache' in cache_control
        assert 'no-store' in cache_control
        assert 'must-revalidate' in cache_control


class TestAbuseControl:
    """Test abuse control and rate limiting."""
    
    @pytest.fixture
    def abuse_service(self):
        """Create abuse control service."""
        return AbuseControlService()
    
    def test_per_username_rate_limiting(self, abuse_service):
        """Test per-username rate limiting."""
        username = 'test@example.com'
        
        # First few attempts should be allowed
        for i in range(3):
            result = abuse_service.check_login_abuse(username)
            assert result.allowed is True
            abuse_service.record_failed_login(username)
        
        # After threshold, should require CAPTCHA
        result = abuse_service.check_login_abuse(username)
        assert result.requires_captcha is True
    
    def test_exponential_backoff(self, abuse_service):
        """Test exponential backoff implementation."""
        username = 'test@example.com'
        
        # Record multiple failed attempts
        for i in range(5):
            abuse_service.record_failed_login(username)
        
        # Check backoff
        result = abuse_service.check_login_abuse(username)
        assert result.allowed is False
        assert result.backoff_seconds > 0
    
    def test_successful_login_clears_tracking(self, abuse_service):
        """Test that successful login clears abuse tracking."""
        username = 'test@example.com'
        
        # Record failed attempts
        for i in range(3):
            abuse_service.record_failed_login(username)
        
        # Verify CAPTCHA is required
        result = abuse_service.check_login_abuse(username)
        assert result.requires_captcha is True
        
        # Record successful login
        abuse_service.record_successful_login(username)
        
        # Verify tracking is cleared
        result = abuse_service.check_login_abuse(username)
        assert result.requires_captcha is False
        assert result.allowed is True


class TestStepUpAuthentication:
    """Test step-up authentication implementation."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def auth_service(self):
        """Create auth service instance."""
        return AuthServiceV5()
    
    def test_step_up_challenge_creation(self, auth_service):
        """Test step-up challenge creation."""
        user_id = 'test-user-123'
        required_method = 'fresh_session'
        return_to = '/admin/sensitive-operation'
        
        challenge_id = auth_service.create_step_up_challenge(
            user_id, required_method, return_to
        )
        
        assert challenge_id is not None
        assert len(challenge_id) > 20
        
        # Verify challenge data
        challenge_data = auth_service.get_step_up_challenge(challenge_id)
        assert challenge_data is not None
        assert challenge_data['user_id'] == user_id
        assert challenge_data['required_method'] == required_method
        assert challenge_data['return_to'] == return_to
        assert challenge_data['completed'] is False
    
    def test_step_up_challenge_completion(self, auth_service):
        """Test step-up challenge completion."""
        user_id = 'test-user-123'
        challenge_id = auth_service.create_step_up_challenge(
            user_id, 'fresh_session', '/admin/test'
        )
        
        # Complete challenge
        success = auth_service.complete_step_up_challenge(challenge_id)
        assert success is True
        
        # Verify completion
        challenge_data = auth_service.get_step_up_challenge(challenge_id)
        assert challenge_data['completed'] is True
        assert 'completed_at' in challenge_data
    
    def test_step_up_challenge_expiration(self, auth_service):
        """Test step-up challenge expiration."""
        user_id = 'test-user-123'
        challenge_id = auth_service.create_step_up_challenge(
            user_id, 'fresh_session', '/admin/test'
        )
        
        # Mock time to simulate expiration
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime.utcnow() + timedelta(minutes=11)
            
            # Challenge should be expired
            challenge_data = auth_service.get_step_up_challenge(challenge_id)
            assert challenge_data is None


class TestPerformanceRequirements:
    """Test performance requirements for security features."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_verify_token_latency(self, client):
        """Test token verification latency (target: <120ms p95)."""
        # Create a valid token for testing
        token_manager = TokenManager()
        token = token_manager.generate_access_token('test-user', 'test@example.com')
        
        # Measure multiple requests
        latencies = []
        for _ in range(100):
            start_time = time.time()
            response = client.head('/api/v5/auth/verify-token',
                                 headers={'Authorization': f'Bearer {token}'})
            latency = (time.time() - start_time) * 1000  # Convert to ms
            latencies.append(latency)
            assert response.status_code == 200
        
        # Calculate p95 latency
        latencies.sort()
        p95_index = int(len(latencies) * 0.95)
        p95_latency = latencies[p95_index]
        
        # Should be under 120ms
        assert p95_latency < 120, f"P95 latency {p95_latency}ms exceeds 120ms target"
    
    def test_csrf_validation_performance(self, client):
        """Test CSRF validation performance impact."""
        # Get CSRF token first
        csrf_response = client.get('/api/v5/auth/csrf')
        csrf_data = json.loads(csrf_response.data)
        csrf_token = csrf_data['csrf_token']
        
        # Measure CSRF validation performance
        latencies = []
        for _ in range(50):
            start_time = time.time()
            response = client.post('/api/v5/auth/login',
                                 json={'email': 'test@example.com', 'password': 'test123'},
                                 headers={
                                     'Content-Type': 'application/json',
                                     'X-CSRF-Token': csrf_token
                                 })
            latency = (time.time() - start_time) * 1000
            latencies.append(latency)
        
        # Average latency should be reasonable
        avg_latency = sum(latencies) / len(latencies)
        assert avg_latency < 50, f"Average CSRF validation latency {avg_latency}ms too high"


class TestIntegrationScenarios:
    """Test end-to-end integration scenarios."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_complete_auth_flow_with_security(self, client):
        """Test complete authentication flow with all security features."""
        # 1. Get CSRF token
        csrf_response = client.get('/api/v5/auth/csrf')
        assert csrf_response.status_code == 200
        csrf_data = json.loads(csrf_response.data)
        csrf_token = csrf_data['csrf_token']
        
        # 2. Attempt login with CSRF token
        login_response = client.post('/api/v5/auth/login',
                                   json={'email': 'test@example.com', 'password': 'test123'},
                                   headers={
                                       'Content-Type': 'application/json',
                                       'X-CSRF-Token': csrf_token
                                   })
        
        # Should succeed (assuming test user exists)
        if login_response.status_code == 200:
            login_data = json.loads(login_response.data)
            assert 'access_token' in login_data
            assert 'refresh_token' in login_data
            
            # 3. Use access token for protected endpoint
            access_token = login_data['access_token']
            protected_response = client.get('/api/v5/auth/profile',
                                          headers={'Authorization': f'Bearer {access_token}'})
            
            # Should succeed
            assert protected_response.status_code == 200
    
    def test_security_headers_consistency(self, client):
        """Test that security headers are consistent across endpoints."""
        endpoints = [
            '/api/v5/auth/health',
            '/api/v5/auth/csrf',
            '/api/v5/auth/login'
        ]
        
        security_headers = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            
            for header in security_headers:
                assert header in response.headers, f"Missing {header} on {endpoint}"
    
    def test_cors_consistency(self, client):
        """Test CORS headers consistency."""
        # Test preflight on multiple endpoints
        endpoints = [
            '/api/v5/auth/login',
            '/api/v5/auth/register',
            '/api/v5/auth/refresh'
        ]
        
        for endpoint in endpoints:
            response = client.options(endpoint,
                                    headers={
                                        'Origin': 'https://jewgo.app',
                                        'Access-Control-Request-Method': 'POST'
                                    })
            
            # All should have consistent CORS headers
            assert 'Access-Control-Allow-Origin' in response.headers
            assert 'Access-Control-Allow-Methods' in response.headers
            assert 'Access-Control-Allow-Credentials' in response.headers


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
