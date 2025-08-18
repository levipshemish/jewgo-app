#!/usr/bin/env python3
"""Tests for the feature flags system."""

import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
from utils.feature_flags import (
    FeatureFlag,
    FeatureFlagManager,
    feature_flag_manager,
    get_feature_flags,
    is_feature_enabled,
    require_feature_flag,
)
from app import app

class TestFeatureFlag:
    """Test the FeatureFlag class."""

    def test_feature_flag_creation(self) -> None:
        """Test creating a feature flag."""
        flag = FeatureFlag(
            name="test_flag",
            enabled=True,
            description="Test flag",
            version="1.0",
            rollout_percentage=50.0,
            target_environments=["development", "staging"],
        )

        assert flag.name == "test_flag"
        assert flag.enabled is True
        assert flag.description == "Test flag"
        assert flag.version == "1.0"
        assert flag.rollout_percentage == 50.0
        assert flag.target_environments == ["development", "staging"]

    def test_feature_flag_to_dict(self) -> None:
        """Test converting feature flag to dictionary."""
        flag = FeatureFlag(
            name="test_flag",
            enabled=True,
            description="Test flag",
            version="1.0",
            rollout_percentage=50.0,
        )

        flag_dict = flag.to_dict()

        assert flag_dict["name"] == "test_flag"
        assert flag_dict["enabled"] is True
        assert flag_dict["description"] == "Test flag"
        assert flag_dict["version"] == "1.0"
        assert flag_dict["rollout_percentage"] == 50.0

    def test_feature_flag_from_dict(self) -> None:
        """Test creating feature flag from dictionary."""
        flag_data = {
            "name": "test_flag",
            "enabled": True,
            "description": "Test flag",
            "version": "1.0",
            "rollout_percentage": 50.0,
            "target_environments": ["development"],
        }

        flag = FeatureFlag.from_dict(flag_data)

        assert flag.name == "test_flag"
        assert flag.enabled is True
        assert flag.description == "Test flag"
        assert flag.version == "1.0"
        assert flag.rollout_percentage == 50.0
        assert flag.target_environments == ["development"]

    def test_feature_flag_expiration(self) -> None:
        """Test feature flag expiration."""
        # Flag with expiration in the past
        past_time = datetime.utcnow() - timedelta(hours=1)
        expired_flag = FeatureFlag(
            name="expired_flag",
            enabled=True,
            expires_at=past_time,
        )

        assert expired_flag.is_expired() is True

        # Flag with expiration in the future
        future_time = datetime.utcnow() + timedelta(hours=1)
        active_flag = FeatureFlag(
            name="active_flag",
            enabled=True,
            expires_at=future_time,
        )

        assert active_flag.is_expired() is False

        # Flag without expiration
        no_expiry_flag = FeatureFlag(
            name="no_expiry_flag",
            enabled=True,
        )

        assert no_expiry_flag.is_expired() is False

    def test_feature_flag_user_targeting(self) -> None:
        """Test user-specific targeting."""
        flag = FeatureFlag(
            name="user_flag",
            enabled=True,
            target_users=["user1", "user2"],
        )

        # User in target list
        assert flag.should_enable_for_user("user1", "development") is True

        # User not in target list
        assert flag.should_enable_for_user("user3", "development") is False

        # No user targeting
        flag.target_users = []
        assert flag.should_enable_for_user("user1", "development") is True

    def test_feature_flag_environment_targeting(self) -> None:
        """Test environment-specific targeting."""
        flag = FeatureFlag(
            name="env_flag",
            enabled=True,
            target_environments=["development", "staging"],
        )

        # Environment in target list
        assert flag.should_enable_for_user("user1", "development") is True
        assert flag.should_enable_for_user("user1", "staging") is True

        # Environment not in target list
        assert flag.should_enable_for_user("user1", "production") is False

        # No environment targeting
        flag.target_environments = []
        assert flag.should_enable_for_user("user1", "production") is True

    def test_feature_flag_rollout_percentage(self) -> None:
        """Test rollout percentage functionality."""
        flag = FeatureFlag(
            name="rollout_flag",
            enabled=True,
            rollout_percentage=50.0,
        )

        # Test with specific user ID for consistent results
        user_id = "test_user_123"

        # Should be consistent for the same user
        result1 = flag.should_enable_for_user(user_id, "development")
        result2 = flag.should_enable_for_user(user_id, "development")
        assert result1 == result2

        # 100% rollout should always be enabled
        flag.rollout_percentage = 100.0
        assert flag.should_enable_for_user(user_id, "development") is True

        # 0% rollout should always be disabled
        flag.rollout_percentage = 0.0
        assert flag.should_enable_for_user(user_id, "development") is False


class TestFeatureFlagManager:
    """Test the FeatureFlagManager class."""

    @patch.dict("os.environ", {"ENVIRONMENT": "test"})
    def test_feature_flag_manager_initialization(self) -> None:
        """Test feature flag manager initialization."""
        manager = FeatureFlagManager()

        assert manager.environment == "test"
        assert isinstance(manager.flags, dict)

    def test_feature_flag_manager_add_flag(self) -> None:
        """Test adding a feature flag."""
        manager = FeatureFlagManager()
        flag = FeatureFlag(name="test_flag", enabled=True)

        success = manager.add_flag(flag)

        assert success is True
        assert "test_flag" in manager.flags
        assert manager.flags["test_flag"] == flag

    def test_feature_flag_manager_update_flag(self) -> None:
        """Test updating a feature flag."""
        manager = FeatureFlagManager()
        flag = FeatureFlag(
            name="test_flag",
            enabled=True,
            description="Old description",
        )
        manager.add_flag(flag)

        success = manager.update_flag("test_flag", {"description": "New description"})

        assert success is True
        assert manager.flags["test_flag"].description == "New description"

    def test_feature_flag_manager_remove_flag(self) -> None:
        """Test removing a feature flag."""
        manager = FeatureFlagManager()
        flag = FeatureFlag(name="test_flag", enabled=True)
        manager.add_flag(flag)

        success = manager.remove_flag("test_flag")

        assert success is True
        assert "test_flag" not in manager.flags

    def test_feature_flag_manager_is_enabled(self) -> None:
        """Test checking if a feature flag is enabled."""
        manager = FeatureFlagManager()
        flag = FeatureFlag(name="test_flag", enabled=True)
        manager.add_flag(flag)

        assert manager.is_enabled("test_flag") is True
        assert manager.is_enabled("non_existent_flag", default=True) is True
        assert manager.is_enabled("non_existent_flag", default=False) is False

    def test_feature_flag_manager_validate_config(self) -> None:
        """Test feature flag configuration validation."""
        manager = FeatureFlagManager()

        # Valid configuration
        valid_config = {
            "name": "test_flag",
            "enabled": True,
            "description": "Test flag",
            "version": "1.0",
            "rollout_percentage": 50.0,
        }

        validation = manager.validate_flag_config(valid_config)
        assert validation["valid"] is True
        assert len(validation["errors"]) == 0

        # Invalid configuration
        invalid_config = {
            "enabled": "not_a_boolean",
            "rollout_percentage": 150.0,
        }

        validation = manager.validate_flag_config(invalid_config)
        assert validation["valid"] is False
        assert len(validation["errors"]) > 0


class TestFeatureFlagDecorators:
    """Test feature flag decorators."""

    def test_require_feature_flag_decorator_enabled(
        self, app, mock_feature_flags
    ) -> None:
        """Test require_feature_flag decorator when feature is enabled."""
        with app.test_request_context():
            # Mock the feature flag as enabled
            with patch(
                "utils.feature_flags.feature_flag_manager.is_enabled",
                return_value=True,
            ):

                @require_feature_flag("test_flag")
                def test_function() -> str:
                    return "success"

                result = test_function()
                assert result == "success"

    def test_require_feature_flag_decorator_disabled(
        self, app, mock_feature_flags
    ) -> None:
        """Test require_feature_flag decorator when feature is disabled."""
        with app.test_request_context():
            # Mock the feature flag as disabled
            with patch(
                "utils.feature_flags.feature_flag_manager.is_enabled",
                return_value=False,
            ):

                @require_feature_flag("test_flag")
                def test_function() -> str:
                    return "success"

                result = test_function()

                # Should return error response
                assert result.status_code == 403
                assert "Feature not available" in result.get_json()["error"]


class TestFeatureFlagAPI:
    """Test feature flag API endpoints."""

    def test_get_feature_flags_endpoint(self, client, mock_feature_flags) -> None:
        """Test GET /api/feature-flags endpoint."""
        response = client.get("/api/feature-flags")

        assert response.status_code == 200
        data = response.get_json()

        assert "feature_flags" in data
        assert "environment" in data
        assert "user_id" in data

    def test_get_specific_feature_flag_endpoint(
        self, client, mock_feature_flags
    ) -> None:
        """Test GET /api/feature-flags/{flag_name} endpoint."""
        response = client.get("/api/feature-flags/advanced_search")

        assert response.status_code == 200
        data = response.get_json()

        assert data["flag_name"] == "advanced_search"
        assert "enabled" in data
        assert "description" in data

    def test_get_nonexistent_feature_flag_endpoint(self, client) -> None:
        """Test GET /api/feature-flags/{flag_name} with non-existent flag."""
        response = client.get("/api/feature-flags/nonexistent_flag")

        assert response.status_code == 404
        data = response.get_json()
        assert "Feature flag not found" in data["error"]

    def test_create_feature_flag_endpoint(self, client, mock_auth_token) -> None:
        """Test POST /api/feature-flags endpoint."""
        with patch(
            "utils.security.SecurityManager.validate_admin_token",
            return_value=mock_auth_token,
        ):
            flag_data = {
                "name": "new_test_flag",
                "enabled": False,
                "description": "New test flag",
                "version": "0.1",
                "rollout_percentage": 0.0,
            }

            response = client.post(
                "/api/feature-flags",
                json=flag_data,
                headers={"Authorization": "Bearer test_token"},
            )

            assert response.status_code == 201
            data = response.get_json()
            assert "Feature flag created successfully" in data["message"]

    def test_update_feature_flag_endpoint(
        self,
        client,
        mock_auth_token,
        mock_feature_flags,
    ) -> None:
        """Test POST /api/feature-flags/{flag_name} endpoint."""
        with patch(
            "utils.security.SecurityManager.validate_admin_token",
            return_value=mock_auth_token,
        ):
            update_data = {
                "enabled": True,
                "rollout_percentage": 50.0,
            }

            response = client.post(
                "/api/feature-flags/advanced_search",
                json=update_data,
                headers={"Authorization": "Bearer test_token"},
            )

            assert response.status_code == 200
            data = response.get_json()
            assert "Feature flag updated successfully" in data["message"]

    def test_delete_feature_flag_endpoint(
        self,
        client,
        mock_auth_token,
        mock_feature_flags,
    ) -> None:
        """Test DELETE /api/feature-flags/{flag_name} endpoint."""
        with patch(
            "utils.security.SecurityManager.validate_admin_token",
            return_value=mock_auth_token,
        ):
            response = client.delete(
                "/api/feature-flags/advanced_search",
                headers={"Authorization": "Bearer test_token"},
            )

            assert response.status_code == 200
            data = response.get_json()
            assert "Feature flag deleted successfully" in data["message"]

    def test_validate_feature_flag_endpoint(self, client) -> None:
        """Test POST /api/feature-flags/validate endpoint."""
        valid_config = {
            "name": "test_flag",
            "enabled": True,
            "description": "Test flag",
            "version": "1.0",
            "rollout_percentage": 50.0,
        }

        response = client.post("/api/feature-flags/validate", json=valid_config)

        assert response.status_code == 200
        data = response.get_json()
        assert data["valid"] is True


class TestFeatureFlagIntegration:
    """Integration tests for feature flags."""

    def test_feature_flag_with_restaurant_search(
        self, client, mock_feature_flags
    ) -> None:
        """Test that restaurant search endpoint respects feature flags."""
        # Test with advanced_search enabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=True,
        ):
            response = client.get("/api/restaurants/search?q=test")
            assert response.status_code == 200

        # Test with advanced_search disabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=False,
        ):
            response = client.get("/api/restaurants/search?q=test")
            assert response.status_code == 403

    def test_feature_flag_with_hours_management(
        self, client, mock_feature_flags
    ) -> None:
        """Test that hours management endpoint respects feature flags."""
        # Test with hours_management enabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=True,
        ):
            response = client.get("/api/restaurants/1/hours")
            assert response.status_code == 200

        # Test with hours_management disabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=False,
        ):
            response = client.get("/api/restaurants/1/hours")
            assert response.status_code == 403

    def test_feature_flag_with_specials_system(
        self, client, mock_feature_flags
    ) -> None:
        """Test that specials system endpoint respects feature flags."""
        # Test with specials_system enabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=True,
        ):
            response = client.get("/api/restaurants/1/specials")
            assert response.status_code == 200

        # Test with specials_system disabled
        with patch(
            "utils.feature_flags.feature_flag_manager.is_enabled",
            return_value=False,
        ):
            response = client.get("/api/restaurants/1/specials")
            assert response.status_code == 403


class TestFeatureFlagPerformance:
    """Performance tests for feature flags."""

    @pytest.mark.performance
    def test_feature_flag_evaluation_performance(self) -> None:
        """Test that feature flag evaluation is fast."""
        manager = FeatureFlagManager()
        flag = FeatureFlag(name="perf_flag", enabled=True)
        manager.add_flag(flag)

        start_time = time.time()
        for _ in range(1000):
            manager.is_enabled("perf_flag")
        end_time = time.time()

        # Should complete 1000 evaluations in less than 1 second
        assert (end_time - start_time) < 1.0

    @pytest.mark.performance
    def test_feature_flag_manager_initialization_performance(self) -> None:
        """Test that feature flag manager initialization is fast."""
        start_time = time.time()
        manager = FeatureFlagManager()
        end_time = time.time()

        # Should initialize in less than 100ms
        assert (end_time - start_time) < 0.1


class TestFeatureFlagSecurity:
    """Security tests for feature flags."""

    @pytest.mark.security
    def test_feature_flag_admin_authentication(self, client) -> None:
        """Test that admin endpoints require authentication."""
        # Test without authentication
        response = client.post("/api/feature-flags", json={})
        assert response.status_code == 401

        response = client.post("/api/feature-flags/test_flag", json={})
        assert response.status_code == 401

        response = client.delete("/api/feature-flags/test_flag")
        assert response.status_code == 401

    @pytest.mark.security
    def test_feature_flag_input_validation(self, client, mock_auth_token) -> None:
        """Test that feature flag input is properly validated."""
        with patch(
            "utils.security.SecurityManager.validate_admin_token",
            return_value=mock_auth_token,
        ):
            # Test with invalid rollout percentage
            invalid_data = {
                "name": "test_flag",
                "enabled": True,
                "rollout_percentage": 150.0,  # Invalid: > 100
            }

            response = client.post("/api/feature-flags", json=invalid_data)
            assert response.status_code == 400
            data = response.get_json()
            assert "Invalid feature flag configuration" in data["error"]

    @pytest.mark.security
    def test_feature_flag_sql_injection_prevention(self, client) -> None:
        """Test that feature flag names are properly sanitized."""
        malicious_flag_name = "'; DROP TABLE restaurants; --"

        response = client.get(f"/api/feature-flags/{malicious_flag_name}")

        # Should not cause SQL injection
        assert response.status_code == 404
