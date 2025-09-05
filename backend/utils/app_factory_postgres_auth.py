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
        
        # Register enhanced error handlers
        register_auth_error_handlers(app)
        
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
        except:
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
        from flask import jsonify, request
        
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
        # Set up JWT configuration
        setup_jwt_config(app)
        
        # Register auth system
        register_postgres_auth(app)
        
        # Set up security headers
        setup_security_headers(app)
        
        # Add health check for auth system
        @app.route('/api/auth/health')
        def auth_health():
            from flask import jsonify
            return jsonify({
                'status': 'healthy',
                'auth_system': 'postgresql',
                'timestamp': '2025-01-15T00:00:00Z'
            })
        
        logger.info("PostgreSQL authentication system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL auth system: {e}")
        raise


def migrate_from_supabase_decorator(app: Flask):
    """
    Add a decorator to gradually migrate from Supabase to PostgreSQL auth.
    
    This allows for a gradual migration by providing fallback functionality.
    """
    
    def with_auth_fallback(postgres_func):
        """Decorator to provide Supabase fallback during migration."""
        def wrapper(*args, **kwargs):
            try:
                # Try PostgreSQL auth first
                return postgres_func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"PostgreSQL auth failed, checking for Supabase fallback: {e}")
                
                # Check if Supabase is still available
                try:
                    from utils.supabase_auth import supabase_auth
                    # You could implement fallback logic here
                    logger.info("Supabase auth available as fallback")
                    # For now, re-raise the original error
                    raise e
                except ImportError:
                    logger.info("Supabase auth not available, using PostgreSQL only")
                    raise e
        
        return wrapper
    
    # Store the decorator in app config for use in routes
    app.config['AUTH_FALLBACK_DECORATOR'] = with_auth_fallback


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
