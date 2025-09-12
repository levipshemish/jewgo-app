#!/usr/bin/env python3
"""
V5 Application Factory - Clean consolidated version.

This is a streamlined version of the app factory that focuses on v5 API registration
and removes all the inline route definitions that are now handled by v5 blueprints.
"""

import os
import logging
import time
import traceback
from datetime import datetime, timezone
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from flask_session import Session
import redis
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

# Import configuration and utilities
from config.config import Config
from utils.logging_config import configure_logging, get_logger
from utils.limiter import set_limiter as _set_shared_limiter

logger = get_logger(__name__)

# Check Redis availability
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available - using memory fallback")

def _initialize_sentry() -> None:
    """Initialize Sentry error tracking if available."""
    try:
        sentry_dsn = os.environ.get("SENTRY_DSN")
        if sentry_dsn and sentry_dsn.strip() and sentry_dsn.startswith(('http://', 'https://')):
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[
                    FlaskIntegration(),
                    SqlalchemyIntegration(),
                ],
                traces_sample_rate=1.0,
                environment=os.environ.get("FLASK_ENV", "development"),
                debug=os.environ.get("FLASK_ENV") == "development",
            )
            logger.info("Sentry initialized successfully", dsn=sentry_dsn[:20] + "...")
        else:
            logger.warning("SENTRY_DSN not configured, error tracking disabled")
    except ImportError as e:
        logger.error(
            "Sentry import failed, error tracking disabled",
            error=str(e),
            traceback=traceback.format_exc(),
        )
    except Exception as e:
        logger.error(
            "Sentry initialization failed",
            error=str(e),
            traceback=traceback.format_exc(),
        )

def _configure_logging() -> None:
    """Configure structured logging using unified logging configuration."""
    configure_logging()

def _load_dependencies():
    """Load all required dependencies."""
    try:
        from utils.feature_flags import (
            feature_flag_context,
            feature_flag_manager,
            get_feature_flags,
            is_feature_enabled,
            require_feature_flag,
        )
        from utils.security import (
            require_admin_auth,
        )
        
        # Try to import v4 components
        v4_deps = {}
        try:
            from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
            from utils.cache_manager_v4 import CacheManagerV4
            from utils.config_manager import ConfigManager
            v4_deps = {
                "DatabaseManagerV4": DatabaseManagerV4,
                "CacheManagerV4": CacheManagerV4,
                "ConfigManager": ConfigManager,
            }
            logger.info("V4 dependencies loaded successfully")
        except ImportError as e:
            logger.warning(f"Could not load v4 dependencies: {e}")
            
        return {
            "Config": Config,
            "security": {
                "require_admin_auth": require_admin_auth,
            },
            "feature_flags": {
                "feature_flag_manager": feature_flag_manager,
                "require_feature_flag": require_feature_flag,
                "feature_flag_context": feature_flag_context,
                "is_feature_enabled": is_feature_enabled,
                "get_feature_flags": get_feature_flags,
            },
            **v4_deps,  # Include v4 dependencies
        }
    except ImportError:
        return {}

def create_app(config_class=None):
    """Application factory function that creates and configures the Flask app with v5 APIs."""
    
    # Start performance monitoring
    startup_start_time = time.time()
    logger.info("Starting application factory initialization")
    
    # Initialize Sentry first
    _initialize_sentry()
    
    # Configure logging
    _configure_logging()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    if config_class is None:
        try:
            config_class = Config
        except ImportError:
            logger.warning("Could not load Config class, using default configuration")
            config_class = object()
            
    try:
        app.config.from_object(config_class)
        logger.info("Configuration loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}")
        if os.environ.get("FLASK_ENV") == "production":
            raise RuntimeError(f"Configuration loading failed in production: {e}") from e
        else:
            logger.warning("Using fallback configuration for development")
            # Only use fallback secrets in development
            if os.environ.get("FLASK_ENV") == "development":
                app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
                app.config["DATABASE_URL"] = os.environ.get(
                    "DATABASE_URL",
                    "postgresql://postgres:postgres@localhost:5432/postgres",
                )
            else:
                # In staging/testing, require proper configuration
                raise RuntimeError("Configuration required for non-development environment")
    
    # Configure CORS
    cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    if cors_origins_env:
        cors_origins = [
            origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
        ]
        logger.info("CORS origins from environment", cors_origins=cors_origins)
    else:
        cors_origins = []
        logger.info("No CORS_ORIGINS environment variable found, using defaults")
        
    # Add default origins if not specified in environment
    if not cors_origins:
        cors_origins = [
            "https://jewgo.app",
            "https://jewgo-app.vercel.app",
            "https://jewgo.netlify.app",
            "https://jewgo-app.netlify.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        logger.info("Using default CORS origins", cors_origins=cors_origins)
        
    logger.info("Final CORS origins configuration", cors_origins=cors_origins)
    
    # Configure CORS
    CORS(
        app,
        origins=cors_origins,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-Forwarded-For",
            "X-Real-IP",
            "Cache-Control",
            "Pragma",
        ],
        expose_headers=[
            "Content-Type",
            "Content-Length",
            "Cache-Control",
            "Pragma",
        ],
        supports_credentials=True,
        max_age=86400,  # Cache preflight for 24 hours
        send_wildcard=False,  # Don't send wildcard, send specific origin
    )
    
    # Attach minimal redaction filter to prevent sensitive values in logs
    try:
        from utils.log_redaction import RedactingFilter
        redaction_filter = RedactingFilter()
        # Ensure app logger handlers redact
        for h in app.logger.handlers:
            h.addFilter(redaction_filter)
        # Also add a stream handler with redaction to root logger if none present
        root_logger = logging.getLogger()
        if not root_logger.handlers:
            sh = logging.StreamHandler()
            sh.addFilter(redaction_filter)
            root_logger.addHandler(sh)
        else:
            for h in root_logger.handlers:
                h.addFilter(redaction_filter)
        logger.info("Log redaction filter attached")
    except Exception as e:
        logger.warning("Failed to attach log redaction filter", error=str(e))
    
    # Configure rate limiting with Redis storage
    # Exclude v5 routes to avoid double rate limiting with RateLimitV5Middleware
    redis_url = os.environ.get("REDIS_URL", "memory://")
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[
            "100 per minute",     # Reduced from 1000 for security
            "1000 per hour",      # Reduced from 10000 for security
        ],  # Secure production limits
        storage_uri=redis_url
    )
    
    # Expose limiter to route modules via bridge
    try:
        _set_shared_limiter(limiter)
        logger.info("Shared limiter bridge initialized")
    except Exception as e:
        logger.warning("Failed to initialize shared limiter bridge", error=str(e))
        
    logger.info(
        f"Rate limiter configured with storage: {redis_url} (high limits for testing)"
    )
    
    # Initialize Redis cache and session
    redis_url = os.environ.get("REDIS_URL", "memory://")
    if redis_url and redis_url != "memory://" and REDIS_AVAILABLE:
        try:
            app.config["CACHE_TYPE"] = "redis"
            app.config["CACHE_REDIS_URL"] = redis_url
            cache = Cache(app)
            logger.info("Flask-Caching initialized with Redis")
        except Exception as e:
            logger.warning(f"Failed to initialize Flask-Caching with Redis: {e}")
            # Fallback to simple cache - remove ALL Redis-specific config
            app.config["CACHE_TYPE"] = "simple"
            redis_cache_keys = [
                "CACHE_REDIS_URL", "CACHE_OPTIONS", "CACHE_SOCKET_CONNECT_TIMEOUT_MS",
                "CACHE_SOCKET_TIMEOUT_MS", "CACHE_HEALTH_CHECK_INTERVAL", 
                "CACHE_MAX_CONNECTIONS", "CACHE_MAX_RETRIES", "CACHE_RETRY_DELAY"
            ]
            for key in redis_cache_keys:
                app.config.pop(key, None)
            cache = Cache(app)
            logger.info("Flask-Caching initialized with simple cache fallback")
    else:
        # Use simple cache - remove ALL Redis-specific config
        app.config["CACHE_TYPE"] = "simple"
        redis_cache_keys = [
            "CACHE_REDIS_URL", "CACHE_OPTIONS", "CACHE_SOCKET_CONNECT_TIMEOUT_MS",
            "CACHE_SOCKET_TIMEOUT_MS", "CACHE_HEALTH_CHECK_INTERVAL", 
            "CACHE_MAX_CONNECTIONS", "CACHE_MAX_RETRIES", "CACHE_RETRY_DELAY"
        ]
        for key in redis_cache_keys:
            app.config.pop(key, None)
        cache = Cache(app)
        logger.info("Flask-Caching initialized with simple cache")
    
    # Configure Flask-Session with Redis or fallback
    redis_url = os.environ.get("REDIS_URL")
    if redis_url and redis_url != "memory://" and REDIS_AVAILABLE:
        try:
            app.config["SESSION_TYPE"] = "redis"
            app.config["SESSION_REDIS"] = redis.from_url(redis_url)
            app.config["SESSION_KEY_PREFIX"] = "jewgo_session:"
            app.config["PERMANENT_SESSION_LIFETIME"] = 3600  # 1 hour
            Session(app)
            logger.info("Flask-Session configured with Redis successfully")
        except Exception as e:
            logger.warning(f"Failed to configure Flask-Session with Redis: {e}")
            # Fallback to default Flask session handling
            app.config["SECRET_KEY"] = app.config.get("SECRET_KEY", "dev-secret-key")
            logger.info("Using default Flask session handling as fallback")
    else:
        # No Redis URL or Redis not available, use default Flask session handling
        app.config["SECRET_KEY"] = app.config.get("SECRET_KEY", "dev-secret-key")
        logger.info(
            "No Redis URL configured or Redis not available - using default Flask session handling"
        )
    
    # Initialize cache manager
    cache_manager = None
    try:
        from utils.cache_manager import cache_manager as cache_manager_instance
        cache_manager = cache_manager_instance
        logger.info("Cache manager initialized successfully")
    except Exception as e:
        logger.warning("Failed to initialize cache manager", error=str(e))
        cache_manager = None
    
    # Load dependencies
    deps = _load_dependencies()
    # Add cache to dependencies
    deps["cache"] = cache
    deps["cache_manager"] = cache_manager
    
    # Make dependencies available to routes
    app.config["dependencies"] = deps
    
    # Register simple health check blueprint early (before other complex services)
    try:
        from routes.health_simple import health_simple_bp
        app.register_blueprint(health_simple_bp)
        logger.info("Simple health check blueprint registered successfully")
    except ImportError as e:
        logger.warning(f"Could not import simple health check blueprint: {e}")
    except Exception as e:
        logger.warning(f"Could not register simple health check blueprint: {e}")
    
    # Monitoring blueprint registration is handled later after service init
    
    # Register PostgreSQL authentication system
    try:
        from utils.app_factory_postgres_auth import init_postgres_auth_app
        init_postgres_auth_app(app)
        logger.info("PostgreSQL authentication system initialized successfully")
    except ImportError as e:
        logger.warning(f"Could not initialize PostgreSQL auth system: {e}")
    except Exception as e:
        logger.error(f"Error initializing PostgreSQL auth system: {e}")
    
    # Register v5 middleware with optimized initialization
    try:
        from middleware.auth_v5 import register_auth_v5_middleware
        from middleware.rate_limit_v5 import RateLimitV5Middleware
        from middleware.idempotency_v5 import IdempotencyV5Middleware
        from middleware.observability_v5 import ObservabilityV5Middleware
        
        # Register v5 authentication middleware (essential)
        register_auth_v5_middleware(app)
        logger.info("V5 authentication middleware registered successfully")
        
        # Register v5 rate limiting middleware (essential)
        rate_limit_middleware = RateLimitV5Middleware(app)
        logger.info("V5 rate limiting middleware registered successfully")
        
        # Register v5 idempotency middleware (non-critical, lazy load)
        try:
            idempotency_middleware = IdempotencyV5Middleware(app)
            logger.info("V5 idempotency middleware registered successfully")
        except Exception as e:
            logger.warning(f"V5 idempotency middleware failed to initialize: {e}")
        
        # Register v5 observability middleware (non-critical, lazy load)
        try:
            observability_middleware = ObservabilityV5Middleware(app)
            logger.info("V5 observability middleware registered successfully")
        except Exception as e:
            logger.warning(f"V5 observability middleware failed to initialize: {e}")
        
    except ImportError as e:
        logger.warning(f"Could not import v5 middleware: {e}")
    except Exception as e:
        logger.error(f"Error registering v5 middleware: {e}")
    
    # Register v5 API blueprints with feature flag controls
    try:
        from utils.feature_flags_v5 import FeatureFlagsV5
        from cache.redis_manager_v5 import get_redis_manager_v5
        from database.connection_manager import get_connection_manager
        
        # Initialize v5 services in dependency order
        try:
            # 1. Initialize connection manager first (no dependencies)
            connection_manager_v5 = get_connection_manager()
            logger.info("Database connection manager initialized")

            # 2. Initialize Redis manager with proper error handling
            try:
                redis_manager_v5 = get_redis_manager_v5()
                logger.info("Redis manager initialized successfully")
            except Exception as e:
                logger.warning(f"Redis manager initialization failed: {e}")
                redis_manager_v5 = None

            # 3. Initialize feature flags (without Redis dependency)
            feature_flags_v5 = FeatureFlagsV5()
            logger.info("Feature flags initialized")

            # 4. Verify all services are ready
            if not connection_manager_v5:
                raise RuntimeError("Database connection manager not available")
            if not feature_flags_v5:
                raise RuntimeError("Feature flags not available")

            logger.info("All v5 services initialized successfully (Redis disabled)")
        except Exception as e:
            logger.error(f"Failed to initialize v5 services: {e}")
            raise RuntimeError(f"Critical service initialization failed: {e}") from e
        
        # Register v5 entity API (consolidates restaurants, synagogues, mikvah, stores)
        if feature_flags_v5.is_enabled('entity_api_v5', default=True):
            try:
                from routes.v5.entity_api import entity_bp
                app.register_blueprint(entity_bp)
                logger.info("V5 entity API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 entity API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 entity API blueprint: {e}")
        
        # Register v5 main API (restaurants, synagogues, mikvah, stores endpoints)
        if feature_flags_v5.is_enabled('main_api_v5', default=True):
            try:
                from routes.v5.api_v5 import api_v5, init_services as init_api_services
                # Initialize API services
                init_api_services(connection_manager_v5, redis_manager_v5)
                app.register_blueprint(api_v5)
                logger.info("V5 main API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 main API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 main API blueprint: {e}")
        
        # Register v5 auth API
        if feature_flags_v5.is_enabled('auth_api_v5', default=True):
            try:
                from routes.v5.auth_api import auth_bp
                app.register_blueprint(auth_bp)
                logger.info("V5 auth API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 auth API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 auth API blueprint: {e}")
        
        # Register v5 search API
        if feature_flags_v5.is_enabled('search_api_v5', default=True):
            try:
                from routes.v5.search_api import search_bp
                app.register_blueprint(search_bp)
                logger.info("V5 search API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 search API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 search API blueprint: {e}")
        
        # Register v5 admin API
        if feature_flags_v5.is_enabled('admin_api_v5', default=True):
            try:
                from routes.v5.admin_api import admin_bp, init_services as init_admin_services
                # Initialize admin services
                init_admin_services(connection_manager_v5, redis_manager_v5, feature_flags_v5)
                app.register_blueprint(admin_bp)
                logger.info("V5 admin API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 admin API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 admin API blueprint: {e}")
        
        # Register v5 webhook API
        if feature_flags_v5.is_enabled('webhook_api_v5', default=True):
            try:
                from routes.v5.webhook_api import webhook_bp, init_services as init_webhook_services
                # Initialize webhook services
                init_webhook_services(redis_manager_v5, feature_flags_v5)
                app.register_blueprint(webhook_bp)
                logger.info("V5 webhook API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 webhook API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 webhook API blueprint: {e}")

        # Register v5 reviews API
        if feature_flags_v5.is_enabled('reviews_api_v5', default=True):
            try:
                from routes.v5.reviews_v5 import reviews_v5, init_services as init_reviews_services
                # Initialize reviews services
                init_reviews_services(connection_manager_v5, redis_manager_v5, feature_flags_v5)
                app.register_blueprint(reviews_v5)
                logger.info("V5 reviews API blueprint registered successfully")
            except ImportError as e:
                logger.warning(f"Could not import v5 reviews API blueprint: {e}")
            except Exception as e:
                logger.warning(f"Could not register v5 reviews API blueprint: {e}")
        
        # Register v5 monitoring API
        try:
            from routes.v5.monitoring_api import monitoring_v5, init_services as init_monitoring_services
            # Initialize monitoring services
            init_monitoring_services(redis_manager_v5, connection_manager_v5, feature_flags_v5)
            app.register_blueprint(monitoring_v5)
            logger.info("V5 monitoring API blueprint registered successfully")
        except ImportError as e:
            logger.warning(f"Could not import v5 monitoring API blueprint: {e}")
        except Exception as e:
            logger.warning(f"Could not register v5 monitoring API blueprint: {e}")
        
        # Register v5 feature flags API (always enabled for frontend access)
        try:
            from routes.v5.feature_flags_api import feature_flags_bp
            app.register_blueprint(feature_flags_bp)
            logger.info("V5 feature flags API blueprint registered successfully")
        except ImportError as e:
            logger.warning(f"Could not import v5 feature flags API blueprint: {e}")
        except Exception as e:
            logger.warning(f"Could not register v5 feature flags API blueprint: {e}")
                
    except ImportError as e:
        logger.warning(f"Could not import v5 feature flags: {e}")
        logger.info("V5 API blueprints will be registered with default settings")
        
        # Fallback: register v5 blueprints without feature flag checks
        try:
            from routes.v5.entity_api import entity_bp
            app.register_blueprint(entity_bp)
            logger.info("V5 entity API blueprint registered (fallback)")
        except ImportError:
            pass
            
        # Auth API blueprint already registered in main v5 section
        # try:
        #     from routes.v5.auth_api import auth_bp
        #     app.register_blueprint(auth_bp)
        #     logger.info("V5 auth API blueprint registered (fallback)")
        # except ImportError:
        #     pass
            
        try:
            from routes.v5.search_api import search_bp
            app.register_blueprint(search_bp)
            logger.info("V5 search API blueprint registered (fallback)")
        except ImportError:
            pass
            
        try:
            from routes.v5.admin_api import admin_bp
            app.register_blueprint(admin_bp)
            logger.info("V5 admin API blueprint registered (fallback)")
        except ImportError:
            pass
            
        try:
            from routes.v5.webhook_api import webhook_bp
            app.register_blueprint(webhook_bp)
            logger.info("V5 webhook API blueprint registered (fallback)")
        except ImportError:
            pass
            
        try:
            from routes.v5.reviews_v5 import reviews_v5
            app.register_blueprint(reviews_v5)
            logger.info("V5 reviews API blueprint registered (fallback)")
        except ImportError:
            pass
            
        try:
            from routes.v5.feature_flags_api import feature_flags_bp
            app.register_blueprint(feature_flags_bp)
            logger.info("V5 feature flags API blueprint registered (fallback)")
        except ImportError:
            pass
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404
        
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({"success": False, "error": "Internal server error"}), 500
    
    # Add dedicated healthz endpoint for container healthcheck
    @app.route('/healthz', methods=['GET'])
    def healthz():
        return jsonify({"ok": True}), 200
    
    # Log startup performance
    startup_time = time.time() - startup_start_time
    logger.info(f"V5 application factory initialization completed successfully in {startup_time:.2f} seconds")
    return app
