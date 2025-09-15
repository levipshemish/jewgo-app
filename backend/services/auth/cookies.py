import os
from typing import Dict, Any, Tuple, Optional
from enum import Enum


class Environment(Enum):
    """Environment types for cookie policy configuration."""
    PRODUCTION = "production"
    PREVIEW = "preview"
    STAGING = "staging"
    DEVELOPMENT = "development"


class CookiePolicyManager:
    """
    Manages environment-aware cookie policies for authentication.
    
    Provides environment-specific cookie configurations:
    - Production: Secure, HttpOnly, SameSite=None, Domain=.jewgo.app
    - Preview: host-only cookies, SameSite=None, Secure (HTTPS only) for Vercel compatibility
    - Development: relaxed security for local development
    """
    
    def __init__(self, environment: Optional[str] = None):
        """
        Initialize Cookie Policy Manager.
        
        Args:
            environment: Environment name (production, preview, staging, development)
                        If None, will be detected from FLASK_ENV or ENVIRONMENT
        """
        if environment is None:
            # Use environment variables directly to avoid config import issues during testing
            self.environment = os.getenv("FLASK_ENV", os.getenv("ENVIRONMENT", "development"))
        else:
            self.environment = environment
    
    def get_cookie_config(self, cookie_type: str = "auth") -> Dict[str, Any]:
        """
        Get environment-specific cookie configuration.
        
        Args:
            cookie_type: Type of cookie (auth, csrf, session)
            
        Returns:
            Dictionary with cookie configuration parameters
        """
        base_config = {
            'httponly': True,
            'path': '/',
        }
        
        if self.environment == Environment.PRODUCTION.value:
            # Get domain from environment variable, default to .jewgo.app for production
            domain = os.getenv('COOKIE_DOMAIN')
            if domain is None:
                domain = '.jewgo.app'
            return {
                **base_config,
                'secure': True,
                'samesite': 'None',
                'domain': domain,
            }
        elif self.environment in [Environment.PREVIEW.value, Environment.STAGING.value]:
            # Preview/staging environments (Vercel compatibility)
            return {
                **base_config,
                'secure': True,  # HTTPS only for Vercel
                'samesite': 'None',
                'domain': None,  # host-only cookies for *.vercel.app
            }
        else:  # development
            return {
                **base_config,
                'secure': False,  # Allow HTTP for local development
                'samesite': 'Lax',
                'domain': None,  # host-only for localhost
            }
    
    def get_cors_origins(self) -> list[str]:
        """
        Get CORS origins based on environment.
        
        Returns:
            List of allowed CORS origins
        """
        # Get from environment variable first
        cors_origins_env = os.getenv("FRONTEND_ORIGINS", os.getenv("CORS_ORIGINS", ""))
        if cors_origins_env:
            return [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
        
        # Fallback to environment-specific defaults
        if self.environment == Environment.PRODUCTION.value:
            return ["https://jewgo.app"]
        elif self.environment in [Environment.PREVIEW.value, Environment.STAGING.value]:
            # Support multiple Vercel preview domains
            return ["https://*.vercel.app"]
        else:  # development
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    def is_secure_context(self) -> bool:
        """
        Check if current environment requires secure context (HTTPS).
        
        Returns:
            True if secure context is required
        """
        return self.environment in [
            Environment.PRODUCTION.value,
            Environment.PREVIEW.value,
            Environment.STAGING.value
        ]
    
    def get_csrf_cookie_config(self) -> Dict[str, Any]:
        """
        Get CSRF-specific cookie configuration.
        
        Returns:
            Dictionary with CSRF cookie configuration
        """
        config = self.get_cookie_config("csrf")
        # CSRF cookies don't need HttpOnly (need to be readable by JS)
        config['httponly'] = False
        return config
    
    def validate_configuration(self) -> Dict[str, Any]:
        """
        Validate cookie policy configuration.
        
        Returns:
            Dictionary with validation results
        """
        config = self.get_cookie_config()
        cors_origins = self.get_cors_origins()
        
        validation_result = {
            'environment': self.environment,
            'secure_context': self.is_secure_context(),
            'cookie_domain': config.get('domain'),
            'samesite_policy': config.get('samesite'),
            'cors_origins_count': len(cors_origins),
            'cors_origins': cors_origins,
            'valid': True,
            'warnings': [],
            'errors': []
        }
        
        # Validation checks
        if self.environment == Environment.PRODUCTION.value:
            if not config.get('secure'):
                validation_result['errors'].append("Production environment must use secure cookies")
                validation_result['valid'] = False
            
            if config.get('samesite') != 'None':
                validation_result['warnings'].append("Production should use SameSite=None for cross-site requests")
            
            if not config.get('domain'):
                validation_result['warnings'].append("Production should specify cookie domain")
        
        if self.environment in [Environment.PREVIEW.value, Environment.STAGING.value]:
            if not config.get('secure'):
                validation_result['errors'].append("Preview/staging environments must use secure cookies for HTTPS")
                validation_result['valid'] = False
            
            if config.get('domain'):
                validation_result['warnings'].append("Preview environments should use host-only cookies")
        
        if not cors_origins:
            validation_result['warnings'].append("No CORS origins configured")
        
        return validation_result


def _cookie_security() -> Tuple[bool, str, str | None]:
    """Return (secure, samesite, domain) for cookies based on environment."""
    # Use CookiePolicyManager for consistent configuration
    policy_manager = CookiePolicyManager()
    config = policy_manager.get_cookie_config()
    
    return (
        config.get('secure', False),
        config.get('samesite', 'Lax'),
        config.get('domain')
    )


def set_auth(response, access_token: str, refresh_token: str, access_expires_in: int) -> None:
    """Set HttpOnly auth cookies on a Flask response object."""
    secure, samesite, domain = _cookie_security()
    refresh_ttl = int(os.getenv("REFRESH_TTL_SECONDS", str(30 * 24 * 3600)))  # 30 days default

    # Ensure access token expiry is reasonable (max 15 minutes for security)
    max_access_ttl = 15 * 60  # 15 minutes
    actual_access_ttl = min(int(access_expires_in), max_access_ttl)

    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=actual_access_ttl,
        domain=domain,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=refresh_ttl,
        domain=domain,
    )


def clear_auth(response) -> None:
    """Clear all known auth cookies (new and legacy)."""
    secure, samesite, domain = _cookie_security()
    for name in [
        "access_token",
        "refresh_token",
        "auth_access_token",
        "auth_refresh_token",
    ]:
        response.set_cookie(
            name,
            "",
            max_age=0,
            httponly=True,
            secure=secure,
            samesite=samesite,
            domain=domain,
        )
