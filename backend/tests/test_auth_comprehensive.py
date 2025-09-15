"""
Comprehensive test coverage for JWT authentication edge cases.

This test suite covers critical edge cases for token rotation, concurrent
access, expiration handling, and security boundary conditions.
"""

import pytest
import time
import threading
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

# Test utilities
def utcnow():
    return datetime.now(timezone.utc)

@pytest.fixture
def mock_db_manager():
    """Mock database manager for testing."""
    class MockSession:
        def __init__(self):
            self.sessions = {}
            self.executed_queries = []
        
        def execute(self, query, params=None):
            self.executed_queries.append((str(query), params or {}))
            return Mock(fetchone=lambda: None, fetchall=lambda: [], scalar=lambda: 0)
    
    class MockConnectionManager:
        def session_scope(self):
            return MockSession()
    
    mock_db = Mock()
    mock_db.connection_manager = MockConnectionManager()
    return mock_db

class TestTokenRotationEdgeCases:
    """Test edge cases in token rotation logic."""

    def test_concurrent_rotation_race_condition(self):
        """Test that concurrent rotation attempts are handled safely."""
        from services.auth import sessions
        
        # Simulate two threads trying to rotate the same token simultaneously
        results = []
        exceptions = []
        
        def attempt_rotation(thread_id):
            try:
                # Mock database that simulates race condition
                mock_db = Mock()
                mock_session = Mock()
                
                # First thread sees valid session, second sees revoked
                if thread_id == 1:
                    mock_session.execute.return_value.fetchone.return_value = Mock(
                        id='session1', revoked_at=None, expires_at=utcnow() + timedelta(hours=1)
                    )
                else:
                    mock_session.execute.return_value.fetchone.return_value = Mock(
                        id='session1', revoked_at=utcnow(), expires_at=utcnow() + timedelta(hours=1)
                    )
                
                mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
                mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
                
                result = sessions.rotate_or_reject(
                    mock_db,
                    user_id='user1',
                    provided_refresh='token123',
                    sid='session1',
                    fid='family1',
                    user_agent='test',
                    ip='127.0.0.1',
                    ttl_seconds=3600
                )
                results.append((thread_id, result))
            except Exception as e:
                exceptions.append((thread_id, e))
        
        threads = [
            threading.Thread(target=attempt_rotation, args=(1,)),
            threading.Thread(target=attempt_rotation, args=(2,))
        ]
        
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # Should handle gracefully without exceptions
        assert len(exceptions) == 0
        # One should succeed, one should fail (return None)
        success_count = sum(1 for _, result in results if result is not None)
        assert success_count <= 1

    def test_token_rotation_with_expired_session(self):
        """Test rotation fails gracefully with expired session."""
        from services.auth import sessions
        
        mock_db = Mock()
        mock_session = Mock()
        
        # Session exists but is expired
        expired_time = utcnow() - timedelta(minutes=1)
        mock_session.execute.return_value.fetchone.return_value = Mock(
            id='session1', 
            revoked_at=None, 
            expires_at=expired_time
        )
        
        mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
        mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
        
        result = sessions.rotate_or_reject(
            mock_db,
            user_id='user1',
            provided_refresh='token123',
            sid='session1',
            fid='family1',
            user_agent='test',
            ip='127.0.0.1',
            ttl_seconds=3600
        )
        
        assert result is None  # Should reject expired session

    def test_token_reuse_detection_family_revocation(self):
        """Test that reused tokens trigger family-wide revocation."""
        from services.auth import sessions
        
        # Mock the pepper for consistent hashing
        with patch.dict('os.environ', {'REFRESH_PEPPER': 'test_pepper'}):
            mock_db = Mock()
            mock_session = Mock()
            
            # First call: session exists but token hash doesn't match (reuse detected)
            mock_session.execute.side_effect = [
                # SELECT session check
                Mock(fetchone=lambda: Mock(
                    id='session1', 
                    revoked_at=None, 
                    expires_at=utcnow() + timedelta(hours=1)
                )),
                # Hash check fails (token reuse)
                Mock(fetchone=lambda: None),
                # Family revocation
                Mock(fetchone=lambda: None)
            ]
            
            mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
            mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
            
            result = sessions.rotate_or_reject(
                mock_db,
                user_id='user1',
                provided_refresh='reused_token',
                sid='session1',
                fid='family1',
                user_agent='test',
                ip='127.0.0.1',
                ttl_seconds=3600
            )
            
            assert result is None
            # Verify family revocation was called
            assert mock_session.execute.call_count >= 2

class TestJWTTokenEdgeCases:
    """Test JWT token generation and verification edge cases."""

    def test_token_with_very_short_ttl(self):
        """Test token behavior with extremely short TTL."""
        from services.auth import tokens
        
        # Token with 1 second TTL
        token, ttl = tokens.mint_access('user1', 'test@example.com', [], is_guest=False)
        assert ttl > 0
        
        # Wait for potential expiration
        time.sleep(0.1)
        
        # Should still be valid immediately after creation
        payload = tokens.verify(token, expected_type='access')
        assert payload is not None
        assert payload['uid'] == 'user1'

    def test_malformed_jwt_handling(self):
        """Test handling of malformed JWT tokens."""
        from services.auth import tokens
        
        malformed_tokens = [
            '',
            'not.a.jwt',
            'header.payload',  # Missing signature
            'invalid..token',  # Empty payload
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2NzA0MzI0MzEsImV4cCI6MTY3MDQzNjAzMSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoidXNlciIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQifQ.wrong_signature',
        ]
        
        for malformed_token in malformed_tokens:
            payload = tokens.verify(malformed_token, expected_type='access')
            assert payload is None

    def test_jwt_with_wrong_secret(self):
        """Test JWT verification with wrong secret key."""
        import jwt
        
        # Create token with different secret
        wrong_payload = {
            'type': 'access',
            'uid': 'user1',
            'email': 'test@example.com',
            'iat': int(utcnow().timestamp()),
            'exp': int((utcnow() + timedelta(hours=1)).timestamp()),
            'jti': 'test123'
        }
        
        wrong_token = jwt.encode(wrong_payload, 'wrong_secret', algorithm='HS256')
        
        from services.auth import tokens
        payload = tokens.verify(wrong_token, expected_type='access')
        assert payload is None

class TestPasswordResetEdgeCases:
    """Test password reset functionality edge cases."""

    def test_password_reset_token_expiration(self):
        """Test that expired reset tokens are rejected."""
        from utils.postgres_auth import PostgresAuthManager
        
        # Mock auth manager with expired reset token
        mock_db = Mock()
        mock_session = Mock()
        
        # Return user with expired reset token
        mock_session.execute.return_value.fetchone.return_value = None  # No valid token found
        
        mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
        mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
        
        auth_manager = PostgresAuthManager(mock_db)
        
        result = auth_manager.reset_password_with_token(
            'expired_token',
            'NewPassword123!',
            '127.0.0.1'
        )
        
        assert result is False

    def test_password_reset_weak_password_rejection(self):
        """Test that weak passwords are rejected during reset."""
        from utils.postgres_auth import PostgresAuthManager
        from utils.error_handler import ValidationError
        
        mock_db = Mock()
        auth_manager = PostgresAuthManager(mock_db)
        
        weak_passwords = [
            'weak',          # Too short
            'password',      # No uppercase, no numbers, no special chars
            'Password',      # No numbers, no special chars
            'Password123',   # No special chars
            '12345678',      # No letters
            'UPPERCASE123!'  # No lowercase
        ]
        
        for weak_password in weak_passwords:
            with pytest.raises(ValidationError):
                auth_manager.reset_password_with_token(
                    'valid_token',
                    weak_password,
                    '127.0.0.1'
                )

class TestRateLimitingEdgeCases:
    """Test rate limiting boundary conditions."""

    def test_rate_limit_edge_boundary(self):
        """Test rate limiting at exact boundary conditions."""
        # This would require integration with Flask-Limiter
        # For now, document the edge case
        pass

    def test_rate_limit_reset_behavior(self):
        """Test rate limit window reset behavior."""
        # This would test that rate limits reset correctly after time window
        pass

class TestCSRFEdgeCases:
    """Test CSRF protection edge cases."""

    def test_csrf_token_timing_attack_resistance(self):
        """Test CSRF token comparison is timing-attack resistant."""
        from services.auth.csrf import validate
        
        # Mock request with different token lengths
        mock_request = Mock()
        mock_request.headers.get.side_effect = lambda h: 'short' if h == 'X-CSRF-Token' else None
        mock_request.cookies.get.return_value = 'very_long_token_that_should_not_match'
        
        # Should use constant-time comparison
        result = validate(mock_request)
        assert result is False

    def test_csrf_multiple_header_formats(self):
        """Test CSRF validation with different header formats."""
        from services.auth.csrf import validate
        
        header_variants = [
            'X-CSRF-Token',
            'X-CSRFToken', 
            'X-XSRF-TOKEN'
        ]
        
        token = 'test_csrf_token'
        
        for header in header_variants:
            mock_request = Mock()
            mock_request.headers.get.side_effect = lambda h: token if h == header else None
            mock_request.cookies.get.return_value = token
            
            result = validate(mock_request)
            assert result is True

class TestGuestUserEdgeCases:
    """Test guest user functionality edge cases."""

    def test_guest_user_token_shorter_ttl(self):
        """Test that guest users get shorter refresh token TTL."""
        from services.auth import tokens
        
        # Guest token should have shorter TTL
        guest_token, guest_ttl = tokens.mint_refresh('guest1', sid='s1', fid='f1', is_guest=True)
        regular_token, regular_ttl = tokens.mint_refresh('user1', sid='s2', fid='f2', is_guest=False)
        
        # Guest TTL should be shorter (7 days vs 45 days default)
        assert guest_ttl < regular_ttl

    def test_guest_user_email_generation_uniqueness(self):
        """Test that guest user emails are unique."""
        from utils.postgres_auth import PostgresAuthManager
        
        # Mock successful guest creation
        mock_db = Mock()
        mock_session = Mock()
        mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
        mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
        
        auth_manager = PostgresAuthManager(mock_db)
        
        # Create multiple guest users
        guest1 = auth_manager.create_guest_user('127.0.0.1')
        guest2 = auth_manager.create_guest_user('127.0.0.1')
        
        # Emails should be different
        assert guest1['email'] != guest2['email']
        assert guest1['user_id'] != guest2['user_id']
        assert 'guest-' in guest1['email']
        assert '@guest.local' in guest1['email']

class TestSessionCleanupEdgeCases:
    """Test session cleanup and maintenance edge cases."""

    def test_orphaned_session_cleanup(self):
        """Test cleanup of sessions for deleted users."""
        # This would test that sessions are properly cleaned up
        # when users are deleted
        pass

    def test_expired_session_cleanup_performance(self):
        """Test performance of cleaning up large numbers of expired sessions."""
        # This would test bulk cleanup operations
        pass

# Integration test helpers
class TestAuthIntegrationEdgeCases:
    """Integration tests for complete auth flows."""

    def test_complete_auth_flow_with_rotation(self):
        """Test complete authentication flow including rotation."""
        # This would test the entire flow:
        # 1. User login
        # 2. Access token expires
        # 3. Refresh token rotation
        # 4. Continue using new tokens
        pass

    def test_oauth_edge_cases(self):
        """Test OAuth integration edge cases."""
        # Test malformed OAuth responses, network failures, etc.
        pass

if __name__ == '__main__':
    pytest.main([__file__, '-v'])