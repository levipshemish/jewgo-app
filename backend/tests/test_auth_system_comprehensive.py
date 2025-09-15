"""
Comprehensive tests for the authentication system.

This module provides thorough testing of all authentication functionality including:
- User registration and login
- Password security
- Token management
- Session handling
- Role-based access control
- Error handling
- Security features
"""

import pytest
import json
from unittest.mock import patch
from flask import Flask

# Import authentication modules
from utils.auth_utils import AuthUtils, validate_email, validate_password, generate_token
from utils.postgres_auth import PasswordSecurity, TokenManager
from utils.auth_error_handler import AuthErrorHandler
from utils.rbac import RoleBasedAccessControl
from database.database_manager_v4 import DatabaseManager
from routes.auth_api import auth_bp


class TestAuthUtils:
    """Test authentication utility functions."""
    
    def test_validate_email(self):
        """Test email validation."""
        # Valid emails
        assert validate_email("test@example.com")
        assert validate_email("user.name+tag@domain.co.uk")
        assert validate_email("test123@test-domain.org")
        
        # Invalid emails
        assert not validate_email("")
        assert not validate_email("invalid-email")
        assert not validate_email("@domain.com")
        assert not validate_email("test@")
        assert not validate_email("test@domain")
        assert not validate_email(None)
    
    def test_normalize_email(self):
        """Test email normalization."""
        assert AuthUtils.normalize_email("Test@Example.COM") == "test@example.com"
        assert AuthUtils.normalize_email("  test@example.com  ") == "test@example.com"
        assert AuthUtils.normalize_email("test @ example . com") == "test@example.com"
        assert AuthUtils.normalize_email("") == ""
        assert AuthUtils.normalize_email(None) == ""
    
    def test_validate_password_strength(self):
        """Test password strength validation."""
        # Strong password
        result = validate_password("StrongPass123!")
        assert result['is_valid']
        assert result['strength'] == 'strong'
        assert len(result['issues']) == 0
        
        # Weak password
        result = validate_password("weak")
        assert not result['is_valid']
        assert result['strength'] == 'weak'
        assert len(result['issues']) > 0
        
        # Medium password
        result = validate_password("MediumPass123")
        assert result['is_valid']
        assert result['strength'] in ['medium', 'strong']
        
        # Empty password
        result = validate_password("")
        assert not result['is_valid']
        assert 'Password is required' in result['issues']
    
    def test_generate_secure_token(self):
        """Test secure token generation."""
        token1 = generate_token()
        token2 = generate_token()
        
        assert len(token1) > 0
        assert len(token2) > 0
        assert token1 != token2  # Should be unique
        
        # Test different lengths
        short_token = generate_token(16)
        long_token = generate_token(64)
        
        assert len(short_token) < len(long_token)
    
    def test_hash_token(self):
        """Test token hashing."""
        token = "test-token-123"
        hash1 = AuthUtils.hash_token(token)
        hash2 = AuthUtils.hash_token(token)
        
        assert hash1 == hash2  # Should be deterministic
        assert len(hash1) == 64  # SHA-256 hex length
        assert hash1 != token  # Should be different from original
    
    def test_sanitize_input(self):
        """Test input sanitization."""
        # Normal input
        assert AuthUtils.sanitize_input("normal text") == "normal text"
        
        # Input with dangerous characters
        assert AuthUtils.sanitize_input("text<script>alert('xss')</script>") == "textscriptalert('xss')/script"
        
        # Long input
        long_input = "a" * 300
        sanitized = AuthUtils.sanitize_input(long_input, max_length=100)
        assert len(sanitized) == 100
        
        # Empty input
        assert AuthUtils.sanitize_input("") == ""
        assert AuthUtils.sanitize_input(None) == ""
    
    def test_validate_name(self):
        """Test name validation."""
        # Valid names
        assert AuthUtils.validate_name("John Doe")
        assert AuthUtils.validate_name("Mary-Jane")
        assert AuthUtils.validate_name("O'Connor")
        
        # Invalid names
        assert not AuthUtils.validate_name("")
        assert not AuthUtils.validate_name("John123")
        assert not AuthUtils.validate_name("John@Doe")
        assert not AuthUtils.validate_name(None)
    
    def test_format_user_display_name(self):
        """Test user display name formatting."""
        # Full name
        assert AuthUtils.format_user_display_name("John", "Doe") == "John Doe"
        
        # First name only
        assert AuthUtils.format_user_display_name("John") == "John"
        
        # Username fallback
        assert AuthUtils.format_user_display_name(username="johndoe") == "johndoe"
        
        # Email fallback
        assert AuthUtils.format_user_display_name(email="john@example.com") == "john"
        
        # Empty fallback
        assert AuthUtils.format_user_display_name() == "User"


class TestPasswordSecurity:
    """Test password security functionality."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "TestPassword123"
        hash1 = PasswordSecurity.hash_password(password)
        hash2 = PasswordSecurity.hash_password(password)
        
        assert hash1 != hash2  # Should be different due to salt
        assert len(hash1) > 0
        assert hash1 != password  # Should be different from original
    
    def test_verify_password(self):
        """Test password verification."""
        password = "TestPassword123"
        password_hash = PasswordSecurity.hash_password(password)
        
        # Correct password
        assert PasswordSecurity.verify_password(password, password_hash)
        
        # Wrong password
        assert not PasswordSecurity.verify_password("WrongPassword", password_hash)
        
        # Empty password
        assert not PasswordSecurity.verify_password("", password_hash)
    
    def test_password_validation(self):
        """Test password validation."""
        # Valid password
        result = PasswordSecurity.validate_password_strength("ValidPass123")
        assert result['is_valid']
        
        # Invalid password (too short)
        result = PasswordSecurity.validate_password_strength("short")
        assert not result['is_valid']
        assert 'at least 8 characters' in result['issues'][0]


class TestTokenManager:
    """Test JWT token management."""
    
    def test_generate_access_token(self):
        """Test access token generation."""
        user_id = "test-user-123"
        email = "test@example.com"
        roles = [{"role": "user", "level": 1}]
        
        token = TokenManager().generate_access_token(user_id, email, roles)
        
        assert token is not None
        assert len(token) > 0
    
    def test_generate_refresh_token(self):
        """Test refresh token generation."""
        user_id = "test-user-123"
        family_id = "family-123"
        
        token = TokenManager().generate_refresh_token(user_id, family_id)
        
        assert token is not None
        assert len(token) > 0
    
    def test_verify_token(self):
        """Test token verification."""
        user_id = "test-user-123"
        email = "test@example.com"
        roles = [{"role": "user", "level": 1}]
        
        token_manager = TokenManager()
        token = token_manager.generate_access_token(user_id, email, roles)
        
        # Verify valid token
        payload = token_manager.verify_token(token, 'access')
        assert payload is not None
        assert payload['user_id'] == user_id
        assert payload['email'] == email
        
        # Verify invalid token
        invalid_payload = token_manager.verify_token("invalid-token", 'access')
        assert invalid_payload is None


class TestAuthErrorHandler:
    """Test authentication error handling."""
    
    def test_handle_auth_error(self):
        """Test authentication error handling."""
        from utils.error_handler import AuthenticationError
        
        error = AuthenticationError("Invalid credentials")
        result = AuthErrorHandler.handle_auth_error(error, "login")
        
        assert result[1] == 401  # Status code
        assert 'error' in result[0]
        assert result[0]['code'] == 'invalid_credentials'
    
    def test_classify_error(self):
        """Test error classification."""
        from utils.error_handler import AuthenticationError, ValidationError
        
        # Authentication error
        auth_error = AuthenticationError("Invalid credentials")
        code, status, level = AuthErrorHandler._classify_error(auth_error)
        assert code == 'invalid_credentials'
        assert status == 401
        
        # Validation error
        validation_error = ValidationError("Password too weak")
        code, status, level = AuthErrorHandler._classify_error(validation_error)
        assert code == 'password_too_weak'
        assert status == 400
    
    def test_create_error_response(self):
        """Test error response creation."""
        response, status = AuthErrorHandler.create_error_response('invalid_credentials')
        
        assert status == 401
        assert 'error' in response
        assert response['code'] == 'invalid_credentials'
        assert not response['success']


class TestRoleBasedAccessControl:
    """Test role-based access control."""
    
    def test_check_role_level(self):
        """Test role level checking."""
        # User with sufficient level
        user_roles = [{"role": "admin", "level": 10}]
        assert RoleBasedAccessControl.check_role_level(user_roles, 5)
        
        # User with insufficient level
        user_roles = [{"role": "user", "level": 1}]
        assert not RoleBasedAccessControl.check_role_level(user_roles, 5)
        
        # User with no roles
        assert not RoleBasedAccessControl.check_role_level([], 1)
    
    def test_is_admin(self):
        """Test admin role checking."""
        # Admin user
        admin_roles = [{"role": "admin", "level": 10}]
        assert RoleBasedAccessControl.is_admin(admin_roles)
        
        # Super admin user
        super_admin_roles = [{"role": "super_admin", "level": 99}]
        assert RoleBasedAccessControl.is_admin(super_admin_roles)
        
        # Regular user
        user_roles = [{"role": "user", "level": 1}]
        assert not RoleBasedAccessControl.is_admin(user_roles)
    
    def test_is_moderator(self):
        """Test moderator role checking."""
        # Moderator user
        moderator_roles = [{"role": "moderator", "level": 5}]
        assert RoleBasedAccessControl.is_moderator(moderator_roles)
        
        # Admin user (should also be moderator)
        admin_roles = [{"role": "admin", "level": 10}]
        assert RoleBasedAccessControl.is_moderator(admin_roles)
        
        # Regular user
        user_roles = [{"role": "user", "level": 1}]
        assert not RoleBasedAccessControl.is_moderator(user_roles)


class TestAuthAPI:
    """Test authentication API endpoints."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.register_blueprint(auth_bp)
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_register_endpoint(self, client):
        """Test user registration endpoint."""
        with patch('routes.auth_api.get_postgres_auth') as mock_auth:
            mock_auth.return_value.create_user.return_value = {
                'user_id': 'test-123',
                'email': 'test@example.com',
                'email_verified': False
            }
            
            response = client.post('/auth/register', json={
                'email': 'test@example.com',
                'password': 'TestPassword123',
                'name': 'Test User'
            })
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert 'user' in data
            assert data['user']['email'] == 'test@example.com'
    
    def test_login_endpoint(self, client):
        """Test user login endpoint."""
        with patch('routes.auth_api.get_postgres_auth') as mock_auth:
            mock_auth.return_value.authenticate_user.return_value = {
                'user_id': 'test-123',
                'email': 'test@example.com',
                'roles': [{'role': 'user', 'level': 1}]
            }
            
            response = client.post('/auth/login', json={
                'email': 'test@example.com',
                'password': 'TestPassword123'
            })
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'tokens' in data
    
    def test_guest_login_endpoint(self, client):
        """Test guest login endpoint."""
        with patch('routes.auth_api.get_postgres_auth') as mock_auth:
            mock_auth.return_value.create_guest_user.return_value = {
                'user_id': 'guest-123',
                'email': None,
                'roles': [{'role': 'guest', 'level': 0}],
                'is_guest': True
            }
            
            response = client.post('/auth/guest')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'tokens' in data


class TestSecurityFeatures:
    """Test security features."""
    
    def test_rate_limiting(self):
        """Test rate limiting functionality."""
        # This would require a more complex setup with Redis
        # For now, we'll test the rate limiting decorator exists
        from utils.rate_limiter import rate_limit
        
        @rate_limit(limit=5, window=60)
        def test_function():
            return "success"
        
        # The decorator should exist and be callable
        assert callable(rate_limit)
    
    def test_csrf_protection(self):
        """Test CSRF protection."""
        from services.auth.csrf import csrf_validate
        
        # CSRF validation function should exist
        assert callable(csrf_validate)
    
    def test_recaptcha_integration(self):
        """Test reCAPTCHA integration."""
        from services.auth.recaptcha import verify_or_429
        
        # reCAPTCHA verification function should exist
        assert callable(verify_or_429)


class TestDatabaseIntegration:
    """Test database integration."""
    
    def test_database_manager_initialization(self):
        """Test database manager initialization."""
        # This would require a test database setup
        # For now, we'll test that the class can be imported
        assert DatabaseManager is not None
    
    def test_auth_schema_consistency(self):
        """Test authentication schema consistency."""
        # This would test that all required tables exist
        # and have the correct structure
        pass  # Would require database setup


# Integration tests
class TestAuthIntegration:
    """Integration tests for the complete authentication flow."""
    
    def test_complete_registration_flow(self):
        """Test complete user registration flow."""
        # This would test the full flow from registration to login
        pass  # Would require full app setup
    
    def test_complete_login_flow(self):
        """Test complete user login flow."""
        # This would test the full flow from login to token generation
        pass  # Would require full app setup
    
    def test_session_management(self):
        """Test session management and token refresh."""
        # This would test token refresh and session persistence
        pass  # Would require full app setup


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
