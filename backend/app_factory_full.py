import os
import time
import traceback
from datetime import datetime, timezone
from typing import Any
import sentry_sdk
from flask import Flask, jsonify, request
from flask_caching import Cache
from flask_cors import CORS
import logging
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_session import Session
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from utils.logging_config import get_logger
from flask_socketio import SocketIO, emit, join_room, leave_room
logger = get_logger(__name__)
# Import Redis with fallback
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False
# Import dependencies with fallbacks
try:
    from utils.cache_manager import cache_manager
except ImportError:
    cache_manager = None
try:
    from utils.config_manager import ConfigManager
except ImportError:
    class ConfigManager:
        @staticmethod
        def get_port():
            return int(os.getenv("PORT", 5000))
        @staticmethod
        def is_production():
            return os.getenv("ENVIRONMENT", "development") == "production"
# Import service instances
try:
    from services.websocket_service import websocket_service
except ImportError:
    websocket_service = None
    logger.warning("WebSocket service not available")
try:
    from monitoring.performance_monitor import performance_monitor
except ImportError:
    performance_monitor = None
    logger.warning("Performance monitor not available")
try:
    from services.redis_cache_service import cache_service as redis_cache
except ImportError:
    redis_cache = None
    logger.warning("Redis cache service not available")
try:
    from services.open_now_service import OpenNowService
    open_now_service = OpenNowService()
except ImportError:
    open_now_service = None
    logger.warning("Open now service not available")
try:
    from database.database_manager_v4 import DatabaseManager as DatabaseManagerV4
except ImportError:
    DatabaseManagerV4 = None
try:
    from utils.cache_manager_v4 import CacheManagerV4
except ImportError:
    CacheManagerV4 = None
try:
    from routes.api_v4 import api_v4
    logger.info("Successfully imported api_v4 blueprint")
except ImportError as e:
    logger.warning(f"Could not import api_v4 blueprint: {e}")
    api_v4 = None
except Exception as e:
    logger.error(f"Unexpected error importing api_v4 blueprint: {e}")
    api_v4 = None
from database.database_manager_v3 import EnhancedDatabaseManager
from utils.api_response import (
    APIResponse,
)
from utils.error_handler import ErrorHandler
from utils.feature_flags import (
    FeatureFlag,
    feature_flag_manager,
)
from utils.feedback_manager import FeedbackManager
from utils.logging_config import configure_logging
from utils.security import (
    SecurityManager,
    security_manager,
)
from config.config import Config
# Import Redis health blueprint with fallback
try:
    from routes.redis_health import redis_bp
    logger.info("Redis health blueprint imported successfully")
except ImportError as e:
    logger.warning(f"Could not import Redis health blueprint: {e}")
    redis_bp = None
except Exception as e:
    logger.error(f"Error importing Redis health blueprint: {e}")
    redis_bp = None
# Thread-safe caching functions using CacheManager
def get_cached_restaurants(cache_key: str, deps=None):
    """Get cached restaurant data using the thread-safe CacheManager."""
    try:
        if deps and "cache_manager" in deps:
            return deps["cache_manager"].get(cache_key)
        return None
    except ImportError as e:
        logger.error(
            "Cache manager import failed",
            error=str(e),
            cache_key=cache_key,
            operation="get_cached_restaurants",
        )
        return None
    except Exception as e:
        logger.error(
            "Cache get operation failed",
            error=str(e),
            cache_key=cache_key,
            operation="get_cached_restaurants",
            traceback=traceback.format_exc(),
        )
        return None
def set_cached_restaurants(cache_key: str, data: Any, deps=None):
    """Cache restaurant data using the thread-safe CacheManager."""
    try:
        if deps and "cache_manager" in deps:
            deps["cache_manager"].set(cache_key, data, ttl=300)  # 5 minutes TTL
    except ImportError as e:
        logger.error(
            "Cache manager import failed",
            error=str(e),
            cache_key=cache_key,
            operation="set_cached_restaurants",
        )
    except Exception as e:
        logger.error(
            "Cache set operation failed",
            error=str(e),
            cache_key=cache_key,
            operation="set_cached_restaurants",
            traceback=traceback.format_exc(),
        )
# Initialize Sentry for error tracking
def _initialize_sentry() -> None:
    """Initialize Sentry error tracking if available."""
    # Get logger for this function
    try:
        sentry_dsn = os.environ.get("SENTRY_DSN")
        if sentry_dsn:
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

def _validate_supabase_config() -> None:
    """Validate that Supabase authentication configuration is present."""
    try:
        required_supabase_vars = {
            'SUPABASE_URL': os.environ.get('SUPABASE_URL'),
            'SUPABASE_SERVICE_ROLE_KEY': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'),
            'SUPABASE_JWT_SECRET': os.environ.get('SUPABASE_JWT_SECRET'),
        }
        
        missing_vars = [var for var, value in required_supabase_vars.items() if not value]
        
        if missing_vars:
            logger.warning(
                f"Missing Supabase configuration variables: {', '.join(missing_vars)}. "
                "Admin authentication may not work properly."
            )
        else:
            logger.info("Supabase authentication configuration validated successfully")
            
        # Legacy admin token check removed - feature has been deprecated
            
    except Exception as e:
        logger.error(f"Error validating Supabase configuration: {e}")
def _load_dependencies():
    """Load all required dependencies."""
    # Get logger for this function
    logger = get_logger(__name__)
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
            require_ip_restriction,
            require_scraper_auth,
            validate_request_data,
        )
        # Try to import v4 components
        v4_deps = {}
        try:
            v4_deps = {
                "DatabaseManagerV4": DatabaseManagerV4,
                "CacheManagerV4": CacheManagerV4,
                "ConfigManager": ConfigManager,
            }
            logger.info("V4 dependencies loaded successfully")
        except ImportError as e:
            logger.warning(f"Could not load v4 dependencies: {e}")
        return {
            "EnhancedDatabaseManager": EnhancedDatabaseManager,
            "Config": Config,
            "ErrorHandler": ErrorHandler,
            "APIResponse": APIResponse,
            "security": {
                "require_ip_restriction": require_ip_restriction,
                "require_scraper_auth": require_scraper_auth,
                "require_admin_auth": require_admin_auth,
                "validate_request_data": validate_request_data,
            },
            "feature_flags": {
                "feature_flag_manager": feature_flag_manager,
                "require_feature_flag": require_feature_flag,
                "feature_flag_context": feature_flag_context,
                "is_feature_enabled": is_feature_enabled,
                "get_feature_flags": get_feature_flags,
            },
            "FeedbackManager": FeedbackManager,
            **v4_deps,  # Include v4 dependencies
        }
    except ImportError as e:
        return {}
def create_app(config_class=None):
    """Application factory function that creates and configures the Flask app
    with all routes and middleware from the original app.py.
    Args:
        config_class: Configuration class to use (defaults to environment-based config)
    Returns:
        Configured Flask application with all routes
    """
    # Initialize Sentry first
    _initialize_sentry()
    # Configure logging
    _configure_logging()
    
    # Validate Supabase authentication configuration
    _validate_supabase_config()
    # Import required decorators early to avoid NameError
    try:
        from utils.feature_flags import require_feature_flag
        from utils.security import log_request, require_admin_auth, require_scraper_auth
    except ImportError as e:
        logger.warning(f"Could not import decorators: {e}")
        # Fallback decorators
        require_admin_auth = lambda f: f
        require_scraper_auth = lambda f: f
        log_request = lambda f: f
        require_feature_flag = lambda flag, default=True: lambda f: f
    # Create Flask app
    app = Flask(__name__)

    # Register teardown handler to clear flask.g per request
    try:
        from utils.security import clear_user_context
        app.teardown_request(clear_user_context)
        logger.info("Registered user context cleanup handler")
    except Exception as e:
        logger.warning(f"Failed to register user context cleanup: {e}")

    # Pre-warm JWKS and schedule refresh (guarded)
    try:
        from utils.supabase_auth import supabase_auth
        # Pre-warm JWKS cache on startup
        supabase_auth.pre_warm_jwks()
        # Schedule periodic refresh if APScheduler available
        supabase_auth.schedule_jwks_refresh()
        logger.info("JWKS pre-warm and refresh scheduling initialized")
    except Exception as e:
        logger.warning(f"JWKS pre-warm/refresh setup failed: {e}")

    # Start admin role cache invalidation listener (guarded by env/psycopg2)
    try:
        from utils.supabase_role_manager import get_role_manager
        rm = get_role_manager()
        rm.start_cache_invalidation_listener()
        logger.info("Admin role cache invalidation listener started (if enabled)")
    except Exception as e:
        logger.warning(f"Admin role cache invalidation listener not started: {e}")
    # Debug routes removed to avoid conflicts
    # Temporarily disable middleware for debugging
    # @app.before_request
    # def bind_request_id():
    #     try:
    #         req_id = (
    #             request.headers.get("X-Request-ID")
    #             or request.headers.get("X-Correlation-ID")
    #         )
    #         if not req_id:
    #             req_id = uuid.uuid4().hex
    #         # store in flask context and bind to structlog
    #         g.request_id = req_id
    #         if hasattr(structlog, "contextvars"):
    #             structlog.contextvars.bind_contextvars(
    #                 request_id=req_id,
    #                 path=request.path,
    #                 method=request.method
    #             )
    #     except Exception:
    #         # best-effort only
    #         pass
    # @app.after_request
    # def add_request_id_header(response):
    #     try:
    #         req_id = getattr(g, "request_id", None)
    #         if req_id:
    #             response.headers["X-Request-ID"] = req_id
    #     except Exception:
    #         pass
    #     return response
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
        # Debug: Log all environment variables for troubleshooting
        logger.info("=== Environment Variables Debug ===")
        logger.info(
            "Environment variable",
            name="ENVIRONMENT",
            value=os.environ.get("ENVIRONMENT"),
        )
        logger.info(
            "Environment variable",
            name="DATABASE_URL",
            set=bool(os.environ.get("DATABASE_URL")),
        )
        logger.info(
            "Environment variable",
            name="REDIS_URL",
            set=bool(os.environ.get("REDIS_URL")),
        )
        logger.info(
            "Environment variable",
            name="REDIS_HOST",
            set=bool(os.environ.get("REDIS_HOST")),
        )
        logger.info(
            "Environment variable",
            name="REDIS_PORT",
            set=bool(os.environ.get("REDIS_PORT")),
        )
        logger.info(
            "Environment variable",
            name="CACHE_TYPE",
            set=bool(os.environ.get("CACHE_TYPE")),
        )
        logger.info(
            "Environment variable",
            name="CACHE_REDIS_URL",
            set=bool(os.environ.get("CACHE_REDIS_URL")),
        )
        # Debug: Log Redis configuration
        logger.info("=== Redis Configuration Debug ===")
        logger.info(
            "Redis configuration",
            source="config",
            redis_url=app.config.get("REDIS_URL"),
        )
        logger.info(
            "Redis configuration", source="env", redis_url=os.environ.get("REDIS_URL")
        )
        logger.info(
            "Redis configuration",
            source="config",
            session_redis=app.config.get("SESSION_REDIS"),
        )
        logger.info(
            "Redis configuration",
            source="config",
            cache_redis_url=app.config.get("CACHE_REDIS_URL"),
        )
        # Cache configuration
        if os.environ.get("REDIS_URL"):
            app.config["CACHE_REDIS_URL"] = os.environ.get("REDIS_URL")
            logger.info(
                "Redis configuration set from environment variables",
                redis_url=os.environ.get("REDIS_URL"),
            )
        else:
            logger.warning("REDIS_URL environment variable not found!")
        # Use CACHE_TYPE from config class (which has environment variable fallback)
        app.config["CACHE_TYPE"] = config_class.CACHE_TYPE
        logger.info("Cache type configured", cache_type=config_class.CACHE_TYPE)
        # Additional Redis configuration from individual environment variables
        if os.environ.get("REDIS_HOST"):
            app.config["REDIS_HOST"] = os.environ.get("REDIS_HOST")
        if os.environ.get("REDIS_PORT"):
            app.config["REDIS_PORT"] = int(os.environ.get("REDIS_PORT"))
        if os.environ.get("REDIS_DB"):
            app.config["REDIS_DB"] = int(os.environ.get("REDIS_DB"))
        if os.environ.get("REDIS_PASSWORD"):
            app.config["REDIS_PASSWORD"] = os.environ.get("REDIS_PASSWORD")
        # Session configuration disabled
        # if os.environ.get('SESSION_TYPE'):
        #     app.config['SESSION_TYPE'] = os.environ.get('SESSION_TYPE')
    except Exception as e:
        logger.exception("Failed to load configuration", error=str(e))
        # Set default configuration
        app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
        app.config["DATABASE_URL"] = os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/postgres",
        )
    # Configure CORS
    # Get CORS origins from environment or use defaults
    cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    if cors_origins_env:
        # Split by comma and strip whitespace from each origin
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
    # Configure CORS with more robust settings
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
    redis_url = os.environ.get("REDIS_URL", "memory://")
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[
            "1000 per minute",
            "10000 per hour",
        ],  # Very high limits for testing
        storage_uri=redis_url,
    )
    # Expose limiter to route modules via bridge
    try:
        from utils.limiter import set_limiter as _set_shared_limiter
        _set_shared_limiter(limiter)
        logger.info("Shared limiter bridge initialized")
    except Exception as e:
        logger.warning("Failed to initialize shared limiter bridge", error=str(e))
    logger.info(
        f"Rate limiter configured with storage: {redis_url} (high limits for testing)"
    )
    # Initialize Redis cache and session
    try:
        cache = Cache(app)
        logger.info("Flask-Caching initialized successfully")
    except Exception as e:
        logger.warning("Failed to initialize Flask-Caching", error=str(e))
        # Fallback to simple cache
        app.config["CACHE_TYPE"] = "simple"
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
    # Initialize database manager as singleton
    db_manager_instance = None
    def get_db_manager():
        """Get or create database manager instance."""
        nonlocal db_manager_instance
        if db_manager_instance is None:
            try:
                if "EnhancedDatabaseManager" in deps:
                    logger.info("Creating new database manager instance")
                    db_manager_instance = deps["EnhancedDatabaseManager"]()
                    if db_manager_instance.connect():
                        logger.info("Database connection established")
                        # Test the connection by getting a few restaurants
                        test_restaurants = db_manager_instance.get_restaurants(
                            limit=5, as_dict=True
                        )
                        logger.info(
                            "Database test: Found restaurants",
                            count=len(test_restaurants),
                        )
                    else:
                        logger.error("Failed to establish database connection")
                else:
                    logger.error(
                        "EnhancedDatabaseManager not available in dependencies",
                    )
            except Exception as e:
                logger.exception("Database initialization failed", error=str(e))
        else:
            logger.info("Using existing database manager instance")
        return db_manager_instance
    # Add db_manager getter to dependencies
    deps["get_db_manager"] = get_db_manager
    # Initialize v4 database manager as singleton
    db_manager_v4_instance = None
    cache_manager_v4_instance = None
    def get_db_manager_v4():
        """Get or create database manager v4 instance."""
        nonlocal db_manager_v4_instance
        if db_manager_v4_instance is None:
            try:
                if "DatabaseManagerV4" in deps:
                    logger.info("Creating new database manager v4 instance")
                    db_manager_v4_instance = deps["DatabaseManagerV4"]()
                    if db_manager_v4_instance.connect():
                        logger.info("Database v4 connection established")
                        # Test the connection by getting a few restaurants
                        test_restaurants = db_manager_v4_instance.get_restaurants(
                            limit=5, as_dict=True
                        )
                        logger.info(
                            "Database v4 test: Found restaurants",
                            count=len(test_restaurants),
                        )
                    else:
                        logger.error("Failed to establish database v4 connection")
                else:
                    logger.error(
                        "DatabaseManagerV4 not available in dependencies",
                    )
            except Exception as e:
                logger.exception("Database v4 initialization failed", error=str(e))
        else:
            logger.info("Using existing database manager v4 instance")
        return db_manager_v4_instance
    def get_cache_manager_v4():
        """Get or create cache manager v4 instance."""
        nonlocal cache_manager_v4_instance
        if cache_manager_v4_instance is None:
            try:
                if "CacheManagerV4" in deps:
                    logger.info("Creating new cache manager v4 instance")
                    # Get Redis URL from environment (check both REDIS_URL and CACHE_REDIS_URL)
                    redis_url = os.environ.get("REDIS_URL") or os.environ.get(
                        "CACHE_REDIS_URL"
                    )
                    if not redis_url or redis_url == "memory://":
                        logger.info(
                            "No Redis URL configured - CacheManagerV4 will use memory fallback"
                        )
                        cache_manager_v4_instance = deps["CacheManagerV4"](
                            enable_cache=False
                        )
                    else:
                        logger.info(
                            f"Initializing CacheManagerV4 with Redis: {redis_url[:50]}..."
                        )
                        cache_manager_v4_instance = deps["CacheManagerV4"](
                            redis_url=redis_url
                        )
                    logger.info("Cache manager v4 initialized")
                else:
                    logger.warning("CacheManagerV4 not available in dependencies")
                    cache_manager_v4_instance = None
            except Exception as e:
                logger.exception("Cache manager v4 initialization failed", error=str(e))
                cache_manager_v4_instance = None
        return cache_manager_v4_instance
    # Add v4 getters to dependencies
    deps["get_db_manager_v4"] = get_db_manager_v4
    deps["cache_manager_v4"] = get_cache_manager_v4()
    # Make dependencies available to routes
    app.config["dependencies"] = deps
    # Initialize database on startup (skip during tests)
    with app.app_context():
        if not app.config.get("TESTING") and not os.environ.get("PYTEST_CURRENT_TEST"):
            try:
                logger.info("Initializing database managers...")
                db_manager = get_db_manager()
                if db_manager:
                    logger.info("Database manager v3 initialized successfully")
                    # Store in app config for health routes
                    app.config["DB_MANAGER"] = db_manager
                else:
                    logger.error("Failed to initialize database manager v3")
                db_manager_v4 = get_db_manager_v4()
                if db_manager_v4:
                    logger.info("Database manager v4 initialized successfully")
                    # Store in app config for health routes
                    app.config["DB_MANAGER_V4"] = db_manager_v4
                else:
                    logger.error("Failed to initialize database manager v4")
            except Exception as e:
                logger.exception("Error initializing database managers", error=str(e))
    # Routes will be registered later just before returning the app
    # Register health blueprint
    try:
        from routes.health_routes import health_bp
        from routes.deploy_webhook import deploy_webhook_bp
        from routes.test_webhook import test_webhook_bp
        app.register_blueprint(health_bp)
        app.register_blueprint(deploy_webhook_bp, url_prefix="/webhook")
        app.register_blueprint(test_webhook_bp)
        logger.info("Health routes blueprint registered successfully")
    except ImportError as e:
        logger.warning(f"Could not register health routes blueprint: {e}")
    # Register Redis health blueprint (only if Redis is configured)
    redis_url = os.environ.get("REDIS_URL") or os.environ.get("CACHE_REDIS_URL")
    if redis_url and redis_url != "memory://":
        try:
            # Check if redis_bp is available
            if "redis_bp" in globals() and redis_bp is not None:
                app.register_blueprint(redis_bp)
                logger.info("Redis health routes blueprint registered successfully")
                # Add a simple test route directly to the app for debugging
                @app.route("/api/redis-debug", methods=["GET"])
                def redis_debug():
                    return {
                        "message": "Redis debug route working",
                        "redis_url": redis_url,
                        "timestamp": time.time(),
                    }
                logger.info("Redis debug route added successfully")
            else:
                logger.warning("Redis blueprint not available - skipping registration")
        except ImportError as e:
            logger.warning(f"Could not register Redis health routes blueprint: {e}")
        except Exception as e:
            logger.error(f"Error registering Redis health routes blueprint: {e}")
    else:
        logger.info("Redis not configured - skipping Redis health routes registration")
    # Register v4 API routes
    try:
        if api_v4 is not None:
            app.register_blueprint(api_v4)
            logger.info("API v4 routes blueprint registered successfully")
        else:
            logger.warning("API v4 routes blueprint is None - skipping registration")
    except ImportError as e:
        logger.warning(f"Could not register API v4 routes blueprint: {e}")
    except Exception as e:
        logger.error(f"Error registering API v4 routes blueprint: {e}")
    # Register mock API routes for development
    try:
        from mock_api import mock_bp
        app.register_blueprint(mock_bp)
        logger.info("Mock API routes blueprint registered successfully")
    except ImportError as e:
        logger.warning(f"Could not register mock API routes blueprint: {e}")
    except Exception as e:
        logger.error(f"Error registering mock API routes blueprint: {e}")
    # Search blueprint removed - using direct PostgreSQL search
    # Register error handlers
    try:
        # Temporarily disable error handlers to debug route registration issue
        # register_error_handlers(app)
        logger.info("Error handlers temporarily disabled for debugging")
    except ImportError as e:
        logger.warning(f"Could not register error handlers: {e}")
    # Feature Flags API
    @app.route("/api/feature-flags", methods=["GET", "POST"])
    def feature_flags_api_root():
        if request.method == "GET":
            user_id = request.args.get("user_id")
            return (
                jsonify(
                    {
                        "feature_flags": feature_flag_manager.get_flags_for_user(
                            user_id
                        ),
                        "environment": feature_flag_manager.environment,
                        "user_id": user_id,
                    }
                ),
                200,
            )
        # POST create flag (admin)
        # Conditional validation-first: If payload includes flag fields, validate before auth
        data = request.get_json() or {}
        if any(
            k in data
            for k in ("name", "enabled", "rollout_percentage", "description", "version")
        ):
            validation = feature_flag_manager.validate_flag_config(data)
            if not validation["valid"]:
                return (
                    jsonify(
                        {
                            "error": "Invalid feature flag configuration",
                            "details": validation["errors"],
                        }
                    ),
                    400,
                )
        # Auth for create - use role-based authentication
        from utils.security import require_admin
        return require_admin()(lambda: None)()  # This will handle auth and return appropriate response
        flag = FeatureFlag.from_dict(data)
        feature_flag_manager.add_flag(flag)
        return jsonify({"message": "Feature flag created successfully"}), 201
    @app.route("/api/feature-flags/<flag_name>", methods=["GET", "POST", "DELETE"])
    def feature_flags_api_item(flag_name: str):
        if request.method == "GET":
            flag = feature_flag_manager.get_flag(flag_name)
            if not flag:
                return jsonify({"error": "Feature flag not found"}), 404
            return (
                jsonify(
                    {
                        "flag_name": flag.name,
                        "enabled": flag.enabled,
                        "description": flag.description,
                    }
                ),
                200,
            )
        # POST update or DELETE remove require admin auth - use role-based authentication
        from utils.security import require_admin
        return require_admin()(lambda: None)()  # This will handle auth and return appropriate response
        if request.method == "POST":
            data = request.get_json() or {}
            updated = feature_flag_manager.update_flag(flag_name, data)
            if not updated:
                return jsonify({"error": "Feature flag not found"}), 404
            return jsonify({"message": "Feature flag updated successfully"}), 200
        # DELETE
        removed = feature_flag_manager.remove_flag(flag_name)
        if not removed:
            return jsonify({"error": "Feature flag not found"}), 404
        return jsonify({"message": "Feature flag deleted successfully"}), 200
    @app.route("/api/feature-flags/validate", methods=["POST"])
    def feature_flags_validate():
        data = request.get_json() or {}
        validation = feature_flag_manager.validate_flag_config(data)
        return jsonify(validation), 200
    # Add a simple test endpoint to check route registration
    @app.route("/api/test/reviews-route", methods=["GET"])
    def test_reviews_route():
        """Test endpoint to check if reviews routes are registered."""
        return (
            jsonify(
                {
                    "message": "Reviews route test endpoint",
                    "status": "working",
                    "timestamp": datetime.now().isoformat(),
                },
            ),
            200,
        )
    @app.route("/api/debug/redis-config", methods=["GET"])
    def debug_redis_config():
        """Debug endpoint to check Redis configuration."""
        return (
            jsonify(
                {
                    "redis_url": app.config.get("REDIS_URL"),
                    "session_redis": app.config.get("SESSION_REDIS"),
                    "cache_redis_url": app.config.get("CACHE_REDIS_URL"),
                    "session_type": app.config.get("SESSION_TYPE"),
                    "cache_type": app.config.get("CACHE_TYPE"),
                    "environment": os.environ.get("ENVIRONMENT"),
                    "session_interface": (
                        str(type(app.session_interface))
                        if hasattr(app, "session_interface")
                        else "None"
                    ),
                    "timestamp": datetime.now().isoformat(),
                },
            ),
            200,
        )
    @app.route("/api/debug/env-vars", methods=["GET"])
    def debug_env_vars():
        """Debug endpoint to check environment variables directly."""
        return (
            jsonify(
                {
                    "REDIS_URL": os.environ.get("REDIS_URL"),
                    "REDIS_HOST": os.environ.get("REDIS_HOST"),
                    "REDIS_PORT": os.environ.get("REDIS_PORT"),
                    "REDIS_DB": os.environ.get("REDIS_DB"),
                    "REDIS_PASSWORD": (
                        "***" if os.environ.get("REDIS_PASSWORD") else None
                    ),
                    "CACHE_TYPE": os.environ.get("CACHE_TYPE"),
                    "CACHE_REDIS_URL": os.environ.get("CACHE_REDIS_URL"),
                    "DATABASE_URL": "***" if os.environ.get("DATABASE_URL") else None,
                    "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
                    "timestamp": datetime.now().isoformat(),
                },
            ),
            200,
        )
    @app.route("/api/debug/env-test", methods=["GET"])
    def debug_env_test():
        """Simple test endpoint to check if environment variables are loaded."""
        return (
            jsonify(
                {
                    "DATABASE_URL_set": bool(os.environ.get("DATABASE_URL")),
                    "REDIS_URL_set": bool(os.environ.get("REDIS_URL")),
                    "REDIS_HOST_set": bool(os.environ.get("REDIS_HOST")),
                    "CACHE_TYPE_set": bool(os.environ.get("CACHE_TYPE")),
                    "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
                    "timestamp": datetime.now().isoformat(),
                },
            ),
            200,
        )
    @app.route("/api/debug/env-raw", methods=["GET"])
    def debug_env_raw():
        """Debug endpoint to show raw environment variables."""
        try:
            # Get all environment variables
            env_vars = dict(os.environ)
            # Filter out sensitive variables
            sensitive_keys = [
                "DATABASE_URL",
                "REDIS_URL",
                "REDIS_PASSWORD",
                # ADMIN_TOKEN removed - legacy auth deprecated
                "SCRAPER_TOKEN",
                "SECRET_KEY",
            ]
            filtered_env = {}
            for key, value in env_vars.items():
                if key in sensitive_keys:
                    filtered_env[key] = "***HIDDEN***" if value else "NOT_SET"
                else:
                    filtered_env[key] = value
            return (
                jsonify(
                    {
                        "message": "Environment variables (sensitive values hidden)",
                        "env_vars": filtered_env,
                        "total_vars": len(env_vars),
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception("Error in debug_env_raw", error=str(e))
            return jsonify({"error": "Internal server error"}), 500
    @app.route("/api/debug/admin-tokens", methods=["GET"])
    def debug_admin_tokens():
        """Debug endpoint to check if admin tokens are loaded."""
        try:
            # Disable in production for security
            if os.environ.get("ENVIRONMENT") == "production":
                return jsonify({"error": "Not found"}), 404
            # Get admin tokens info without exposing actual tokens
            admin_tokens = security_manager.admin_tokens
            token_count = len(admin_tokens)
            # Show token info without exposing actual values
            token_info = []
            for token_hash, info in admin_tokens.items():
                token_info.append(
                    {
                        "token_hash": (
                            token_hash[:8] + "..."
                            if len(token_hash) > 8
                            else token_hash
                        ),
                        "type": info.get("type"),
                        "permissions": info.get("permissions"),
                        "description": info.get("description"),
                        "created_at": info.get("created_at"),
                    }
                )
            return (
                jsonify(
                    {
                        "message": "Admin tokens status",
                        "token_count": token_count,
                        "tokens_loaded": token_count > 0,
                        "token_info": token_info,
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception("Error in debug_admin_tokens", error=str(e))
            return jsonify({"error": "Internal server error"}), 500
    @app.route("/api/test/admin-auth", methods=["GET"])
    @require_admin_auth
    def test_admin_auth():
        """Simple test endpoint to verify admin authentication works."""
        return (
            jsonify(
                {
                    "message": "Admin authentication successful",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            200,
        )
    @app.route("/api/debug/cors-config", methods=["GET"])
    def debug_cors_config():
        """Debug endpoint to check CORS configuration."""
        cors_origins_env = os.environ.get("CORS_ORIGINS", "")
        if cors_origins_env:
            cors_origins = [
                origin.strip()
                for origin in cors_origins_env.split(",")
                if origin.strip()
            ]
        else:
            cors_origins = []
        if not cors_origins:
            cors_origins = [
                "https://jewgo.app",
                "https://jewgo-app.vercel.app",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        return (
            jsonify(
                {
                    "cors_origins_env": cors_origins_env,
                    "cors_origins_processed": cors_origins,
                    "environment": os.environ.get("ENVIRONMENT"),
                    "request_origin": request.headers.get("Origin"),
                    "request_headers": dict(request.headers),
                    "cors_working": True,
                    "message": "CORS test endpoint - if you can see this, CORS is working!",
                },
            ),
            200,
        )
    @app.route("/api/debug/marketplace-table", methods=["GET"])
    def debug_marketplace_table():
        """Debug endpoint to check marketplace table status."""
        try:
            from database.database_manager_v3 import EnhancedDatabaseManager
            db_manager = EnhancedDatabaseManager()
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if marketplace table exists
                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = 'marketplace'
                        );
                    """
                    )
                    marketplace_exists = cursor.fetchone()[0]
                    # Check if listings table exists
                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = 'listings'
                        );
                    """
                    )
                    listings_exists = cursor.fetchone()[0]
                    if marketplace_exists:
                        # Check if marketplace table has data
                        cursor.execute("SELECT COUNT(*) FROM marketplace")
                        count = cursor.fetchone()[0]
                        # Check table structure
                        cursor.execute(
                            """
                            SELECT column_name, data_type
                            FROM information_schema.columns
                            WHERE table_name = 'marketplace'
                            ORDER BY ordinal_position
                        """
                        )
                        columns = cursor.fetchall()
                        column_info = [
                            {"name": col[0], "type": col[1]} for col in columns
                        ]
                        # Try to execute the actual marketplace query to see if it works
                        try:
                            cursor.execute(
                                """
                                SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code,
                                       m.latitude, m.longitude, m.vendor_id, m.vendor_name, m.vendor_phone, m.vendor_email,
                                       m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale,
                                       m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at,
                                       m.updated_at, m.category as category_name, m.subcategory as subcategory_name,
                                       m.vendor_name as seller_name
                                FROM marketplace m
                                WHERE m.status = %s
                                LIMIT 1
                            """,
                                ["active"],
                            )
                            sample_data = cursor.fetchone()
                            query_works = True
                        except Exception as query_error:
                            query_works = False
                            query_error_msg = str(query_error)
                        return jsonify(
                            {
                                "success": True,
                                "marketplace_table_exists": True,
                                "listings_table_exists": listings_exists,
                                "record_count": count,
                                "columns": column_info,
                                "status": "marketplace_table_found",
                                "query_works": query_works,
                                "query_error": (
                                    query_error_msg if not query_works else None
                                ),
                                "sample_data": sample_data if query_works else None,
                            }
                        )
                    elif listings_exists:
                        # Check if listings table has data
                        cursor.execute("SELECT COUNT(*) FROM listings")
                        count = cursor.fetchone()[0]
                        # Check table structure
                        cursor.execute(
                            """
                            SELECT column_name, data_type
                            FROM information_schema.columns
                            WHERE table_name = 'listings'
                            ORDER BY ordinal_position
                        """
                        )
                        columns = cursor.fetchall()
                        column_info = [
                            {"name": col[0], "type": col[1]} for col in columns
                        ]
                        return jsonify(
                            {
                                "success": True,
                                "marketplace_table_exists": False,
                                "listings_table_exists": True,
                                "record_count": count,
                                "columns": column_info,
                                "status": "listings_table_found_but_service_expects_marketplace",
                            }
                        )
                    else:
                        # Check what tables exist
                        cursor.execute(
                            """
                            SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                            ORDER BY table_name
                        """
                        )
                        tables = cursor.fetchall()
                        table_names = [table[0] for table in tables]
                        return jsonify(
                            {
                                "success": True,
                                "marketplace_table_exists": False,
                                "listings_table_exists": False,
                                "available_tables": table_names,
                                "status": "no_marketplace_tables_found",
                            }
                        )
        except Exception as e:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": str(e),
                        "marketplace_table_exists": False,
                        "listings_table_exists": False,
                    }
                ),
                500,
            )
    @app.route("/api/test/cors", methods=["GET", "POST", "OPTIONS"])
    def test_cors():
        """Simple test endpoint to verify CORS is working."""
        return (
            jsonify(
                {
                    "message": "CORS test successful",
                    "method": request.method,
                    "origin": request.headers.get("Origin"),
                    "timestamp": datetime.now().isoformat(),
                },
            ),
            200,
        )
    # Add Sentry test endpoint
    @app.route("/test-sentry", methods=["GET"])
    def test_sentry():
        """Test endpoint to verify Sentry integration."""
        try:
            # Capture a test message
            sentry_sdk.capture_message(
                "Sentry test message from /test-sentry endpoint",
                level="info",
            )
            # Capture a test exception
            msg = "Test exception for Sentry monitoring"
            raise Exception(msg)
        except Exception as e:
            # This will be captured by Sentry
            sentry_sdk.capture_exception(e)
            return (
                jsonify(
                    {
                        "message": "Sentry test completed",
                        "status": "success",
                        "timestamp": datetime.now().isoformat(),
                        "note": "Check Sentry dashboard for captured events",
                    },
                ),
                200,
            )
    # Add global OPTIONS handler for CORS preflight requests
    @app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def handle_options(path):
        """Handle OPTIONS requests for CORS preflight."""
        response = app.make_default_options_response()
        # Get the origin from the request
        origin = request.headers.get("Origin")
        # Check if origin is in allowed origins
        cors_origins_env = os.environ.get("CORS_ORIGINS", "")
        if cors_origins_env:
            # Split by comma and strip whitespace from each origin
            cors_origins = [
                origin.strip()
                for origin in cors_origins_env.split(",")
                if origin.strip()
            ]
        else:
            cors_origins = []
        if not cors_origins:
            cors_origins = [
                "https://jewgo.app",
                "https://jewgo-app.vercel.app",
                "https://jewgo.netlify.app",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        # Set the appropriate origin header
        if origin and origin in cors_origins:
            response.headers.add("Access-Control-Allow-Origin", origin)
        else:
            # Default to jewgo.app if origin not found or not in allowed list
            response.headers.add("Access-Control-Allow-Origin", "https://jewgo.app")
        response.headers.add(
            "Access-Control-Allow-Headers",
            "Content-Type,Authorization,Accept,Origin,X-Requested-With,X-Forwarded-For,X-Real-IP,Cache-Control,Pragma",
        )
        response.headers.add(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,DELETE,OPTIONS",
        )
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Max-Age", "86400")
        response.headers.add(
            "Access-Control-Expose-Headers",
            "Content-Type,Content-Length,Cache-Control,Pragma",
        )
        # Log the CORS request for debugging
        logger.info(
            "CORS preflight request",
            origin=origin,
            allowed_origins=cors_origins,
        )
        return response
    # All routes are already registered in this file
    # Initialize SocketIO for WebSocket support
    socketio = SocketIO(
        app, cors_allowed_origins=["http://localhost:3000", "https://jewgo.app"]
    )
    # WebSocket event handlers
    @socketio.on("connect")
    def handle_connect():
        """Handle client connection"""
        try:
            client_id = request.sid
            websocket_service.add_connection(client_id, request.remote_addr)
            performance_monitor.record_metric("websocket_connection", 1)
            logger.info(f"Client connected: {client_id}")
            emit("connected", {"status": "connected", "client_id": client_id})
        except Exception as e:
            logger.error(f"Error handling connection: {e}")
            emit("error", {"message": "Connection failed"})
    @socketio.on("disconnect")
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            client_id = request.sid
            websocket_service.remove_connection(client_id)
            performance_monitor.record_metric("websocket_disconnection", 1)
            logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"Error handling disconnection: {e}")
    @socketio.on("join_room")
    def handle_join_room(data):
        """Handle room joining"""
        try:
            room_id = data.get("room_id")
            client_id = request.sid
            if room_id:
                join_room(room_id)
                websocket_service.add_to_room(client_id, room_id)
                logger.info(f"Client {client_id} joined room: {room_id}")
                emit("room_joined", {"room_id": room_id})
        except Exception as e:
            logger.error(f"Error joining room: {e}")
            emit("error", {"message": "Failed to join room"})
    @socketio.on("leave_room")
    def handle_leave_room(data):
        """Handle room leaving"""
        try:
            room_id = data.get("room_id")
            client_id = request.sid
            if room_id:
                leave_room(room_id)
                websocket_service.remove_from_room(client_id, room_id)
                logger.info(f"Client {client_id} left room: {room_id}")
                emit("room_left", {"room_id": room_id})
        except Exception as e:
            logger.error(f"Error leaving room: {e}")
            emit("error", {"message": "Failed to leave room"})
    @socketio.on("filter_update")
    def handle_filter_update(data):
        """Handle filter updates from clients"""
        try:
            client_id = request.sid
            filter_type = data.get("filter_type")
            filter_value = data.get("filter_value")
            location = data.get("location")
            # Broadcast filter update to other clients in the same room
            room_id = "filter_updates"
            websocket_service.broadcast_to_room(
                room_id,
                {
                    "type": "filter_update",
                    "data": {
                        "filter_type": filter_type,
                        "filter_value": filter_value,
                        "location": location,
                        "client_id": client_id,
                    },
                },
            )
            performance_monitor.record_metric("filter_update", 1)
            logger.info(
                f"Filter update from {client_id}: {filter_type} = {filter_value}"
            )
        except Exception as e:
            logger.error(f"Error handling filter update: {e}")
    @socketio.on("location_update")
    def handle_location_update(data):
        """Handle location updates from clients"""
        try:
            client_id = request.sid
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            # Update client location in WebSocket service
            websocket_service.update_client_location(client_id, latitude, longitude)
            # Broadcast location update to relevant rooms
            websocket_service.broadcast_to_room(
                "location_updates",
                {
                    "type": "location_update",
                    "data": {
                        "latitude": latitude,
                        "longitude": longitude,
                        "client_id": client_id,
                    },
                },
            )
            performance_monitor.record_metric("location_update", 1)
            logger.info(f"Location update from {client_id}: {latitude}, {longitude}")
        except Exception as e:
            logger.error(f"Error handling location update: {e}")
    @socketio.on("heartbeat")
    def handle_heartbeat(data):
        """Handle heartbeat messages"""
        try:
            client_id = request.sid
            websocket_service.update_heartbeat(client_id)
            emit("heartbeat_ack", {"timestamp": datetime.now(timezone.utc).isoformat()})
        except Exception as e:
            logger.error(f"Error handling heartbeat: {e}")
    # API Routes
    @app.route("/api/restaurants", methods=["GET"])
    def get_restaurants():
        """Get restaurants with advanced filtering and caching"""
        try:
            start_time = datetime.now()
            # Parse and validate query parameters
            lat = request.args.get("lat", type=float)
            lng = request.args.get("lng", type=float)
            max_distance_mi = request.args.get("max_distance_mi", type=float)
            # Parse pagination parameters with explicit type conversion
            try:
                limit = int(request.args.get("limit", 50))
            except (ValueError, TypeError):
                limit = 50
            try:
                page = int(request.args.get("page", 1))
            except (ValueError, TypeError):
                page = 1
            try:
                offset = int(request.args.get("offset", 0))
            except (ValueError, TypeError):
                offset = 0
            # Calculate offset from page if page is provided
            if page and page > 1:
                offset = (page - 1) * limit
            # Build cache key
            cache_key = f"restaurants:{request.query_string.decode()}"
            # Debug logging for pagination
            logger.info(
                f"Pagination debug - page: {page}, limit: {limit}, offset: {offset}"
            )
            logger.info(f"Cache key: {cache_key}")
            logger.info(f"Request args: {dict(request.args)}")
            logger.info(f"Query string: {request.query_string.decode()}")
            # Parse boolean parameters properly (Flask's type=bool doesn't work with 'true'/'false' strings)
            open_now = request.args.get("open_now", "").lower() in [
                "true",
                "1",
                "yes",
                "on",
            ]
            mobile_optimized = request.args.get("mobile_optimized", "").lower() in [
                "true",
                "1",
                "yes",
                "on",
            ]
            low_power_mode = request.args.get("low_power_mode", "").lower() in [
                "true",
                "1",
                "yes",
                "on",
            ]
            slow_connection = request.args.get("slow_connection", "").lower() in [
                "true",
                "1",
                "yes",
                "on",
            ]
            # Try to get from cache first (skip if redis_cache not available)
            # Temporarily disable cache to debug pagination issue
            # if 'redis_cache' in locals():
            #     cached_result = redis_cache.get(cache_key)
            #     if cached_result:
            #         if 'performance_monitor' in locals():
            #             performance_monitor.record_cache_hit('restaurants')
            #         return jsonify(cached_result)
            # 
            #     if 'performance_monitor' in locals():
            #         performance_monitor.record_cache_miss('restaurants')
            # Build base query
            query = "SELECT * FROM restaurants WHERE 1=1"
            count_query = "SELECT COUNT(*) FROM restaurants WHERE 1=1"
            params = []
            count_params = []
            # Apply distance filtering if coordinates provided
            if lat is not None and lng is not None and max_distance_mi:
                # Convert miles to meters for earth_distance function (1 mile = 1609.34 meters)
                max_distance_meters = max_distance_mi * 1609.34
                # Add distance calculation to SELECT
                query = query.replace(
                    "SELECT *",
                    "SELECT *, (earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) / 1609.34) as distance_mi",
                )
                params.extend([lat, lng])
                # Add distance filter to WHERE clause
                query += " AND earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) <= %s"
                params.extend([lat, lng, max_distance_meters])
                # Apply same filter to count query
                count_query += " AND earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(%s, %s)) <= %s"
                count_params.extend([lat, lng, max_distance_meters])
                # Log distance filtering for monitoring
                if hasattr(locals(), "performance_monitor"):
                    performance_monitor.record_distance_filtering(
                        lat, lng, max_distance_mi
                    )
            # Apply open now filtering
            if open_now:
                # For now, skip open_now filtering as it requires complex time/timezone logic
                # TODO: Implement proper open now filtering based on restaurant hours
                pass
            # Apply additional filters from request
            search_term = request.args.get("search")
            if search_term:
                search_pattern = f"%{search_term}%"
                query += (
                    " AND (name ILIKE %s OR cuisine_type ILIKE %s OR address ILIKE %s)"
                )
                params.extend([search_pattern, search_pattern, search_pattern])
                count_query += (
                    " AND (name ILIKE %s OR cuisine_type ILIKE %s OR address ILIKE %s)"
                )
                count_params.extend([search_pattern, search_pattern, search_pattern])
            certifying_agency = request.args.get("certifying_agency")
            if certifying_agency:
                query += " AND certifying_agency = %s"
                params.append(certifying_agency)
                count_query += " AND certifying_agency = %s"
                count_params.append(certifying_agency)
            kosher_category = request.args.get("kosher_category")
            if kosher_category:
                query += " AND kosher_category = %s"
                params.append(kosher_category)
                count_query += " AND kosher_category = %s"
                count_params.append(kosher_category)
            listing_type = request.args.get("listing_type")
            if listing_type:
                query += " AND listing_type = %s"
                params.append(listing_type)
                count_query += " AND listing_type = %s"
                count_params.append(listing_type)
            min_rating = request.args.get("min_rating", type=float)
            if min_rating:
                query += " AND rating >= %s"
                params.append(min_rating)
                count_query += " AND rating >= %s"
                count_params.append(min_rating)
            price_min = request.args.get("price_min", type=int)
            if price_min:
                query += " AND min_avg_meal_cost >= %s"
                params.append(price_min)
                count_query += " AND min_avg_meal_cost >= %s"
                count_params.append(price_min)
            price_max = request.args.get("price_max", type=int)
            if price_max:
                query += " AND max_avg_meal_cost <= %s"
                params.append(price_max)
                count_query += " AND max_avg_meal_cost <= %s"
                count_params.append(price_max)
            # Add ordering BEFORE limit (correct SQL syntax)
            if lat is not None and lng is not None:
                query += " ORDER BY distance_mi ASC"
            else:
                query += " ORDER BY name ASC"
            # Apply limit from request or use defaults based on optimization mode
            if limit:
                # Use explicit limit from request
                query += f" LIMIT {min(limit, 1000)}"  # Cap at 1000 for safety
            elif mobile_optimized:
                if low_power_mode:
                    # Reduce result set for low power mode
                    query += " LIMIT 20"
                elif slow_connection:
                    # Reduce result set for slow connections
                    query += " LIMIT 30"
                else:
                    # Default mobile optimization
                    query += " LIMIT 50"
            else:
                # Desktop optimization
                query += " LIMIT 100"
            # Add offset for pagination
            if offset > 0:
                query += f" OFFSET {offset}"
            # Execute query
            db_manager = get_db_manager()
            if not db_manager:
                return (
                    jsonify(
                        {"success": False, "error": "Database connection unavailable"}
                    ),
                    503,
                )
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Debug logging
                    logger.info(f"Executing query: {query}")
                    logger.info(f"With params: {params}")
                    logger.info(f"Final SQL with LIMIT/OFFSET: {query}")
                    # Execute count query first to get total
                    cursor.execute(count_query, count_params)
                    total_count = cursor.fetchone()[0]
                    # Execute main query
                    cursor.execute(query, params)
                    restaurants = cursor.fetchall()
                    logger.info(
                        f"Query returned {len(restaurants)} restaurants out of {total_count} total"
                    )
                    # Convert to list of dictionaries
                    columns = [desc[0] for desc in cursor.description]
                    restaurants_data = []
                    for row in restaurants:
                        restaurant_dict = dict(zip(columns, row))
                        # Format distance if available
                        if "distance_mi" in restaurant_dict:
                            # Format distance to 1 decimal place
                            distance = restaurant_dict["distance_mi"]
                            if distance < 1:
                                restaurant_dict["distance_formatted"] = (
                                    f"{distance * 5280:.0f} ft"
                                )
                            else:
                                restaurant_dict["distance_formatted"] = (
                                    f"{distance:.1f} mi"
                                )
                        # Check open now status if not already filtered
                        if not open_now and restaurant_dict.get("hours_structured"):
                            # TODO: Implement is_open_now logic
                            restaurant_dict["is_open_now"] = None
                        restaurants_data.append(restaurant_dict)
            # Prepare response
            response_data = {
                "success": True,
                "data": restaurants_data,
                "count": len(restaurants_data),
                "total": total_count,  # Add total count for pagination
                "page": page,
                "limit": limit or 50,
                "offset": offset,
                "filters_applied": {
                    "distance_filtering": lat is not None
                    and lng is not None
                    and max_distance_mi,
                    "open_now": open_now,
                    "mobile_optimized": mobile_optimized,
                    "low_power_mode": low_power_mode,
                    "slow_connection": slow_connection,
                },
                "performance": {
                    "query_time_ms": (datetime.now() - start_time).total_seconds()
                    * 1000,
                    "cache_hit": False,
                },
            }
            logger.info(f"Returning {len(restaurants_data)} restaurants to frontend")
            logger.info(f"Response data keys: {list(response_data.keys())}")
            logger.info(
                f"Response page: {response_data.get('page')}, limit: {response_data.get('limit')}, offset: {response_data.get('offset')}"
            )
            # Cache the result (skip if redis_cache not available)
            # if 'redis_cache' in locals():
            #     redis_cache.set(cache_key, response_data, ttl=300)  # 5 minutes
            # Send real-time update via WebSocket (skip if service not available)
            if "websocket_service" in locals():
                websocket_service.broadcast_to_room(
                    "restaurant_updates",
                    {
                        "type": "restaurant_list_update",
                        "data": {
                            "count": len(restaurants_data),
                            "filters_applied": response_data["filters_applied"],
                        },
                    },
                )
            return jsonify(response_data)
        except Exception as e:
            logger.error(f"Error fetching restaurants: {e}")
            logger.error(traceback.format_exc())
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to fetch restaurants",
                        "details": str(e),
                    }
                ),
                500,
            )
    @app.route("/api/restaurants/<int:restaurant_id>", methods=["GET"])
    def get_restaurant(restaurant_id):
        """Get a specific restaurant by ID with caching"""
        try:
            # Try cache first
            cache_key = f"restaurant:{restaurant_id}"
            cached_result = redis_cache.get(cache_key)
            if cached_result:
                performance_monitor.record_cache_hit("restaurant_detail")
                return jsonify(cached_result)
            performance_monitor.record_cache_miss("restaurant_detail")
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT * FROM restaurants WHERE id = %s", (restaurant_id,)
                    )
                    restaurant = cursor.fetchone()
                    if not restaurant:
                        return (
                            jsonify(
                                {"success": False, "error": "Restaurant not found"}
                            ),
                            404,
                        )
                    # Convert to dictionary
                    columns = [desc[0] for desc in cursor.description]
                    restaurant_dict = dict(zip(columns, restaurant))
                    # Add open now status
                    if restaurant_dict.get("hours_structured"):
                        is_open = open_now_service.is_open_now(
                            restaurant_dict["hours_structured"],
                            restaurant_dict.get("timezone", "America/New_York"),
                        )
                        restaurant_dict["is_open_now"] = is_open
                    response_data = {"success": True, "data": restaurant_dict}
                    # Cache the result
                    redis_cache.set(cache_key, response_data, ttl=600)  # 10 minutes
                    return jsonify(response_data)
        except Exception as e:
            logger.error(f"Error fetching restaurant {restaurant_id}: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to fetch restaurant",
                        "details": str(e),
                    }
                ),
                500,
            )
    @app.route("/api/restaurants/<int:restaurant_id>/status", methods=["GET"])
    def get_restaurant_status(restaurant_id):
        """Get real-time restaurant status"""
        try:
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT id, name, hours_structured, timezone, status FROM restaurants WHERE id = %s",
                        (restaurant_id,),
                    )
                    restaurant = cursor.fetchone()
            if not restaurant:
                return jsonify({"success": False, "error": "Restaurant not found"}), 404
            # Check open now status
            hours_structured = restaurant[2]
            timezone_str = restaurant[3] or "America/New_York"
            status = restaurant[4]
            is_open = False
            if hours_structured:
                is_open = open_now_service.is_open_now(hours_structured, timezone_str)
            response_data = {
                "success": True,
                "data": {
                    "restaurant_id": restaurant_id,
                    "name": restaurant[1],
                    "is_open": is_open,
                    "status": status,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                },
            }
            # Send real-time update
            websocket_service.broadcast_to_room(
                f"restaurant_{restaurant_id}",
                {"type": "restaurant_status_update", "data": response_data["data"]},
            )
            return jsonify(response_data)
        except Exception as e:
            logger.error(f"Error fetching restaurant status {restaurant_id}: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to fetch restaurant status",
                        "details": str(e),
                    }
                ),
                500,
            )
    @app.route("/api/performance/stats", methods=["GET"])
    def get_performance_stats():
        """Get performance monitoring statistics"""
        try:
            stats = {
                "distance_filtering": performance_monitor.get_distance_filtering_stats(),
                "open_now_filtering": performance_monitor.get_open_now_filtering_stats(),
                "cache": performance_monitor.get_cache_stats(),
                "overall": performance_monitor.get_overall_stats(),
                "websocket": {
                    "active_connections": len(websocket_service.connections) if websocket_service else 0,
                    "active_rooms": len(websocket_service.rooms) if websocket_service else 0,
                },
            }
            return jsonify({"success": True, "data": stats})
        except Exception as e:
            logger.error(f"Error fetching performance stats: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to fetch performance stats",
                        "details": str(e),
                    }
                ),
                500,
            )
    @app.route("/api/cache/clear", methods=["POST"])
    def clear_cache():
        """Clear all cache"""
        try:
            redis_cache.clear_all()
            return jsonify({"success": True, "message": "Cache cleared successfully"})
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to clear cache",
                        "details": str(e),
                    }
                ),
                500,
            )
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        # Check if migration is requested
        migrate = request.args.get("migrate")
        if migrate == "subcategories":
            try:
                with db_manager.get_connection() as conn:
                    with conn.cursor() as cursor:
                        # Check if subcategories table exists
                        cursor.execute(
                            """
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables
                                WHERE table_name = 'subcategories'
                            );
                        """
                        )
                        table_exists = cursor.fetchone()[0]
                        if not table_exists:
                            # Create the subcategories table
                            cursor.execute(
                                """
                                CREATE TABLE subcategories (
                                    id SERIAL PRIMARY KEY,
                                    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                                    name VARCHAR(100) NOT NULL,
                                    description TEXT,
                                    icon VARCHAR(50),
                                    slug VARCHAR(100) UNIQUE NOT NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                );
                                CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
                                CREATE INDEX idx_subcategories_slug ON subcategories(slug);
                            """
                            )
                            conn.commit()
                            return jsonify(
                                {
                                    "status": "healthy",
                                    "migration": "subcategories table created successfully",
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                }
                            )
                        else:
                            return jsonify(
                                {
                                    "status": "healthy",
                                    "migration": "subcategories table already exists",
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                }
                            )
            except Exception as e:
                logger.error(f"Migration failed: {e}")
                return (
                    jsonify(
                        {
                            "status": "unhealthy",
                            "migration": f"failed: {str(e)}",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                    ),
                    500,
                )
        try:
            # Check database connection
            db_manager = app.config.get("DB_MANAGER")
            if db_manager:
                with db_manager.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT 1")
                        db_healthy = True
            else:
                db_healthy = False
                logger.error("Database manager not available")
        except Exception as e:
            db_healthy = False
            logger.error(f"Database health check failed: {e}")
        # Check Redis connection
        try:
            redis_healthy = redis_cache.health_check()
        except Exception as e:
            redis_healthy = False
            logger.error(f"Redis health check failed: {e}")
        health_status = {
            "status": "healthy" if db_healthy and redis_healthy else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "redis": "healthy" if redis_healthy else "unhealthy",
                "websocket": "healthy",
            },
            "performance": {
                "active_connections": len(websocket_service.connections) if websocket_service else 0,
                "cache_hit_rate": performance_monitor.get_cache_stats().get(
                    "hit_rate", 0
                ) if performance_monitor else 0,
            },
        }
        status_code = 200 if db_healthy and redis_healthy else 503
        return jsonify(health_status), status_code
    @app.route("/api/admin/run-marketplace-migration", methods=["POST"])
    def run_marketplace_migration():
        """Temporary admin endpoint to run marketplace migration."""
        try:
            # Check for admin token
            # Use role-based authentication instead of token-based
            from utils.security import require_admin
            return require_admin()(lambda: None)()  # This will handle auth and return appropriate response
            # Import and run the migration
            from database.migrations.create_marketplace_unified import run_migration
            success = run_migration()
            if success:
                return jsonify(
                    {
                        "success": True,
                        "message": "Marketplace migration completed successfully",
                        "tables_created": [
                            "categories",
                            "subcategories",
                            "listings",
                            "gemachs",
                            "listing_images",
                            "listing_transactions",
                            "listing_endorsements",
                            "usernames",
                        ],
                    }
                )
            else:
                return (
                    jsonify(
                        {"success": False, "error": "Marketplace migration failed"}
                    ),
                    500,
                )
        except Exception as e:
            logger.exception("Error running marketplace migration")
            return jsonify({"success": False, "error": str(e)}), 500
    @app.route("/api/migrate-marketplace", methods=["POST"])
    def migrate_marketplace():
        """Simple migration endpoint that runs the marketplace migration script."""
        try:
            # Import and run the migration script
            import subprocess
            import sys
            # Run the migration script
            result = subprocess.run(
                [sys.executable, "run_marketplace_migration.py"],
                capture_output=True,
                text=True,
                cwd=".",
            )
            if result.returncode == 0:
                return jsonify(
                    {
                        "success": True,
                        "message": "Marketplace migration completed successfully",
                        "output": result.stdout,
                    }
                )
            else:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Migration failed",
                            "output": result.stdout,
                            "error_output": result.stderr,
                        }
                    ),
                    500,
                )
        except Exception as e:
            logger.exception("Error running marketplace migration script")
            return jsonify({"success": False, "error": str(e)}), 500
    @app.route("/api/fix-marketplace", methods=["POST"])
    def fix_marketplace():
        """Simple endpoint to fix marketplace tables."""
        try:
            # Import and run the migration directly
            from database.migrations.create_marketplace_unified import run_migration
            success = run_migration()
            if success:
                return jsonify(
                    {
                        "success": True,
                        "message": "Marketplace tables created successfully",
                    }
                )
            else:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Failed to create marketplace tables",
                        }
                    ),
                    500,
                )
        except Exception as e:
            logger.exception("Error creating marketplace tables")
            return jsonify({"success": False, "error": str(e)}), 500
    @app.route("/api/create-tables", methods=["GET"])
    def create_tables():
        """Simple endpoint to create marketplace tables."""
        try:
            # Import and run the migration directly
            from database.migrations.create_marketplace_unified import run_migration
            success = run_migration()
            if success:
                return jsonify(
                    {
                        "success": True,
                        "message": "Marketplace tables created successfully",
                    }
                )
            else:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Failed to create marketplace tables",
                        }
                    ),
                    500,
                )
        except Exception as e:
            logger.exception("Error creating marketplace tables")
            return jsonify({"success": False, "error": str(e)}), 500
    # Register teardown handler to clear user context
    try:
        from utils.security import clear_user_context

        @app.teardown_request
        def _teardown(req_or_exc):
            return clear_user_context(req_or_exc)

        logger.info("Registered user context cleanup handler")
    except Exception as e:
        logger.warning(f"Failed to register user context cleanup: {e}")

    # Error handlers
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
    
    return app, socketio

# Create the app and socketio instances
app, socketio = create_app()

if __name__ == "__main__":
    # Run the app with SocketIO
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)
