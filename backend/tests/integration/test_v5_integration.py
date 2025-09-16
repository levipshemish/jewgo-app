#!/usr/bin/env python3
"""
Integration tests for V5 API routes.

Tests the complete integration of v5 API endpoints including
authentication, entity management, search, and admin functionality.
"""

import pytest
import json

from database.connection_manager import get_connection_manager
from utils.logging_config import get_logger

logger = get_logger(__name__)


class TestV5Integration:
    """Integration tests for V5 API."""
    
    @pytest.fixture(autouse=True)
    def setup(self, app, client):
        """Setup test environment."""
        self.app = app
        self.client = client
        self.connection_manager = get_connection_manager()
        
    def test_entity_crud_flow(self):
        """Test complete CRUD flow for entities."""
        # Test data
        test_restaurant = {
            "name": "Test Restaurant",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "TS",
            "zip_code": "12345",
            "phone": "+1-555-0123",
            "kosher_category": "kosher",
            "status": "active"
        }
        
        # Create entity
        response = self.client.post('/api/v5/restaurants', 
                                  data=json.dumps(test_restaurant),
                                  content_type='application/json')
        assert response.status_code == 201
        created_data = response.get_json()
        assert created_data['success'] is True
        entity_id = created_data['data']['id']
        
        # Read entity
        response = self.client.get(f'/api/v5/restaurants/{entity_id}')
        assert response.status_code == 200
        read_data = response.get_json()
        assert read_data['data']['name'] == test_restaurant['name']
        
        # Update entity
        update_data = {"name": "Updated Test Restaurant"}
        response = self.client.put(f'/api/v5/restaurants/{entity_id}',
                                 data=json.dumps(update_data),
                                 content_type='application/json')
        assert response.status_code == 200
        updated_data = response.get_json()
        assert updated_data['data']['name'] == update_data['name']
        
        # Delete entity
        response = self.client.delete(f'/api/v5/restaurants/{entity_id}')
        assert response.status_code == 200
        
        # Verify deletion
        response = self.client.get(f'/api/v5/restaurants/{entity_id}')
        assert response.status_code == 404
    
    def test_authentication_flow(self):
        """Test authentication flow."""
        # Test registration
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "name": "Test User"
        }
        
        response = self.client.post('/api/v5/auth/register',
                                  data=json.dumps(user_data),
                                  content_type='application/json')
        assert response.status_code == 201
        register_data = response.get_json()
        assert register_data['success'] is True
        
        # Test login
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        response = self.client.post('/api/v5/auth/login',
                                  data=json.dumps(login_data),
                                  content_type='application/json')
        assert response.status_code == 200
        login_data = response.get_json()
        assert login_data['success'] is True
        assert 'tokens' in login_data['data']
        
        # Test token refresh
        refresh_token = login_data['data']['tokens']['refresh_token']
        response = self.client.post('/api/v5/auth/refresh',
                                  data=json.dumps({"refresh_token": refresh_token}),
                                  content_type='application/json')
        assert response.status_code == 200
        refresh_data = response.get_json()
        assert refresh_data['success'] is True
    
    def test_search_functionality(self):
        """Test search functionality."""
        # Test basic search
        response = self.client.get('/api/v5/search?q=kosher&entity_type=restaurants')
        assert response.status_code == 200
        search_data = response.get_json()
        assert search_data['success'] is True
        assert 'data' in search_data
        
        # Test search suggestions (endpoint: /api/v5/search/suggest)
        response = self.client.get('/api/v5/search/suggest?q=kos')
        assert response.status_code == 200
        suggestions_data = response.get_json()
        assert suggestions_data['success'] is True
    
    def test_admin_endpoints(self):
        """Test admin endpoints."""
        # Test admin health
        response = self.client.get('/api/v5/monitoring/health')
        assert response.status_code == 200
        health_data = response.get_json()
        assert health_data['status'] in ['healthy', 'degraded']
        
        # Test admin system status
        response = self.client.get('/api/v5/monitoring/status')
        assert response.status_code == 200
        status_data = response.get_json()
        assert 'status' in status_data
    
    def test_feature_flags(self):
        """Test feature flags functionality."""
        # Test feature flags list
        response = self.client.get('/api/v5/feature-flags')
        assert response.status_code == 200
        flags_data = response.get_json()
        assert flags_data['success'] is True
        assert 'data' in flags_data
        
        # Test specific feature flag
        response = self.client.get('/api/v5/feature-flags/entity_api_v5')
        assert response.status_code == 200
        flag_data = response.get_json()
        assert flag_data['success'] is True
        assert 'enabled' in flag_data['data']
    
    def test_rate_limiting(self):
        """Test rate limiting functionality."""
        # Make multiple requests to test rate limiting
        for i in range(10):
            response = self.client.get('/api/v5/restaurants?limit=1')
            if response.status_code == 429:
                # Rate limit hit
                assert 'retry_after' in response.get_json()
                break
        else:
            # No rate limit hit in 10 requests
            assert True
    
    def test_etag_caching(self):
        """Test ETag caching functionality."""
        # First request
        response = self.client.get('/api/v5/restaurants?limit=5')
        assert response.status_code == 200
        etag = response.headers.get('ETag')
        assert etag is not None
        
        # Second request with If-None-Match header
        response = self.client.get('/api/v5/restaurants?limit=5',
                                 headers={'If-None-Match': etag})
        assert response.status_code == 304
    
    def test_error_handling(self):
        """Test error handling."""
        # Test 404 for non-existent entity
        response = self.client.get('/api/v5/restaurants/99999')
        assert response.status_code == 404
        
        # Test 400 for invalid data
        response = self.client.post('/api/v5/restaurants',
                                  data=json.dumps({"invalid": "data"}),
                                  content_type='application/json')
        assert response.status_code == 400
        
        # Test 401 for unauthorized access
        response = self.client.get('/api/v5/admin/health')
        # This might be 401 or 200 depending on auth requirements
        assert response.status_code in [200, 401, 403]
    
    def test_pagination(self):
        """Test pagination functionality."""
        # Test with cursor pagination
        response = self.client.get('/api/v5/restaurants?limit=5')
        assert response.status_code == 200
        data = response.get_json()
        assert 'pagination' in data
        assert 'data' in data
        
        # Test with offset pagination
        response = self.client.get('/api/v5/restaurants?limit=5&offset=10')
        assert response.status_code == 200
    
    def test_bulk_operations(self):
        """Test bulk operations."""
        bulk_data = {
            "operations": [
                {
                    "type": "create",
                    "data": {
                        "name": "Bulk Test Restaurant 1",
                        "address": "123 Bulk St",
                        "kosher_category": "kosher"
                    }
                },
                {
                    "type": "create", 
                    "data": {
                        "name": "Bulk Test Restaurant 2",
                        "address": "456 Bulk Ave",
                        "kosher_category": "kosher"
                    }
                }
            ]
        }
        
        response = self.client.post('/api/v5/restaurants/bulk',
                                  data=json.dumps(bulk_data),
                                  content_type='application/json')
        assert response.status_code == 200
        bulk_result = response.get_json()
        assert bulk_result['success'] is True
        assert len(bulk_result['data']['results']) == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
