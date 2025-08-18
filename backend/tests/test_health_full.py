import pytest
from app_factory import create_app





from flask import Flask

#!/usr/bin/env python3
"""Test Health Endpoints.

Tests for the health check endpoints to ensure proper functionality.
"""

class TestHealthEndpoints:
    """Test cases for the health endpoints."""

    @pytest.fixture
    def app(self):
        """Create a test Flask app."""
        app = create_app()
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create a test client."""
        return app.test_client()

    def test_health_basic(self, client):
        """Test basic health endpoint."""
        response = client.get('/api/health/basic')
        
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert 'ts' in data

    def test_health_full(self, client):
        """Test full health endpoint."""
        response = client.get('/api/health/full')
        
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert 'status' in data
        assert 'ts' in data
        assert 'checks' in data
        assert 'warnings' in data
        
        # Check that required fields are present
        checks = data['checks']
        assert 'db' in checks
        assert 'restaurants_count' in checks
        assert 'hours_count' in checks
        
        # Status should be ok or degraded, not fail
        assert data['status'] in ['ok', 'degraded']
        
        # Warnings should be a list
        assert isinstance(data['warnings'], list)
