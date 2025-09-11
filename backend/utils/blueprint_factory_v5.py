"""
Standardized blueprint factory for v5 API consolidation.

Creates blueprints with uniform middleware, error handling, and configuration.
Provides consistent blueprint setup with automatic middleware registration,
standardized error handlers, CORS configuration, and feature flag integration.
"""

from __future__ import annotations

import os
from typing import Dict, Any, List, Optional, Callable
from functools import wraps

from flask import Blueprint, jsonify, request, g

from utils.logging_config import get_logger

logger = get_logger(__name__)


class BlueprintFactoryV5:
    """Factory for creating standardized v5 blueprints."""
    
    # Default configuration for all blueprints
    DEFAULT_CONFIG = {
        'enable_cors': True,
        'cors_origins': None,  # Will use environment variable
        'enable_auth': True,
        'enable_rate_limiting': True,
        'enable_idempotency': True,
        'enable_observability': True,
        'enable_error_handlers': True,
        'enable_health_check': True,
        'api_version': 'v5',
    }
    
    # Blueprint-specific configurations
    BLUEPRINT_CONFIGS = {
        'entity_api': {
            'rate_limit_tier': 'standard',
            'auth_required': False,  # Optional auth for public endpoints
            'enable_caching': True,
            'cache_ttl': 300,  # 5 minutes
            'enable_etag': True,
        },
        'auth_api': {
            'rate_limit_tier': 'auth',
            'auth_required': False,  # Auth endpoints handle their own auth
            'enable_idempotency': True,
            'special_headers': ['X-Device-ID', 'X-App-Version'],
        },
        'search_api': {
            'rate_limit_tier': 'search',
            'auth_required': False,  # Optional auth
            'enable_caching': True,
            'cache_ttl': 60,  # 1 minute for search results
            'enable_etag': True,
        },
        'admin_api': {
            'rate_limit_tier': 'admin',
            'auth_required': True,
            'min_role_level': 5,  # Moderator level minimum
            'audit_logging': True,
        },
        'monitoring_api': {
            'rate_limit_tier': 'admin',
            'auth_required': True,
            'min_role_level': 10,  # Admin level minimum
            'special_access': True,
        },
        'webhook_api': {
            'rate_limit_tier': 'webhook',
            'auth_required': False,  # Webhooks use signature verification
            'enable_signature_verification': True,
            'enable_replay_protection': True,
        }
    }
    
    @classmethod
    def create_blueprint(
        cls,
        name: str,
        import_name: str,
        url_prefix: str = None,
        config_override: Dict[str, Any] = None
    ) -> Blueprint:
        """
        Create a standardized v5 blueprint.
        
        Args:
            name: Blueprint name
            import_name: Module import name
            url_prefix: URL prefix for blueprint
            config_override: Override default configuration
            
        Returns:
            Configured Flask Blueprint
        """
        # Merge configuration
        config = cls._merge_config(name, config_override or {})
        
        # Create blueprint
        blueprint = Blueprint(
            name,
            import_name,
            url_prefix=url_prefix or f"/api/{config['api_version']}/{name.replace('_api', '')}"
        )
        
        # Register middleware and handlers
        cls._register_error_handlers(blueprint, config)
        cls._register_before_request_handlers(blueprint, config)
        cls._register_after_request_handlers(blueprint, config)
        
        # Add health check endpoint if enabled
        if config.get('enable_health_check', True):
            cls._add_health_check(blueprint)
        
        logger.info(f"Created v5 blueprint '{name}' with URL prefix '{blueprint.url_prefix}'")
        return blueprint
    
    @classmethod
    def _merge_config(cls, blueprint_name: str, override: Dict[str, Any]) -> Dict[str, Any]:
        """Merge default, blueprint-specific, and override configurations."""
        config = cls.DEFAULT_CONFIG.copy()
        
        # Apply blueprint-specific config
        if blueprint_name in cls.BLUEPRINT_CONFIGS:
            config.update(cls.BLUEPRINT_CONFIGS[blueprint_name])
        
        # Apply overrides
        config.update(override)
        
        # Set CORS origins from environment if not specified
        if config['enable_cors'] and not config['cors_origins']:
            config['cors_origins'] = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
        
        return config
    
    @classmethod
    def _register_error_handlers(cls, blueprint: Blueprint, config: Dict[str, Any]):
        """Register standardized error handlers."""
        if not config.get('enable_error_handlers', True):
            return
        
        @blueprint.errorhandler(400)
        def handle_bad_request(error):
            return cls._create_error_response(
                'Bad Request',
                'BAD_REQUEST',
                'The request was invalid or malformed',
                400,
                error
            )
        
        @blueprint.errorhandler(401)
        def handle_unauthorized(error):
            return cls._create_error_response(
                'Unauthorized',
                'UNAUTHORIZED',
                'Authentication is required',
                401,
                error
            )
        
        @blueprint.errorhandler(403)
        def handle_forbidden(error):
            return cls._create_error_response(
                'Forbidden',
                'FORBIDDEN',
                'Insufficient permissions',
                403,
                error
            )
        
        @blueprint.errorhandler(404)
        def handle_not_found(error):
            return cls._create_error_response(
                'Not Found',
                'NOT_FOUND',
                'The requested resource was not found',
                404,
                error
            )
        
        @blueprint.errorhandler(405)
        def handle_method_not_allowed(error):
            return cls._create_error_response(
                'Method Not Allowed',
                'METHOD_NOT_ALLOWED',
                'The HTTP method is not allowed for this resource',
                405,
                error
            )
        
        @blueprint.errorhandler(429)
        def handle_rate_limit_exceeded(error):
            return cls._create_error_response(
                'Rate Limit Exceeded',
                'RATE_LIMIT_EXCEEDED',
                'Too many requests. Please try again later',
                429,
                error
            )
        
        @blueprint.errorhandler(500)
        def handle_internal_error(error):
            return cls._create_error_response(
                'Internal Server Error',
                'INTERNAL_ERROR',
                'An unexpected error occurred',
                500,
                error
            )
        
        @blueprint.errorhandler(503)
        def handle_service_unavailable(error):
            return cls._create_error_response(
                'Service Unavailable',
                'SERVICE_UNAVAILABLE',
                'The service is temporarily unavailable',
                503,
                error
            )
    
    @classmethod
    def _register_before_request_handlers(cls, blueprint: Blueprint, config: Dict[str, Any]):
        """Register before request handlers."""
        
        @blueprint.before_request
        def _blueprint_before_request():
            """Blueprint-specific before request processing."""
            try:
                # Store blueprint config in request context
                g.blueprint_config = config
                g.blueprint_name = blueprint.name
                
                # Rate limiting check if enabled
                if config.get('enable_rate_limiting', True):
                    from middleware.rate_limit_v5 import RateLimitV5Middleware
                    rate_limit_middleware = RateLimitV5Middleware()
                    rate_limit_result = rate_limit_middleware.check_rate_limit(
                        request, config.get('rate_limit_tier', 'standard')
                    )
                    if not rate_limit_result['allowed']:
                        return jsonify({
                            'error': 'Rate limit exceeded',
                            'code': 'RATE_LIMIT_EXCEEDED',
                            'retry_after': rate_limit_result.get('retry_after', 60),
                            'correlation_id': getattr(g, 'correlation_id', None)
                        }), 429
                
                # Idempotency check if enabled
                if config.get('enable_idempotency', False):
                    from middleware.idempotency_v5 import IdempotencyV5Middleware
                    idempotency_middleware = IdempotencyV5Middleware()
                    idempotency_result = idempotency_middleware.check_idempotency(request)
                    if idempotency_result['is_duplicate']:
                        return jsonify(idempotency_result['response']), idempotency_result['status_code']
                
                # Authentication check if required
                if config.get('auth_required', False):
                    if not hasattr(g, 'user') or g.user is None:
                        return jsonify({
                            'error': 'Authentication required',
                            'code': 'AUTHENTICATION_REQUIRED',
                            'correlation_id': getattr(g, 'correlation_id', None)
                        }), 401
                    
                    # Role level check if specified
                    min_role_level = config.get('min_role_level')
                    if min_role_level and getattr(g, 'max_role_level', 0) < min_role_level:
                        return jsonify({
                            'error': 'Insufficient permissions',
                            'code': 'INSUFFICIENT_PERMISSIONS',
                            'required_level': min_role_level,
                            'correlation_id': getattr(g, 'correlation_id', None)
                        }), 403
                
                # Special access checks
                if config.get('special_access', False):
                    if not cls._check_special_access(config):
                        return jsonify({
                            'error': 'Special access required',
                            'code': 'SPECIAL_ACCESS_REQUIRED',
                            'correlation_id': getattr(g, 'correlation_id', None)
                        }), 403
                
                # Signature verification for webhooks
                if config.get('enable_signature_verification', False):
                    if not cls._verify_webhook_signature():
                        return jsonify({
                            'error': 'Invalid signature',
                            'code': 'INVALID_SIGNATURE',
                            'correlation_id': getattr(g, 'correlation_id', None)
                        }), 401
                
            except Exception as e:
                logger.error(f"Blueprint before request error: {e}")
                return jsonify({
                    'error': 'Request processing error',
                    'code': 'REQUEST_PROCESSING_ERROR',
                    'correlation_id': getattr(g, 'correlation_id', None)
                }), 500
    
    @classmethod
    def _register_after_request_handlers(cls, blueprint: Blueprint, config: Dict[str, Any]):
        """Register after request handlers."""
        
        @blueprint.after_request
        def _blueprint_after_request(response):
            """Blueprint-specific after request processing."""
            try:
                # CORS headers
                if config.get('enable_cors', True):
                    cls._add_cors_headers(response, config)
                
                # API version header
                response.headers['X-API-Version'] = config.get('api_version', 'v5')
                
                # Blueprint identification
                response.headers['X-Blueprint'] = blueprint.name
                
                # Special headers for specific blueprints
                special_headers = config.get('special_headers', [])
                for header in special_headers:
                    header_value = request.headers.get(header)
                    if header_value:
                        response.headers[f'X-Echo-{header}'] = header_value
                
                # Observability metrics if enabled
                if config.get('enable_observability', True):
                    from middleware.observability_v5 import ObservabilityV5Middleware
                    observability_middleware = ObservabilityV5Middleware()
                    observability_middleware.record_request_metrics(request, response)
                
                # ETag caching if enabled
                if config.get('enable_etag', False) and response.status_code == 200:
                    from utils.etag_v5 import generate_entity_etag_v5
                    cache_ttl = config.get('cache_ttl', 300)
                    # Use deterministic ETag generation based on path and method, not full URL
                    etag = generate_entity_etag_v5(
                        entity_type=blueprint.name,
                        filters={
                            'path': request.path,
                            'method': request.method,
                            'blueprint': blueprint.name
                        },
                        user_context={'user_id': getattr(g, 'user_id', None)}
                    )
                    response.headers['ETag'] = etag
                    response.headers['Cache-Control'] = f'public, max-age={cache_ttl}'
                
                # Audit logging for admin operations
                if config.get('audit_logging', False) and hasattr(g, 'user_id'):
                    cls._log_audit_event(response)
                
            except Exception as e:
                logger.error(f"Blueprint after request error: {e}")
            
            return response
    
    @classmethod
    def _add_health_check(cls, blueprint: Blueprint):
        """Add health check endpoint to blueprint."""
        
        @blueprint.route('/health', methods=['GET'])
        def health_check():
            """Blueprint health check endpoint."""
            return jsonify({
                'status': 'healthy',
                'blueprint': blueprint.name,
                'version': 'v5',
                'timestamp': __import__('time').time(),
                'correlation_id': getattr(g, 'correlation_id', None)
            })
    
    @classmethod
    def _create_error_response(
        cls,
        error: str,
        code: str,
        message: str,
        status_code: int,
        exception: Optional[Exception] = None
    ):
        """Create standardized error response."""
        response_data = {
            'error': error,
            'code': code,
            'message': message,
            'status_code': status_code,
            'timestamp': __import__('time').time(),
            'correlation_id': getattr(g, 'correlation_id', None),
            'blueprint': getattr(g, 'blueprint_name', 'unknown')
        }
        
        # Add exception details in development
        if exception and os.getenv('FLASK_ENV') == 'development':
            response_data['debug'] = {
                'exception_type': type(exception).__name__,
                'exception_message': str(exception)
            }
        
        response = jsonify(response_data)
        response.status_code = status_code
        
        return response
    
    @classmethod
    def _add_cors_headers(cls, response, config: Dict[str, Any]):
        """Add CORS headers to response."""
        origins = config.get('cors_origins', ['*'])
        origin = request.headers.get('Origin')
        
        if origin in origins or '*' in origins:
            response.headers['Access-Control-Allow-Origin'] = origin or '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = (
                'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, '
                'X-Device-ID, X-App-Version, X-Correlation-ID'
            )
            response.headers['Access-Control-Expose-Headers'] = (
                'X-Total-Count, X-Page-Count, X-Current-Page, X-Per-Page, '
                'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, '
                'X-Trace-ID, X-Correlation-ID, X-API-Version'
            )
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = '86400'  # 24 hours
    
    @classmethod
    def _check_special_access(cls, config: Dict[str, Any]) -> bool:
        """Check if user has special access for monitoring endpoints."""
        # For monitoring endpoints, check for admin role and specific permissions
        if not getattr(g, 'is_admin', False):
            return False
        
        # Additional checks can be added here (IP whitelist, etc.)
        return True
    
    @classmethod
    def _verify_webhook_signature(cls) -> bool:
        """Verify webhook signature for security."""
        import hmac
        import hashlib
        
        signature = request.headers.get('X-Signature-256') or request.headers.get('X-Hub-Signature-256')
        if not signature:
            return False
        
        webhook_secret = os.getenv('WEBHOOK_SECRET')
        if not webhook_secret:
            logger.warning("Webhook signature verification enabled but no secret configured")
            return False
        
        try:
            # Remove 'sha256=' prefix if present
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            # Calculate expected signature
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                request.data,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Webhook signature verification error: {e}")
            return False
    
    @classmethod
    def _log_audit_event(cls, response):
        """Log audit event for admin operations."""
        try:
            audit_data = {
                'event_type': 'admin_action',
                'user_id': getattr(g, 'user_id', None),
                'user_email': getattr(g, 'user_email', None),
                'blueprint': getattr(g, 'blueprint_name', None),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'timestamp': __import__('time').time(),
                'correlation_id': getattr(g, 'correlation_id', None),
                'user_agent': request.headers.get('User-Agent', ''),
                'ip_address': request.headers.get('X-Forwarded-For', request.remote_addr),
            }
            
            # Add request data for write operations
            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                if request.is_json:
                    try:
                        # Mask sensitive data in request body
                        request_data = request.get_json(silent=True)
                        if request_data:
                            audit_data['request_data'] = cls._mask_sensitive_data(request_data)
                    except Exception:
                        pass
            
            logger.info(f"Audit log | {__import__('json').dumps(audit_data, default=str)}")
            
        except Exception as e:
            logger.error(f"Audit logging error: {e}")
    
    @classmethod
    def _mask_sensitive_data(cls, data: Any) -> Any:
        """Mask sensitive data in audit logs."""
        if isinstance(data, dict):
            masked = {}
            sensitive_keys = {
                'password', 'token', 'secret', 'key', 'authorization',
                'email', 'phone', 'ssn', 'credit_card'
            }
            
            for key, value in data.items():
                if key.lower() in sensitive_keys or 'password' in key.lower():
                    masked[key] = '***MASKED***'
                elif isinstance(value, (dict, list)):
                    masked[key] = cls._mask_sensitive_data(value)
                else:
                    masked[key] = value
                    
            return masked
            
        elif isinstance(data, list):
            return [cls._mask_sensitive_data(item) for item in data]
        
        return data


# Convenience functions for creating specific blueprint types
def create_entity_blueprint(import_name: str, entity_name: str = None) -> Blueprint:
    """Create an entity API blueprint."""
    name = entity_name or import_name.split('.')[-1]
    return BlueprintFactoryV5.create_blueprint(
        'entity_api',
        import_name,
        f"/api/v5/{name}"
    )


def create_admin_blueprint(import_name: str) -> Blueprint:
    """Create an admin API blueprint."""
    return BlueprintFactoryV5.create_blueprint(
        'admin_api',
        import_name,
        "/api/v5/admin"
    )


def create_auth_blueprint(import_name: str) -> Blueprint:
    """Create an auth API blueprint."""
    return BlueprintFactoryV5.create_blueprint(
        'auth_api',
        import_name,
        "/api/v5/auth"
    )


def create_search_blueprint(import_name: str) -> Blueprint:
    """Create a search API blueprint."""
    return BlueprintFactoryV5.create_blueprint(
        'search_api',
        import_name,
        "/api/v5/search"
    )


def create_monitoring_blueprint(import_name: str) -> Blueprint:
    """Create a monitoring API blueprint."""
    return BlueprintFactoryV5.create_blueprint(
        'monitoring_api',
        import_name,
        "/api/v5/monitoring"
    )


def create_webhook_blueprint(import_name: str) -> Blueprint:
    """Create a webhook API blueprint."""
    return BlueprintFactoryV5.create_blueprint(
        'webhook_api',
        import_name,
        "/api/v5/webhooks"
    )