"""
Pytest configuration and fixtures for backend tests.
"""

import os
import pytest
from app_factory_full import create_app
from unittest.mock import Mock

# Test configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "auth_required: mark test as requiring authentication"
    )
    config.addinivalue_line(
        "markers", "core_only: mark test as testing core functionality only"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )

@pytest.fixture(scope="session")
def test_config():
    """Test configuration fixture."""
    return {
        'skip_auth_tests': os.getenv('SKIP_AUTH_TESTS', 'false').lower() == 'true',
        'test_mode': os.getenv('TEST_MODE', 'core'),
        'enable_mocking': os.getenv('ENABLE_MOCKING', 'true').lower() == 'true'
    }

@pytest.fixture(autouse=True)
def setup_test_env(test_config):
    """Set up test environment variables."""
    # Disable Supabase authentication for testing
    os.environ['ENABLE_SUPABASE_ADMIN_ROLES'] = 'false'
    # Disable JWKS pre-warming for testing
    os.environ['ENABLE_JWKS_PREWARM'] = 'false'
    
    # Set test mode
    os.environ['TEST_MODE'] = test_config['test_mode']
    
    yield
    
    # Clean up
    if 'ENABLE_SUPABASE_ADMIN_ROLES' in os.environ:
        del os.environ['ENABLE_SUPABASE_ADMIN_ROLES']
    if 'ENABLE_JWKS_PREWARM' in os.environ:
        del os.environ['ENABLE_JWKS_PREWARM']
    if 'TEST_MODE' in os.environ:
        del os.environ['TEST_MODE']

@pytest.fixture
def mock_auth(test_config):
    """Legacy Supabase mock removed; provide a no-op mock structure."""
    if not test_config['enable_mocking']:
        return None
    mock_verify = Mock()
    mock_verify.return_value = {
        'id': 'test-user-id',
        'email': 'test@example.com',
        'role': 'super_admin',
        'permissions': ['all']
    }
    yield mock_verify

@pytest.fixture
def mock_supabase_user(test_config):
    """Legacy Supabase mock removed; provide a no-op mock user object."""
    if not test_config['enable_mocking']:
        return None
    mock_user = Mock()
    mock_user.return_value = {
        'id': 'test-user-id',
        'email': 'test@example.com',
        'role': 'super_admin',
        'permissions': ['all']
    }
    yield mock_user


@pytest.fixture
def app():
    """Create a Flask app instance for testing."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the Flask app."""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers():
    """Basic Authorization header fixture for tests.

    In TEST_MODE, many auth integrations are bypassed; this provides a placeholder header.
    """
    return {"Authorization": "Bearer test-token"}
