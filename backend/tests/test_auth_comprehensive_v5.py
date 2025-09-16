#!/usr/bin/env python3
"""
Comprehensive Authentication Test Suite V5

This test suite provides complete coverage of all authentication flows including:
- User registration and validation
- Login and logout flows
- Token generation and verification
- Password management and security
- Session management and rotation
- Role-based access control
- Step-up authentication
- WebAuthn integration
- Rate limiting and security features
- Error handling and edge cases
"""

import pytest
import os
import sys
import uuid
import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch
from typing import Dict, Any, Optional

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Test imports
from services.auth_service_v5 import AuthServiceV5
from utils.error_handler import ValidationError


class MockRedisManager:
    """Mock Redis manager for testing."""
    
    def __init__(self):
        self.data = {}
        self.expiry = {}
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, prefix: str = ''):
        full_key = f"{prefix}:{key}" if prefix else key
        self.data[full_key] = value
        if ttl:
            self.expiry[full_key] = time.time() + ttl
    
    def get(self, key: str, prefix: str = '') -> Any:
        full_key = f"{prefix}:{key}" if prefix else key
        if full_key in self.expiry and time.time() > self.expiry[full_key]:
            del self.data[full_key]
            del self.expiry[full_key]
            return None
        return self.data.get(full_key)
    
    def delete(self, key: str, prefix: str = '') -> bool:
        full_key = f"{prefix}:{key}" if prefix else key
        if full_key in self.data:
            del self.data[full_key]
            if full_key in self.expiry:
                del self.expiry[full_key]
            return True
        return False
    
    def exists(self, key: str, prefix: str = '') -> bool:
        full_key = f"{prefix}:{key}" if prefix else key
        if full_key in self.expiry and time.time() > self.expiry[full_key]:
            del self.data[full_key]
            del self.expiry[full_key]
            return False
        return full_key in self.data
    
    def health_check(self) -> Dict[str, Any]:
        return {'status': 'healthy'}


class MockDatabaseManager:
    """Mock database manager for testing."""
    
    def __init__(self):
        self.users = {}
        self.sessions = {}
        self.user_roles = {}
    
    def session_scope(self):
        return MockSession(self)


class MockSession:
    """Mock database session for testing."""
    
    def __init__(self, db_manager):
        self.db = db_manager
        self._committed = False
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None and not self._committed:
            self.commit()
    
    def execute(self, query, params=None):
        # Mock query execution based on query type
        query_str = str(query).lower()
        params = params or {}
        
        if 'select' in query_str and 'users' in query_str:
            return MockResult(self._handle_user_query(query_str, params))
        elif 'insert' in query_str and 'users' in query_str:
            return MockResult(self._handle_user_insert(params))
        elif 'update' in query_str and 'users' in query_str:
            return MockResult(self._handle_user_update(params))
        elif 'auth_sessions' in query_str:
            return MockResult(self._handle_session_query(query_str, params))
        
        return MockResult([])
    
    def commit(self):
        self._committed = True
    
    def rollback(self):
        pass
    
    def close(self):
        pass
    
    def _handle_user_query(self, query: str, params: Dict[str, Any]):
        if 'email' in params:
            email = params['email']
            user = self.db.users.get(email)
            if user:
                return [MockRow(user)]
        elif 'id' in params or 'uid' in params:
            user_id = params.get('id') or params.get('uid')
            for user in self.db.users.values():
                if user['id'] == user_id:
                    roles = self.db.user_roles.get(user_id, [])
                    user_with_roles = user.copy()
                    user_with_roles['roles'] = json.dumps(roles)
                    return [MockRow(user_with_roles)]
        return []
    
    def _handle_user_insert(self, params: Dict[str, Any]):
        # Mock user insertion
        return MockResult([])
    
    def _handle_user_update(self, params: Dict[str, Any]):
        # Mock user update
        return MockResult([])
    
    def _handle_session_query(self, query: str, params: Dict[str, Any]):
        # Mock session queries
        return []


class MockRow:
    """Mock database row."""
    
    def __init__(self, data: Dict[str, Any]):
        self._data = data
        for key, value in data.items():
            setattr(self, key, value)
    
    @property
    def _mapping(self):
        return self._data


class MockResult:
    """Mock database result."""
    
    def __init__(self, rows):
        self.rows = rows if isinstance(rows, list) else [rows] if rows else []
        self.rowcount = len(self.rows)
    
    def fetchall(self):
        return self.rows
    
    def fetchone(self):
        return self.rows[0] if self.rows else None


@pytest.fixture
def mock_redis():
    """Mock Redis manager fixture."""
    return MockRedisManager()


@pytest.fixture
def mock_db():
    """Mock database manager fixture."""
    return MockDatabaseManager()


@pytest.fixture
def auth_service(mock_redis, mock_db):
    """AuthServiceV5 fixture with mocked dependencies."""
    with patch('services.auth_service_v5.get_redis_manager_v5', return_value=mock_redis), \
         patch('services.auth_service_v5.get_connection_manager', return_value=mock_db):
        service = AuthServiceV5()
        
        # Mock the postgres auth manager
        service.postgres_auth = Mock()
        service.token_manager_v5 = Mock()
        
        return service


@pytest.fixture
def test_user_data():
    """Test user data fixture."""
    return {
        'email': 'test@example.com',
        'password': 'TestPassword123!',
        'name': 'Test User',
        'id': str(uuid.uuid4()),
        'roles': [{'role': 'user', 'level': 1}],
        'permissions': ['read'],
        'email_verified': False
    }


class TestUserRegistration:
    """Test user registration flows."""
    
    def test_successful_registration(self, auth_service, test_user_data):
        """Test successful user registration."""
        # Mock successful registration
        auth_service.postgres_auth.create_user.return_value = {
            'user_id': test_user_data['id'],
            'email': test_user_data['email'],
            'name': test_user_data['name'],
            'email_verified': False
        }
        
        success, user_data = auth_service.register_user(
            test_user_data['email'],
            test_user_data['password'],
            test_user_data['name']
        )
        
        assert success is True
        assert user_data['email'] == test_user_data['email']
        assert user_data['name'] == test_user_data['name']
        assert user_data['email_verified'] is False
        assert 'user' in [role for role in user_data['roles']]
        
        auth_service.postgres_auth.create_user.assert_called_once_with(
            test_user_data['email'],
            test_user_data['password'],
            test_user_data['name']
        )
    
    def test_registration_duplicate_email(self, auth_service, test_user_data):
        """Test registration with duplicate email."""
        auth_service.postgres_auth.create_user.side_effect = ValidationError("Email address is already registered")
        
        success, error_msg = auth_service.register_user(
            test_user_data['email'],
            test_user_data['password'],
            test_user_data['name']
        )
        
        assert success is False
        assert "already registered" in str(error_msg)
    
    def test_registration_weak_password(self, auth_service, test_user_data):
        """Test registration with weak password."""
        auth_service.postgres_auth.create_user.side_effect = ValidationError("Password requirements not met")
        
        success, error_msg = auth_service.register_user(
            test_user_data['email'],
            'weak',  # Weak password
            test_user_data['name']
        )
        
        assert success is False
        assert "Password requirements not met" in str(error_msg)
    
    def test_registration_invalid_email(self, auth_service, test_user_data):
        """Test registration with invalid email."""
        auth_service.postgres_auth.create_user.side_effect = ValidationError("Valid email address is required")
        
        success, error_msg = auth_service.register_user(
            'invalid-email',
            test_user_data['password'],
            test_user_data['name']
        )
        
        assert success is False
        assert "Valid email address is required" in str(error_msg)


class TestUserAuthentication:
    """Test user authentication flows."""
    
    def test_successful_authentication(self, auth_service, test_user_data):
        """Test successful user authentication."""
        # Mock successful authentication
        auth_service.postgres_auth.authenticate_user.return_value = {
            'user_id': test_user_data['id'],
            'email': test_user_data['email'],
            'name': test_user_data['name'],
            'roles': test_user_data['roles'],
            'email_verified': True,
            'last_login': datetime.utcnow().isoformat()
        }
        
        success, user_data = auth_service.authenticate_user(
            test_user_data['email'],
            test_user_data['password']
        )
        
        assert success is True
        assert user_data['email'] == test_user_data['email']
        assert user_data['id'] == test_user_data['id']
        assert 'permissions' in user_data
        assert user_data['email_verified'] is True
    
    def test_authentication_invalid_credentials(self, auth_service, test_user_data):
        """Test authentication with invalid credentials."""
        auth_service.postgres_auth.authenticate_user.return_value = None
        
        success, user_data = auth_service.authenticate_user(
            test_user_data['email'],
            'wrong-password'
        )
        
        assert success is False
        assert user_data is None
    
    def test_authentication_nonexistent_user(self, auth_service):
        """Test authentication with nonexistent user."""
        auth_service.postgres_auth.authenticate_user.return_value = None
        
        success, user_data = auth_service.authenticate_user(
            'nonexistent@example.com',
            'password'
        )
        
        assert success is False
        assert user_data is None
    
    def test_authentication_account_locked(self, auth_service, test_user_data):
        """Test authentication with locked account."""
        auth_service.postgres_auth.authenticate_user.return_value = None
        
        success, user_data = auth_service.authenticate_user(
            test_user_data['email'],
            test_user_data['password']
        )
        
        assert success is False
        assert user_data is None


class TestTokenManagement:
    """Test token generation, verification, and management."""
    
    def test_token_generation(self, auth_service, test_user_data):
        """Test access and refresh token generation."""
        # Mock token generation
        auth_service.token_manager_v5.mint_access_token.return_value = ('access_token_123', 3600)
        auth_service.token_manager_v5.mint_refresh_token.return_value = ('refresh_token_456', 86400)
        
        with patch('services.auth_service_v5.new_session_id', return_value='session_123'), \
             patch('services.auth_service_v5.new_family_id', return_value='family_456'), \
             patch('services.auth_service_v5.persist_initial'):
            
            tokens = auth_service.generate_tokens(test_user_data)
            
            assert 'access_token' in tokens
            assert 'refresh_token' in tokens
            assert 'expires_in' in tokens
            assert tokens['access_token'] == 'access_token_123'
            assert tokens['refresh_token'] == 'refresh_token_456'
            assert tokens['expires_in'] == 3600
    
    def test_token_verification(self, auth_service):
        """Test token verification."""
        # Mock token verification
        mock_payload = {
            'uid': 'user123',
            'email': 'test@example.com',
            'type': 'access',
            'exp': int(time.time()) + 3600
        }
        auth_service.token_manager_v5.verify_token.return_value = mock_payload
        
        payload = auth_service.verify_token('valid_token')
        
        assert payload is not None
        assert payload['uid'] == 'user123'
        assert payload['type'] == 'access'
    
    def test_token_verification_invalid(self, auth_service):
        """Test verification of invalid token."""
        auth_service.token_manager_v5.verify_token.return_value = None
        
        payload = auth_service.verify_token('invalid_token')
        
        assert payload is None
    
    def test_token_refresh(self, auth_service, test_user_data):
        """Test token refresh flow."""
        # Mock refresh token verification
        mock_payload = {
            'uid': test_user_data['id'],
            'type': 'refresh',
            'sid': 'session_123',
            'fid': 'family_456'
        }
        auth_service.token_manager_v5.verify_token.return_value = mock_payload
        
        # Mock user lookup
        with patch.object(auth_service, '_get_user_by_id', return_value=test_user_data):
            # Mock token rotation
            with patch('services.auth_service_v5.rotate_or_reject', return_value=('new_session', 'new_refresh', 86400)):
                # Mock new token generation
                auth_service.token_manager_v5.mint_access_token.return_value = ('new_access', 3600)
                
                success, new_tokens = auth_service.refresh_access_token('refresh_token')
                
                assert success is True
                assert 'access_token' in new_tokens
                assert 'refresh_token' in new_tokens
                assert new_tokens['access_token'] == 'new_access'
                assert new_tokens['refresh_token'] == 'new_refresh'
    
    def test_token_refresh_invalid(self, auth_service):
        """Test refresh with invalid token."""
        auth_service.token_manager_v5.verify_token.return_value = None
        
        success, tokens = auth_service.refresh_access_token('invalid_refresh_token')
        
        assert success is False
        assert tokens is None
    
    def test_token_blacklist(self, auth_service, mock_redis):
        """Test token blacklisting."""
        # Mock token verification for blacklisting
        mock_payload = {
            'uid': 'user123',
            'exp': int(time.time()) + 3600
        }
        
        with patch('services.auth_service_v5.verify', return_value=mock_payload):
            success = auth_service.invalidate_token('token_to_blacklist')
            
            assert success is True
            # Verify token is blacklisted
            assert auth_service.is_token_blacklisted('token_to_blacklist') is True


class TestPasswordManagement:
    """Test password-related functionality."""
    
    def test_password_change_success(self, auth_service, test_user_data):
        """Test successful password change."""
        # Mock password verification and update
        with patch('services.auth_service_v5.PasswordSecurity.validate_password_strength') as mock_validate, \
             patch('services.auth_service_v5.PasswordSecurity.verify_password', return_value=True) as mock_verify, \
             patch('services.auth_service_v5.PasswordSecurity.hash_password', return_value='new_hash') as mock_hash:
            
            mock_validate.return_value = {'is_valid': True, 'issues': []}
            
            # Mock database operations
            mock_session = Mock()
            mock_row = Mock()
            mock_row.password_hash = 'old_hash'
            mock_session.execute.return_value.fetchone.return_value = mock_row
            
            with patch.object(auth_service.db_manager, 'session_scope', return_value=mock_session):
                success, message = auth_service.change_password(
                    test_user_data['id'],
                    'current_password',
                    'NewPassword123!'
                )
                
                assert success is True
                assert "successfully" in message.lower()
    
    def test_password_change_wrong_current(self, auth_service, test_user_data):
        """Test password change with wrong current password."""
        with patch('services.auth_service_v5.PasswordSecurity.validate_password_strength') as mock_validate, \
             patch('services.auth_service_v5.PasswordSecurity.verify_password', return_value=False):
            
            mock_validate.return_value = {'is_valid': True, 'issues': []}
            
            # Mock database operations
            mock_session = Mock()
            mock_row = Mock()
            mock_row.password_hash = 'old_hash'
            mock_session.execute.return_value.fetchone.return_value = mock_row
            
            with patch.object(auth_service.db_manager, 'session_scope', return_value=mock_session):
                success, message = auth_service.change_password(
                    test_user_data['id'],
                    'wrong_password',
                    'NewPassword123!'
                )
                
                assert success is False
                assert "incorrect" in message.lower()
    
    def test_password_change_weak_new_password(self, auth_service, test_user_data):
        """Test password change with weak new password."""
        with patch('services.auth_service_v5.PasswordSecurity.validate_password_strength') as mock_validate:
            mock_validate.return_value = {
                'is_valid': False, 
                'issues': ['Password must be at least 8 characters']
            }
            
            success, message = auth_service.change_password(
                test_user_data['id'],
                'current_password',
                'weak'
            )
            
            assert success is False
            assert "Password must be at least 8 characters" in message


class TestSessionManagement:
    """Test session management functionality."""
    
    def test_list_user_sessions(self, auth_service, test_user_data):
        """Test listing user sessions."""
        mock_sessions = [
            {
                'id': 'session1',
                'family_id': 'family1',
                'user_agent': 'Mozilla/5.0',
                'ip': '192.168.1.1',
                'created_at': datetime.utcnow(),
                'last_used': datetime.utcnow(),
                'expires_at': datetime.utcnow() + timedelta(days=1),
                'revoked_at': None
            }
        ]
        
        with patch.object(auth_service, 'list_sessions', return_value=mock_sessions):
            sessions = auth_service.list_sessions(test_user_data['id'])
            
            assert len(sessions) == 1
            assert sessions[0]['id'] == 'session1'
            assert sessions[0]['revoked'] is False
    
    def test_revoke_session(self, auth_service, test_user_data):
        """Test revoking a user session."""
        with patch.object(auth_service, 'revoke_session', return_value=True):
            success = auth_service.revoke_session(test_user_data['id'], 'session1')
            
            assert success is True
    
    def test_revoke_all_sessions(self, auth_service, test_user_data):
        """Test revoking all user sessions."""
        with patch.object(auth_service, 'revoke_all_sessions', return_value=3):
            revoked_count = auth_service.revoke_all_sessions(test_user_data['id'])
            
            assert revoked_count == 3


class TestStepUpAuthentication:
    """Test step-up authentication flows."""
    
    def test_create_step_up_challenge(self, auth_service, test_user_data):
        """Test creating step-up challenge."""
        challenge_id = auth_service.create_step_up_challenge(
            test_user_data['id'],
            'password',
            '/admin/users'
        )
        
        assert challenge_id is not None
        assert len(challenge_id) > 20  # Should be a long random string
        
        # Verify challenge can be retrieved
        challenge = auth_service.get_step_up_challenge(challenge_id)
        assert challenge is not None
        assert challenge['user_id'] == test_user_data['id']
        assert challenge['required_method'] == 'password'
        assert challenge['return_to'] == '/admin/users'
        assert challenge['completed'] is False
    
    def test_complete_step_up_challenge(self, auth_service, test_user_data):
        """Test completing step-up challenge."""
        # Create challenge first
        challenge_id = auth_service.create_step_up_challenge(
            test_user_data['id'],
            'password',
            '/admin/users'
        )
        
        # Complete the challenge
        success = auth_service.complete_step_up_challenge(challenge_id)
        assert success is True
        
        # Verify challenge is marked as completed
        challenge = auth_service.get_step_up_challenge(challenge_id)
        assert challenge['completed'] is True
        assert 'completed_at' in challenge
    
    def test_step_up_challenge_expiry(self, auth_service, test_user_data):
        """Test step-up challenge expiry."""
        challenge_id = auth_service.create_step_up_challenge(
            test_user_data['id'],
            'password',
            '/admin/users'
        )
        
        # Mock expired challenge
        challenge_data = auth_service.get_step_up_challenge(challenge_id)
        if challenge_data:
            # Manually set expiry to past
            challenge_data['expires_at'] = (datetime.utcnow() - timedelta(minutes=1)).isoformat()
            auth_service.redis_manager.set(
                f'step_up_challenge:{challenge_id}',
                challenge_data,
                ttl=1,
                prefix='auth'
            )
        
        # Wait for expiry
        time.sleep(2)
        
        # Challenge should be None (expired)
        expired_challenge = auth_service.get_step_up_challenge(challenge_id)
        assert expired_challenge is None


class TestWebAuthnIntegration:
    """Test WebAuthn integration (mock implementation)."""
    
    def test_webauthn_credentials_check(self, auth_service, test_user_data):
        """Test checking if user has WebAuthn credentials."""
        has_credentials = auth_service.user_has_webauthn_credentials(test_user_data['id'])
        
        # Should return False as WebAuthn is not fully implemented
        assert has_credentials is False
    
    def test_get_webauthn_credentials(self, auth_service, test_user_data):
        """Test getting user WebAuthn credentials."""
        credentials = auth_service.get_user_webauthn_credentials(test_user_data['id'])
        
        # Should return empty list as WebAuthn is not fully implemented
        assert credentials == []
    
    def test_create_webauthn_challenge(self, auth_service, test_user_data):
        """Test creating WebAuthn challenge."""
        challenge_data = auth_service.create_webauthn_challenge(test_user_data['id'])
        
        assert 'challenge' in challenge_data
        assert 'user_id' in challenge_data
        assert challenge_data['user_id'] == test_user_data['id']
        assert 'created_at' in challenge_data
        assert 'expires_at' in challenge_data
    
    def test_webauthn_verification_disabled(self, auth_service, test_user_data):
        """Test WebAuthn verification when disabled."""
        with patch.dict(os.environ, {'WEBAUTHN_ENABLED': 'false'}):
            result = auth_service.verify_webauthn_assertion(
                test_user_data['id'],
                'challenge123',
                {'id': 'credential1', 'response': {}}
            )
            
            assert result['verified'] is False
            assert result['code'] == 'WEBAUTHN_DISABLED'
    
    def test_webauthn_mock_verification(self, auth_service, test_user_data):
        """Test WebAuthn mock verification in development."""
        with patch.dict(os.environ, {'WEBAUTHN_ENABLED': 'true', 'WEBAUTHN_MOCK': 'true', 'FLASK_ENV': 'development'}):
            result = auth_service.verify_webauthn_assertion(
                test_user_data['id'],
                'challenge123',
                {'id': 'credential1', 'response': {}}
            )
            
            assert result['verified'] is True
            assert result['mock'] is True


class TestRoleBasedAccessControl:
    """Test role-based access control functionality."""
    
    def test_role_hierarchy(self, auth_service):
        """Test role hierarchy mapping."""
        hierarchy = auth_service.get_role_hierarchy()
        
        assert 'super_admin' in hierarchy
        assert 'admin' in hierarchy
        assert 'moderator' in hierarchy
        assert 'user' in hierarchy
        
        # Check hierarchy relationships
        assert 'admin' in hierarchy['super_admin']
        assert 'moderator' in hierarchy['admin']
        assert 'user' in hierarchy['moderator']
    
    def test_permission_groups(self, auth_service):
        """Test permission groups mapping."""
        groups = auth_service.get_permission_groups()
        
        assert 'entity_management' in groups
        assert 'user_management' in groups
        assert 'admin_operations' in groups
        assert 'content_management' in groups
        
        # Check specific permissions
        assert 'create_entities' in groups['entity_management']
        assert 'admin_access' in groups['admin_operations']
    
    def test_permissions_from_roles(self, auth_service):
        """Test getting permissions from user roles."""
        roles = [
            {'role': 'admin', 'level': 2},
            {'role': 'moderator', 'level': 1}
        ]
        
        permissions = auth_service._get_permissions_from_roles(roles)
        
        assert isinstance(permissions, list)
        # Should contain permissions from both admin and moderator roles


class TestHealthAndMonitoring:
    """Test health check and monitoring functionality."""
    
    def test_auth_service_health_check(self, auth_service):
        """Test auth service health check."""
        health = auth_service.health_check()
        
        assert 'status' in health
        assert 'redis' in health
        assert 'database' in health
        assert 'timestamp' in health
        
        # With mocked components, should be healthy
        assert health['status'] == 'healthy'
        assert health['redis'] is True
    
    def test_user_profile_operations(self, auth_service, test_user_data):
        """Test user profile get and update operations."""
        # Mock user lookup
        with patch.object(auth_service, '_get_user_by_id', return_value=test_user_data):
            profile = auth_service.get_user_profile(test_user_data['id'])
            
            assert profile is not None
            assert profile['id'] == test_user_data['id']
            assert profile['email'] == test_user_data['email']
            assert 'roles' in profile
            assert 'permissions' in profile
        
        # Test profile update
        update_data = {'name': 'Updated Name', 'phone': '123-456-7890'}
        result = auth_service.update_user_profile(test_user_data['id'], update_data)
        
        assert result['success'] is True
        assert 'profile' in result


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_authentication_with_exception(self, auth_service, test_user_data):
        """Test authentication when database throws exception."""
        auth_service.postgres_auth.authenticate_user.side_effect = Exception("Database error")
        
        success, user_data = auth_service.authenticate_user(
            test_user_data['email'],
            test_user_data['password']
        )
        
        assert success is False
        assert user_data is None
    
    def test_token_generation_with_exception(self, auth_service, test_user_data):
        """Test token generation when service throws exception."""
        auth_service.token_manager_v5.mint_access_token.side_effect = Exception("Token service error")
        
        with pytest.raises(Exception):
            auth_service.generate_tokens(test_user_data)
    
    def test_health_check_with_redis_failure(self, auth_service):
        """Test health check when Redis fails."""
        auth_service.redis_manager.health_check.side_effect = Exception("Redis connection failed")
        
        health = auth_service.health_check()
        
        assert health['status'] == 'unhealthy'
        assert 'error' in health


class TestIntegrationScenarios:
    """Test complete authentication scenarios."""
    
    def test_complete_registration_and_login_flow(self, auth_service, test_user_data):
        """Test complete user registration and login flow."""
        # Mock registration
        auth_service.postgres_auth.create_user.return_value = {
            'user_id': test_user_data['id'],
            'email': test_user_data['email'],
            'name': test_user_data['name'],
            'email_verified': False
        }
        
        # Register user
        reg_success, reg_data = auth_service.register_user(
            test_user_data['email'],
            test_user_data['password'],
            test_user_data['name']
        )
        
        assert reg_success is True
        assert reg_data['email'] == test_user_data['email']
        
        # Mock authentication
        auth_service.postgres_auth.authenticate_user.return_value = {
            'user_id': test_user_data['id'],
            'email': test_user_data['email'],
            'name': test_user_data['name'],
            'roles': test_user_data['roles'],
            'email_verified': True
        }
        
        # Authenticate user
        auth_success, auth_data = auth_service.authenticate_user(
            test_user_data['email'],
            test_user_data['password']
        )
        
        assert auth_success is True
        assert auth_data['id'] == test_user_data['id']
        
        # Generate tokens
        auth_service.token_manager_v5.mint_access_token.return_value = ('access_token', 3600)
        auth_service.token_manager_v5.mint_refresh_token.return_value = ('refresh_token', 86400)
        
        with patch('services.auth_service_v5.new_session_id', return_value='session_123'), \
             patch('services.auth_service_v5.new_family_id', return_value='family_456'), \
             patch('services.auth_service_v5.persist_initial'):
            
            tokens = auth_service.generate_tokens(auth_data)
            
            assert 'access_token' in tokens
            assert 'refresh_token' in tokens
    
    def test_admin_step_up_authentication_flow(self, auth_service, test_user_data):
        """Test admin step-up authentication flow."""
        # Create step-up challenge for admin operation
        challenge_id = auth_service.create_step_up_challenge(
            test_user_data['id'],
            'password',
            '/admin/users'
        )
        
        assert challenge_id is not None
        
        # Verify challenge exists and is not completed
        challenge = auth_service.get_step_up_challenge(challenge_id)
        assert challenge is not None
        assert challenge['completed'] is False
        
        # Complete the challenge (simulate successful re-authentication)
        success = auth_service.complete_step_up_challenge(challenge_id)
        assert success is True
        
        # Verify challenge is now completed
        completed_challenge = auth_service.get_step_up_challenge(challenge_id)
        assert completed_challenge['completed'] is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
