#!/usr/bin/env python3
"""
Security-Enhanced Application Factory
=====================================

This application factory integrates all the new security components including:
- Consolidated authentication service
- Security headers middleware
- Secure error handling
- WebAuthn support
- Unified session management
"""

import os
import logging
import time
from datetime import datetime
from flask import Flask, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from flask_session import Session
import redis

# Import security components
from config.security_config import get_security_config
from middleware.security_headers_middleware import register_security_headers_middleware
from services.auth.auth_service_consolidated import get_consolidated_auth_service
from utils.secure_error_handler import get_error_handler
from utils.logging_config import configure_logging, get_logger

logger = get_logger(__name__)


def create_security_enhanced_app(config_class=None):
    """
    Create Flask application with enhanced security features.
    
    Args:
        config_class: Configuration class to use
        
    Returns:
        Flask application instance
    """
    app = Flask(__name__)
    
    # Initialize security configuration
    security_config = get_security_config()
    
    # Configure application
    _configure_app(app, security_config)
    
    # Initialize logging
    configure_logging(app)
    
    # Initialize security components
    _initialize_security_components(app, security_config)
    
    # Register middleware
    _register_middleware(app, security_config)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Initialize monitoring
    _initialize_monitoring(app)
    
    logger.info("Security-enhanced application created successfully")
    return app


def _configure_app(app: Flask, security_config):
    """Configure Flask application with security settings."""
    
    # Basic configuration
    app.config['SECRET_KEY'] = security_config.jwt_config['secret_key']
    app.config['TESTING'] = False
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Redis configuration
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    app.config['REDIS_URL'] = redis_url
    
    # Session configuration
    app.config['SESSION_TYPE'] = 'redis'
    app.config['SESSION_REDIS'] = redis.from_url(redis_url)
    app.config['SESSION_PERMANENT'] = False
    app.config['SESSION_USE_SIGNER'] = True
    app.config['SESSION_KEY_PREFIX'] = 'jewgo_session:'
    
    # Cache configuration
    app.config['CACHE_TYPE'] = 'redis'
    app.config['CACHE_REDIS_URL'] = redis_url
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300
    
    # Security configuration
    app.config['JWT_SECRET_KEY'] = security_config.jwt_config['secret_key']
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = security_config.jwt_config['access_token_expires']
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = security_config.jwt_config['refresh_token_expires']
    
    # CORS configuration
    cors_config = security_config.get_cors_config()
    app.config['CORS_ORIGINS'] = cors_config['origins']
    app.config['CORS_METHODS'] = cors_config['methods']
    app.config['CORS_ALLOW_HEADERS'] = cors_config['allow_headers']
    app.config['CORS_SUPPORTS_CREDENTIALS'] = cors_config['supports_credentials']
    
    # Rate limiting configuration
    rate_config = security_config.get_rate_limiting_config()
    app.config['RATELIMIT_ENABLED'] = rate_config['enabled']
    app.config['RATELIMIT_STORAGE_URL'] = rate_config['storage_url']
    
    # Production-specific configuration
    if security_config.is_production:
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour


def _initialize_security_components(app: Flask, security_config):
    """Initialize security components."""
    
    # Initialize consolidated auth service
    auth_service = get_consolidated_auth_service()
    app.auth_service = auth_service
    
    # Initialize error handler
    error_handler = get_error_handler()
    app.error_handler = error_handler
    
    # Initialize WebAuthn manager
    from services.auth.webauthn_manager import get_webauthn_manager
    webauthn_manager = get_webauthn_manager()
    app.webauthn_manager = webauthn_manager
    
    # Initialize session manager
    from services.auth.unified_session_manager import get_session_manager
    session_manager = get_session_manager()
    app.session_manager = session_manager
    
    # Initialize password handler
    from services.auth.secure_password_handler import get_password_handler
    password_handler = get_password_handler()
    app.password_handler = password_handler
    
    logger.info("Security components initialized")


def _register_middleware(app: Flask, security_config):
    """Register security middleware."""
    
    # Register security headers middleware
    register_security_headers_middleware(app)
    
    # Register rate limiting
    _register_rate_limiting(app, security_config)
    
    # Register CORS
    _register_cors(app, security_config)
    
    # Register request logging
    _register_request_logging(app)
    
    logger.info("Security middleware registered")


def _register_rate_limiting(app: Flask, security_config):
    """Register rate limiting middleware."""
    
    rate_config = security_config.get_rate_limiting_config()
    
    if rate_config['enabled']:
        limiter = Limiter(
            app,
            key_func=get_remote_address,
            storage_uri=rate_config['storage_url'],
            default_limits=[rate_config['default']]
        )
        
        # Store limiter for use in routes
        app.limiter = limiter
        
        logger.info("Rate limiting enabled")


def _register_cors(app: Flask, security_config):
    """Register CORS middleware."""
    
    cors_config = security_config.get_cors_config()
    
    # Simple CORS implementation
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        
        if origin in cors_config['origins']:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = ', '.join(cors_config['methods'])
            response.headers['Access-Control-Allow-Headers'] = ', '.join(cors_config['allow_headers'])
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = str(cors_config['max_age'])
        
        return response
    
    logger.info("CORS middleware registered")


def _register_request_logging(app: Flask):
    """Register request logging middleware."""
    
    @app.before_request
    def log_request_info():
        g.request_start_time = time.time()
        g.request_id = f"req_{int(time.time() * 1000)}"
        
        if app.debug:
            logger.debug(f"Request: {request.method} {request.path}")
    
    @app.after_request
    def log_response_info(response):
        if hasattr(g, 'request_start_time'):
            duration = time.time() - g.request_start_time
            logger.info(f"Response: {request.method} {request.path} - {response.status_code} ({duration:.3f}s)")
        
        return response
    
    logger.info("Request logging middleware registered")


def _register_blueprints(app: Flask):
    """Register application blueprints."""
    
    # Import and register v5 blueprints
    try:
        from routes.v5.auth_api import auth_bp
        app.register_blueprint(auth_bp)
        logger.info("Auth API v5 blueprint registered")
    except ImportError as e:
        logger.warning(f"Could not import auth API v5 blueprint: {e}")
    
    # Register other blueprints as needed
    # from routes.v5.restaurants_api import restaurants_bp
    # app.register_blueprint(restaurants_bp)
    
    logger.info("Application blueprints registered")


def _register_error_handlers(app: Flask):
    """Register error handlers."""
    
    error_handler = get_error_handler()
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(401)
    def handle_unauthorized(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(403)
    def handle_forbidden(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(404)
    def handle_not_found(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        response_data, status_code = error_handler.handle_error(error)
        return jsonify(response_data), status_code
    
    logger.info("Error handlers registered")


def _initialize_monitoring(app: Flask):
    """Initialize monitoring and health checks."""
    
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        try:
            # Check database connection
            from database.connection_manager import get_connection_manager
            db_manager = get_connection_manager()
            
            with db_manager.session_scope() as session:
                session.execute("SELECT 1")
            
            # Check Redis connection
            from cache.redis_manager_v5 import get_redis_manager_v5
            redis_manager = get_redis_manager_v5()
            redis_manager.health_check()
            
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0',
                'environment': os.getenv('FLASK_ENV', 'development')
            }), 200
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 503
    
    @app.route('/security/status')
    def security_status():
        """Security status endpoint."""
        try:
            security_config = get_security_config()
            
            return jsonify({
                'security_status': 'active',
                'environment': security_config.environment,
                'jwt_enabled': True,
                'webauthn_enabled': security_config.webauthn_manager.is_enabled(),
                'rate_limiting_enabled': security_config.get_rate_limiting_config()['enabled'],
                'cors_origins_count': len(security_config.get_cors_config()['origins']),
                'timestamp': datetime.utcnow().isoformat()
            }), 200
            
        except Exception as e:
            logger.error(f"Security status check failed: {e}")
            return jsonify({
                'security_status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
    
    logger.info("Monitoring endpoints registered")


# Create the application instance
app = create_security_enhanced_app()

if __name__ == '__main__':
    # Development server
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )