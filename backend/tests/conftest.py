"""
Pytest configuration and fixtures for backend tests.
"""

import os
import pytest
from flask import Flask
from app_factory import create_app


@pytest.fixture(autouse=True)
def setup_test_env():
    """Set up test environment variables."""
    # Disable Supabase authentication for testing
    os.environ['ENABLE_SUPABASE_ADMIN_ROLES'] = 'false'
    # Disable JWKS pre-warming for testing
    os.environ['ENABLE_JWKS_PREWARM'] = 'false'
    yield
    # Clean up
    if 'ENABLE_SUPABASE_ADMIN_ROLES' in os.environ:
        del os.environ['ENABLE_SUPABASE_ADMIN_ROLES']
    if 'ENABLE_JWKS_PREWARM' in os.environ:
        del os.environ['ENABLE_JWKS_PREWARM']


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
