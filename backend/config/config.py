import os
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


class Config:
    """Base configuration class."""

    SECRET_KEY = (
        os.environ.get("FLASK_SECRET_KEY") or "dev-secret-key-change-in-production"
    )
    # Database Configuration
    DATABASE_URL = os.environ.get("DATABASE_URL")
    SQLALCHEMY_DATABASE_URI = (
        DATABASE_URL
        or os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("CI", "")
        and "sqlite:///:memory:"
        or "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Redis Configuration
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
    REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
    REDIS_DB = int(os.environ.get("REDIS_DB", 0))
    REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD")
    # Cache Configuration
    CACHE_TYPE = os.environ.get("CACHE_TYPE", "redis")
    CACHE_REDIS_URL = REDIS_URL
    CACHE_DEFAULT_TIMEOUT = 600  # Increased to 10 minutes for better performance
    CACHE_KEY_PREFIX = "jewgo:"
    CACHE_THRESHOLD = 1000  # Maximum number of items in cache
    CACHE_OPTIONS = {
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
        "retry_on_timeout": True,
        "max_connections": 20,
    }
    # Session Configuration
    SESSION_TYPE = os.environ.get("SESSION_TYPE", "redis")
    SESSION_KEY_PREFIX = "jewgo_session:"
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    # CORS Configuration
    CORS_ORIGINS = (
        os.environ.get("CORS_ORIGINS", "*").split(",")
        if os.environ.get("CORS_ORIGINS")
        else ["*"]
    )
    CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS = [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ]
    # Rate Limiting
    RATELIMIT_DEFAULT = "10000 per day;1000 per hour;100 per minute"
    # Prefer Redis storage if REDIS_URL is available
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")
    # Logging Configuration
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    # API Configuration
    API_TITLE = "JewGo Restaurant API"
    API_VERSION = "1.0.3"
    API_DESCRIPTION = (
        "REST API for kosher restaurant discovery with FPT feed validation"
    )
    # Security Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    # Google API Configuration
    GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
    # Sentry Configuration
    SENTRY_DSN = os.environ.get("SENTRY_DSN")


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "postgresql://username:password@localhost:5432/jewgo_db"
    CORS_ORIGINS = ["*"]


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False
    # Production database URL should be set via environment variable
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    # Production CORS origins
    CORS_ORIGINS = (
        os.environ.get("CORS_ORIGINS", "*").split(",")
        if os.environ.get("CORS_ORIGINS")
        else ["*"]
    )
    # Enhanced security for production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:",
    )
    WTF_CSRF_ENABLED = False


# Configuration mapping
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Get configuration based on environment."""
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config["default"])
