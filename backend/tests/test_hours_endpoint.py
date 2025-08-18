import pytest
from app_factory import create_app





from flask import Flask

#!/usr/bin/env python3
"""Test Hours Endpoint.

Tests for the restaurant hours endpoint to ensure proper 404 handling.
"""

class TestHoursEndpoint:
    """Test cases for the restaurant hours endpoint."""

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

    def test_hours_endpoint_not_found(self, client):
        """Test that non-existent restaurant returns 404."""
        response = client.get('/api/restaurants/999999/hours')
        
        assert response.status_code == 404
        assert response.is_json
        
        data = response.get_json()
        assert 'error' in data
        assert data['error']['code'] == 'NOT_FOUND'
        assert 'Restaurant with ID 999999 not found' in data['error']['message']

    def test_hours_endpoint_invalid_id(self, client):
        """Test that invalid restaurant ID returns 400."""
        response = client.get('/api/restaurants/0/hours')
        
        assert response.status_code == 400
        assert response.is_json
        
        data = response.get_json()
        assert 'error' in data
        assert data['error']['code'] == 'VALIDATION_ERROR'

    def test_hours_endpoint_negative_id(self, client):
        """Test that negative restaurant ID returns 400."""
        response = client.get('/api/restaurants/-1/hours')
        
        assert response.status_code == 400
        assert response.is_json
        
        data = response.get_json()
        assert 'error' in data
        assert data['error']['code'] == 'VALIDATION_ERROR'
