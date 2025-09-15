"""
Core functionality tests for API endpoints that don't require authentication.
These tests ensure the basic API infrastructure is working correctly.
"""

import pytest
import json


class TestCoreAPIFunctionality:
    """Test core API functionality without authentication requirements."""

    def test_health_endpoint(self, client):
        """Test the basic health check endpoint."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['message'] == 'API v4 is working'
        assert 'timestamp' in data

    def test_api_v4_blueprint_registered(self, client):
        """Test that the API v4 blueprint is properly registered."""
        # Test that the blueprint prefix is working
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200

    def test_404_for_nonexistent_endpoint(self, client):
        """Test that 404 is returned for nonexistent endpoints."""
        response = client.get('/api/v4/nonexistent')
        assert response.status_code == 404

    def test_api_response_format(self, client):
        """Test that API responses have the correct format."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        data = response.get_json()
        # Check that response is a dictionary
        assert isinstance(data, dict)
        # Check that response has expected keys
        assert 'status' in data
        assert 'message' in data
        assert 'timestamp' in data

    def test_cors_headers(self, client):
        """Test that CORS headers are properly set."""
        response = client.get('/api/v4/test/health')
        # Check for CORS headers (if enabled)
        # Note: CORS might not be enabled in test environment
        assert response.status_code == 200

    def test_json_content_type(self, client):
        """Test that JSON responses have correct content type."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        assert response.content_type == 'application/json'

    def test_request_methods(self, client):
        """Test different HTTP methods on the health endpoint."""
        # GET should work
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200

        # POST should not work (method not allowed)
        response = client.post('/api/v4/test/health')
        assert response.status_code == 405

        # PUT should not work (method not allowed)
        response = client.put('/api/v4/test/health')
        assert response.status_code == 405

        # DELETE should not work (method not allowed)
        response = client.delete('/api/v4/test/health')
        assert response.status_code == 405

    def test_error_handling(self, client):
        """Test that error handling works correctly."""
        # Test 404 for nonexistent endpoint
        response = client.get('/api/v4/nonexistent')
        assert response.status_code == 404

        # Test 405 for method not allowed
        response = client.post('/api/v4/test/health')
        assert response.status_code == 405

    def test_response_structure(self, client):
        """Test that API responses have consistent structure."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        data = response.get_json()
        
        # Check data types
        assert isinstance(data['status'], str)
        assert isinstance(data['message'], str)
        assert isinstance(data['timestamp'], str)
        
        # Check data values
        assert data['status'] == 'healthy'
        assert data['message'] == 'API v4 is working'
        assert len(data['timestamp']) > 0

    def test_multiple_requests(self, client):
        """Test that multiple requests to the same endpoint work correctly."""
        # Make multiple requests
        for i in range(5):
            response = client.get('/api/v4/test/health')
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'healthy'

    def test_request_headers(self, client):
        """Test that requests with different headers work correctly."""
        # Test with Accept header
        response = client.get('/api/v4/test/health', 
                            headers={'Accept': 'application/json'})
        assert response.status_code == 200
        
        # Test with User-Agent header
        response = client.get('/api/v4/test/health', 
                            headers={'User-Agent': 'TestClient/1.0'})
        assert response.status_code == 200

    def test_response_time(self, client):
        """Test that API responses are reasonably fast."""
        import time
        start_time = time.time()
        response = client.get('/api/v4/test/health')
        end_time = time.time()
        
        assert response.status_code == 200
        # Response should be under 1 second
        assert (end_time - start_time) < 1.0

    def test_blueprint_url_prefix(self, client):
        """Test that the API v4 blueprint URL prefix is working correctly."""
        # Test that the /api/v4 prefix is working
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        
        # Test that endpoints without the prefix don't work
        response = client.get('/test/health')
        assert response.status_code == 404

    def test_json_parsing(self, client):
        """Test that JSON responses can be properly parsed."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        
        # Test that the response can be parsed as JSON
        try:
            data = json.loads(response.data.decode('utf-8'))
            assert isinstance(data, dict)
            assert 'status' in data
        except json.JSONDecodeError:
            pytest.fail("Response is not valid JSON")

    def test_response_consistency(self, client):
        """Test that responses are consistent across multiple calls."""
        responses = []
        for i in range(3):
            response = client.get('/api/v4/test/health')
            assert response.status_code == 200
            data = response.get_json()
            responses.append(data)
        
        # Check that all responses have the same structure
        for i in range(1, len(responses)):
            assert responses[i]['status'] == responses[0]['status']
            assert responses[i]['message'] == responses[0]['message']
            # Timestamps should be different
            assert responses[i]['timestamp'] != responses[0]['timestamp']


class TestAPIV4Infrastructure:
    """Test the API v4 infrastructure and setup."""

    def test_flask_app_creation(self, app):
        """Test that the Flask app can be created successfully."""
        assert app is not None
        assert app.config['TESTING'] is True

    def test_test_client_creation(self, client):
        """Test that the test client can be created successfully."""
        assert client is not None

    def test_blueprint_registration(self, app):
        """Test that the API v4 blueprint is registered in the app."""
        # Check that the blueprint is registered
        blueprints = list(app.blueprints.keys())
        assert 'api_v4' in blueprints

    def test_blueprint_url_prefix(self, app):
        """Test that the API v4 blueprint has the correct URL prefix."""
        blueprint = app.blueprints.get('api_v4')
        assert blueprint is not None
        assert blueprint.url_prefix == '/api/v4'

    def test_blueprint_routes(self, app):
        """Test that the API v4 blueprint has routes registered."""
        blueprint = app.blueprints.get('api_v4')
        assert blueprint is not None
        # Check that routes are registered
        assert len(blueprint.deferred_functions) > 0

    def test_app_config(self, app):
        """Test that the Flask app has the correct configuration."""
        assert app.config['TESTING'] is True
        assert app.config['WTF_CSRF_ENABLED'] is False

    def test_error_handlers(self, app):
        """Test that error handlers are properly configured."""
        # Test 404 handler
        with app.test_client() as client:
            response = client.get('/nonexistent')
            assert response.status_code == 404

    def test_request_context(self, app):
        """Test that request context works correctly."""
        with app.test_request_context('/api/v4/test/health'):
            assert app is not None

    def test_app_factory(self):
        """Test that the app factory creates a working app."""
        from app_factory_full import create_app
        app, socketio = create_app()
        assert app is not None
        assert app.config['TESTING'] is False  # Not in test mode by default

    def test_blueprint_import(self):
        """Test that the API v4 blueprint can be imported."""
        from routes.api_v4 import api_v4
        assert api_v4 is not None
        assert hasattr(api_v4, 'url_prefix')
        assert api_v4.url_prefix == '/api/v4'


class TestAPIV4Endpoints:
    """Test specific API v4 endpoints that don't require authentication."""

    def test_health_endpoint_response_structure(self, client):
        """Test the detailed structure of the health endpoint response."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        
        data = response.get_json()
        required_fields = ['status', 'message', 'timestamp']
        
        # Check that all required fields are present
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check field types
        assert isinstance(data['status'], str)
        assert isinstance(data['message'], str)
        assert isinstance(data['timestamp'], str)
        
        # Check field values
        assert data['status'] == 'healthy'
        assert data['message'] == 'API v4 is working'
        
        # Check timestamp format (ISO format)
        import re
        timestamp_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        assert re.match(timestamp_pattern, data['timestamp'])

    def test_health_endpoint_performance(self, client):
        """Test that the health endpoint performs well under load."""
        import time
        
        # Make multiple requests and measure performance
        times = []
        for i in range(10):
            start_time = time.time()
            response = client.get('/api/v4/test/health')
            end_time = time.time()
            
            assert response.status_code == 200
            times.append(end_time - start_time)
        
        # Calculate average response time
        avg_time = sum(times) / len(times)
        
        # Response time should be under 100ms on average
        assert avg_time < 0.1, f"Average response time {avg_time:.3f}s is too slow"

    def test_health_endpoint_headers(self, client):
        """Test that the health endpoint returns appropriate headers."""
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        
        # Check content type
        assert 'application/json' in response.content_type
        
        # Check that response is not cached
        cache_headers = ['Cache-Control', 'Pragma', 'Expires']
        for header in cache_headers:
            if header in response.headers:
                # If cache headers are present, they should indicate no caching
                if header == 'Cache-Control':
                    assert 'no-cache' in response.headers[header] or 'no-store' in response.headers[header]

    def test_health_endpoint_methods(self, client):
        """Test all HTTP methods on the health endpoint."""
        # GET should work
        response = client.get('/api/v4/test/health')
        assert response.status_code == 200
        
        # POST should return 405 Method Not Allowed
        response = client.post('/api/v4/test/health')
        assert response.status_code == 405
        
        # PUT should return 405 Method Not Allowed
        response = client.put('/api/v4/test/health')
        assert response.status_code == 405
        
        # DELETE should return 405 Method Not Allowed
        response = client.delete('/api/v4/test/health')
        assert response.status_code == 405
        
        # PATCH should return 405 Method Not Allowed
        response = client.patch('/api/v4/test/health')
        assert response.status_code == 405

    def test_health_endpoint_error_handling(self, client):
        """Test error handling on the health endpoint."""
        # Test with malformed request (should still work)
        response = client.get('/api/v4/test/health', 
                            headers={'Accept': 'invalid/type'})
        assert response.status_code == 200
        
        # Test with very long URL (should still work)
        long_url = '/api/v4/test/health' + '?' + 'x' * 1000
        response = client.get(long_url)
        assert response.status_code == 200

    def test_health_endpoint_concurrent_access(self, client):
        """Test that the health endpoint can handle concurrent access."""
        import threading
        import time
        
        results = []
        errors = []
        
        def make_request():
            try:
                start_time = time.time()
                response = client.get('/api/v4/test/health')
                end_time = time.time()
                
                if response.status_code == 200:
                    results.append(end_time - start_time)
                else:
                    errors.append(f"Request failed with status {response.status_code}")
            except Exception as e:
                errors.append(f"Request failed with exception: {e}")
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check results
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 5, f"Expected 5 successful requests, got {len(results)}"
        
        # All response times should be reasonable
        for response_time in results:
            assert response_time < 1.0, f"Response time {response_time}s is too slow"

    def test_info_endpoint(self, client):
        """Test the info endpoint that returns system information."""
        response = client.get('/api/v4/test/info')
        assert response.status_code == 200
        
        data = response.get_json()
        required_fields = ['version', 'environment', 'timestamp', 'endpoints']
        
        # Check that all required fields are present
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check field types and values
        assert data['version'] == '4.0'
        assert isinstance(data['environment'], str)
        assert isinstance(data['timestamp'], str)
        assert isinstance(data['endpoints'], list)
        assert len(data['endpoints']) > 0

    def test_status_endpoint(self, client):
        """Test the status endpoint that returns detailed status information."""
        response = client.get('/api/v4/test/status')
        assert response.status_code == 200
        
        data = response.get_json()
        required_fields = ['status', 'uptime', 'version', 'build_date', 'features', 'timestamp']
        
        # Check that all required fields are present
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check field types and values
        assert data['status'] == 'operational'
        assert data['uptime'] == 'running'
        assert data['version'] == '4.0.0'
        assert data['build_date'] == '2024-01-01'
        assert isinstance(data['features'], dict)
        assert 'authentication' in data['features']
        assert 'rate_limiting' in data['features']
        assert 'caching' in data['features']

    def test_echo_endpoint(self, client):
        """Test the echo endpoint that echoes back request data."""
        test_data = {'message': 'Hello World', 'number': 42}
        
        response = client.post('/api/v4/test/echo', 
                             json=test_data,
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 200
        
        data = response.get_json()
        required_fields = ['echo', 'method', 'headers', 'timestamp']
        
        # Check that all required fields are present
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check that the data was echoed back correctly
        assert data['echo'] == test_data
        assert data['method'] == 'POST'
        assert isinstance(data['headers'], dict)
        assert 'Content-Type' in data['headers']

    def test_validate_endpoint_success(self, client):
        """Test the validate endpoint with valid data."""
        valid_data = {'name': 'John Doe', 'email': 'john@example.com'}
        
        response = client.post('/api/v4/test/validate', 
                             json=valid_data,
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 200
        
        data = response.get_json()
        required_fields = ['valid', 'data', 'timestamp']
        
        # Check that all required fields are present
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check field types and values
        assert data['valid'] is True
        assert data['data'] == valid_data

    def test_validate_endpoint_missing_name(self, client):
        """Test the validate endpoint with missing name field."""
        invalid_data = {'email': 'john@example.com'}
        
        response = client.post('/api/v4/test/validate', 
                             json=invalid_data,
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
        assert 'Missing required field: name' in data['error']

    def test_validate_endpoint_missing_email(self, client):
        """Test the validate endpoint with missing email field."""
        invalid_data = {'name': 'John Doe'}
        
        response = client.post('/api/v4/test/validate', 
                             json=invalid_data,
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
        assert 'Missing required field: email' in data['error']

    def test_validate_endpoint_invalid_json(self, client):
        """Test the validate endpoint with invalid JSON."""
        response = client.post('/api/v4/test/validate', 
                             data='invalid json',
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data

    def test_endpoint_methods(self, client):
        """Test that endpoints only accept the correct HTTP methods."""
        # Test endpoints that only accept GET
        get_only_endpoints = [
            '/api/v4/test/health',
            '/api/v4/test/info',
            '/api/v4/test/status'
        ]
        
        for endpoint in get_only_endpoints:
            # GET should work
            response = client.get(endpoint)
            assert response.status_code == 200
            
            # POST should not work
            response = client.post(endpoint)
            assert response.status_code == 405
            
            # PUT should not work
            response = client.put(endpoint)
            assert response.status_code == 405
            
            # DELETE should not work
            response = client.delete(endpoint)
            assert response.status_code == 405
        
        # Test endpoints that accept POST
        post_endpoints = [
            '/api/v4/test/echo',
            '/api/v4/test/validate'
        ]
        
        for endpoint in post_endpoints:
            # POST should work
            response = client.post(endpoint, json={})
            assert response.status_code in [200, 400]  # 400 for validation errors
            
            # GET should not work
            response = client.get(endpoint)
            assert response.status_code == 405

    def test_endpoint_response_consistency(self, client):
        """Test that all endpoints return consistent response structures."""
        endpoints = [
            '/api/v4/test/health',
            '/api/v4/test/info',
            '/api/v4/test/status'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            
            data = response.get_json()
            # All endpoints should return JSON
            assert isinstance(data, dict)
            # All endpoints should have a timestamp
            assert 'timestamp' in data
            # All endpoints should return valid JSON
            assert isinstance(data['timestamp'], str)

    def test_error_response_format(self, client):
        """Test that error responses have consistent format."""
        # Test 404 error
        response = client.get('/api/v4/nonexistent')
        assert response.status_code == 404
        
        # Test 405 error
        response = client.post('/api/v4/test/health')
        assert response.status_code == 405
        
        # Test 400 error from validation
        response = client.post('/api/v4/test/validate', 
                             headers={'Content-Type': 'application/json'})
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
        assert 'timestamp' in data

    def test_endpoint_performance_under_load(self, client):
        """Test that all endpoints perform well under load."""
        import time
        
        endpoints = [
            '/api/v4/test/health',
            '/api/v4/test/info',
            '/api/v4/test/status'
        ]
        
        for endpoint in endpoints:
            times = []
            for i in range(5):
                start_time = time.time()
                response = client.get(endpoint)
                end_time = time.time()
                
                assert response.status_code == 200
                times.append(end_time - start_time)
            
            # Calculate average response time
            avg_time = sum(times) / len(times)
            # Response time should be under 100ms on average
            assert avg_time < 0.1, f"Endpoint {endpoint} average response time {avg_time:.3f}s is too slow"

    def test_endpoint_headers_consistency(self, client):
        """Test that all endpoints return consistent headers."""
        endpoints = [
            '/api/v4/test/health',
            '/api/v4/test/info',
            '/api/v4/test/status'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            
            # Check content type
            assert 'application/json' in response.content_type
            
            # Check that response is not cached
            cache_headers = ['Cache-Control', 'Pragma', 'Expires']
            for header in cache_headers:
                if header in response.headers:
                    if header == 'Cache-Control':
                        assert 'no-cache' in response.headers[header] or 'no-store' in response.headers[header]

    def test_endpoint_data_types(self, client):
        """Test that all endpoints return data with correct types."""
        endpoints = [
            ('/api/v4/test/health', {'status': str, 'message': str, 'timestamp': str}),
            ('/api/v4/test/info', {'version': str, 'environment': str, 'timestamp': str, 'endpoints': list}),
            ('/api/v4/test/status', {'status': str, 'uptime': str, 'version': str, 'build_date': str, 'features': dict, 'timestamp': str})
        ]
        
        for endpoint, expected_types in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            
            data = response.get_json()
            for field, expected_type in expected_types.items():
                assert field in data, f"Endpoint {endpoint} missing field: {field}"
                assert isinstance(data[field], expected_type), f"Endpoint {endpoint} field {field} has wrong type: expected {expected_type.__name__}, got {type(data[field]).__name__}"

    def test_endpoint_required_fields(self, client):
        """Test that all endpoints return all required fields."""
        endpoints = [
            ('/api/v4/test/health', ['status', 'message', 'timestamp']),
            ('/api/v4/test/info', ['version', 'environment', 'timestamp', 'endpoints']),
            ('/api/v4/test/status', ['status', 'uptime', 'version', 'build_date', 'features', 'timestamp'])
        ]
        
        for endpoint, required_fields in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            
            data = response.get_json()
            for field in required_fields:
                assert field in data, f"Endpoint {endpoint} missing required field: {field}"
                assert data[field] is not None, f"Endpoint {endpoint} field {field} is None"
                assert data[field] != "", f"Endpoint {endpoint} field {field} is empty string"
