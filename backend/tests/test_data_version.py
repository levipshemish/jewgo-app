#!/usr/bin/env python3
"""
Tests for data version utility.

Tests the get_current_data_version function and its behavior
across different environments and entity types.
"""

import pytest
import os
from unittest.mock import patch
from backend.utils.data_version import get_current_data_version


class TestDataVersion:
    """Test data version utility functions."""
    
    def test_get_current_data_version_default(self):
        """Test getting default data version."""
        version = get_current_data_version()
        assert isinstance(version, str)
        assert version.startswith("v5.0.1")
    
    def test_get_current_data_version_with_entity_type(self):
        """Test getting data version with entity type."""
        version = get_current_data_version("restaurants")
        assert isinstance(version, str)
        assert version.startswith("v5.0.1")
        assert version.endswith("-restaurants")
    
    def test_get_current_data_version_production(self):
        """Test getting data version in production environment."""
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            version = get_current_data_version()
            assert version.startswith("v5.0.1-prod")
    
    def test_get_current_data_version_development(self):
        """Test getting data version in development environment."""
        with patch.dict(os.environ, {"FLASK_ENV": "development"}):
            version = get_current_data_version()
            assert version.startswith("v5.0.1-dev")
    
    def test_get_current_data_version_no_env(self):
        """Test getting data version when no environment is set."""
        with patch.dict(os.environ, {}, clear=True):
            version = get_current_data_version()
            assert version.startswith("v5.0.1-dev")  # Defaults to dev
    
    def test_get_current_data_version_different_entity_types(self):
        """Test getting data version for different entity types."""
        entity_types = ["restaurants", "synagogues", "mikvahs", "stores", "reviews"]
        
        for entity_type in entity_types:
            version = get_current_data_version(entity_type)
            assert isinstance(version, str)
            assert version.endswith(f"-{entity_type}")
    
    def test_get_current_data_version_case_sensitivity(self):
        """Test that entity type is converted to lowercase."""
        version = get_current_data_version("RESTAURANTS")
        assert version.endswith("-restaurants")
    
    def test_get_current_data_version_empty_entity_type(self):
        """Test getting data version with empty entity type."""
        version = get_current_data_version("")
        assert isinstance(version, str)
        assert version.startswith("v5.0.1")
        # Should not have a trailing dash
        assert not version.endswith("-")
    
    def test_get_current_data_version_none_entity_type(self):
        """Test getting data version with None entity type."""
        version = get_current_data_version(None)
        assert isinstance(version, str)
        assert version.startswith("v5.0.1")
        # Should not have a trailing dash
        assert not version.endswith("-")
