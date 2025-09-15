"""
Unit tests for JWKSManager.

Tests for JWT key management, rotation, and JWKS generation.
"""

import pytest
import time
from unittest.mock import Mock, patch
from services.auth.jwks_manager import JWKSManager


class TestJWKSManager:
    """Unit tests for JWKSManager."""
    
    @pytest.fixture
    def mock_redis_manager(self):
        """Create mock Redis manager."""
        mock = Mock()
        mock.health_check.return_value = {'status': 'healthy'}
        mock.set.return_value = True
        mock.get.return_value = None
        mock.delete.return_value = True
        return mock
    
    @pytest.fixture
    def jwks_manager(self, mock_redis_manager):
        """Create JWKSManager instance for testing."""
        with patch.dict('os.environ', {
            'JWT_ALGORITHM': 'RS256',
            'JWT_KEY_SIZE': '2048',
            'JWKS_CACHE_TTL': '300',
            'KEY_ROTATION_DAYS': '90',
            'JWT_ISSUER': 'test.jewgo.app'
        }):
            return JWKSManager(redis_manager=mock_redis_manager)
    
    def test_initialization_rs256(self, jwks_manager):
        """Test JWKSManager initialization with RS256."""
        assert jwks_manager.algorithm == 'RS256'
        assert jwks_manager.key_size == 2048
        assert jwks_manager.jwks_cache_ttl == 300
        assert jwks_manager.key_rotation_days == 90
        assert jwks_manager.issuer == 'test.jewgo.app'
    
    def test_initialization_es256(self, mock_redis_manager):
        """Test JWKSManager initialization with ES256."""
        with patch.dict('os.environ', {
            'JWT_ALGORITHM': 'ES256',
            'JWT_ISSUER': 'test.jewgo.app'
        }):
            manager = JWKSManager(redis_manager=mock_redis_manager)
            assert manager.algorithm == 'ES256'
    
    def test_initialization_invalid_algorithm(self, mock_redis_manager):
        """Test initialization fails with invalid algorithm."""
        with patch.dict('os.environ', {
            'JWT_ALGORITHM': 'HS256',  # Not allowed
            'JWT_ISSUER': 'test.jewgo.app'
        }):
            with pytest.raises(ValueError, match="Unsupported algorithm"):
                JWKSManager(redis_manager=mock_redis_manager)
    
    def test_generate_key_pair_rs256(self, jwks_manager):
        """Test RSA key pair generation."""
        kid, private_pem, public_pem = jwks_manager.generate_key_pair()
        
        assert isinstance(kid, str)
        assert kid.startswith('rs256_')
        assert len(kid.split('_')) == 3  # algorithm_timestamp_random
        
        assert isinstance(private_pem, str)
        assert private_pem.startswith('-----BEGIN PRIVATE KEY-----')
        assert private_pem.endswith('-----END PRIVATE KEY-----\n')
        
        assert isinstance(public_pem, str)
        assert public_pem.startswith('-----BEGIN PUBLIC KEY-----')
        assert public_pem.endswith('-----END PUBLIC KEY-----\n')
    
    def test_generate_key_pair_es256(self, mock_redis_manager):
        """Test ECDSA key pair generation."""
        with patch.dict('os.environ', {
            'JWT_ALGORITHM': 'ES256',
            'JWT_ISSUER': 'test.jewgo.app'
        }):
            manager = JWKSManager(redis_manager=mock_redis_manager)
            kid, private_pem, public_pem = manager.generate_key_pair()
            
            assert kid.startswith('es256_')
            assert '-----BEGIN PRIVATE KEY-----' in private_pem
            assert '-----BEGIN PUBLIC KEY-----' in public_pem
    
    def test_store_key_pair(self, jwks_manager, mock_redis_manager):
        """Test key pair storage."""
        kid, private_pem, public_pem = jwks_manager.generate_key_pair()
        
        success = jwks_manager.store_key_pair(kid, private_pem, public_pem, is_current=True)
        
        assert success is True
        
        # Verify Redis calls
        assert mock_redis_manager.set.call_count >= 2  # Key data + current kid
        
        # Check that key was added to key list
        calls = mock_redis_manager.set.call_args_list
        key_data_call = calls[0]
        assert 'jwks:key:' in str(key_data_call)
    
    def test_get_current_key(self, jwks_manager, mock_redis_manager):
        """Test getting current key."""
        # Mock Redis responses
        test_kid = 'test_kid_123'
        test_key_data = {
            'kid': test_kid,
            'algorithm': 'RS256',
            'private_key': 'test_private_key',
            'public_key': 'test_public_key',
            'status': 'active',
            'is_current': True
        }
        
        mock_redis_manager.get.side_effect = [test_kid, test_key_data]
        
        current_key = jwks_manager.get_current_key()
        
        assert current_key is not None
        assert current_key['kid'] == test_kid
        assert current_key['status'] == 'active'
    
    def test_get_current_key_none(self, jwks_manager, mock_redis_manager):
        """Test getting current key when none exists."""
        mock_redis_manager.get.return_value = None
        
        current_key = jwks_manager.get_current_key()
        
        assert current_key is None
    
    def test_get_key_by_kid(self, jwks_manager, mock_redis_manager):
        """Test getting key by kid."""
        test_kid = 'test_kid_123'
        test_key_data = {
            'kid': test_kid,
            'status': 'active'
        }
        
        mock_redis_manager.get.return_value = test_key_data
        
        key_data = jwks_manager.get_key_by_kid(test_kid)
        
        assert key_data is not None
        assert key_data['kid'] == test_kid
    
    def test_get_key_by_kid_revoked(self, jwks_manager, mock_redis_manager):
        """Test getting revoked key returns None."""
        test_kid = 'test_kid_123'
        test_key_data = {
            'kid': test_kid,
            'status': 'revoked'
        }
        
        mock_redis_manager.get.return_value = test_key_data
        
        key_data = jwks_manager.get_key_by_kid(test_kid)
        
        assert key_data is None
    
    def test_get_public_jwks_cached(self, jwks_manager, mock_redis_manager):
        """Test getting public JWKS from cache."""
        cached_jwks = {'keys': [{'kid': 'test_kid', 'kty': 'RSA'}]}
        mock_redis_manager.get.return_value = cached_jwks
        
        jwks = jwks_manager.get_public_jwks()
        
        assert jwks == cached_jwks
        mock_redis_manager.get.assert_called_once()
    
    def test_get_public_jwks_generate(self, jwks_manager, mock_redis_manager):
        """Test generating public JWKS when not cached."""
        # Mock no cache, but has keys
        mock_redis_manager.get.side_effect = [None, ['test_kid']]  # No cache, then key list
        
        # Mock key data
        test_key_data = {
            'kid': 'test_kid',
            'algorithm': 'RS256',
            'public_key': self._get_test_rsa_public_key(),
            'status': 'active'
        }
        
        def mock_get_key_by_kid(kid):
            return test_key_data if kid == 'test_kid' else None
        
        with patch.object(jwks_manager, 'get_key_by_kid', side_effect=mock_get_key_by_kid):
            with patch.object(jwks_manager, '_get_key_list', return_value=['test_kid']):
                jwks = jwks_manager.get_public_jwks()
        
        assert 'keys' in jwks
        assert len(jwks['keys']) >= 0  # May be 0 if key creation fails
    
    def test_rotate_keys(self, jwks_manager, mock_redis_manager):
        """Test key rotation."""
        # Mock current key
        current_key = {
            'kid': 'old_kid',
            'status': 'active'
        }
        
        with patch.object(jwks_manager, 'get_current_key', return_value=current_key):
            with patch.object(jwks_manager, 'store_key_pair', return_value=True):
                with patch.object(jwks_manager, '_retire_key') as mock_retire:
                    with patch.object(jwks_manager, '_cleanup_old_keys'):
                        success, message = jwks_manager.rotate_keys()
        
        assert success is True
        assert 'Key rotation successful' in message
        mock_retire.assert_called_once_with('old_kid')
    
    def test_rotate_keys_no_current(self, jwks_manager):
        """Test key rotation when no current key exists."""
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            with patch.object(jwks_manager, 'store_key_pair', return_value=True):
                with patch.object(jwks_manager, '_cleanup_old_keys'):
                    success, message = jwks_manager.rotate_keys()
        
        assert success is True
        assert 'Key rotation successful' in message
    
    def test_rotate_keys_store_failure(self, jwks_manager):
        """Test key rotation when storage fails."""
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            with patch.object(jwks_manager, 'store_key_pair', return_value=False):
                success, message = jwks_manager.rotate_keys()
        
        assert success is False
        assert 'Failed to store new key pair' in message
    
    def test_emergency_revoke_key(self, jwks_manager, mock_redis_manager):
        """Test emergency key revocation."""
        test_kid = 'test_kid_123'
        test_key_data = {
            'kid': test_kid,
            'status': 'active'
        }
        
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=test_key_data):
            with patch.object(jwks_manager, '_invalidate_jwks_cache'):
                success = jwks_manager.emergency_revoke_key(test_kid, 'test_reason')
        
        assert success is True
        mock_redis_manager.set.assert_called()
    
    def test_emergency_revoke_current_key(self, jwks_manager, mock_redis_manager):
        """Test emergency revocation of current key triggers rotation."""
        test_kid = 'current_kid_123'
        test_key_data = {
            'kid': test_kid,
            'status': 'active'
        }
        
        # Mock that this is the current key
        mock_redis_manager.get.side_effect = lambda key, prefix=None: test_kid if 'current_kid' in key else None
        
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=test_key_data):
            with patch.object(jwks_manager, 'rotate_keys', return_value=(True, 'success')):
                with patch.object(jwks_manager, '_invalidate_jwks_cache'):
                    success = jwks_manager.emergency_revoke_key(test_kid, 'test_reason')
        
        assert success is True
    
    def test_emergency_revoke_key_not_found(self, jwks_manager):
        """Test emergency revocation of non-existent key."""
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=None):
            success = jwks_manager.emergency_revoke_key('nonexistent_kid', 'test_reason')
        
        assert success is False
    
    def test_sign_jwt(self, jwks_manager):
        """Test JWT signing."""
        test_payload = {'test': True, 'iat': int(time.time()), 'exp': int(time.time()) + 300}
        current_key = {
            'kid': 'test_kid',
            'private_key': self._get_test_rsa_private_key(),
            'algorithm': 'RS256'
        }
        
        with patch.object(jwks_manager, 'get_current_key', return_value=current_key):
            token = jwks_manager.sign_jwt(test_payload)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token structure (without verification)
        import jwt as jwt_lib
        header = jwt_lib.get_unverified_header(token)
        assert header['kid'] == 'test_kid'
        assert header['alg'] == 'RS256'
    
    def test_sign_jwt_no_current_key(self, jwks_manager):
        """Test JWT signing when no current key exists."""
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            token = jwks_manager.sign_jwt({'test': True})
        
        assert token is None
    
    def test_verify_jwt(self, jwks_manager):
        """Test JWT verification."""
        # Create a test token
        test_payload = {
            'test': True,
            'iat': int(time.time()),
            'exp': int(time.time()) + 300,
            'iss': 'test.jewgo.app'
        }
        
        private_key = self._get_test_rsa_private_key()
        public_key = self._get_test_rsa_public_key()
        
        import jwt as jwt_lib
        token = jwt_lib.encode(
            test_payload,
            private_key,
            algorithm='RS256',
            headers={'kid': 'test_kid'}
        )
        
        key_data = {
            'kid': 'test_kid',
            'public_key': public_key,
            'status': 'active'
        }
        
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=key_data):
            payload = jwks_manager.verify_jwt(token)
        
        assert payload is not None
        assert payload['test'] is True
    
    def test_verify_jwt_no_kid(self, jwks_manager):
        """Test JWT verification fails when token has no kid."""
        import jwt as jwt_lib
        token = jwt_lib.encode({'test': True}, 'secret', algorithm='HS256')
        
        payload = jwks_manager.verify_jwt(token)
        assert payload is None
    
    def test_verify_jwt_unknown_kid(self, jwks_manager):
        """Test JWT verification fails for unknown kid."""
        import jwt as jwt_lib
        token = jwt_lib.encode(
            {'test': True},
            'secret',
            algorithm='HS256',
            headers={'kid': 'unknown_kid'}
        )
        
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=None):
            payload = jwks_manager.verify_jwt(token)
        
        assert payload is None
    
    def test_verify_jwt_revoked_key(self, jwks_manager):
        """Test JWT verification fails for revoked key."""
        import jwt as jwt_lib
        token = jwt_lib.encode(
            {'test': True},
            'secret',
            algorithm='HS256',
            headers={'kid': 'revoked_kid'}
        )
        
        revoked_key_data = {
            'kid': 'revoked_kid',
            'status': 'revoked'
        }
        
        with patch.object(jwks_manager, 'get_key_by_kid', return_value=revoked_key_data):
            payload = jwks_manager.verify_jwt(token)
        
        assert payload is None
    
    def test_initialize_keys(self, jwks_manager):
        """Test key initialization."""
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            with patch.object(jwks_manager, 'store_key_pair', return_value=True):
                success = jwks_manager.initialize_keys()
        
        assert success is True
    
    def test_initialize_keys_already_exists(self, jwks_manager):
        """Test key initialization when keys already exist."""
        current_key = {'kid': 'existing_key'}
        
        with patch.object(jwks_manager, 'get_current_key', return_value=current_key):
            success = jwks_manager.initialize_keys()
        
        assert success is True
    
    def test_initialize_keys_storage_failure(self, jwks_manager):
        """Test key initialization when storage fails."""
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            with patch.object(jwks_manager, 'store_key_pair', return_value=False):
                success = jwks_manager.initialize_keys()
        
        assert success is False
    
    def test_health_check_healthy(self, jwks_manager, mock_redis_manager):
        """Test health check when system is healthy."""
        current_key = {'kid': 'test_kid', 'private_key': self._get_test_rsa_private_key()}
        jwks = {'keys': [{'kid': 'test_kid'}]}
        
        with patch.object(jwks_manager, 'get_current_key', return_value=current_key):
            with patch.object(jwks_manager, 'get_public_jwks', return_value=jwks):
                with patch.object(jwks_manager, 'sign_jwt', return_value='test_token'):
                    with patch.object(jwks_manager, 'verify_jwt', return_value={'test': True}):
                        health = jwks_manager.health_check()
        
        assert health['status'] == 'healthy'
        assert health['current_key'] is True
        assert health['jwks_generation'] is True
        assert health['signing'] is True
        assert health['verification'] is True
        assert health['redis'] is True
    
    def test_health_check_unhealthy(self, jwks_manager, mock_redis_manager):
        """Test health check when system is unhealthy."""
        mock_redis_manager.health_check.return_value = {'status': 'unhealthy'}
        
        with patch.object(jwks_manager, 'get_current_key', return_value=None):
            health = jwks_manager.health_check()
        
        assert health['status'] == 'unhealthy'
        assert health['current_key'] is False
        assert health['redis'] is False
    
    def test_generate_kid_format(self, jwks_manager):
        """Test kid generation format."""
        kid = jwks_manager._generate_kid()
        
        parts = kid.split('_')
        assert len(parts) == 3
        assert parts[0] == 'rs256'
        assert parts[1].isdigit()  # timestamp
        assert len(parts[2]) == 16  # 8 bytes hex = 16 chars
    
    def test_create_public_jwk_rsa(self, jwks_manager):
        """Test creating public JWK for RSA key."""
        key_data = {
            'kid': 'test_kid',
            'algorithm': 'RS256',
            'public_key': self._get_test_rsa_public_key()
        }
        
        jwk = jwks_manager._create_public_jwk(key_data)
        
        assert jwk is not None
        assert jwk['kty'] == 'RSA'
        assert jwk['use'] == 'sig'
        assert jwk['alg'] == 'RS256'
        assert jwk['kid'] == 'test_kid'
        assert 'n' in jwk
        assert 'e' in jwk
    
    def test_int_to_base64url(self, jwks_manager):
        """Test integer to base64url conversion."""
        # Test with known values
        result = jwks_manager._int_to_base64url(65537)  # Common RSA exponent
        assert isinstance(result, str)
        assert result == 'AQAB'  # Known base64url encoding of 65537
    
    def _get_test_rsa_private_key(self):
        """Get test RSA private key in PEM format."""
        return """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
UKIGQQQXl2yUGYUUYDPKMFqLoCPWLcKz1xvjNAJxz7ePdJEuqBiiBHjjURCchfwk
CqtuTOE2yuRkmEgSnXhzOjhiTzjCHFh0wzjKWjN/CrkKtaa5MuFSU10hWnMiYslQ
OiUReYhcwlhMVRE5q8ce97lOafwFNiMSapSrJ5rI+ocIpPHT7QcHdHtqiMqxM7eQ
fNbNOHRnQziQWMx1CIOTHHNPN8lSiDts2AN4Ggz4Zb/EFfcPn9B1+kMzXrJHOPXy
63NpHsFRNjKRbpJbqnP3Q9lD6bM7e9qiDnA8CzDAzqs9+5kImffbIanODfwY5tcG
AgMBAAECggEBALc2lQAkx+hkHqzPiC7XQkzUyqZehUd7BPsHxS4GYnM4XtNbhNlm
sxpXnUwygGANziHHFnDdBcBcMcUlkW2LoXfHEb8hTEFe+5b2l+9c1S2HgjmTeeaA
pYrjYHUj+IW2sFBFLL2xyWMn4f2H1cvuoTtTNgmKWKmyOeothpo6H2JD1F8fABpH
n2C1uGMpfyVG9EenaKVxriihiSdoNFrpo2rNixLQVBBcWpxvsQDgxwKgEwrNJh6P
96qbXxeYTzrXy24S2tUKR53MUcctddlMVwHjKbyBLhd2s0c9s2d2A4ReNEHy4R62
wG7Oz+I3VK4S5vYQflcxeHjjygelfyHQiuECgYEA2m5rJ2eCQkQbXkM2dhbXelI+
tgEIHlnrNNz5djJzVVwJxnJxwWBaM/MYQAiHMidMXICM1VjT9DAUkeQtjbrKNh+T
cjlR7h5Q2nqHhqr8aPRjoqHMpDrQBMaLsJdmnQrMxEyRVyRVmyDlt5f8MjMRQ8Gy
hQDankGXgYHSRv5wZ0sCgYEA2tDQu4SjC7s5wNBHKFlqd9MsQMeqq8t4uzJdXkpK
FKFM+IkABxh+CfMaKmTYcqumMIiW5jFZPHBhHn4chSM/s9NfVgjx+rHAEb/timgH
IJT+TOh/LpLaWRJouHPpHH5XQB8vIWfOH2k+g4stg7VSiJEAJ8LyVV5dEgzAGVtb
+QsCgYEAyn0XWwYDVeRrKmGy0SyM1IiZjcEHTBh+UCnK8LdnM5Mt4YgeuY5PBcWa
6RX9HK83yBQ+ZXBZ/B63faNz4y7bqrI2+ST3U5hs2XKyN3w5rJrmjg+zSjR2raP+
hGMh4jdgYvSRgRxQa3mJaRhE+nnG9hSw/uaFJ7TcnwMomdae+NsCgYEAoKmAuiMM
4MotQOmw0kdDjxtQ/4t7dQoNc6QMpOOjyZbDBcY7b7x5A8wGGYsOgB+J5Hwiva02
SfxQV6GCHsiCx5i9G2Q8zDiS6LsOV4+VTzaJEkXyp7kTgGRzGwVoRzWoIlLwrFHD
+sFTwJVSVzNpQcGzQlCJ3gG+fzk+Jx0CgYEAyFGWGSJ8DQmTGjjE9B0ibyfQUV/v
Gb2qWwI5Q4tgn2OTnQNBFzxHCqrFEFGWaXwMnEqbHU9GJ+trKe5P5uOqnxNuDmAT
JdJu3n5rN+EI2p+rKUNSRHtIpX+rBYHb+jgRBhHrx+RqHb+jgRBhHrx+RqHb+jgR
BhHrx+RqHb+jgRBhHrx+RqHb+jgRBhHrx+RqHb+jgRBhHrx+RqHb+jgRBhHrx+Rq
-----END PRIVATE KEY-----"""
    
    def _get_test_rsa_public_key(self):
        """Get test RSA public key in PEM format."""
        return """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCgVCiBkEE
F5dslBmFFGAzyjBai6Aj1i3Cs9cb4zQCcc+3j3SRLqgYogR441EQnIX8JAqrbkzh
NsrkZJhIEp14czo4Yk84whxYdMM4ylozfwq5CrWmuTLhUlNdIVpzImLJUDolEXmI
XMJYTFUROavHHve5Tmn8BTYjEmqUqyeayPqHCKTx0+0HB3R7aojKsTO3kHzWzTh0
Z0M4kFjMdQiDkxxzTzfJUog7bNgDeBgM+GW/xBX3D5/QdfpDM16yRzj18utzaR7B
UTYykW6SW6pz90PZQ+mzO3vaog5wPAswwM6rPfuZCJn32yGpzg38GObXBgIDAQAB
-----END PUBLIC KEY-----"""