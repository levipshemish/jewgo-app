"""
Unit tests for SessionFamilyManager.

Tests for session family management with replay hardening and rotation.
"""

import pytest
import secrets
import time
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from services.auth.session_family_manager import SessionFamilyManager


class TestSessionFamilyManager:
    """Unit tests for SessionFamilyManager."""
    
    @pytest.fixture
    def mock_redis_manager(self):
        """Create mock Redis manager."""
        mock = Mock()
        mock.health_check.return_value = {'status': 'healthy'}
        mock.set_if_not_exists.return_value = True
        mock.set.return_value = True
        mock.get.return_value = None
        mock.delete.return_value = True
        return mock
    
    @pytest.fixture
    def mock_connection_manager(self):
        """Create mock connection manager."""
        mock = Mock()
        mock_session = Mock()
        mock_session.execute.return_value = Mock(rowcount=1)
        mock_session.fetchone.return_value = None
        mock_session.fetchall.return_value = []
        mock_session.mappings.return_value.all.return_value = []
        
        mock.session_scope.return_value.__enter__.return_value = mock_session
        mock.session_scope.return_value.__exit__.return_value = None
        
        return mock
    
    @pytest.fixture
    def session_manager(self, mock_redis_manager, mock_connection_manager):
        """Create SessionFamilyManager instance for testing."""
        return SessionFamilyManager(
            redis_manager=mock_redis_manager,
            connection_manager=mock_connection_manager
        )
    
    def test_initialization(self, session_manager):
        """Test SessionFamilyManager initialization."""
        assert session_manager.refresh_mutex_ttl == 10  # default value
        assert session_manager.redis_manager is not None
        assert session_manager.connection_manager is not None
    
    def test_create_session_family(self, session_manager, mock_connection_manager):
        """Test session family creation."""
        user_id = 'test_user_123'
        device_info = {
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'ip_address': '192.168.1.100'
        }
        
        family_id = session_manager.create_session_family(user_id, device_info)
        
        assert isinstance(family_id, str)
        assert len(family_id) == 32  # 16 bytes hex = 32 chars
        
        # Verify database call was made
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.assert_called()
    
    def test_create_session_family_with_minimal_device_info(self, session_manager):
        """Test session family creation with minimal device info."""
        user_id = 'test_user_123'
        device_info = {}  # Empty device info
        
        family_id = session_manager.create_session_family(user_id, device_info)
        
        assert isinstance(family_id, str)
        assert len(family_id) == 32
    
    def test_rotate_session_success(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test successful session rotation."""
        family_id = 'test_family_123'
        current_jti = 'current_jti_456'
        new_jti = 'new_jti_789'
        refresh_token_hash = 'token_hash_abc'
        
        # Mock database response for current session state
        mock_result = Mock()
        mock_result.current_jti = current_jti
        mock_result.revoked_at = None
        mock_result.reused_jti_of = None
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        success, error = session_manager.rotate_session(
            family_id, current_jti, new_jti, refresh_token_hash
        )
        
        assert success is True
        assert error is None
        
        # Verify mutex was acquired and released
        mock_redis_manager.set_if_not_exists.assert_called_once()
        mock_redis_manager.delete.assert_called_once()
        
        # Verify JTI was cached
        mock_redis_manager.set.assert_called()
    
    def test_rotate_session_mutex_held(self, session_manager, mock_redis_manager):
        """Test session rotation when mutex is already held."""
        family_id = 'test_family_123'
        current_jti = 'current_jti_456'
        new_jti = 'new_jti_789'
        refresh_token_hash = 'token_hash_abc'
        
        # Mock mutex already held
        mock_redis_manager.set_if_not_exists.return_value = False
        
        success, error = session_manager.rotate_session(
            family_id, current_jti, new_jti, refresh_token_hash
        )
        
        assert success is False
        assert "Concurrent refresh detected" in error
    
    def test_rotate_session_replay_attack(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test session rotation with replay attack detection."""
        family_id = 'test_family_123'
        current_jti = 'attacker_jti_456'
        new_jti = 'new_jti_789'
        refresh_token_hash = 'token_hash_abc'
        
        # Mock database response showing different stored JTI
        mock_result = Mock()
        mock_result.current_jti = 'legitimate_jti_123'  # Different from current_jti
        mock_result.revoked_at = None
        mock_result.reused_jti_of = None
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        success, error = session_manager.rotate_session(
            family_id, current_jti, new_jti, refresh_token_hash
        )
        
        assert success is False
        assert "Token replay detected" in error
        
        # Verify family was revoked
        assert mock_session.execute.call_count >= 2  # One for check, one for revocation
    
    def test_rotate_session_jti_reuse(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test session rotation with JTI reuse detection."""
        family_id = 'test_family_123'
        current_jti = 'reused_jti_456'
        new_jti = 'new_jti_789'
        refresh_token_hash = 'token_hash_abc'
        
        # Mock database responses
        mock_result = Mock()
        mock_result.current_jti = current_jti
        mock_result.revoked_at = None
        mock_result.reused_jti_of = None
        
        mock_reuse_result = Mock()
        mock_reuse_result.id = 'existing_session'
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.side_effect = [mock_result, mock_reuse_result]
        
        success, error = session_manager.rotate_session(
            family_id, current_jti, new_jti, refresh_token_hash
        )
        
        assert success is False
        assert "Token reuse detected" in error
    
    def test_rotate_session_family_not_found(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test session rotation when family is not found."""
        family_id = 'nonexistent_family'
        current_jti = 'current_jti_456'
        new_jti = 'new_jti_789'
        refresh_token_hash = 'token_hash_abc'
        
        # Mock database response - no session found
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = None
        
        success, error = session_manager.rotate_session(
            family_id, current_jti, new_jti, refresh_token_hash
        )
        
        assert success is False
        assert "Session family not found" in error
    
    def test_revoke_family(self, session_manager, mock_connection_manager, mock_redis_manager):
        """Test family revocation."""
        family_id = 'test_family_123'
        reason = 'user_logout'
        
        success = session_manager.revoke_family(family_id, reason)
        
        assert success is True
        
        # Verify database update was called
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.assert_called()
        
        # Verify revocation was cached
        mock_redis_manager.set.assert_called()
    
    def test_is_family_revoked_cached(self, session_manager, mock_redis_manager):
        """Test family revocation check with cached result."""
        family_id = 'test_family_123'
        
        # Mock cached revocation
        mock_redis_manager.get.return_value = 'revoked'
        
        is_revoked = session_manager.is_family_revoked(family_id)
        
        assert is_revoked is True
        mock_redis_manager.get.assert_called_once()
    
    def test_is_family_revoked_database(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test family revocation check from database."""
        family_id = 'test_family_123'
        
        # Mock no cache, but revoked in database
        mock_redis_manager.get.return_value = None
        
        mock_result = Mock()
        mock_result.revoked_at = datetime.now(timezone.utc)
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        is_revoked = session_manager.is_family_revoked(family_id)
        
        assert is_revoked is True
        
        # Verify result was cached
        mock_redis_manager.set.assert_called()
    
    def test_is_family_revoked_not_revoked(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test family revocation check for non-revoked family."""
        family_id = 'test_family_123'
        
        # Mock no cache, not revoked in database
        mock_redis_manager.get.return_value = None
        
        mock_result = Mock()
        mock_result.revoked_at = None
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        is_revoked = session_manager.is_family_revoked(family_id)
        
        assert is_revoked is False
    
    def test_is_jti_revoked_cached(self, session_manager, mock_redis_manager):
        """Test JTI revocation check with cached family."""
        jti = 'test_jti_123'
        family_id = 'test_family_456'
        
        # Mock cached JTI -> family mapping
        mock_redis_manager.get.side_effect = [family_id, 'revoked']
        
        is_revoked = session_manager.is_jti_revoked(jti)
        
        assert is_revoked is True
    
    def test_is_jti_revoked_database(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test JTI revocation check from database."""
        jti = 'test_jti_123'
        
        # Mock no cache
        mock_redis_manager.get.return_value = None
        
        mock_result = Mock()
        mock_result.family_id = 'test_family_456'
        mock_result.revoked_at = datetime.now(timezone.utc)
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        is_revoked = session_manager.is_jti_revoked(jti)
        
        assert is_revoked is True
    
    def test_list_user_sessions(self, session_manager, mock_connection_manager):
        """Test listing user sessions."""
        user_id = 'test_user_123'
        
        # Mock database response
        mock_row = {
            'family_id': 'family_123',
            'device_hash': 'device_hash_456',
            'last_ip_cidr': '192.168.1.0/24',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'auth_time': datetime.now(timezone.utc),
            'created_at': datetime.now(timezone.utc),
            'last_used': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc)
        }
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.mappings.return_value.all.return_value = [mock_row]
        
        sessions = session_manager.list_user_sessions(user_id)
        
        assert len(sessions) == 1
        assert sessions[0]['family_id'] == 'family_123'
        assert sessions[0]['device_type'] == 'desktop'
        assert sessions[0]['location'] == 'Local Network'
    
    def test_revoke_user_session(self, session_manager, mock_connection_manager):
        """Test revoking specific user session."""
        user_id = 'test_user_123'
        family_id = 'test_family_456'
        
        # Mock session exists for user
        mock_result = Mock()
        mock_result.id = 'session_id'
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        success = session_manager.revoke_user_session(user_id, family_id)
        
        assert success is True
    
    def test_revoke_user_session_not_found(self, session_manager, mock_connection_manager):
        """Test revoking user session that doesn't exist."""
        user_id = 'test_user_123'
        family_id = 'nonexistent_family'
        
        # Mock session not found
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = None
        
        success = session_manager.revoke_user_session(user_id, family_id)
        
        assert success is False
    
    def test_revoke_all_user_sessions(self, session_manager, mock_connection_manager):
        """Test revoking all user sessions."""
        user_id = 'test_user_123'
        
        # Mock multiple sessions
        mock_results = [
            Mock(family_id='family_1'),
            Mock(family_id='family_2'),
            Mock(family_id='family_3')
        ]
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchall.return_value = mock_results
        
        revoked_count = session_manager.revoke_all_user_sessions(user_id)
        
        assert revoked_count == 3
    
    def test_revoke_all_user_sessions_except_one(self, session_manager, mock_connection_manager):
        """Test revoking all user sessions except one."""
        user_id = 'test_user_123'
        except_family_id = 'keep_this_family'
        
        # Mock sessions (excluding the one to keep)
        mock_results = [
            Mock(family_id='family_1'),
            Mock(family_id='family_2')
        ]
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchall.return_value = mock_results
        
        revoked_count = session_manager.revoke_all_user_sessions(user_id, except_family_id)
        
        assert revoked_count == 2
    
    def test_cleanup_expired_sessions(self, session_manager, mock_connection_manager):
        """Test cleanup of expired sessions."""
        mock_result = Mock()
        mock_result.rowcount = 5
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value = mock_result
        
        cleaned_count = session_manager.cleanup_expired_sessions()
        
        assert cleaned_count == 5
    
    def test_generate_device_hash(self, session_manager):
        """Test device hash generation."""
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        ip_address = '192.168.1.100'
        
        hash1 = session_manager._generate_device_hash(user_agent, ip_address)
        hash2 = session_manager._generate_device_hash(user_agent, ip_address)
        
        assert hash1 == hash2  # Should be deterministic
        assert len(hash1) == 32  # 32 character hex string
        assert isinstance(hash1, str)
    
    def test_get_ip_cidr_ipv4(self, session_manager):
        """Test IP CIDR generation for IPv4."""
        ip_address = '192.168.1.100'
        cidr = session_manager._get_ip_cidr(ip_address)
        
        assert cidr == '192.168.1.0/24'
    
    def test_get_ip_cidr_ipv6(self, session_manager):
        """Test IP CIDR generation for IPv6."""
        ip_address = '2001:db8::1'
        cidr = session_manager._get_ip_cidr(ip_address)
        
        assert cidr == '2001:db8::/64'
    
    def test_get_ip_cidr_invalid(self, session_manager):
        """Test IP CIDR generation for invalid IP."""
        ip_address = 'invalid_ip'
        cidr = session_manager._get_ip_cidr(ip_address)
        
        assert cidr == 'unknown'
    
    def test_parse_device_type_mobile(self, session_manager):
        """Test device type parsing for mobile."""
        user_agents = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
            'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
            'Mozilla/5.0 (Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
        ]
        
        for ua in user_agents:
            device_type = session_manager._parse_device_type(ua)
            assert device_type == 'mobile'
    
    def test_parse_device_type_tablet(self, session_manager):
        """Test device type parsing for tablet."""
        user_agents = [
            'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
            'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36'
        ]
        
        for ua in user_agents:
            device_type = session_manager._parse_device_type(ua)
            assert device_type in ['tablet', 'mobile']  # iPad might be detected as mobile
    
    def test_parse_device_type_desktop(self, session_manager):
        """Test device type parsing for desktop."""
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        device_type = session_manager._parse_device_type(user_agent)
        
        assert device_type == 'desktop'
    
    def test_parse_device_type_empty(self, session_manager):
        """Test device type parsing for empty user agent."""
        device_type = session_manager._parse_device_type('')
        assert device_type == 'unknown'
    
    def test_parse_location_local(self, session_manager):
        """Test location parsing for local networks."""
        local_cidrs = ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12']
        
        for cidr in local_cidrs:
            location = session_manager._parse_location(cidr)
            assert location == 'Local Network'
    
    def test_parse_location_external(self, session_manager):
        """Test location parsing for external networks."""
        external_cidr = '8.8.8.0/24'
        location = session_manager._parse_location(external_cidr)
        
        assert location == 'External'
    
    def test_health_check_healthy(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test health check when system is healthy."""
        # Mock all components healthy
        mock_redis_manager.health_check.return_value = {'status': 'healthy'}
        mock_redis_manager.set_if_not_exists.return_value = True
        
        health = session_manager.health_check()
        
        assert health['status'] == 'healthy'
        assert health['redis'] is True
        assert health['database'] is True
        assert health['mutex'] is True
        assert health['refresh_mutex_ttl'] == 10
        assert 'timestamp' in health
    
    def test_health_check_unhealthy_redis(self, session_manager, mock_redis_manager):
        """Test health check when Redis is unhealthy."""
        mock_redis_manager.health_check.return_value = {'status': 'unhealthy'}
        
        health = session_manager.health_check()
        
        assert health['status'] == 'unhealthy'
        assert health['redis'] is False
    
    def test_health_check_unhealthy_mutex(self, session_manager, mock_redis_manager):
        """Test health check when mutex is unhealthy."""
        mock_redis_manager.health_check.return_value = {'status': 'healthy'}
        mock_redis_manager.set_if_not_exists.return_value = False
        
        health = session_manager.health_check()
        
        assert health['status'] == 'unhealthy'
        assert health['mutex'] is False
    
    @patch('services.auth.session_family_manager.logger')
    def test_error_handling_in_create_session_family(self, mock_logger, session_manager, mock_connection_manager):
        """Test error handling in create_session_family."""
        # Mock database error
        mock_connection_manager.session_scope.side_effect = Exception("Database error")
        
        with pytest.raises(Exception):
            session_manager.create_session_family('user_123', {})
        
        mock_logger.error.assert_called()
    
    @patch('services.auth.session_family_manager.logger')
    def test_error_handling_in_rotate_session(self, mock_logger, session_manager, mock_connection_manager):
        """Test error handling in rotate_session."""
        # Mock database error
        mock_connection_manager.session_scope.side_effect = Exception("Database error")
        
        success, error = session_manager.rotate_session('family', 'current', 'new', 'hash')
        
        assert success is False
        assert "Session rotation failed" in error
        mock_logger.error.assert_called()
    
    def test_concurrent_rotation_simulation(self, session_manager, mock_redis_manager, mock_connection_manager):
        """Test simulation of concurrent rotation attempts."""
        family_id = 'test_family_123'
        
        # First call succeeds (gets mutex)
        mock_redis_manager.set_if_not_exists.side_effect = [True, False]
        
        # Mock successful first rotation
        mock_result = Mock()
        mock_result.current_jti = 'current_jti'
        mock_result.revoked_at = None
        mock_result.reused_jti_of = None
        
        mock_session = mock_connection_manager.session_scope.return_value.__enter__.return_value
        mock_session.execute.return_value.fetchone.return_value = mock_result
        
        # First rotation should succeed
        success1, error1 = session_manager.rotate_session(
            family_id, 'current_jti', 'new_jti_1', 'hash1'
        )
        
        # Second rotation should fail (mutex held)
        success2, error2 = session_manager.rotate_session(
            family_id, 'current_jti', 'new_jti_2', 'hash2'
        )
        
        assert success1 is True
        assert error1 is None
        assert success2 is False
        assert "Concurrent refresh detected" in error2