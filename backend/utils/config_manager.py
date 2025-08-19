#!/usr/bin/env python3
"""
Unified Configuration Manager for JewGo Backend

This module provides centralized access to all configuration settings,
replacing scattered os.environ.get() calls throughout the codebase.

Usage:
    # Get configuration values
    api_key = ConfigManager.get_google_places_api_key()
    database_url = ConfigManager.get_database_url()
    redis_url = ConfigManager.get_redis_url()
    
    # Get configuration with defaults
    port = ConfigManager.get_port(default=5000)
    log_level = ConfigManager.get_log_level(default="INFO")
    
    # Get environment-specific configuration
    is_production = ConfigManager.is_production()
    is_development = ConfigManager.is_development()
    is_testing = ConfigManager.is_testing()
"""

import os
from typing import Any, Optional, List
from functools import lru_cache

from utils.logging_config import get_logger

logger = get_logger(__name__)

class ConfigManager:
    """Unified configuration manager for centralized environment variable access."""
    
    # Environment variable names
    ENV_VARS = {
        # Database
        "DATABASE_URL": "DATABASE_URL",
        "TEST_DATABASE_URL": "TEST_DATABASE_URL",
        "DB_POOL_SIZE": "DB_POOL_SIZE",
        "DB_MAX_OVERFLOW": "DB_MAX_OVERFLOW", 
        "DB_POOL_TIMEOUT": "DB_POOL_TIMEOUT",
        "DB_POOL_RECYCLE": "DB_POOL_RECYCLE",
        
        # PostgreSQL specific
        "PG_KEEPALIVES_IDLE": "PG_KEEPALIVES_IDLE",
        "PG_KEEPALIVES_INTERVAL": "PG_KEEPALIVES_INTERVAL",
        "PG_KEEPALIVES_COUNT": "PG_KEEPALIVES_COUNT",
        "PG_STATEMENT_TIMEOUT": "PG_STATEMENT_TIMEOUT",
        "PG_IDLE_TX_TIMEOUT": "PG_IDLE_TX_TIMEOUT",
        "PGSSLMODE": "PGSSLMODE",
        "PGSSLROOTCERT": "PGSSLROOTCERT",
        
        # Redis
        "REDIS_URL": "REDIS_URL",
        "REDIS_HOST": "REDIS_HOST",
        "REDIS_PORT": "REDIS_PORT",
        "REDIS_DB": "REDIS_DB",
        "REDIS_PASSWORD": "REDIS_PASSWORD",
        
        # Google APIs
        "GOOGLE_PLACES_API_KEY": "GOOGLE_PLACES_API_KEY",
        "GOOGLE_MAPS_API_KEY": "GOOGLE_MAPS_API_KEY",
        "GOOGLE_API_KEY": "GOOGLE_API_KEY",
        
        # Cloudinary
        "CLOUDINARY_CLOUD_NAME": "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY": "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET": "CLOUDINARY_API_SECRET",
        
        # Monitoring
        "UPTIMEROBOT_API_KEY": "UPTIMEROBOT_API_KEY",
        "CRONITOR_API_KEY": "CRONITOR_API_KEY",
        "SENTRY_DSN": "SENTRY_DSN",
        
        # Application
        "FLASK_SECRET_KEY": "FLASK_SECRET_KEY",
        "JWT_SECRET_KEY": "JWT_SECRET_KEY",
        "PORT": "PORT",
        "ENVIRONMENT": "ENVIRONMENT",
        "FLASK_ENV": "FLASK_ENV",
        "LOG_LEVEL": "LOG_LEVEL",
        
        # URLs
        "API_URL": "API_URL",
        "FRONTEND_URL": "FRONTEND_URL",
        "RENDER_URL": "RENDER_URL",
        "FLASK_APP_URL": "FLASK_APP_URL",
        
        # CORS
        "CORS_ORIGINS": "CORS_ORIGINS",
        
        # Email
        "SMTP_HOST": "SMTP_HOST",
        "SMTP_PORT": "SMTP_PORT",
        "SMTP_USERNAME": "SMTP_USERNAME",
        "SMTP_PASSWORD": "SMTP_PASSWORD",
        "SMTP_USE_TLS": "SMTP_USE_TLS",
        
        # Security
        "BCRYPT_ROUNDS": "BCRYPT_ROUNDS",
        "SESSION_TIMEOUT": "SESSION_TIMEOUT",
        
        # Feature Flags
        "API_V4_ENABLED": "API_V4_ENABLED",
        "API_V4_RESTAURANTS": "API_V4_RESTAURANTS",
        "API_V4_REVIEWS": "API_V4_REVIEWS",
        "API_V4_USERS": "API_V4_USERS",
        "API_V4_STATISTICS": "API_V4_STATISTICS",
        "API_V4_CACHE": "API_V4_CACHE",
        "API_V4_VALIDATION": "API_V4_VALIDATION",
        "API_V4_ERROR_HANDLING": "API_V4_ERROR_HANDLING",
    }
    
    @classmethod
    def get_env_var(cls, key: str, default: Any = None) -> Any:
        """Get environment variable with optional default value."""
        env_key = cls.ENV_VARS.get(key, key)
        value = os.environ.get(env_key, default)
        
        if value is not None:
            logger.debug(f"Config: {key}={value}")
        
        return value
    
    @classmethod
    def get_env_var_bool(cls, key: str, default: bool = False) -> bool:
        """Get boolean environment variable."""
        value = cls.get_env_var(key, default)
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes', 'on')
        
        return bool(value)
    
    @classmethod
    def get_env_var_int(cls, key: str, default: int = 0) -> int:
        """Get integer environment variable."""
        value = cls.get_env_var(key, default)
        
        if isinstance(value, int):
            return value
        
        try:
            return int(value) if value is not None else default
        except (ValueError, TypeError):
            logger.warning(f"Invalid integer value for {key}: {value}, using default: {default}")
            return default
    
    @classmethod
    def get_env_var_float(cls, key: str, default: float = 0.0) -> float:
        """Get float environment variable."""
        value = cls.get_env_var(key, default)
        
        if isinstance(value, float):
            return value
        
        try:
            return float(value) if value is not None else default
        except (ValueError, TypeError):
            logger.warning(f"Invalid float value for {key}: {value}, using default: {default}")
            return default
    
    @classmethod
    def get_env_var_list(cls, key: str, default: List[str] = None, separator: str = ",") -> List[str]:
        """Get list environment variable."""
        if default is None:
            default = []
        
        value = cls.get_env_var(key, "")
        
        if not value:
            return default
        
        if isinstance(value, list):
            return value
        
        try:
            return [item.strip() for item in value.split(separator) if item.strip()]
        except Exception:
            logger.warning(f"Invalid list value for {key}: {value}, using default: {default}")
            return default
    
    # Database Configuration
    @classmethod
    def get_database_url(cls) -> Optional[str]:
        """Get database URL."""
        url = cls.get_env_var("DATABASE_URL")
        if url and url.startswith('postgresql://'):
            # Convert to psycopg format for compatibility with psycopg[binary]
            url = url.replace('postgresql://', 'postgresql+psycopg://')
        return url
    
    @classmethod
    def get_test_database_url(cls) -> Optional[str]:
        """Get test database URL."""
        return cls.get_env_var("TEST_DATABASE_URL")
    
    @classmethod
    def get_db_pool_size(cls) -> int:
        """Get database pool size."""
        return cls.get_env_var_int("DB_POOL_SIZE", 5)
    
    @classmethod
    def get_db_max_overflow(cls) -> int:
        """Get database max overflow."""
        return cls.get_env_var_int("DB_MAX_OVERFLOW", 10)
    
    @classmethod
    def get_db_pool_timeout(cls) -> int:
        """Get database pool timeout."""
        return cls.get_env_var_int("DB_POOL_TIMEOUT", 30)
    
    @classmethod
    def get_db_pool_recycle(cls) -> int:
        """Get database pool recycle."""
        return cls.get_env_var_int("DB_POOL_RECYCLE", 180)
    
    # PostgreSQL Configuration
    @classmethod
    def get_pg_keepalives_idle(cls) -> int:
        """Get PostgreSQL keepalives idle."""
        return cls.get_env_var_int("PG_KEEPALIVES_IDLE", 60)
    
    @classmethod
    def get_pg_keepalives_interval(cls) -> int:
        """Get PostgreSQL keepalives interval."""
        return cls.get_env_var_int("PG_KEEPALIVES_INTERVAL", 20)
    
    @classmethod
    def get_pg_keepalives_count(cls) -> int:
        """Get PostgreSQL keepalives count."""
        return cls.get_env_var_int("PG_KEEPALIVES_COUNT", 5)
    
    @classmethod
    def get_pg_statement_timeout(cls) -> str:
        """Get PostgreSQL statement timeout."""
        return cls.get_env_var("PG_STATEMENT_TIMEOUT", "60000")
    
    @classmethod
    def get_pg_idle_tx_timeout(cls) -> str:
        """Get PostgreSQL idle transaction timeout."""
        return cls.get_env_var("PG_IDLE_TX_TIMEOUT", "120000")
    
    @classmethod
    def get_pg_sslmode(cls) -> str:
        """Get PostgreSQL SSL mode."""
        return cls.get_env_var("PGSSLMODE", "prefer")
    
    @classmethod
    def get_pg_sslrootcert(cls) -> Optional[str]:
        """Get PostgreSQL SSL root certificate."""
        return cls.get_env_var("PGSSLROOTCERT")
    
    # Redis Configuration
    @classmethod
    def get_redis_url(cls) -> Optional[str]:
        """Get Redis URL."""
        return cls.get_env_var("REDIS_URL")
    
    @classmethod
    def get_redis_host(cls) -> str:
        """Get Redis host."""
        return cls.get_env_var("REDIS_HOST", "localhost")
    
    @classmethod
    def get_redis_port(cls) -> int:
        """Get Redis port."""
        return cls.get_env_var_int("REDIS_PORT", 6379)
    
    @classmethod
    def get_redis_db(cls) -> int:
        """Get Redis database."""
        return cls.get_env_var_int("REDIS_DB", 0)
    
    @classmethod
    def get_redis_password(cls) -> Optional[str]:
        """Get Redis password."""
        return cls.get_env_var("REDIS_PASSWORD")
    
    # Google APIs Configuration
    @classmethod
    def get_google_places_api_key(cls) -> Optional[str]:
        """Get Google Places API key."""
        return cls.get_env_var("GOOGLE_PLACES_API_KEY") or cls.get_env_var("GOOGLE_API_KEY")
    
    @classmethod
    def get_google_maps_api_key(cls) -> Optional[str]:
        """Get Google Maps API key."""
        return cls.get_env_var("GOOGLE_MAPS_API_KEY") or cls.get_env_var("GOOGLE_API_KEY")
    
    # Cloudinary Configuration
    @classmethod
    def get_cloudinary_cloud_name(cls) -> Optional[str]:
        """Get Cloudinary cloud name."""
        return cls.get_env_var("CLOUDINARY_CLOUD_NAME")
    
    @classmethod
    def get_cloudinary_api_key(cls) -> Optional[str]:
        """Get Cloudinary API key."""
        return cls.get_env_var("CLOUDINARY_API_KEY")
    
    @classmethod
    def get_cloudinary_api_secret(cls) -> Optional[str]:
        """Get Cloudinary API secret."""
        return cls.get_env_var("CLOUDINARY_API_SECRET")
    
    # Monitoring Configuration
    @classmethod
    def get_uptimerobot_api_key(cls) -> Optional[str]:
        """Get UptimeRobot API key."""
        return cls.get_env_var("UPTIMEROBOT_API_KEY")
    
    @classmethod
    def get_cronitor_api_key(cls) -> Optional[str]:
        """Get Cronitor API key."""
        return cls.get_env_var("CRONITOR_API_KEY")
    
    @classmethod
    def get_sentry_dsn(cls) -> Optional[str]:
        """Get Sentry DSN."""
        return cls.get_env_var("SENTRY_DSN")
    
    # Application Configuration
    @classmethod
    def get_flask_secret_key(cls) -> str:
        """Get Flask secret key."""
        return cls.get_env_var("FLASK_SECRET_KEY", "dev-secret-key")
    
    @classmethod
    def get_jwt_secret_key(cls) -> str:
        """Get JWT secret key."""
        return cls.get_env_var("JWT_SECRET_KEY", "dev-jwt-secret")
    
    @classmethod
    def get_port(cls, default: int = 5000) -> int:
        """Get application port."""
        return cls.get_env_var_int("PORT", default)
    
    @classmethod
    def get_environment(cls) -> str:
        """Get application environment."""
        return cls.get_env_var("ENVIRONMENT", "development")
    
    @classmethod
    def get_flask_env(cls) -> str:
        """Get Flask environment."""
        return cls.get_env_var("FLASK_ENV", "development")
    
    @classmethod
    def get_log_level(cls, default: str = "INFO") -> str:
        """Get log level."""
        return cls.get_env_var("LOG_LEVEL", default)
    
    # URL Configuration
    @classmethod
    def get_api_url(cls) -> Optional[str]:
        """Get API URL."""
        return cls.get_env_var("API_URL")
    
    @classmethod
    def get_frontend_url(cls) -> Optional[str]:
        """Get frontend URL."""
        return cls.get_env_var("FRONTEND_URL")
    
    @classmethod
    def get_render_url(cls) -> Optional[str]:
        """Get Render URL."""
        return cls.get_env_var("RENDER_URL")
    
    @classmethod
    def get_flask_app_url(cls) -> Optional[str]:
        """Get Flask app URL."""
        return cls.get_env_var("FLASK_APP_URL")
    
    # CORS Configuration
    @classmethod
    def get_cors_origins(cls) -> List[str]:
        """Get CORS origins."""
        return cls.get_env_var_list("CORS_ORIGINS", ["http://localhost:3000"])
    
    # Email Configuration
    @classmethod
    def get_smtp_host(cls) -> str:
        """Get SMTP host."""
        return cls.get_env_var("SMTP_HOST", "localhost")
    
    @classmethod
    def get_smtp_port(cls) -> int:
        """Get SMTP port."""
        return cls.get_env_var_int("SMTP_PORT", 587)
    
    @classmethod
    def get_smtp_username(cls) -> Optional[str]:
        """Get SMTP username."""
        return cls.get_env_var("SMTP_USERNAME")
    
    @classmethod
    def get_smtp_password(cls) -> Optional[str]:
        """Get SMTP password."""
        return cls.get_env_var("SMTP_PASSWORD")
    
    @classmethod
    def get_smtp_use_tls(cls) -> bool:
        """Get SMTP use TLS."""
        return cls.get_env_var_bool("SMTP_USE_TLS", True)
    
    # Security Configuration
    @classmethod
    def get_bcrypt_rounds(cls) -> int:
        """Get bcrypt rounds."""
        return cls.get_env_var_int("BCRYPT_ROUNDS", 12)
    
    @classmethod
    def get_session_timeout(cls) -> int:
        """Get session timeout."""
        return cls.get_env_var_int("SESSION_TIMEOUT", 3600)
    
    # Feature Flags Configuration
    @classmethod
    def get_api_v4_enabled(cls) -> bool:
        """Get API v4 enabled flag."""
        return cls.get_env_var_bool("API_V4_ENABLED", False)
    
    @classmethod
    def get_api_v4_restaurants(cls) -> bool:
        """Get API v4 restaurants flag."""
        return cls.get_env_var_bool("API_V4_RESTAURANTS", False)
    
    @classmethod
    def get_api_v4_reviews(cls) -> bool:
        """Get API v4 reviews flag."""
        return cls.get_env_var_bool("API_V4_REVIEWS", False)
    
    @classmethod
    def get_api_v4_users(cls) -> bool:
        """Get API v4 users flag."""
        return cls.get_env_var_bool("API_V4_USERS", False)
    
    @classmethod
    def get_api_v4_statistics(cls) -> bool:
        """Get API v4 statistics flag."""
        return cls.get_env_var_bool("API_V4_STATISTICS", False)
    
    @classmethod
    def get_api_v4_cache(cls) -> bool:
        """Get API v4 cache flag."""
        return cls.get_env_var_bool("API_V4_CACHE", True)
    
    @classmethod
    def get_api_v4_validation(cls) -> bool:
        """Get API v4 validation flag."""
        return cls.get_env_var_bool("API_V4_VALIDATION", True)
    
    @classmethod
    def get_api_v4_error_handling(cls) -> bool:
        """Get API v4 error handling flag."""
        return cls.get_env_var_bool("API_V4_ERROR_HANDLING", True)
    
    # Environment Detection
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production."""
        env = cls.get_environment().lower()
        return env in ('production', 'prod', 'live')
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development."""
        env = cls.get_environment().lower()
        return env in ('development', 'dev', 'local')
    
    @classmethod
    def is_testing(cls) -> bool:
        """Check if running in testing."""
        env = cls.get_environment().lower()
        return env in ('testing', 'test', 'staging')
    
    @classmethod
    def is_debug(cls) -> bool:
        """Check if debug mode is enabled."""
        return cls.get_flask_env().lower() == 'development'
    
    # Configuration Validation
    @classmethod
    def validate_required_config(cls) -> List[str]:
        """Validate required configuration and return missing keys."""
        required_keys = [
            "DATABASE_URL",
            "FLASK_SECRET_KEY",
            "JWT_SECRET_KEY"
        ]
        
        missing_keys = []
        for key in required_keys:
            if not cls.get_env_var(key):
                missing_keys.append(key)
        
        if missing_keys:
            logger.error(f"Missing required configuration: {missing_keys}")
        
        return missing_keys
    
    @classmethod
    def get_config_summary(cls) -> dict:
        """Get a summary of all configuration values (excluding secrets)."""
        summary = {
            "environment": cls.get_environment(),
            "debug": cls.is_debug(),
            "port": cls.get_port(),
            "log_level": cls.get_log_level(),
            "database": {
                "pool_size": cls.get_db_pool_size(),
                "max_overflow": cls.get_db_max_overflow(),
                "pool_timeout": cls.get_db_pool_timeout(),
                "pool_recycle": cls.get_db_pool_recycle()
            },
            "redis": {
                "host": cls.get_redis_host(),
                "port": cls.get_redis_port(),
                "db": cls.get_redis_db()
            },
            "feature_flags": {
                "api_v4_enabled": cls.get_api_v4_enabled(),
                "api_v4_restaurants": cls.get_api_v4_restaurants(),
                "api_v4_reviews": cls.get_api_v4_reviews(),
                "api_v4_users": cls.get_api_v4_users(),
                "api_v4_statistics": cls.get_api_v4_statistics(),
                "api_v4_cache": cls.get_api_v4_cache(),
                "api_v4_validation": cls.get_api_v4_validation(),
                "api_v4_error_handling": cls.get_api_v4_error_handling()
            }
        }
        
        return summary
