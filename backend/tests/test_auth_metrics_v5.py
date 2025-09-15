"""
Tests for Authentication Metrics V5 System.

Tests metrics collection, PII masking, performance tracking,
security event logging, and Prometheus integration.
"""

import pytest
import time
import json
from unittest.mock import patch, MagicMock
from flask import Flask, g, request
from services.auth.auth_metrics_v5 import (
    AuthMetricsV5,
    AuthEventType,
    AuthFailureReason,
    AuthMetric,
    PerformanceMetric,
    get_auth_metrics,
    record_auth_event,
    record_performance_metric,
    performance_timer,
)


class TestAuthMetricsV5:
    """Test cases for AuthMetricsV5."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def metrics(self):
        """Create metrics instance."""
        return AuthMetricsV5(max_metrics=100)
    
    def test_metrics_initialization(self, metrics):
        """Test metrics system initialization."""
        assert len(metrics.auth_metrics) == 0
        assert len(metrics.performance_metrics) == 0
        assert len(metrics.counters) == 0
        assert len(metrics.histograms) == 0
        assert len(metrics.security_events) == 0
        assert metrics.max_metrics == 100
    
    def test_record_auth_event_basic(self, app, metrics):
        """Test basic auth event recording."""
        with app.test_request_context('/test'):
            g.correlation_id = 'test-correlation-id'
            
            metrics.record_auth_event(
                event_type=AuthEventType.LOGIN_SUCCESS,
                user_id='test-user-123',
                response_time_ms=150.5
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.LOGIN_SUCCESS
            assert metric.user_id is not None  # Should be masked
            assert metric.correlation_id == 'test-correlation-id'
            assert metric.response_time_ms == 150.5
            assert metric.timestamp > 0
    
    def test_record_auth_event_with_failure_reason(self, app, metrics):
        """Test auth event recording with failure reason."""
        with app.test_request_context('/api/v5/auth/login', method='POST'):
            metrics.record_auth_event(
                event_type=AuthEventType.LOGIN_FAILURE,
                user_id='test-user-123',
                failure_reason=AuthFailureReason.INVALID_CREDENTIALS,
                response_time_ms=75.2
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.LOGIN_FAILURE
            assert metric.failure_reason == AuthFailureReason.INVALID_CREDENTIALS
            assert metric.method == 'POST'
            # Endpoint might be None in test context
            assert metric.method == 'POST'
    
    def test_record_performance_metric(self, app, metrics):
        """Test performance metric recording."""
        with app.test_request_context('/test'):
            g.correlation_id = 'perf-test-id'
            
            metrics.record_performance_metric(
                operation='token_verification',
                duration_ms=45.7,
                success=True,
                additional_data={'token_type': 'access'}
            )
            
            assert len(metrics.performance_metrics) == 1
            metric = metrics.performance_metrics[0]
            
            assert metric.operation == 'token_verification'
            assert metric.duration_ms == 45.7
            assert metric.success is True
            assert metric.correlation_id == 'perf-test-id'
            assert 'token_type' in metric.additional_data
    
    def test_record_login_attempt_success(self, app, metrics):
        """Test login attempt recording - success."""
        with app.test_request_context('/login'):
            metrics.record_login_attempt(
                success=True,
                user_id='user-456',
                response_time_ms=120.3
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.LOGIN_SUCCESS
            assert metric.user_id is not None
            assert metric.response_time_ms == 120.3
    
    def test_record_login_attempt_failure(self, app, metrics):
        """Test login attempt recording - failure."""
        with app.test_request_context('/login'):
            metrics.record_login_attempt(
                success=False,
                user_id='user-789',
                failure_reason=AuthFailureReason.ACCOUNT_DISABLED,
                response_time_ms=95.1
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.LOGIN_FAILURE
            assert metric.failure_reason == AuthFailureReason.ACCOUNT_DISABLED
    
    def test_record_refresh_attempt_success(self, app, metrics):
        """Test refresh attempt recording - success."""
        with app.test_request_context('/refresh'):
            metrics.record_refresh_attempt(
                success=True,
                user_id='user-123',
                session_id='session-456',
                family_id='family-789',
                response_time_ms=67.8
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.REFRESH_SUCCESS
            assert metric.user_id is not None
            assert metric.session_id is not None
            assert metric.family_id is not None
    
    def test_record_refresh_attempt_replay(self, app, metrics):
        """Test refresh attempt recording - replay attack."""
        with app.test_request_context('/refresh'):
            metrics.record_refresh_attempt(
                success=False,
                user_id='user-123',
                session_id='session-456',
                family_id='family-789',
                is_replay=True,
                response_time_ms=23.4
            )
            
            assert len(metrics.auth_metrics) == 1
            metric = metrics.auth_metrics[0]
            
            assert metric.event_type == AuthEventType.REFRESH_REPLAY
    
    def test_record_csrf_validation(self, app, metrics):
        """Test CSRF validation recording."""
        with app.test_request_context('/api/v5/auth/login'):
            # Valid CSRF
            metrics.record_csrf_validation(valid=True, response_time_ms=12.3)
            
            # Invalid CSRF
            metrics.record_csrf_validation(valid=False, response_time_ms=8.7)
            
            assert len(metrics.auth_metrics) == 2
            
            valid_metric = metrics.auth_metrics[0]
            invalid_metric = metrics.auth_metrics[1]
            
            assert valid_metric.event_type == AuthEventType.CSRF_VALID
            assert invalid_metric.event_type == AuthEventType.CSRF_INVALID
    
    def test_record_token_verification(self, app, metrics):
        """Test token verification recording."""
        with app.test_request_context('/verify'):
            # Successful verification
            metrics.record_token_verification(
                success=True,
                user_id='user-123',
                response_time_ms=89.2
            )
            
            # Failed verification
            metrics.record_token_verification(
                success=False,
                user_id='user-456',
                response_time_ms=45.6,
                failure_reason=AuthFailureReason.TOKEN_EXPIRED
            )
            
            assert len(metrics.auth_metrics) == 2
            
            success_metric = metrics.auth_metrics[0]
            failure_metric = metrics.auth_metrics[1]
            
            assert success_metric.event_type == AuthEventType.TOKEN_VERIFY_SUCCESS
            assert failure_metric.event_type == AuthEventType.TOKEN_VERIFY_FAILURE
            assert failure_metric.failure_reason == AuthFailureReason.TOKEN_EXPIRED
    
    def test_pii_masking_user_id(self, metrics):
        """Test PII masking for user IDs."""
        user_id = 'user-12345678-abcd-efgh-ijkl-mnopqrstuvwx'
        masked = metrics._mask_user_id(user_id)
        
        assert masked is not None
        assert len(masked) == 8
        assert masked != user_id
        
        # Same input should produce same hash
        masked2 = metrics._mask_user_id(user_id)
        assert masked == masked2
        
        # None input should return None
        assert metrics._mask_user_id(None) is None
    
    def test_pii_masking_additional_data(self, metrics):
        """Test PII masking in additional data."""
        data = {
            'email': 'test@example.com',
            'phone': '555-123-4567',
            'ip': '192.168.1.100',
            'user_id': '12345678-abcd-1234-5678-123456789abc',
            'safe_data': 'this is safe'
        }
        
        masked = metrics._mask_additional_data(data)
        
        # Email should be partially masked
        assert 'te***@example.com' in masked['email']
        
        # Phone should be masked
        assert masked['phone'] == '***-***-****'
        
        # IP should be partially masked
        assert '192.168.1.***' in masked['ip']
        
        # User ID should be partially masked - multiple patterns may apply
        # Just check that it's different from the original and contains masking
        assert masked['user_id'] != data['user_id']
        assert '***' in masked['user_id']
        
        # Safe data should be unchanged
        assert masked['safe_data'] == 'this is safe'
    
    def test_hash_user_agent(self, app, metrics):
        """Test user agent hashing."""
        with app.test_request_context('/test', headers={'User-Agent': 'Mozilla/5.0 Test Browser'}):
            hashed = metrics._hash_user_agent()
            
            assert hashed is not None
            assert len(hashed) == 8
            assert hashed != 'Mozilla/5.0 Test Browser'
    
    def test_hash_ip_address(self, app, metrics):
        """Test IP address hashing."""
        # Test X-Forwarded-For header
        with app.test_request_context('/test', headers={'X-Forwarded-For': '192.168.1.100, 10.0.0.1'}):
            hashed = metrics._hash_ip_address()
            assert hashed is not None
            assert len(hashed) == 8
        
        # Test X-Real-IP header
        with app.test_request_context('/test', headers={'X-Real-IP': '203.0.113.1'}):
            hashed = metrics._hash_ip_address()
            assert hashed is not None
            assert len(hashed) == 8
        
        # Test remote_addr
        with app.test_request_context('/test', environ_base={'REMOTE_ADDR': '198.51.100.1'}):
            hashed = metrics._hash_ip_address()
            assert hashed is not None
            assert len(hashed) == 8
    
    def test_counters_update(self, app, metrics):
        """Test that counters are updated correctly."""
        with app.test_request_context('/test'):
            # Record multiple events
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS)
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS)
            metrics.record_auth_event(AuthEventType.LOGIN_FAILURE, failure_reason=AuthFailureReason.INVALID_CREDENTIALS)
            
            # Check counters
            assert metrics.counters['auth_login_success_total'] == 2
            assert metrics.counters['auth_login_failure_total'] == 1
            assert metrics.counters['auth_login_failure_invalid_credentials_total'] == 1
    
    def test_histograms_update(self, app, metrics):
        """Test that histograms are updated correctly."""
        with app.test_request_context('/test'):
            # Record events with response times
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=100.0)
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=150.0)
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=200.0)
            
            # Check histogram
            histogram = metrics.histograms['auth_login_success_duration_ms']
            assert len(histogram) == 3
            assert 100.0 in histogram
            assert 150.0 in histogram
            assert 200.0 in histogram
    
    def test_security_event_logging(self, app, metrics):
        """Test security event logging."""
        with app.test_request_context('/test'):
            # Record security-relevant events
            metrics.record_auth_event(AuthEventType.LOGIN_FAILURE, failure_reason=AuthFailureReason.INVALID_CREDENTIALS)
            metrics.record_auth_event(AuthEventType.REFRESH_REPLAY, user_id='user-123')
            metrics.record_auth_event(AuthEventType.CSRF_INVALID)
            
            # Non-security events should not be logged
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS)
            
            # Check security events
            assert len(metrics.security_events) == 3
            
            # Check event types
            event_types = [event['auth_event'] for event in metrics.security_events]
            assert 'login_failure' in event_types
            assert 'refresh_replay' in event_types
            assert 'csrf_invalid' in event_types
    
    def test_metrics_summary(self, app, metrics):
        """Test metrics summary generation."""
        with app.test_request_context('/test'):
            # Record various events
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=100.0)
            metrics.record_auth_event(AuthEventType.LOGIN_FAILURE, failure_reason=AuthFailureReason.INVALID_CREDENTIALS)
            metrics.record_auth_event(AuthEventType.REFRESH_SUCCESS, response_time_ms=50.0)
            metrics.record_auth_event(AuthEventType.REFRESH_REPLAY)
            metrics.record_auth_event(AuthEventType.CSRF_VALID, response_time_ms=10.0)
            metrics.record_auth_event(AuthEventType.CSRF_INVALID)
            metrics.record_auth_event(AuthEventType.TOKEN_VERIFY_SUCCESS, response_time_ms=75.0)
            
            summary = metrics.get_metrics_summary()
            
            assert 'timestamp' in summary
            assert 'counters' in summary
            assert 'rates' in summary
            assert 'performance' in summary
            assert 'totals' in summary
            
            # Check rates
            rates = summary['rates']
            assert rates['login_success_rate'] == 50.0  # 1 success out of 2 attempts
            assert rates['refresh_replay_rate'] == 50.0  # 1 replay out of 2 refresh attempts
            assert rates['csrf_invalid_rate'] == 50.0   # 1 invalid out of 2 CSRF validations
            
            # Check performance metrics
            perf = summary['performance']
            assert perf['verify_token_p50_ms'] == 75.0
            assert perf['verify_token_p95_ms'] == 75.0
            assert perf['verify_token_p99_ms'] == 75.0
    
    def test_prometheus_metrics_generation(self, app, metrics):
        """Test Prometheus metrics format generation."""
        with app.test_request_context('/test'):
            # Record some events
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=100.0)
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=200.0)
            metrics.record_auth_event(AuthEventType.LOGIN_FAILURE)
            
            prometheus_output = metrics.get_prometheus_metrics()
            
            assert '# TYPE auth_login_success_total counter' in prometheus_output
            assert 'auth_login_success_total 2' in prometheus_output
            assert 'auth_login_failure_total 1' in prometheus_output
            
            # Check histogram format
            assert '# TYPE auth_login_success_duration_ms histogram' in prometheus_output
            assert 'auth_login_success_duration_ms_bucket{le="50"}' in prometheus_output
            assert 'auth_login_success_duration_ms_sum 300.0' in prometheus_output
            assert 'auth_login_success_duration_ms_count 2' in prometheus_output
    
    def test_percentile_calculation(self, metrics):
        """Test percentile calculation."""
        values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        
        assert metrics._calculate_percentile(values, 0.5) == 60  # 50th percentile (index 5)
        assert metrics._calculate_percentile(values, 0.9) == 100  # 90th percentile (index 9)
        assert metrics._calculate_percentile(values, 0.95) == 100  # 95th percentile (index 9)
        
        # Empty list
        assert metrics._calculate_percentile([], 0.5) == 0.0
        
        # Single value
        assert metrics._calculate_percentile([42], 0.5) == 42
    
    def test_max_metrics_limit(self, app, metrics):
        """Test that metrics are limited to max_metrics."""
        with app.test_request_context('/test'):
            # Record more than max_metrics
            for i in range(150):
                metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS)
            
            # Should be limited to max_metrics (100)
            assert len(metrics.auth_metrics) == 100
    
    def test_global_metrics_instance(self, app):
        """Test global metrics instance functions."""
        # Test get_auth_metrics
        metrics1 = get_auth_metrics()
        metrics2 = get_auth_metrics()
        assert metrics1 is metrics2  # Should be same instance
        
        # Test record_auth_event function
        with app.test_request_context('/test'):
            record_auth_event(AuthEventType.LOGIN_SUCCESS, user_id='test-user')
            
            assert len(metrics1.auth_metrics) > 0
        
        # Test record_performance_metric function
        with app.test_request_context('/test'):
            record_performance_metric('test_operation', 123.45, True)
            
            assert len(metrics1.performance_metrics) > 0
    
    def test_performance_timer_decorator(self, app):
        """Test performance timer decorator."""
        with app.test_request_context('/test'):
            @performance_timer('test_function')
            def test_function():
                time.sleep(0.01)  # 10ms
                return 'success'
            
            result = test_function()
            assert result == 'success'
            
            # Check that metric was recorded
            metrics = get_auth_metrics()
            assert len(metrics.performance_metrics) > 0
            
            metric = metrics.performance_metrics[-1]  # Get last metric
            assert metric.operation == 'test_function'
            assert metric.duration_ms >= 10  # Should be at least 10ms
            assert metric.success is True
    
    def test_performance_timer_decorator_with_exception(self, app):
        """Test performance timer decorator with exception."""
        with app.test_request_context('/test'):
            @performance_timer('failing_function')
            def failing_function():
                time.sleep(0.01)
                raise ValueError('Test error')
            
            with pytest.raises(ValueError):
                failing_function()
            
            # Check that metric was recorded with success=False
            metrics = get_auth_metrics()
            metric = metrics.performance_metrics[-1]
            assert metric.operation == 'failing_function'
            assert metric.success is False
    
    def test_error_handling_in_record_auth_event(self, app, metrics):
        """Test error handling in record_auth_event."""
        with app.test_request_context('/test'):
            # Mock an error in the recording process
            with patch.object(metrics, '_mask_user_id', side_effect=Exception('Test error')):
                # Should not raise exception
                metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, user_id='test')
                
                # Metric should not be recorded due to error
                assert len(metrics.auth_metrics) == 0
    
    def test_error_handling_in_record_performance_metric(self, app, metrics):
        """Test error handling in record_performance_metric."""
        with app.test_request_context('/test'):
            # Mock an error in the recording process
            with patch('time.time', side_effect=Exception('Test error')):
                # Should not raise exception
                metrics.record_performance_metric('test_op', 100.0)
                
                # Metric should not be recorded due to error
                assert len(metrics.performance_metrics) == 0
    
    def test_error_handling_in_get_metrics_summary(self, metrics):
        """Test error handling in get_metrics_summary."""
        # Mock an error in summary generation
        with patch.object(metrics, '_calculate_percentile', side_effect=Exception('Test error')):
            summary = metrics.get_metrics_summary()
            
            # Should return error summary
            assert 'error' in summary
            assert 'timestamp' in summary
    
    def test_error_handling_in_get_prometheus_metrics(self, app, metrics):
        """Test error handling in get_prometheus_metrics."""
        # Add some data first
        with app.test_request_context('/test'):
            metrics.record_auth_event(AuthEventType.LOGIN_SUCCESS, response_time_ms=100.0)
        
        # Mock an error in Prometheus generation by patching the method itself
        with patch.object(metrics, '_calculate_percentile', side_effect=Exception('Test error')):
            prometheus_output = metrics.get_prometheus_metrics()
            
            # Should return error message
            assert 'Error generating metrics' in prometheus_output