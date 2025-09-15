#!/usr/bin/env python3
"""
Performance and Load Testing Suite

Tests for token verification latency, CSRF validation performance,
session rotation under high load, and rate limiting validation.
"""

import pytest
import time
import threading
import concurrent.futures
import statistics
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import json

# Add backend directory to path
import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from services.auth_service_v5 import AuthServiceV5
from services.abuse_control_service import AbuseControlService
from utils.postgres_auth import TokenManager
from utils.csrf_manager import CSRFManager


class TestTokenVerificationPerformance:
    """Test token verification performance requirements."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_verify_token_latency_p95(self, client):
        """Test token verification latency meets p95 < 120ms requirement."""
        # Create a valid token for testing
        token_manager = TokenManager()
        token = token_manager.generate_access_token('test-user', 'test@example.com')
        
        # Measure multiple requests to get statistical significance
        latencies = []
        num_requests = 200  # Increased for better statistics
        
        for _ in range(num_requests):
            start_time = time.time()
            response = client.head('/api/v5/auth/verify-token',
                                 headers={'Authorization': f'Bearer {token}'})
            latency = (time.time() - start_time) * 1000  # Convert to ms
            latencies.append(latency)
            
            # Ensure request succeeded
            assert response.status_code == 200
        
        # Calculate percentiles
        latencies.sort()
        p50 = latencies[int(len(latencies) * 0.50)]
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]
        
        # Performance requirements
        assert p95 < 120, f"P95 latency {p95:.2f}ms exceeds 120ms target"
        assert p99 < 200, f"P99 latency {p99:.2f}ms exceeds 200ms target"
        
        # Log performance metrics
        print(f"\nToken Verification Performance:")
        print(f"  P50: {p50:.2f}ms")
        print(f"  P95: {p95:.2f}ms")
        print(f"  P99: {p99:.2f}ms")
        print(f"  Average: {statistics.mean(latencies):.2f}ms")
    
    def test_verify_token_concurrent_load(self, client):
        """Test token verification under concurrent load."""
        # Create a valid token
        token_manager = TokenManager()
        token = token_manager.generate_access_token('test-user', 'test@example.com')
        
        # Test with multiple concurrent requests
        num_threads = 50
        requests_per_thread = 20
        latencies = []
        errors = []
        
        def verify_token_worker():
            """Worker function for concurrent token verification."""
            thread_latencies = []
            for _ in range(requests_per_thread):
                start_time = time.time()
                try:
                    response = client.head('/api/v5/auth/verify-token',
                                         headers={'Authorization': f'Bearer {token}'})
                    latency = (time.time() - start_time) * 1000
                    thread_latencies.append(latency)
                    
                    if response.status_code != 200:
                        errors.append(f"HTTP {response.status_code}")
                        
                except Exception as e:
                    errors.append(str(e))
            
            return thread_latencies
        
        # Execute concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(verify_token_worker) for _ in range(num_threads)]
            
            for future in concurrent.futures.as_completed(futures):
                thread_latencies = future.result()
                latencies.extend(thread_latencies)
        
        # Analyze results
        total_requests = num_threads * requests_per_thread
        success_rate = len(latencies) / total_requests
        
        assert success_rate >= 0.99, f"Success rate {success_rate:.2%} below 99% target"
        assert len(errors) == 0, f"Errors occurred: {errors[:5]}"  # Show first 5 errors
        
        # Performance under load
        if latencies:
            p95 = sorted(latencies)[int(len(latencies) * 0.95)]
            assert p95 < 150, f"P95 latency under load {p95:.2f}ms exceeds 150ms target"
            
            print(f"\nConcurrent Load Performance:")
            print(f"  Total requests: {total_requests}")
            print(f"  Success rate: {success_rate:.2%}")
            print(f"  P95 latency: {p95:.2f}ms")
            print(f"  Average latency: {statistics.mean(latencies):.2f}ms")


class TestCSRFValidationPerformance:
    """Test CSRF validation performance."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['CSRF_SECRET'] = 'test-csrf-secret'
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_csrf_validation_performance(self, client):
        """Test CSRF validation performance impact."""
        # Get CSRF token first
        csrf_response = client.get('/api/v5/auth/csrf')
        assert csrf_response.status_code == 200
        csrf_data = json.loads(csrf_response.data)
        csrf_token = csrf_data['csrf_token']
        
        # Measure CSRF validation performance
        latencies = []
        num_requests = 100
        
        for _ in range(num_requests):
            start_time = time.time()
            response = client.post('/api/v5/auth/login',
                                 json={'email': 'test@example.com', 'password': 'test123'},
                                 headers={
                                     'Content-Type': 'application/json',
                                     'X-CSRF-Token': csrf_token
                                 })
            latency = (time.time() - start_time) * 1000
            latencies.append(latency)
        
        # Performance analysis
        avg_latency = statistics.mean(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        
        # CSRF validation should not add significant overhead
        assert avg_latency < 50, f"Average CSRF validation latency {avg_latency:.2f}ms too high"
        assert p95_latency < 100, f"P95 CSRF validation latency {p95_latency:.2f}ms too high"
        
        print(f"\nCSRF Validation Performance:")
        print(f"  Average latency: {avg_latency:.2f}ms")
        print(f"  P95 latency: {p95_latency:.2f}ms")
    
    def test_csrf_timing_attack_resistance(self, client):
        """Test CSRF validation timing attack resistance under load."""
        csrf_manager = CSRFManager('test-secret')
        session_id = 'test-session-123'
        user_agent = 'Mozilla/5.0 Test Browser'
        
        # Generate valid token
        valid_token = csrf_manager.generate_token(session_id, user_agent)
        invalid_token = 'invalid-token-123'
        
        # Measure timing for multiple validations
        valid_times = []
        invalid_times = []
        num_tests = 50
        
        for _ in range(num_tests):
            # Valid token timing
            start_time = time.time()
            csrf_manager.validate_token(valid_token, session_id, user_agent)
            valid_times.append(time.time() - start_time)
            
            # Invalid token timing
            start_time = time.time()
            csrf_manager.validate_token(invalid_token, session_id, user_agent)
            invalid_times.append(time.time() - start_time)
        
        # Calculate timing differences
        avg_valid_time = statistics.mean(valid_times)
        avg_invalid_time = statistics.mean(invalid_times)
        timing_diff = abs(avg_valid_time - avg_invalid_time)
        
        # Timing difference should be minimal
        assert timing_diff < 0.01, f"Timing attack vulnerability: {timing_diff:.4f}s difference"
        
        print(f"\nCSRF Timing Attack Resistance:")
        print(f"  Average valid token time: {avg_valid_time*1000:.2f}ms")
        print(f"  Average invalid token time: {avg_invalid_time*1000:.2f}ms")
        print(f"  Timing difference: {timing_diff*1000:.2f}ms")


class TestSessionRotationPerformance:
    """Test session rotation performance under high load."""
    
    @pytest.fixture
    def auth_service(self):
        """Create auth service instance."""
        return AuthServiceV5()
    
    def test_session_rotation_under_load(self, auth_service):
        """Test session rotation performance under high load."""
        # Mock user data
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate initial tokens
        initial_tokens = auth_service.generate_tokens(user_data)
        refresh_token = initial_tokens['refresh_token']
        
        # Test concurrent refresh attempts
        num_threads = 20
        results = []
        latencies = []
        
        def refresh_worker():
            """Worker function for concurrent refresh attempts."""
            start_time = time.time()
            success, new_tokens = auth_service.refresh_access_token(refresh_token)
            latency = (time.time() - start_time) * 1000
            
            return {
                'success': success,
                'latency': latency,
                'has_tokens': new_tokens is not None
            }
        
        # Execute concurrent refresh attempts
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(refresh_worker) for _ in range(num_threads)]
            
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                results.append(result)
                latencies.append(result['latency'])
        
        # Analyze results
        successful_refreshes = sum(1 for r in results if r['success'])
        
        # Only one refresh should succeed (mutex behavior)
        assert successful_refreshes == 1, f"Expected 1 successful refresh, got {successful_refreshes}"
        
        # Performance analysis
        avg_latency = statistics.mean(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        
        # Session rotation should be fast
        assert avg_latency < 100, f"Average session rotation latency {avg_latency:.2f}ms too high"
        assert p95_latency < 200, f"P95 session rotation latency {p95_latency:.2f}ms too high"
        
        print(f"\nSession Rotation Performance:")
        print(f"  Successful refreshes: {successful_refreshes}/{num_threads}")
        print(f"  Average latency: {avg_latency:.2f}ms")
        print(f"  P95 latency: {p95_latency:.2f}ms")
    
    def test_token_blacklist_performance(self, auth_service):
        """Test token blacklist performance under load."""
        # Generate multiple tokens
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        tokens = []
        for _ in range(100):
            token_data = auth_service.generate_tokens(user_data)
            tokens.append(token_data['access_token'])
        
        # Measure blacklist performance
        blacklist_latencies = []
        check_latencies = []
        
        # Blacklist tokens
        for token in tokens:
            start_time = time.time()
            auth_service.invalidate_token(token)
            blacklist_latencies.append((time.time() - start_time) * 1000)
        
        # Check blacklist status
        for token in tokens:
            start_time = time.time()
            is_blacklisted = auth_service.is_token_blacklisted(token)
            check_latencies.append((time.time() - start_time) * 1000)
            assert is_blacklisted is True
        
        # Performance analysis
        avg_blacklist_latency = statistics.mean(blacklist_latencies)
        avg_check_latency = statistics.mean(check_latencies)
        
        # Blacklist operations should be fast
        assert avg_blacklist_latency < 50, f"Average blacklist latency {avg_blacklist_latency:.2f}ms too high"
        assert avg_check_latency < 20, f"Average check latency {avg_check_latency:.2f}ms too high"
        
        print(f"\nToken Blacklist Performance:")
        print(f"  Average blacklist latency: {avg_blacklist_latency:.2f}ms")
        print(f"  Average check latency: {avg_check_latency:.2f}ms")


class TestRateLimitingPerformance:
    """Test rate limiting performance and validation."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_rate_limiting_validation(self, client):
        """Test rate limiting validation with Nginx configuration."""
        # Test rapid requests to trigger rate limiting
        responses = []
        latencies = []
        
        # Make rapid requests
        for i in range(15):  # Should trigger rate limiting
            start_time = time.time()
            response = client.post('/api/v5/auth/login',
                                 json={'email': 'test@example.com', 'password': 'test123'},
                                 headers={'Content-Type': 'application/json'})
            latency = (time.time() - start_time) * 1000
            
            responses.append(response.status_code)
            latencies.append(latency)
            
            # Small delay to avoid overwhelming
            time.sleep(0.1)
        
        # Analyze responses
        success_count = sum(1 for status in responses if status == 200)
        rate_limited_count = sum(1 for status in responses if status == 429)
        
        # Should have some rate limiting
        assert rate_limited_count > 0, "Rate limiting not triggered"
        
        # Performance analysis
        avg_latency = statistics.mean(latencies)
        
        # Rate limiting should not add excessive latency
        assert avg_latency < 100, f"Average rate limiting latency {avg_latency:.2f}ms too high"
        
        print(f"\nRate Limiting Performance:")
        print(f"  Total requests: {len(responses)}")
        print(f"  Successful: {success_count}")
        print(f"  Rate limited: {rate_limited_count}")
        print(f"  Average latency: {avg_latency:.2f}ms")
    
    def test_abuse_control_performance(self):
        """Test abuse control service performance."""
        abuse_service = AbuseControlService()
        username = 'test@example.com'
        
        # Test abuse control performance
        check_latencies = []
        record_latencies = []
        
        # Measure check performance
        for _ in range(50):
            start_time = time.time()
            result = abuse_service.check_login_abuse(username)
            check_latencies.append((time.time() - start_time) * 1000)
        
        # Measure record performance
        for _ in range(50):
            start_time = time.time()
            abuse_service.record_failed_login(username)
            record_latencies.append((time.time() - start_time) * 1000)
        
        # Performance analysis
        avg_check_latency = statistics.mean(check_latencies)
        avg_record_latency = statistics.mean(record_latencies)
        
        # Abuse control should be fast
        assert avg_check_latency < 10, f"Average check latency {avg_check_latency:.2f}ms too high"
        assert avg_record_latency < 10, f"Average record latency {avg_record_latency:.2f}ms too high"
        
        print(f"\nAbuse Control Performance:")
        print(f"  Average check latency: {avg_check_latency:.2f}ms")
        print(f"  Average record latency: {avg_record_latency:.2f}ms")


class TestMemoryAndResourceUsage:
    """Test memory and resource usage under load."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    def test_memory_usage_under_load(self, app):
        """Test memory usage under sustained load."""
        import psutil
        import os
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate sustained load
        auth_service = AuthServiceV5()
        user_data = {
            'id': 'test-user-123',
            'email': 'test@example.com',
            'roles': [{'role': 'user', 'level': 1}]
        }
        
        # Generate many tokens and operations
        for i in range(1000):
            # Generate tokens
            tokens = auth_service.generate_tokens(user_data)
            
            # Invalidate tokens
            auth_service.invalidate_token(tokens['access_token'])
            
            # Check blacklist
            auth_service.is_token_blacklisted(tokens['access_token'])
            
            # Every 100 iterations, check memory
            if i % 100 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_increase = current_memory - initial_memory
                
                # Memory increase should be reasonable
                assert memory_increase < 100, f"Memory increase {memory_increase:.2f}MB too high"
        
        # Final memory check
        final_memory = process.memory_info().rss / 1024 / 1024
        total_memory_increase = final_memory - initial_memory
        
        print(f"\nMemory Usage Under Load:")
        print(f"  Initial memory: {initial_memory:.2f}MB")
        print(f"  Final memory: {final_memory:.2f}MB")
        print(f"  Total increase: {total_memory_increase:.2f}MB")
        
        # Total memory increase should be reasonable
        assert total_memory_increase < 50, f"Total memory increase {total_memory_increase:.2f}MB too high"


class TestPerformanceRegression:
    """Test for performance regressions."""
    
    @pytest.fixture
    def app(self):
        """Create test application."""
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_performance_baseline(self, client):
        """Test performance baseline for regression detection."""
        # Create baseline performance metrics
        token_manager = TokenManager()
        token = token_manager.generate_access_token('test-user', 'test@example.com')
        
        # Measure baseline performance
        latencies = []
        for _ in range(100):
            start_time = time.time()
            response = client.head('/api/v5/auth/verify-token',
                                 headers={'Authorization': f'Bearer {token}'})
            latency = (time.time() - start_time) * 1000
            latencies.append(latency)
            assert response.status_code == 200
        
        # Calculate baseline metrics
        baseline_p95 = sorted(latencies)[int(len(latencies) * 0.95)]
        baseline_avg = statistics.mean(latencies)
        
        # Store baseline for comparison (in real implementation, this would be stored)
        baseline_metrics = {
            'p95_latency': baseline_p95,
            'avg_latency': baseline_avg,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Performance should not regress significantly
        max_p95 = 120  # ms
        max_avg = 50   # ms
        
        assert baseline_p95 < max_p95, f"Baseline P95 {baseline_p95:.2f}ms exceeds {max_p95}ms"
        assert baseline_avg < max_avg, f"Baseline average {baseline_avg:.2f}ms exceeds {max_avg}ms"
        
        print(f"\nPerformance Baseline:")
        print(f"  P95 latency: {baseline_p95:.2f}ms")
        print(f"  Average latency: {baseline_avg:.2f}ms")
        print(f"  Baseline metrics: {baseline_metrics}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
