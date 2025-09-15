"""
Configuration validator to ensure required environment variables are set.
Provides clear error messages for missing or invalid configuration.
"""

import os
import sys
from typing import Dict, Any
from utils.logging_config import get_logger

logger = get_logger(__name__)

class ConfigValidator:
    """Validate application configuration and environment variables."""
    
    # Required configuration for all environments
    REQUIRED_CONFIG = {
        'DATABASE_URL': {
            'description': 'PostgreSQL database connection string',
            'example': 'postgresql://user:pass@localhost:5432/jewgo'
        },
        'SECRET_KEY': {
            'description': 'Flask secret key for session security',
            'example': 'your-secret-key-here'
        }
    }
    
    # Required configuration for production only
    PRODUCTION_REQUIRED = {
        'REDIS_URL': {
            'description': 'Redis connection string for caching',
            'example': 'redis://localhost:6379/0'
        },
        'FRONTEND_URL': {
            'description': 'Frontend application URL for CORS',
            'example': 'https://jewgo.app'
        },
        'JWT_SECRET_KEY': {
            'description': 'JWT signing secret key',
            'example': 'jwt-secret-key-here'
        }
    }
    
    # Optional configuration with defaults
    OPTIONAL_CONFIG = {
        'FLASK_ENV': {
            'description': 'Flask environment',
            'default': 'development',
            'valid_values': ['development', 'production', 'testing']
        },
        'LOG_LEVEL': {
            'description': 'Logging level',
            'default': 'INFO',
            'valid_values': ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        },
        'DB_POOL_SIZE': {
            'description': 'Database connection pool size',
            'default': '5',
            'validator': lambda x: x.isdigit() and int(x) > 0
        },
        'REDIS_DB': {
            'description': 'Redis database number',
            'default': '0',
            'validator': lambda x: x.isdigit() and 0 <= int(x) <= 15
        }
    }
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.is_production = os.environ.get('FLASK_ENV') == 'production'
    
    def validate_required_config(self) -> bool:
        """
        Validate all required configuration is present.
        
        Returns:
            True if all required config is valid, False otherwise
        """
        all_valid = True
        
        # Check basic required config
        for key, config in self.REQUIRED_CONFIG.items():
            value = os.environ.get(key)
            if not value:
                self.errors.append({
                    'key': key,
                    'error': 'Missing required configuration',
                    'description': config['description'],
                    'example': config['example']
                })
                all_valid = False
            elif key == 'SECRET_KEY' and value == 'dev-secret-key-not-for-production' and self.is_production:
                self.errors.append({
                    'key': key,
                    'error': 'Using development secret key in production',
                    'description': 'Must set a secure SECRET_KEY in production',
                    'example': config['example']
                })
                all_valid = False
        
        # Check production-specific required config
        if self.is_production:
            for key, config in self.PRODUCTION_REQUIRED.items():
                value = os.environ.get(key)
                if not value:
                    self.errors.append({
                        'key': key,
                        'error': 'Missing required production configuration',
                        'description': config['description'],
                        'example': config['example']
                    })
                    all_valid = False
        
        return all_valid
    
    def validate_optional_config(self):
        """Validate optional configuration and set defaults."""
        for key, config in self.OPTIONAL_CONFIG.items():
            value = os.environ.get(key)
            
            if not value:
                # Set default if not provided
                default_value = config.get('default')
                if default_value:
                    os.environ[key] = default_value
                    logger.info(f"Using default value for {key}: {default_value}")
            else:
                # Validate value if validator provided
                validator = config.get('validator')
                if validator and not validator(value):
                    self.warnings.append({
                        'key': key,
                        'warning': f'Invalid value: {value}',
                        'description': config['description']
                    })
                
                # Check valid values if provided
                valid_values = config.get('valid_values')
                if valid_values and value not in valid_values:
                    self.warnings.append({
                        'key': key,
                        'warning': f'Invalid value: {value}. Valid values: {", ".join(valid_values)}',
                        'description': config['description']
                    })
    
    def validate_database_url(self) -> bool:
        """
        Validate DATABASE_URL format and accessibility.
        
        Returns:
            True if database URL is valid, False otherwise
        """
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return False
        
        # Check URL format
        if not database_url.startswith(('postgresql://', 'postgres://')):
            self.errors.append({
                'key': 'DATABASE_URL',
                'error': 'Invalid database URL format',
                'description': 'Must be a PostgreSQL connection string',
                'example': 'postgresql://user:pass@localhost:5432/jewgo'
            })
            return False
        
        # Fix postgres:// to postgresql:// if needed
        if database_url.startswith('postgres://'):
            corrected_url = database_url.replace('postgres://', 'postgresql://')
            os.environ['DATABASE_URL'] = corrected_url
            logger.info("Corrected DATABASE_URL format from postgres:// to postgresql://")
        
        return True
    
    def validate_redis_config(self) -> bool:
        """
        Validate Redis configuration.
        
        Returns:
            True if Redis config is valid, False otherwise
        """
        redis_url = os.environ.get('REDIS_URL')
        
        # Redis is optional in development
        if not redis_url and not self.is_production:
            logger.info("Redis not configured - using memory fallback in development")
            return True
        
        # Redis is required in production
        if not redis_url and self.is_production:
            self.errors.append({
                'key': 'REDIS_URL',
                'error': 'Redis is required in production',
                'description': 'Redis connection string for caching and sessions',
                'example': 'redis://localhost:6379/0'
            })
            return False
        
        # Validate Redis URL format
        if redis_url and not redis_url.startswith(('redis://', 'rediss://', 'memory://')):
            self.errors.append({
                'key': 'REDIS_URL',
                'error': 'Invalid Redis URL format',
                'description': 'Must be a valid Redis connection string',
                'example': 'redis://localhost:6379/0'
            })
            return False
        
        return True
    
    def validate_security_config(self) -> bool:
        """
        Validate security-related configuration.
        
        Returns:
            True if security config is valid, False otherwise
        """
        all_valid = True
        
        # Check JWT configuration
        jwt_secret = os.environ.get('JWT_SECRET_KEY')
        if self.is_production and not jwt_secret:
            self.errors.append({
                'key': 'JWT_SECRET_KEY',
                'error': 'JWT secret key required in production',
                'description': 'Secret key for signing JWT tokens',
                'example': 'your-jwt-secret-here'
            })
            all_valid = False
        
        # Check CORS configuration
        frontend_url = os.environ.get('FRONTEND_URL')
        if self.is_production and not frontend_url:
            self.warnings.append({
                'key': 'FRONTEND_URL',
                'warning': 'Frontend URL not configured - CORS may not work properly',
                'description': 'Frontend application URL for CORS configuration'
            })
        
        return all_valid
    
    def validate_all(self) -> bool:
        """
        Validate all configuration.
        
        Returns:
            True if all configuration is valid, False otherwise
        """
        logger.info("Validating application configuration...")
        
        all_valid = True
        
        # Run all validation checks
        if not self.validate_required_config():
            all_valid = False
        
        self.validate_optional_config()
        
        if not self.validate_database_url():
            all_valid = False
        
        if not self.validate_redis_config():
            all_valid = False
        
        if not self.validate_security_config():
            all_valid = False
        
        # Log results
        if self.errors:
            logger.error(f"Configuration validation failed with {len(self.errors)} errors")
        
        if self.warnings:
            logger.warning(f"Configuration validation completed with {len(self.warnings)} warnings")
        
        if all_valid and not self.warnings:
            logger.info("Configuration validation passed")
        
        return all_valid
    
    def print_validation_report(self):
        """Print a formatted validation report to console."""
        print("\n" + "="*60)
        print("CONFIGURATION VALIDATION REPORT")
        print("="*60)
        print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
        
        if self.errors:
            print("\n❌ CONFIGURATION ERRORS:")
            for error in self.errors:
                print(f"  • {error['key']}: {error['error']}")
                print(f"    {error['description']}")
                if 'example' in error:
                    print(f"    Example: {error['example']}")
                print()
        
        if self.warnings:
            print("\n⚠️  CONFIGURATION WARNINGS:")
            for warning in self.warnings:
                print(f"  • {warning['key']}: {warning['warning']}")
                print(f"    {warning['description']}")
                print()
        
        if not self.errors and not self.warnings:
            print("\n✅ All configuration is valid!")
        
        print("="*60)
    
    def get_config_summary(self) -> Dict[str, Any]:
        """
        Get a summary of current configuration.
        
        Returns:
            Dictionary with configuration summary
        """
        return {
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'is_production': self.is_production,
            'database_configured': bool(os.environ.get('DATABASE_URL')),
            'redis_configured': bool(os.environ.get('REDIS_URL')),
            'secret_key_configured': bool(os.environ.get('SECRET_KEY')),
            'jwt_configured': bool(os.environ.get('JWT_SECRET_KEY')),
            'errors_count': len(self.errors),
            'warnings_count': len(self.warnings),
            'is_valid': len(self.errors) == 0
        }

def validate_config_on_startup():
    """
    Validate configuration during application startup.
    Exit if critical configuration is missing.
    """
    validator = ConfigValidator()
    
    if not validator.validate_all():
        validator.print_validation_report()
        print("\nCRITICAL: Cannot start application due to configuration errors")
        sys.exit(1)
    
    # Print warnings if any
    if validator.warnings:
        validator.print_validation_report()
    
    return validator.get_config_summary()

if __name__ == "__main__":
    # Allow running as standalone script
    validator = ConfigValidator()
    validator.validate_all()
    validator.print_validation_report()