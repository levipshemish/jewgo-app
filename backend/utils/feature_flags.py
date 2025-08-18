#!/usr/bin/env python3
"""Feature Flags System for JewGo App.
==================================

This module provides a comprehensive feature flag system that supports:
- Environment-based feature toggles
- Dynamic feature flags with database storage
- Feature flag validation and management
- Integration with Split.io (optional)
- Feature flag analytics and monitoring

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

import hashlib
import json
import os
import random
from datetime import datetime
from functools import wraps
from typing import Any

from flask import jsonify, make_response, request

from utils.logging_config import get_logger

# Try to import Split.io, but don't fail if not available
try:
    from splitio import get_factory
except ImportError:
    get_factory = None

logger = get_logger(__name__)

class FeatureFlag:
    """Represents a single feature flag."""

    def __init__(
        self,
        name: str,
        enabled: bool = False,
        description: str = "",
        version: str = "1.0",
        rollout_percentage: float = 100.0,
        target_environments: list[str] | None = None,
        target_users: list[str] | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        expires_at: datetime | None = None,
    ) -> None:
        self.name = name
        self.enabled = enabled
        self.description = description
        self.version = version
        self.rollout_percentage = min(max(rollout_percentage, 0.0), 100.0)
        self.target_environments = target_environments or []
        self.target_users = target_users or []
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.expires_at = expires_at

    def to_dict(self) -> dict[str, Any]:
        """Convert feature flag to dictionary."""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "description": self.description,
            "version": self.version,
            "rollout_percentage": self.rollout_percentage,
            "target_environments": self.target_environments,
            "target_users": self.target_users,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FeatureFlag":
        """Create feature flag from dictionary."""
        return cls(
            name=data["name"],
            enabled=data.get("enabled", False),
            description=data.get("description", ""),
            version=data.get("version", "1.0"),
            rollout_percentage=data.get("rollout_percentage", 100.0),
            target_environments=data.get("target_environments", []),
            target_users=data.get("target_users", []),
            created_at=(
                datetime.fromisoformat(data["created_at"])
                if data.get("created_at")
                else None
            ),
            updated_at=(
                datetime.fromisoformat(data["updated_at"])
                if data.get("updated_at")
                else None
            ),
            expires_at=(
                datetime.fromisoformat(data["expires_at"])
                if data.get("expires_at")
                else None
            ),
        )

    def is_expired(self) -> bool:
        """Check if feature flag has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def should_enable_for_user(
        self,
        user_id: str | None = None,
        environment: str | None = None,
    ) -> bool:
        """Determine if feature should be enabled for a specific user."""
        # Check if feature is globally enabled
        if not self.enabled:
            return False

        # Check if feature has expired
        if self.is_expired():
            return False

        # Check environment targeting
        if environment and self.target_environments:
            if environment not in self.target_environments:
                return False

        # Check user targeting
        if user_id and self.target_users and user_id not in self.target_users:
            return False

        # Check rollout percentage
        if self.rollout_percentage < 100.0:
            if user_id:
                # Use user ID for consistent rollout
                user_hash = int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16)
                user_percentage = (user_hash % 100) + 1
                return user_percentage <= self.rollout_percentage
            # Use random rollout for anonymous users
            return random.random() * 100 <= self.rollout_percentage

        return True


class FeatureFlagManager:
    """Manages feature flags for the application."""

    def __init__(self) -> None:
        self.flags: dict[str, FeatureFlag] = {}
        self.environment = os.environ.get("ENVIRONMENT", "development")
        self.split_io_client = None
        self._load_flags()
        self._setup_split_io()

    def _load_flags(self) -> None:
        """Load feature flags from environment variables and configuration."""
        # Load from environment variables
        env_flags = os.environ.get("FEATURE_FLAGS", "{}")
        try:
            env_flag_data = json.loads(env_flags)
            for flag_name, flag_data in env_flag_data.items():
                if isinstance(flag_data, bool):
                    # Simple boolean flag
                    self.flags[flag_name] = FeatureFlag(
                        name=flag_name,
                        enabled=flag_data,
                        description=f"Environment-based flag: {flag_name}",
                    )
                elif isinstance(flag_data, dict):
                    # Complex flag configuration
                    flag_data["name"] = flag_name
                    self.flags[flag_name] = FeatureFlag.from_dict(flag_data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(
                "Failed to parse FEATURE_FLAGS environment variable", error=str(e)
            )

        # Load default flags
        self._load_default_flags()

        logger.info("Loaded feature flags", count=len(self.flags))

    def _load_default_flags(self) -> None:
        """Load default feature flags."""
        default_flags = {
            # Core Features
            "advanced_search": FeatureFlag(
                name="advanced_search",
                enabled=True,
                description="Advanced search with fuzzy matching and relevance scoring",
                version="1.0",
                rollout_percentage=100.0,
            ),
            "hours_management": FeatureFlag(
                name="hours_management",
                enabled=True,
                description="Enhanced hours management with normalization",
                version="1.0",
                rollout_percentage=100.0,
            ),
            "specials_system": FeatureFlag(
                name="specials_system",
                enabled=True,
                description="Restaurant specials management system",
                version="1.0",
                rollout_percentage=100.0,
            ),
            # Beta Features
            "reviews_system": FeatureFlag(
                name="reviews_system",
                enabled=False,
                description="Restaurant reviews and ratings system",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development", "staging"],
            ),
            "loyalty_program": FeatureFlag(
                name="loyalty_program",
                enabled=False,
                description="Customer loyalty and rewards program",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development"],
            ),
            "advanced_analytics": FeatureFlag(
                name="advanced_analytics",
                enabled=False,
                description="Advanced analytics and reporting",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development"],
            ),
            # Experimental Features
            "ai_recommendations": FeatureFlag(
                name="ai_recommendations",
                enabled=False,
                description="AI-powered restaurant recommendations",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development"],
            ),
            "voice_search": FeatureFlag(
                name="voice_search",
                enabled=False,
                description="Voice search functionality",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development"],
            ),
            # Security Features
            "enhanced_security": FeatureFlag(
                name="enhanced_security",
                enabled=True,
                description="Enhanced security with IP restrictions and token auth",
                version="1.0",
                rollout_percentage=100.0,
            ),
            # Performance Features
            "caching_system": FeatureFlag(
                name="caching_system",
                enabled=False,
                description="Advanced caching system for improved performance",
                version="0.1",
                rollout_percentage=0.0,
                target_environments=["development", "staging"],
            ),
        }

        # Only add default flags if they don't already exist
        for flag_name, flag in default_flags.items():
            if flag_name not in self.flags:
                self.flags[flag_name] = flag

    def _setup_split_io(self) -> None:
        """Setup Split.io integration if configured."""
        split_api_key = os.environ.get("SPLIT_IO_API_KEY")
        if split_api_key:
            try:
                factory = get_factory(split_api_key)
                self.split_io_client = factory.client()
                logger.info("Split.io client initialized")
            except ImportError:
                logger.warning(
                    "Split.io not installed. Install with: pip install splitio",
                )
            except Exception as e:
                logger.exception("Failed to initialize Split.io client", error=str(e))

    def is_enabled(
        self,
        flag_name: str,
        user_id: str | None = None,
        default: bool = False,
    ) -> bool:
        """Check if a feature flag is enabled.

        Args:
            flag_name: Name of the feature flag
            user_id: Optional user ID for user-specific targeting
            default: Default value if flag is not found

        Returns:
            True if feature is enabled, False otherwise

        """
        # Check Split.io first if available
        if self.split_io_client:
            try:
                split_result = self.split_io_client.get_treatment(
                    user_id or "anonymous",
                    flag_name,
                )
                if split_result in ["on", "off"]:
                    return split_result == "on"
            except Exception as e:
                logger.warning(
                    "Split.io error for flag", flag_name=flag_name, error=str(e)
                )

        # Check local flags
        flag = self.flags.get(flag_name)
        if not flag:
            return default

        return flag.should_enable_for_user(user_id, self.environment)

    def get_flag(self, flag_name: str) -> FeatureFlag | None:
        """Get a feature flag by name."""
        return self.flags.get(flag_name)

    def get_all_flags(self) -> dict[str, FeatureFlag]:
        """Get all feature flags."""
        return self.flags.copy()

    def add_flag(self, flag: FeatureFlag) -> bool:
        """Add a new feature flag."""
        try:
            self.flags[flag.name] = flag
            logger.info("Added feature flag", flag_name=flag.name)
            return True
        except Exception as e:
            logger.exception(
                "Failed to add feature flag", flag_name=flag.name, error=str(e)
            )
            return False

    def update_flag(self, flag_name: str, updates: dict[str, Any]) -> bool:
        """Update an existing feature flag."""
        flag = self.flags.get(flag_name)
        if not flag:
            return False

        try:
            for key, value in updates.items():
                if hasattr(flag, key):
                    setattr(flag, key, value)

            flag.updated_at = datetime.utcnow()
            logger.info("Updated feature flag", flag_name=flag_name)
            return True
        except Exception as e:
            logger.exception(
                "Failed to update feature flag", flag_name=flag_name, error=str(e)
            )
            return False

    def remove_flag(self, flag_name: str) -> bool:
        """Remove a feature flag."""
        if flag_name in self.flags:
            del self.flags[flag_name]
            logger.info("Removed feature flag", flag_name=flag_name)
            return True
        return False

    def get_flags_for_user(self, user_id: str | None = None) -> dict[str, bool]:
        """Get all feature flags and their enabled status for a user."""
        result = {}
        for flag_name, flag in self.flags.items():
            result[flag_name] = flag.should_enable_for_user(user_id, self.environment)
        return result

    def validate_flag_config(self, flag_data: dict[str, Any]) -> dict[str, Any]:
        """Validate feature flag configuration."""
        errors = []
        warnings = []

        # Check required fields
        if "name" not in flag_data:
            errors.append("Missing required field: name")

        # Check field types
        if "enabled" in flag_data and not isinstance(flag_data["enabled"], bool):
            errors.append("'enabled' must be a boolean")

        if "rollout_percentage" in flag_data:
            try:
                percentage = float(flag_data["rollout_percentage"])
                if not 0 <= percentage <= 100:
                    errors.append("'rollout_percentage' must be between 0 and 100")
            except (ValueError, TypeError):
                errors.append("'rollout_percentage' must be a number")

        # Check date formats
        for date_field in ["created_at", "updated_at", "expires_at"]:
            if flag_data.get(date_field):
                try:
                    datetime.fromisoformat(flag_data[date_field])
                except ValueError:
                    errors.append(f"'{date_field}' must be a valid ISO datetime string")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }


# Global feature flag manager instance
feature_flag_manager = FeatureFlagManager()


def require_feature_flag(flag_name: str, default: bool = False):
    """Decorator to require a feature flag for an endpoint.

    Args:
        flag_name: Name of the feature flag
        default: Default value if flag is not found

    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get user ID from request if available
            user_id = None
            if hasattr(request, "token_info") and request.token_info:
                user_id = request.token_info.get("user_id")

            # Check if feature is enabled
            if not feature_flag_manager.is_enabled(flag_name, user_id, default):
                return make_response(
                    jsonify(
                        {
                            "error": "Feature not available",
                            "message": f'Feature "{flag_name}" is not enabled',
                            "feature_flag": flag_name,
                        }
                    ),
                    403,
                )

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def feature_flag_context(flag_name: str, default: bool = False):
    """Context manager for feature flag checks.

    Args:
        flag_name: Name of the feature flag
        default: Default value if flag is not found

    """

    class FeatureFlagContext:
        def __init__(self, flag_name: str, default: bool) -> None:
            self.flag_name = flag_name
            self.default = default
            self.enabled = False

        def __enter__(self):
            user_id = None
            if hasattr(request, "token_info") and request.token_info:
                user_id = request.token_info.get("user_id")

            self.enabled = feature_flag_manager.is_enabled(
                self.flag_name,
                user_id,
                self.default,
            )
            return self.enabled

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    return FeatureFlagContext(flag_name, default)


# Utility functions
def is_feature_enabled(
    flag_name: str,
    user_id: str | None = None,
    default: bool = False,
) -> bool:
    """Check if a feature is enabled."""
    return feature_flag_manager.is_enabled(flag_name, user_id, default)


def get_feature_flags(user_id: str | None = None) -> dict[str, bool]:
    """Get all feature flags for a user."""
    return feature_flag_manager.get_flags_for_user(user_id)


def get_feature_flag(flag_name: str) -> FeatureFlag | None:
    """Get a specific feature flag."""
    return feature_flag_manager.get_flag(flag_name)
