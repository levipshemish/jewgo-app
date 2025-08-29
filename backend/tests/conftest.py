"""
Pytest configuration and fixtures for backend tests.
"""

import pytest
from flask import Flask
from app_factory import create_app


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
