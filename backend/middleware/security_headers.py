#!/usr/bin/env python3
"""
Comprehensive Security Headers Middleware for JewGo App.

Provides:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- Permissions Policy
- Additional security headers
"""

import os
from typing import Dict, Any, Optional
from flask import request, current_app

from utils.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware:
    """Middleware for adding comprehensive security headers."""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        self.app = app
        
        # Register before_request hook
        app.before_request(self._add_security_headers)
        
        # Register after_request hook to add headers
        @app.after_request
        def add_security_headers(response):
            # Add stored security headers
            if hasattr(app, '_security_headers'):
                for name, value in app._security_headers.items():
                    response.headers[name] = value
            return response
        
        logger.info("Security headers middleware initialized")
    
    def _add_security_headers(self):
        """Add security headers to all responses."""
        try:
            # Get security configuration
            security_config = self._get_security_config()
            
            # Add headers
            self._add_csp_header(security_config)
            self._add_hsts_header(security_config)
            self._add_frame_options_header(security_config)
            self._add_content_type_options_header()
            self._add_referrer_policy_header(security_config)
            self._add_permissions_policy_header(security_config)
            self._add_additional_security_headers(security_config)
            
        except Exception as e:
            logger.error(f"Failed to add security headers: {e}")
    
    def _get_security_config(self) -> Dict[str, Any]:
        """Get security configuration from environment."""
        return {
            'csp_enabled': os.getenv('CSP_ENABLED', 'true').lower() == 'true',
            'hsts_enabled': os.getenv('HSTS_ENABLED', 'true').lower() == 'true',
            'hsts_max_age': int(os.getenv('HSTS_MAX_AGE', '31536000')),  # 1 year
            'hsts_include_subdomains': os.getenv('HSTS_INCLUDE_SUBDOMAINS', 'true').lower() == 'true',
            'frame_options': os.getenv('X_FRAME_OPTIONS', 'DENY'),
            'referrer_policy': os.getenv('REFERRER_POLICY', 'strict-origin-when-cross-origin'),
            'permissions_policy_enabled': os.getenv('PERMISSIONS_POLICY_ENABLED', 'true').lower() == 'true'
        }
    
    def _add_csp_header(self, config: Dict[str, Any]):
        """Add Content Security Policy header."""
        if not config['csp_enabled']:
            return
        
        # Build CSP directives
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https: wss:",
            "media-src 'self' https:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ]
        
        # Add nonce for inline scripts if available
        nonce = getattr(request, 'csp_nonce', None)
        if nonce:
            csp_directives[1] += f" 'nonce-{nonce}'"
        
        csp_value = '; '.join(csp_directives)
        
        # Add CSP header
        self._add_response_header('Content-Security-Policy', csp_value)
        
        # Add report-only CSP in development
        if current_app and current_app.debug:
            self._add_response_header('Content-Security-Policy-Report-Only', csp_value)
    
    def _add_hsts_header(self, config: Dict[str, Any]):
        """Add HTTP Strict Transport Security header."""
        if not config['hsts_enabled'] or not request.is_secure:
            return
        
        hsts_value = f"max-age={config['hsts_max_age']}"
        
        if config['hsts_include_subdomains']:
            hsts_value += "; includeSubDomains"
        
        hsts_value += "; preload"
        
        self._add_response_header('Strict-Transport-Security', hsts_value)
    
    def _add_frame_options_header(self, config: Dict[str, Any]):
        """Add X-Frame-Options header."""
        self._add_response_header('X-Frame-Options', config['frame_options'])
    
    def _add_content_type_options_header(self):
        """Add X-Content-Type-Options header."""
        self._add_response_header('X-Content-Type-Options', 'nosniff')
    
    def _add_referrer_policy_header(self, config: Dict[str, Any]):
        """Add Referrer-Policy header."""
        self._add_response_header('Referrer-Policy', config['referrer_policy'])
    
    def _add_permissions_policy_header(self, config: Dict[str, Any]):
        """Add Permissions-Policy header."""
        if not config['permissions_policy_enabled']:
            return
        
        # Restrictive permissions policy
        permissions = [
            "camera=()",
            "microphone=()",
            "geolocation=()",
            "payment=()",
            "usb=()",
            "magnetometer=()",
            "accelerometer=()",
            "gyroscope=()",
            "fullscreen=(self)",
            "picture-in-picture=()"
        ]
        
        permissions_value = ', '.join(permissions)
        self._add_response_header('Permissions-Policy', permissions_value)
    
    def _add_additional_security_headers(self, config: Dict[str, Any]):
        """Add additional security headers."""
        # X-XSS-Protection (legacy but still useful)
        self._add_response_header('X-XSS-Protection', '1; mode=block')
        
        # Cross-Origin policies
        self._add_response_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self._add_response_header('Cross-Origin-Opener-Policy', 'same-origin')
        self._add_response_header('Cross-Origin-Resource-Policy', 'same-origin')
        
        # Cache control for sensitive endpoints
        if request.endpoint and 'auth' in request.endpoint:
            self._add_response_header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            self._add_response_header('Pragma', 'no-cache')
            self._add_response_header('Expires', '0')
        
        # Server information hiding
        self._add_response_header('Server', 'JewGo-API')
        
        # Remove powered-by header if present
        if hasattr(current_app, 'response_class'):
            # This will be handled by Flask's response class
            pass
    
    def _add_response_header(self, name: str, value: str):
        """Add header to response."""
        try:
            # Store headers to be added later
            if not hasattr(current_app, '_security_headers'):
                current_app._security_headers = {}
            current_app._security_headers[name] = value
        except Exception as e:
            logger.warning(f"Failed to add header {name}: {e}")


def register_security_headers(app):
    """Register security headers middleware with Flask app."""
    security_middleware = SecurityHeadersMiddleware(app)
    return security_middleware


# Security header validation
def validate_security_headers(response_headers: Dict[str, str]) -> Dict[str, Any]:
    """Validate that security headers are present and correct."""
    required_headers = {
        'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer'],
        'X-XSS-Protection': ['1; mode=block']
    }
    
    validation_results = {
        'valid': True,
        'missing_headers': [],
        'incorrect_values': {},
        'recommendations': []
    }
    
    for header, valid_values in required_headers.items():
        if header not in response_headers:
            validation_results['missing_headers'].append(header)
            validation_results['valid'] = False
        elif response_headers[header] not in valid_values:
            validation_results['incorrect_values'][header] = {
                'current': response_headers[header],
                'expected': valid_values
            }
            validation_results['valid'] = False
    
    # Check for HTTPS
    if 'Strict-Transport-Security' not in response_headers:
        validation_results['recommendations'].append(
            "Consider adding HSTS header for HTTPS sites"
        )
    
    # Check for CSP
    if 'Content-Security-Policy' not in response_headers:
        validation_results['recommendations'].append(
            "Consider adding Content Security Policy header"
        )
    
    return validation_results