#!/usr/bin/env python3
"""Comprehensive tests for API v4 routes."""

import json

import pytest
from flask import Flask
from unittest.mock import Mock, patch, MagicMock

from routes.api_v4 import (
    api_v4,
    create_restaurant_service,
    create_review_service,
    create_user_service,
    error_response,
    not_found_response,
    success_response,
)

class TestAPIV4Routes:
    """Test the v4 API routes."""
    
    @pytest.fixture
    def app(self):
        """Create a test Flask app."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['dependencies'] = {
            'get_db_manager_v4': Mock(return_value=Mock()),
            'cache_manager_v4': Mock(),
            'config_manager': Mock()
        }
        app.register_blueprint(api_v4)
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create a test client."""
        return app.test_client()
    
    @pytest.fixture
    def mock_restaurant_service(self):
        """Mock restaurant service."""
        service = Mock()
        service.get_all_restaurants.return_value = [
            {'id': 1, 'name': 'Test Restaurant', 'address': '123 Test St'},
            {'id': 2, 'name': 'Another Restaurant', 'address': '456 Test Ave'}
        ]
        service.get_restaurant_by_id.return_value = {'id': 1, 'name': 'Test Restaurant'}
        service.create_restaurant.return_value = 1
        service.update_restaurant.return_value = True
        service.delete_restaurant.return_value = True
        service.search_restaurants.return_value = [{'id': 1, 'name': 'Test Restaurant'}]
        service.get_restaurant_statistics.return_value = {'total': 100, 'active': 95}
        return service
    
    @pytest.fixture
    def mock_review_service(self):
        """Mock review service."""
        service = Mock()
        service.get_reviews.return_value = [
            {'id': 1, 'restaurant_id': 1, 'rating': 5, 'content': 'Great food!'},
            {'id': 2, 'restaurant_id': 1, 'rating': 4, 'content': 'Good service'}
        ]
        service.get_reviews_count.return_value = 2
        service.get_review_by_id.return_value = {'id': 1, 'restaurant_id': 1, 'rating': 5}
        service.create_review.return_value = 1
        service.update_review.return_value = True
        service.delete_review.return_value = True
        return service
    
    @pytest.fixture
    def mock_user_service(self):
        """Mock user service."""
        service = Mock()
        service.get_users.return_value = [
            {'id': 1, 'name': 'Admin User', 'role': 'admin'},
            {'id': 2, 'name': 'Regular User', 'role': 'user'}
        ]
        service.get_users_count.return_value = 2
        service.update_user_role.return_value = True
        service.delete_user.return_value = True
        return service
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_get_restaurants_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful GET /api/v4/restaurants."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/restaurants')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'restaurants' in data['data']
        assert len(data['data']['restaurants']) == 2
        assert 'pagination' in data['data']
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_get_restaurants_with_filters(self, mock_create_service, client, mock_restaurant_service):
        """Test GET /api/v4/restaurants with filters."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/restaurants?kosher_type=dairy&status=active&limit=10&offset=0')
        
        assert response.status_code == 200
        mock_restaurant_service.get_all_restaurants.assert_called_once()
        call_args = mock_restaurant_service.get_all_restaurants.call_args[1]
        assert call_args['filters']['kosher_category'] == 'dairy'
        assert call_args['filters']['status'] == 'active'
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_search_restaurants_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful GET /api/v4/restaurants/search."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/restaurants/search?q=pizza')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'results' in data['data']
        assert data['data']['query'] == 'pizza'
    
    def test_search_restaurants_missing_query(self, client):
        """Test GET /api/v4/restaurants/search without query parameter."""
        response = client.get('/api/v4/restaurants/search')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Query parameter' in data['error']
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_get_restaurant_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful GET /api/v4/restaurants/<id>."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/restaurants/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'restaurant' in data['data']
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_get_restaurant_not_found(self, mock_create_service, client, mock_restaurant_service):
        """Test GET /api/v4/restaurants/<id> with non-existent restaurant."""
        mock_restaurant_service.get_restaurant_by_id.return_value = None
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/restaurants/999')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_create_restaurant_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful POST /api/v4/restaurants."""
        mock_create_service.return_value = mock_restaurant_service
        
        restaurant_data = {
            'name': 'New Restaurant',
            'address': '789 New St',
            'kosher_category': 'meat'
        }
        
        response = client.post('/api/v4/restaurants', 
                             data=json.dumps(restaurant_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'restaurant' in data['data']
        assert 'id' in data['data']
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_update_restaurant_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful PUT /api/v4/restaurants/<id>."""
        mock_create_service.return_value = mock_restaurant_service
        
        update_data = {
            'name': 'Updated Restaurant',
            'address': 'Updated Address'
        }
        
        response = client.put('/api/v4/restaurants/1',
                            data=json.dumps(update_data),
                            content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'restaurant' in data['data']
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_delete_restaurant_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful DELETE /api/v4/restaurants/<id>."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.delete('/api/v4/restaurants/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['id'] == 1
    
    @patch('routes.api_v4.create_review_service')
    def test_get_reviews_success(self, mock_create_service, client, mock_review_service):
        """Test successful GET /api/v4/reviews."""
        mock_create_service.return_value = mock_review_service
        
        response = client.get('/api/v4/reviews?restaurantId=1&limit=10&offset=0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'reviews' in data['data']
        assert 'pagination' in data['data']
        assert len(data['data']['reviews']) == 2
    
    @patch('routes.api_v4.create_review_service')
    def test_create_review_success(self, mock_create_service, client, mock_review_service):
        """Test successful POST /api/v4/reviews."""
        mock_create_service.return_value = mock_review_service
        
        review_data = {
            'restaurantId': 1,
            'userId': 'user123',
            'userName': 'Test User',
            'rating': 5,
            'content': 'Great restaurant!'
        }
        
        response = client.post('/api/v4/reviews',
                             data=json.dumps(review_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'review' in data['data']
        assert 'id' in data['data']
    
    @patch('routes.api_v4.create_review_service')
    def test_get_review_success(self, mock_create_service, client, mock_review_service):
        """Test successful GET /api/v4/reviews/<id>."""
        mock_create_service.return_value = mock_review_service
        
        response = client.get('/api/v4/reviews/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'review' in data['data']
    
    @patch('routes.api_v4.create_review_service')
    def test_update_review_success(self, mock_create_service, client, mock_review_service):
        """Test successful PUT /api/v4/reviews/<id>."""
        mock_create_service.return_value = mock_review_service
        
        update_data = {
            'rating': 4,
            'content': 'Updated review content'
        }
        
        response = client.put('/api/v4/reviews/1',
                            data=json.dumps(update_data),
                            content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'review' in data['data']
    
    @patch('routes.api_v4.create_review_service')
    def test_delete_review_success(self, mock_create_service, client, mock_review_service):
        """Test successful DELETE /api/v4/reviews/<id>."""
        mock_create_service.return_value = mock_review_service
        
        response = client.delete('/api/v4/reviews/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['id'] == 1
    
    @patch('routes.api_v4.create_user_service')
    def test_admin_get_users_success(self, mock_create_service, client, mock_user_service):
        """Test successful GET /api/v4/admin/users."""
        mock_create_service.return_value = mock_user_service
        
        response = client.get('/api/v4/admin/users?page=1&limit=20')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'users' in data['data']
        assert 'pagination' in data['data']
        assert len(data['data']['users']) == 2
    
    @patch('routes.api_v4.create_user_service')
    def test_admin_update_user_success(self, mock_create_service, client, mock_user_service):
        """Test successful PUT /api/v4/admin/users."""
        mock_create_service.return_value = mock_user_service
        
        update_data = {
            'userId': 'user123',
            'isSuperAdmin': True
        }
        
        response = client.put('/api/v4/admin/users',
                            data=json.dumps(update_data),
                            content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
    
    @patch('routes.api_v4.create_user_service')
    def test_admin_delete_user_success(self, mock_create_service, client, mock_user_service):
        """Test successful DELETE /api/v4/admin/users."""
        mock_create_service.return_value = mock_user_service
        
        delete_data = {
            'userId': 'user123'
        }
        
        response = client.delete('/api/v4/admin/users',
                               data=json.dumps(delete_data),
                               content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
    
    @patch('routes.api_v4.create_restaurant_service')
    def test_get_statistics_success(self, mock_create_service, client, mock_restaurant_service):
        """Test successful GET /api/v4/statistics."""
        mock_create_service.return_value = mock_restaurant_service
        
        response = client.get('/api/v4/statistics')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'total' in data['data']
        assert 'active' in data['data']
    
    def test_error_handling_validation_error(self, client):
        """Test error handling for validation errors."""
        # This would be tested by mocking a service that raises ValidationError
        pass
    
    def test_error_handling_not_found_error(self, client):
        """Test error handling for not found errors."""
        # This would be tested by mocking a service that raises NotFoundError
        pass
    
    def test_error_handling_database_error(self, client):
        """Test error handling for database errors."""
        # This would be tested by mocking a service that raises DatabaseError
        pass

class TestAPIV4ServiceCreation:
    """Test service creation functions."""
    
    @patch('routes.api_v4.get_service_dependencies')
    def test_create_restaurant_service(self, mock_get_deps):
        """Test create_restaurant_service function."""
        mock_db_manager = Mock()
        mock_cache_manager = Mock()
        mock_config = Mock()
        mock_get_deps.return_value = (mock_db_manager, mock_cache_manager, mock_config)
        
        with patch('routes.api_v4.RestaurantServiceV4') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            result = create_restaurant_service()
            
            assert result == mock_service
            mock_service_class.assert_called_once_with(
                db_manager=mock_db_manager,
                cache_manager=mock_cache_manager,
                config=mock_config
            )
    
    @patch('routes.api_v4.get_service_dependencies')
    def test_create_review_service(self, mock_get_deps):
        """Test create_review_service function."""
        mock_db_manager = Mock()
        mock_cache_manager = Mock()
        mock_config = Mock()
        mock_get_deps.return_value = (mock_db_manager, mock_cache_manager, mock_config)
        
        with patch('routes.api_v4.ReviewServiceV4') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            result = create_review_service()
            
            assert result == mock_service
            mock_service_class.assert_called_once_with(
                db_manager=mock_db_manager,
                cache_manager=mock_cache_manager,
                config=mock_config
            )
    
    @patch('routes.api_v4.get_service_dependencies')
    def test_create_user_service(self, mock_get_deps):
        """Test create_user_service function."""
        mock_db_manager = Mock()
        mock_cache_manager = Mock()
        mock_config = Mock()
        mock_get_deps.return_value = (mock_db_manager, mock_cache_manager, mock_config)
        
        with patch('routes.api_v4.UserServiceV4') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            result = create_user_service()
            
            assert result == mock_service
            mock_service_class.assert_called_once_with(
                db_manager=mock_db_manager,
                cache_manager=mock_cache_manager,
                config=mock_config
            )

class TestAPIV4ResponseFormats:
    """Test response format functions."""
    
    def test_success_response(self):
        """Test success_response function."""
        data = {'test': 'data'}
        response, status_code = success_response(data, 'Test message', 201)
        
        assert status_code == 201
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['message'] == 'Test message'
        assert response_data['data'] == data
    
    def test_error_response(self):
        """Test error_response function."""
        details = {'field': 'error'}
        response, status_code = error_response('Test error', 400, details)
        
        assert status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert response_data['error'] == 'Test error'
        assert response_data['status_code'] == 400
        assert response_data['details'] == details
    
    def test_not_found_response(self):
        """Test not_found_response function."""
        response, status_code = not_found_response('Resource not found', 'restaurant')
        
        assert status_code == 404
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'Restaurant not found' in response_data['error']
