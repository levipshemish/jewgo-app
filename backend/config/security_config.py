"""
Security Configuration Module
============================

This module provides centralized security configuration for the JewGo application,
including JWT secrets, security headers, and environment-specific settings.
"""

import os
import secrets
from typing import Dict, List, Optional
from utils.logging_config import get_logger

logger = get_logger(__name__)


class SecurityConfig:
    """Centralized security configuration management."""
    
    def __init__(self):
        self.environment = os.getenv("FLASK_ENV", "development")
        self.is_production = self.environment == "production"
        self.is_development = self.environment == "development"
        
        # Initialize security settings
        self._init_jwt_config()
        self._init_security_headers()
        self._init_cors_config()
        self._init_rate_limiting()
        self._validate_production_config()
    
    def _init_jwt_config(self):
        """Initialize JWT configuration with standardized secret management."""
        # Standardize on JWT_SECRET_KEY as the primary secret
        self.jwt_secret_key = os.getenv("JWT_SECRET_KEY")
        
        # Fallback to SECRET_KEY if JWT_SECRET_KEY is not set
        if not self.jwt_secret_key:
            self.jwt_secret_key = os.getenv("SECRET_KEY")
            
        # In development, generate a random secret if none provided
        if not self.jwt_secret_key and self.is_development:
            self.jwt_secret_key = secrets.token_urlsafe(32)
            logger.warning("Generated random JWT secret for development. Set JWT_SECRET_KEY for consistency.")
        
        # Validate JWT secret in production
        if self.is_production and not self.jwt_secret_key:
            raise ValueError("JWT_SECRET_KEY must be set in production environment")
        
        # JWT configuration
        self.jwt_config = {
            "secret_key": self.jwt_secret_key,
            "algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "access_token_expires": int(os.getenv("JWT_ACCESS_TOKEN_TTL", "900")),  # 15 minutes
            "refresh_token_expires": int(os.getenv("JWT_REFRESH_TOKEN_TTL", "2592000")),  # 30 days
            "issuer": os.getenv("JWT_ISSUER", "jewgo.app"),
            "audience": os.getenv("JWT_AUDIENCE", "jewgo.app"),
            "leeway": int(os.getenv("JWT_LEEWAY", "60")),  # Clock skew tolerance
        }
        
        logger.info(f"JWT configuration initialized for {self.environment} environment")
    
    def _init_security_headers(self):
        """Initialize security headers configuration."""
        self.security_headers = {
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # XSS Protection (legacy but still useful)
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "speaker=()"
            ),
            
            # Content Security Policy
            "Content-Security-Policy": self._get_csp_policy(),
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": self._get_hsts_policy(),
        }
        
        # Add additional headers for production
        if self.is_production:
            self.security_headers.update({
                # Cross-Origin Embedder Policy
                "Cross-Origin-Embedder-Policy": "require-corp",
                
                # Cross-Origin Opener Policy
                "Cross-Origin-Opener-Policy": "same-origin",
                
                # Cross-Origin Resource Policy
                "Cross-Origin-Resource-Policy": "same-origin",
            })
    
    def _get_csp_policy(self) -> str:
        """Generate Content Security Policy based on environment."""
        if self.is_development:
            # More permissive CSP for development
            return (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https: http:; "
                "connect-src 'self' https: http: ws: wss:; "
                "frame-src 'self' https://maps.google.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            # Strict CSP for production
            frontend_url = os.getenv("FRONTEND_URL", "https://jewgo.app")
            return (
                f"default-src 'self'; "
                f"script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; "
                f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                f"font-src 'self' https://fonts.gstatic.com; "
                f"img-src 'self' data: https:; "
                f"connect-src 'self' https://api.jewgo.app {frontend_url}; "
                f"frame-src 'self' https://maps.google.com; "
                f"object-src 'none'; "
                f"base-uri 'self'; "
                f"form-action 'self'"
            )
    
    def _get_hsts_policy(self) -> str:
        """Generate HSTS policy based on environment."""
        if self.is_production:
            return "max-age=31536000; includeSubDomains; preload"
        else:
            return "max-age=0"  # Disable HSTS in development
    
    def _init_cors_config(self):
        """Initialize CORS configuration."""
        cors_origins_env = os.getenv("CORS_ORIGINS", "")
        
        if cors_origins_env:
            self.cors_origins = [
                origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
            ]
        else:
            # Default origins based on environment
            if self.is_development:
                self.cors_origins = [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5000",
                    "http://127.0.0.1:5000",
                ]
            else:
                # Production defaults - should be explicitly configured
                self.cors_origins = [
                    "https://jewgo.app",
                    "https://www.jewgo.app",
                ]
        
        self.cors_config = {
            "origins": self.cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "Accept",
                "Origin",
                "X-Requested-With",
                "X-CSRF-Token",
                "X-User-ID",
                "X-User-Roles",
            ],
            "expose_headers": [
                "X-CSRF-Token",
                "X-User-ID",
                "X-User-Roles",
                "X-Response-Time",
            ],
            "supports_credentials": True,
            "max_age": 3600,  # 1 hour
        }
    
    def _init_rate_limiting(self):
        """Initialize rate limiting configuration."""
        self.rate_limiting = {
            "enabled": os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true",
            "storage_url": os.getenv("REDIS_URL", "memory://"),
            "default": os.getenv("RATE_LIMIT_DEFAULT", "1000 per minute"),
            "strict": os.getenv("RATE_LIMIT_STRICT", "100 per minute"),
            "auth_endpoints": os.getenv("RATE_LIMIT_AUTH", "10 per minute"),
            "api_endpoints": os.getenv("RATE_LIMIT_API", "100 per minute"),
        }
    
    def _validate_production_config(self):
        """Validate production configuration requirements."""
        if not self.is_production:
            return
        
        required_vars = [
            "JWT_SECRET_KEY",
            "DATABASE_URL",
            "FRONTEND_URL",
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(
                f"Missing required environment variables for production: {', '.join(missing_vars)}"
            )
        
        # Validate JWT secret strength
        if len(self.jwt_secret_key) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        
        logger.info("Production security configuration validated successfully")
    
    def get_jwt_config(self) -> Dict[str, any]:
        """Get JWT configuration."""
        return self.jwt_config.copy()
    
    def get_security_headers(self) -> Dict[str, str]:
        """Get security headers configuration."""
        return self.security_headers.copy()
    
    def get_cors_config(self) -> Dict[str, any]:
        """Get CORS configuration."""
        return self.cors_config.copy()
    
    def get_rate_limiting_config(self) -> Dict[str, any]:
        """Get rate limiting configuration."""
        return self.rate_limiting.copy()
    
    def is_debug_enabled(self) -> bool:
        """Check if debug mode is enabled."""
        return self.is_development and os.getenv("DEBUG", "false").lower() == "true"


# Global security configuration instance
security_config = SecurityConfig()


def get_security_config() -> SecurityConfig:
    """Get the global security configuration instance."""
    return security_config