#!/usr/bin/env python3
"""
Authentication Security Configuration

Provides environment-specific configuration management for the authentication
security hardening system with validation and startup checks.
"""

import os
import json
import yaml
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from utils.logging_config import get_logger

logger = get_logger(__name__)


class Environment(Enum):
    """Environment types."""
    DEVELOPMENT = "development"
    PREVIEW = "preview"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class DatabaseConfig:
    """Database configuration."""
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False


@dataclass
class RedisConfig:
    """Redis configuration."""
    url: str
    host: str = "localhost"
    port: int = 6379
    password: Optional[str] = None
    db: int = 0
    max_connections: int = 10
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    retry_on_timeout: bool = True


@dataclass
class JWTConfig:
    """JWT configuration."""
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    refresh_token_expire_days: int = 30
    leeway_seconds: int = 60
    issuer: str = "jewgo.app"
    audience: str = "jewgo.users"


@dataclass
class CSRFConfig:
    """CSRF configuration."""
    secret_key: str
    token_length: int = 32
    cookie_name: str = "csrf_token"
    cookie_max_age: int = 3600
    day_bucket_format: str = "%Y-%m-%d"


@dataclass
class CORSConfig:
    """CORS configuration."""
    allowed_origins: List[str]
    allowed_methods: List[str] = None
    allowed_headers: List[str] = None
    allow_credentials: bool = True
    max_age: int = 600
    
    def __post_init__(self):
        if self.allowed_methods is None:
            self.allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
        if self.allowed_headers is None:
            self.allowed_headers = [
                "Content-Type", "Authorization", "Accept", "Origin", 
                "X-Requested-With", "X-CSRF-Token"
            ]


@dataclass
class CookieConfig:
    """Cookie configuration."""
    domain: Optional[str] = None
    secure: bool = True
    httponly: bool = True
    samesite: str = "None"
    max_age: int = 3600
    path: str = "/"


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    enabled: bool = True
    default_limit: str = "1000 per hour"
    auth_limit: str = "10 per minute"
    burst_limit: int = 5
    storage_url: str = "memory://"


@dataclass
class AbuseControlConfig:
    """Abuse control configuration."""
    enabled: bool = True
    max_attempts: int = 5
    window_minutes: int = 15
    backoff_base_minutes: int = 5
    captcha_threshold: int = 3
    captcha_enabled: bool = False
    turnstile_secret: Optional[str] = None
    turnstile_site_key: Optional[str] = None
    recaptcha_secret: Optional[str] = None
    recaptcha_site_key: Optional[str] = None


@dataclass
class MonitoringConfig:
    """Monitoring configuration."""
    prometheus_enabled: bool = True
    prometheus_port: int = 8000
    metrics_retention_hours: int = 24
    alerting_enabled: bool = True
    email_alerts: bool = False
    slack_alerts: bool = False
    webhook_alerts: bool = False
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    alert_email_to: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    webhook_url: Optional[str] = None


@dataclass
class DataRetentionConfig:
    """Data retention configuration."""
    enabled: bool = True
    check_interval_hours: int = 24
    failed_logins_retention_days: int = 90
    audit_logs_retention_days: int = 365
    session_data_retention_days: int = 30
    metrics_retention_days: int = 90
    temp_data_retention_hours: int = 24
    pii_masking_enabled: bool = True
    pii_masking_salt: str = "default-salt-change-in-production"


@dataclass
class CanaryConfig:
    """Canary deployment configuration."""
    enabled: bool = False
    check_interval_minutes: int = 5
    default_percentage: float = 0.05
    default_duration_hours: int = 72
    rollback_thresholds: Dict[str, float] = None
    
    def __post_init__(self):
        if self.rollback_thresholds is None:
            self.rollback_thresholds = {
                "error_rate": 0.1,
                "latency_p95": 0.5,
                "auth_failure_rate": 0.2,
                "csrf_failure_rate": 0.1,
                "security_events": 50
            }


@dataclass
class SecurityConfig:
    """Complete security configuration."""
    environment: Environment
    database: DatabaseConfig
    redis: RedisConfig
    jwt: JWTConfig
    csrf: CSRFConfig
    cors: CORSConfig
    cookies: CookieConfig
    rate_limiting: RateLimitConfig
    abuse_control: AbuseControlConfig
    monitoring: MonitoringConfig
    data_retention: DataRetentionConfig
    canary: CanaryConfig
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert configuration to JSON string."""
        return json.dumps(self.to_dict(), indent=2, default=str)
    
    def to_yaml(self) -> str:
        """Convert configuration to YAML string."""
        return yaml.dump(self.to_dict(), default_flow_style=False)


class ConfigManager:
    """Configuration manager for authentication security."""
    
    def __init__(self, environment: Environment = None):
        """Initialize configuration manager."""
        self.environment = environment or self._detect_environment()
        self.config: Optional[SecurityConfig] = None
        
        logger.info(f"Configuration manager initialized for environment: {self.environment.value}")
    
    def _detect_environment(self) -> Environment:
        """Detect the current environment."""
        env_str = os.getenv('ENVIRONMENT', 'development').lower()
        
        if env_str in ['prod', 'production']:
            return Environment.PRODUCTION
        elif env_str in ['staging', 'stage']:
            return Environment.STAGING
        elif env_str in ['preview', 'preview']:
            return Environment.PREVIEW
        else:
            return Environment.DEVELOPMENT
    
    def load_config(self, config_file: Optional[str] = None) -> SecurityConfig:
        """Load configuration from file or environment variables."""
        if config_file and Path(config_file).exists():
            self.config = self._load_from_file(config_file)
        else:
            self.config = self._load_from_environment()
        
        # Validate configuration
        self._validate_config(self.config)
        
        logger.info(f"Configuration loaded successfully for {self.environment.value}")
        return self.config
    
    def _load_from_file(self, config_file: str) -> SecurityConfig:
        """Load configuration from file."""
        file_path = Path(config_file)
        
        if file_path.suffix.lower() == '.json':
            with open(file_path, 'r') as f:
                config_data = json.load(f)
        elif file_path.suffix.lower() in ['.yml', '.yaml']:
            with open(file_path, 'r') as f:
                config_data = yaml.safe_load(f)
        else:
            raise ValueError(f"Unsupported config file format: {file_path.suffix}")
        
        # Get environment-specific config
        env_config = config_data.get(self.environment.value, {})
        
        return self._create_config_from_dict(env_config)
    
    def _load_from_environment(self) -> SecurityConfig:
        """Load configuration from environment variables."""
        config_data = {
            'environment': self.environment,
            'database': self._load_database_config(),
            'redis': self._load_redis_config(),
            'jwt': self._load_jwt_config(),
            'csrf': self._load_csrf_config(),
            'cors': self._load_cors_config(),
            'cookies': self._load_cookie_config(),
            'rate_limiting': self._load_rate_limit_config(),
            'abuse_control': self._load_abuse_control_config(),
            'monitoring': self._load_monitoring_config(),
            'data_retention': self._load_data_retention_config(),
            'canary': self._load_canary_config()
        }
        
        return self._create_config_from_dict(config_data)
    
    def _load_database_config(self) -> DatabaseConfig:
        """Load database configuration from environment."""
        return DatabaseConfig(
            url=os.getenv('DATABASE_URL', 'postgresql://localhost/jewgo'),
            pool_size=int(os.getenv('DB_POOL_SIZE', '10')),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', '20')),
            pool_timeout=int(os.getenv('DB_POOL_TIMEOUT', '30')),
            pool_recycle=int(os.getenv('DB_POOL_RECYCLE', '3600')),
            echo=os.getenv('DB_ECHO', 'false').lower() == 'true'
        )
    
    def _load_redis_config(self) -> RedisConfig:
        """Load Redis configuration from environment."""
        redis_url = os.getenv('REDIS_URL')
        
        if redis_url:
            return RedisConfig(url=redis_url)
        else:
            return RedisConfig(
                url=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}",
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', '6379')),
                password=os.getenv('REDIS_PASSWORD'),
                db=int(os.getenv('REDIS_DB', '0')),
                max_connections=int(os.getenv('REDIS_MAX_CONNECTIONS', '10')),
                socket_timeout=int(os.getenv('REDIS_SOCKET_TIMEOUT', '5')),
                socket_connect_timeout=int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', '5')),
                retry_on_timeout=os.getenv('REDIS_RETRY_ON_TIMEOUT', 'true').lower() == 'true'
            )
    
    def _load_jwt_config(self) -> JWTConfig:
        """Load JWT configuration from environment."""
        secret_key = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
        if not secret_key:
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        
        return JWTConfig(
            secret_key=secret_key,
            algorithm=os.getenv('JWT_ALGORITHM', 'HS256'),
            access_token_expire_hours=int(os.getenv('JWT_ACCESS_EXPIRE_HOURS', '24')),
            refresh_token_expire_days=int(os.getenv('JWT_REFRESH_EXPIRE_DAYS', '30')),
            leeway_seconds=int(os.getenv('JWT_LEEWAY_SECONDS', '60')),
            issuer=os.getenv('JWT_ISSUER', 'jewgo.app'),
            audience=os.getenv('JWT_AUDIENCE', 'jewgo.users')
        )
    
    def _load_csrf_config(self) -> CSRFConfig:
        """Load CSRF configuration from environment."""
        secret_key = os.getenv('CSRF_SECRET_KEY') or os.getenv('CSRF_SECRET')
        if not secret_key:
            raise ValueError("CSRF_SECRET_KEY environment variable is required")
        
        return CSRFConfig(
            secret_key=secret_key,
            token_length=int(os.getenv('CSRF_TOKEN_LENGTH', '32')),
            cookie_name=os.getenv('CSRF_COOKIE_NAME', 'csrf_token'),
            cookie_max_age=int(os.getenv('CSRF_COOKIE_MAX_AGE', '3600')),
            day_bucket_format=os.getenv('CSRF_DAY_BUCKET_FORMAT', '%Y-%m-%d')
        )
    
    def _load_cors_config(self) -> CORSConfig:
        """Load CORS configuration from environment."""
        origins_str = os.getenv('CORS_ORIGINS', '')
        allowed_origins = [origin.strip() for origin in origins_str.split(',') if origin.strip()]
        
        # Add environment-specific defaults
        if self.environment == Environment.DEVELOPMENT:
            allowed_origins.extend(['http://localhost:3000', 'http://127.0.0.1:3000'])
        elif self.environment == Environment.PREVIEW:
            allowed_origins.extend(['https://*.vercel.app'])
        elif self.environment == Environment.PRODUCTION:
            allowed_origins.extend(['https://jewgo.app', 'https://www.jewgo.app'])
        
        return CORSConfig(
            allowed_origins=allowed_origins,
            allow_credentials=os.getenv('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true',
            max_age=int(os.getenv('CORS_MAX_AGE', '600'))
        )
    
    def _load_cookie_config(self) -> CookieConfig:
        """Load cookie configuration from environment."""
        if self.environment == Environment.PRODUCTION:
            domain = os.getenv('COOKIE_DOMAIN', '.jewgo.app')
            secure = True
            samesite = 'None'
        elif self.environment == Environment.PREVIEW:
            domain = None  # host-only
            secure = True
            samesite = 'None'
        else:  # development
            domain = None
            secure = False
            samesite = 'Lax'
        
        return CookieConfig(
            domain=domain,
            secure=secure,
            httponly=os.getenv('COOKIE_HTTPONLY', 'true').lower() == 'true',
            samesite=samesite,
            max_age=int(os.getenv('COOKIE_MAX_AGE', '3600')),
            path=os.getenv('COOKIE_PATH', '/')
        )
    
    def _load_rate_limit_config(self) -> RateLimitConfig:
        """Load rate limiting configuration from environment."""
        return RateLimitConfig(
            enabled=os.getenv('RATE_LIMITING_ENABLED', 'true').lower() == 'true',
            default_limit=os.getenv('RATE_LIMIT_DEFAULT', '1000 per hour'),
            auth_limit=os.getenv('RATE_LIMIT_AUTH', '10 per minute'),
            burst_limit=int(os.getenv('RATE_LIMIT_BURST', '5')),
            storage_url=os.getenv('RATE_LIMIT_STORAGE_URL', 'memory://')
        )
    
    def _load_abuse_control_config(self) -> AbuseControlConfig:
        """Load abuse control configuration from environment."""
        return AbuseControlConfig(
            enabled=os.getenv('ABUSE_CONTROL_ENABLED', 'true').lower() == 'true',
            max_attempts=int(os.getenv('ABUSE_MAX_ATTEMPTS', '5')),
            window_minutes=int(os.getenv('ABUSE_WINDOW_MINUTES', '15')),
            backoff_base_minutes=int(os.getenv('ABUSE_BACKOFF_BASE_MINUTES', '5')),
            captcha_threshold=int(os.getenv('ABUSE_CAPTCHA_THRESHOLD', '3')),
            captcha_enabled=os.getenv('CAPTCHA_ENABLED', 'false').lower() == 'true',
            turnstile_secret=os.getenv('TURNSTILE_SECRET_KEY'),
            turnstile_site_key=os.getenv('TURNSTILE_SITE_KEY'),
            recaptcha_secret=os.getenv('RECAPTCHA_SECRET_KEY'),
            recaptcha_site_key=os.getenv('RECAPTCHA_SITE_KEY')
        )
    
    def _load_monitoring_config(self) -> MonitoringConfig:
        """Load monitoring configuration from environment."""
        return MonitoringConfig(
            prometheus_enabled=os.getenv('PROMETHEUS_ENABLED', 'true').lower() == 'true',
            prometheus_port=int(os.getenv('PROMETHEUS_PORT', '8000')),
            metrics_retention_hours=int(os.getenv('METRICS_RETENTION_HOURS', '24')),
            alerting_enabled=os.getenv('ALERTING_ENABLED', 'true').lower() == 'true',
            email_alerts=os.getenv('ALERT_EMAIL_ENABLED', 'false').lower() == 'true',
            slack_alerts=os.getenv('ALERT_SLACK_ENABLED', 'false').lower() == 'true',
            webhook_alerts=bool(os.getenv('ALERT_WEBHOOK_URL')),
            smtp_server=os.getenv('ALERT_SMTP_SERVER'),
            smtp_port=int(os.getenv('ALERT_SMTP_PORT', '587')),
            smtp_username=os.getenv('ALERT_SMTP_USERNAME'),
            smtp_password=os.getenv('ALERT_SMTP_PASSWORD'),
            alert_email_to=os.getenv('ALERT_EMAIL_TO'),
            slack_webhook_url=os.getenv('ALERT_SLACK_WEBHOOK_URL'),
            webhook_url=os.getenv('ALERT_WEBHOOK_URL')
        )
    
    def _load_data_retention_config(self) -> DataRetentionConfig:
        """Load data retention configuration from environment."""
        return DataRetentionConfig(
            enabled=os.getenv('DATA_RETENTION_ENABLED', 'true').lower() == 'true',
            check_interval_hours=int(os.getenv('DATA_RETENTION_CHECK_INTERVAL_HOURS', '24')),
            failed_logins_retention_days=int(os.getenv('FAILED_LOGINS_RETENTION_DAYS', '90')),
            audit_logs_retention_days=int(os.getenv('AUDIT_LOGS_RETENTION_DAYS', '365')),
            session_data_retention_days=int(os.getenv('SESSION_DATA_RETENTION_DAYS', '30')),
            metrics_retention_days=int(os.getenv('METRICS_RETENTION_DAYS', '90')),
            temp_data_retention_hours=int(os.getenv('TEMP_DATA_RETENTION_HOURS', '24')),
            pii_masking_enabled=os.getenv('PII_MASKING_ENABLED', 'true').lower() == 'true',
            pii_masking_salt=os.getenv('PII_MASKING_SALT', 'default-salt-change-in-production')
        )
    
    def _load_canary_config(self) -> CanaryConfig:
        """Load canary deployment configuration from environment."""
        return CanaryConfig(
            enabled=os.getenv('CANARY_DEPLOYMENT_ENABLED', 'false').lower() == 'true',
            check_interval_minutes=int(os.getenv('CANARY_CHECK_INTERVAL_MINUTES', '5')),
            default_percentage=float(os.getenv('CANARY_DEFAULT_PERCENTAGE', '0.05')),
            default_duration_hours=int(os.getenv('CANARY_DEFAULT_DURATION_HOURS', '72'))
        )
    
    def _create_config_from_dict(self, config_data: Dict[str, Any]) -> SecurityConfig:
        """Create SecurityConfig from dictionary."""
        return SecurityConfig(
            environment=config_data.get('environment', self.environment),
            database=DatabaseConfig(**config_data.get('database', {})),
            redis=RedisConfig(**config_data.get('redis', {})),
            jwt=JWTConfig(**config_data.get('jwt', {})),
            csrf=CSRFConfig(**config_data.get('csrf', {})),
            cors=CORSConfig(**config_data.get('cors', {})),
            cookies=CookieConfig(**config_data.get('cookies', {})),
            rate_limiting=RateLimitConfig(**config_data.get('rate_limiting', {})),
            abuse_control=AbuseControlConfig(**config_data.get('abuse_control', {})),
            monitoring=MonitoringConfig(**config_data.get('monitoring', {})),
            data_retention=DataRetentionConfig(**config_data.get('data_retention', {})),
            canary=CanaryConfig(**config_data.get('canary', {}))
        )
    
    def _validate_config(self, config: SecurityConfig) -> None:
        """Validate configuration."""
        errors = []
        
        # Validate required fields
        if not config.jwt.secret_key:
            errors.append("JWT secret key is required")
        
        if not config.csrf.secret_key:
            errors.append("CSRF secret key is required")
        
        if not config.database.url:
            errors.append("Database URL is required")
        
        # Validate environment-specific requirements
        if config.environment == Environment.PRODUCTION:
            if not config.cookies.secure:
                errors.append("Secure cookies must be enabled in production")
            
            if not config.cors.allowed_origins:
                errors.append("CORS origins must be configured in production")
            
            if config.jwt.secret_key == 'default-secret':
                errors.append("Default JWT secret cannot be used in production")
            
            if config.csrf.secret_key == 'default-csrf-secret':
                errors.append("Default CSRF secret cannot be used in production")
        
        # Validate numeric ranges
        if config.jwt.access_token_expire_hours < 1 or config.jwt.access_token_expire_hours > 168:
            errors.append("JWT access token expiry must be between 1 and 168 hours")
        
        if config.jwt.refresh_token_expire_days < 1 or config.jwt.refresh_token_expire_days > 365:
            errors.append("JWT refresh token expiry must be between 1 and 365 days")
        
        if config.rate_limiting.burst_limit < 1:
            errors.append("Rate limit burst must be at least 1")
        
        if config.abuse_control.max_attempts < 1:
            errors.append("Abuse control max attempts must be at least 1")
        
        if errors:
            error_msg = "Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in errors)
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info("Configuration validation passed")
    
    def get_config(self) -> SecurityConfig:
        """Get the current configuration."""
        if self.config is None:
            raise RuntimeError("Configuration not loaded. Call load_config() first.")
        return self.config
    
    def save_config(self, file_path: str, format: str = 'json') -> None:
        """Save configuration to file."""
        if self.config is None:
            raise RuntimeError("Configuration not loaded. Call load_config() first.")
        
        file_path = Path(file_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        if format.lower() == 'json':
            with open(file_path, 'w') as f:
                json.dump(self.config.to_dict(), f, indent=2, default=str)
        elif format.lower() in ['yml', 'yaml']:
            with open(file_path, 'w') as f:
                yaml.dump(self.config.to_dict(), f, default_flow_style=False)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"Configuration saved to {file_path}")
    
    def get_environment_config(self) -> Dict[str, Any]:
        """Get environment-specific configuration summary."""
        if self.config is None:
            raise RuntimeError("Configuration not loaded. Call load_config() first.")
        
        return {
            'environment': self.config.environment.value,
            'database_url_configured': bool(self.config.database.url),
            'redis_configured': bool(self.config.redis.url),
            'jwt_configured': bool(self.config.jwt.secret_key),
            'csrf_configured': bool(self.config.csrf.secret_key),
            'cors_origins_count': len(self.config.cors.allowed_origins),
            'rate_limiting_enabled': self.config.rate_limiting.enabled,
            'abuse_control_enabled': self.config.abuse_control.enabled,
            'monitoring_enabled': self.config.monitoring.prometheus_enabled,
            'data_retention_enabled': self.config.data_retention.enabled,
            'canary_enabled': self.config.canary.enabled
        }


# Global configuration manager
config_manager = ConfigManager()


def get_config_manager() -> ConfigManager:
    """Get the global configuration manager."""
    return config_manager


def load_auth_security_config(config_file: Optional[str] = None) -> SecurityConfig:
    """Load authentication security configuration."""
    return config_manager.load_config(config_file)


def get_auth_security_config() -> SecurityConfig:
    """Get the current authentication security configuration."""
    return config_manager.get_config()


def validate_environment_config() -> Dict[str, Any]:
    """Validate environment configuration and return status."""
    try:
        config = config_manager.load_config()
        return {
            'valid': True,
            'environment': config.environment.value,
            'config': config_manager.get_environment_config()
        }
    except Exception as e:
        return {
            'valid': False,
            'error': str(e),
            'environment': config_manager.environment.value
        }
