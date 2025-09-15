#!/usr/bin/env python3
"""Tests for Redis resilience features in cache manager v4."""

import pytest
import time
from unittest.mock import Mock, patch
from redis.exceptions import ConnectionError, TimeoutError, RedisError

from utils.cache_manager_v4 import CacheManagerV4, CircuitBreaker


class TestCircuitBreaker:
    """Test circuit breaker functionality."""
    
    def test_circuit_breaker_initial_state(self):
        """Test circuit breaker starts in CLOSED state."""
        cb = CircuitBreaker()
        assert cb.state == "CLOSED"
        assert cb.failure_count == 0
        assert not cb.is_open()
    
    def test_circuit_breaker_opens_after_threshold(self):
        """Test circuit breaker opens after reaching failure threshold."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        
        # Simulate failures
        for i in range(3):
            try:
                cb.call(lambda: 1/0)
            except ZeroDivisionError:
                pass
        
        assert cb.state == "OPEN"
        assert cb.is_open()
    
    def test_circuit_breaker_transitions_to_half_open(self):
        """Test circuit breaker transitions to HALF_OPEN after recovery timeout."""
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
        
        # Cause failure to open circuit
        try:
            cb.call(lambda: 1/0)
        except ZeroDivisionError:
            pass
        
        assert cb.state == "OPEN"
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Next call should transition to HALF_OPEN
        cb.call(lambda: "success")
        assert cb.state == "CLOSED"
    
    def test_circuit_breaker_resets_after_success(self):
        """Test circuit breaker resets after successful call in HALF_OPEN state."""
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
        
        # Cause failure to open circuit
        try:
            cb.call(lambda: 1/0)
        except ZeroDivisionError:
            pass
        
        assert cb.state == "OPEN"
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Successful call should reset circuit breaker
        result = cb.call(lambda: "success")
        assert result == "success"
        assert cb.state == "CLOSED"
        assert cb.failure_count == 0


class TestCacheManagerV4Resilience:
    """Test cache manager resilience features."""
    
    @pytest.fixture
    def cache_manager(self):
        """Create a cache manager instance for testing."""
        return CacheManagerV4(enable_cache=True, max_retries=2, retry_delay=0.01)
    
    def test_transient_error_detection(self, cache_manager):
        """Test that transient errors are correctly identified."""
        # Connection error should be transient
        conn_error = ConnectionError("Connection failed")
        assert cache_manager._is_transient_error(conn_error)
        
        # Timeout error should be transient
        timeout_error = TimeoutError("Operation timed out")
        assert cache_manager._is_transient_error(timeout_error)
        
        # Redis error with "Connection reset by peer" should be transient
        redis_error = RedisError("(54, 'Connection reset by peer')")
        assert cache_manager._is_transient_error(redis_error)
        
        # Other errors should not be transient
        other_error = ValueError("Some other error")
        assert not cache_manager._is_transient_error(other_error)
    
    @patch('utils.cache_manager_v4.time.sleep')
    def test_retry_operation_with_transient_errors(self, mock_sleep, cache_manager):
        """Test retry operation with transient errors."""
        # Mock Redis client
        mock_redis = Mock()
        cache_manager.redis_client = mock_redis
        
        # Simulate transient error on first attempt, success on second
        mock_redis.get.side_effect = [
            ConnectionError("Connection reset by peer"),
            "test_value"
        ]
        
        def redis_get():
            return mock_redis.get("test_key")
        
        result = cache_manager._retry_operation("get", redis_get)
        
        assert result == "test_value"
        assert mock_redis.get.call_count == 2
        assert mock_sleep.call_count == 1  # Should sleep once between retries
    
    @patch('utils.cache_manager_v4.time.sleep')
    def test_retry_operation_max_attempts_exceeded(self, mock_sleep, cache_manager):
        """Test retry operation stops after max attempts."""
        # Mock Redis client
        mock_redis = Mock()
        cache_manager.redis_client = mock_redis
        
        # Simulate persistent transient errors
        mock_redis.get.side_effect = ConnectionError("Connection reset by peer")
        
        def redis_get():
            return mock_redis.get("test_key")
        
        # Should raise exception after max retries
        with pytest.raises(ConnectionError):
            cache_manager._retry_operation("get", redis_get)
        
        # Should have attempted max_retries + 1 times
        assert mock_redis.get.call_count == cache_manager.max_retries + 1
        assert mock_sleep.call_count == cache_manager.max_retries
    
    def test_get_with_circuit_breaker_open(self, cache_manager):
        """Test that get operation is skipped when circuit breaker is open."""
        # Mock Redis client
        mock_redis = Mock()
        cache_manager.redis_client = mock_redis
        
        # Open circuit breaker
        cache_manager.circuit_breaker.state = "OPEN"
        
        # Should return default value without calling Redis
        result = cache_manager.get("test_key", default="default_value")
        assert result == "default_value"
        mock_redis.get.assert_not_called()
    
    def test_set_with_circuit_breaker_open(self, cache_manager):
        """Test that set operation is skipped when circuit breaker is open."""
        # Mock Redis client
        mock_redis = Mock()
        cache_manager.redis_client = mock_redis
        
        # Open circuit breaker
        cache_manager.circuit_breaker.state = "OPEN"
        
        # Should return False without calling Redis
        result = cache_manager.set("test_key", "test_value")
        assert result is False
        mock_redis.setex.assert_not_called()
    
    def test_error_handling_classification(self, cache_manager):
        """Test that errors are properly classified and logged."""
        # Mock logger at module level since it's imported at module level
        with patch('utils.cache_manager_v4.logger') as mock_logger:
            # Test connection reset error
            conn_reset_error = ConnectionError("Connection reset by peer")
            cache_manager._handle_cache_error("get", conn_reset_error)
            
            # Should log as warning for transient errors
            mock_logger.warning.assert_called_once()
            call_args = mock_logger.warning.call_args[0][0]
            assert "transient error" in call_args
            
            # Test non-transient error
            other_error = ValueError("Some other error")
            cache_manager._handle_cache_error("set", other_error)
            
            # Should log as error for non-transient errors
            mock_logger.error.assert_called_once()
            call_args = mock_logger.error.call_args[0][0]
            assert "error" in call_args
    
    def test_circuit_breaker_integration_with_errors(self, cache_manager):
        """Test that circuit breaker is updated when handling errors."""
        # Mock Redis client
        mock_redis = Mock()
        cache_manager.redis_client = mock_redis
        
        # Simulate transient errors to trigger circuit breaker
        mock_redis.get.side_effect = ConnectionError("Connection reset by peer")
        
        # Set low threshold for testing
        cache_manager.circuit_breaker.failure_threshold = 2
        
        # First error should increment failure count
        cache_manager.get("test_key")
        assert cache_manager.circuit_breaker.failure_count == 1
        assert cache_manager.circuit_breaker.state == "CLOSED"
        
        # Second error should open circuit breaker
        cache_manager.get("test_key")
        assert cache_manager.circuit_breaker.failure_count == 2
        assert cache_manager.circuit_breaker.state == "OPEN"
    
    def test_memory_cache_fallback(self, cache_manager):
        """Test that memory cache is used when Redis is unavailable."""
        # Disable Redis
        cache_manager.redis_client = None
        
        # Test set operation
        result = cache_manager.set("test_key", "test_value", ttl=60)
        assert result is True
        
        # Test get operation
        result = cache_manager.get("test_key")
        assert result == "test_value"
        
        # Test exists operation
        result = cache_manager.exists("test_key")
        assert result is True
        
        # Test delete operation
        result = cache_manager.delete("test_key")
        assert result is True
        
        # Verify key is gone
        result = cache_manager.exists("test_key")
        assert result is False


class TestRedisClientIntegration:
    """Test integration with enhanced Redis client."""
    
    @patch('utils.redis_client.get_redis_client')
    def test_cache_manager_uses_enhanced_redis_client(self, mock_get_redis):
        """Test that cache manager uses the enhanced Redis client factory."""
        mock_redis_client = Mock()
        mock_get_redis.return_value = mock_redis_client
        
        cache_manager = CacheManagerV4(redis_url="rediss://test:6379")
        
        # Should have called the enhanced Redis client factory
        mock_get_redis.assert_called_once()
        assert cache_manager.redis_client == mock_redis_client
    
    def test_cache_manager_without_redis_url(self):
        """Test cache manager initialization without Redis URL."""
        cache_manager = CacheManagerV4(redis_url=None)
        
        # Should fall back to memory cache
        assert cache_manager.redis_client is None
        assert hasattr(cache_manager, "_memory_cache")
        assert cache_manager._is_healthy is False


if __name__ == "__main__":
    pytest.main([__file__])
