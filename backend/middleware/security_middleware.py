#!/usr/bin/env python3
"""
Security Middleware for JewGo Backend
=====================================
This middleware provides comprehensive security features including:
- Request validation and sanitization
- Security headers injection
- CORS management
- Request fingerprinting
- Anomaly detection
- Rate limiting integration

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import os
import re
import json
from functools import wraps
from typing import Dict, Any
from flask import request, jsonify, g, current_app

from utils.logging_config import get_logger
from security.advanced_security_manager import get_security_manager, SecurityLevel

logger = get_logger(__name__)

class SecurityMiddleware:
    """Middleware for handling security-related request processing."""
    
    def __init__(self, app=None):
        self.app = app
        self.security_manager = get_security_manager()
        
        # Enhanced security headers configuration
        self.security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https:; "
                "font-src 'self' https:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            ),
            'Permissions-Policy': (
                'geolocation=(), microphone=(), camera=(), '
                'payment=(), usb=(), magnetometer=(), gyroscope=(), '
                'accelerometer=(), ambient-light-sensor=()'
            ),
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'X-Download-Options': 'noopen',
            'X-Permitted-Cross-Domain-Policies': 'none'
        }
        
        # CORS configuration
        self.cors_origins = [
            'https://jewgo.app',
            'https://www.jewgo.app',
            'https://api.jewgo.app'
        ]
        
        # Request size limits
        self.max_content_length = 16 * 1024 * 1024  # 16MB
        self.max_json_size = 1024 * 1024  # 1MB
        
        # Enhanced rate limiting configuration
        self.rate_limit_rules = {
            'api_general': {'requests': 100, 'window': 60},  # 100 requests per minute
            'api_auth': {'requests': 10, 'window': 60},       # 10 auth requests per minute
            'api_upload': {'requests': 5, 'window': 60},     # 5 upload requests per minute
            'api_search': {'requests': 200, 'window': 60},   # 200 search requests per minute
            'api_admin': {'requests': 50, 'window': 60},     # 50 admin requests per minute
        }
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.errorhandler(413)(self.handle_request_entity_too_large)
        app.errorhandler(400)(self.handle_bad_request)
        app.errorhandler(403)(self.handle_forbidden)
        
        logger.info("Security middleware initialized")
    
    def before_request(self):
        """Process requests before they reach the endpoint."""
        try:
            # Extract request information
            request_data = self._extract_request_data()
            
            # Check if IP is blocked
            if self.security_manager.is_ip_blocked(request_data['ip']):
                logger.warning(f"Blocked IP attempted access: {request_data['ip']}")
                return jsonify({
                    'error': 'Access denied',
                    'code': 'IP_BLOCKED'
                }), 403
            
            # Detect anomalies
            anomalies = self.security_manager.detect_anomalies(request_data)
            if anomalies:
                self._handle_anomalies(anomalies, request_data)
            
            # Validate request size
            if not self._validate_request_size():
                return jsonify({
                    'error': 'Request too large',
                    'code': 'REQUEST_TOO_LARGE'
                }), 413
            
            # Sanitize request data
            self._sanitize_request_data()
            
            # Store request data in Flask's g object
            g.request_data = request_data
            g.security_checked = True
            
        except Exception as e:
            logger.error(f"Error in security middleware: {e}", exc_info=True)
            return jsonify({
                'error': 'Security validation failed',
                'code': 'SECURITY_ERROR'
            }), 500
    
    def after_request(self, response):
        """Process responses after they are generated."""
        try:
            # Add security headers
            for header, value in self.security_headers.items():
                response.headers[header] = value
            
            # Add CORS headers only if Nginx is not handling them
            nginx_handles_cors = os.environ.get("NGINX_HANDLES_CORS", "true").lower() == "true"
            if not nginx_handles_cors:
                origin = request.headers.get('Origin')
                if origin and origin in self.cors_origins:
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
            
            # Remove server information
            response.headers.pop('Server', None)
            
            return response
            
        except Exception as e:
            logger.error(f"Error adding security headers: {e}")
            return response
    
    def _extract_request_data(self) -> Dict[str, Any]:
        """Extract relevant data from the request."""
        # Get real IP address (considering proxies)
        ip = self._get_real_ip()
        
        return {
            'ip': ip,
            'user_agent': request.headers.get('User-Agent', ''),
            'endpoint': request.endpoint or request.path,
            'method': request.method,
            'headers': dict(request.headers),
            'args': dict(request.args),
            'form': dict(request.form) if request.form else {},
            'json': request.get_json(silent=True) or {},
            'content_length': request.content_length or 0,
            'content_type': request.content_type or '',
            'referrer': request.headers.get('Referer', ''),
            'origin': request.headers.get('Origin', '')
        }
    
    def _get_real_ip(self) -> str:
        """Get the real IP address, considering proxy headers."""
        # Check for forwarded headers (common in reverse proxy setups)
        forwarded_ips = [
            request.headers.get('X-Forwarded-For'),
            request.headers.get('X-Real-IP'),
            request.headers.get('CF-Connecting-IP'),  # Cloudflare
            request.headers.get('X-Client-IP')
        ]
        
        for ip in forwarded_ips:
            if ip:
                # X-Forwarded-For can contain multiple IPs, take the first one
                real_ip = ip.split(',')[0].strip()
                if self._is_valid_ip(real_ip):
                    return real_ip
        
        # Fall back to remote_addr
        return request.remote_addr or '127.0.0.1'
    
    def _is_valid_ip(self, ip: str) -> bool:
        """Check if an IP address is valid."""
        try:
            import ipaddress
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    def _validate_request_size(self) -> bool:
        """Validate request size limits."""
        # Only validate content length for requests that have a body
        if request.content_length and request.content_length > self.max_content_length:
            return False
        
        # Check JSON size if present (only for requests with JSON body)
        if request.is_json and request.method in ['POST', 'PUT', 'PATCH']:
            try:
                json_data = request.get_json()
                if json_data and len(json.dumps(json_data)) > self.max_json_size:
                    return False
            except Exception:
                return False
        
        return True
    
    def _sanitize_request_data(self):
        """Sanitize request data to prevent injection attacks."""
        # Sanitize JSON data
        if request.is_json:
            json_data = request.get_json(silent=True)
            if json_data:
                sanitized_data = self._sanitize_dict(json_data)
                # Note: We can't modify request.json directly, but we can store sanitized version
                g.sanitized_json = sanitized_data
        
        # Sanitize form data
        if request.form:
            g.sanitized_form = self._sanitize_dict(dict(request.form))
        
        # Sanitize query parameters
        if request.args:
            g.sanitized_args = self._sanitize_dict(dict(request.args))
    
    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize dictionary data."""
        sanitized = {}
        
        for key, value in data.items():
            # Sanitize key
            sanitized_key = self._sanitize_string(str(key))
            
            # Sanitize value
            if isinstance(value, dict):
                sanitized[sanitized_key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[sanitized_key] = [
                    self._sanitize_dict(item) if isinstance(item, dict) 
                    else self._sanitize_string(str(item))
                    for item in value
                ]
            else:
                sanitized[sanitized_key] = self._sanitize_string(str(value))
        
        return sanitized
    
    def _sanitize_string(self, text: str) -> str:
        """Sanitize a string to remove potentially dangerous content."""
        if not text:
            return text
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Remove control characters (except newlines and tabs)
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Limit length
        if len(text) > 10000:  # 10KB limit per field
            text = text[:10000]
        
        return text
    
    def _handle_anomalies(self, anomalies: list, request_data: Dict[str, Any]):
        """Handle detected security anomalies."""
        for anomaly in anomalies:
            severity = anomaly.get('severity', SecurityLevel.MEDIUM)
            
            # Log the anomaly
            self.security_manager._log_security_event(
                event_type=f"anomaly_{anomaly['type']}",
                severity=severity,
                source_ip=request_data['ip'],
                user_agent=request_data['user_agent'],
                endpoint=request_data['endpoint'],
                details=anomaly
            )
            
            # Take action based on severity
            if severity == SecurityLevel.CRITICAL:
                # Block IP for critical anomalies
                self.security_manager.block_ip(
                    request_data['ip'],
                    duration=3600,
                    reason=f"Critical security anomaly: {anomaly['type']}"
                )
            elif severity == SecurityLevel.HIGH:
                # Block IP for shorter duration
                self.security_manager.block_ip(
                    request_data['ip'],
                    duration=900,
                    reason=f"High severity anomaly: {anomaly['type']}"
                )
    
    def handle_request_entity_too_large(self, error):
        """Handle 413 Request Entity Too Large errors."""
        return jsonify({
            'error': 'Request too large',
            'code': 'REQUEST_TOO_LARGE',
            'max_size': self.max_content_length
        }), 413
    
    def handle_bad_request(self, error):
        """Handle 400 Bad Request errors."""
        return jsonify({
            'error': 'Bad request',
            'code': 'BAD_REQUEST',
            'message': str(error)
        }), 400
    
    def handle_forbidden(self, error):
        """Handle 403 Forbidden errors."""
        return jsonify({
            'error': 'Access forbidden',
            'code': 'FORBIDDEN',
            'message': str(error)
        }), 403

def require_security_check(f):
    """Decorator to ensure security checks are performed."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not getattr(g, 'security_checked', False):
            return jsonify({
                'error': 'Security check required',
                'code': 'SECURITY_CHECK_MISSING'
            }), 500
        return f(*args, **kwargs)
    return decorated_function

def rate_limit_by_rule(rule_name: str):
    """Decorator for rate limiting by rule."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            security_manager = get_security_manager()
            request_data = getattr(g, 'request_data', {})
            
            # Determine identifier (IP, user, session, etc.)
            identifier = request_data.get('ip', 'unknown')
            
            # Check rate limit
            allowed, result = security_manager.check_rate_limit(
                identifier, rule_name, request_data
            )
            
            if not allowed:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'code': 'RATE_LIMITED',
                    'details': result
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_https(f):
    """Decorator to require HTTPS."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_secure and current_app.config.get('ENV') == 'production':
            return jsonify({
                'error': 'HTTPS required',
                'code': 'HTTPS_REQUIRED'
            }), 400
        return f(*args, **kwargs)
    return decorated_function

def validate_json_schema(schema: Dict[str, Any]):
    """Decorator to validate JSON request data against a schema."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    'error': 'JSON required',
                    'code': 'JSON_REQUIRED'
                }), 400
            
            json_data = request.get_json()
            if not _validate_json_schema(json_data, schema):
                return jsonify({
                    'error': 'Invalid JSON schema',
                    'code': 'INVALID_SCHEMA'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def _validate_json_schema(data: Any, schema: Dict[str, Any]) -> bool:
    """Validate JSON data against a simple schema."""
    # This is a simplified schema validator
    # In production, you might want to use a library like jsonschema
    
    if 'type' in schema:
        expected_type = schema['type']
        if expected_type == 'object' and not isinstance(data, dict):
            return False
        elif expected_type == 'array' and not isinstance(data, list):
            return False
        elif expected_type == 'string' and not isinstance(data, str):
            return False
        elif expected_type == 'number' and not isinstance(data, (int, float)):
            return False
        elif expected_type == 'boolean' and not isinstance(data, bool):
            return False
    
    if 'required' in schema and isinstance(data, dict):
        for field in schema['required']:
            if field not in data:
                return False
    
    if 'properties' in schema and isinstance(data, dict):
        for field, field_schema in schema['properties'].items():
            if field in data:
                if not _validate_json_schema(data[field], field_schema):
                    return False
    
    return True
