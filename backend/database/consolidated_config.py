#!/usr/bin/env python3
"""
Configuration for Consolidated Database Manager
===============================================

This module provides configuration management for the consolidated database manager,
including environment-specific settings, performance tuning, and feature flags.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from utils.logging_config import get_logger

logger = get_logger(__name__)


class Environment(Enum):
    """Environment types."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


@dataclass
class DatabaseConfig:
    """Database configuration settings."""
    # Connection settings
    database_url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    
    # Performance settings
    connect_timeout: int = 10
    statement_timeout: int = 60000
    idle_timeout: int = 300000
    isolation_level: str = "READ_COMMITTED"
    
    # Monitoring settings
    echo_queries: bool = False
    enable_metrics: bool = True
    health_check_interval: int = 30
    
    # Cache settings
    enable_query_cache: bool = True
    default_cache_ttl: int = 300
    max_memory_cache_entries: int = 1000
    slow_query_threshold: float = 1.0
    
    # Redis settings
    redis_url: Optional[str] = None
    redis_timeout: int = 5
    redis_max_connections: int = 100
    
    # Security settings
    ssl_mode: str = "prefer"
    ssl_root_cert: Optional[str] = None


class ConsolidatedDatabaseConfig:
    """Configuration manager for consolidated database manager."""
    
    def __init__(self, environment: Optional[str] = None):
        """Initialize configuration manager."""
        self.environment = Environment(environment or os.getenv('FLASK_ENV', 'development'))
        self.config = self._load_config()
        
        logger.info(f"Database configuration loaded for environment: {self.environment.value}")
    
    def _load_config(self) -> DatabaseConfig:
        """Load configuration based on environment."""
        # Base configuration
        config = DatabaseConfig(
            database_url=self._get_database_url(),
            pool_size=int(os.getenv('DB_POOL_SIZE', self._get_default_pool_size())),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', self._get_default_max_overflow())),
            pool_timeout=int(os.getenv('DB_POOL_TIMEOUT', '30')),
            pool_recycle=int(os.getenv('DB_POOL_RECYCLE', '3600')),
            pool_pre_ping=os.getenv('DB_POOL_PRE_PING', 'true').lower() == 'true',
            connect_timeout=int(os.getenv('DB_CONNECT_TIMEOUT', '10')),
            statement_timeout=int(os.getenv('DB_STATEMENT_TIMEOUT', '60000')),
            idle_timeout=int(os.getenv('DB_IDLE_TIMEOUT', '300000')),
            isolation_level=os.getenv('DB_ISOLATION_LEVEL', 'READ_COMMITTED'),
            echo_queries=os.getenv('DB_ECHO', 'false').lower() == 'true',
            enable_metrics=os.getenv('DB_ENABLE_METRICS', 'true').lower() == 'true',
            health_check_interval=int(os.getenv('DB_HEALTH_CHECK_INTERVAL', '30')),
            enable_query_cache=os.getenv('DB_ENABLE_QUERY_CACHE', 'true').lower() == 'true',
            default_cache_ttl=int(os.getenv('DB_CACHE_TTL', '300')),
            max_memory_cache_entries=int(os.getenv('DB_CACHE_MAX_MEMORY', '1000')),
            slow_query_threshold=float(os.getenv('DB_SLOW_QUERY_THRESHOLD', '1.0')),
            redis_url=os.getenv('REDIS_URL'),
            redis_timeout=int(os.getenv('REDIS_TIMEOUT', '5')),
            redis_max_connections=int(os.getenv('REDIS_MAX_CONNECTIONS', '100')),
            ssl_mode=os.getenv('PGSSLMODE', 'prefer'),
            ssl_root_cert=os.getenv('PGSSLROOTCERT')
        )
        
        # Environment-specific overrides
        if self.environment == Environment.DEVELOPMENT:
            config = self._apply_development_config(config)
        elif self.environment == Environment.STAGING:
            config = self._apply_staging_config(config)
        elif self.environment == Environment.PRODUCTION:
            config = self._apply_production_config(config)
        elif self.environment == Environment.TESTING:
            config = self._apply_testing_config(config)
        
        return config
    
    def _get_database_url(self) -> str:
        """Get database URL with validation."""
        url = os.getenv('DATABASE_URL')
        if not url:
            if self.environment == Environment.PRODUCTION:
                raise ValueError("DATABASE_URL is required in production")
            else:
                # Default development URL
                url = "postgresql://postgres:postgres@localhost:5432/jewgo_db"
                logger.warning(f"Using default database URL for {self.environment.value}: {url}")
        
        # Normalize PostgreSQL URL
        if url.startswith('postgres://'):
            url = url.replace('postgres://', 'postgresql://')
        
        return url
    
    def _get_default_pool_size(self) -> str:
        """Get default pool size based on environment."""
        defaults = {
            Environment.DEVELOPMENT: '5',
            Environment.STAGING: '10',
            Environment.PRODUCTION: '20',
            Environment.TESTING: '2'
        }
        return defaults.get(self.environment, '10')
    
    def _get_default_max_overflow(self) -> str:
        """Get default max overflow based on environment."""
        defaults = {
            Environment.DEVELOPMENT: '10',
            Environment.STAGING: '20',
            Environment.PRODUCTION: '30',
            Environment.TESTING: '5'
        }
        return defaults.get(self.environment, '20')
    
    def _apply_development_config(self, config: DatabaseConfig) -> DatabaseConfig:
        """Apply development-specific configuration."""
        config.echo_queries = True  # Enable query logging in development
        config.enable_metrics = True
        config.enable_query_cache = True
        config.default_cache_ttl = 60  # Shorter cache TTL for development
        config.slow_query_threshold = 0.5  # More sensitive to slow queries
        
        logger.info("Applied development configuration")
        return config
    
    def _apply_staging_config(self, config: DatabaseConfig) -> DatabaseConfig:
        """Apply staging-specific configuration."""
        config.echo_queries = False
        config.enable_metrics = True
        config.enable_query_cache = True
        config.default_cache_ttl = 300
        config.slow_query_threshold = 1.0
        
        logger.info("Applied staging configuration")
        return config
    
    def _apply_production_config(self, config: DatabaseConfig) -> DatabaseConfig:
        """Apply production-specific configuration."""
        config.echo_queries = False
        config.enable_metrics = True
        config.enable_query_cache = True
        config.default_cache_ttl = 600  # Longer cache TTL for production
        config.slow_query_threshold = 2.0  # Less sensitive to slow queries
        config.pool_size = max(config.pool_size, 15)  # Minimum pool size
        config.max_overflow = max(config.max_overflow, 25)  # Minimum overflow
        
        # Production-specific security
        config.ssl_mode = "require"
        
        logger.info("Applied production configuration")
        return config
    
    def _apply_testing_config(self, config: DatabaseConfig) -> DatabaseConfig:
        """Apply testing-specific configuration."""
        config.echo_queries = False
        config.enable_metrics = False  # Disable metrics in testing
        config.enable_query_cache = False  # Disable cache in testing
        config.pool_size = 2
        config.max_overflow = 5
        config.pool_recycle = 300  # Shorter recycle time for testing
        
        logger.info("Applied testing configuration")
        return config
    
    def get_config_dict(self) -> Dict[str, Any]:
        """Get configuration as dictionary."""
        return {
            'environment': self.environment.value,
            'database_url': self.config.database_url,
            'pool_size': self.config.pool_size,
            'max_overflow': self.config.max_overflow,
            'pool_timeout': self.config.pool_timeout,
            'pool_recycle': self.config.pool_recycle,
            'pool_pre_ping': self.config.pool_pre_ping,
            'connect_timeout': self.config.connect_timeout,
            'statement_timeout': self.config.statement_timeout,
            'idle_timeout': self.config.idle_timeout,
            'isolation_level': self.config.isolation_level,
            'echo_queries': self.config.echo_queries,
            'enable_metrics': self.config.enable_metrics,
            'health_check_interval': self.config.health_check_interval,
            'enable_query_cache': self.config.enable_query_cache,
            'default_cache_ttl': self.config.default_cache_ttl,
            'max_memory_cache_entries': self.config.max_memory_cache_entries,
            'slow_query_threshold': self.config.slow_query_threshold,
            'redis_url': self.config.redis_url,
            'redis_timeout': self.config.redis_timeout,
            'redis_max_connections': self.config.redis_max_connections,
            'ssl_mode': self.config.ssl_mode,
            'ssl_root_cert': self.config.ssl_root_cert
        }
    
    def validate_config(self) -> bool:
        """Validate configuration settings."""
        errors = []
        
        # Validate database URL
        if not self.config.database_url:
            errors.append("Database URL is required")
        
        # Validate pool settings
        if self.config.pool_size < 1:
            errors.append("Pool size must be at least 1")
        
        if self.config.max_overflow < 0:
            errors.append("Max overflow cannot be negative")
        
        if self.config.pool_timeout < 1:
            errors.append("Pool timeout must be at least 1 second")
        
        # Validate cache settings
        if self.config.default_cache_ttl < 0:
            errors.append("Cache TTL cannot be negative")
        
        if self.config.max_memory_cache_entries < 1:
            errors.append("Max memory cache entries must be at least 1")
        
        # Validate thresholds
        if self.config.slow_query_threshold < 0:
            errors.append("Slow query threshold cannot be negative")
        
        # Log validation results
        if errors:
            for error in errors:
                logger.error(f"Configuration validation error: {error}")
            return False
        else:
            logger.info("Configuration validation passed")
            return True
    
    def get_connection_string(self) -> str:
        """Get formatted connection string for logging (without password)."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(self.config.database_url)
            
            # Hide password in connection string
            if parsed.password:
                safe_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{parsed.port}{parsed.path}"
            else:
                safe_url = f"{parsed.scheme}://{parsed.username}@{parsed.hostname}:{parsed.port}{parsed.path}"
            
            return safe_url
        except Exception as e:
            logger.warning(f"Could not parse database URL: {e}")
            return "***"
    
    def log_configuration(self):
        """Log current configuration (without sensitive data)."""
        logger.info("Database Configuration:")
        logger.info(f"  Environment: {self.environment.value}")
        logger.info(f"  Database: {self.get_connection_string()}")
        logger.info(f"  Pool Size: {self.config.pool_size}")
        logger.info(f"  Max Overflow: {self.config.max_overflow}")
        logger.info(f"  Query Cache: {'Enabled' if self.config.enable_query_cache else 'Disabled'}")
        logger.info(f"  Cache TTL: {self.config.default_cache_ttl}s")
        logger.info(f"  Metrics: {'Enabled' if self.config.enable_metrics else 'Disabled'}")
        logger.info(f"  SSL Mode: {self.config.ssl_mode}")


# Global configuration instance
_config_instance = None


def get_database_config() -> ConsolidatedDatabaseConfig:
    """Get global database configuration instance."""
    global _config_instance
    if _config_instance is None:
        _config_instance = ConsolidatedDatabaseConfig()
    return _config_instance


def reload_configuration():
    """Reload configuration from environment variables."""
    global _config_instance
    _config_instance = ConsolidatedDatabaseConfig()
    logger.info("Database configuration reloaded")
    return _config_instance