"""
Tests for Cookie Policy Manager.

Tests environment-aware cookie configurations for production, preview, and development environments.
"""
import os
import pytest
from unittest.mock import patch

from services.auth.cookies import CookiePolicyManager, Environment


class TestCookiePolicyManager:
    """Test Cookie Policy Manager functionality."""
    
    def test_production_cookie_config(self):
        """Test cookie configuration for production environment."""
        manager = CookiePolicyManager("production")
        config = manager.get_cookie_config()
        
        assert config['secure'] is True
        assert config['httponly'] is True
        assert config['samesite'] == 'None'
        assert config['domain'] == '.jewgo.app'  # Default domain
        assert config['path'] == '/'
    
    def test_production_cookie_config_with_custom_domain(self):
        """Test production cookie configuration with custom domain."""
        with patch.dict(os.environ, {'COOKIE_DOMAIN': '.custom.app'}):
            manager = CookiePolicyManager("production")
            config = manager.get_cookie_config()
            
            assert config['domain'] == '.custom.app'
    
    def test_preview_cookie_config(self):
        """Test cookie configuration for preview environment (Vercel compatibility)."""
        manager = CookiePolicyManager("preview")
        config = manager.get_cookie_config()
        
        assert config['secure'] is True  # HTTPS only for Vercel
        assert config['httponly'] is True
        assert config['samesite'] == 'None'
        assert config['domain'] is None  # host-only cookies for *.vercel.app
        assert config['path'] == '/'
    
    def test_staging_cookie_config(self):
        """Test cookie configuration for staging environment."""
        manager = CookiePolicyManager("staging")
        config = manager.get_cookie_config()
        
        assert config['secure'] is True
        assert config['httponly'] is True
        assert config['samesite'] == 'None'
        assert config['domain'] is None  # host-only cookies
        assert config['path'] == '/'
    
    def test_development_cookie_config(self):
        """Test cookie configuration for development environment."""
        manager = CookiePolicyManager("development")
        config = manager.get_cookie_config()
        
        assert config['secure'] is False  # Allow HTTP for local development
        assert config['httponly'] is True
        assert config['samesite'] == 'Lax'
        assert config['domain'] is None  # host-only for localhost
        assert config['path'] == '/'
    
    def test_environment_detection_from_flask_env(self):
        """Test environment detection from FLASK_ENV."""
        # Add required environment variables for production to avoid config validation errors
        env_vars = {
            'FLASK_ENV': 'production',
            'SECRET_KEY': 'test-secret-key-for-testing',
            'GOOGLE_MAPS_API_KEY': 'test-api-key',
            'DATABASE_URL': 'postgresql://test:test@localhost/test'
        }
        with patch.dict(os.environ, env_vars, clear=True):
            manager = CookiePolicyManager()
            assert manager.environment == 'production'
    
    def test_environment_detection_from_environment(self):
        """Test environment detection from ENVIRONMENT variable."""
        with patch.dict(os.environ, {'ENVIRONMENT': 'preview'}, clear=True):
            manager = CookiePolicyManager()
            assert manager.environment == 'preview'
    
    def test_environment_detection_default(self):
        """Test environment detection defaults to development."""
        # Clear both FLASK_ENV and ENVIRONMENT variables
        env_vars_to_clear = ['FLASK_ENV', 'ENVIRONMENT']
        with patch.dict(os.environ, {key: '' for key in env_vars_to_clear}, clear=False):
            # Remove the keys entirely
            for key in env_vars_to_clear:
                if key in os.environ:
                    del os.environ[key]
            manager = CookiePolicyManager()
            assert manager.environment == 'development'
    
    def test_csrf_cookie_config(self):
        """Test CSRF-specific cookie configuration."""
        manager = CookiePolicyManager("production")
        config = manager.get_csrf_cookie_config()
        
        assert config['secure'] is True
        assert config['httponly'] is False  # CSRF cookies need to be readable by JS
        assert config['samesite'] == 'None'
        assert config['domain'] == '.jewgo.app'
        assert config['path'] == '/'
    
    def test_cors_origins_from_frontend_origins(self):
        """Test CORS origins from FRONTEND_ORIGINS environment variable."""
        origins = "https://jewgo.app,https://preview.jewgo.app"
        with patch.dict(os.environ, {'FRONTEND_ORIGINS': origins}):
            manager = CookiePolicyManager("production")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["https://jewgo.app", "https://preview.jewgo.app"]
    
    def test_cors_origins_from_cors_origins_fallback(self):
        """Test CORS origins fallback to CORS_ORIGINS environment variable."""
        origins = "https://jewgo.app,https://api.jewgo.app"
        with patch.dict(os.environ, {'CORS_ORIGINS': origins}, clear=True):
            manager = CookiePolicyManager("production")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["https://jewgo.app", "https://api.jewgo.app"]
    
    def test_cors_origins_production_default(self):
        """Test CORS origins default for production environment."""
        with patch.dict(os.environ, {}, clear=True):
            manager = CookiePolicyManager("production")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["https://jewgo.app"]
    
    def test_cors_origins_preview_default(self):
        """Test CORS origins default for preview environment."""
        with patch.dict(os.environ, {}, clear=True):
            manager = CookiePolicyManager("preview")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["https://*.vercel.app"]
    
    def test_cors_origins_development_default(self):
        """Test CORS origins default for development environment."""
        with patch.dict(os.environ, {}, clear=True):
            manager = CookiePolicyManager("development")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    def test_cors_origins_with_whitespace(self):
        """Test CORS origins parsing with whitespace."""
        origins = " https://jewgo.app , https://preview.jewgo.app , "
        with patch.dict(os.environ, {'FRONTEND_ORIGINS': origins}):
            manager = CookiePolicyManager("production")
            cors_origins = manager.get_cors_origins()
            
            assert cors_origins == ["https://jewgo.app", "https://preview.jewgo.app"]
    
    def test_is_secure_context_production(self):
        """Test secure context detection for production."""
        manager = CookiePolicyManager("production")
        assert manager.is_secure_context() is True
    
    def test_is_secure_context_preview(self):
        """Test secure context detection for preview."""
        manager = CookiePolicyManager("preview")
        assert manager.is_secure_context() is True
    
    def test_is_secure_context_staging(self):
        """Test secure context detection for staging."""
        manager = CookiePolicyManager("staging")
        assert manager.is_secure_context() is True
    
    def test_is_secure_context_development(self):
        """Test secure context detection for development."""
        manager = CookiePolicyManager("development")
        assert manager.is_secure_context() is False
    
    def test_validate_configuration_production_valid(self):
        """Test configuration validation for valid production setup."""
        with patch.dict(os.environ, {'FRONTEND_ORIGINS': 'https://jewgo.app'}):
            manager = CookiePolicyManager("production")
            validation = manager.validate_configuration()
            
            assert validation['valid'] is True
            assert validation['environment'] == 'production'
            assert validation['secure_context'] is True
            assert validation['cookie_domain'] == '.jewgo.app'
            assert validation['samesite_policy'] == 'None'
            assert validation['cors_origins_count'] == 1
            assert len(validation['errors']) == 0
    
    def test_validate_configuration_production_insecure(self):
        """Test configuration validation for insecure production setup."""
        # Create a manager with production environment but mock insecure config
        manager = CookiePolicyManager("production")
        
        # Mock get_cookie_config to return insecure configuration
        original_get_config = manager.get_cookie_config
        def mock_insecure_config(cookie_type="auth"):
            config = original_get_config(cookie_type)
            config['secure'] = False  # Make it insecure
            return config
        
        manager.get_cookie_config = mock_insecure_config
        validation = manager.validate_configuration()
        
        assert validation['valid'] is False
        assert "Production environment must use secure cookies" in validation['errors']
    
    def test_validate_configuration_preview_valid(self):
        """Test configuration validation for valid preview setup."""
        with patch.dict(os.environ, {'FRONTEND_ORIGINS': 'https://preview.vercel.app'}):
            manager = CookiePolicyManager("preview")
            validation = manager.validate_configuration()
            
            assert validation['valid'] is True
            assert validation['environment'] == 'preview'
            assert validation['secure_context'] is True
            assert validation['cookie_domain'] is None  # host-only
            assert validation['samesite_policy'] == 'None'
            assert validation['cors_origins_count'] == 1
            assert len(validation['errors']) == 0
    
    def test_validate_configuration_no_cors_origins(self):
        """Test configuration validation with no CORS origins."""
        with patch.dict(os.environ, {}, clear=True):
            manager = CookiePolicyManager("production")
            # Override get_cors_origins to return empty list
            manager.get_cors_origins = lambda: []
            
            validation = manager.validate_configuration()
            
            assert "No CORS origins configured" in validation['warnings']
    
    def test_validate_configuration_preview_with_domain_warning(self):
        """Test configuration validation for preview with domain warning."""
        with patch.dict(os.environ, {'COOKIE_DOMAIN': '.preview.app'}):
            manager = CookiePolicyManager("preview")
            # Mock config to include domain
            original_get_config = manager.get_cookie_config
            manager.get_cookie_config = lambda cookie_type="auth": {
                **original_get_config(cookie_type),
                'domain': '.preview.app'
            }
            
            validation = manager.validate_configuration()
            
            assert "Preview environments should use host-only cookies" in validation['warnings']


class TestCookiePolicyManagerIntegration:
    """Integration tests for Cookie Policy Manager with real environment variables."""
    
    def test_vercel_preview_environment_simulation(self):
        """Test cookie configuration for Vercel preview environment simulation."""
        # Simulate Vercel preview environment
        vercel_env = {
            'VERCEL': '1',
            'VERCEL_ENV': 'preview',
            'FLASK_ENV': 'preview',
            'FRONTEND_ORIGINS': 'https://jewgo-git-feature-branch-username.vercel.app'
        }
        
        with patch.dict(os.environ, vercel_env):
            manager = CookiePolicyManager()
            config = manager.get_cookie_config()
            cors_origins = manager.get_cors_origins()
            
            # Should use secure cookies for HTTPS
            assert config['secure'] is True
            assert config['samesite'] == 'None'
            assert config['domain'] is None  # host-only for Vercel
            
            # Should use configured CORS origin
            assert cors_origins == ['https://jewgo-git-feature-branch-username.vercel.app']
    
    def test_production_environment_simulation(self):
        """Test cookie configuration for production environment simulation."""
        prod_env = {
            'FLASK_ENV': 'production',
            'ENVIRONMENT': 'production',
            'COOKIE_DOMAIN': '.jewgo.app',
            'FRONTEND_ORIGINS': 'https://jewgo.app',
            'SECRET_KEY': 'test-secret-key-for-testing',
            'GOOGLE_MAPS_API_KEY': 'test-api-key',
            'DATABASE_URL': 'postgresql://test:test@localhost/test'
        }
        
        with patch.dict(os.environ, prod_env):
            manager = CookiePolicyManager()
            config = manager.get_cookie_config()
            cors_origins = manager.get_cors_origins()
            validation = manager.validate_configuration()
            
            # Should use secure production settings
            assert config['secure'] is True
            assert config['samesite'] == 'None'
            assert config['domain'] == '.jewgo.app'
            
            # Should use configured CORS origin
            assert cors_origins == ['https://jewgo.app']
            
            # Should pass validation
            assert validation['valid'] is True
            assert len(validation['errors']) == 0
    
    def test_multiple_cors_origins_configuration(self):
        """Test configuration with multiple CORS origins."""
        multi_origin_env = {
            'FLASK_ENV': 'production',
            'FRONTEND_ORIGINS': 'https://jewgo.app,https://www.jewgo.app,https://admin.jewgo.app'
        }
        
        with patch.dict(os.environ, multi_origin_env):
            manager = CookiePolicyManager()
            cors_origins = manager.get_cors_origins()
            validation = manager.validate_configuration()
            
            expected_origins = [
                'https://jewgo.app',
                'https://www.jewgo.app', 
                'https://admin.jewgo.app'
            ]
            assert cors_origins == expected_origins
            assert validation['cors_origins_count'] == 3


class TestBackwardCompatibility:
    """Test backward compatibility with existing cookie functions."""
    
    def test_cookie_security_function_compatibility(self):
        """Test that _cookie_security function still works with new implementation."""
        from services.auth.cookies import _cookie_security
        
        env_vars = {
            'FLASK_ENV': 'production', 
            'COOKIE_DOMAIN': '.jewgo.app', 
            'ENVIRONMENT': 'production',
            'SECRET_KEY': 'test-secret-key-for-testing',
            'GOOGLE_MAPS_API_KEY': 'test-api-key',
            'DATABASE_URL': 'postgresql://test:test@localhost/test'
        }
        with patch.dict(os.environ, env_vars):
            secure, samesite, domain = _cookie_security()
            
            assert secure is True
            assert samesite == 'None'
            assert domain == '.jewgo.app'
    
    def test_cookie_security_function_development(self):
        """Test _cookie_security function in development environment."""
        from services.auth.cookies import _cookie_security
        
        # Clear any existing environment variables that might interfere
        env_vars = {'FLASK_ENV': 'development', 'ENVIRONMENT': 'development', 'COOKIE_DOMAIN': ''}
        with patch.dict(os.environ, env_vars, clear=False):
            # Remove COOKIE_DOMAIN if it exists
            if 'COOKIE_DOMAIN' in os.environ:
                del os.environ['COOKIE_DOMAIN']
            secure, samesite, domain = _cookie_security()
            
            assert secure is False
            assert samesite == 'Lax'
            assert domain is None