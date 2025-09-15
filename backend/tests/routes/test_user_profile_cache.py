"""
Test contract tests for ETag/304 and rate limiting in user profile endpoints.

This module tests the caching and rate limiting behavior of the user profile endpoint,
ensuring proper ETag handling, 304 responses, and rate limiting per user.
"""

import pytest
from freezegun import freeze_time
from datetime import datetime
from flask import Flask, jsonify, request


class TestUserProfileCache:
    """Test suite for user profile caching and rate limiting."""

    @pytest.fixture
    def app(self):
        """Create a minimal test application with user profile endpoint."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Simple in-memory rate limiting store
        rate_limit_store = {}
        
        # Mock user profile endpoint with ETag and rate limiting
        @app.route('/api/user/profile', methods=['GET'])
        def get_user_profile():
            # Mock authentication
            user_id = request.headers.get('X-User-ID', 'user-123')
            
            # Simple rate limiting (60 requests per minute)
            current_time = datetime.now()
            minute_key = current_time.strftime('%Y-%m-%d-%H-%M')
            user_key = f"{user_id}:{minute_key}"
            
            # Check rate limit
            if user_key in rate_limit_store:
                if rate_limit_store[user_key] >= 60:
                    return jsonify({'error': 'Rate limit exceeded'}), 429
                rate_limit_store[user_key] += 1
            else:
                rate_limit_store[user_key] = 1
            
            # Mock profile data
            profile_data = {
                'id': user_id,
                'email': f'{user_id}@example.com',
                'name': f'User {user_id}',
                'updated_at': '2024-01-01T12:00:00Z'
            }
            
            # Generate ETag based on user ID and data
            import hashlib
            etag_data = f"{user_id}:{profile_data['updated_at']}"
            etag = f'"{hashlib.md5(etag_data.encode()).hexdigest()}"'
            
            # Check If-None-Match header
            if_none_match = request.headers.get('If-None-Match')
            if if_none_match == etag:
                response = app.response_class(status=304)
                response.headers['ETag'] = etag
                response.headers['Vary'] = 'Authorization'
                return response
            
            # Return 200 with ETag
            response = jsonify(profile_data)
            response.headers['ETag'] = etag
            response.headers['Cache-Control'] = 'private, max-age=300'
            response.headers['Vary'] = 'Authorization'
            return response
        
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @pytest.fixture
    def auth_user(self):
        """Create a mock authenticated user."""
        return {
            'id': 'user-123',
            'email': 'test@example.com',
            'name': 'Test User',
            'role': 'user'
        }

    @pytest.fixture
    def another_user(self):
        """Create another mock authenticated user."""
        return {
            'id': 'user-456',
            'email': 'another@example.com',
            'name': 'Another User',
            'role': 'user'
        }

    @pytest.fixture
    def freezer(self):
        """Create a freezer instance for time manipulation."""
        return freeze_time("2024-01-01 12:00:00")

    def test_profile_etag_and_304(self, client, auth_user, freezer):
        """Test ETag generation and 304 Not Modified responses."""
        with freezer:
            # First GET request - should return 200 with ETag
            response1 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': auth_user['id']})
            
            assert response1.status_code == 200
            assert 'ETag' in response1.headers
            etag = response1.headers['ETag']
            assert etag.startswith('"') and etag.endswith('"')
            
            # Check cache control headers
            assert 'Cache-Control' in response1.headers
            cache_control = response1.headers['Cache-Control']
            assert 'private' in cache_control
            
            # Second GET request with If-None-Match header - should return 304
            response2 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': auth_user['id'], 
                                         'If-None-Match': etag})
            
            assert response2.status_code == 304
            assert response2.headers['ETag'] == etag
            assert len(response2.data) == 0  # 304 should have no body

    def test_profile_rate_limit_per_user(self, client, auth_user, freezer):
        """Test rate limiting per user (60 requests per minute)."""
        with freezer:
            # Make 60 requests within the rate limit
            for i in range(60):
                response = client.get('/api/user/profile', 
                                    headers={'X-User-ID': auth_user['id']})
                assert response.status_code in [200, 304]  # Both are allowed
            
            # 61st request should be rate limited
            response = client.get('/api/user/profile', 
                                headers={'X-User-ID': auth_user['id']})
            assert response.status_code == 429
            
            # Advance time by 61 seconds using a new freeze_time context
            with freeze_time("2024-01-01 12:01:01"):
                # Should be allowed again
                response = client.get('/api/user/profile', 
                                    headers={'X-User-ID': auth_user['id']})
                assert response.status_code in [200, 304]

    def test_profile_vary_authorization_prevents_cross_user_mixup(self, client, auth_user, another_user, freezer):
        """Test that ETags are user-specific and don't cross-contaminate."""
        with freezer:
            # Get ETag for first user
            response1 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': auth_user['id']})
            assert response1.status_code == 200
            etag_user1 = response1.headers['ETag']
            
            # Check Vary header includes Authorization
            assert 'Vary' in response1.headers
            vary_header = response1.headers['Vary']
            assert 'Authorization' in vary_header
            
            # Get ETag for second user
            response2 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': another_user['id']})
            assert response2.status_code == 200
            etag_user2 = response2.headers['ETag']
            
            # ETags should be different for different users
            assert etag_user1 != etag_user2
            
            # User 1's ETag should not work for User 2
            response3 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': another_user['id'],
                                         'If-None-Match': etag_user1})
            assert response3.status_code == 200  # Should return full response, not 304
            
            # User 2's ETag should not work for User 1
            response4 = client.get('/api/user/profile', 
                                 headers={'X-User-ID': auth_user['id'],
                                         'If-None-Match': etag_user2})
            assert response4.status_code == 200  # Should return full response, not 304

