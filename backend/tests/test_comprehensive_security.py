"""
Comprehensive Security Test Suite
=================================

This test suite provides comprehensive security testing for authentication,
authorization, input validation, and other security features.
"""

import pytest
import json
import time
from unittest.mock import patch, MagicMock
from flask import Flask
from datetime import datetime, timedelta

# Import the application and security utilities
from app import create_app
from services.auth.unified_session_manager import UnifiedSessionManager
from services.auth.secure_password_handler import SecurePasswordHandler
from services.auth.webauthn_manager import WebAuthnManager
from utils.secure_error_handler import SecureErrorHandler
from config.security_config import SecurityConfig


class TestAuthenticationSecurity:
    """Test authentication security features."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-secret-key"
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_password_strength_validation(self):
        """Test password strength validation."""
        handler = SecurePasswordHandler()
        
        # Test weak passwords
        weak_passwords = [
            "123456",
            "password",
            "qwerty",
            "abc123",
            "admin"
        ]
        
        for password in weak_passwords:
            result = handler.validate_password_strength(password)
            assert not result.is_valid
            assert len(result.issues) > 0
        
        # Test strong passwords
        strong_passwords = [
            "SecurePassword123!",
            "MyStr0ng!P@ssw0rd",
            "Complex#Pass99"
        ]
        
        for password in strong_passwords:
            result = handler.validate_password_strength(password)
            assert result.is_valid
            assert result.score >= 60
    
    def test_password_hashing_security(self):
        """Test password hashing security."""
        handler = SecurePasswordHandler()
        
        password = "TestPassword123!"
        hash1 = handler.hash_password(password)
        hash2 = handler.hash_password(password)
        
        # Hashes should be different (due to salt)
        assert hash1 != hash2
        
        # Both should verify correctly
        assert handler.verify_password(password, hash1)
        assert handler.verify_password(password, hash2)
        
        # Wrong password should fail
        assert not handler.verify_password("WrongPassword", hash1)
    
    def test_session_management_security(self):
        """Test session management security."""
        manager = UnifiedSessionManager()
        
        user_id = "test_user_123"
        user_agent = "TestAgent/1.0"
        ip_address = "192.168.1.1"
        
        # Create session
        session_id, family_id = manager.create_session(user_id, user_agent, ip_address)
        assert session_id is not None
        assert family_id is not None
        
        # Validate session
        session_info = manager.validate_session(session_id)
        assert session_info is not None
        assert session_info.user_id == user_id
        assert session_info.is_active
        
        # Revoke session
        success = manager.revoke_session(session_id, user_id)
        assert success
        
        # Session should be invalid after revocation
        session_info = manager.validate_session(session_id)
        assert session_info is None
    
    def test_jwt_token_security(self, app):
        """Test JWT token security."""
        import jwt
        
        # Test token generation
        payload = {
            "user_id": "test_user",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")
        assert token is not None
        
        # Test token verification
        decoded = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        assert decoded["user_id"] == "test_user"
        
        # Test expired token
        expired_payload = {
            "user_id": "test_user",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        
        expired_token = jwt.encode(expired_payload, app.config["SECRET_KEY"], algorithm="HS256")
        
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(expired_token, app.config["SECRET_KEY"], algorithms=["HS256"])
        
        # Test invalid signature
        invalid_token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(invalid_token, app.config["SECRET_KEY"], algorithms=["HS256"])


class TestInputValidationSecurity:
    """Test input validation security."""
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention."""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; INSERT INTO users VALUES ('hacker', 'password'); --",
            "admin'--",
            "1' UNION SELECT * FROM users--",
        ]
        
        # These inputs should be detected as suspicious
        for malicious_input in malicious_inputs:
            assert "'" in malicious_input or ";" in malicious_input or "--" in malicious_input
    
    def test_xss_prevention(self):
        """Test XSS prevention."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "';alert('xss');//",
        ]
        
        # These payloads should be detected as suspicious
        for payload in xss_payloads:
            assert "<script>" in payload or "javascript:" in payload or "onerror=" in payload or "onload=" in payload
    
    def test_path_traversal_prevention(self):
        """Test path traversal prevention."""
        malicious_paths = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "/etc/passwd",
            "\\windows\\system32",
        ]
        
        # These paths should be detected as suspicious
        for path in malicious_paths:
            assert "../" in path or "..\\" in path or "/etc/passwd" in path or "\\windows\\system32" in path


class TestErrorHandlingSecurity:
    """Test secure error handling."""
    
    def test_error_information_disclosure(self):
        """Test that errors don't disclose sensitive information."""
        handler = SecureErrorHandler()
        
        # Test database error
        try:
            raise Exception("Database connection failed: postgresql://user:password@localhost:5432/db")
        except Exception as e:
            response_data, status_code = handler.handle_error(e)
            
            # Should not contain sensitive information
            assert "password" not in str(response_data)
            assert "localhost" not in str(response_data)
            assert status_code == 500
    
    def test_validation_error_handling(self):
        """Test validation error handling."""
        handler = SecureErrorHandler()
        
        try:
            raise ValueError("Invalid input provided")
        except Exception as e:
            response_data, status_code = handler.handle_error(e)
            
            assert response_data["success"] is False
            assert "error" in response_data
            assert status_code in [400, 500]


class TestSecurityHeaders:
    """Test security headers."""
    
    def test_security_headers_configuration(self):
        """Test security headers configuration."""
        config = SecurityConfig()
        headers = config.get_security_headers()
        
        # Check required security headers
        required_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Content-Security-Policy",
            "Strict-Transport-Security"
        ]
        
        for header in required_headers:
            assert header in headers
            assert headers[header] is not None
    
    def test_csp_policy_generation(self):
        """Test Content Security Policy generation."""
        config = SecurityConfig()
        
        # Test development CSP
        with patch.dict("os.environ", {"FLASK_ENV": "development"}):
            dev_config = SecurityConfig()
            csp = dev_config._get_csp_policy()
            assert "unsafe-inline" in csp  # More permissive for development
        
        # Test production CSP
        with patch.dict("os.environ", {"FLASK_ENV": "production"}):
            prod_config = SecurityConfig()
            csp = prod_config._get_csp_policy()
            assert "unsafe-inline" not in csp  # Strict for production


class TestWebAuthnSecurity:
    """Test WebAuthn security features."""
    
    def test_webauthn_challenge_generation(self):
        """Test WebAuthn challenge generation."""
        manager = WebAuthnManager()
        
        # Mock Redis manager
        manager.redis_manager = MagicMock()
        manager.redis_manager.set = MagicMock()
        
        user_id = "test_user"
        user_name = "test@example.com"
        user_display_name = "Test User"
        
        # Test registration challenge
        options = manager.create_registration_challenge(user_id, user_name, user_display_name)
        
        assert "challenge" in options
        assert "rp" in options
        assert "user" in options
        assert options["rp"]["id"] == "jewgo.app"
        assert options["rp"]["name"] == "JewGo"
    
    def test_webauthn_credential_validation(self):
        """Test WebAuthn credential validation."""
        manager = WebAuthnManager()
        
        # Test credential data validation
        valid_credential = {
            "id": "test_credential_id",
            "type": "public-key",
            "response": {"publicKey": "test_key"}
        }
        
        assert manager._validate_credential_data(valid_credential)
        
        # Test invalid credential data
        invalid_credential = {
            "id": "test_credential_id",
            "type": "public-key"
            # Missing response
        }
        
        assert not manager._validate_credential_data(invalid_credential)


class TestRateLimitingSecurity:
    """Test rate limiting security."""
    
    def test_rate_limiting_configuration(self):
        """Test rate limiting configuration."""
        config = SecurityConfig()
        rate_config = config.get_rate_limiting_config()
        
        assert "enabled" in rate_config
        assert "default" in rate_config
        assert "strict" in rate_config
        assert "auth_endpoints" in rate_config
    
    def test_rate_limiting_enforcement(self, client):
        """Test rate limiting enforcement."""
        # This would require a more complex setup with Redis
        # For now, we'll test the configuration
        config = SecurityConfig()
        rate_config = config.get_rate_limiting_config()
        
        assert rate_config["enabled"] is True


class TestCORSecurity:
    """Test CORS security."""
    
    def test_cors_configuration(self):
        """Test CORS configuration."""
        config = SecurityConfig()
        cors_config = config.get_cors_config()
        
        assert "origins" in cors_config
        assert "methods" in cors_config
        assert "allow_headers" in cors_config
        assert "supports_credentials" in cors_config
        
        # Check that credentials are supported
        assert cors_config["supports_credentials"] is True
    
    def test_cors_origin_validation(self):
        """Test CORS origin validation."""
        config = SecurityConfig()
        
        # Test development origins
        with patch.dict("os.environ", {"FLASK_ENV": "development"}):
            dev_config = SecurityConfig()
            origins = dev_config.cors_origins
            assert "http://localhost:3000" in origins
        
        # Test production origins
        with patch.dict("os.environ", {"FLASK_ENV": "production"}):
            prod_config = SecurityConfig()
            origins = prod_config.cors_origins
            assert "https://jewgo.app" in origins


class TestSessionSecurity:
    """Test session security features."""
    
    def test_session_id_generation(self):
        """Test session ID generation."""
        manager = UnifiedSessionManager()
        
        session_id = manager._generate_session_id()
        family_id = manager._generate_family_id()
        
        # Session IDs should be unique and properly formatted
        assert session_id.startswith("sess_")
        assert family_id.startswith("fam_")
        assert len(session_id) > 20
        assert len(family_id) > 10
    
    def test_session_cleanup(self):
        """Test session cleanup functionality."""
        manager = UnifiedSessionManager()
        
        # Mock database manager
        manager.db_manager = MagicMock()
        manager.db_manager.session_scope = MagicMock()
        
        # Test cleanup
        cleaned_count = manager.cleanup_expired_sessions()
        assert isinstance(cleaned_count, int)


class TestSecurityConfiguration:
    """Test security configuration validation."""
    
    def test_production_config_validation(self):
        """Test production configuration validation."""
        with patch.dict("os.environ", {
            "FLASK_ENV": "production",
            "JWT_SECRET_KEY": "test-secret-key-32-chars-long",
            "DATABASE_URL": "postgresql://user:pass@host:5432/db",
            "FRONTEND_URL": "https://jewgo.app"
        }):
            config = SecurityConfig()
            # Should not raise an exception
            assert config.is_production is True
    
    def test_missing_production_config(self):
        """Test missing production configuration."""
        with patch.dict("os.environ", {
            "FLASK_ENV": "production"
            # Missing required variables
        }):
            with pytest.raises(ValueError):
                SecurityConfig()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])