"""
Tests for step-up authentication endpoints and functionality.
"""

import pytest
import json
import time
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from services.auth_service_v5 import AuthServiceV5


class TestStepUpAuthentication:
    """Test step-up authentication functionality."""

    @pytest.fixture
    def auth_service(self):
        """Create auth service instance for testing."""
        with patch('services.auth_service_v5.get_redis_manager_v5') as mock_redis, \
             patch('services.auth_service_v5.get_connection_manager') as mock_db:
            
            mock_redis_instance = Mock()
            mock_redis.return_value = mock_redis_instance
            
            mock_db_instance = Mock()
            mock_db.return_value = mock_db_instance
            
            service = AuthServiceV5(
                redis_manager=mock_redis_instance,
                connection_manager=mock_db_instance
            )
            
            yield service

    def authenticated_client(self, client):
        """Create authenticated client for testing."""
        return client

    def test_create_step_up_challenge(self, auth_service):
        """Test creating step-up authentication challenge."""
        user_id = 'test-user-123'
        required_method = 'fresh_session'
        return_to = '/admin/users/roles'
        
        # Mock Redis operations
        auth_service.redis_manager.set = Mock()
        
        challenge_id = auth_service.create_step_up_challenge(
            user_id=user_id,
            required_method=required_method,
            return_to=return_to
        )
        
        assert challenge_id is not None
        assert len(challenge_id) > 20  # Should be a secure random string
        
        # Verify Redis call
        auth_service.redis_manager.set.assert_called_once()
        call_args = auth_service.redis_manager.set.call_args
        
        assert call_args[0][0] == f"step_up_challenge:{challenge_id}"
        challenge_data = call_args[0][1]
        assert challenge_data['user_id'] == user_id
        assert challenge_data['required_method'] == required_method
        assert challenge_data['return_to'] == return_to
        assert challenge_data['completed'] is False

    def test_get_step_up_challenge(self, auth_service):
        """Test retrieving step-up challenge."""
        challenge_id = 'test-challenge-123'
        challenge_data = {
            'challenge_id': challenge_id,
            'user_id': 'test-user-123',
            'required_method': 'webauthn',
            'return_to': '/admin/api-keys',
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
            'completed': False
        }
        
        # Mock Redis get
        auth_service.redis_manager.get = Mock(return_value=challenge_data)
        
        result = auth_service.get_step_up_challenge(challenge_id)
        
        assert result == challenge_data
        auth_service.redis_manager.get.assert_called_once_with(
            f"step_up_challenge:{challenge_id}",
            prefix='auth'
        )

    def test_get_expired_step_up_challenge(self, auth_service):
        """Test retrieving expired step-up challenge."""
        challenge_id = 'test-challenge-123'
        expired_challenge = {
            'challenge_id': challenge_id,
            'user_id': 'test-user-123',
            'required_method': 'webauthn',
            'return_to': '/admin/api-keys',
            'created_at': (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            'expires_at': (datetime.utcnow() - timedelta(minutes=5)).isoformat(),  # Expired
            'completed': False
        }
        
        # Mock Redis operations
        auth_service.redis_manager.get = Mock(return_value=expired_challenge)
        auth_service.redis_manager.delete = Mock()
        
        result = auth_service.get_step_up_challenge(challenge_id)
        
        assert result is None
        auth_service.redis_manager.delete.assert_called_once_with(
            f"step_up_challenge:{challenge_id}",
            prefix='auth'
        )

    def test_complete_step_up_challenge(self, auth_service):
        """Test completing step-up challenge."""
        challenge_id = 'test-challenge-123'
        challenge_data = {
            'challenge_id': challenge_id,
            'user_id': 'test-user-123',
            'required_method': 'webauthn',
            'completed': False
        }
        
        # Mock Redis operations
        auth_service.redis_manager.get = Mock(return_value=challenge_data)
        auth_service.redis_manager.set = Mock()
        
        result = auth_service.complete_step_up_challenge(challenge_id)
        
        assert result is True
        
        # Verify challenge was marked as completed
        auth_service.redis_manager.set.assert_called_once()
        call_args = auth_service.redis_manager.set.call_args
        updated_data = call_args[0][1]
        assert updated_data['completed'] is True
        assert 'completed_at' in updated_data

    def test_mark_session_step_up_complete(self, auth_service):
        """Test marking session as step-up complete."""
        session_id = 'test-session-456'
        
        # Mock Redis set
        auth_service.redis_manager.set = Mock()
        
        auth_service.mark_session_step_up_complete(session_id)
        
        auth_service.redis_manager.set.assert_called_once()
        call_args = auth_service.redis_manager.set.call_args
        
        assert call_args[0][0] == f"session_step_up:{session_id}"
        step_up_data = call_args[0][1]
        assert step_up_data['step_up_completed'] is True
        assert 'completed_at' in step_up_data

    def test_session_has_step_up(self, auth_service):
        """Test checking if session has step-up."""
        session_id = 'test-session-456'
        step_up_data = {
            'step_up_completed': True,
            'completed_at': datetime.utcnow().isoformat()
        }
        
        # Mock Redis get
        auth_service.redis_manager.get = Mock(return_value=step_up_data)
        
        result = auth_service.session_has_step_up(session_id)
        
        assert result is True
        auth_service.redis_manager.get.assert_called_once_with(
            f"session_step_up:{session_id}",
            prefix='auth'
        )

    def test_session_no_step_up(self, auth_service):
        """Test checking session without step-up."""
        session_id = 'test-session-456'
        
        # Mock Redis get returning None
        auth_service.redis_manager.get = Mock(return_value=None)
        
        result = auth_service.session_has_step_up(session_id)
        
        assert result is False


class TestStepUpAuthEndpoints:
    """Test step-up authentication API endpoints."""

    @pytest.fixture(autouse=True)
    def mock_auth(self):
        """Mock authentication for all endpoint tests."""
        with patch('middleware.auth_v5.require_permission_v5') as mock_decorator:
            def mock_auth_decorator(permission):
                def decorator(f):
                    def wrapper(*args, **kwargs):
                        from flask import g
                        g.user_id = 'test-user-123'
                        g.session_id = 'test-session-456'
                        g.auth_time = int(time.time()) - 100
                        return f(*args, **kwargs)
                    return wrapper
                return decorator
            mock_decorator.side_effect = mock_auth_decorator
            yield

    def test_step_up_challenge_endpoint(self, client):
        """Test step-up challenge creation endpoint."""
        with patch('routes.v5.auth_api.auth_service') as mock_service, \
             patch('routes.v5.auth_api.g') as mock_g:
            
            # Mock authenticated user context
            mock_g.user_id = 'test-user-123'
            mock_g.auth_time = int(time.time()) - 400  # Old session
            
            mock_service.create_step_up_challenge.return_value = 'test-challenge-123'
            mock_service.user_has_webauthn_credentials.return_value = False
            
            response = client.post('/api/v5/auth/step-up/challenge', 
                json={'return_to': '/admin/users/roles'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'challenge' in data
            assert data['challenge']['challenge_id'] == 'test-challenge-123'
            assert data['challenge']['required_method'] == 'fresh_session'

    def test_step_up_challenge_webauthn_user(self, client):
        """Test step-up challenge for user with WebAuthn."""
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.create_step_up_challenge.return_value = 'test-challenge-123'
            mock_service.user_has_webauthn_credentials.return_value = True
            
            # Mock recent auth time (within 5 minutes)
            with patch('routes.v5.auth_api.g') as mock_g:
                mock_g.user_id = 'test-user-123'
                mock_g.auth_time = int(time.time()) - 100  # 100 seconds ago
                
                response = client.post('/api/v5/auth/step-up/challenge', 
                    json={'return_to': '/admin/api-keys'})
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['challenge']['required_method'] == 'webauthn'

    def test_webauthn_challenge_endpoint(self, client):
        """Test WebAuthn challenge creation endpoint."""
        challenge_data = {
            'challenge_id': 'test-challenge-123',
            'user_id': 'test-user-123',
            'required_method': 'webauthn'
        }
        
        webauthn_challenge = {
            'challenge': 'mock-webauthn-challenge',
            'user_id': 'test-user-123'
        }
        
        credentials = [
            {
                'credential_id': 'mock-credential-id',
                'transports': ['usb', 'nfc']
            }
        ]
        
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.get_step_up_challenge.return_value = challenge_data
            mock_service.create_webauthn_challenge.return_value = webauthn_challenge
            mock_service.get_user_webauthn_credentials.return_value = credentials
            mock_service.store_webauthn_challenge = Mock()
            
            response = client.post('/api/v5/auth/step-up/webauthn/challenge',
                json={'challenge_id': 'test-challenge-123'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'options' in data
            assert data['options']['challenge'] == 'mock-webauthn-challenge'
            assert len(data['options']['allowCredentials']) == 1

    def test_webauthn_challenge_invalid_challenge(self, client):
        """Test WebAuthn challenge with invalid challenge ID."""
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.get_step_up_challenge.return_value = None
            
            response = client.post('/api/v5/auth/step-up/webauthn/challenge',
                json={'challenge_id': 'invalid-challenge'})
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Invalid challenge' in data['error']

    def test_webauthn_verify_endpoint(self, client):
        """Test WebAuthn assertion verification endpoint."""
        challenge_data = {
            'challenge_id': 'test-challenge-123',
            'user_id': 'test-user-123',
            'required_method': 'webauthn'
        }
        
        assertion = {
            'id': 'mock-credential-id',
            'response': {
                'authenticatorData': 'mock-auth-data',
                'clientDataJSON': 'mock-client-data',
                'signature': 'mock-signature'
            }
        }
        
        verification_result = {
            'verified': True,
            'credential_id': 'mock-credential-id'
        }
        
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.get_step_up_challenge.return_value = challenge_data
            mock_service.verify_webauthn_assertion.return_value = verification_result
            mock_service.complete_step_up_challenge = Mock()
            mock_service.mark_session_step_up_complete = Mock()
            
            response = client.post('/api/v5/auth/step-up/webauthn/verify',
                json={
                    'challenge_id': 'test-challenge-123',
                    'assertion': assertion
                })
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            
            # Verify challenge was completed
            mock_service.complete_step_up_challenge.assert_called_once_with('test-challenge-123')
            mock_service.mark_session_step_up_complete.assert_called_once()

    def test_webauthn_verify_failed(self, client):
        """Test WebAuthn verification failure."""
        challenge_data = {
            'challenge_id': 'test-challenge-123',
            'user_id': 'test-user-123',
            'required_method': 'webauthn'
        }
        
        verification_result = {
            'verified': False,
            'error': 'Invalid signature'
        }
        
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.get_step_up_challenge.return_value = challenge_data
            mock_service.verify_webauthn_assertion.return_value = verification_result
            
            response = client.post('/api/v5/auth/step-up/webauthn/verify',
                json={
                    'challenge_id': 'test-challenge-123',
                    'assertion': {'id': 'mock-credential'}
                })
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'WebAuthn verification failed' in data['error']

    def test_verify_step_up_endpoint(self, client):
        """Test step-up verification status endpoint."""
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.session_has_step_up.return_value = True
            
            with patch('routes.v5.auth_api.g') as mock_g:
                mock_g.session_id = 'test-session-456'
                mock_g.auth_time = int(time.time()) - 100  # 100 seconds ago
                
                response = client.post('/api/v5/auth/step-up/verify')
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['success'] is True
                assert data['step_up_completed'] is True
                assert data['fresh_session'] is True
                assert data['session_age'] == 100

    def test_verify_step_up_no_step_up(self, client):
        """Test step-up verification when no step-up completed."""
        with patch('routes.v5.auth_api.auth_service') as mock_service:
            mock_service.session_has_step_up.return_value = False
            
            with patch('routes.v5.auth_api.g') as mock_g:
                mock_g.session_id = 'test-session-456'
                mock_g.auth_time = int(time.time()) - 400  # 400 seconds ago (old session)
                
                response = client.post('/api/v5/auth/step-up/verify')
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['success'] is True
                assert data['step_up_completed'] is False
                assert data['fresh_session'] is False
                assert data['session_age'] == 400

    def test_step_up_challenge_missing_data(self, client):
        """Test step-up challenge with missing data."""
        response = client.post('/api/v5/auth/step-up/challenge', json={})
        
        assert response.status_code == 200  # Should still work with default return_to
        data = json.loads(response.data)
        assert data['success'] is True

    def test_webauthn_challenge_missing_challenge_id(self, client):
        """Test WebAuthn challenge without challenge ID."""
        response = client.post('/api/v5/auth/step-up/webauthn/challenge', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Challenge ID required' in data['error']

    def test_webauthn_verify_missing_data(self, client):
        """Test WebAuthn verify without required data."""
        response = client.post('/api/v5/auth/step-up/webauthn/verify', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Challenge ID and assertion required' in data['error']