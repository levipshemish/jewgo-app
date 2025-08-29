# !/usr/bin/env python3
"""
JewGo Backend API Server - Application Factory
==============================================
This module creates and configures the Flask application with all necessary
routes, middleware, and error handlers.
Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""
import os
import traceback
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from utils.logging_config import get_logger

logger = get_logger(__name__)
# Import dependencies with fallbacks
try:
    from database.database_manager_v3 import EnhancedDatabaseManager
except ImportError as e:
    logger.warning(f"Could not import DatabaseManager: {e}")
    EnhancedDatabaseManager = None
try:
    from utils.cache_manager import cache_manager
except ImportError as e:
    logger.warning(f"Could not import cache_manager: {e}")
    cache_manager = None
try:
    from utils.config_manager import ConfigManager
except ImportError as e:
    logger.warning(f"Could not import ConfigManager: {e}")

    class ConfigManager:
        @staticmethod
        def get_port():
            return int(os.getenv("PORT", 5000))

        @staticmethod
        def is_production():
            return os.getenv("ENVIRONMENT", "development") == "production"


def create_app():
    """Create and configure the Flask application"""
    # Load environment variables from config.env first
    try:
        from utils.config_manager import _load_config_env

        _load_config_env()
        logger.info("Loaded environment variables from config.env")
    except Exception as e:
        logger.warning(f"Failed to load config.env: {e}")
    
    # Pre-warm JWKS cache on startup
    try:
        from utils.supabase_auth import supabase_auth
        supabase_auth.pre_warm_jwks()
        logger.info("JWKS pre-warming completed")
    except Exception as e:
        logger.warning(f"JWKS pre-warming failed: {e}")
    
    # Schedule JWKS refresh
    try:
        from utils.supabase_auth import supabase_auth
        supabase_auth.schedule_jwks_refresh()
        logger.info("JWKS refresh scheduling completed")
    except Exception as e:
        logger.warning(f"Failed to schedule JWKS refresh: {e}")
    
    # Start admin role cache invalidation listener
    try:
        # Check if cache invalidation listener is enabled
        if os.getenv("ENABLE_CACHE_INVALIDATION_LISTENER", "true").lower() == "true":
            from utils.supabase_role_manager import get_role_manager
            role_manager = get_role_manager()
            role_manager.start_cache_invalidation_listener()
            logger.info("Admin role cache invalidation listener startup completed")
        else:
            logger.info("Cache invalidation listener disabled by ENABLE_CACHE_INVALIDATION_LISTENER=false")
    except Exception as e:
        logger.warning(f"Failed to start admin role cache invalidation listener: {e}")
    
    app = Flask(__name__)
    
    # Register teardown handler to clear user context
    try:
        from utils.security import clear_user_context
        app.teardown_request(clear_user_context)
        logger.info("Registered user context cleanup handler")
    except Exception as e:
        logger.warning(f"Failed to register user context cleanup: {e}")
    
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
            "https://jewgo-app.vercel.app",  # Production frontend
            "https://jewgo.com",
            "https://www.jewgo.com",
            "https://app.jewgo.com",
            "https://jewgo-app-oyoh.onrender.com",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
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
    # Initialize database manager
    db_manager = None
    if EnhancedDatabaseManager:
        try:
            db_manager = EnhancedDatabaseManager()
            logger.info("Database manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database manager: {e}")
    # Initialize dependencies for API v4 routes
    deps = {}
    # Import v4 dependencies
    try:
        from database.database_manager_v4 import DatabaseManager

        deps["DatabaseManagerV4"] = DatabaseManager
        logger.info("DatabaseManagerV4 imported successfully")
    except ImportError as e:
        logger.warning(f"Could not import DatabaseManagerV4: {e}")
        deps["DatabaseManagerV4"] = None
    try:
        from utils.cache_manager_v4 import CacheManagerV4

        deps["CacheManagerV4"] = CacheManagerV4
        logger.info("CacheManagerV4 imported successfully")
    except ImportError as e:
        logger.warning(f"Could not import CacheManagerV4: {e}")
        deps["CacheManagerV4"] = None
    try:
        from utils.config_manager import ConfigManager

        deps["ConfigManager"] = ConfigManager
        logger.info("ConfigManager imported successfully")
    except ImportError as e:
        logger.warning(f"Could not import ConfigManager: {e}")
        deps["ConfigManager"] = None
    # Initialize v4 database manager as singleton
    db_manager_v4_instance = None
    cache_manager_v4_instance = None

    def get_db_manager_v4():
        """Get or create database manager v4 instance."""
        nonlocal db_manager_v4_instance
        if db_manager_v4_instance is None:
            try:
                if "DatabaseManagerV4" in deps and deps["DatabaseManagerV4"]:
                    logger.info("Creating new database manager v4 instance")
                    db_manager_v4_instance = deps["DatabaseManagerV4"]()
                    if db_manager_v4_instance.connect():
                        logger.info("Database v4 connection established")
                    else:
                        logger.error("Failed to establish database v4 connection")
                        db_manager_v4_instance = None
                else:
                    logger.error("DatabaseManagerV4 not available in dependencies")
            except Exception as e:
                logger.exception("Database v4 initialization failed", error=str(e))
                db_manager_v4_instance = None
        return db_manager_v4_instance

    def get_cache_manager_v4():
        """Get or create cache manager v4 instance."""
        nonlocal cache_manager_v4_instance
        if cache_manager_v4_instance is None:
            try:
                if "CacheManagerV4" in deps and deps["CacheManagerV4"]:
                    logger.info("Creating new cache manager v4 instance")
                    # Get Redis URL from environment
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
    deps["config_manager"] = deps.get("ConfigManager", None)
    # Make dependencies available to routes
    app.config["dependencies"] = deps

    # Health check endpoint
    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        try:
            db_healthy = False
            if db_manager:
                try:
                    with db_manager.get_connection() as conn:
                        with conn.cursor() as cursor:
                            cursor.execute("SELECT 1")
                            db_healthy = True
                except Exception as e:
                    logger.error(f"Database health check failed: {e}")
            return jsonify(
                {
                    "status": "healthy" if db_healthy else "unhealthy",
                    "database": "connected" if db_healthy else "disconnected",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "version": "4.1",
                }
            ), (200 if db_healthy else 503)
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return jsonify({"status": "unhealthy", "error": str(e)}), 500

    # Root endpoint
    @app.route("/", methods=["GET"])
    def root():
        """Root endpoint"""
        return (
            jsonify(
                {"message": "JewGo Backend API", "version": "4.1", "status": "running"}
            ),
            200,
        )

    # API info endpoint
    @app.route("/api", methods=["GET"])
    def api_info():
        """API information endpoint"""
        return (
            jsonify(
                {
                    "name": "JewGo Backend API",
                    "version": "4.1",
                    "description": "Kosher Restaurant Discovery Platform API",
                    "endpoints": {
                        "health": "/health",
                        "api_info": "/api",
                        "root": "/",
                        "restaurants": "/api/restaurants",
                        "restaurant_detail": "/api/restaurants/<id>",
                    },
                }
            ),
            200,
        )

    # Restaurant filter options endpoint
    @app.route("/api/restaurants/filter-options", methods=["GET"])
    def get_filter_options():
        """Get filter options for restaurants"""
        try:
            if not db_manager:
                return (
                    jsonify({"success": False, "error": "Database not available"}),
                    503,
                )
            # Get unique values for filter options
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Get certifying agencies
                    cursor.execute(
                        "SELECT DISTINCT certifying_agency FROM restaurants WHERE certifying_agency IS NOT NULL AND certifying_agency != '' ORDER BY certifying_agency"
                    )
                    agencies = [row[0] for row in cursor.fetchall()]
                    # Get kosher categories
                    cursor.execute(
                        "SELECT DISTINCT kosher_category FROM restaurants WHERE kosher_category IS NOT NULL AND kosher_category != '' ORDER BY kosher_category"
                    )
                    kosher_categories = [row[0] for row in cursor.fetchall()]
                    # Get listing types
                    cursor.execute(
                        "SELECT DISTINCT listing_type FROM restaurants WHERE listing_type IS NOT NULL AND listing_type != '' ORDER BY listing_type"
                    )
                    listing_types = [row[0] for row in cursor.fetchall()]
                    # Get price ranges
                    cursor.execute(
                        "SELECT DISTINCT price_range FROM restaurants WHERE price_range IS NOT NULL AND price_range != '' ORDER BY price_range"
                    )
                    price_ranges = [row[0] for row in cursor.fetchall()]
                    # Get counts
                    cursor.execute(
                        "SELECT COUNT(*) FROM restaurants WHERE status = 'active'"
                    )
                    total_count = cursor.fetchone()[0]
                    cursor.execute(
                        "SELECT certifying_agency, COUNT(*) FROM restaurants WHERE status = 'active' AND certifying_agency IS NOT NULL GROUP BY certifying_agency"
                    )
                    agency_counts = dict(cursor.fetchall())
                    cursor.execute(
                        "SELECT kosher_category, COUNT(*) FROM restaurants WHERE status = 'active' AND kosher_category IS NOT NULL GROUP BY kosher_category"
                    )
                    category_counts = dict(cursor.fetchall())
                    cursor.execute(
                        "SELECT listing_type, COUNT(*) FROM restaurants WHERE status = 'active' AND listing_type IS NOT NULL GROUP BY listing_type"
                    )
                    type_counts = dict(cursor.fetchall())
                    cursor.execute(
                        "SELECT price_range, COUNT(*) FROM restaurants WHERE status = 'active' AND price_range IS NOT NULL GROUP BY price_range"
                    )
                    price_counts = dict(cursor.fetchall())
            return jsonify(
                {
                    "success": True,
                    "data": {
                        "agencies": agencies,
                        "kosherCategories": kosher_categories,
                        "listingTypes": listing_types,
                        "priceRanges": price_ranges,
                        "counts": {
                            "agencies": agency_counts,
                            "kosherCategories": category_counts,
                            "listingTypes": type_counts,
                            "priceRanges": price_counts,
                            "total": total_count,
                        },
                    },
                }
            )
        except Exception as e:
            logger.error(f"Error fetching filter options: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to fetch filter options",
                        "details": str(e),
                    }
                ),
                500,
            )

    # Restaurant API endpoints
    @app.route("/api/restaurants", methods=["GET"])
    def get_restaurants():
        """Get restaurants with filtering and pagination"""
        try:
            start_time = datetime.now()
            # Parse query parameters
            limit = request.args.get("limit", type=int, default=50)
            offset = request.args.get("offset", type=int, default=0)
            search = request.args.get("search", type=str)
            city = request.args.get("city", type=str)
            state = request.args.get("state", type=str)
            certifying_agency = request.args.get("certifying_agency", type=str)
            kosher_category = request.args.get("kosher_category", type=str)
            listing_type = request.args.get("listing_type", type=str)
            status = request.args.get("status", type=str, default="active")
            
            # New filter parameters
            price_min = request.args.get("price_min", type=int)
            price_max = request.args.get("price_max", type=int)
            min_rating = request.args.get("min_rating", type=float)
            lat = request.args.get("lat", type=float)
            lng = request.args.get("lng", type=float)
            max_distance_mi = request.args.get("max_distance_mi", type=float, default=50.0)
            dietaries = request.args.getlist("dietary")  # multiple dietary tags
            # Validate parameters
            if limit > 1000:
                limit = 1000
            if limit < 1:
                limit = 50
            if not db_manager:
                return (
                    jsonify({"success": False, "error": "Database not available"}),
                    503,
                )
            # Build query
            query = "SELECT * FROM restaurants WHERE 1=1"
            params = []
            if status:
                query += " AND status = %s"
                params.append(status)
            if search:
                query += " AND (name ILIKE %s OR address ILIKE %s OR city ILIKE %s)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param])
            if city:
                query += " AND city ILIKE %s"
                params.append(f"%{city}%")
            if state:
                query += " AND state ILIKE %s"
                params.append(f"%{state}%")
            if certifying_agency:
                query += " AND certifying_agency ILIKE %s"
                params.append(f"%{certifying_agency}%")
            if kosher_category:
                query += " AND kosher_category ILIKE %s"
                params.append(f"%{kosher_category}%")
            if listing_type:
                query += " AND listing_type ILIKE %s"
                params.append(f"%{listing_type}%")
                
            # Price range filter (convert numeric to textual price_range length)
            if price_min is not None or price_max is not None:
                # Clamp values
                if price_min is not None:
                    price_min = max(1, min(4, price_min))
                if price_max is not None:
                    price_max = max(1, min(4, price_max))
                
                # Convert to textual price_range filter using LENGTH
                if price_min is not None and price_max is not None:
                    query += " AND LENGTH(price_range) BETWEEN %s AND %s"
                    params.extend([price_min, price_max])
                elif price_min is not None:
                    query += " AND LENGTH(price_range) >= %s"
                    params.append(price_min)
                elif price_max is not None:
                    query += " AND LENGTH(price_range) <= %s"
                    params.append(price_max)
                    
            # Rating filter
            if min_rating is not None:
                query += " AND rating >= %s"
                params.append(min_rating)
                
            # Location/distance filter
            if lat is not None and lng is not None:
                # Haversine formula for distance calculation
                query += """
                AND latitude IS NOT NULL AND longitude IS NOT NULL
                AND (
                  3959 * acos(
                    least(1,
                      cos(radians(%s)) * cos(radians(latitude)) *
                      cos(radians(longitude) - radians(%s)) +
                      sin(radians(%s)) * sin(radians(latitude))
                    )
                  )
                ) <= %s
                """
                params.extend([lat, lng, lat, max_distance_mi])
                
            # Dietary filter (multiple values)
            if dietaries:
                # If dietary column is TEXT, use ILIKE for each value
                dietary_conditions = []
                for dietary in dietaries:
                    dietary_conditions.append("dietary ILIKE %s")
                    params.append(f"%{dietary}%")
                query += " AND (" + " OR ".join(dietary_conditions) + ")"
                
            # Get total count
            count_query = query.replace("SELECT *", "SELECT COUNT(*)")
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(count_query, params)
                    total = cursor.fetchone()[0]
            # Add pagination and ordering
            order_by = " ORDER BY name ASC"  # default
            if lat is not None and lng is not None:
                # Sort by distance when location is provided
                order_by = """
                ORDER BY 3959 * acos(
                  least(1,
                    cos(radians(%s)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(%s)) +
                    sin(radians(%s)) * sin(radians(latitude))
                  )
                )
                """
                params.extend([lat, lng, lat])
            
            query += order_by + " LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            # Execute main query
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    restaurants = cursor.fetchall()
                    # Convert to list of dictionaries
                    columns = [desc[0] for desc in cursor.description]
                    restaurants_data = []
                    for row in restaurants:
                        restaurant_dict = dict(zip(columns, row))
                        # Convert datetime objects to strings
                        for key, value in restaurant_dict.items():
                            if isinstance(value, datetime):
                                restaurant_dict[key] = value.isoformat()
                        restaurants_data.append(restaurant_dict)
            response_data = {
                "success": True,
                "restaurants": restaurants_data,
                "total": total,
                "limit": limit,
                "offset": offset,
                "performance": {
                    "query_time_ms": (datetime.now() - start_time).total_seconds()
                    * 1000
                },
            }
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
        """Get a specific restaurant by ID"""
        try:
            if not db_manager:
                return (
                    jsonify({"success": False, "error": "Database not available"}),
                    503,
                )
            query = "SELECT * FROM restaurants WHERE id = %s"
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, [restaurant_id])
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
                    # Convert datetime objects to strings
                    for key, value in restaurant_dict.items():
                        if isinstance(value, datetime):
                            restaurant_dict[key] = value.isoformat()
            return jsonify({"success": True, "restaurant": restaurant_dict})
        except Exception as e:
            logger.error(f"Error fetching restaurant {restaurant_id}: {e}")
            logger.error(traceback.format_exc())
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

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Not found",
                    "message": "The requested resource was not found",
                }
            ),
            404,
        )

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Internal server error",
                    "message": "An unexpected error occurred",
                }
            ),
            500,
        )

    # Register API v4 routes
    try:
        logger.info("Attempting to import simple API v4 routes...")
        # Try to import the simple API v4 routes
        from routes.api_v4_simple import api_v4_simple

        logger.info(f"Simple API v4 blueprint imported: {api_v4_simple}")
        if api_v4_simple is not None:
            app.register_blueprint(api_v4_simple)
            logger.info("Simple API v4 routes registered successfully")
        else:
            logger.warning("Simple API v4 blueprint is None - not registering routes")
    except ImportError as e:
        logger.warning(f"Could not import simple API v4 routes: {e}")
    except Exception as e:
        logger.error(f"Error registering simple API v4 routes: {e}")
        logger.error(traceback.format_exc())
    # Try to register the original API v4 routes as well
    try:
        logger.info("Attempting to import original API v4 routes...")
        from routes.api_v4 import api_v4

        logger.info(f"Original API v4 blueprint imported: {api_v4}")
        if api_v4 is not None:
            app.register_blueprint(api_v4)
            logger.info("Original API v4 routes registered successfully")
        else:
            logger.warning("Original API v4 blueprint is None - not registering routes")
    except ImportError as e:
        logger.warning(f"Could not import original API v4 routes: {e}")
    except Exception as e:
        logger.error(f"Error registering original API v4 routes: {e}")
        logger.error(traceback.format_exc())
    # Register user API routes
    try:
        logger.info("Attempting to import user API routes...")
        from routes.user_api import user_api

        logger.info(f"User API blueprint imported: {user_api}")
        if user_api is not None:
            app.register_blueprint(user_api)
            logger.info("User API routes registered successfully")
        else:
            logger.warning("User API blueprint is None - not registering routes")
    except ImportError as e:
        logger.warning(f"Could not import user API routes: {e}")
    # Register shtetl marketplace API routes
    try:
        logger.info("Attempting to import shtetl marketplace API routes...")
        from routes.shtetl_api import shtetl_bp

        logger.info(f"Shtetl marketplace blueprint imported: {shtetl_bp}")
        if shtetl_bp is not None:
            app.register_blueprint(shtetl_bp)
            logger.info("Shtetl marketplace API routes registered successfully")
        else:
            logger.warning(
                "Shtetl marketplace blueprint is None - not registering routes"
            )
    except ImportError as e:
        logger.warning(f"Could not import shtetl marketplace API routes: {e}")
    except Exception as e:
        logger.error(f"Error registering shtetl marketplace API routes: {e}")
        logger.error(traceback.format_exc())

    # Shtetl store functionality has been merged into the main shtetl blueprint
    # All store routes are now available under /api/v4/shtetl/stores/*
    # Add a simple test endpoint directly in app_factory to verify routing works
    @app.route("/api/v4/direct-test", methods=["GET"])
    def api_v4_direct_test():
        """Direct test endpoint to verify API v4 routing works"""
        return jsonify(
            {
                "success": True,
                "message": "API v4 direct test endpoint is working",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    # Add a debug endpoint to list all routes
    @app.route("/debug/routes", methods=["GET"])
    def debug_routes():
        """Debug endpoint to list all registered routes"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append(
                {
                    "endpoint": rule.endpoint,
                    "methods": list(rule.methods),
                    "rule": rule.rule,
                }
            )
        return jsonify({"success": True, "routes": routes, "total_routes": len(routes)})

    # Add a debug endpoint to test database connection
    @app.route("/debug/db-test", methods=["GET"])
    def debug_db_test():
        """Debug endpoint to test database connection"""
        try:
            # Test the database manager v4
            db_manager = get_db_manager_v4()
            if db_manager:
                # Test connection
                connected = db_manager.connect()
                return jsonify(
                    {
                        "success": True,
                        "database_manager": "available",
                        "connected": connected,
                        "message": "Database manager v4 is working",
                    }
                )
            else:
                return jsonify(
                    {
                        "success": False,
                        "database_manager": "not_available",
                        "message": "Database manager v4 not available",
                    }
                )
        except Exception as e:
            return jsonify(
                {"success": False, "error": str(e), "message": "Database test failed"}
            )

    # Add a debug endpoint to test feature flags
    @app.route("/debug/feature-flags", methods=["GET"])
    def debug_feature_flags():
        """Debug endpoint to test feature flags"""
        try:
            from utils.feature_flags_v4 import api_v4_flags
            import os

            return jsonify(
                {
                    "success": True,
                    "feature_flags": api_v4_flags.get_all_flags(),
                    "environment_variables": {
                        "API_V4_SHTETL": os.getenv("API_V4_SHTETL", "NOT_SET"),
                        "API_V4_SHTETL_in_environ": "API_V4_SHTETL" in os.environ,
                    },
                    "shtetl_enabled": api_v4_flags.is_enabled("shtetl"),
                }
            )
        except Exception as e:
            return jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Feature flags test failed",
                }
            )

    # Add a debug endpoint to test restaurant service creation
    @app.route("/debug/service-test", methods=["GET"])
    def debug_service_test():
        """Debug endpoint to test restaurant service creation"""
        try:
            from routes.api_v4 import create_restaurant_service

            service = create_restaurant_service()
            if service:
                return jsonify(
                    {
                        "success": True,
                        "service": "created",
                        "message": "Restaurant service created successfully",
                    }
                )
            else:
                return jsonify(
                    {
                        "success": False,
                        "service": "not_created",
                        "message": "Restaurant service creation failed",
                    }
                )
        except Exception as e:
            return jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Service creation test failed",
                }
            )

    # Add a debug endpoint to test restaurant creation
    @app.route("/debug/restaurant-test", methods=["POST"])
    def debug_restaurant_test():
        """Debug endpoint to test restaurant creation"""
        try:
            from routes.api_v4 import create_restaurant_service

            service = create_restaurant_service()
            data = {
                "name": "Test Restaurant Debug",
                "address": "789 Test St",
                "city": "Test City",
                "state": "FL",
                "zip_code": "12345",
                "phone_number": "555-1234",
                "kosher_category": "dairy",
                "listing_type": "restaurant",
            }
            result = service.create_restaurant(data)
            return jsonify(
                {
                    "success": True,
                    "result": result,
                    "message": "Restaurant creation test completed",
                }
            )
        except Exception as e:
            return jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Restaurant creation test failed",
                }
            )

    # Add a simple health endpoint
    @app.route("/api/health/basic", methods=["GET"])
    def health_basic():
        """Basic health check endpoint"""
        return jsonify(
            {
                "success": True,
                "status": "healthy",
                "message": "JewGo Backend is running",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    # Add a root health endpoint
    @app.route("/healthz", methods=["GET"])
    def healthz():
        """Root health check endpoint"""
        return jsonify(
            {
                "success": True,
                "status": "healthy",
                "message": "JewGo Backend is running",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    # Pre-warm JWKS cache on application startup
    try:
        from utils.supabase_auth import supabase_auth

        supabase_auth.pre_warm_jwks()
        logger.info("JWKS cache pre-warmed successfully")
        # Schedule periodic JWKS refresh (every hour)
        try:
            from apscheduler.schedulers.background import BackgroundScheduler

            scheduler = BackgroundScheduler()
            scheduler.add_job(
                func=supabase_auth.pre_warm_jwks,
                trigger="interval",
                hours=1,
                id="jwks_refresh",
                name="JWKS Cache Refresh",
            )
            scheduler.start()
            logger.info("JWKS periodic refresh scheduled successfully")
        except ImportError:
            logger.warning("APScheduler not available - JWKS periodic refresh disabled")
        except Exception as e:
            logger.warning(f"Failed to schedule JWKS periodic refresh: {e}")
    except Exception as e:
        logger.warning(f"Failed to pre-warm JWKS cache: {e}")

    # Teardown handler already registered above (lines 87-93) to avoid duplication

    logger.info("JewGo Backend application created successfully")
    return app


# For development
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
