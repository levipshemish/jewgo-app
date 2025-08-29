import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Search Configuration Management.
===============================

This module handles configuration for all search providers and components.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


@dataclass
class PostgreSQLSearchConfig:
    """Configuration for PostgreSQL search provider."""

    enabled: bool = True
    fuzzy_threshold: float = 0.3
    max_results: int = 100


# Vector, semantic, and hybrid search configurations removed


@dataclass
class CacheConfig:
    """Configuration for search caching."""

    enabled: bool = True
    redis_url: Optional[str] = None
    memory_cache_size: int = 1000
    default_ttl: int = 300  # seconds
    search_results_ttl: int = 600  # seconds
    embeddings_ttl: int = 3600  # seconds
    suggestions_ttl: int = 1800  # seconds


@dataclass
class PerformanceConfig:
    """Configuration for search performance."""

    max_query_length: int = 500
    max_results_per_request: int = 100
    timeout_seconds: int = 10
    enable_async: bool = True
    connection_pool_size: int = 10
    enable_compression: bool = True


@dataclass
class SearchConfig:
    """Main search configuration class."""

    # Provider configurations
    postgresql: PostgreSQLSearchConfig = field(default_factory=PostgreSQLSearchConfig)
    # Vector, semantic, and hybrid configurations removed

    # System configurations
    cache: CacheConfig = field(default_factory=CacheConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)

    # General settings
    default_search_type: str = "postgresql"
    enable_logging: bool = True
    enable_metrics: bool = True
    enable_health_checks: bool = True

    @classmethod
    def from_env(cls) -> "SearchConfig":
        """Create configuration from environment variables."""
        config = cls()

        # PostgreSQL configuration
        config.postgresql.enabled = (
            os.getenv("POSTGRESQL_SEARCH_ENABLED", "true").lower() == "true"
        )
        config.postgresql.fuzzy_threshold = float(
            os.getenv("POSTGRESQL_FUZZY_THRESHOLD", "0.3")
        )
        config.postgresql.max_results = int(os.getenv("POSTGRESQL_MAX_RESULTS", "100"))

        # Vector, semantic, and hybrid search configurations removed

        # Cache configuration
        config.cache.enabled = (
            os.getenv("SEARCH_CACHE_ENABLED", "true").lower() == "true"
        )
        config.cache.redis_url = os.getenv("REDIS_URL")
        config.cache.default_ttl = int(os.getenv("SEARCH_CACHE_TTL", "300"))

        # Performance configuration
        config.performance.timeout_seconds = int(
            os.getenv("SEARCH_TIMEOUT_SECONDS", "10")
        )
        config.performance.max_results_per_request = int(
            os.getenv("SEARCH_MAX_RESULTS", "100")
        )

        # General settings
        config.default_search_type = os.getenv("DEFAULT_SEARCH_TYPE", "postgresql")
        config.enable_logging = (
            os.getenv("SEARCH_LOGGING_ENABLED", "true").lower() == "true"
        )
        config.enable_metrics = (
            os.getenv("SEARCH_METRICS_ENABLED", "true").lower() == "true"
        )

        return config

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            "postgresql": {
                "enabled": self.postgresql.enabled,
                "fuzzy_threshold": self.postgresql.fuzzy_threshold,
                "max_results": self.postgresql.max_results,
            },
            # Vector, semantic, and hybrid configurations removed
            "cache": {
                "enabled": self.cache.enabled,
                "redis_url": self.cache.redis_url,
                "memory_cache_size": self.cache.memory_cache_size,
                "default_ttl": self.cache.default_ttl,
                "search_results_ttl": self.cache.search_results_ttl,
                "embeddings_ttl": 3600,  # Default value since embeddings are removed
            },
            "performance": {
                "max_query_length": self.performance.max_query_length,
                "max_results_per_request": self.performance.max_results_per_request,
                "timeout_seconds": self.performance.timeout_seconds,
                "enable_async": self.performance.enable_async,
                "connection_pool_size": self.performance.connection_pool_size,
            },
            "general": {
                "default_search_type": self.default_search_type,
                "enable_logging": self.enable_logging,
                "enable_metrics": self.enable_metrics,
                "enable_health_checks": self.enable_health_checks,
            },
        }

    def validate(self) -> List[str]:
        """Validate configuration and return list of errors."""
        errors = []

        # Validate PostgreSQL configuration
        if self.postgresql.enabled:
            if not 0.0 <= self.postgresql.fuzzy_threshold <= 1.0:
                errors.append("PostgreSQL fuzzy threshold must be between 0.0 and 1.0")
            if self.postgresql.max_results <= 0:
                errors.append("PostgreSQL max results must be positive")

        # Vector, semantic, and hybrid validation removed

        # Validate cache configuration
        if self.cache.enabled and self.cache.redis_url:
            if not self.cache.redis_url.startswith(("redis://", "rediss://")):
                errors.append("Redis URL must start with redis:// or rediss://")

        # Validate performance configuration
        if self.performance.timeout_seconds <= 0:
            errors.append("Performance timeout must be positive")
        if self.performance.max_results_per_request <= 0:
            errors.append("Performance max results must be positive")

        return errors

    def get_enabled_providers(self) -> List[str]:
        """Get list of enabled search providers."""
        providers = []

        if self.postgresql.enabled:
            providers.append("postgresql")
        # Vector, semantic, and hybrid providers removed

        return providers

    def is_provider_enabled(self, provider_name: str) -> bool:
        """Check if a specific provider is enabled."""
        return provider_name in self.get_enabled_providers()


# Global configuration instance
search_config = SearchConfig.from_env()


def get_search_config() -> SearchConfig:
    """Get the global search configuration."""
    return search_config


def update_search_config(new_config: SearchConfig) -> None:
    """Update the global search configuration."""
    global search_config
    search_config = new_config
    logger.info("Search configuration updated", config=new_config.to_dict())


def validate_search_config() -> bool:
    """Validate the current search configuration."""
    errors = search_config.validate()
    if errors:
        logger.error("Search configuration validation failed", errors=errors)
        return False

    logger.info("Search configuration validation passed")
    return True
