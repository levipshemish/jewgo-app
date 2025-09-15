"""
Integration tests for SessionFamilyManager.

Tests for concurrent refresh attempts and replay detection.
"""

import pytest
import threading
import time
import queue
from unittest.mock import Mock, patch
from services.auth.session_family_manager import SessionFamilyManager


@pytest.mark.integration
class TestSessionFamilyIntegration:
    """Integration tests for SessionFamilyManager."""
    
    @pytest.fixture
    def mock_redis_manager(self):
        """Create mock Redis manager with realistic behavior."""
        mock = Mock()
        mock.health_check.return_value = {'status': 'healthy'}
        
        # Simulate mutex behavior
        self._mutex_state = {}
        
        def mock_set_if_not_exists(key, value, ttl=None, prefix=None):
            full_key = f"{prefix}:{key}" if prefix else key
            if full_key in self._mutex_state:
                return False  # Already exists
            self._mutex_state[full_key] = value
            return True
        
        def mock_delete(key, prefix=None):
            full_key = f"{prefix}:{key}" if prefix else key
            if full_key in self._mutex_state:
                del self._mutex_state[full_key]
                return True
            return False
        
        mock.set_if_not_exists.side_effect = mock_set_if_not_exists
        mock.delete.side_effect = mock_delete
        mock.set.return_value = True
        mock.get.return_value = None
        
        return mock
    
    @pytest.fixture
    def mock_connection_manager(self):
        """Create mock connection manager with realistic session behavior."""
        mock = Mock()
        
        # Simulate session state
        self._session_state = {}
        
        def create_mock_session():
            mock_session = Mock()
            
            def mock_execute(query, params=None):
                mock_result = Mock()
                
                # Handle different query types based on query content
                query_str = str(query)
                
                if "SELECT current_jti" in query_str:
                    # Session rotation query
                    family_id = params.get('family_id') if params else None
                    if family_id in self._session_state:
                        session_data = self._session_state[family_id]
                        mock_result.current_jti = session_data.get('current_jti')
                        mock_result.revoked_at = session_data.get('revoked_at')
                        mock_result.reused_jti_of = session_data.get('reused_jti_of')
                        mock_result.fetchone.return_value = mock_result
                    else:
                        mock_result.fetchone.return_value = None
                
                elif "UPDATE auth_sessions SET" in query_str and "current_jti" in query_str:
                    # Session rotation update
                    family_id = params.get('family_id') if params else None
                    if family_id:
                        if family_id not in self._session_state:
                            self._session_state[family_id] = {}
                        self._session_state[family_id]['current_jti'] = params.get('new_jti')
                        self._session_state[family_id]['refresh_token_hash'] = params.get('token_hash')
                    mock_result.rowcount = 1
                
                elif "UPDATE auth_sessions SET" in query_str and "revoked_at" in query_str:
                    # Family revocation
                    family_id = params.get('family_id') if params else None
                    if family_id:
                        if family_id not in self._session_state:
                            self._session_state[family_id] = {}
                        self._session_state[family_id]['revoked_at'] = 'NOW()'
                        self._session_state[family_id]['revocation_reason'] = params.get('reason')
                    mock_result.rowcount = 1
                
                elif "INSERT INTO auth_sessions" in query_str:
                    # Session creation
                    family_id = params.get('family_id') if params else None
                    if family_id:
                        self._session_state[family_id] = {
                            'user_id': params.get('user_id'),
                            'current_jti': None,
                            'revoked_at': None
                        }
                    mock_result.rowcount = 1
                
                else:
                    mock_result.rowcount = 0
                    mock_result.fetchone.return_value = None
                    mock_result.fetchall.return_value = []
                
                return mock_result
            
            mock_session.execute.side_effect = mock_execute
            return mock_session
        
        mock.session_scope.return_value.__enter__.side_effect = create_mock_session
        mock.session_scope.return_value.__exit__.return_value = None
        
        return mock
    
    @pytest.fixture
    def session_manager(self, mock_redis_manager, mock_connection_manager):
        """Create SessionFamilyManager instance for integration testing."""
        return SessionFamilyManager(
            redis_manager=mock_redis_manager,
            connection_manager=mock_connection_manager
        )
    
    def test_concurrent_refresh_attempts_mutex_protection(self, session_manager):
        """Test that concurrent refresh attempts are properly serialized by mutex."""
        family_id = 'test_family_concurrent'
        current_jti = 'current_jti_123'
        
        # Create session family first
        session_manager._session_state = {
            family_id: {
                'current_jti': current_jti,
                'revoked_at': None,
                'reused_jti_of': None
            }
        }
        
        results_queue = queue.Queue()
        num_threads = 5
        
        def attempt_refresh(thread_id):
            """Worker function for concurrent refresh attempts."""
            new_jti = f'new_jti_{thread_id}'
            token_hash = f'hash_{thread_id}'
            
            success, error = session_manager.rotate_session(
                family_id, current_jti, new_jti, token_hash
            )
            
            results_queue.put({
                'thread_id': thread_id,
                'success': success,
                'error': error,
                'timestamp': time.time()
            })
        
        # Start multiple threads attempting refresh simultaneously
        threads = []
        start_time = time.time()
        
        for i in range(num_threads):
            thread = threading.Thread(target=attempt_refresh, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=5)  # 5 second timeout
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Analyze results
        successful_attempts = [r for r in results if r['success']]
        failed_attempts = [r for r in results if not r['success']]
        
        # Exactly one should succeed, others should fail with mutex error
        assert len(successful_attempts) == 1, f"Expected 1 success, got {len(successful_attempts)}"
        assert len(failed_attempts) == num_threads - 1, f"Expected {num_threads - 1} failures, got {len(failed_attempts)}"
        
        # All failures should be due to mutex contention
        for failure in failed_attempts:
            assert "Concurrent refresh detected" in failure['error']
        
        print(f"Concurrent refresh test completed in {time.time() - start_time:.2f}s")
        print(f"Successful: {len(successful_attempts)}, Failed: {len(failed_attempts)}")
    
    def test_replay_attack_detection_concurrent(self, session_manager):
        """Test replay attack detection under concurrent conditions."""
        family_id = 'test_family_replay'
        legitimate_jti = 'legitimate_jti_123'
        attacker_jti = 'attacker_jti_456'
        
        # Set up initial session state
        session_manager._session_state = {
            family_id: {
                'current_jti': legitimate_jti,
                'revoked_at': None,
                'reused_jti_of': None
            }
        }
        
        results_queue = queue.Queue()
        
        def legitimate_refresh():
            """Legitimate refresh attempt."""
            success, error = session_manager.rotate_session(
                family_id, legitimate_jti, 'new_legitimate_jti', 'legitimate_hash'
            )
            results_queue.put({
                'type': 'legitimate',
                'success': success,
                'error': error
            })
        
        def attacker_refresh():
            """Attacker refresh attempt with wrong JTI."""
            # Small delay to ensure legitimate request might go first
            time.sleep(0.01)
            success, error = session_manager.rotate_session(
                family_id, attacker_jti, 'attacker_new_jti', 'attacker_hash'
            )
            results_queue.put({
                'type': 'attacker',
                'success': success,
                'error': error
            })
        
        # Start both threads
        legit_thread = threading.Thread(target=legitimate_refresh)
        attack_thread = threading.Thread(target=attacker_refresh)
        
        legit_thread.start()
        attack_thread.start()
        
        # Wait for completion
        legit_thread.join(timeout=5)
        attack_thread.join(timeout=5)
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Analyze results
        legit_results = [r for r in results if r['type'] == 'legitimate']
        attack_results = [r for r in results if r['type'] == 'attacker']
        
        assert len(legit_results) == 1
        assert len(attack_results) == 1
        
        # Either the legitimate request succeeds and attacker fails,
        # or attacker triggers family revocation and both fail
        legit_result = legit_results[0]
        attack_result = attack_results[0]
        
        # Attacker should always fail
        assert attack_result['success'] is False
        assert any(phrase in attack_result['error'] for phrase in [
            "Token replay detected",
            "Concurrent refresh detected",
            "Session family not found"
        ])
        
        print(f"Legitimate result: {legit_result}")
        print(f"Attack result: {attack_result}")
    
    def test_jti_reuse_detection(self, session_manager):
        """Test JTI reuse detection."""
        family_id = 'test_family_reuse'
        reused_jti = 'reused_jti_123'
        
        # Set up session state with the JTI already used
        session_manager._session_state = {
            family_id: {
                'current_jti': reused_jti,
                'revoked_at': None,
                'reused_jti_of': None
            },
            'other_family': {
                'current_jti': 'other_jti',
                'revoked_at': None,
                'reused_jti_of': reused_jti  # This JTI was already reused
            }
        }
        
        # Mock the reuse check to return a result
        def mock_execute_with_reuse_check(query, params=None):
            mock_result = Mock()
            query_str = str(query)
            
            if "SELECT current_jti" in query_str:
                # Initial session state check
                mock_result.current_jti = reused_jti
                mock_result.revoked_at = None
                mock_result.reused_jti_of = None
                mock_result.fetchone.return_value = mock_result
            elif "SELECT id FROM auth_sessions" in query_str and "reused_jti_of" in query_str:
                # JTI reuse check - simulate finding existing usage
                mock_result.id = 'existing_session'
                mock_result.fetchone.return_value = mock_result
            else:
                mock_result.rowcount = 1
                mock_result.fetchone.return_value = None
            
            return mock_result
        
        # Patch the session execute method
        with patch.object(session_manager.connection_manager.session_scope.return_value.__enter__.return_value, 
                         'execute', side_effect=mock_execute_with_reuse_check):
            
            success, error = session_manager.rotate_session(
                family_id, reused_jti, 'new_jti_123', 'token_hash'
            )
            
            assert success is False
            assert "Token reuse detected" in error
    
    def test_high_concurrency_stress_test(self, session_manager):
        """Stress test with high concurrency to ensure system stability."""
        family_id = 'stress_test_family'
        current_jti = 'stress_current_jti'
        
        # Set up initial state
        session_manager._session_state = {
            family_id: {
                'current_jti': current_jti,
                'revoked_at': None,
                'reused_jti_of': None
            }
        }
        
        results_queue = queue.Queue()
        num_threads = 20  # High concurrency
        
        def stress_refresh(thread_id):
            """Stress test refresh attempt."""
            try:
                new_jti = f'stress_jti_{thread_id}_{int(time.time() * 1000)}'
                token_hash = f'stress_hash_{thread_id}'
                
                start_time = time.time()
                success, error = session_manager.rotate_session(
                    family_id, current_jti, new_jti, token_hash
                )
                duration = time.time() - start_time
                
                results_queue.put({
                    'thread_id': thread_id,
                    'success': success,
                    'error': error,
                    'duration': duration
                })
            except Exception as e:
                results_queue.put({
                    'thread_id': thread_id,
                    'success': False,
                    'error': f"Exception: {str(e)}",
                    'duration': 0
                })
        
        # Start all threads simultaneously
        threads = []
        start_time = time.time()
        
        for i in range(num_threads):
            thread = threading.Thread(target=stress_refresh, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads with timeout
        for thread in threads:
            thread.join(timeout=10)  # 10 second timeout
        
        total_duration = time.time() - start_time
        
        # Collect all results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Analyze results
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        exceptions = [r for r in results if 'Exception:' in r.get('error', '')]
        
        # Performance analysis
        if results:
            avg_duration = sum(r['duration'] for r in results) / len(results)
            max_duration = max(r['duration'] for r in results)
        else:
            avg_duration = max_duration = 0
        
        print(f"Stress test results:")
        print(f"  Total threads: {num_threads}")
        print(f"  Total duration: {total_duration:.2f}s")
        print(f"  Successful: {len(successful)}")
        print(f"  Failed: {len(failed)}")
        print(f"  Exceptions: {len(exceptions)}")
        print(f"  Average operation duration: {avg_duration:.3f}s")
        print(f"  Maximum operation duration: {max_duration:.3f}s")
        
        # Assertions
        assert len(results) == num_threads, "All threads should complete"
        assert len(exceptions) == 0, "No exceptions should occur"
        assert len(successful) == 1, "Exactly one thread should succeed"
        assert len(failed) == num_threads - 1, "All other threads should fail gracefully"
        
        # Performance assertions
        assert avg_duration < 1.0, "Average operation should be under 1 second"
        assert max_duration < 5.0, "No operation should take more than 5 seconds"
    
    def test_retry_after_concurrent_failure(self, session_manager):
        """Test that retry after concurrent failure works correctly."""
        family_id = 'retry_test_family'
        current_jti = 'retry_current_jti'
        
        # Set up initial state
        session_manager._session_state = {
            family_id: {
                'current_jti': current_jti,
                'revoked_at': None,
                'reused_jti_of': None
            }
        }
        
        # First attempt should succeed
        success1, error1 = session_manager.rotate_session(
            family_id, current_jti, 'new_jti_1', 'hash_1'
        )
        
        assert success1 is True
        assert error1 is None
        
        # Update current JTI for next attempt
        new_current_jti = 'new_jti_1'
        session_manager._session_state[family_id]['current_jti'] = new_current_jti
        
        # Simulate concurrent attempts
        results_queue = queue.Queue()
        
        def concurrent_attempt(thread_id):
            success, error = session_manager.rotate_session(
                family_id, new_current_jti, f'newer_jti_{thread_id}', f'hash_{thread_id}'
            )
            results_queue.put({'success': success, 'error': error})
        
        # Start two concurrent threads
        thread1 = threading.Thread(target=concurrent_attempt, args=(1,))
        thread2 = threading.Thread(target=concurrent_attempt, args=(2,))
        
        thread1.start()
        thread2.start()
        
        thread1.join(timeout=5)
        thread2.join(timeout=5)
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # One should succeed, one should fail with retry message
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        
        assert len(successful) == 1
        assert len(failed) == 1
        assert "Concurrent refresh detected" in failed[0]['error']
        assert "retry" in failed[0]['error'].lower()
        
        print("Retry test completed successfully")
    
    def test_family_revocation_propagation(self, session_manager):
        """Test that family revocation properly propagates and prevents further operations."""
        family_id = 'revocation_test_family'
        current_jti = 'revocation_current_jti'
        
        # Set up initial state
        session_manager._session_state = {
            family_id: {
                'current_jti': current_jti,
                'revoked_at': None,
                'reused_jti_of': None
            }
        }
        
        # Trigger family revocation through replay attack
        attacker_jti = 'attacker_jti_different'
        
        success, error = session_manager.rotate_session(
            family_id, attacker_jti, 'new_jti', 'hash'
        )
        
        assert success is False
        assert "Token replay detected" in error
        
        # Verify family is now revoked
        assert session_manager._session_state[family_id]['revoked_at'] is not None
        
        # Subsequent legitimate attempts should also fail
        success2, error2 = session_manager.rotate_session(
            family_id, current_jti, 'another_new_jti', 'another_hash'
        )
        
        assert success2 is False
        # Should fail because family is revoked (no active session found)
        assert "Session family not found" in error2
        
        print("Family revocation propagation test completed")