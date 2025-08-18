#!/usr/bin/env python3
"""
Simple test script to verify backend deployment readiness without database
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing imports...")
    
    try:
        from app_factory import create_app
        print("✓ app_factory imported successfully")
    except Exception as e:
        print(f"✗ Failed to import app_factory: {e}")
        return False
    
    try:
        from utils.config_manager import ConfigManager
        print("✓ ConfigManager imported successfully")
    except Exception as e:
        print(f"✗ Failed to import ConfigManager: {e}")
        return False
    
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager
        print("✓ EnhancedDatabaseManager imported successfully")
    except Exception as e:
        print(f"✗ Failed to import EnhancedDatabaseManager: {e}")
        return False
    
    return True

def test_app_creation_basic():
    """Test that the Flask app can be created without database connection."""
    print("\nTesting basic app creation...")
    
    try:
        from app_factory import create_app
        # Set a dummy database URL to avoid connection attempts
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['FLASK_ENV'] = 'testing'
        
        app = create_app()
        print("✓ Flask app created successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to create Flask app: {e}")
        return False

def test_config():
    """Test configuration loading."""
    print("\nTesting configuration...")
    
    try:
        from utils.config_manager import ConfigManager
        port = ConfigManager.get_port()
        print(f"✓ Port configuration: {port}")
        return True
    except Exception as e:
        print(f"✗ Failed to load configuration: {e}")
        return False

def main():
    """Run all tests."""
    print("=== JewGo Backend Simple Deployment Test ===\n")
    
    tests = [
        test_imports,
        test_app_creation_basic,
        test_config,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n=== Test Results: {passed}/{total} tests passed ===")
    
    if passed == total:
        print("✓ All tests passed! Backend is ready for deployment.")
        return 0
    else:
        print("✗ Some tests failed. Please fix the issues before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
