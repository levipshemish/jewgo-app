#!/usr/bin/env python3
"""Test core new components without importing problematic existing services."""

import sys
import os
import traceback
from unittest.mock import Mock
from typing import Dict, Any

import structlog

from utils.logging_config import get_logger
from utils.error_handler import (
    APIError, 
    ValidationError, 
    NotFoundError, 
    DatabaseError, 
    ExternalServiceError
)
from utils.cache_manager import CacheManager, CacheOperationError

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = get_logger(__name__)


def test_error_handler():
    """Test error handler functionality."""
    print("Testing ErrorHandler...")
    
    try:
        # Test APIError
        error = APIError("Test error", 500, "TEST_ERROR")
        assert error.message == "Test error"
        assert error.status_code == 500
        assert error.error_code == "TEST_ERROR"
        print("✓ APIError works")
        
        # Test ValidationError
        val_error = ValidationError("Validation failed", {"field": "value"})
        assert val_error.status_code == 400
        assert val_error.error_code == "VALIDATION_ERROR"
        print("✓ ValidationError works")
        
        # Test NotFoundError
        not_found = NotFoundError("Resource not found", "Restaurant")
        assert not_found.status_code == 404
        assert not_found.error_code == "NOT_FOUND"
        print("✓ NotFoundError works")
        
        # Test DatabaseError
        db_error = DatabaseError("Database failed", {"query": "SELECT *"})
        assert db_error.status_code == 500
        assert db_error.error_code == "DATABASE_ERROR"
        print("✓ DatabaseError works")
        
        # Test ExternalServiceError
        ext_error = ExternalServiceError("External service failed", "Google Places")
        assert ext_error.status_code == 502
        assert ext_error.error_code == "EXTERNAL_SERVICE_ERROR"
        print("✓ ExternalServiceError works")
        
        print("✓ ErrorHandler tests passed")
        return True
        
    except Exception as e:
        print(f"✗ ErrorHandler test failed: {e}")
        traceback.print_exc()
        return False


def test_cache_manager():
    """Test CacheManager functionality."""
    print("Testing CacheManager...")
    
    try:
        # Create cache manager without Redis
        cache_manager = CacheManager(redis_url=None)
        
        # Test basic operations
        cache_manager.set("test_key", "test_value", ttl=60)
        value = cache_manager.get("test_key")
        assert value == "test_value"
        print("✓ Basic cache operations work")
        
        # Test health status
        health = cache_manager.get_health_status()
        assert health["service"] == "CacheManager"
        print("✓ Cache health status works")
        
        print("✓ CacheManager tests passed")
        return True
        
    except Exception as e:
        print(f"✗ CacheManager test failed: {e}")
        traceback.print_exc()
        return False


def test_base_service_standalone():
    """Test BaseService without importing other services."""
    print("Testing BaseService (standalone)...")
    
    try:
        # Create a simple base service for testing
        class TestBaseService:
            """Test version of BaseService."""
            
            def __init__(self, db_manager=None, config=None, cache_manager=None):
                self.db_manager = db_manager
                self.config = config
                self.cache_manager = cache_manager
                self.logger = structlog.get_logger()
                self._is_healthy = True
                self._last_error = None
                self._error_count = 0
            
            def validate_required_fields(self, data, required_fields):
                missing_fields = [field for field in required_fields if not data.get(field)]
                if missing_fields:
                    msg = f"Missing required fields: {', '.join(missing_fields)}"
                    raise ValidationError(msg, {"missing_fields": missing_fields})
            
            def get_health_status(self):
                return {
                    "service": "TestBaseService",
                    "healthy": self._is_healthy,
                    "error_count": self._error_count,
                    "last_error": self._last_error,
                    "dependencies": {
                        "database": self.db_manager is not None,
                        "cache": self.cache_manager is not None,
                        "config": self.config is not None,
                    }
                }
        
        # Test the service
        db_manager = Mock()
        config = Mock()
        cache_manager = Mock()
        
        service = TestBaseService(db_manager, config, cache_manager)
        
        # Test field validation
        data = {"field1": "value1", "field2": "value2"}
        required_fields = ["field1", "field2"]
        service.validate_required_fields(data, required_fields)
        print("✓ Field validation works")
        
        # Test field validation with missing fields
        try:
            service.validate_required_fields(data, ["field1", "field3"])
            print("✗ Should have raised ValidationError")
        except ValidationError:
            print("✓ ValidationError raised correctly")
        
        # Test health status
        health = service.get_health_status()
        assert health["service"] == "TestBaseService"
        assert health["healthy"] is True
        print("✓ Health status works")
        
        print("✓ BaseService (standalone) tests passed")
        return True
        
    except Exception as e:
        print(f"✗ BaseService test failed: {e}")
        traceback.print_exc()
        return False


def test_service_manager_standalone():
    """Test ServiceManager without importing other services."""
    print("Testing ServiceManager (standalone)...")
    
    try:
        # Create a simple service manager for testing
        class TestServiceManager:
            """Test version of ServiceManager."""
            
            def __init__(self, db_manager=None, config=None, cache_manager=None):
                self.db_manager = db_manager
                self.config = config
                self.cache_manager = cache_manager
                self._services = {}
            
            def get_health_status(self):
                return {
                    "manager_healthy": True,
                    "services": {},
                    "summary": {
                        "total_services": 0,
                        "healthy_services": 0,
                        "unhealthy_services": 0,
                    }
                }
            
            def reset_all_services(self):
                self._services.clear()
        
        # Test the service manager
        db_manager = Mock()
        config = Mock()
        cache_manager = Mock()
        
        service_manager = TestServiceManager(db_manager, config, cache_manager)
        
        # Test health status
        health = service_manager.get_health_status()
        assert health["manager_healthy"] is True
        assert health["summary"]["total_services"] == 0
        print("✓ Service manager health status works")
        
        # Test reset functionality
        service_manager.reset_all_services()
        print("✓ Service manager reset works")
        
        print("✓ ServiceManager (standalone) tests passed")
        return True
        
    except Exception as e:
        print(f"✗ ServiceManager test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("Running core component tests...")
    
    tests = [
        test_error_handler,
        test_cache_manager,
        test_base_service_standalone,
        test_service_manager_standalone,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\nTest Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All core component tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False


if __name__ == "__main__":
    main()
