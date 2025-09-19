"""
Unit tests for CSRF Manager

Tests CSRF token generation, validation, timing attack resistance,
and environment-aware cookie configuration.
"""

import pytest
import time
import os
from datetime import datetime
from unittest.mock import patch
from flask import Flask

from utils.csrf_manager import CSRFManager, get_csrf_manager, init_csrf_manager


class TestCSRFManager:
    """Test cases for CSRFManager class."""
    
    @pytest.fixture
    def csrf_manager(self):
        """Create CSRF manager instance for testing."""
        return CSRFManager("test-secret-key-for-csrf-protection")
    
    @pytest.fixture
    def app_context(self):
        """Create Flask app context for testing."""
        app = Flask(__name__)
        with app.app_context():
            with app.test_request_context(
                headers={'User-Agent': 'Mozilla/5.0 (Test Browser)'}
            ):
                yield
    
    def test_csrf_manager_initialization(self):
        """Test CSRF manager initialization."""
        # Test successful initialization
        manager = CSRFManager("valid-secret-key")
        assert manager.secret_key == "valid-secret-key"
        assert manager.token_ttl == 24 * 60 * 60
        
        # Test initialization with empty secret key
        with pytest.raises(ValueError, match="CSRF secret key is required"):
            CSRFManager("")

        # Defaults to development-safe secret when none provided
        manager_default = CSRFManager()
        assert manager_default.secret_key == 'default-csrf-secret'

    def test_production_requires_secret(self, monkeypatch):
        """Ensure production-like environments enforce explicit CSRF secret."""
        monkeypatch.delenv('CSRF_SECRET_KEY', raising=False)
        monkeypatch.setenv('ENVIRONMENT', 'production')

        with pytest.raises(RuntimeError, match="CSRF_SECRET_KEY"):
            CSRFManager()

        monkeypatch.delenv('ENVIRONMENT', raising=False)
    
    def test_token_generation(self, csrf_manager, app_context):
        """Test CSRF token generation."""
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        
        # Generate token
        token = csrf_manager.generate_token(session_id, user_agent)
        
        # Verify token is generated
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token is base64 encoded
        import base64
        try:
            decoded = base64.b64decode(token.encode('utf-8')).decode('utf-8')
            assert ':' in decoded  # Should contain separators
        except Exception:
            pytest.fail("Token should be valid base64")
    
    def test_token_generation_without_user_agent(self, csrf_manager, app_context):
        """Test CSRF token generation without explicit user agent."""
        session_id = "test-session-123"
        
        # Generate token without user_agent parameter (should use request header)
        token = csrf_manager.generate_token(session_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_token_validation_success(self, csrf_manager, app_context):
        """Test successful CSRF token validation."""
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        
        # Generate and validate token
        token = csrf_manager.generate_token(session_id, user_agent)
        is_valid = csrf_manager.validate_token(token, session_id, user_agent)
        
        assert is_valid is True
    
    def test_token_validation_without_user_agent(self, csrf_manager, app_context):
        """Test CSRF token validation without explicit user agent."""
        session_id = "test-session-123"
        
        # Generate token without user_agent
        token = csrf_manager.generate_token(session_id)
        
        # Validate token without user_agent (should use request header)
        is_valid = csrf_manager.validate_token(token, session_id)
        
        assert is_valid is True
    
    def test_token_validation_invalid_session_id(self, csrf_manager, app_context):
        """Test CSRF token validation with invalid session ID."""
        session_id = "test-session-123"
        wrong_session_id = "wrong-session-456"
        user_agent = "Mozilla/5.0 (Test Browser)"
        
        # Generate token with one session ID, validate with another
        token = csrf_manager.generate_token(session_id, user_agent)
        is_valid = csrf_manager.validate_token(token, wrong_session_id, user_agent)
        
        assert is_valid is False
    
    def test_token_validation_invalid_user_agent(self, csrf_manager, app_context):
        """Test CSRF token validation with invalid user agent."""
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        wrong_user_agent = "Mozilla/5.0 (Different Browser)"
        
        # Generate token with one user agent, validate with another
        token = csrf_manager.generate_token(session_id, user_agent)
        is_valid = csrf_manager.validate_token(token, session_id, wrong_user_agent)
        
        assert is_valid is False
    
    def test_token_validation_invalid_format(self, csrf_manager):
        """Test CSRF token validation with invalid token format."""
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        
        # Test various invalid token formats
        invalid_tokens = [
            "",
            "invalid-token",
            "bm90LWEtdmFsaWQtdG9rZW4=",  # "not-a-valid-token" in base64
            "dGVzdDp0ZXN0",  # "test:test" in base64 (wrong format)
        ]
        
        for invalid_token in invalid_tokens:
            is_valid = csrf_manager.validate_token(invalid_token, session_id, user_agent)
            assert is_valid is False, f"Token '{invalid_token}' should be invalid"
    
    def test_token_validation_empty_inputs(self, csrf_manager):
        """Test CSRF token validation with empty inputs."""
        # Test empty token
        is_valid = csrf_manager.validate_token("", "session-id", "user-agent")
        assert is_valid is False
        
        # Test empty session ID
        is_valid = csrf_manager.validate_token("token", "", "user-agent")
        assert is_valid is False
        
        # Test None inputs
        is_valid = csrf_manager.validate_token(None, "session-id", "user-agent")
        assert is_valid is False
        
        is_valid = csrf_manager.validate_token("token", None, "user-agent")
        assert is_valid is False
    
    @patch('utils.csrf_manager.datetime')
    def test_token_validation_day_bucket_current_day(self, mock_datetime, csrf_manager, app_context):
        """Test CSRF token validation with current day bucket."""
        # Mock current time
        mock_now = datetime(2024, 1, 15, 12, 0, 0)
        mock_datetime.utcnow.return_value = mock_now
        
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        
        # Generate token
        token = csrf_manager.generate_token(session_id, user_agent)
        
        # Validate token (should work with current day)
        is_valid = csrf_manager.validate_token(token, session_id, user_agent)
        assert is_valid is True
    
    @patch('utils.csrf_manager.datetime')
    def test_token_validation_day_bucket_previous_day(self, mock_datetime, csrf_manager, app_context):
        """Test CSRF token validation with previous day bucket (clock skew tolerance)."""
        # Generate token on day 1
        day1 = datetime(2024, 1, 15, 12, 0, 0)
        mock_datetime.utcnow.return_value = day1
        
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        token = csrf_manager.generate_token(session_id, user_agent)
        
        # Validate token on day 2 (should still work)
        day2 = datetime(2024, 1, 16, 12, 0, 0)
        mock_datetime.utcnow.return_value = day2
        
        is_valid = csrf_manager.validate_token(token, session_id, user_agent)
        assert is_valid is True
    
    @patch('utils.csrf_manager.datetime')
    def test_token_validation_day_bucket_expired(self, mock_datetime, csrf_manager, app_context):
        """Test CSRF token validation with expired day bucket."""
        # Generate token on day 1
        day1 = datetime(2024, 1, 15, 12, 0, 0)
        mock_datetime.utcnow.return_value = day1
        
        session_id = "test-session-123"
        user_agent = "Mozilla/5.0 (Test Browser)"
        token = csrf_manager.generate_token(session_id, user_agent)
        
        # Validate token on day 3 (should fail - too old)
        day3 = datetime(2024, 1, 17, 12, 0, 0)
        mock_datetime.utcnow.return_value = day3
        
        is_valid = csrf_manager.validate_token(token, session_id, user_agent)
        assert is_valid is False
    
    def test_constant_time_compare(self, csrf_manager):
        """Test constant-time string comparison."""
        # Test equal strings
        assert csrf_manager._constant_time_compare("hello", "hello") is True
        assert csrf_manager._constant_time_compare("", "") is True
        
        # Test different strings of same length
        assert csrf_manager._constant_time_compare("hello", "world") is False
        assert csrf_manager._constant_time_compare("abcde", "fghij") is False
        
        # Test different lengths
        assert csrf_manager._constant_time_compare("hello", "hello world") is False
        assert csrf_manager._constant_time_compare("short", "a") is False
    
    def test_constant_time_compare_timing_resistance(self, csrf_manager):
        """Test that constant-time comparison is resistant to timing attacks."""
        # This is a basic test - in practice, timing attack resistance
        # would need more sophisticated testing
        
        string1 = "a" * 1000
        string2_same = "a" * 1000
        string2_diff = "b" + "a" * 999
        
        # Time comparisons (basic check)
        start_time = time.time()
        result1 = csrf_manager._constant_time_compare(string1, string2_same)
        time1 = time.time() - start_time
        
        start_time = time.time()
        result2 = csrf_manager._constant_time_compare(string1, string2_diff)
        time2 = time.time() - start_time
        
        assert result1 is True
        assert result2 is False
        
        # Times should be similar (within reasonable bounds)
        # This is a basic check - real timing attack testing would be more sophisticated
        time_diff = abs(time1 - time2)
        assert time_diff < 0.001  # Less than 1ms difference
    
    def test_cookie_config_production(self, csrf_manager):
        """Test cookie configuration for production environment."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            config = csrf_manager.get_csrf_cookie_config()
            
            assert config['secure'] is True
            assert config['httponly'] is False  # CSRF tokens need JS access
            assert config['samesite'] == 'None'
            assert config['domain'] == '.jewgo.app'
            assert config['max_age'] == 24 * 60 * 60
            assert config['path'] == '/'
    
    def test_cookie_config_preview(self, csrf_manager):
        """Test cookie configuration for preview environment."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'preview'}):
            config = csrf_manager.get_csrf_cookie_config()
            
            assert config['secure'] is True
            assert config['httponly'] is False
            assert config['samesite'] == 'None'
            assert config['domain'] is None  # Host-only for *.vercel.app
            assert config['max_age'] == 24 * 60 * 60
            assert config['path'] == '/'
    
    def test_cookie_config_staging(self, csrf_manager):
        """Test cookie configuration for staging environment."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'staging'}):
            config = csrf_manager.get_csrf_cookie_config()
            
            assert config['secure'] is True
            assert config['httponly'] is False
            assert config['samesite'] == 'None'
            assert config['domain'] is None
            assert config['max_age'] == 24 * 60 * 60
            assert config['path'] == '/'
    
    def test_cookie_config_development(self, csrf_manager):
        """Test cookie configuration for development environment."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'development'}):
            config = csrf_manager.get_csrf_cookie_config()
            
            assert config['secure'] is False  # Allow HTTP for local dev
            assert config['httponly'] is False
            assert config['samesite'] == 'Lax'
            assert config['domain'] is None
            assert config['max_age'] == 24 * 60 * 60
            assert config['path'] == '/'
    
    def test_cookie_config_default(self, csrf_manager):
        """Test cookie configuration with no environment set (defaults to development)."""
        with patch.dict(os.environ, {}, clear=True):
            config = csrf_manager.get_csrf_cookie_config()
            
            # Should default to development settings
            assert config['secure'] is False
            assert config['samesite'] == 'Lax'


class TestCSRFManagerGlobal:
    """Test cases for global CSRF manager functions."""
    
    def test_get_csrf_manager_with_env_var(self):
        """Test getting global CSRF manager with environment variable."""
        with patch.dict(os.environ, {'CSRF_SECRET_KEY': 'test-csrf-secret'}):
            # Clear global instance
            import utils.csrf_manager
            utils.csrf_manager._csrf_manager = None
            
            manager = get_csrf_manager()
            assert isinstance(manager, CSRFManager)
            assert manager.secret_key == b'test-csrf-secret'
    
    def test_get_csrf_manager_with_fallback_secret(self):
        """Test getting global CSRF manager with fallback to SECRET_KEY."""
        with patch.dict(os.environ, {'SECRET_KEY': 'fallback-secret'}, clear=True):
            # Clear global instance
            import utils.csrf_manager
            utils.csrf_manager._csrf_manager = None
            
            manager = get_csrf_manager()
            assert isinstance(manager, CSRFManager)
            assert manager.secret_key == b'fallback-secret'
    
    def test_get_csrf_manager_no_secret_key(self):
        """Test getting global CSRF manager without secret key."""
        with patch.dict(os.environ, {}, clear=True):
            # Clear global instance
            import utils.csrf_manager
            utils.csrf_manager._csrf_manager = None
            
            with pytest.raises(ValueError, match="CSRF_SECRET_KEY or SECRET_KEY environment variable is required"):
                get_csrf_manager()
    
    def test_init_csrf_manager(self):
        """Test initializing global CSRF manager with custom secret."""
        custom_secret = "custom-csrf-secret"
        manager = init_csrf_manager(custom_secret)
        
        assert isinstance(manager, CSRFManager)
        assert manager.secret_key == b'custom-csrf-secret'
        
        # Verify global instance is set
        assert get_csrf_manager() is manager


class TestCSRFManagerIntegration:
    """Integration tests for CSRF Manager."""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for integration testing."""
        app = Flask(__name__)
        app.config['SECRET_KEY'] = 'test-secret-key'
        return app
    
    def test_token_generation_and_validation_flow(self, app):
        """Test complete token generation and validation flow."""
        with app.test_request_context(
            headers={'User-Agent': 'Mozilla/5.0 (Integration Test)'}
        ):
            csrf_manager = CSRFManager("integration-test-secret")
            session_id = "integration-session-123"
            
            # Generate token
            token = csrf_manager.generate_token(session_id)
            assert token is not None
            
            # Validate token
            is_valid = csrf_manager.validate_token(token, session_id)
            assert is_valid is True
            
            # Validate with wrong session
            is_valid = csrf_manager.validate_token(token, "wrong-session")
            assert is_valid is False
    
    def test_multiple_tokens_same_session(self, app):
        """Test generating multiple tokens for the same session."""
        with app.test_request_context(
            headers={'User-Agent': 'Mozilla/5.0 (Multi Token Test)'}
        ):
            csrf_manager = CSRFManager("multi-token-test-secret")
            session_id = "multi-token-session"
            
            # Generate multiple tokens
            token1 = csrf_manager.generate_token(session_id)
            token2 = csrf_manager.generate_token(session_id)
            
            # Both tokens should be valid
            assert csrf_manager.validate_token(token1, session_id) is True
            assert csrf_manager.validate_token(token2, session_id) is True
            
            # Tokens should be different (due to timestamp or randomness in day bucket)
            # Note: They might be the same if generated in the same day with same inputs
            # This is expected behavior for CSRF tokens
    
    def test_error_handling_in_token_operations(self, app):
        """Test error handling in token generation and validation."""
        csrf_manager = CSRFManager("error-test-secret")
        
        # Test token generation without request context
        try:
            token = csrf_manager.generate_token("test-session")
            # Should work even without request context (uses empty user agent)
            assert token is not None
        except Exception as e:
            pytest.fail(f"Token generation should handle missing request context: {e}")
        
        # Test token validation with malformed base64
        with app.test_request_context():
            is_valid = csrf_manager.validate_token("not-base64!", "session", "agent")
            assert is_valid is False
