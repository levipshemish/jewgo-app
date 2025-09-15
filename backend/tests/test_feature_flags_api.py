#!/usr/bin/env python3
"""
Tests for feature flags API v5.

Tests the feature flags API endpoints including getting all flags,
checking specific flags, and migration status.
"""

import json
from unittest.mock import patch
from flask import Flask

# Import the feature flags API blueprint
from routes.v5.feature_flags_api import feature_flags_bp


class TestFeatureFlagsAPI:
    """Test feature flags API v5."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.app.register_blueprint(feature_flags_bp)
    
    @patch('routes.v5.feature_flags_api.feature_flags_v5')
    def test_get_all_feature_flags_success(self, mock_feature_flags):
        """Test successful retrieval of all feature flags."""
        mock_feature_flags.get_all_flags.return_value = {
            'api_v5_enabled': True,
            'new_search_enabled': False,
            'experimental_features': True
        }
        mock_feature_flags.get_migration_status.return_value = {
            'timestamp': '2025-01-20T10:00:00Z',
            'status': 'active'
        }
        
        with self.app.test_client() as client:
            response = client.get('/api/v5/feature-flags/')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'data' in data
            assert 'timestamp' in data
            assert data['data']['api_v5_enabled'] is True
    
    @patch('routes.v5.feature_flags_api.feature_flags_v5')
    def test_get_all_feature_flags_with_user_context(self, mock_feature_flags):
        """Test getting feature flags with user context."""
        mock_feature_flags.get_all_flags.return_value = {
            'user_specific_flag': True
        }
        mock_feature_flags.get_migration_status.return_value = {
            'timestamp': '2025-01-20T10:00:00Z'
        }
        
        with self.app.test_client() as client:
            # Mock g.user_id
            with self.app.test_request_context():
                from flask import g
                g.user_id = 123
                response = client.get('/api/v5/feature-flags/')
                
                assert response.status_code == 200
                mock_feature_flags.get_all_flags.assert_called_with(user_id=123)
    
    @patch('routes.v5.feature_flags_api.feature_flags_v5')
    def test_get_all_feature_flags_error(self, mock_feature_flags):
        """Test error handling in feature flags retrieval."""
        mock_feature_flags.get_all_flags.side_effect = Exception("Database error")
        
        with self.app.test_client() as client:
            response = client.get('/api/v5/feature-flags/')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'error' in data
    
    @patch('routes.v5.feature_flags_api.feature_flags_v5')
    def test_get_migration_status_success(self, mock_feature_flags):
        """Test successful retrieval of migration status."""
        mock_feature_flags.get_migration_status.return_value = {
            'timestamp': '2025-01-20T10:00:00Z',
            'status': 'active',
            'progress': 85,
            'features_migrated': ['api_v5', 'search_v5']
        }
        
        with self.app.test_client() as client:
            response = client.get('/api/v5/feature-flags/status')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'data' in data
            assert data['data']['status'] == 'active'
            assert data['data']['progress'] == 85
    
    @patch('routes.v5.feature_flags_api.feature_flags_v5')
    def test_get_migration_status_error(self, mock_feature_flags):
        """Test error handling in migration status retrieval."""
        mock_feature_flags.get_migration_status.side_effect = Exception("Service unavailable")
        
        with self.app.test_client() as client:
            response = client.get('/api/v5/feature-flags/status')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'error' in data
    
    def test_feature_flags_blueprint_registration(self):
        """Test that the feature flags blueprint is properly registered."""
        assert feature_flags_bp.name == 'feature_flags_api'
        assert feature_flags_bp.url_prefix == '/api/v5/feature-flags'
    
    def test_feature_flags_routes_exist(self):
        """Test that all expected routes exist."""
        with self.app.test_client() as client:
            # Test that routes exist (even if they return errors due to missing dependencies)
            response = client.get('/api/v5/feature-flags/')
            # Should not return 404
            assert response.status_code != 404
            
            response = client.get('/api/v5/feature-flags/status')
            # Should not return 404
            assert response.status_code != 404
