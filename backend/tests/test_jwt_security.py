"""
Test JWT security hardening implementation.
Tests fail-closed behavior, JWKS validation, and algorithm enforcement.
"""

import pytest
import jwt
import time
from unittest.mock import Mock, patch, MagicMock
from utils.supabase_auth import SupabaseAuthManager


class TestJWTSecurity:
    """Test JWT security hardening features."""
    
    def setup_method(self):
        """Set up test environment."""
        with patch.dict('os.environ', {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_PROJECT_ID': 'test-project',
            'SUPABASE_JWT_AUD': 'authenticated'
        }):
            self.auth_manager = SupabaseAuthManager()
    
    @patch('utils.redis_client.get_redis_client')
    def test_jwks_well_known_endpoint(self, mock_redis):
        """Test that JWKS uses well-known endpoint first."""
        mock_redis.return_value = None
        
        # Verify well-known endpoint is used first
        assert '/.well-known/jwks.json' in self.auth_manager.jwks_url
        assert '/auth/v1/keys' in self.auth_manager.jwks_fallback_url
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_non_rs256_algorithm(self, mock_redis):
        """Test that non-RS256 algorithms are rejected."""
        mock_redis.return_value = None
        
        # Create token with HS256 algorithm
        token = jwt.encode(
            {'sub': 'test-user', 'exp': time.time() + 3600},
            'secret',
            algorithm='HS256',
            headers={'kid': 'test-kid'}
        )
        
        # Should reject HS256 token
        result = self.auth_manager.verify_jwt_token(token)
        assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_missing_kid(self, mock_redis):
        """Test that tokens without kid are rejected."""
        mock_redis.return_value = None
        
        # Create token without kid - use HS256 for this test since we're testing header validation
        token = jwt.encode(
            {'sub': 'test-user', 'exp': time.time() + 3600},
            'secret',
            algorithm='HS256'
        )
        
        # Should reject token without kid
        result = self.auth_manager.verify_jwt_token(token)
        assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_anonymous_token(self, mock_redis):
        """Test that anonymous tokens are rejected."""
        mock_redis.return_value = None
        
        # Mock JWKS key retrieval
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_key = {
                'kty': 'RSA',
                'kid': 'test-kid',
                'n': 'test-n',
                'e': 'AQAB'
            }
            mock_get_key.return_value = mock_key
            
            # Create token with anonymous role
            token = jwt.encode(
                {
                    'sub': 'test-user',
                    'role': 'anon',
                    'exp': time.time() + 3600,
                    'iss': 'https://test-project.supabase.co/auth/v1',
                    'aud': 'authenticated'
                },
                'secret',
                algorithm='HS256',
                headers={'kid': 'test-kid'}
            )
            
            # Should reject anonymous token
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_invalid_issuer(self, mock_redis):
        """Test that invalid issuers are rejected."""
        mock_redis.return_value = None
        
        # Mock JWKS key retrieval
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_key = {
                'kty': 'RSA',
                'kid': 'test-kid',
                'n': 'test-n',
                'e': 'AQAB'
            }
            mock_get_key.return_value = mock_key
            
            # Create token with wrong issuer
            token = jwt.encode(
                {
                    'sub': 'test-user',
                    'exp': time.time() + 3600,
                    'iss': 'https://evil.com/auth/v1',
                    'aud': 'authenticated'
                },
                'secret',
                algorithm='HS256',
                headers={'kid': 'test-kid'}
            )
            
            # Should reject token with wrong issuer
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_invalid_audience(self, mock_redis):
        """Test that invalid audiences are rejected."""
        mock_redis.return_value = None
        
        # Mock JWKS key retrieval
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_key = {
                'kty': 'RSA',
                'kid': 'test-kid',
                'n': 'test-n',
                'e': 'AQAB'
            }
            mock_get_key.return_value = mock_key
            
            # Create token with wrong audience
            token = jwt.encode(
                {
                    'sub': 'test-user',
                    'exp': time.time() + 3600,
                    'iss': 'https://test-project.supabase.co/auth/v1',
                    'aud': 'wrong-audience'
                },
                'secret',
                algorithm='HS256',
                headers={'kid': 'test-kid'}
            )
            
            # Should reject token with wrong audience
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_expired_token(self, mock_redis):
        """Test that expired tokens are rejected."""
        mock_redis.return_value = None
        
        # Mock JWKS key retrieval
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_key = {
                'kty': 'RSA',
                'kid': 'test-kid',
                'n': 'test-n',
                'e': 'AQAB'
            }
            mock_get_key.return_value = mock_key
            
            # Create expired token
            token = jwt.encode(
                {
                    'sub': 'test-user',
                    'exp': time.time() - 3600,  # Expired 1 hour ago
                    'iss': 'https://test-project.supabase.co/auth/v1',
                    'aud': 'authenticated'
                },
                'secret',
                algorithm='HS256',
                headers={'kid': 'test-kid'}
            )
            
            # Should reject expired token
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_reject_invalid_uuid_sub(self, mock_redis):
        """Test that invalid UUID sub claims are rejected."""
        mock_redis.return_value = None
        
        # Mock JWKS key retrieval
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_key = {
                'kty': 'RSA',
                'kid': 'test-kid',
                'n': 'test-n',
                'e': 'AQAB'
            }
            mock_get_key.return_value = mock_key
            
            # Create token with invalid sub
            token = jwt.encode(
                {
                    'sub': 'not-a-uuid',
                    'exp': time.time() + 3600,
                    'iss': 'https://test-project.supabase.co/auth/v1',
                    'aud': 'authenticated'
                },
                'secret',
                algorithm='HS256',
                headers={'kid': 'test-kid'}
            )
            
            # Should reject token with invalid sub
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    def test_fail_closed_on_jwks_error(self):
        """Test that JWT verification fails closed when JWKS is unavailable."""
        # Create token
        token = jwt.encode(
            {
                'sub': 'test-user',
                'exp': time.time() + 3600,
                'iss': 'https://test-project.supabase.co/auth/v1',
                'aud': 'authenticated'
            },
            'secret',
            algorithm='HS256',
            headers={'kid': 'test-kid'}
        )
        
        # Mock JWKS key retrieval to fail
        with patch.object(self.auth_manager, 'get_jwks_key') as mock_get_key:
            mock_get_key.return_value = None
            
            # Should fail closed (return None) when JWKS is unavailable
            result = self.auth_manager.verify_jwt_token(token)
            assert result is None
    
    @patch('utils.redis_client.get_redis_client')
    def test_jwks_cache_backoff(self, mock_redis):
        """Test that JWKS failures trigger backoff."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        
        # Test backoff setting
        self.auth_manager._set_jwks_failure_backoff('test-kid', 30)
        
        # Verify backoff is active
        assert self.auth_manager._is_jwks_kid_in_backoff('test-kid')
        
        # Verify backoff prevents repeated attempts
        result = self.auth_manager.get_jwks_key('test-kid')
        assert result is None


class TestRoleInvalidationListener:
    """Test role invalidation listener functionality."""
    
    @patch.dict('os.environ', {
        'POSTGRES_DB': 'test_db',
        'POSTGRES_USER': 'test_user',
        'POSTGRES_PASSWORD': 'test_pass',
        'POSTGRES_HOST': 'localhost',
        'POSTGRES_PORT': '5432'
    })
    def test_environment_validation(self):
        """Test that environment validation works correctly."""
        from workers.role_invalidation_listener import RoleInvalidationListener
        
        # Should not raise error with valid environment
        listener = RoleInvalidationListener()
        assert listener is not None
    
    def test_missing_environment_variables(self):
        """Test that missing environment variables are detected."""
        with patch.dict('os.environ', {}, clear=True):
            from workers.role_invalidation_listener import RoleInvalidationListener
            
            # Should raise error with missing environment
            with pytest.raises(ValueError, match="Missing required environment variables"):
                RoleInvalidationListener()
    
    @patch('workers.role_invalidation_listener.get_redis_client')
    def test_cache_invalidation(self, mock_redis):
        """Test that cache invalidation works correctly."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        
        from workers.role_invalidation_listener import RoleInvalidationListener
        
        with patch.dict('os.environ', {
            'POSTGRES_DB': 'test_db',
            'POSTGRES_USER': 'test_user',
            'POSTGRES_PASSWORD': 'test_pass',
            'POSTGRES_HOST': 'localhost',
            'POSTGRES_PORT': '5432'
        }):
            listener = RoleInvalidationListener()
            
            # Test Redis cache invalidation
            listener._invalidate_user_role('test-user-id')
            
            # Verify Redis delete was called
            mock_redis_instance.delete.assert_called_with('admin_role:test-user-id')


if __name__ == '__main__':
    pytest.main([__file__])
