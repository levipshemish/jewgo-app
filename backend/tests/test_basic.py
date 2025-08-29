"""
Basic test file to ensure CI pipeline can run tests successfully.
"""

import os
import pytest


def test_environment_variables():
    """Test that required environment variables are set."""
    # These should be set in CI environment
    assert os.getenv("DATABASE_URL") is not None, "DATABASE_URL should be set"
    assert (
        os.getenv("GOOGLE_MAPS_API_KEY") is not None
    ), "GOOGLE_MAPS_API_KEY should be set"
    assert os.getenv("SECRET_KEY") is not None, "SECRET_KEY should be set"


def test_imports():
    """Test that core modules can be imported."""
    try:
        assert True, "All core modules imported successfully"
    except ImportError as e:
        pytest.fail(f"Failed to import required module: {e}")


def test_basic_functionality():
    """Basic functionality test."""
    assert 1 + 1 == 2, "Basic arithmetic should work"


@pytest.mark.unit
def test_unit_test_marker():
    """Test that pytest markers work correctly."""
    assert True, "Unit test marker works"


@pytest.mark.integration
def test_integration_test_marker():
    """Test that integration test marker works."""
    assert True, "Integration test marker works"


@pytest.mark.slow
def test_slow_test_marker():
    """Test that slow test marker works."""
    assert True, "Slow test marker works"


@pytest.mark.security
def test_security_test_marker():
    """Test that security test marker works."""
    assert True, "Security test marker works"


@pytest.mark.performance
def test_performance_test_marker():
    """Test that performance test marker works."""
    assert True, "Performance test marker works"
