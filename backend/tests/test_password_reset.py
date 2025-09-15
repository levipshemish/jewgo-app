"""
Password reset functionality tests.

Tests the complete password reset flow including security measures.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

def utcnow():
    return datetime.now(timezone.utc)

@pytest.fixture
def mock_auth_manager():
    """Create a mock auth manager for testing."""
    from utils.postgres_auth import PostgresAuthManager
    
    mock_db = Mock()
    mock_session = Mock()
    mock_db.connection_manager.session_scope.return_value.__enter__.return_value = mock_session
    mock_db.connection_manager.session_scope.return_value.__exit__.return_value = None
    
    auth_manager = PostgresAuthManager(mock_db)
    auth_manager._session = mock_session  # Expose for test assertions
    return auth_manager

class TestPasswordResetFlow:
    """Test password reset initiation and completion."""

    def test_initiate_password_reset_existing_user(self, mock_auth_manager):
        """Test password reset initiation for existing user."""
        # Mock user exists
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(id='user123')
        
        result = mock_auth_manager.initiate_password_reset('test@example.com', '127.0.0.1')
        
        assert result is True
        # Should have called UPDATE to set reset token
        assert mock_auth_manager._session.execute.call_count >= 2

    def test_initiate_password_reset_nonexistent_user(self, mock_auth_manager):
        """Test password reset initiation for non-existent user (no enumeration)."""
        # Mock user doesn't exist
        mock_auth_manager._session.execute.return_value.fetchone.return_value = None
        
        result = mock_auth_manager.initiate_password_reset('nonexistent@example.com', '127.0.0.1')
        
        # Should still return True to prevent user enumeration
        assert result is True

    def test_initiate_password_reset_guest_user_excluded(self, mock_auth_manager):
        """Test that guest users are excluded from password reset."""
        # The query should include "is_guest = FALSE"
        mock_auth_manager._session.execute.return_value.fetchone.return_value = None
        
        result = mock_auth_manager.initiate_password_reset('guest-123@guest.local', '127.0.0.1')
        
        assert result is True  # Still returns True for security
        
        # Check that the query excluded guest users
        calls = mock_auth_manager._session.execute.call_args_list
        assert any('is_guest = FALSE' in str(call[0][0]) for call in calls)

    def test_reset_password_valid_token(self, mock_auth_manager):
        """Test successful password reset with valid token."""
        # Mock valid reset token
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(
            id='user123', 
            email='test@example.com'
        )
        
        result = mock_auth_manager.reset_password_with_token(
            'valid_token123', 
            'NewPassword123!', 
            '127.0.0.1'
        )
        
        assert result is True
        # Should have updated password and cleared reset token
        assert mock_auth_manager._session.execute.call_count >= 2

    def test_reset_password_expired_token(self, mock_auth_manager):
        """Test password reset with expired token."""
        # Mock expired token (no result returned)
        mock_auth_manager._session.execute.return_value.fetchone.return_value = None
        
        result = mock_auth_manager.reset_password_with_token(
            'expired_token', 
            'NewPassword123!', 
            '127.0.0.1'
        )
        
        assert result is False

    def test_reset_password_weak_password(self, mock_auth_manager):
        """Test password reset with weak password."""
        from utils.error_handler import ValidationError
        
        # Mock valid token
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(
            id='user123', 
            email='test@example.com'
        )
        
        with pytest.raises(ValidationError):
            mock_auth_manager.reset_password_with_token(
                'valid_token123', 
                'weak',  # Too weak
                '127.0.0.1'
            )

    def test_reset_password_clears_lockout(self, mock_auth_manager):
        """Test that password reset clears account lockout."""
        # Mock valid reset token
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(
            id='user123', 
            email='test@example.com'
        )
        
        result = mock_auth_manager.reset_password_with_token(
            'valid_token123', 
            'NewPassword123!', 
            '127.0.0.1'
        )
        
        assert result is True
        
        # Check that UPDATE query clears failed_login_attempts and locked_until
        calls = mock_auth_manager._session.execute.call_args_list
        update_call = next((call for call in calls if 'UPDATE users SET' in str(call[0][0])), None)
        assert update_call is not None
        
        query_str = str(update_call[0][0])
        assert 'failed_login_attempts = 0' in query_str
        assert 'locked_until = NULL' in query_str

class TestPasswordResetSecurity:
    """Test security aspects of password reset."""

    def test_reset_token_uniqueness(self, mock_auth_manager):
        """Test that reset tokens are unique."""
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(id='user123')
        
        # Generate multiple reset tokens
        tokens = []
        for _ in range(10):
            mock_auth_manager.initiate_password_reset('test@example.com', '127.0.0.1')
            
            # Extract token from the UPDATE call
            calls = mock_auth_manager._session.execute.call_args_list
            update_call = next((call for call in calls if 'reset_token = :reset_token' in str(call[0][0])), None)
            if update_call:
                token = update_call[0][1].get('reset_token')
                if token:
                    tokens.append(token)
            
            # Reset for next iteration
            mock_auth_manager._session.reset_mock()
        
        # All tokens should be unique
        assert len(tokens) == len(set(tokens))

    def test_reset_token_sufficient_entropy(self, mock_auth_manager):
        """Test that reset tokens have sufficient entropy."""
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(id='user123')
        
        mock_auth_manager.initiate_password_reset('test@example.com', '127.0.0.1')
        
        # Extract token from the UPDATE call
        calls = mock_auth_manager._session.execute.call_args_list
        update_call = next((call for call in calls if 'reset_token = :reset_token' in str(call[0][0])), None)
        assert update_call is not None
        
        token = update_call[0][1].get('reset_token')
        assert token is not None
        assert len(token) >= 32  # Should be long enough for security

    def test_reset_token_expiration_time(self, mock_auth_manager):
        """Test that reset tokens have appropriate expiration time."""
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(id='user123')
        
        before_time = utcnow()
        mock_auth_manager.initiate_password_reset('test@example.com', '127.0.0.1')
        after_time = utcnow()
        
        # Extract expiration time from the UPDATE call
        calls = mock_auth_manager._session.execute.call_args_list
        update_call = next((call for call in calls if 'reset_expires = :reset_expires' in str(call[0][0])), None)
        assert update_call is not None
        
        expires_at = update_call[0][1].get('reset_expires')
        assert expires_at is not None
        
        # Should expire in approximately 1 hour
        expected_min = before_time + timedelta(minutes=55)
        expected_max = after_time + timedelta(minutes=65)
        assert expected_min <= expires_at <= expected_max

class TestPasswordResetAuditing:
    """Test audit logging for password reset."""

    def test_password_reset_audit_logging(self, mock_auth_manager):
        """Test that password reset events are properly audited."""
        mock_auth_manager._session.execute.return_value.fetchone.return_value = Mock(id='user123')
        
        # Mock _log_auth_event to capture calls
        with patch.object(mock_auth_manager, '_log_auth_event') as mock_log:
            mock_auth_manager.initiate_password_reset('test@example.com', '127.0.0.1')
            
            # Should log the password reset request
            mock_log.assert_called_once()
            args = mock_log.call_args[0]
            
            assert args[0] == 'user123'  # user_id
            assert args[1] == 'password_reset_requested'  # action
            assert args[2] is True  # success

    def test_failed_reset_audit_logging(self, mock_auth_manager):
        """Test that failed password reset attempts are audited."""
        mock_auth_manager._session.execute.return_value.fetchone.return_value = None
        
        with patch.object(mock_auth_manager, '_log_auth_event') as mock_log:
            mock_auth_manager.initiate_password_reset('nonexistent@example.com', '127.0.0.1')
            
            # Should log the failed attempt
            mock_log.assert_called_once()
            args = mock_log.call_args[0]
            
            assert args[0] is None  # user_id (unknown user)
            assert args[1] == 'password_reset_requested'  # action
            assert args[2] is False  # success

class TestPasswordResetAPIEndpoints:
    """Test password reset API endpoints."""

    def test_forgot_password_rate_limiting(self):
        """Test that forgot password endpoint has appropriate rate limiting."""
        # This would be an integration test with Flask app
        pass

    def test_forgot_password_csrf_protection(self):
        """Test that forgot password endpoint requires CSRF token."""
        # This would be an integration test with Flask app
        pass

    def test_reset_password_csrf_protection(self):
        """Test that reset password endpoint requires CSRF token."""
        # This would be an integration test with Flask app
        pass

if __name__ == '__main__':
    pytest.main([__file__, '-v'])