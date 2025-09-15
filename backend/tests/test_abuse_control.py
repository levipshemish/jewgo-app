#!/usr/bin/env python3
"""
Tests for abuse control service.
"""

import pytest
import time
import os
from unittest.mock import patch, MagicMock, Mock
import requests

from services.abuse_control_service import AbuseControlService, AbuseControlResult


class TestAbuseControlService:
    """Test cases for abuse control service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock Redis for testing
        with patch('services.abuse_control_service.redis.Redis') as mock_redis:
            self.mock_redis = MagicMock()
            mock_redis.return_value = self.mock_redis
            self.mock_redis.ping.return_value = True
            self.service = AbuseControlService()
    
    def test_init_with_redis_connection(self):
        """Test service initialization with Redis connection."""
        assert self.service.connected is True
        assert self.service.max_attempts == 5  # default
        assert self.service.window_minutes == 15  # default
        assert self.service.captcha_threshold == 3  # default
    
    @patch('services.abuse_control_service.redis.Redis')
    def test_init_without_redis(self, mock_redis):
        """Test service initialization without Redis."""
        mock_redis.side_effect = Exception("Redis not available")
        
        service = AbuseControlService()
        
        assert service.connected is False
        assert service.redis is None
    
    def test_check_login_abuse_no_previous_attempts(self):
        """Test abuse check with no previous attempts."""
        # Mock Redis response for no previous attempts
        self.mock_redis.get.return_value = None
        
        result = self.service.check_login_abuse("testuser")
        
        assert isinstance(result, AbuseControlResult)
        assert result.allowed is True
        assert result.requires_captcha is False
        assert result.backoff_seconds == 0
        assert result.attempts_remaining == 5
        assert result.message == "Login attempt allowed"
    
    def test_check_login_abuse_with_attempts_under_limit(self):
        """Test abuse check with attempts under the limit."""
        # Mock Redis response for 2 previous attempts
        self.mock_redis.get.return_value = "2"
        
        result = self.service.check_login_abuse("testuser")
        
        assert isinstance(result, AbuseControlResult)
        assert result.allowed is True
        assert result.requires_captcha is False
        assert result.backoff_seconds == 0
        assert result.attempts_remaining == 2  # 5 - 2 - 1
        assert result.message == "Login attempt allowed"
    
    def test_check_login_abuse_requires_captcha(self):
        """Test abuse check when CAPTCHA is required."""
        # Mock Redis responses
        self.mock_redis.get.side_effect = lambda key: "3" if "user:" in key else "true" if "captcha:" in key else None
        
        result = self.service.check_login_abuse("testuser")
        
        assert isinstance(result, AbuseControlResult)
        assert result.allowed is False
        assert result.requires_captcha is True
        assert result.backoff_seconds == 0
        assert result.attempts_remaining == 2  # 5 - 3
        assert result.message == "CAPTCHA verification required"
        assert result.captcha_site_key is not None
    
    def test_check_login_abuse_max_attempts_exceeded(self):
        """Test abuse check when max attempts exceeded."""
        # Mock Redis response for max attempts
        self.mock_redis.get.return_value = "5"
        
        result = self.service.check_login_abuse("testuser")
        
        assert isinstance(result, AbuseControlResult)
        assert result.allowed is False
        assert result.requires_captcha is False
        assert result.backoff_seconds > 0  # Should have backoff
        assert result.attempts_remaining == 0
        assert "Maximum attempts exceeded" in result.message
    
    def test_check_login_abuse_in_backoff_period(self):
        """Test abuse check when user is in backoff period."""
        # Mock Redis responses
        self.mock_redis.get.side_effect = lambda key: (
            "3" if "user:" in key else
            str(time.time() - 60) if "last_attempt" in key else  # 1 minute ago
            None
        )
        
        result = self.service.check_login_abuse("testuser")
        
        assert isinstance(result, AbuseControlResult)
        assert result.allowed is False
        assert result.requires_captcha is False
        assert result.backoff_seconds > 0
        assert result.attempts_remaining == 0
        assert "Try again in" in result.message
    
    def test_record_failed_login(self):
        """Test recording a failed login attempt."""
        # Mock Redis operations
        self.mock_redis.incr.return_value = 3
        self.mock_redis.set.return_value = True
        self.mock_redis.expire.return_value = True
        
        self.service.record_failed_login("testuser", "192.168.1.1")
        
        # Verify Redis operations were called
        assert self.mock_redis.incr.called
        assert self.mock_redis.expire.called
        assert self.mock_redis.set.called
    
    def test_record_failed_login_triggers_captcha(self):
        """Test that failed login triggers CAPTCHA requirement at threshold."""
        # Mock Redis operations - return attempt count at threshold
        self.mock_redis.incr.return_value = 3  # At CAPTCHA threshold
        self.mock_redis.set.return_value = True
        self.mock_redis.expire.return_value = True
        
        self.service.record_failed_login("testuser")
        
        # Verify CAPTCHA requirement was set
        captcha_calls = [call for call in self.mock_redis.set.call_args_list 
                        if 'captcha:' in str(call)]
        assert len(captcha_calls) > 0
    
    def test_record_successful_login(self):
        """Test recording a successful login."""
        self.service.record_successful_login("testuser", "192.168.1.1")
        
        # Verify Redis delete operations were called
        assert self.mock_redis.delete.called
        # Should delete user key, last attempt key, and captcha key
        assert self.mock_redis.delete.call_count >= 2
    
    @patch('services.abuse_control_service.requests.post')
    def test_verify_turnstile_success(self, mock_post):
        """Test successful Turnstile verification."""
        # Mock successful Turnstile response
        mock_response = Mock()
        mock_response.json.return_value = {'success': True}
        mock_post.return_value = mock_response
        
        # Set Turnstile secret
        with patch.dict(os.environ, {'TURNSTILE_SECRET_KEY': 'test-secret'}):
            service = AbuseControlService()
            result = service.verify_captcha("test-token", "192.168.1.1")
        
        assert result is True
        mock_post.assert_called_once()
    
    @patch('services.abuse_control_service.requests.post')
    def test_verify_turnstile_failure(self, mock_post):
        """Test failed Turnstile verification."""
        # Mock failed Turnstile response
        mock_response = Mock()
        mock_response.json.return_value = {
            'success': False,
            'error-codes': ['invalid-input-response']
        }
        mock_post.return_value = mock_response
        
        # Set Turnstile secret
        with patch.dict(os.environ, {'TURNSTILE_SECRET_KEY': 'test-secret'}):
            service = AbuseControlService()
            result = service.verify_captcha("invalid-token", "192.168.1.1")
        
        assert result is False
        mock_post.assert_called_once()
    
    @patch('services.abuse_control_service.requests.post')
    def test_verify_recaptcha_success(self, mock_post):
        """Test successful reCAPTCHA verification."""
        # Mock successful reCAPTCHA response
        mock_response = Mock()
        mock_response.json.return_value = {'success': True}
        mock_post.return_value = mock_response
        
        # Set reCAPTCHA secret (no Turnstile secret)
        with patch.dict(os.environ, {'RECAPTCHA_SECRET_KEY': 'test-secret'}, clear=True):
            service = AbuseControlService()
            result = service.verify_captcha("test-token", "192.168.1.1")
        
        assert result is True
        mock_post.assert_called_once()
    
    def test_verify_captcha_disabled(self):
        """Test CAPTCHA verification when disabled."""
        with patch.dict(os.environ, {'CAPTCHA_ENABLED': 'false'}, clear=True):
            service = AbuseControlService()
            result = service.verify_captcha("any-token")
        
        assert result is True  # Should always pass when disabled
    
    def test_verify_captcha_no_response(self):
        """Test CAPTCHA verification with no response."""
        result = self.service.verify_captcha("")
        
        assert result is False
    
    def test_clear_captcha_requirement(self):
        """Test clearing CAPTCHA requirement."""
        self.service.clear_captcha_requirement("testuser")
        
        # Verify Redis delete was called
        self.mock_redis.delete.assert_called_once()
    
    def test_calculate_backoff(self):
        """Test exponential backoff calculation."""
        # Test various attempt counts
        assert self.service._calculate_backoff(0) == 0
        assert self.service._calculate_backoff(1) == 0
        assert self.service._calculate_backoff(2) == 300  # 5 minutes
        assert self.service._calculate_backoff(3) == 600  # 10 minutes
        assert self.service._calculate_backoff(4) == 1200  # 20 minutes
        assert self.service._calculate_backoff(10) == 3600  # Capped at 60 minutes
    
    def test_get_abuse_stats(self):
        """Test getting abuse control statistics."""
        # Mock Redis keys operation
        self.mock_redis.keys.side_effect = [
            ['abuse:user:hash1', 'abuse:user:hash2'],  # abuse keys
            ['abuse:captcha:hash1']  # captcha keys
        ]
        
        stats = self.service.get_abuse_stats()
        
        assert stats['redis_connected'] is True
        assert stats['active_abuse_tracking'] == 2
        assert stats['captcha_required_users'] == 1
        assert stats['max_attempts'] == 5
        assert stats['window_minutes'] == 15
    
    def test_get_abuse_stats_no_redis(self):
        """Test getting stats when Redis is not connected."""
        service = AbuseControlService()
        service.connected = False
        service.redis = None
        
        stats = service.get_abuse_stats()
        
        assert stats['redis_connected'] is False
        assert 'captcha_enabled' in stats
        assert 'captcha_provider' in stats
    
    def test_get_user_key_hashing(self):
        """Test that usernames are properly hashed."""
        key1 = self.service._get_user_key("testuser")
        key2 = self.service._get_user_key("TestUser")
        key3 = self.service._get_user_key("different")
        
        # Same username (case insensitive) should produce same key
        assert key1 == key2
        # Different usernames should produce different keys
        assert key1 != key3
        # Keys should not contain the actual username
        assert "testuser" not in key1.lower()
        assert "TestUser" not in key2.lower()
    
    def test_error_handling_in_check_login_abuse(self):
        """Test error handling in check_login_abuse."""
        # Mock Redis to raise exception
        self.mock_redis.get.side_effect = Exception("Redis error")
        
        result = self.service.check_login_abuse("testuser")
        
        # Should allow request on error
        assert result.allowed is True
        assert "error" in result.message.lower()
    
    def test_error_handling_in_record_failed_login(self):
        """Test error handling in record_failed_login."""
        # Mock Redis to raise exception
        self.mock_redis.incr.side_effect = Exception("Redis error")
        
        # Should not raise exception
        self.service.record_failed_login("testuser")
    
    @patch('services.abuse_control_service.requests.post')
    def test_verify_captcha_network_error(self, mock_post):
        """Test CAPTCHA verification with network error."""
        mock_post.side_effect = requests.RequestException("Network error")
        
        with patch.dict(os.environ, {'TURNSTILE_SECRET_KEY': 'test-secret'}):
            service = AbuseControlService()
            result = service.verify_captcha("test-token")
        
        assert result is False


@pytest.mark.integration
class TestAbuseControlIntegration:
    """Integration tests for abuse control service."""
    
    def test_abuse_control_workflow(self):
        """Test complete abuse control workflow."""
        with patch('services.abuse_control_service.redis.Redis') as mock_redis:
            mock_redis_instance = MagicMock()
            mock_redis.return_value = mock_redis_instance
            mock_redis_instance.ping.return_value = True
            
            service = AbuseControlService()
            
            # Test initial login attempt (should be allowed)
            mock_redis_instance.get.return_value = None
            result = service.check_login_abuse("testuser")
            assert result.allowed is True
            
            # Record failed login
            mock_redis_instance.incr.return_value = 1
            mock_redis_instance.set.return_value = True
            mock_redis_instance.expire.return_value = True
            service.record_failed_login("testuser")
            
            # Test second attempt (should still be allowed)
            mock_redis_instance.get.return_value = "1"
            result = service.check_login_abuse("testuser")
            assert result.allowed is True
            
            # Record more failures to trigger CAPTCHA
            mock_redis_instance.incr.return_value = 3
            service.record_failed_login("testuser")
            
            # Test with CAPTCHA required
            mock_redis_instance.get.side_effect = lambda key: (
                "3" if "user:" in key else
                "true" if "captcha:" in key else
                None
            )
            result = service.check_login_abuse("testuser")
            assert result.allowed is False
            assert result.requires_captcha is True
            
            # Record successful login
            service.record_successful_login("testuser")
            
            # Verify abuse tracking is cleared
            assert mock_redis_instance.delete.called
