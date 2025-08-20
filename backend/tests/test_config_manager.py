import os
from unittest.mock import MagicMock, patch

import pytest
from utils.config_manager import ConfigManager

"""
Test suite for ConfigManager

Tests the unified configuration manager functionality including:
- Environment variable access
- Default value handling
- Environment detection
- Configuration validation
- Error handling
"""


class TestConfigManager:
    """Test cases for ConfigManager class."""

    def setup_method(self):
        """Set up test environment."""
        # Clear any existing environment variables that might interfere
        self.test_vars = [
            "DATABASE_URL",
            "GOOGLE_PLACES_API_KEY",
            "FLASK_SECRET_KEY",
            "REDIS_URL",
            "PORT",
            "ENVIRONMENT",
            "FLASK_ENV",
        ]

        # Store original values
        self.original_values = {}
        for var in self.test_vars:
            self.original_values[var] = os.environ.get(var)
            if var in os.environ:
                del os.environ[var]

    def teardown_method(self):
        """Clean up test environment."""
        # Restore original values
        for var, value in self.original_values.items():
            if value is not None:
                os.environ[var] = value
            elif var in os.environ:
                del os.environ[var]

    def test_get_env_var_with_value(self):
        """Test getting environment variable that exists."""
        os.environ["TEST_VAR"] = "test_value"
        assert ConfigManager.get_env_var("TEST_VAR") == "test_value"

    def test_get_env_var_with_default(self):
        """Test getting environment variable with default value."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", "default") == "default"

    def test_get_env_var_without_default(self):
        """Test getting environment variable without default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR") is None

    def test_get_database_url(self):
        """Test getting database URL."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        assert (
            ConfigManager.get_database_url() == "postgresql://test:test@localhost/test"
        )

    def test_get_database_url_not_set(self):
        """Test getting database URL when not set."""
        assert ConfigManager.get_database_url() is None

    def test_get_test_database_url(self):
        """Test getting test database URL."""
        os.environ["TEST_DATABASE_URL"] = "sqlite:///:memory:"
        assert ConfigManager.get_test_database_url() == "sqlite:///:memory:"

    def test_get_db_pool_size_with_default(self):
        """Test getting database pool size with default."""
        assert ConfigManager.get_db_pool_size() == 5

    def test_get_db_pool_size_with_env_value(self):
        """Test getting database pool size from environment."""
        os.environ["DB_POOL_SIZE"] = "10"
        assert ConfigManager.get_db_pool_size() == 10

    def test_get_db_pool_size_with_custom_default(self):
        """Test getting database pool size with custom default."""
        assert ConfigManager.get_db_pool_size(default=15) == 15

    def test_get_redis_url_with_default(self):
        """Test getting Redis URL with default."""
        assert ConfigManager.get_redis_url() == "redis://localhost:6379"

    def test_get_redis_url_with_env_value(self):
        """Test getting Redis URL from environment."""
        os.environ["REDIS_URL"] = "redis://test:6379"
        assert ConfigManager.get_redis_url() == "redis://test:6379"

    def test_get_redis_host_with_default(self):
        """Test getting Redis host with default."""
        assert ConfigManager.get_redis_host() == "localhost"

    def test_get_redis_port_with_default(self):
        """Test getting Redis port with default."""
        assert ConfigManager.get_redis_port() == 6379

    def test_get_redis_port_with_env_value(self):
        """Test getting Redis port from environment."""
        os.environ["REDIS_PORT"] = "6380"
        assert ConfigManager.get_redis_port() == 6380

    def test_get_google_places_api_key(self):
        """Test getting Google Places API key."""
        os.environ["GOOGLE_PLACES_API_KEY"] = "test_api_key"
        assert ConfigManager.get_google_places_api_key() == "test_api_key"

    def test_get_google_places_api_key_not_set(self):
        """Test getting Google Places API key when not set."""
        assert ConfigManager.get_google_places_api_key() is None

    def test_get_google_maps_api_key(self):
        """Test getting Google Maps API key."""
        os.environ["GOOGLE_MAPS_API_KEY"] = "test_maps_key"
        assert ConfigManager.get_google_maps_api_key() == "test_maps_key"

    def test_get_google_api_key(self):
        """Test getting Google API key."""
        os.environ["GOOGLE_API_KEY"] = "test_general_key"
        assert ConfigManager.get_google_api_key() == "test_general_key"

    def test_get_google_api_key_not_set(self):
        """Test getting Google API key when not set."""
        assert ConfigManager.get_google_api_key() is None

    def test_get_cloudinary_cloud_name_with_default(self):
        """Test getting Cloudinary cloud name with default."""
        assert ConfigManager.get_cloudinary_cloud_name() == "jewgo"

    def test_get_cloudinary_cloud_name_with_env_value(self):
        """Test getting Cloudinary cloud name from environment."""
        os.environ["CLOUDINARY_CLOUD_NAME"] = "test_cloud"
        assert ConfigManager.get_cloudinary_cloud_name() == "test_cloud"

    def test_get_cloudinary_api_key(self):
        """Test getting Cloudinary API key."""
        os.environ["CLOUDINARY_API_KEY"] = "cloudinary_key"
        assert ConfigManager.get_cloudinary_api_key() == "cloudinary_key"

    def test_get_cloudinary_api_key_not_set(self):
        """Test getting Cloudinary API key when not set."""
        assert ConfigManager.get_cloudinary_api_key() is None

    def test_get_cloudinary_api_secret(self):
        """Test getting Cloudinary API secret."""
        os.environ["CLOUDINARY_API_SECRET"] = "cloudinary_secret"
        assert ConfigManager.get_cloudinary_api_secret() == "cloudinary_secret"

    def test_get_cloudinary_api_secret_not_set(self):
        """Test getting Cloudinary API secret when not set."""
        assert ConfigManager.get_cloudinary_api_secret() is None

    def test_get_flask_secret_key_with_default(self):
        """Test getting Flask secret key with default."""
        assert (
            ConfigManager.get_flask_secret_key()
            == "dev-secret-key-change-in-production"
        )

    def test_get_flask_secret_key_with_env_value(self):
        """Test getting Flask secret key from environment."""
        os.environ["FLASK_SECRET_KEY"] = "production_secret"
        assert ConfigManager.get_flask_secret_key() == "production_secret"

    def test_get_port_with_default(self):
        """Test getting port with default."""
        assert ConfigManager.get_port() == 5000

    def test_get_port_with_env_value(self):
        """Test getting port from environment."""
        os.environ["PORT"] = "8080"
        assert ConfigManager.get_port() == 8080

    def test_get_environment_with_default(self):
        """Test getting environment with default."""
        assert ConfigManager.get_environment() == "development"

    def test_get_environment_with_env_value(self):
        """Test getting environment from environment."""
        os.environ["ENVIRONMENT"] = "production"
        assert ConfigManager.get_environment() == "production"

    def test_get_flask_env_with_default(self):
        """Test getting Flask environment with default."""
        assert ConfigManager.get_flask_env() == "development"

    def test_get_flask_env_with_env_value(self):
        """Test getting Flask environment from environment."""
        os.environ["FLASK_ENV"] = "production"
        assert ConfigManager.get_flask_env() == "production"

    def test_get_log_level_with_default(self):
        """Test getting log level with default."""
        assert ConfigManager.get_log_level() == "INFO"

    def test_get_log_level_with_env_value(self):
        """Test getting log level from environment."""
        os.environ["LOG_LEVEL"] = "DEBUG"
        assert ConfigManager.get_log_level() == "DEBUG"

    def test_get_api_url_with_default(self):
        """Test getting API URL with default."""
        assert ConfigManager.get_api_url() == "https://jewgo.onrender.com"

    def test_get_frontend_url_with_default(self):
        """Test getting frontend URL with default."""
        assert ConfigManager.get_frontend_url() == "https://jewgo.com"

    def test_get_cors_origins_with_default(self):
        """Test getting CORS origins with default."""
        assert ConfigManager.get_cors_origins() == ["*"]

    def test_get_cors_origins_with_env_value(self):
        """Test getting CORS origins from environment."""
        os.environ["CORS_ORIGINS"] = "https://jewgo.com,https://jewgo-app.vercel.app"
        assert ConfigManager.get_cors_origins() == [
            "https://jewgo.com",
            "https://jewgo-app.vercel.app",
        ]

    def test_get_cors_origins_empty(self):
        """Test getting CORS origins when empty."""
        os.environ["CORS_ORIGINS"] = ""
        assert ConfigManager.get_cors_origins() == ["*"]

    def test_is_production_true(self):
        """Test production environment detection."""
        os.environ["ENVIRONMENT"] = "production"
        assert ConfigManager.is_production() is True

    def test_is_production_false(self):
        """Test production environment detection when not production."""
        os.environ["ENVIRONMENT"] = "development"
        assert ConfigManager.is_production() is False

    def test_is_production_via_flask_env(self):
        """Test production environment detection via FLASK_ENV."""
        os.environ["FLASK_ENV"] = "production"
        assert ConfigManager.is_production() is True

    def test_is_development_true(self):
        """Test development environment detection."""
        os.environ["ENVIRONMENT"] = "development"
        assert ConfigManager.is_development() is True

    def test_is_development_false(self):
        """Test development environment detection when not development."""
        os.environ["ENVIRONMENT"] = "production"
        assert ConfigManager.is_development() is False

    def test_is_testing_true(self):
        """Test testing environment detection."""
        os.environ["ENVIRONMENT"] = "testing"
        assert ConfigManager.is_testing() is True

    def test_is_testing_false(self):
        """Test testing environment detection when not testing."""
        os.environ["ENVIRONMENT"] = "development"
        assert ConfigManager.is_testing() is False

    def test_validate_critical_config_all_set(self):
        """Test critical configuration validation when all variables are set."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        os.environ["GOOGLE_PLACES_API_KEY"] = "test_api_key"
        os.environ["FLASK_SECRET_KEY"] = "test_secret"

        assert ConfigManager.validate_critical_config() is True

    def test_validate_critical_config_missing_vars(self):
        """Test critical configuration validation when variables are missing."""
        # Only set one of the critical variables
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"

        assert ConfigManager.validate_critical_config() is False

    def test_validate_critical_config_none_set(self):
        """Test critical configuration validation when no variables are set."""
        assert ConfigManager.validate_critical_config() is False

    def test_get_config_summary(self):
        """Test getting configuration summary."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        os.environ["ENVIRONMENT"] = "production"
        os.environ["PORT"] = "8080"

        summary = ConfigManager.get_config_summary()

        assert summary["environment"] == "production"
        assert summary["port"] == 8080
        assert summary["database_url_set"] is True
        assert summary["is_production"] is True
        assert summary["is_development"] is False
        assert summary["is_testing"] is False

    def test_get_config_summary_no_vars_set(self):
        """Test getting configuration summary when no variables are set."""
        summary = ConfigManager.get_config_summary()

        assert summary["environment"] == "development"
        assert summary["port"] == 5000
        assert summary["database_url_set"] is False
        assert summary["google_places_api_key_set"] is False
        assert summary["is_production"] is False
        assert summary["is_development"] is True

    def test_pg_configuration_methods(self):
        """Test PostgreSQL configuration methods."""
        os.environ["PG_KEEPALIVES_IDLE"] = "60"
        os.environ["PG_KEEPALIVES_INTERVAL"] = "20"
        os.environ["PG_KEEPALIVES_COUNT"] = "5"
        os.environ["PG_STATEMENT_TIMEOUT"] = "60000"
        os.environ["PG_IDLE_TX_TIMEOUT"] = "120000"
        os.environ["PGSSLMODE"] = "verify-full"
        os.environ["PGSSLROOTCERT"] = "/path/to/cert"

        assert ConfigManager.get_pg_keepalives_idle() == 60
        assert ConfigManager.get_pg_keepalives_interval() == 20
        assert ConfigManager.get_pg_keepalives_count() == 5
        assert ConfigManager.get_pg_statement_timeout() == "60000"
        assert ConfigManager.get_pg_idle_tx_timeout() == "120000"
        assert ConfigManager.get_pg_sslmode() == "verify-full"
        assert ConfigManager.get_pg_sslrootcert() == "/path/to/cert"

    def test_pg_configuration_methods_with_defaults(self):
        """Test PostgreSQL configuration methods with defaults."""
        assert ConfigManager.get_pg_keepalives_idle() == 30
        assert ConfigManager.get_pg_keepalives_interval() == 10
        assert ConfigManager.get_pg_keepalives_count() == 3
        assert ConfigManager.get_pg_statement_timeout() == "30000"
        assert ConfigManager.get_pg_idle_tx_timeout() == "60000"
        assert ConfigManager.get_pg_sslmode() == "require"
        assert ConfigManager.get_pg_sslrootcert() is None

    def test_monitoring_configuration_methods(self):
        """Test monitoring configuration methods."""
        os.environ["UPTIMEROBOT_API_KEY"] = "uptime_key"
        os.environ["CRONITOR_API_KEY"] = "cronitor_key"
        os.environ["SENTRY_DSN"] = "https://sentry.io/test"

        assert ConfigManager.get_uptimerobot_api_key() == "uptime_key"
        assert ConfigManager.get_cronitor_api_key() == "cronitor_key"
        assert ConfigManager.get_sentry_dsn() == "https://sentry.io/test"

    def test_monitoring_configuration_methods_not_set(self):
        """Test monitoring configuration methods when not set."""
        assert ConfigManager.get_uptimerobot_api_key() is None
        assert ConfigManager.get_cronitor_api_key() is None
        assert ConfigManager.get_sentry_dsn() is None

    def test_cache_and_session_configuration_methods(self):
        """Test cache and session configuration methods."""
        os.environ["CACHE_TYPE"] = "memory"
        os.environ["SESSION_TYPE"] = "filesystem"
        os.environ["RATELIMIT_STORAGE_URL"] = "redis://localhost:6379/1"

        assert ConfigManager.get_cache_type() == "memory"
        assert ConfigManager.get_session_type() == "filesystem"
        assert ConfigManager.get_ratelimit_storage_url() == "redis://localhost:6379/1"

    def test_cache_and_session_configuration_methods_with_defaults(self):
        """Test cache and session configuration methods with defaults."""
        assert ConfigManager.get_cache_type() == "redis"
        assert ConfigManager.get_session_type() == "redis"
        assert ConfigManager.get_ratelimit_storage_url() == "memory://"

    def test_url_configuration_methods(self):
        """Test URL configuration methods."""
        os.environ["API_URL"] = "https://api.test.com"
        os.environ["FRONTEND_URL"] = "https://frontend.test.com"
        os.environ["RENDER_URL"] = "https://render.test.com"
        os.environ["FLASK_APP_URL"] = "http://localhost:8000"

        assert ConfigManager.get_api_url() == "https://api.test.com"
        assert ConfigManager.get_frontend_url() == "https://frontend.test.com"
        assert ConfigManager.get_render_url() == "https://render.test.com"
        assert ConfigManager.get_flask_app_url() == "http://localhost:8000"

    def test_url_configuration_methods_with_defaults(self):
        """Test URL configuration methods with defaults."""
        assert ConfigManager.get_api_url() == "https://jewgo.onrender.com"
        assert ConfigManager.get_frontend_url() == "https://jewgo.com"
        assert ConfigManager.get_render_url() == "https://jewgo-backend.onrender.com"
        assert ConfigManager.get_flask_app_url() == "http://localhost:5000"

    def test_jwt_configuration_methods(self):
        """Test JWT configuration methods."""
        os.environ["JWT_SECRET_KEY"] = "jwt_secret"
        assert ConfigManager.get_jwt_secret_key() == "jwt_secret"

    def test_jwt_configuration_methods_not_set(self):
        """Test JWT configuration methods when not set."""
        assert ConfigManager.get_jwt_secret_key() is None

    def test_redis_configuration_methods(self):
        """Test Redis configuration methods."""
        os.environ["REDIS_HOST"] = "redis.test.com"
        os.environ["REDIS_PORT"] = "6380"
        os.environ["REDIS_DB"] = "1"
        os.environ["REDIS_PASSWORD"] = "redis_password"

        assert ConfigManager.get_redis_host() == "redis.test.com"
        assert ConfigManager.get_redis_port() == 6380
        assert ConfigManager.get_redis_db() == 1
        assert ConfigManager.get_redis_password() == "redis_password"

    def test_redis_configuration_methods_with_defaults(self):
        """Test Redis configuration methods with defaults."""
        assert ConfigManager.get_redis_host() == "localhost"
        assert ConfigManager.get_redis_port() == 6379
        assert ConfigManager.get_redis_db() == 0
        assert ConfigManager.get_redis_password() is None

    @patch("utils.config_manager.logger")
    def test_get_env_var_logs_missing_critical_vars(self, mock_logger):
        """Test that missing critical environment variables are logged."""
        ConfigManager.get_env_var("DATABASE_URL")
        mock_logger.warning.assert_called_with(
            "Critical environment variable DATABASE_URL is not set"
        )

    @patch("utils.config_manager.logger")
    def test_get_env_var_does_not_log_non_critical_vars(self, mock_logger):
        """Test that non-critical environment variables are not logged when missing."""
        ConfigManager.get_env_var("NON_CRITICAL_VAR")
        mock_logger.warning.assert_not_called()

    @patch("utils.config_manager.logger")
    def test_validate_critical_config_logs_missing_vars(self, mock_logger):
        """Test that validation logs missing critical variables."""
        ConfigManager.validate_critical_config()
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args[1]
        assert "missing_vars" in call_args
        assert len(call_args["missing_vars"]) == 3  # All three critical vars

    @patch("utils.config_manager.logger")
    def test_validate_critical_config_logs_success(self, mock_logger):
        """Test that validation logs success when all vars are present."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        os.environ["GOOGLE_PLACES_API_KEY"] = "test_api_key"
        os.environ["FLASK_SECRET_KEY"] = "test_secret"

        ConfigManager.validate_critical_config()
        mock_logger.info.assert_called_with(
            "All critical configuration validated successfully"
        )

    def test_get_port_with_invalid_value(self):
        """Test getting port with invalid value raises ValueError."""
        os.environ["PORT"] = "invalid_port"
        with pytest.raises(ValueError):
            ConfigManager.get_port()

    def test_get_redis_port_with_invalid_value(self):
        """Test getting Redis port with invalid value raises ValueError."""
        os.environ["REDIS_PORT"] = "invalid_port"
        with pytest.raises(ValueError):
            ConfigManager.get_redis_port()

    def test_get_redis_db_with_invalid_value(self):
        """Test getting Redis DB with invalid value raises ValueError."""
        os.environ["REDIS_DB"] = "invalid_db"
        with pytest.raises(ValueError):
            ConfigManager.get_redis_db()

    def test_get_db_pool_size_with_invalid_value(self):
        """Test getting DB pool size with invalid value raises ValueError."""
        os.environ["DB_POOL_SIZE"] = "invalid_size"
        with pytest.raises(ValueError):
            ConfigManager.get_db_pool_size()

    def test_get_pg_keepalives_idle_with_invalid_value(self):
        """Test getting PG keepalives idle with invalid value raises ValueError."""
        os.environ["PG_KEEPALIVES_IDLE"] = "invalid_idle"
        with pytest.raises(ValueError):
            ConfigManager.get_pg_keepalives_idle()

    def test_get_cors_origins_with_single_value(self):
        """Test getting CORS origins with single value."""
        os.environ["CORS_ORIGINS"] = "https://single-domain.com"
        assert ConfigManager.get_cors_origins() == ["https://single-domain.com"]

    def test_get_cors_origins_with_whitespace(self):
        """Test getting CORS origins with whitespace."""
        os.environ["CORS_ORIGINS"] = " https://domain1.com , https://domain2.com "
        assert ConfigManager.get_cors_origins() == [
            "https://domain1.com",
            "https://domain2.com",
        ]

    def test_get_cors_origins_with_empty_strings(self):
        """Test getting CORS origins with empty strings in list."""
        os.environ["CORS_ORIGINS"] = "https://domain1.com,,https://domain2.com"
        assert ConfigManager.get_cors_origins() == [
            "https://domain1.com",
            "",
            "https://domain2.com",
        ]

    def test_environment_detection_case_insensitive(self):
        """Test environment detection is case insensitive."""
        os.environ["ENVIRONMENT"] = "PRODUCTION"
        assert ConfigManager.is_production() is True

        os.environ["ENVIRONMENT"] = "Development"
        assert ConfigManager.is_development() is True

        os.environ["ENVIRONMENT"] = "TESTING"
        assert ConfigManager.is_testing() is True

    def test_flask_env_detection_case_insensitive(self):
        """Test Flask environment detection is case insensitive."""
        os.environ["FLASK_ENV"] = "PRODUCTION"
        assert ConfigManager.is_production() is True

        os.environ["FLASK_ENV"] = "Development"
        assert ConfigManager.is_development() is True

    def test_get_config_summary_with_partial_config(self):
        """Test getting configuration summary with partial configuration."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        # Don't set other critical vars

        summary = ConfigManager.get_config_summary()

        assert summary["database_url_set"] is True
        assert summary["google_places_api_key_set"] is False
        assert summary["sentry_dsn_set"] is False

    def test_get_config_summary_with_all_config(self):
        """Test getting configuration summary with all configuration set."""
        os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
        os.environ["GOOGLE_PLACES_API_KEY"] = "test_api_key"
        os.environ["GOOGLE_MAPS_API_KEY"] = "test_maps_key"
        os.environ["SENTRY_DSN"] = "https://sentry.io/test"
        os.environ["ENVIRONMENT"] = "production"
        os.environ["PORT"] = "8080"

        summary = ConfigManager.get_config_summary()

        assert summary["database_url_set"] is True
        assert summary["google_places_api_key_set"] is True
        assert summary["google_maps_api_key_set"] is True
        assert summary["sentry_dsn_set"] is True
        assert summary["environment"] == "production"
        assert summary["port"] == 8080
        assert summary["is_production"] is True

    def test_get_env_var_with_empty_string(self):
        """Test getting environment variable with empty string."""
        os.environ["EMPTY_VAR"] = ""
        assert ConfigManager.get_env_var("EMPTY_VAR") == ""

    def test_get_env_var_with_whitespace(self):
        """Test getting environment variable with whitespace."""
        os.environ["WHITESPACE_VAR"] = "  test_value  "
        assert ConfigManager.get_env_var("WHITESPACE_VAR") == "  test_value  "

    def test_get_env_var_with_special_characters(self):
        """Test getting environment variable with special characters."""
        os.environ["SPECIAL_VAR"] = "test@#$%^&*()_+-=[]{}|;':\",./<>?"
        assert (
            ConfigManager.get_env_var("SPECIAL_VAR")
            == "test@#$%^&*()_+-=[]{}|;':\",./<>?"
        )

    def test_get_env_var_with_unicode(self):
        """Test getting environment variable with unicode characters."""
        os.environ["UNICODE_VAR"] = "test_unicode_ñáéíóú"
        assert ConfigManager.get_env_var("UNICODE_VAR") == "test_unicode_ñáéíóú"

    def test_get_env_var_with_newlines(self):
        """Test getting environment variable with newlines."""
        os.environ["NEWLINE_VAR"] = "line1\nline2\nline3"
        assert ConfigManager.get_env_var("NEWLINE_VAR") == "line1\nline2\nline3"

    def test_get_env_var_with_tabs(self):
        """Test getting environment variable with tabs."""
        os.environ["TAB_VAR"] = "field1\tfield2\tfield3"
        assert ConfigManager.get_env_var("TAB_VAR") == "field1\tfield2\tfield3"

    def test_get_env_var_with_zero_value(self):
        """Test getting environment variable with zero value."""
        os.environ["ZERO_VAR"] = "0"
        assert ConfigManager.get_env_var("ZERO_VAR") == "0"

    def test_get_env_var_with_false_value(self):
        """Test getting environment variable with false value."""
        os.environ["FALSE_VAR"] = "false"
        assert ConfigManager.get_env_var("FALSE_VAR") == "false"

    def test_get_env_var_with_true_value(self):
        """Test getting environment variable with true value."""
        os.environ["TRUE_VAR"] = "true"
        assert ConfigManager.get_env_var("TRUE_VAR") == "true"

    def test_get_env_var_with_numeric_string(self):
        """Test getting environment variable with numeric string."""
        os.environ["NUMERIC_VAR"] = "12345"
        assert ConfigManager.get_env_var("NUMERIC_VAR") == "12345"

    def test_get_env_var_with_float_string(self):
        """Test getting environment variable with float string."""
        os.environ["FLOAT_VAR"] = "123.45"
        assert ConfigManager.get_env_var("FLOAT_VAR") == "123.45"

    def test_get_env_var_with_negative_number(self):
        """Test getting environment variable with negative number."""
        os.environ["NEGATIVE_VAR"] = "-123"
        assert ConfigManager.get_env_var("NEGATIVE_VAR") == "-123"

    def test_get_env_var_with_very_long_value(self):
        """Test getting environment variable with very long value."""
        long_value = "x" * 10000
        os.environ["LONG_VAR"] = long_value
        assert ConfigManager.get_env_var("LONG_VAR") == long_value

    def test_get_env_var_with_very_long_name(self):
        """Test getting environment variable with very long name."""
        long_name = "x" * 1000
        os.environ[long_name] = "test_value"
        assert ConfigManager.get_env_var(long_name) == "test_value"

    def test_get_env_var_with_none_default(self):
        """Test getting environment variable with None as default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", None) is None

    def test_get_env_var_with_empty_string_default(self):
        """Test getting environment variable with empty string as default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", "") == ""

    def test_get_env_var_with_zero_default(self):
        """Test getting environment variable with zero as default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", 0) == 0

    def test_get_env_var_with_false_default(self):
        """Test getting environment variable with False as default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", False) is False

    def test_get_env_var_with_true_default(self):
        """Test getting environment variable with True as default."""
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", True) is True

    def test_get_env_var_with_list_default(self):
        """Test getting environment variable with list as default."""
        default_list = ["item1", "item2", "item3"]
        assert (
            ConfigManager.get_env_var("NONEXISTENT_VAR", default_list) == default_list
        )

    def test_get_env_var_with_dict_default(self):
        """Test getting environment variable with dict as default."""
        default_dict = {"key1": "value1", "key2": "value2"}
        assert (
            ConfigManager.get_env_var("NONEXISTENT_VAR", default_dict) == default_dict
        )

    def test_get_env_var_with_object_default(self):
        """Test getting environment variable with object as default."""

        class TestObject:
            def __init__(self, value):
                self.value = value

        test_obj = TestObject("test")
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", test_obj) == test_obj

    def test_get_env_var_with_lambda_default(self):
        """Test getting environment variable with lambda as default."""
        lambda_func = lambda: "lambda_result"
        assert ConfigManager.get_env_var("NONEXISTENT_VAR", lambda_func) == lambda_func

    def test_get_env_var_with_complex_default(self):
        """Test getting environment variable with complex default."""
        complex_default = {"nested": {"list": [1, 2, 3], "string": "test"}}
        assert (
            ConfigManager.get_env_var("NONEXISTENT_VAR", complex_default)
            == complex_default
        )
