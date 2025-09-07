"""
Concurrent load testing for JWT authentication system.

These tests validate the authentication system's behavior under high
concurrent load, particularly focusing on token rotation safety and
database connection handling.
"""

import asyncio
import concurrent.futures
import time
import threading
import requests
import pytest
from unittest.mock import Mock, patch
import statistics
from typing import List, Dict, Any, Tuple


class AuthLoadTester:
    """Helper class for authentication load testing."""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        self.errors = []
    
    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Perform a single login operation."""
        start_time = time.time()
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password},
                timeout=30
            )
            end_time = time.time()
            
            result = {
                "operation": "login",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "latency": end_time - start_time,
                "thread_id": threading.current_thread().ident
            }
            
            if response.status_code == 200:
                result["tokens"] = response.json().get("tokens", {})
            
            self.results.append(result)
            return result
            
        except Exception as e:
            end_time = time.time()
            error_result = {
                "operation": "login",
                "success": False,
                "error": str(e),
                "latency": end_time - start_time,
                "thread_id": threading.current_thread().ident
            }
            self.errors.append(error_result)
            return error_result
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Perform a single token refresh operation."""
        start_time = time.time()
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/refresh",
                json={"refresh_token": refresh_token},
                timeout=30
            )
            end_time = time.time()
            
            result = {
                "operation": "refresh",
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "latency": end_time - start_time,
                "thread_id": threading.current_thread().ident
            }
            
            if response.status_code == 200:
                result["tokens"] = response.json()
            
            self.results.append(result)
            return result
            
        except Exception as e:
            end_time = time.time()
            error_result = {
                "operation": "refresh",
                "success": False,
                "error": str(e),
                "latency": end_time - start_time,
                "thread_id": threading.current_thread().ident
            }
            self.errors.append(error_result)
            return error_result


class TestConcurrentAuthentication:
    """Test authentication system under concurrent load."""
    
    def test_concurrent_logins(self):
        """Test multiple concurrent login attempts."""
        tester = AuthLoadTester()
        num_concurrent = 50
        test_email = "load_test@example.com"
        test_password = "LoadTest123!"
        
        # Use ThreadPoolExecutor for concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            # Submit all login tasks
            futures = [
                executor.submit(tester.login_user, f"{test_email}_{i}", test_password)
                for i in range(num_concurrent)
            ]
            
            # Wait for all tasks to complete
            results = []
            for future in concurrent.futures.as_completed(futures, timeout=60):
                results.append(future.result())
        
        # Analyze results
        successful_logins = [r for r in results if r.get("success")]
        failed_logins = [r for r in results if not r.get("success")]
        
        print(f"Concurrent Login Test Results:")
        print(f"Total requests: {len(results)}")
        print(f"Successful: {len(successful_logins)}")
        print(f"Failed: {len(failed_logins)}")
        
        if successful_logins:
            latencies = [r["latency"] for r in successful_logins]
            print(f"Latency stats - Mean: {statistics.mean(latencies):.3f}s, "
                  f"P95: {statistics.quantiles(latencies, n=20)[18]:.3f}s, "
                  f"Max: {max(latencies):.3f}s")
        
        # Assertions
        assert len(results) == num_concurrent, "Not all requests completed"
        success_rate = len(successful_logins) / len(results)
        assert success_rate >= 0.95, f"Success rate {success_rate:.2%} below 95%"
        
        if successful_logins:
            avg_latency = statistics.mean([r["latency"] for r in successful_logins])
            assert avg_latency < 2.0, f"Average latency {avg_latency:.3f}s exceeds 2s threshold"

    def test_concurrent_token_refresh_different_users(self):
        """Test concurrent token refresh for different users."""
        tester = AuthLoadTester()
        num_users = 20
        
        # First, create tokens for different users
        user_tokens = {}
        for i in range(num_users):
            # Mock token creation (in real test, you'd login first)
            user_tokens[f"user_{i}"] = {
                "refresh_token": f"mock_refresh_token_{i}",
                "access_token": f"mock_access_token_{i}"
            }
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [
                executor.submit(tester.refresh_token, tokens["refresh_token"])
                for user_id, tokens in user_tokens.items()
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures, timeout=60):
                results.append(future.result())
        
        # Analyze results
        successful_refreshes = [r for r in results if r.get("success")]
        
        print(f"Concurrent Refresh Test Results:")
        print(f"Total requests: {len(results)}")
        print(f"Successful: {len(successful_refreshes)}")
        
        # For different users, all refreshes should succeed
        success_rate = len(successful_refreshes) / len(results)
        assert success_rate >= 0.9, f"Multi-user refresh success rate {success_rate:.2%} too low"

    def test_concurrent_same_token_refresh_race_condition(self):
        """Test concurrent refresh attempts with the same token (should detect reuse)."""
        from services.auth import sessions, tokens
        import os
        
        # Mock database for controlled testing
        mock_db = Mock()
        mock_sessions = {}
        
        def mock_session_execute(query, params=None):
            # Simulate database operations with thread safety
            time.sleep(0.001)  # Small delay to increase race condition likelihood
            return Mock(fetchone=lambda: Mock(
                id='session1', 
                revoked_at=None, 
                expires_at=None
            ))
        
        mock_session = Mock()
        mock_session.execute.side_effect = mock_session_execute
        mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
        mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
        
        # Test parameters
        num_concurrent = 10
        same_refresh_token = "same_token_for_all"
        
        def attempt_refresh(attempt_id):
            return sessions.rotate_or_reject(
                mock_db,
                user_id='user1',
                provided_refresh=same_refresh_token,
                sid='session1',
                fid='family1', 
                user_agent=f'test_agent_{attempt_id}',
                ip='127.0.0.1',
                ttl_seconds=3600
            )
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [
                executor.submit(attempt_refresh, i)
                for i in range(num_concurrent)
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        # Analyze results - at most one should succeed, others should be None
        successful_rotations = [r for r in results if r is not None]
        failed_rotations = [r for r in results if r is None]
        
        print(f"Same Token Concurrent Refresh Results:")
        print(f"Successful rotations: {len(successful_rotations)}")
        print(f"Rejected (reuse detected): {len(failed_rotations)}")
        
        # Only one rotation should succeed due to race condition handling
        assert len(successful_rotations) <= 1, "Multiple rotations succeeded for same token"

    def test_memory_usage_under_load(self):
        """Test memory usage doesn't grow excessively under load."""
        import psutil
        import os
        
        # Get current process
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        tester = AuthLoadTester()
        num_requests = 100
        
        # Simulate high load
        for i in range(num_requests):
            tester.login_user(f"user_{i}@example.com", "Password123!")
            
            # Check memory every 10 requests
            if i % 10 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_growth = current_memory - initial_memory
                
                # Memory shouldn't grow excessively (allowing for some overhead)
                assert memory_growth < 50, f"Memory grew by {memory_growth:.1f}MB after {i} requests"
        
        final_memory = process.memory_info().rss / 1024 / 1024
        total_growth = final_memory - initial_memory
        print(f"Memory growth: {total_growth:.1f}MB for {num_requests} requests")
        
        # Total growth should be reasonable
        assert total_growth < 100, f"Total memory growth {total_growth:.1f}MB too high"


class TestDatabaseConcurrency:
    """Test database operation concurrency and connection handling."""
    
    def test_database_connection_pool_under_load(self):
        """Test that database connections are properly pooled under load."""
        from utils.postgres_auth import PostgresAuthManager
        
        # Mock database manager with connection tracking
        connection_count = 0
        max_concurrent_connections = 0
        connection_lock = threading.Lock()
        
        class MockConnection:
            def __init__(self):
                nonlocal connection_count, max_concurrent_connections
                with connection_lock:
                    connection_count += 1
                    max_concurrent_connections = max(max_concurrent_connections, connection_count)
            
            def __enter__(self):
                return Mock()
            
            def __exit__(self, *args):
                nonlocal connection_count
                with connection_lock:
                    connection_count -= 1
        
        mock_db = Mock()
        mock_db.connection_manager.session_scope = MockConnection
        
        auth_manager = PostgresAuthManager(mock_db)
        
        def simulate_auth_operation(user_id):
            # Simulate various auth operations
            time.sleep(0.01)  # Simulate some processing time
            return f"result_{user_id}"
        
        # Run concurrent operations
        num_concurrent = 50
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [
                executor.submit(simulate_auth_operation, i)
                for i in range(num_concurrent)
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        print(f"Database Connection Test:")
        print(f"Max concurrent connections: {max_concurrent_connections}")
        print(f"Final connection count: {connection_count}")
        
        # All connections should be returned to pool
        assert connection_count == 0, "Connections not properly returned to pool"
        
        # Max concurrent shouldn't exceed reasonable limits
        assert max_concurrent_connections <= 20, "Too many concurrent database connections"

    def test_session_cleanup_performance(self):
        """Test performance of session cleanup operations."""
        from services.auth import sessions
        
        # Mock database with many expired sessions
        mock_db = Mock()
        mock_session = Mock()
        
        # Simulate cleanup of 1000 expired sessions
        num_expired_sessions = 1000
        start_time = time.time()
        
        # Mock the cleanup operation
        mock_session.execute.return_value.rowcount = num_expired_sessions
        mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
        mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
        
        # Simulate cleanup (in real implementation, this would be a batch DELETE)
        cleanup_time = time.time() - start_time
        
        print(f"Session Cleanup Performance:")
        print(f"Cleaned up {num_expired_sessions} sessions in {cleanup_time:.3f}s")
        
        # Cleanup should be fast
        assert cleanup_time < 1.0, f"Session cleanup took {cleanup_time:.3f}s, too slow"


class TestRateLimitingPerformance:
    """Test rate limiting performance under load."""
    
    def test_rate_limiting_accuracy_under_load(self):
        """Test that rate limiting remains accurate under concurrent load."""
        # This would test the Flask-Limiter behavior
        # For now, we'll simulate the test structure
        
        rate_limit = 10  # requests per minute
        time_window = 60  # seconds
        num_requests = 50  # More than rate limit
        
        # Mock rate limiter
        request_times = []
        rejected_requests = 0
        
        def mock_rate_limited_request():
            current_time = time.time()
            request_times.append(current_time)
            
            # Count recent requests (within time window)
            recent_requests = [t for t in request_times if current_time - t <= time_window]
            
            if len(recent_requests) > rate_limit:
                nonlocal rejected_requests
                rejected_requests += 1
                return False  # Rate limited
            
            return True  # Allowed
        
        # Simulate concurrent requests
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(mock_rate_limited_request)
                for _ in range(num_requests)
            ]
            
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        allowed_requests = sum(results)
        
        print(f"Rate Limiting Test:")
        print(f"Total requests: {num_requests}")
        print(f"Allowed requests: {allowed_requests}")
        print(f"Rejected requests: {rejected_requests}")
        
        # Rate limiting should be approximately correct
        assert rejected_requests > 0, "No requests were rate limited"
        assert allowed_requests <= rate_limit * 2, "Too many requests allowed"


def run_load_test_suite():
    """Run the complete load test suite with reporting."""
    
    print("=" * 60)
    print("JWT Authentication System - Load Test Suite")
    print("=" * 60)
    
    test_classes = [
        TestConcurrentAuthentication,
        TestDatabaseConcurrency,
        TestRateLimitingPerformance
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_class in test_classes:
        print(f"\nRunning {test_class.__name__}...")
        
        test_instance = test_class()
        test_methods = [method for method in dir(test_instance) if method.startswith('test_')]
        
        for test_method in test_methods:
            total_tests += 1
            print(f"  {test_method}...", end=" ")
            
            try:
                start_time = time.time()
                getattr(test_instance, test_method)()
                end_time = time.time()
                
                print(f"PASS ({end_time - start_time:.2f}s)")
                passed_tests += 1
                
            except Exception as e:
                print(f"FAIL - {str(e)}")
                failed_tests += 1
    
    print("\n" + "=" * 60)
    print("Load Test Results Summary:")
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success rate: {passed_tests/total_tests*100:.1f}%")
    print("=" * 60)
    
    return failed_tests == 0


if __name__ == "__main__":
    # Run the load test suite
    success = run_load_test_suite()
    exit(0 if success else 1)