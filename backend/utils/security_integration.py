#!/usr/bin/env python3
"""
Security Integration for JewGo Backend
======================================
This module provides integration between different security components,
including the advanced security manager, middleware, and API endpoints.
It also provides decorators and utilities for easy security integration.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

from functools import wraps
from typing import Dict, Any, Optional, Callable
from flask import request, jsonify, g

from utils.logging_config import get_logger
from security.advanced_security_manager import get_security_manager, SecurityLevel
from middleware.security_middleware import SecurityMiddleware

logger = get_logger(__name__)

class SecurityIntegration:
    """Integrates all security components for unified security management."""
    
    def __init__(self):
        self.security_manager = get_security_manager()
        self.middleware = None
        logger.info("SecurityIntegration initialized")
    
    def set_middleware(self, middleware: SecurityMiddleware):
        """Set the security middleware instance."""
        self.middleware = middleware
        logger.info("Security middleware linked to integration")
    
    def get_security_status(self) -> Dict[str, Any]:
        """Get comprehensive security status."""
        try:
            stats = self.security_manager.get_security_stats()
            recent_events = self.security_manager.get_recent_security_events(10)
            
            return {
                "status": "active",
                "security_manager": "operational",
                "middleware": "operational" if self.middleware else "not_initialized",
                "stats": stats,
                "recent_events": recent_events
            }
        except Exception as e:
            logger.error(f"Error getting security status: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def validate_request_security(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate request security and return results."""
        try:
            # Check IP blocking
            if self.security_manager.is_ip_blocked(request_data.get('ip', '')):
                return {
                    "allowed": False,
                    "reason": "ip_blocked",
                    "message": "IP address is blocked"
                }
            
            # Detect anomalies
            anomalies = self.security_manager.detect_anomalies(request_data)
            if anomalies:
                high_severity_anomalies = [
                    a for a in anomalies 
                    if a.get('severity') == SecurityLevel.HIGH or a.get('severity') == SecurityLevel.CRITICAL
                ]
                
                if high_severity_anomalies:
                    return {
                        "allowed": False,
                        "reason": "security_anomaly",
                        "message": "High severity security anomaly detected",
                        "anomalies": high_severity_anomalies
                    }
            
            return {
                "allowed": True,
                "anomalies": anomalies
            }
        except Exception as e:
            logger.error(f"Error validating request security: {e}")
            return {
                "allowed": False,
                "reason": "validation_error",
                "message": "Security validation failed"
            }

# Global instance
security_integration: Optional[SecurityIntegration] = None

def get_security_integration() -> SecurityIntegration:
    """Get the global SecurityIntegration instance."""
    global security_integration
    if security_integration is None:
        security_integration = SecurityIntegration()
    return security_integration

# Security Decorators

def require_security_validation(f: Callable) -> Callable:
    """Decorator to require security validation for endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get request data from Flask's g object (set by middleware)
            request_data = getattr(g, 'request_data', {})
            
            if not request_data:
                return jsonify({
                    'error': 'Security validation required',
                    'code': 'SECURITY_VALIDATION_MISSING'
                }), 500
            
            # Validate security
            security_integration = get_security_integration()
            validation_result = security_integration.validate_request_security(request_data)
            
            if not validation_result['allowed']:
                return jsonify({
                    'error': validation_result['message'],
                    'code': validation_result['reason'],
                    'details': validation_result.get('anomalies', [])
                }), 403
            
            # Store validation result in g for use by endpoint
            g.security_validation = validation_result
            
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Security validation error: {e}")
            return jsonify({
                'error': 'Security validation failed',
                'code': 'SECURITY_ERROR'
            }), 500
    
    return decorated_function

def rate_limit_by_security_rule(rule_name: str):
    """Decorator for rate limiting using security manager rules."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                request_data = getattr(g, 'request_data', {})
                security_manager = get_security_manager()
                
                # Determine identifier
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
            except Exception as e:
                logger.error(f"Rate limiting error: {e}")
                return jsonify({
                    'error': 'Rate limiting failed',
                    'code': 'RATE_LIMIT_ERROR'
                }), 500
        
        return decorated_function
    return decorator

def log_security_event(event_type: str, severity: SecurityLevel = SecurityLevel.MEDIUM):
    """Decorator to log security events for specific endpoints."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                request_data = getattr(g, 'request_data', {})
                security_manager = get_security_manager()
                
                # Log the event
                security_manager._log_security_event(
                    event_type=event_type,
                    severity=severity,
                    source_ip=request_data.get('ip', ''),
                    user_agent=request_data.get('user_agent', ''),
                    endpoint=request_data.get('endpoint', ''),
                    details={
                        'endpoint': request_data.get('endpoint', ''),
                        'method': request_data.get('method', ''),
                        'user_agent': request_data.get('user_agent', '')
                    }
                )
                
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Security event logging error: {e}")
                # Don't fail the request if logging fails
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def require_secure_headers(f: Callable) -> Callable:
    """Decorator to ensure secure headers are present."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for required security headers
            required_headers = ['User-Agent']
            missing_headers = []
            
            for header in required_headers:
                if not request.headers.get(header):
                    missing_headers.append(header)
            
            if missing_headers:
                return jsonify({
                    'error': 'Missing required headers',
                    'code': 'MISSING_HEADERS',
                    'missing': missing_headers
                }), 400
            
            # Check for suspicious headers
            suspicious_headers = ['X-Forwarded-Host', 'X-Original-URL']
            for header in suspicious_headers:
                if request.headers.get(header):
                    logger.warning(f"Suspicious header detected: {header}")
            
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Secure headers validation error: {e}")
            return jsonify({
                'error': 'Header validation failed',
                'code': 'HEADER_VALIDATION_ERROR'
            }), 500
    
    return decorated_function

def block_suspicious_requests(f: Callable) -> Callable:
    """Decorator to block requests with suspicious patterns."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            request_data = getattr(g, 'request_data', {})
            security_manager = get_security_manager()
            
            # Check for suspicious patterns in the request
            suspicious_patterns = [
                'admin', 'config', 'backup', 'test', 'debug',
                'phpmyadmin', 'wp-admin', 'administrator'
            ]
            
            request_string = str(request_data).lower()
            detected_patterns = [
                pattern for pattern in suspicious_patterns 
                if pattern in request_string
            ]
            
            if detected_patterns:
                # Log security event
                security_manager._log_security_event(
                    event_type="suspicious_pattern_detected",
                    severity=SecurityLevel.MEDIUM,
                    source_ip=request_data.get('ip', ''),
                    user_agent=request_data.get('user_agent', ''),
                    endpoint=request_data.get('endpoint', ''),
                    details={
                        'patterns': detected_patterns,
                        'request_data': request_data
                    }
                )
                
                # Block the request
                return jsonify({
                    'error': 'Suspicious request pattern detected',
                    'code': 'SUSPICIOUS_REQUEST',
                    'patterns': detected_patterns
                }), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Suspicious request detection error: {e}")
            return jsonify({
                'error': 'Request validation failed',
                'code': 'REQUEST_VALIDATION_ERROR'
            }), 500
    
    return decorated_function

# Utility Functions

def get_client_ip() -> str:
    """Get the real client IP address."""
    try:
        # Check for forwarded headers
        forwarded_ips = [
            request.headers.get('X-Forwarded-For'),
            request.headers.get('X-Real-IP'),
            request.headers.get('CF-Connecting-IP'),
            request.headers.get('X-Client-IP')
        ]
        
        for ip in forwarded_ips:
            if ip:
                real_ip = ip.split(',')[0].strip()
                if _is_valid_ip(real_ip):
                    return real_ip
        
        return request.remote_addr or '127.0.0.1'
    except Exception:
        return '127.0.0.1'

def _is_valid_ip(ip: str) -> bool:
    """Check if an IP address is valid."""
    try:
        import ipaddress
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def is_request_secure() -> bool:
    """Check if the request is secure (HTTPS)."""
    return request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'

def get_security_headers() -> Dict[str, str]:
    """Get recommended security headers."""
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
