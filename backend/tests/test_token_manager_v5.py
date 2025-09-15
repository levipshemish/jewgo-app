"""
Unit tests for TokenManagerV5.

Tests for enhanced JWT token management with leeway support and JTI tracking.
"""

import pytest
import jwt
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from services.auth.token_manager_v5 import TokenManagerV5


class TestTokenManagerV5:
    """Unit tests for TokenManagerV5."""
    
    @pytest.fixture
    def token_manager(self):
        """Create TokenManagerV5 instance for testing."""
        with patch.dict('os.environ', {
            'JWT_SECRET_KEY': 'test_secret_key_12345',
            'ACCESS_TTL_SECONDS': '3600',
            'REFRESH_TTL_SECONDS': '2592000',
            'JWT_ISSUER': 'test.jewgo.app',
            'JWT_AUDIENCE': 'test.jewgo.app'
        }):
            return TokenManagerV5(leeway=60)
    
    def test_initialization(self, token_manager):
        """Test TokenManagerV5 initialization."""
        assert token_manager.secret == 'test_secret_key_12345'
        assert token_manager.algorithm == 'HS256'
        assert token_manager.leeway == 60
        assert token_manager.default_access_ttl == 3600
        assert token_manager.default_refresh_ttl == 2592000
    
    def test_initialization_missing_secret(self):
        """Test initialization fails without JWT secret."""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(RuntimeError, match="JWT_SECRET_KEY environment variable is required"):
                TokenManagerV5()
    
    def test_mint_access_token_basic(self, token_manager):
        """Test basic access token minting."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        token, ttl = token_manager.mint_access_token(user_id, email)
        
        assert isinstance(token, str)
        assert ttl == 3600
        
        # Verify token structure
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        assert payload['type'] == 'access'
        assert payload['uid'] == user_id
        assert payload['email'] == email
        assert 'jti' in payload
        assert 'iat' in payload
        assert 'exp' in payload
        assert payload['iss'] == 'test.jewgo.app'
        assert payload['aud'] == 'test.jewgo.app'
    
    def test_mint_access_token_with_roles(self, token_manager):
        """Test access token minting with roles."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        roles = [{'role': 'admin', 'level': 3}, {'role': 'user', 'level': 1}]
        
        token, ttl = token_manager.mint_access_token(user_id, email, roles=roles)
        
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        assert payload['roles'] == roles
    
    def test_mint_access_token_with_auth_time(self, token_manager):
        """Test access token minting with auth_time for step-up auth."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        auth_time = datetime.now(timezone.utc)
        
        token, ttl = token_manager.mint_access_token(user_id, email, auth_time=auth_time)
        
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        assert payload['auth_time'] == int(auth_time.timestamp())
    
    def test_mint_access_token_custom_ttl(self, token_manager):
        """Test access token minting with custom TTL."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        custom_ttl = 7200  # 2 hours
        
        token, ttl = token_manager.mint_access_token(user_id, email, ttl=custom_ttl)
        
        assert ttl == custom_ttl
        
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        expected_exp = int((datetime.now(timezone.utc) + timedelta(seconds=custom_ttl)).timestamp())
        # Allow 5 second tolerance for test execution time
        assert abs(payload['exp'] - expected_exp) <= 5
    
    def test_mint_refresh_token(self, token_manager):
        """Test refresh token minting."""
        user_id = 'test_user_123'
        session_id = 'session_456'
        family_id = 'family_789'
        
        token, ttl = token_manager.mint_refresh_token(user_id, session_id, family_id)
        
        assert isinstance(token, str)
        assert ttl == 2592000
        
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        assert payload['type'] == 'refresh'
        assert payload['uid'] == user_id
        assert payload['sid'] == session_id
        assert payload['fid'] == family_id
        assert 'jti' in payload
        assert payload['iss'] == 'test.jewgo.app'
        assert payload['aud'] == 'test.jewgo.app'
    
    def test_verify_token_valid(self, token_manager):
        """Test verification of valid token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        token, _ = token_manager.mint_access_token(user_id, email)
        payload = token_manager.verify_token(token)
        
        assert payload is not None
        assert payload['uid'] == user_id
        assert payload['email'] == email
        assert payload['type'] == 'access'
    
    def test_verify_token_invalid(self, token_manager):
        """Test verification of invalid token."""
        invalid_tokens = [
            'invalid.token.here',
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
            '',
            None
        ]
        
        for invalid_token in invalid_tokens:
            payload = token_manager.verify_token(invalid_token)
            assert payload is None
    
    def test_verify_token_expired(self, token_manager):
        """Test verification of expired token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Create token with very short TTL
        token, _ = token_manager.mint_access_token(user_id, email, ttl=1)
        
        # Wait for token to expire
        time.sleep(2)
        
        payload = token_manager.verify_token(token)
        assert payload is None
    
    def test_verify_token_with_leeway(self, token_manager):
        """Test token verification with leeway for clock skew."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Create token with short TTL
        token, _ = token_manager.mint_access_token(user_id, email, ttl=2)
        
        # Wait for token to expire
        time.sleep(3)
        
        # Should fail without leeway
        payload = token_manager.verify_token(token, leeway=0)
        assert payload is None
        
        # Should succeed with sufficient leeway
        payload = token_manager.verify_token(token, leeway=10)
        assert payload is not None
        assert payload['uid'] == user_id
    
    def test_verify_token_missing_jti(self, token_manager):
        """Test verification fails for token without JTI."""
        # Create token without JTI manually
        payload = {
            'type': 'access',
            'uid': 'test_user',
            'email': 'test@example.com',
            'iat': int(datetime.now(timezone.utc).timestamp()),
            'exp': int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
            # Missing 'jti'
        }
        
        token = jwt.encode(payload, 'test_secret_key_12345', algorithm='HS256')
        result = token_manager.verify_token(token)
        assert result is None
    
    def test_verify_token_missing_type(self, token_manager):
        """Test verification fails for token without type."""
        # Create token without type manually
        payload = {
            'uid': 'test_user',
            'email': 'test@example.com',
            'jti': 'test_jti',
            'iat': int(datetime.now(timezone.utc).timestamp()),
            'exp': int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
            # Missing 'type'
        }
        
        token = jwt.encode(payload, 'test_secret_key_12345', algorithm='HS256')
        result = token_manager.verify_token(token)
        assert result is None
    
    def test_extract_jti(self, token_manager):
        """Test JTI extraction from token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        token, _ = token_manager.mint_access_token(user_id, email)
        jti = token_manager.extract_jti(token)
        
        assert jti is not None
        assert isinstance(jti, str)
        assert len(jti) == 32  # 16 bytes hex = 32 chars
        
        # Verify it matches the token's JTI
        payload = jwt.decode(token, 'test_secret_key_12345', algorithms=['HS256'], 
                           audience='test.jewgo.app')
        assert jti == payload['jti']
    
    def test_extract_jti_invalid_token(self, token_manager):
        """Test JTI extraction from invalid token."""
        jti = token_manager.extract_jti('invalid.token')
        assert jti is None
    
    def test_extract_user_id(self, token_manager):
        """Test user ID extraction from token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        token, _ = token_manager.mint_access_token(user_id, email)
        extracted_user_id = token_manager.extract_user_id(token)
        
        assert extracted_user_id == user_id
    
    def test_extract_user_id_invalid_token(self, token_manager):
        """Test user ID extraction from invalid token."""
        user_id = token_manager.extract_user_id('invalid.token')
        assert user_id is None
    
    def test_is_token_expired_valid(self, token_manager):
        """Test expiration check for valid token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        token, _ = token_manager.mint_access_token(user_id, email)
        is_expired = token_manager.is_token_expired(token)
        
        assert is_expired is False
    
    def test_is_token_expired_expired(self, token_manager):
        """Test expiration check for expired token."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Create token with very short TTL
        token, _ = token_manager.mint_access_token(user_id, email, ttl=1)
        
        # Wait for expiration
        time.sleep(2)
        
        is_expired = token_manager.is_token_expired(token)
        assert is_expired is True
    
    def test_is_token_expired_with_leeway(self, token_manager):
        """Test expiration check with leeway."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Create token with short TTL
        token, _ = token_manager.mint_access_token(user_id, email, ttl=2)
        
        # Wait for expiration
        time.sleep(3)
        
        # Should be expired without leeway
        assert token_manager.is_token_expired(token, leeway=0) is True
        
        # Should not be expired with sufficient leeway
        assert token_manager.is_token_expired(token, leeway=10) is False
    
    def test_is_token_expired_invalid_token(self, token_manager):
        """Test expiration check for invalid token."""
        is_expired = token_manager.is_token_expired('invalid.token')
        assert is_expired is True
    
    def test_get_token_claims(self, token_manager):
        """Test getting token claims without verification."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        roles = [{'role': 'user', 'level': 1}]
        
        token, _ = token_manager.mint_access_token(user_id, email, roles=roles)
        claims = token_manager.get_token_claims(token)
        
        assert claims is not None
        assert claims['uid'] == user_id
        assert claims['email'] == email
        assert claims['roles'] == roles
        assert claims['type'] == 'access'
        assert 'jti' in claims
    
    def test_get_token_claims_invalid_token(self, token_manager):
        """Test getting claims from invalid token."""
        claims = token_manager.get_token_claims('invalid.token')
        assert claims is None
    
    def test_health_check_healthy(self, token_manager):
        """Test health check when system is healthy."""
        health = token_manager.health_check()
        
        assert health['status'] == 'healthy'
        assert health['secret_configured'] is True
        assert health['algorithm'] == 'HS256'
        assert health['leeway_seconds'] == 60
        assert health['default_access_ttl'] == 3600
        assert health['default_refresh_ttl'] == 2592000
        assert 'timestamp' in health
    
    @patch('services.auth.token_manager_v5.TokenManagerV5.mint_access_token')
    def test_health_check_unhealthy(self, mock_mint, token_manager):
        """Test health check when system is unhealthy."""
        mock_mint.side_effect = Exception("Test error")
        
        health = token_manager.health_check()
        
        assert health['status'] == 'unhealthy'
        assert 'error' in health
        assert 'timestamp' in health
    
    def test_different_leeway_values(self, token_manager):
        """Test token manager with different leeway values."""
        leeway_values = [0, 30, 60, 120, 300]
        
        for leeway in leeway_values:
            tm = TokenManagerV5(leeway=leeway)
            assert tm.leeway == leeway
            
            # Test that it works with the specified leeway
            user_id = 'test_user'
            email = 'test@example.com'
            token, _ = tm.mint_access_token(user_id, email)
            payload = tm.verify_token(token)
            
            assert payload is not None
            assert payload['uid'] == user_id
    
    def test_token_uniqueness(self, token_manager):
        """Test that each token has unique JTI."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        tokens = []
        jtis = set()
        
        # Generate multiple tokens
        for _ in range(10):
            token, _ = token_manager.mint_access_token(user_id, email)
            tokens.append(token)
            
            jti = token_manager.extract_jti(token)
            assert jti not in jtis, "JTI should be unique"
            jtis.add(jti)
        
        # Verify all tokens are different
        assert len(set(tokens)) == 10, "All tokens should be unique"
    
    def test_token_format_consistency(self, token_manager):
        """Test that tokens follow consistent format."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Test access token
        access_token, _ = token_manager.mint_access_token(user_id, email)
        access_payload = token_manager.get_token_claims(access_token)
        
        required_access_fields = ['type', 'uid', 'email', 'iat', 'exp', 'jti', 'iss', 'aud']
        for field in required_access_fields:
            assert field in access_payload, f"Access token missing required field: {field}"
        
        # Test refresh token
        refresh_token, _ = token_manager.mint_refresh_token(user_id, 'session_123', 'family_456')
        refresh_payload = token_manager.get_token_claims(refresh_token)
        
        required_refresh_fields = ['type', 'uid', 'sid', 'fid', 'iat', 'exp', 'jti', 'iss', 'aud']
        for field in required_refresh_fields:
            assert field in refresh_payload, f"Refresh token missing required field: {field}"
    
    def test_error_handling_in_minting(self, token_manager):
        """Test error handling during token minting."""
        # Test with invalid parameters - these should raise exceptions during JWT encoding
        with pytest.raises((TypeError, ValueError, Exception)):
            token_manager.mint_access_token(None, None)
        
        with pytest.raises((TypeError, ValueError, Exception)):
            token_manager.mint_refresh_token(None, None, None)
    
    @patch('services.auth.token_manager_v5.logger')
    def test_logging_behavior(self, mock_logger, token_manager):
        """Test that appropriate logging occurs."""
        user_id = 'test_user_123'
        email = 'test@example.com'
        
        # Test successful operations log debug messages
        token, _ = token_manager.mint_access_token(user_id, email)
        mock_logger.debug.assert_called()
        
        # Test verification
        payload = token_manager.verify_token(token)
        assert payload is not None
        
        # Test invalid token logs debug message
        token_manager.verify_token('invalid.token')
        mock_logger.debug.assert_called()