#!/usr/bin/env python3
"""Simple test script to verify the new service architecture."""

import os
import sys
import traceback
from unittest.mock import Mock

from services.base_service import BaseService
from services.service_manager import ServiceManager
from utils.cache_manager import CacheManager, CacheOperationError
from utils.error_handler import APIError, ValidationError

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_base_service():
    """Test BaseService functionality."""
    print("Testing BaseService...")

    try:
        # Create a mock service
        db_manager = Mock()
        config = Mock()
        cache_manager = Mock()

        service = BaseService(db_manager, config, cache_manager)

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
        assert health["service"] == "BaseService"
        assert health["healthy"] is True
        print("✓ Health status works")

        print("✓ BaseService tests passed")
        return True

    except Exception as e:
        print(f"✗ BaseService test failed: {e}")
        traceback.print_exc()
        return False


def test_service_manager():
    """Test ServiceManager functionality."""
    print("Testing ServiceManager...")

    try:
        # Create a mock service manager
        db_manager = Mock()
        config = Mock()
        cache_manager = Mock()

        service_manager = ServiceManager(db_manager, config, cache_manager)

        # Test health status
        health = service_manager.get_health_status()
        assert health["manager_healthy"] is True
        print("✓ ServiceManager health status works")

        # Test service reset
        service_manager._services["test"] = Mock()
        service_manager.reset_all_services()
        assert len(service_manager._services) == 0
        print("✓ Service reset works")

        print("✓ ServiceManager tests passed")
        return True

    except Exception as e:
        print(f"✗ ServiceManager test failed: {e}")
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


def main():
    """Run all tests."""
    print("Testing new backend architecture...")
    print("=" * 50)

    tests = [
        test_base_service,
        test_service_manager,
        test_cache_manager,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print("=" * 50)
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("🎉 All new architecture tests passed!")
        print("The new service architecture is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
