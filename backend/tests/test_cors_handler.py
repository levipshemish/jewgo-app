"""
Tests for CORS Handler.

Tests environment-aware CORS handling with multiple origin support,
preflight request handling, and proper credentials support.
"""
import os
import pytest
from unittest.mock import patch, MagicMock
from flask import Flask, request

from services.auth.cors_handler import CORSHandler, create_cors_middleware


class TestCORSHandler:
    """Test CORS Handler functionality."""
    
    def test_exact_origin_matching(self):
        """Test exact origin matching."""
        origins = ['https://jewgo.app', 'https://admin.jewgo.app']
        handler = CORSHandler(origins)
        
        assert handler.is_origin_allowed('https://jewgo.app') is True
        assert handler.is_origin_allowed('https://admin.jewgo.app') is True
        assert handler.is_origin_allowed('https://evil.com') is False
        assert handler.is_origin_allowed('https://jewgo.app.evil.com') is False
    
    def test_wildcard_origin_matching(self):
        """Test wildcard origin matching."""
        origins = ['https://*.vercel.app', 'https://*.jewgo.app']
        handler = CORSHandler(origins)
        
        assert handler.is_origin_allowed('https://preview.vercel.app') is True
        assert handler.is_origin_allowed('https://jewgo-git-feature.vercel.app') is True
        assert handler.is_origin_allowed('https://admin.jewgo.app') is True
        assert handler.is_origin_allowed('https://api.jewgo.app') is True
        
        # Should not match
        assert handler.is_origin_allowed('https://vercel.app') is False  # No subdomain
        assert handler.is_origin_allowed('https://evil.com') is False
        assert handler.is_origin_allowed('https://preview.vercel.app.evil.com') is False
    
    def test_mixed_origin_matching(self):
        """Test mixed exact and wildcard origin matching."""
        origins = ['https://jewgo.app', 'https://*.vercel.app']
        handler = CORSHandler(origins)
        
        # Exact match
        assert handler.is_origin_allowed('https://jewgo.app') is True
        
        # Wildcard match
        assert handler.is_origin_allowed('https://preview.vercel.app') is True
        
        # No match
        assert handler.is_origin_allowed('https://evil.com') is False
    
    def test_empty_origin_handling(self):
        """Test handling of empty or None origins."""
        handler = CORSHandler(['https://jewgo.app'])
        
        assert handler.is_origin_allowed('') is False
        assert handler.is_origin_allowed(None) is False
    
    def test_environment_based_origin_detection(self):
        """Test automatic origin detection from environment."""
        with patch.dict(os.environ, {'FRONTEND_ORIGINS': 'https://jewgo.app,https://admin.jewgo.app'}):
            handler = CORSHandler()
            
            assert 'https://jewgo.app' in handler.allowed_origins
            assert 'https://admin.jewgo.app' in handler.allowed_origins
    
    def test_preflight_request_handling(self):
        """Test CORS preflight request handling."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.test_request_context('/', method='OPTIONS', headers={
            'Origin': 'https://jewgo.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
        }):
            response = handler.handle_preflight(request, 'https://jewgo.app')
            
            assert response is not None
            assert response.status_code == 204
            assert response.headers['Access-Control-Allow-Origin'] == 'https://jewgo.app'
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'
            assert response.headers['Vary'] == 'Origin'
            assert 'POST' in response.headers['Access-Control-Allow-Methods']
            assert 'HEAD' in response.headers['Access-Control-Allow-Methods']
            assert 'Content-Type' in response.headers['Access-Control-Allow-Headers']
            assert 'X-CSRF-Token' in response.headers['Access-Control-Allow-Headers']
            assert response.headers['Access-Control-Max-Age'] == '86400'
    
    def test_preflight_request_disallowed_origin(self):
        """Test preflight request with disallowed origin."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.test_request_context('/', method='OPTIONS', headers={
            'Origin': 'https://evil.com',
            'Access-Control-Request-Method': 'POST'
        }):
            response = handler.handle_preflight(request, 'https://evil.com')
            
            assert response is not None
            assert response.status_code == 403
    
    def test_non_preflight_options_request(self):
        """Test OPTIONS request that is not a CORS preflight."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.test_request_context('/', method='OPTIONS', headers={
            'Origin': 'https://jewgo.app'
            # Missing Access-Control-Request-Method
        }):
            response = handler.handle_preflight(request, 'https://jewgo.app')
            
            assert response is None  # Not a preflight request
    
    def test_non_options_request(self):
        """Test non-OPTIONS request handling."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.test_request_context('/', method='GET'):
            response = handler.handle_preflight(request, 'https://jewgo.app')
            
            assert response is None  # Not a preflight request
    
    def test_add_cors_headers_allowed_origin(self):
        """Test adding CORS headers for allowed origin."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.app_context():
            response = app.response_class()
            response = handler.add_cors_headers(response, 'https://jewgo.app')
            
            assert response.headers['Access-Control-Allow-Origin'] == 'https://jewgo.app'
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'
            assert response.headers['Vary'] == 'Origin'
    
    def test_add_cors_headers_disallowed_origin(self):
        """Test adding CORS headers for disallowed origin."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        with app.app_context():
            response = app.response_class()
            original_headers = dict(response.headers)
            response = handler.add_cors_headers(response, 'https://evil.com')
            
            # Headers should not be added
            assert 'Access-Control-Allow-Origin' not in response.headers
            assert dict(response.headers) == original_headers
    
    def test_get_cors_config(self):
        """Test getting CORS configuration."""
        origins = ['https://jewgo.app', 'https://*.vercel.app']
        handler = CORSHandler(origins)
        
        config = handler.get_cors_config()
        
        assert config['allowed_origins'] == origins
        assert config['exact_origins_count'] == 1
        assert config['wildcard_patterns_count'] == 1
        assert config['supports_credentials'] is True
        assert config['max_age'] == 86400
        assert 'GET' in config['allowed_methods']
        assert 'HEAD' in config['allowed_methods']
        assert 'Content-Type' in config['default_allowed_headers']
        assert 'X-CSRF-Token' in config['default_allowed_headers']
    
    def test_validate_configuration_valid(self):
        """Test configuration validation for valid setup."""
        origins = ['https://jewgo.app', 'https://*.vercel.app']
        handler = CORSHandler(origins)
        
        validation = handler.validate_configuration()
        
        assert validation['valid'] is True
        assert validation['origins_configured'] == 2
        assert 'https://jewgo.app' in validation['exact_origins']
        assert len(validation['wildcard_patterns']) == 1
        assert len(validation['errors']) == 0
    
    def test_validate_configuration_no_origins(self):
        """Test configuration validation with no origins."""
        handler = CORSHandler([])
        
        validation = handler.validate_configuration()
        
        assert validation['valid'] is False
        assert "No CORS origins configured" in validation['errors']
    
    def test_validate_configuration_wildcard_origin(self):
        """Test configuration validation with dangerous wildcard."""
        handler = CORSHandler(['*'])
        
        validation = handler.validate_configuration()
        
        assert validation['valid'] is False
        assert "Wildcard '*' origin is not secure" in validation['errors']
    
    def test_validate_configuration_http_origin_warning(self):
        """Test configuration validation with HTTP origin warning."""
        handler = CORSHandler(['http://example.com'])
        
        validation = handler.validate_configuration()
        
        assert validation['valid'] is True
        assert any("HTTP origin detected" in warning for warning in validation['warnings'])
    
    def test_validate_configuration_localhost_in_production(self):
        """Test configuration validation with localhost in production."""
        origins = ['https://jewgo.app', 'http://localhost:3000']
        
        with patch.dict(os.environ, {'FLASK_ENV': 'production'}):
            handler = CORSHandler(origins)
            validation = handler.validate_configuration()
            
            assert validation['valid'] is True
            assert any("Localhost origin in production" in warning for warning in validation['warnings'])


class TestCORSMiddleware:
    """Test CORS middleware functionality."""
    
    def test_cors_middleware_creation(self):
        """Test CORS middleware creation."""
        handler = CORSHandler(['https://jewgo.app'])
        middleware = create_cors_middleware(handler)
        
        assert callable(middleware)
    
    def test_cors_middleware_preflight_handling(self):
        """Test CORS middleware preflight handling."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        
        @app.route('/test', methods=['POST'])
        def test_route():
            return 'OK'
        
        # Apply middleware
        middleware = create_cors_middleware(handler)
        app = middleware(app)
        
        with app.test_client() as client:
            # Test preflight request
            response = client.options('/test', headers={
                'Origin': 'https://jewgo.app',
                'Access-Control-Request-Method': 'POST'
            })
            
            assert response.status_code == 204
            assert response.headers['Access-Control-Allow-Origin'] == 'https://jewgo.app'
    
    def test_cors_middleware_regular_request(self):
        """Test CORS middleware with regular request."""
        handler = CORSHandler(['https://jewgo.app'])
        
        app = Flask(__name__)
        
        @app.route('/test')
        def test_route():
            return 'OK'
        
        # Apply middleware
        middleware = create_cors_middleware(handler)
        app = middleware(app)
        
        with app.test_client() as client:
            response = client.get('/test', headers={
                'Origin': 'https://jewgo.app'
            })
            
            assert response.status_code == 200
            assert response.headers['Access-Control-Allow-Origin'] == 'https://jewgo.app'
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'


class TestCORSHandlerIntegration:
    """Integration tests for CORS Handler."""
    
    def test_vercel_preview_domains(self):
        """Test CORS handling for Vercel preview domains."""
        origins = ['https://*.vercel.app']
        handler = CORSHandler(origins)
        
        # Test various Vercel preview domain patterns
        vercel_domains = [
            'https://jewgo-git-feature-branch.vercel.app',
            'https://jewgo-abc123.vercel.app',
            'https://jewgo-pr-42.vercel.app'
        ]
        
        for domain in vercel_domains:
            assert handler.is_origin_allowed(domain) is True
        
        # Should not match
        assert handler.is_origin_allowed('https://vercel.app') is False
        assert handler.is_origin_allowed('https://evil.vercel.app.com') is False
    
    def test_production_environment_cors(self):
        """Test CORS configuration for production environment."""
        prod_env = {
            'FLASK_ENV': 'production',
            'FRONTEND_ORIGINS': 'https://jewgo.app,https://www.jewgo.app'
        }
        
        with patch.dict(os.environ, prod_env):
            handler = CORSHandler()
            
            assert handler.is_origin_allowed('https://jewgo.app') is True
            assert handler.is_origin_allowed('https://www.jewgo.app') is True
            assert handler.is_origin_allowed('https://evil.com') is False
            
            validation = handler.validate_configuration()
            assert validation['valid'] is True
    
    def test_development_environment_cors(self):
        """Test CORS configuration for development environment."""
        dev_env = {
            'FLASK_ENV': 'development'
        }
        
        with patch.dict(os.environ, dev_env, clear=True):
            handler = CORSHandler()
            
            # Should include localhost origins for development
            assert handler.is_origin_allowed('http://localhost:3000') is True
            assert handler.is_origin_allowed('http://127.0.0.1:3000') is True
    
    def test_multiple_origin_types(self):
        """Test handling of multiple origin types together."""
        origins = [
            'https://jewgo.app',                    # Exact match
            'https://www.jewgo.app',               # Another exact match
            'https://*.vercel.app',                # Wildcard for previews
            'http://localhost:3000'                # Development
        ]
        
        handler = CORSHandler(origins)
        
        # Test all types work
        assert handler.is_origin_allowed('https://jewgo.app') is True
        assert handler.is_origin_allowed('https://www.jewgo.app') is True
        assert handler.is_origin_allowed('https://preview.vercel.app') is True
        assert handler.is_origin_allowed('http://localhost:3000') is True
        
        # Test invalid origins
        assert handler.is_origin_allowed('https://evil.com') is False
        assert handler.is_origin_allowed('https://vercel.app') is False  # No subdomain
    
    def test_cors_with_credentials_flow(self):
        """Test complete CORS flow with credentials."""
        handler = CORSHandler(['https://jewgo.app'])
        
        # Test preflight request handling directly
        app = Flask(__name__)
        with app.test_request_context('/', method='OPTIONS', headers={
            'Origin': 'https://jewgo.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token'
        }):
            from flask import request
            preflight_response = handler.handle_preflight(request, 'https://jewgo.app')
            
            assert preflight_response is not None
            assert preflight_response.status_code == 204
            assert preflight_response.headers['Access-Control-Allow-Credentials'] == 'true'
            
        # Test regular response with CORS headers
        with app.app_context():
            response = app.response_class()
            response = handler.add_cors_headers(response, 'https://jewgo.app')
            
            assert response.headers['Access-Control-Allow-Origin'] == 'https://jewgo.app'
            assert response.headers['Access-Control-Allow-Credentials'] == 'true'


class TestCORSHealthCheckIntegration:
    """Test CORS Handler integration with health checks."""
    
    def test_cors_configuration_health_check(self):
        """Test CORS configuration validation for health checks."""
        # Test valid configuration
        handler = CORSHandler(['https://jewgo.app', 'https://*.vercel.app'])
        validation = handler.validate_configuration()
        
        health_status = {
            'cors_configured': validation['valid'],
            'cors_origins_count': validation['origins_configured'],
            'cors_errors': validation['errors'],
            'cors_warnings': validation['warnings']
        }
        
        assert health_status['cors_configured'] is True
        assert health_status['cors_origins_count'] == 2
        assert len(health_status['cors_errors']) == 0
        
        # Test invalid configuration
        invalid_handler = CORSHandler([])
        invalid_validation = invalid_handler.validate_configuration()
        
        invalid_health_status = {
            'cors_configured': invalid_validation['valid'],
            'cors_origins_count': invalid_validation['origins_configured'],
            'cors_errors': invalid_validation['errors']
        }
        
        assert invalid_health_status['cors_configured'] is False
        assert invalid_health_status['cors_origins_count'] == 0
        assert len(invalid_health_status['cors_errors']) > 0
    
    def test_cors_environment_health_check(self):
        """Test CORS environment-specific health check."""
        # Production environment check
        with patch.dict(os.environ, {
            'FLASK_ENV': 'production',
            'FRONTEND_ORIGINS': 'https://jewgo.app'
        }):
            handler = CORSHandler()
            config = handler.get_cors_config()
            validation = handler.validate_configuration()
            
            health_data = {
                'environment': 'production',
                'cors_origins': config['allowed_origins'],
                'supports_credentials': config['supports_credentials'],
                'validation_status': validation['valid']
            }
            
            assert health_data['environment'] == 'production'
            assert 'https://jewgo.app' in health_data['cors_origins']
            assert health_data['supports_credentials'] is True
            assert health_data['validation_status'] is True