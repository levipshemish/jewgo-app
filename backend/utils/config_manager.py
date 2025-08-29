"""
Configuration manager for the application.

This module provides centralized configuration management to replace
hardcoded values throughout the application.
"""

import os
from typing import Any, Dict, List
from utils.logging_config import get_logger

logger = get_logger(__name__)


def _load_config_env():
    """Load environment variables from root .env file if it exists."""
    # Look for .env file in the project root (2 levels up from utils/)
    root_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")

    if os.path.exists(root_env_path):
        try:
            with open(root_env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip()

                        # Remove quotes if present
                        if (value.startswith('"') and value.endswith('"')) or (
                            value.startswith("'") and value.endswith("'")
                        ):
                            value = value[1:-1]

                        # Only set if not already in environment
                        if key not in os.environ:
                            os.environ[key] = value
                            logger.debug(f"ConfigManager: Loaded .env variable: {key}")

            logger.info(
                f"ConfigManager: Loaded environment variables from {root_env_path}"
            )
        except Exception as e:
            logger.warning(f"ConfigManager: Failed to load .env file: {e}")
    else:
        logger.debug(f"ConfigManager: .env file not found at {root_env_path}")

        # Fallback to backend/config.env for backward compatibility
        config_env_path = os.path.join(os.path.dirname(__file__), "..", "config.env")
        if os.path.exists(config_env_path):
            try:
                with open(config_env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, value = line.split("=", 1)
                            key = key.strip()
                            value = value.strip()

                            # Remove quotes if present
                            if (value.startswith('"') and value.endswith('"')) or (
                                value.startswith("'") and value.endswith("'")
                            ):
                                value = value[1:-1]

                            # Only set if not already in environment
                            if key not in os.environ:
                                os.environ[key] = value
                                logger.debug(
                                    f"ConfigManager: Loaded config.env variable: {key}"
                                )

                logger.info(
                    f"ConfigManager: Loaded environment variables from {config_env_path} (fallback)"
                )
            except Exception as e:
                logger.warning(f"ConfigManager: Failed to load config.env file: {e}")
        else:
            logger.debug(f"ConfigManager: No .env or config.env file found")


class ConfigManager:
    """Centralized configuration manager for the application."""

    def __init__(self):
        # Load config.env file first
        _load_config_env()

        self._config_cache: Dict[str, Any] = {}
        self._load_configuration()

    def _load_configuration(self) -> None:
        """Load configuration from environment variables and defaults."""
        # Database configuration
        self._config_cache.update(
            {
                "database": {
                    "host": os.getenv("DATABASE_HOST", "localhost"),
                    "port": int(os.getenv("DATABASE_PORT", "5432")),
                    "name": os.getenv("DATABASE_NAME", "jewgo"),
                    "user": os.getenv("DATABASE_USER", "postgres"),
                    "password": os.getenv("DATABASE_PASSWORD", ""),
                    "pool_size": int(os.getenv("DATABASE_POOL_SIZE", "10")),
                    "max_overflow": int(os.getenv("DATABASE_MAX_OVERFLOW", "20")),
                },
                # Redis configuration
                "redis": {
                    "host": os.getenv("REDIS_HOST", "localhost"),
                    "port": int(os.getenv("REDIS_PORT", "6379")),
                    "db": int(os.getenv("REDIS_DB", "0")),
                    "password": os.getenv("REDIS_PASSWORD"),
                    "ssl": os.getenv("REDIS_SSL", "false").lower() == "true",
                },
                # API configuration
                "api": {
                    "rate_limit": int(os.getenv("API_RATE_LIMIT", "100")),
                    "rate_limit_window": int(
                        os.getenv("API_RATE_LIMIT_WINDOW", "3600")
                    ),
                    "max_page_size": int(os.getenv("API_MAX_PAGE_SIZE", "100")),
                    "default_page_size": int(os.getenv("API_DEFAULT_PAGE_SIZE", "20")),
                },
                # Security configuration
                "security": {
                    "admin_token": os.getenv("ADMIN_TOKEN"),
                    "jwt_secret": os.getenv("JWT_SECRET"),
                    "cors_origins": os.getenv("CORS_ORIGINS", "").split(","),
                    "session_timeout": int(os.getenv("SESSION_TIMEOUT", "3600")),
                },
                # External services
                "external_services": {
                    "google_places_api_key": os.getenv("GOOGLE_PLACES_API_KEY"),
                    "google_maps_api_key": os.getenv("GOOGLE_MAPS_API_KEY"),
                    "supabase_url": os.getenv("SUPABASE_URL"),
                    "supabase_key": os.getenv("SUPABASE_KEY"),
                },
                # Feature flags
                "features": {
                    "api_v4_enabled": os.getenv("API_V4_ENABLED", "true").lower()
                    == "true",
                    "api_v4_reviews": os.getenv("API_V4_REVIEWS", "false").lower()
                    == "true",
                    "marketplace_enabled": os.getenv(
                        "MARKETPLACE_ENABLED", "true"
                    ).lower()
                    == "true",
                    "search_enabled": os.getenv("SEARCH_ENABLED", "true").lower()
                    == "true",
                },
                # Logging configuration
                "logging": {
                    "level": os.getenv("LOG_LEVEL", "INFO"),
                    "format": os.getenv("LOG_FORMAT", "json"),
                    "file_path": os.getenv("LOG_FILE_PATH"),
                },
                # Environment configuration
                "environment": {
                    "production": os.getenv("ENVIRONMENT", "development").lower()
                    == "production",
                    "development": os.getenv("ENVIRONMENT", "development").lower()
                    == "development",
                    "testing": os.getenv("ENVIRONMENT", "development").lower()
                    == "testing",
                    "name": os.getenv("ENVIRONMENT", "development"),
                },
                # Server configuration
                "server": {
                    "port": int(os.getenv("PORT", "8082")),
                    "host": os.getenv("HOST", "0.0.0.0"),
                    "debug": os.getenv("ENVIRONMENT", "development").lower()
                    != "production",
                },
            }
        )

        # Log feature flag status
        logger.info(
            f"Feature flags loaded: API_V4_ENABLED={self._config_cache['features']['api_v4_enabled']}, API_V4_REVIEWS={self._config_cache['features']['api_v4_reviews']}"
        )

    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value by key."""
        keys = key.split(".")
        value = self._config_cache

        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            logger.warning(
                f"Configuration key '{key}' not found, using default: {default}"
            )
            return default

    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration."""
        return self.get("database", {})

    def get_redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration."""
        return self.get("redis", {})

    def get_api_config(self) -> Dict[str, Any]:
        """Get API configuration."""
        return self.get("api", {})

    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration."""
        return self.get("security", {})

    def get_external_services_config(self) -> Dict[str, Any]:
        """Get external services configuration."""
        return self.get("external_services", {})

    def get_features_config(self) -> Dict[str, Any]:
        """Get feature flags configuration."""
        return self.get("features", {})

    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration."""
        return self.get("logging", {})

    def is_feature_enabled(self, feature_name: str) -> bool:
        """Check if a feature is enabled."""
        return self.get(f"features.{feature_name}", False)

    def get_marketplace_categories(self) -> List[Dict[str, Any]]:
        """Get marketplace categories configuration."""
        # This replaces the hardcoded fallback categories
        return [
            {
                "id": 1,
                "name": "Baked Goods",
                "slug": "baked-goods",
                "sort_order": 1,
                "active": True,
                "subcategories": [
                    {
                        "id": 1,
                        "name": "Bread",
                        "slug": "bread",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 2,
                        "name": "Pastries",
                        "slug": "pastries",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 2,
                "name": "Accessories",
                "slug": "accessories",
                "sort_order": 2,
                "active": True,
                "subcategories": [
                    {
                        "id": 3,
                        "name": "Jewelry",
                        "slug": "jewelry",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 4,
                        "name": "Clothing",
                        "slug": "clothing",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 3,
                "name": "Vehicles",
                "slug": "vehicles",
                "sort_order": 3,
                "active": True,
                "subcategories": [
                    {
                        "id": 5,
                        "name": "Cars",
                        "slug": "cars",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 6,
                        "name": "Motorcycles",
                        "slug": "motorcycles",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 4,
                "name": "Appliances",
                "slug": "appliances",
                "sort_order": 4,
                "active": True,
                "subcategories": [
                    {
                        "id": 7,
                        "name": "Kitchen",
                        "slug": "kitchen",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 8,
                        "name": "Laundry",
                        "slug": "laundry",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
        ]

    def reload(self) -> None:
        """Reload configuration from environment variables."""
        logger.info("Reloading configuration")
        self._config_cache.clear()
        self._load_configuration()

    def validate(self) -> List[str]:
        """Validate required configuration values."""
        errors = []

        # Check required database configuration
        db_config = self.get_database_config()
        if not db_config.get("host"):
            errors.append("DATABASE_HOST is required")
        if not db_config.get("name"):
            errors.append("DATABASE_NAME is required")

        # Check required security configuration
        security_config = self.get_security_config()
        if not security_config.get("admin_token"):
            errors.append("ADMIN_TOKEN is required for admin operations")

        # Check required external services
        ext_config = self.get_external_services_config()
        if not ext_config.get("supabase_url"):
            errors.append("SUPABASE_URL is required")
        if not ext_config.get("supabase_key"):
            errors.append("SUPABASE_KEY is required")

        return errors


# Global configuration instance
config_manager = ConfigManager()
