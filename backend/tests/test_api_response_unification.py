#!/usr/bin/env python3
"""Test API Response Unification.
============================

Tests for unified API response patterns to ensure consistency
across all endpoints.

Author: JewGo Development Team
Version: 1.0
"""

import json
import pytest
from datetime import datetime
from unittest.mock import patch

from flask import Flask, g

from utils.api_response import (
    # Success responses
    success_response,
    created_response,
    paginated_response,
    
    # Domain-specific responses
    restaurants_response,
    restaurant_response,
    statistics_response,
    kosher_types_response,
    search_response,
    
    # Health check responses
    health_response,
    redis_health_response,
    redis_stats_response,
    
    # Error responses
    no_content_response,
    not_found_response,
    error_response,
    validation_error_response,
    unauthorized_response,
    forbidden_response,
    service_unavailable_response,
    
    # Legacy compatibility responses
    legacy_success_response,
    legacy_error_response,
    
    # Core class
    APIResponse
)


@pytest.fixture
def app():
    """Create a test Flask app."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


class TestAPIResponseClass:
    """Test the core APIResponse class."""
    
    def test_api_response_creation(self):
        """Test APIResponse object creation."""
        response = APIResponse(
            data={"test": "data"},
            message="Test message",
            status_code=200,
            meta={"key": "value"}
        )
        
        assert response.data == {"test": "data"}
        assert response.message == "Test message"
        assert response.status_code == 200
        assert response.meta == {"key": "value"}
        assert isinstance(response.timestamp, str)
    
    def test_api_response_to_dict(self):
        """Test APIResponse to_dict method."""
        response = APIResponse(
            data={"test": "data"},
            message="Test message",
            status_code=200
        )
        
        result = response.to_dict()
        
        assert result["success"] is True
        assert result["data"] == {"test": "data"}
        assert result["message"] == "Test message"
        assert result["status_code"] == 200
        assert "timestamp" in result
    
    def test_api_response_to_dict_with_request_id(self, app):
        """Test APIResponse to_dict with request_id in Flask context."""
        with app.test_request_context():
            g.request_id = "test-request-123"
            
            response = APIResponse(
                data={"test": "data"},
                message="Test message",
                status_code=200
            )
            
            result = response.to_dict()
            
            assert result["meta"]["request_id"] == "test-request-123"
    
    def test_api_response_to_response(self):
        """Test APIResponse to_response method."""
        response = APIResponse(
            data={"test": "data"},
            message="Test message",
            status_code=201
        )
        
        flask_response, status_code = response.to_response()
        
        assert status_code == 201
        assert flask_response.status_code == 201
        
        data = json.loads(flask_response.get_data(as_text=True))
        assert data["success"] is True
        assert data["data"] == {"test": "data"}
        assert data["message"] == "Test message"


class TestSuccessResponses:
    """Test success response functions."""
    
    def test_success_response(self):
        """Test success_response function."""
        response, status_code = success_response(
            data={"test": "data"},
            message="Success message",
            meta={"key": "value"}
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data["success"] is True
        assert data["data"] == {"test": "data"}
        assert data["message"] == "Success message"
        assert data["meta"]["key"] == "value"
    
    def test_created_response(self):
        """Test created_response function."""
        response, status_code = created_response(
            data={"id": 123},
            message="Resource created"
        )
        
        assert status_code == 201
        data = json.loads(response.get_data(as_text=True))
        assert data["success"] is True
        assert data["data"] == {"id": 123}
        assert data["message"] == "Resource created"
    
    def test_paginated_response(self):
        """Test paginated_response function."""
        data = [{"id": 1}, {"id": 2}, {"id": 3}]
        response, status_code = paginated_response(
            data=data,
            total=10,
            page=2,
            limit=3,
            message="Paginated results"
        )
        
        assert status_code == 200
        response_data = json.loads(response.get_data(as_text=True))
        assert response_data["success"] is True
        assert response_data["data"] == data
        assert response_data["message"] == "Paginated results"
        
        pagination = response_data["meta"]["pagination"]
        assert pagination["page"] == 2
        assert pagination["limit"] == 3
        assert pagination["total"] == 10
        assert pagination["total_pages"] == 4
        assert pagination["has_next"] is True
        assert pagination["has_prev"] is True


class TestDomainSpecificResponses:
    """Test domain-specific response functions."""
    
    def test_restaurants_response(self):
        """Test restaurants_response function."""
        restaurants = [
            {"id": 1, "name": "Restaurant 1"},
            {"id": 2, "name": "Restaurant 2"}
        ]
        
        response, status_code = restaurants_response(
            restaurants=restaurants,
            total=100,
            limit=10,
            offset=0,
            filters={"city": "Miami"}
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        # Check standard APIResponse format
        assert data["success"] is True
        assert data["data"]["restaurants"] == restaurants
        assert data["message"] == "Retrieved 2 restaurants"
        
        # Check backward compatibility
        assert data["restaurants"] == restaurants
        assert data["pagination"]["total"] == 100
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 0
        assert data["meta"]["filters"]["city"] == "Miami"
    
    def test_restaurant_response(self):
        """Test restaurant_response function."""
        restaurant = {"id": 1, "name": "Test Restaurant"}
        
        response, status_code = restaurant_response(restaurant)
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is True
        assert data["data"]["restaurant"] == restaurant
        assert data["restaurant"] == restaurant  # Backward compatibility
        assert data["message"] == "Restaurant retrieved successfully"
    
    def test_statistics_response(self):
        """Test statistics_response function."""
        stats = {"total": 100, "active": 95}
        
        response, status_code = statistics_response(stats)
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is True
        assert data["data"]["statistics"] == stats
        assert data["statistics"] == stats  # Backward compatibility
        assert data["message"] == "Statistics retrieved successfully"
    
    def test_kosher_types_response(self):
        """Test kosher_types_response function."""
        kosher_types = [{"type": "meat"}, {"type": "dairy"}]
        
        response, status_code = kosher_types_response(kosher_types)
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is True
        assert data["data"]["kosher_types"] == kosher_types
        assert data["kosher_types"] == kosher_types  # Backward compatibility
        assert data["message"] == "Retrieved 2 kosher types"
    
    def test_search_response(self):
        """Test search_response function."""
        results = [{"id": 1, "name": "Result 1"}]
        
        response, status_code = search_response(
            results=results,
            query="test query",
            total=50
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is True
        assert data["data"]["results"] == results
        assert data["message"] == "Found 1 results for 'test query'"
        assert data["meta"]["query"] == "test query"
        assert data["meta"]["count"] == 1
        assert data["meta"]["total"] == 50


class TestHealthCheckResponses:
    """Test health check response functions."""
    
    def test_health_response_success(self):
        """Test health_response function with success status."""
        response, status_code = health_response(
            status="ok",
            checks={"db": "ok", "redis": "ok"},
            warnings=["warning1"]
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "ok"
        assert data["checks"]["db"] == "ok"
        assert data["checks"]["redis"] == "ok"
        assert data["warnings"] == ["warning1"]
        assert "ts" in data
    
    def test_health_response_degraded(self):
        """Test health_response function with degraded status."""
        response, status_code = health_response(
            status="degraded",
            checks={"db": "fail"},
            error="db_unreachable"
        )
        
        assert status_code == 503
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "degraded"
        assert data["checks"]["db"] == "fail"
        assert data["error"] == "db_unreachable"
    
    def test_redis_health_response_healthy(self):
        """Test redis_health_response function with healthy status."""
        response, status_code = redis_health_response(
            status="healthy",
            redis_url="redis://localhost:6379",
            ping_time_ms=1.5,
            set_time_ms=2.0,
            get_time_ms=1.0,
            redis_version="6.0.0",
            connected_clients=5,
            used_memory_human="1.2M",
            total_commands_processed=1000
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "healthy"
        assert data["redis_url"] == "redis://localhost:6379"
        assert data["ping_time_ms"] == 1.5
        assert data["set_time_ms"] == 2.0
        assert data["get_time_ms"] == 1.0
        assert data["redis_version"] == "6.0.0"
        assert data["connected_clients"] == 5
        assert data["used_memory_human"] == "1.2M"
        assert data["total_commands_processed"] == 1000
        assert "timestamp" in data
    
    def test_redis_health_response_unhealthy(self):
        """Test redis_health_response function with unhealthy status."""
        response, status_code = redis_health_response(
            status="unhealthy",
            error="Connection failed"
        )
        
        assert status_code == 503
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "unhealthy"
        assert data["error"] == "Connection failed"
    
    def test_redis_stats_response_success(self):
        """Test redis_stats_response function with success status."""
        stats = {
            "redis_info": {"version": "6.0.0"},
            "cache_stats": {"type": "redis"}
        }
        
        response, status_code = redis_stats_response(
            status="ok",
            stats=stats
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "ok"
        assert data["stats"]["redis_info"]["version"] == "6.0.0"
        assert data["stats"]["cache_stats"]["type"] == "redis"
        assert "timestamp" in data
    
    def test_redis_stats_response_error(self):
        """Test redis_stats_response function with error status."""
        response, status_code = redis_stats_response(
            status="error",
            error="Failed to get stats"
        )
        
        assert status_code == 503
        data = json.loads(response.get_data(as_text=True))
        
        assert data["status"] == "error"
        assert data["error"] == "Failed to get stats"


class TestErrorResponses:
    """Test error response functions."""
    
    def test_no_content_response(self):
        """Test no_content_response function."""
        response, status_code = no_content_response()
        
        assert status_code == 204
        assert response.get_data(as_text=True) == ""
    
    def test_not_found_response(self):
        """Test not_found_response function."""
        response, status_code = not_found_response(
            message="Restaurant not found",
            resource_type="Restaurant"
        )
        
        assert status_code == 404
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Restaurant not found"
        assert data["meta"]["resource_type"] == "Restaurant"
    
    def test_error_response(self):
        """Test error_response function."""
        response, status_code = error_response(
            message="Internal server error",
            status_code=500,
            meta={"details": "Database connection failed"}
        )
        
        assert status_code == 500
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Internal server error"
        assert data["meta"]["details"] == "Database connection failed"
    
    def test_validation_error_response(self):
        """Test validation_error_response function."""
        response, status_code = validation_error_response(
            message="Validation failed",
            errors=["Name is required", "Email is invalid"]
        )
        
        assert status_code == 400
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Validation failed"
        assert data["meta"]["validation_errors"] == ["Name is required", "Email is invalid"]
    
    def test_unauthorized_response(self):
        """Test unauthorized_response function."""
        response, status_code = unauthorized_response(
            message="Authentication required",
            details="Invalid token"
        )
        
        assert status_code == 401
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Authentication required"
        assert data["meta"]["details"] == "Invalid token"
    
    def test_forbidden_response(self):
        """Test forbidden_response function."""
        response, status_code = forbidden_response(
            message="Access denied",
            details="Insufficient permissions"
        )
        
        assert status_code == 403
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Access denied"
        assert data["meta"]["details"] == "Insufficient permissions"
    
    def test_service_unavailable_response(self):
        """Test service_unavailable_response function."""
        response, status_code = service_unavailable_response(
            message="Service temporarily unavailable",
            details="Database maintenance"
        )
        
        assert status_code == 503
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is False
        assert data["message"] == "Service temporarily unavailable"
        assert data["meta"]["details"] == "Database maintenance"


class TestLegacyCompatibilityResponses:
    """Test legacy compatibility response functions."""
    
    def test_legacy_success_response(self):
        """Test legacy_success_response function."""
        response, status_code = legacy_success_response(
            message="Operation successful",
            data={"id": 123, "name": "test"}
        )
        
        assert status_code == 200
        data = json.loads(response.get_data(as_text=True))
        
        assert data["success"] is True
        assert data["message"] == "Operation successful"
        assert data["id"] == 123
        assert data["name"] == "test"
    
    def test_legacy_error_response(self):
        """Test legacy_error_response function."""
        response, status_code = legacy_error_response(
            message="Something went wrong",
            status_code=500
        )
        
        assert status_code == 500
        data = json.loads(response.get_data(as_text=True))
        
        assert data["error"] == "Internal server error"  # 500 error gets standardized
    
    def test_legacy_error_response_custom(self):
        """Test legacy_error_response function with custom status code."""
        response, status_code = legacy_error_response(
            message="Validation failed",
            status_code=400
        )
        
        assert status_code == 400
        data = json.loads(response.get_data(as_text=True))
        
        assert data["error"] == "Validation failed"


class TestResponseConsistency:
    """Test response consistency across different patterns."""
    
    def test_response_structure_consistency(self):
        """Test that all responses have consistent structure."""
        responses = [
            success_response(data={"test": "data"}),
            created_response(data={"id": 1}),
            error_response(message="Error", status_code=400),
            not_found_response(message="Not found")
        ]
        
        for response, status_code in responses:
            data = json.loads(response.get_data(as_text=True))
            
            # All responses should have these fields
            assert "success" in data
            assert "timestamp" in data
            assert "status_code" in data
            
            # Success field should match status code
            expected_success = 200 <= status_code < 300
            assert data["success"] == expected_success
    
    def test_timestamp_format_consistency(self):
        """Test that all responses use consistent timestamp format."""
        response, _ = success_response()
        data = json.loads(response.get_data(as_text=True))
        
        # Timestamp should be ISO format
        timestamp = data["timestamp"]
        datetime.fromisoformat(timestamp)  # Should not raise exception
    
    def test_meta_field_consistency(self):
        """Test that meta field is consistently structured."""
        response, _ = success_response(meta={"key": "value"})
        data = json.loads(response.get_data(as_text=True))
        
        assert "meta" in data
        assert data["meta"]["key"] == "value"


if __name__ == "__main__":
    pytest.main([__file__])
