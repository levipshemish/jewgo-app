# Configuration Manager Guide

## Overview

The `ConfigManager` is a unified configuration management system that centralizes all environment variable access throughout the JewGo backend. It replaces scattered `os.environ.get()` calls with a consistent, type-safe, and well-documented interface.

## Features

- **Centralized Configuration**: All environment variables accessed through a single interface
- **Type Safety**: Proper type hints and validation
- **Default Values**: Sensible defaults for all configuration options
- **Environment Detection**: Easy detection of current environment (development/production/testing)
- **Validation**: Built-in validation for critical configuration
- **Logging**: Automatic logging of missing critical variables
- **Documentation**: Comprehensive documentation for all configuration options
- **Performance**: Optimized for minimal overhead
- **Error Handling**: Graceful handling of invalid values and missing variables

## Quick Start

### Basic Usage

```python
from utils.config_manager import ConfigManager

# Get configuration values
api_key = ConfigManager.get_google_places_api_key()
database_url = ConfigManager.get_database_url()
redis_url = ConfigManager.get_redis_url()

# Get configuration with defaults
port = ConfigManager.get_port(default=5000)
log_level = ConfigManager.get_log_level(default="INFO")

# Check environment
is_production = ConfigManager.is_production()
is_development = ConfigManager.is_development()
is_testing = ConfigManager.is_testing()
```

### Environment Detection

```python
# Check current environment
if ConfigManager.is_production():
    # Production-specific logic
    pass
elif ConfigManager.is_development():
    # Development-specific logic
    pass
elif ConfigManager.is_testing():
    # Testing-specific logic
    pass
```

### Configuration Validation

```python
# Validate critical configuration
if not ConfigManager.validate_critical_config():
    logger.error("Critical configuration missing")
    sys.exit(1)

# Get configuration summary
summary = ConfigManager.get_config_summary()
print(f"Environment: {summary['environment']}")
print(f"Database configured: {summary['database_url_set']}")
```

## Configuration Categories

### Database Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_database_url()` | `DATABASE_URL` | `None` | Main database connection URL |
| `get_test_database_url()` | `TEST_DATABASE_URL` | `None` | Test database connection URL |
| `get_db_pool_size()` | `DB_POOL_SIZE` | `5` | Database connection pool size |
| `get_db_max_overflow()` | `DB_MAX_OVERFLOW` | `10` | Database max overflow connections |
| `get_db_pool_timeout()` | `DB_POOL_TIMEOUT` | `30` | Database pool timeout (seconds) |
| `get_db_pool_recycle()` | `DB_POOL_RECYCLE` | `180` | Database pool recycle time (seconds) |

### PostgreSQL Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_pg_keepalives_idle()` | `PG_KEEPALIVES_IDLE` | `30` | Keepalive idle time |
| `get_pg_keepalives_interval()` | `PG_KEEPALIVES_INTERVAL` | `10` | Keepalive interval |
| `get_pg_keepalives_count()` | `PG_KEEPALIVES_COUNT` | `3` | Keepalive count |
| `get_pg_statement_timeout()` | `PG_STATEMENT_TIMEOUT` | `"30000"` | Statement timeout (ms) |
| `get_pg_idle_tx_timeout()` | `PG_IDLE_TX_TIMEOUT` | `"60000"` | Idle transaction timeout (ms) |
| `get_pg_sslmode()` | `PGSSLMODE` | `"require"` | SSL mode |
| `get_pg_sslrootcert()` | `PGSSLROOTCERT` | `None` | SSL root certificate path |

### Redis Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_redis_url()` | `REDIS_URL` | `"redis://localhost:6379"` | Redis connection URL |
| `get_redis_host()` | `REDIS_HOST` | `"localhost"` | Redis host |
| `get_redis_port()` | `REDIS_PORT` | `6379` | Redis port |
| `get_redis_db()` | `REDIS_DB` | `0` | Redis database number |
| `get_redis_password()` | `REDIS_PASSWORD` | `None` | Redis password |

### Google API Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_google_places_api_key()` | `GOOGLE_PLACES_API_KEY` | `None` | Google Places API key |
| `get_google_maps_api_key()` | `GOOGLE_MAPS_API_KEY` | `None` | Google Maps API key |
| `get_google_api_key()` | `GOOGLE_API_KEY` | `None` | General Google API key |

### Cloudinary Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_cloudinary_cloud_name()` | `CLOUDINARY_CLOUD_NAME` | `"jewgo"` | Cloudinary cloud name |
| `get_cloudinary_api_key()` | `CLOUDINARY_API_KEY` | `None` | Cloudinary API key |
| `get_cloudinary_api_secret()` | `CLOUDINARY_API_SECRET` | `None` | Cloudinary API secret |

### Monitoring Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_uptimerobot_api_key()` | `UPTIMEROBOT_API_KEY` | `None` | UptimeRobot API key |
| `get_cronitor_api_key()` | `CRONITOR_API_KEY` | `None` | Cronitor API key |
| `get_sentry_dsn()` | `SENTRY_DSN` | `None` | Sentry DSN |

### Application Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_flask_secret_key()` | `FLASK_SECRET_KEY` | `"dev-secret-key-change-in-production"` | Flask secret key |
| `get_jwt_secret_key()` | `JWT_SECRET_KEY` | `None` | JWT secret key |
| `get_port()` | `PORT` | `5000` | Application port |
| `get_environment()` | `ENVIRONMENT` | `"development"` | Current environment |
| `get_flask_env()` | `FLASK_ENV` | `"development"` | Flask environment |
| `get_log_level()` | `LOG_LEVEL` | `"INFO"` | Log level |

### URL Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_api_url()` | `API_URL` | `"https://jewgo.onrender.com"` | API base URL |
| `get_frontend_url()` | `FRONTEND_URL` | `"https://jewgo.com"` | Frontend URL |
| `get_render_url()` | `RENDER_URL` | `"https://jewgo-backend.onrender.com"` | Render URL |
| `get_flask_app_url()` | `FLASK_APP_URL` | `"http://localhost:5000"` | Flask app URL |

### CORS Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_cors_origins()` | `CORS_ORIGINS` | `["*"]` | CORS allowed origins |

### Cache and Session Configuration

| Method | Environment Variable | Default | Description |
|--------|-------------------|---------|-------------|
| `get_cache_type()` | `CACHE_TYPE` | `"redis"` | Cache type |
| `get_session_type()` | `SESSION_TYPE` | `"redis"` | Session type |
| `get_ratelimit_storage_url()` | `RATELIMIT_STORAGE_URL` | `"memory://"` | Rate limit storage URL |

## Migration Guide

### Before (Old Way)

```python
import os

# Direct environment variable access
api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
database_url = os.environ.get("DATABASE_URL")
port = int(os.environ.get("PORT", "5000"))
is_production = os.environ.get("ENVIRONMENT") == "production"
```

### After (New Way)

```python
from utils.config_manager import ConfigManager

# Centralized configuration access
api_key = ConfigManager.get_google_places_api_key()
database_url = ConfigManager.get_database_url()
port = ConfigManager.get_port()
is_production = ConfigManager.is_production()
```

### Migration Steps

1. **Import ConfigManager**: Add `from utils.config_manager import ConfigManager` to your file
2. **Replace os.environ.get()**: Replace direct environment variable access with ConfigManager methods
3. **Remove os import**: Remove `import os` if it's no longer needed
4. **Update defaults**: Use ConfigManager's built-in defaults instead of manual defaults
5. **Test**: Verify that your application works correctly with the new configuration

### Example Migration

#### Before:
```python
import os

class MyService:
    def __init__(self):
        self.api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        self.database_url = os.environ.get("DATABASE_URL")
        self.port = int(os.environ.get("PORT", "5000"))
        self.is_production = os.environ.get("ENVIRONMENT") == "production"
```

#### After:
```python
from utils.config_manager import ConfigManager

class MyService:
    def __init__(self):
        self.api_key = ConfigManager.get_google_places_api_key()
        self.database_url = ConfigManager.get_database_url()
        self.port = ConfigManager.get_port()
        self.is_production = ConfigManager.is_production()
```

## Best Practices

### 1. Use Appropriate Methods

```python
# Good: Use specific method
api_key = ConfigManager.get_google_places_api_key()

# Avoid: Use generic method
api_key = ConfigManager.get_env_var("GOOGLE_PLACES_API_KEY")
```

### 2. Handle Missing Values

```python
# Good: Check for required values
api_key = ConfigManager.get_google_places_api_key()
if not api_key:
    raise ValueError("Google Places API key is required")

# Good: Use defaults for optional values
port = ConfigManager.get_port()  # Uses default 5000
```

### 3. Environment-Specific Logic

```python
# Good: Use environment detection methods
if ConfigManager.is_production():
    # Production-specific configuration
    cache_timeout = 3600
else:
    # Development-specific configuration
    cache_timeout = 60
```

### 4. Validate Configuration

```python
# Good: Validate critical configuration at startup
if not ConfigManager.validate_critical_config():
    logger.error("Critical configuration missing")
    sys.exit(1)
```

### 5. Log Configuration Summary

```python
# Good: Log configuration summary for debugging
summary = ConfigManager.get_config_summary()
logger.info("Configuration loaded", **summary)
```

### 6. Error Handling

```python
# Good: Handle invalid configuration values
try:
    port = ConfigManager.get_port()
except ValueError as e:
    logger.error(f"Invalid port configuration: {e}")
    port = 5000  # Fallback to default
```

### 7. Performance Considerations

```python
# Good: Cache frequently used values
class MyService:
    def __init__(self):
        # Cache values that don't change during runtime
        self.api_key = ConfigManager.get_google_places_api_key()
        self.database_url = ConfigManager.get_database_url()
        self.is_production = ConfigManager.is_production()
    
    def get_dynamic_config(self):
        # Get values that might change
        return ConfigManager.get_log_level()
```

## Testing

### Unit Tests

The ConfigManager includes comprehensive unit tests in `backend/tests/test_config_manager.py`. Run them with:

```bash
cd backend
python -m pytest tests/test_config_manager.py -v
```

### Test Coverage

The test suite covers:

- **Basic Functionality**: All configuration methods
- **Default Values**: Default value handling for all methods
- **Environment Variables**: Setting and retrieving environment variables
- **Type Conversion**: Integer and string conversion
- **Error Handling**: Invalid values and missing variables
- **Environment Detection**: Case-insensitive environment detection
- **Configuration Validation**: Critical configuration validation
- **Edge Cases**: Empty strings, whitespace, special characters
- **Logging**: Logging of missing critical variables

### Manual Testing

Test the ConfigManager manually:

```python
from utils.config_manager import ConfigManager

# Test basic functionality
print(f"Environment: {ConfigManager.get_environment()}")
print(f"Port: {ConfigManager.get_port()}")
print(f"Database URL set: {bool(ConfigManager.get_database_url())}")

# Test validation
print(f"Config valid: {ConfigManager.validate_critical_config()}")

# Test summary
summary = ConfigManager.get_config_summary()
print(f"Summary: {summary}")
```

### Integration Testing

```python
# Test with actual environment variables
import os
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
os.environ["GOOGLE_PLACES_API_KEY"] = "test_key"
os.environ["ENVIRONMENT"] = "production"

# Verify configuration
assert ConfigManager.validate_critical_config() is True
assert ConfigManager.is_production() is True
assert ConfigManager.get_database_url() == "postgresql://test:test@localhost/test"
```

## Performance Considerations

### Memory Usage

- **Minimal Overhead**: ConfigManager uses class methods, so no instance overhead
- **Lazy Loading**: Values are retrieved only when needed
- **No Caching**: Values are retrieved fresh each time (for dynamic configuration)

### CPU Usage

- **Fast Access**: Direct environment variable access with minimal processing
- **Type Conversion**: Only performed when needed (for integer values)
- **Validation**: Only performed when explicitly called

### Recommendations

```python
# For frequently accessed values, cache them
class MyService:
    def __init__(self):
        # Cache static values
        self.api_key = ConfigManager.get_google_places_api_key()
        self.database_url = ConfigManager.get_database_url()
    
    def process_request(self):
        # Get dynamic values as needed
        log_level = ConfigManager.get_log_level()
```

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure you're importing from the correct path
   ```python
   from utils.config_manager import ConfigManager  # Correct
   from config_manager import ConfigManager        # Incorrect
   ```

2. **Missing Environment Variables**: Check that required environment variables are set
   ```bash
   echo $DATABASE_URL
   echo $GOOGLE_PLACES_API_KEY
   ```

3. **Type Errors**: Make sure you're using the correct method for the expected type
   ```python
   # For integers
   port = ConfigManager.get_port()  # Returns int
   
   # For strings
   api_key = ConfigManager.get_google_places_api_key()  # Returns str
   ```

4. **Invalid Values**: Handle invalid configuration values gracefully
   ```python
   try:
       port = ConfigManager.get_port()
   except ValueError:
       port = 5000  # Use default
   ```

### Debug Configuration

```python
# Get detailed configuration information
summary = ConfigManager.get_config_summary()
for key, value in summary.items():
    print(f"{key}: {value}")

# Check specific values
print(f"Database URL: {ConfigManager.get_database_url()}")
print(f"Redis URL: {ConfigManager.get_redis_url()}")
print(f"Environment: {ConfigManager.get_environment()}")
```

### Logging Issues

```python
# Check if logging is working
import logging
logging.basicConfig(level=logging.INFO)

# This should log a warning if DATABASE_URL is not set
ConfigManager.get_database_url()
```

## Real-World Examples

### Service Configuration

```python
from utils.config_manager import ConfigManager

class DatabaseService:
    def __init__(self):
        self.database_url = ConfigManager.get_database_url()
        self.pool_size = ConfigManager.get_db_pool_size()
        self.max_overflow = ConfigManager.get_db_max_overflow()
        
        if not self.database_url:
            raise ValueError("Database URL is required")
    
    def connect(self):
        # Use configuration values
        pass

class APIService:
    def __init__(self):
        self.api_key = ConfigManager.get_google_places_api_key()
        self.base_url = ConfigManager.get_api_url()
        self.is_production = ConfigManager.is_production()
        
        if not self.api_key:
            raise ValueError("API key is required")
    
    def make_request(self):
        # Use configuration values
        pass
```

### Application Startup

```python
from utils.config_manager import ConfigManager
import logging

def setup_application():
    # Validate critical configuration
    if not ConfigManager.validate_critical_config():
        logging.error("Critical configuration missing")
        return False
    
    # Log configuration summary
    summary = ConfigManager.get_config_summary()
    logging.info("Application configuration loaded", **summary)
    
    # Set up environment-specific configuration
    if ConfigManager.is_production():
        logging.info("Running in production mode")
        # Production-specific setup
    else:
        logging.info("Running in development mode")
        # Development-specific setup
    
    return True
```

### Testing Configuration

```python
import pytest
from utils.config_manager import ConfigManager

@pytest.fixture
def test_config():
    """Set up test configuration."""
    import os
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["GOOGLE_PLACES_API_KEY"] = "test_key"
    os.environ["ENVIRONMENT"] = "testing"
    
    yield
    
    # Clean up
    for var in ["DATABASE_URL", "GOOGLE_PLACES_API_KEY", "ENVIRONMENT"]:
        if var in os.environ:
            del os.environ[var]

def test_service_with_config(test_config):
    """Test service with test configuration."""
    assert ConfigManager.validate_critical_config() is True
    assert ConfigManager.is_testing() is True
```

## Future Enhancements

- **Configuration Caching**: Cache configuration values for better performance
- **Configuration Hot Reloading**: Reload configuration without restarting the application
- **Configuration Validation Schema**: Add JSON schema validation for configuration
- **Configuration Encryption**: Support for encrypted configuration values
- **Configuration Profiles**: Support for different configuration profiles (dev, staging, prod)
- **Configuration Monitoring**: Track configuration changes and usage
- **Configuration Backup**: Automatic backup of configuration values

## Contributing

When adding new configuration options:

1. **Add to ENV_VARS**: Add the environment variable name to the `ENV_VARS` dictionary
2. **Create Method**: Add a method to get the configuration value
3. **Add Documentation**: Update this guide with the new configuration option
4. **Add Tests**: Add unit tests for the new configuration option
5. **Update Migration**: Update the migration guide if needed

Example:

```python
# Add to ENV_VARS
ENV_VARS = {
    # ... existing vars ...
    "NEW_CONFIG": "NEW_CONFIG",
}

# Add method
@classmethod
def get_new_config(cls, default: str = "default_value") -> str:
    """Get new configuration value from environment."""
    return cls.get_env_var("NEW_CONFIG", default)
```

## API Reference

### Core Methods

- `get_env_var(name: str, default: Any = None) -> Any`: Get environment variable with optional default
- `validate_critical_config() -> bool`: Validate that all critical configuration is present
- `get_config_summary() -> dict`: Get a summary of current configuration

### Environment Detection

- `is_production() -> bool`: Check if running in production environment
- `is_development() -> bool`: Check if running in development environment
- `is_testing() -> bool`: Check if running in testing environment

### Configuration Categories

See the tables above for all available configuration methods organized by category.
