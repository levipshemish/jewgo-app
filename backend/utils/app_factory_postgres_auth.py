"""
App factory updates for PostgreSQL authentication system.

This module provides functions to integrate the PostgreSQL authentication
system with the existing Flask application factory.
"""

import os
from flask import Flask
from utils.logging_config import get_logger
from utils.postgres_auth import initialize_postgres_auth
# from utils.error_handler import register_error_handlers  # Function not implemented yet
from utils.metrics import register_metrics_endpoint

logger = get_logger(__name__)


def register_postgres_auth(app: Flask):
    """
    Register PostgreSQL authentication system with Flask app.
    
    This function initializes the auth system and registers the auth blueprint.
    """
    try:
        # Import database manager
        from database.database_manager_v4 import DatabaseManager
        
        # Initialize database manager
        db_manager = DatabaseManager()
        logger.info("Database manager initialized for auth system")
        
        # Initialize PostgreSQL auth manager
        auth_manager = initialize_postgres_auth(db_manager)
        logger.info("PostgreSQL auth manager initialized")
        
        # Store references in app config for access in other parts of the app
        app.config['DB_MANAGER'] = db_manager
        app.config['AUTH_MANAGER'] = auth_manager
        
        # Register auth blueprint (use the new auth_api routes)
        from routes.auth_api import auth_bp
        app.register_blueprint(auth_bp)
        logger.info("Auth API blueprint registered")
        # Register auth middleware (auto cookie-based auth + refresh)
        try:
            from middleware.auth_middleware import register_auth_middleware
            register_auth_middleware(app)
            logger.info("Auth middleware registered")
        except Exception as _e:
            logger.info("Auth middleware not registered: %s", _e)
        
        # Register enhanced error handlers
        register_auth_error_handlers(app)

        # Optional Prometheus metrics endpoint (robust/noise-free)
        try:
            register_metrics_endpoint(app)
        except Exception as _e:
            logger.info("Metrics endpoint not enabled or unavailable")
        
        logger.info("PostgreSQL authentication system registered successfully")
        
    except Exception as e:
        logger.error(f"Failed to register PostgreSQL auth system: {e}")
        raise


def register_auth_error_handlers(app: Flask):
    """Register authentication-specific error handlers."""
    
    @app.errorhandler(401)
    def handle_unauthorized(error):
        from flask import jsonify, request
        
        # Return JSON for API requests
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please provide valid authentication credentials'
            }), 401
        
        # Redirect to login for web requests
        from flask import redirect, url_for
        try:
            return redirect(url_for('auth.login', next=request.url))
        except Exception:
            # If auth.login route doesn't exist, return JSON
            return jsonify({'error': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def handle_forbidden(error):
        from flask import jsonify, request
        
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Insufficient permissions',
                'message': 'You do not have permission to access this resource'
            }), 403
        
        # For web requests, you might want to redirect to a "no permission" page
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        from flask import jsonify
        
        retry_after = getattr(error, 'retry_after', 60)
        
        response = jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please try again later.',
            'retry_after': retry_after
        })
        
        response.headers['Retry-After'] = str(retry_after)
        return response, 429


def setup_jwt_config(app: Flask):
    """Set up JWT configuration and validation."""
    
    # Ensure JWT_SECRET is configured
    if not app.config.get('JWT_SECRET'):
        jwt_secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
        if not jwt_secret:
            logger.error("JWT_SECRET_KEY environment variable is required")
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        app.config['JWT_SECRET'] = jwt_secret
    
    # Set JWT configuration
    app.config.setdefault('JWT_ACCESS_EXPIRE_HOURS', 24)
    app.config.setdefault('JWT_REFRESH_EXPIRE_DAYS', 30)
    app.config.setdefault('MAX_FAILED_LOGIN_ATTEMPTS', 5)
    app.config.setdefault('ACCOUNT_LOCKOUT_MINUTES', 15)
    
    logger.info("JWT configuration set up")


def _validate_auth_env() -> None:
    """Validate presence of critical auth environment variables and warn/error accordingly."""
    jwt_secret = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
    if not jwt_secret:
        logger.error("Missing JWT secret. Set JWT_SECRET_KEY or JWT_SECRET.")
        raise ValueError("JWT_SECRET_KEY (or JWT_SECRET) environment variable is required")
    # Optional, but warn if reCAPTCHA enforcement requested without key
    enforce_recaptcha = os.getenv('ENFORCE_RECAPTCHA_LOGIN', 'false').lower() == 'true'
    if enforce_recaptcha and not os.getenv('RECAPTCHA_SECRET_KEY'):
        logger.warning("ENFORCE_RECAPTCHA_LOGIN=true but RECAPTCHA_SECRET_KEY not set")


def setup_security_headers(app: Flask):
    """Set up security headers for the auth system."""
    
    @app.after_request
    def add_security_headers(response):
        # Only add headers for API routes to avoid interfering with frontend
        from flask import request
        
        if request.path.startswith('/api/'):
            # Prevent caching of authentication responses
            if request.path.startswith('/api/auth/'):
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
            
            # Add security headers
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            
            # CORS headers (if not already set by CORS extension)
            if not response.headers.get('Access-Control-Allow-Origin'):
                # You may want to configure this based on environment
                allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
                origin = request.headers.get('Origin')
                if origin in allowed_origins:
                    response.headers['Access-Control-Allow-Origin'] = origin
        
        return response


def init_postgres_auth_app(app: Flask):
    """
    Initialize the complete PostgreSQL authentication system for the app.
    
    This is the main function to call from your app factory.
    """
    logger.info("Initializing PostgreSQL authentication system...")
    
    try:
        # Validate env & set up JWT configuration
        _validate_auth_env()
        setup_jwt_config(app)
        
        # Register auth system
        register_postgres_auth(app)
        
        # Set up security headers
        setup_security_headers(app)
        
        # Add health check for auth system
        @app.route('/api/auth/health')
        def auth_health():
            from flask import jsonify
            from datetime import datetime, timezone
            return jsonify({
                'status': 'healthy',
                'auth_system': 'postgresql',
                'timestamp': datetime.now(timezone.utc).isoformat()
            })

        # Add component health probes for auth services
        _register_auth_service_health(app)
        
        logger.info("PostgreSQL authentication system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL auth system: {e}")
        raise


"""
Legacy migration decorator removed in Phase 5 cleanup.
All auth is handled via PostgreSQL auth routes and managers.
"""


# Utility functions for app integration

def get_auth_manager(app: Flask = None):
    """Get the auth manager instance from Flask app."""
    if app is None:
        from flask import current_app as app
    
    auth_manager = app.config.get('AUTH_MANAGER')
    if not auth_manager:
        raise RuntimeError("Auth manager not initialized. Call init_postgres_auth_app() first.")
    
    return auth_manager


def get_db_manager(app: Flask = None):
    """Get the database manager instance from Flask app."""
    if app is None:
        from flask import current_app as app
    
    db_manager = app.config.get('DB_MANAGER')
    if not db_manager:
        raise RuntimeError("Database manager not initialized. Call init_postgres_auth_app() first.")
    
    return db_manager


def check_auth_migration_status(app: Flask = None):
    """Check the status of the authentication migration."""
    if app is None:
        from flask import current_app as app
    
    try:
        db_manager = get_db_manager(app)
        
        with db_manager.connection_manager.session_scope() as session:
            from sqlalchemy import text
            # Check if auth tables exist
            result = session.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_name IN ('user_roles', 'auth_audit_log')
            """)).fetchall()
            
            tables = [row[0] for row in result]
            
            # Check if auth columns exist in users table
            result = session.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name IN (
                    'password_hash', 'email_verified', 'verification_token'
                )
            """)).fetchall()
            
            columns = [row[0] for row in result]
            
            status = {
                'auth_tables_exist': len(tables) >= 2,
                'auth_columns_exist': len(columns) >= 3,
                'tables_found': tables,
                'columns_found': columns,
                'migration_complete': len(tables) >= 2 and len(columns) >= 3
            }
            
            return status
    
    except Exception as e:
        logger.error(f"Failed to check migration status: {e}")
        return {
            'error': str(e),
            'migration_complete': False
        }


# Migration helpers - functions moved above


def _register_auth_service_health(app: Flask) -> None:
    """Register a detailed health endpoint for auth components."""
    @app.route('/api/auth/health/services')
    def auth_services_health():
        from flask import jsonify
        status = {
            'tokens': False,
            'csrf': False,
            'cookies': True,  # cookie setting is static
            'sessions': True,  # DB-backed; assume availability as app init succeeded
            'recaptcha_configured': bool(os.getenv('RECAPTCHA_SECRET_KEY')),
        }
        try:
            # Simple mint/verify round-trip for access token
            from services.auth.tokens import mint_access, verify
            at, _ttl = mint_access('health_user', 'health@example.com', roles=[])
            payload = verify(at, expected_type='access')
            status['tokens'] = bool(payload)
        except Exception:
            status['tokens'] = False
        try:
            from services.auth.csrf import issue as csrf_issue, validate as csrf_validate
            # Cannot issue without a response; basic flag to indicate module availability
            status['csrf'] = callable(csrf_issue) and callable(csrf_validate)
        except Exception:
            status['csrf'] = False
        return jsonify({'status': 'ok', 'components': status})
