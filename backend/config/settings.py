import os
from typing import Any

"""Backend Configuration Settings.
This module contains all configurable settings for the JewGo backend application,
including database connections, API keys, cron job schedules, and feature flags.
"""
# Environment detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"
# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_POOL_SIZE = int(os.getenv("DATABASE_POOL_SIZE", "10"))
DATABASE_MAX_OVERFLOW = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
DATABASE_POOL_TIMEOUT = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "5000"))
API_WORKERS = int(os.getenv("API_WORKERS", "4"))
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "30"))
# Google APIs
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", GOOGLE_MAPS_API_KEY)
GOOGLE_GEOCODING_API_KEY = os.getenv("GOOGLE_GEOCODING_API_KEY", GOOGLE_MAPS_API_KEY)
# External Services
VERCEL_DEPLOYMENT_URL = os.getenv("VERCEL_DEPLOYMENT_URL")
RENDER_SERVICE_URL = os.getenv("RENDER_SERVICE_URL")
# Deprecated: remove old provider-specific variable; prefer DATABASE_URL
# If present, allow it to seed DATABASE_URL but log deprecation at startup.
API_JEWGO_APP_DATABASE_URL = os.getenv("API_JEWGO_APP_DATABASE_URL")
# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
# CORS Configuration - Remove wildcard default for security
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    CORS_ORIGINS = [
        origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
    ]
else:
    # Default to empty list - explicit origins must be configured
    CORS_ORIGINS = []
# Rate Limiting
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "1000 per minute")
RATE_LIMIT_STRICT = os.getenv("RATE_LIMIT_STRICT", "100 per minute")
# Cron Job Schedules
CRON_SCHEDULES = {
    # Database maintenance and cleanup
    "database_cleanup": {
        "schedule": "0 2 * * *",  # Daily at 2 AM
        "enabled": True,
        "description": "Clean up old data and optimize database",
    },
    # Restaurant status updates
    "update_restaurant_status": {
        "schedule": "*/15 * * * *",  # Every 15 minutes
        "enabled": True,
        "description": "Update restaurant open/closed status",
    },
    # Google Places data refresh
    "refresh_google_places": {
        "schedule": "0 */6 * * *",  # Every 6 hours
        "enabled": True,
        "description": "Refresh Google Places data for restaurants",
    },
    # Website fallback resolution
    "resolve_missing_websites": {
        "schedule": "0 3 * * *",  # Daily at 3 AM
        "enabled": True,
        "description": "Attempt to resolve missing restaurant websites",
    },
    # Analytics data aggregation
    "aggregate_analytics": {
        "schedule": "0 1 * * *",  # Daily at 1 AM
        "enabled": True,
        "description": "Aggregate daily analytics data",
    },
    # Health checks
    "health_check": {
        "schedule": "*/5 * * * *",  # Every 5 minutes
        "enabled": True,
        "description": "Perform system health checks",
    },
    # Backup operations
    "database_backup": {
        "schedule": "0 4 * * 0",  # Weekly on Sunday at 4 AM
        "enabled": True,
        "description": "Create database backup",
    },
}
# API Refresh Intervals (in seconds)
API_REFRESH_INTERVALS = {
    "restaurant_status": 900,  # 15 minutes
    "google_places": 21600,  # 6 hours
    "website_resolution": 86400,  # 24 hours
    "analytics": 3600,  # 1 hour
    "health_check": 300,  # 5 minutes
}
# Feature Flags
FEATURE_FLAGS = {
    "google_places_enabled": os.getenv("GOOGLE_PLACES_ENABLED", "true").lower()
    == "true",
    "analytics_enabled": os.getenv("ANALYTICS_ENABLED", "true").lower() == "true",
    "rate_limiting_enabled": os.getenv("RATE_LIMITING_ENABLED", "true").lower()
    == "true",
    "caching_enabled": os.getenv("CACHING_ENABLED", "true").lower() == "true",
    "debug_mode": DEBUG,
}
# Cache Configuration
CACHE_CONFIG = {
    "default_timeout": 300,  # 5 minutes
    "restaurant_status_timeout": 900,  # 15 minutes
    "google_places_timeout": 3600,  # 1 hour
    "search_results_timeout": 600,  # 10 minutes
}
# Logging Configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"},
        "detailed": {
            "format": "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "DEBUG" if DEBUG else "INFO",
            "formatter": "detailed" if DEBUG else "standard",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "detailed",
            "filename": "logs/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
        },
    },
    "loggers": {
        "": {
            "handlers": ["console", "file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "werkzeug": {"level": "WARNING"},
    },
}
# Monitoring Configuration
MONITORING_CONFIG = {
    "enabled": os.getenv("MONITORING_ENABLED", "true").lower() == "true",
    "metrics_interval": 60,  # seconds
    "health_check_endpoint": "/health",
    "prometheus_enabled": os.getenv("PROMETHEUS_ENABLED", "false").lower() == "true",
}
# Email Configuration (for notifications)
EMAIL_CONFIG = {
    "enabled": os.getenv("EMAIL_ENABLED", "false").lower() == "true",
    "smtp_host": os.getenv("SMTP_HOST"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
    "smtp_username": os.getenv("SMTP_USERNAME"),
    "smtp_password": os.getenv("SMTP_PASSWORD"),
    "from_email": os.getenv("FROM_EMAIL", "noreply@jewgo.com"),
    "admin_email": os.getenv("ADMIN_EMAIL"),
}
# Search Configuration
SEARCH_CONFIG = {
    "max_results": 100,
    "default_page_size": 20,
    "max_page_size": 100,
    "search_timeout": 10,  # seconds
    "fuzzy_search_enabled": True,
    "autocomplete_enabled": True,
}
# Map Configuration
MAP_CONFIG = {
    "default_center": {"lat": 25.7617, "lng": -80.1918},
    "default_zoom": 10,
    "max_zoom": 18,
    "min_zoom": 5,
    "cluster_markers": True,
    "max_markers": 1000,
}
# Restaurant Configuration
RESTAURANT_CONFIG = {
    "max_specials_per_restaurant": 10,
    "special_expiry_days": 30,
    "image_upload_max_size": 5 * 1024 * 1024,  # 5MB
    "allowed_image_types": ["image/jpeg", "image/png", "image/webp"],
    "default_image_quality": 85,
}
# Development Configuration
if DEBUG:
    # Override settings for development
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
    LOGGING_CONFIG["handlers"]["console"]["level"] = "DEBUG"
    FEATURE_FLAGS["debug_mode"] = True
# Production Configuration
if ENVIRONMENT == "production":
    # Ensure secure settings for production
    if not SECRET_KEY or SECRET_KEY == "your-secret-key-change-in-production":
        msg = "SECRET_KEY must be set in production"
        raise ValueError(msg)
    if not GOOGLE_MAPS_API_KEY:
        msg = "GOOGLE_MAPS_API_KEY must be set in production"
        raise ValueError(msg)
    # Disable debug features
    FEATURE_FLAGS["debug_mode"] = False
    LOGGING_CONFIG["handlers"]["console"]["level"] = "WARNING"


def get_config() -> dict[str, Any]:
    """Get all configuration as a dictionary."""
    return {
        "environment": ENVIRONMENT,
        "debug": DEBUG,
        "database_url": DATABASE_URL,
        "api_host": API_HOST,
        "api_port": API_PORT,
        "cron_schedules": CRON_SCHEDULES,
        "api_refresh_intervals": API_REFRESH_INTERVALS,
        "feature_flags": FEATURE_FLAGS,
        "cache_config": CACHE_CONFIG,
        "logging_config": LOGGING_CONFIG,
        "monitoring_config": MONITORING_CONFIG,
        "email_config": EMAIL_CONFIG,
        "search_config": SEARCH_CONFIG,
        "map_config": MAP_CONFIG,
        "restaurant_config": RESTAURANT_CONFIG,
    }


def validate_config() -> bool:
    """Validate that all required configuration is present."""
    required_vars = []
    if ENVIRONMENT == "production":
        required_vars.extend(["SECRET_KEY", "GOOGLE_MAPS_API_KEY", "DATABASE_URL"])
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    return not missing_vars
