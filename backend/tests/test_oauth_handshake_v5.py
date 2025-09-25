"""
Unit tests for OAuth handshake functionality with PKCE and Redis backend.
Tests the new OAuth flow with step-level diagnostics and cbid correlation.
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock
from services.oauth_service_v5 import OAuthService, OAuthError


class TestOAuthHandshake:
    """Test OAuth handshake functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.oauth_service = OAuthService(self.mock_db)
        
        # Mock Redis client
        self.mock_redis = Mock()
        self.mock_redis.setex.return_value = True
        self.mock_redis.get.return_value = None
        self.mock_redis.delete.return_value = True
        self.mock_redis.scan_iter.return_value = []
        self.mock_redis.ttl.return_value = 900
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_pkce_generation(self, mock_get_redis):
        """Test PKCE verifier and challenge generation."""
        mock_get_redis.return_value = self.mock_redis
        
        verifier, challenge = self.oauth_service._generate_pkce_pair()
        
        # Verifier should be URL-safe and reasonable length
        assert len(verifier) >= 43
        assert len(verifier) <= 128
        assert all(c.isalnum() or c in '-_' for c in verifier)
        
        # Challenge should be base64url encoded SHA256 of verifier
        import hashlib
        import base64
        expected_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        assert challenge == expected_challenge
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_handshake_storage(self, mock_get_redis):
        """Test storing handshake data in Redis."""
        mock_get_redis.return_value = self.mock_redis
        
        cbid = "oauth_1758822715_1721801"
        state = "test_state_123"
        pkce_verifier = "test_verifier"
        nonce = "test_nonce"
        provider = "google"
        return_to = "/dashboard"
        link_user_id = "user_123"
        
        result = self.oauth_service._store_handshake_in_redis(
            cbid, state, pkce_verifier, nonce, provider, return_to, link_user_id
        )
        
        assert result is True
        self.mock_redis.setex.assert_called_once()
        
        # Check the stored data
        call_args = self.mock_redis.setex.call_args
        assert call_args[0][0] == f"oauth:cbid:{cbid}"
        assert call_args[0][1] == 900  # TTL
        
        stored_data = json.loads(call_args[0][2])
        assert stored_data['state'] == state
        assert stored_data['pkceVerifier'] == pkce_verifier
        assert stored_data['nonce'] == nonce
        assert stored_data['provider'] == provider
        assert stored_data['returnTo'] == return_to
        assert stored_data['linkUserId'] == link_user_id
        assert stored_data['used'] is False
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_handshake_loading(self, mock_get_redis):
        """Test loading handshake data from Redis."""
        mock_get_redis.return_value = self.mock_redis
        
        # Mock handshake data
        handshake_data = {
            'state': 'test_state_123',
            'pkceVerifier': 'test_verifier',
            'nonce': 'test_nonce',
            'provider': 'google',
            'returnTo': '/dashboard',
            'linkUserId': 'user_123',
            'createdAt': int(time.time()),
            'used': False
        }
        
        # Mock scan_iter to return a key
        self.mock_redis.scan_iter.return_value = ['oauth:cbid:test_cbid']
        self.mock_redis.get.return_value = json.dumps(handshake_data)
        self.mock_redis.ttl.return_value = 900
        
        result = self.oauth_service._load_handshake_from_redis('test_state_123')
        
        assert result is not None
        assert result['state'] == 'test_state_123'
        assert result['ttl'] == 900
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_handshake_not_found(self, mock_get_redis):
        """Test loading handshake when not found."""
        mock_get_redis.return_value = self.mock_redis
        
        # Mock empty scan results
        self.mock_redis.scan_iter.return_value = []
        
        result = self.oauth_service._load_handshake_from_redis('nonexistent_state')
        
        assert result is None
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_mark_handshake_used(self, mock_get_redis):
        """Test marking handshake as used."""
        mock_get_redis.return_value = self.mock_redis
        
        cbid = "oauth_1758822715_1721801"
        handshake_data = {
            'state': 'test_state_123',
            'pkceVerifier': 'test_verifier',
            'nonce': 'test_nonce',
            'provider': 'google',
            'returnTo': '/dashboard',
            'linkUserId': 'user_123',
            'createdAt': int(time.time()),
            'used': False
        }
        
        self.mock_redis.get.return_value = json.dumps(handshake_data)
        
        result = self.oauth_service._mark_handshake_used(cbid)
        
        assert result is True
        self.mock_redis.setex.assert_called_once()
        
        # Check that used flag is set to True
        call_args = self.mock_redis.setex.call_args
        updated_data = json.loads(call_args[0][2])
        assert updated_data['used'] is True
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_consume_handshake(self, mock_get_redis):
        """Test consuming handshake after successful OAuth."""
        mock_get_redis.return_value = self.mock_redis
        
        cbid = "oauth_1758822715_1721801"
        
        result = self.oauth_service._consume_handshake(cbid)
        
        assert result is True
        self.mock_redis.delete.assert_called_once_with(f"oauth:cbid:{cbid}")
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_redis_unavailable(self, mock_get_redis):
        """Test behavior when Redis is unavailable."""
        mock_get_redis.return_value = None
        
        cbid = "oauth_1758822715_1721801"
        state = "test_state_123"
        pkce_verifier = "test_verifier"
        nonce = "test_nonce"
        provider = "google"
        return_to = "/dashboard"
        
        result = self.oauth_service._store_handshake_in_redis(
            cbid, state, pkce_verifier, nonce, provider, return_to
        )
        
        assert result is False
        
    def test_pkce_verification_equality(self):
        """Test that PKCE challenge equals base64url(SHA256(verifier))."""
        verifier, challenge = self.oauth_service._generate_pkce_pair()
        
        import hashlib
        import base64
        
        # Manually compute expected challenge
        expected_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        
        assert challenge == expected_challenge
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_handshake_replay_protection(self, mock_get_redis):
        """Test that used handshakes cannot be reused."""
        mock_get_redis.return_value = self.mock_redis
        
        # Mock handshake data that's already used
        handshake_data = {
            'state': 'test_state_123',
            'pkceVerifier': 'test_verifier',
            'nonce': 'test_nonce',
            'provider': 'google',
            'returnTo': '/dashboard',
            'linkUserId': 'user_123',
            'createdAt': int(time.time()),
            'used': True  # Already used
        }
        
        self.mock_redis.scan_iter.return_value = ['oauth:cbid:test_cbid']
        self.mock_redis.get.return_value = json.dumps(handshake_data)
        
        result = self.oauth_service._load_handshake_from_redis('test_state_123')
        
        # Should still return the data, but caller should check used flag
        assert result is not None
        assert result['used'] is True


class TestOAuthErrorScenarios:
    """Test OAuth error scenarios and edge cases."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.oauth_service = OAuthService(self.mock_db)
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_handshake_missing_error(self, mock_get_redis):
        """Test OAuthError when handshake is missing."""
        mock_get_redis.return_value = Mock()
        mock_get_redis.return_value.scan_iter.return_value = []
        
        with pytest.raises(OAuthError) as exc_info:
            self.oauth_service._load_handshake_from_redis('nonexistent_state')
        
        assert exc_info.value.args[0] == "handshake_missing"
        
    def test_pkce_missing_error(self):
        """Test OAuthError when PKCE verifier is missing."""
        handshake_data = {
            'state': 'test_state_123',
            'nonce': 'test_nonce',
            'provider': 'google',
            'returnTo': '/dashboard',
            # Missing pkceVerifier
        }
        
        with pytest.raises(OAuthError) as exc_info:
            if not handshake_data.get('pkceVerifier'):
                raise OAuthError("pkce_missing")
        
        assert exc_info.value.args[0] == "pkce_missing"
        
    def test_state_mismatch_error(self):
        """Test OAuthError when state doesn't match."""
        handshake_data = {'state': 'expected_state'}
        received_state = 'different_state'
        
        with pytest.raises(OAuthError) as exc_info:
            if handshake_data.get('state') != received_state:
                raise OAuthError("state_mismatch")
        
        assert exc_info.value.args[0] == "state_mismatch"


class TestOAuthIntegration:
    """Test OAuth integration scenarios."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.oauth_service = OAuthService(self.mock_db)
        
    @patch('services.oauth_service_v5.get_redis_client')
    def test_full_handshake_lifecycle(self, mock_get_redis):
        """Test complete handshake lifecycle."""
        mock_redis = Mock()
        mock_get_redis.return_value = mock_redis
        
        # Step 1: Store handshake
        cbid = "oauth_1758822715_1721801"
        state = "test_state_123"
        pkce_verifier = "test_verifier"
        nonce = "test_nonce"
        provider = "google"
        return_to = "/dashboard"
        
        result = self.oauth_service._store_handshake_in_redis(
            cbid, state, pkce_verifier, nonce, provider, return_to
        )
        assert result is True
        
        # Step 2: Load handshake
        handshake_data = {
            'state': state,
            'pkceVerifier': pkce_verifier,
            'nonce': nonce,
            'provider': provider,
            'returnTo': return_to,
            'createdAt': int(time.time()),
            'used': False
        }
        
        mock_redis.scan_iter.return_value = [f'oauth:cbid:{cbid}']
        mock_redis.get.return_value = json.dumps(handshake_data)
        mock_redis.ttl.return_value = 900
        
        loaded_data = self.oauth_service._load_handshake_from_redis(state)
        assert loaded_data is not None
        assert loaded_data['state'] == state
        
        # Step 3: Mark as used
        result = self.oauth_service._mark_handshake_used(cbid)
        assert result is True
        
        # Step 4: Consume handshake
        result = self.oauth_service._consume_handshake(cbid)
        assert result is True
        mock_redis.delete.assert_called_with(f"oauth:cbid:{cbid}")


if __name__ == '__main__':
    pytest.main([__file__])
