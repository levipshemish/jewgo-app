"""
Performance tests for TokenManagerV5.

Tests to ensure the verify-token endpoint meets sub-120ms p95 performance target.
"""

import pytest
import time
import statistics
from unittest.mock import patch
from services.auth.token_manager_v5 import TokenManagerV5


class TestTokenManagerV5Performance:
    """Performance tests for TokenManagerV5."""
    
    @pytest.fixture
    def token_manager(self):
        """Create TokenManagerV5 instance for testing."""
        with patch.dict('os.environ', {
            'JWT_SECRET_KEY': 'test_secret_key_for_performance_testing_12345',
            'ACCESS_TTL_SECONDS': '3600',
            'REFRESH_TTL_SECONDS': '2592000'
        }):
            return TokenManagerV5(leeway=60)
    
    @pytest.fixture
    def valid_token(self, token_manager):
        """Create a valid token for performance testing."""
        token, _ = token_manager.mint_access_token(
            user_id='test_user_123',
            email='test@example.com',
            roles=[{'role': 'user', 'level': 1}]
        )
        return token
    
    def test_token_verification_latency_single(self, token_manager, valid_token):
        """Test single token verification latency."""
        start_time = time.perf_counter()
        payload = token_manager.verify_token(valid_token)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        assert payload is not None
        assert duration_ms < 50  # Should be much faster than 120ms target
        print(f"Single verification took {duration_ms:.2f}ms")
    
    def test_token_verification_latency_batch(self, token_manager, valid_token):
        """Test batch token verification to measure p95 latency."""
        durations = []
        num_iterations = 100
        
        # Warm up
        for _ in range(10):
            token_manager.verify_token(valid_token)
        
        # Measure performance
        for _ in range(num_iterations):
            start_time = time.perf_counter()
            payload = token_manager.verify_token(valid_token)
            duration_ms = (time.perf_counter() - start_time) * 1000
            durations.append(duration_ms)
            assert payload is not None
        
        # Calculate statistics
        p50 = statistics.median(durations)
        p95 = statistics.quantiles(durations, n=20)[18]  # 95th percentile
        p99 = statistics.quantiles(durations, n=100)[98]  # 99th percentile
        avg = statistics.mean(durations)
        
        print(f"Token verification performance over {num_iterations} iterations:")
        print(f"  Average: {avg:.2f}ms")
        print(f"  P50: {p50:.2f}ms")
        print(f"  P95: {p95:.2f}ms")
        print(f"  P99: {p99:.2f}ms")
        
        # Assert performance targets
        assert p95 < 120, f"P95 latency {p95:.2f}ms exceeds 120ms target"
        assert p50 < 50, f"P50 latency {p50:.2f}ms should be well under target"
    
    def test_token_verification_with_different_leeway(self, token_manager, valid_token):
        """Test token verification performance with different leeway values."""
        leeway_values = [0, 30, 60, 120, 300]
        results = {}
        
        for leeway in leeway_values:
            durations = []
            
            # Measure 20 iterations for each leeway
            for _ in range(20):
                start_time = time.perf_counter()
                payload = token_manager.verify_token(valid_token, leeway=leeway)
                duration_ms = (time.perf_counter() - start_time) * 1000
                durations.append(duration_ms)
                assert payload is not None
            
            avg_duration = statistics.mean(durations)
            results[leeway] = avg_duration
            
            # Each leeway should still be fast
            assert avg_duration < 100, f"Leeway {leeway}s took {avg_duration:.2f}ms"
        
        print("Token verification performance by leeway:")
        for leeway, duration in results.items():
            print(f"  {leeway}s leeway: {duration:.2f}ms average")
    
    def test_token_minting_performance(self, token_manager):
        """Test token minting performance."""
        durations = []
        num_iterations = 50
        
        for i in range(num_iterations):
            start_time = time.perf_counter()
            token, ttl = token_manager.mint_access_token(
                user_id=f'user_{i}',
                email=f'user{i}@example.com',
                roles=[{'role': 'user', 'level': 1}]
            )
            duration_ms = (time.perf_counter() - start_time) * 1000
            durations.append(duration_ms)
            
            assert token is not None
            assert ttl > 0
        
        avg_duration = statistics.mean(durations)
        p95_duration = statistics.quantiles(durations, n=20)[18]
        
        print(f"Token minting performance over {num_iterations} iterations:")
        print(f"  Average: {avg_duration:.2f}ms")
        print(f"  P95: {p95_duration:.2f}ms")
        
        # Token minting should also be fast
        assert avg_duration < 50, f"Token minting average {avg_duration:.2f}ms too slow"
        assert p95_duration < 100, f"Token minting P95 {p95_duration:.2f}ms too slow"
    
    def test_concurrent_token_verification(self, token_manager, valid_token):
        """Test token verification under concurrent load simulation."""
        import threading
        import queue
        
        results_queue = queue.Queue()
        num_threads = 10
        iterations_per_thread = 20
        
        def verify_tokens():
            """Worker function for concurrent verification."""
            thread_durations = []
            for _ in range(iterations_per_thread):
                start_time = time.perf_counter()
                payload = token_manager.verify_token(valid_token)
                duration_ms = (time.perf_counter() - start_time) * 1000
                thread_durations.append(duration_ms)
                assert payload is not None
            results_queue.put(thread_durations)
        
        # Start threads
        threads = []
        start_time = time.perf_counter()
        
        for _ in range(num_threads):
            thread = threading.Thread(target=verify_tokens)
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        total_duration = time.perf_counter() - start_time
        
        # Collect all results
        all_durations = []
        while not results_queue.empty():
            thread_durations = results_queue.get()
            all_durations.extend(thread_durations)
        
        # Calculate statistics
        total_operations = num_threads * iterations_per_thread
        avg_duration = statistics.mean(all_durations)
        p95_duration = statistics.quantiles(all_durations, n=20)[18]
        throughput = total_operations / total_duration
        
        print("Concurrent verification performance:")
        print(f"  {num_threads} threads × {iterations_per_thread} operations = {total_operations} total")
        print(f"  Total time: {total_duration:.2f}s")
        print(f"  Throughput: {throughput:.1f} ops/sec")
        print(f"  Average latency: {avg_duration:.2f}ms")
        print(f"  P95 latency: {p95_duration:.2f}ms")
        
        # Performance assertions
        assert p95_duration < 120, f"Concurrent P95 {p95_duration:.2f}ms exceeds target"
        assert throughput > 100, f"Throughput {throughput:.1f} ops/sec too low"
    
    def test_invalid_token_performance(self, token_manager):
        """Test performance of invalid token handling."""
        invalid_tokens = [
            'invalid.token.here',
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
            '',
            'not.a.jwt',
            'expired.token.example'
        ]
        
        for invalid_token in invalid_tokens:
            durations = []
            
            for _ in range(20):
                start_time = time.perf_counter()
                payload = token_manager.verify_token(invalid_token)
                duration_ms = (time.perf_counter() - start_time) * 1000
                durations.append(duration_ms)
                assert payload is None
            
            avg_duration = statistics.mean(durations)
            # Invalid token handling should also be fast
            assert avg_duration < 50, f"Invalid token handling took {avg_duration:.2f}ms"
        
        print("Invalid token handling performance: PASS")
    
    def test_token_extraction_performance(self, token_manager, valid_token):
        """Test performance of token extraction methods."""
        operations = [
            ('extract_jti', lambda: token_manager.extract_jti(valid_token)),
            ('extract_user_id', lambda: token_manager.extract_user_id(valid_token)),
            ('is_token_expired', lambda: token_manager.is_token_expired(valid_token)),
            ('get_token_claims', lambda: token_manager.get_token_claims(valid_token))
        ]
        
        for op_name, op_func in operations:
            durations = []
            
            for _ in range(50):
                start_time = time.perf_counter()
                result = op_func()
                duration_ms = (time.perf_counter() - start_time) * 1000
                durations.append(duration_ms)
                assert result is not None
            
            avg_duration = statistics.mean(durations)
            print(f"{op_name} average: {avg_duration:.2f}ms")
            
            # All extraction operations should be very fast
            assert avg_duration < 20, f"{op_name} took {avg_duration:.2f}ms (too slow)"


@pytest.mark.integration
class TestVerifyTokenEndpointPerformance:
    """Integration tests for verify-token endpoint performance."""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        from app_factory_full import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def auth_token(self, client):
        """Get valid auth token for testing."""
        # This would need to be implemented based on your auth flow
        # For now, create a token directly
        with patch.dict('os.environ', {
            'JWT_SECRET_KEY': 'test_secret_key_for_integration_testing_12345'
        }):
            token_manager = TokenManagerV5()
            token, _ = token_manager.mint_access_token(
                user_id='test_user_integration',
                email='integration@test.com'
            )
            return token
    
    def test_head_verify_token_performance(self, client, auth_token):
        """Test HEAD /verify-token endpoint performance."""
        durations = []
        num_requests = 50
        
        # Warm up
        for _ in range(5):
            client.head('/api/v5/auth/verify-token', 
                       headers={'Authorization': f'Bearer {auth_token}'})
        
        # Measure performance
        for _ in range(num_requests):
            start_time = time.perf_counter()
            response = client.head('/api/v5/auth/verify-token',
                                 headers={'Authorization': f'Bearer {auth_token}'})
            duration_ms = (time.perf_counter() - start_time) * 1000
            durations.append(duration_ms)
            
            assert response.status_code == 200
            assert response.headers.get('X-Token-Valid') == 'true'
            assert 'X-Response-Time' in response.headers
        
        # Calculate statistics
        avg_duration = statistics.mean(durations)
        p95_duration = statistics.quantiles(durations, n=20)[18]
        
        print(f"HEAD /verify-token performance over {num_requests} requests:")
        print(f"  Average: {avg_duration:.2f}ms")
        print(f"  P95: {p95_duration:.2f}ms")
        
        # Assert performance target
        assert p95_duration < 120, f"HEAD endpoint P95 {p95_duration:.2f}ms exceeds 120ms target"
        assert avg_duration < 80, f"HEAD endpoint average {avg_duration:.2f}ms should be well under target"
    
    def test_post_verify_token_performance(self, client, auth_token):
        """Test POST /verify-token endpoint performance."""
        durations = []
        num_requests = 30
        
        for _ in range(num_requests):
            start_time = time.perf_counter()
            response = client.post('/api/v5/auth/verify-token',
                                 json={'token': auth_token})
            duration_ms = (time.perf_counter() - start_time) * 1000
            durations.append(duration_ms)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['valid'] is True
            assert 'response_time_ms' in data['data']
        
        avg_duration = statistics.mean(durations)
        p95_duration = statistics.quantiles(durations, n=20)[18] if len(durations) >= 20 else max(durations)
        
        print(f"POST /verify-token performance over {num_requests} requests:")
        print(f"  Average: {avg_duration:.2f}ms")
        print(f"  P95: {p95_duration:.2f}ms")
        
        # POST can be slightly slower due to JSON parsing, but should still be fast
        assert p95_duration < 150, f"POST endpoint P95 {p95_duration:.2f}ms too slow"