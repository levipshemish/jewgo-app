import os
import re
from datetime import datetime
from typing import Any, Dict, Optional
from flask import Blueprint, current_app, jsonify, request
from utils.logging_config import get_logger
from utils.limiter import limiter
from werkzeug.exceptions import HTTPException

logger = get_logger(__name__)
# Import services with fallbacks
try:
    from services.restaurant_service_v4 import RestaurantServiceV4
except ImportError as e:
    logger.warning(f"Could not import RestaurantServiceV4: {e}")
    RestaurantServiceV4 = None
try:
    from services.review_service_v4 import ReviewServiceV4
except ImportError as e:
    logger.warning(f"Could not import ReviewServiceV4: {e}")
    ReviewServiceV4 = None
try:
    from services.user_service_v4 import UserServiceV4
except ImportError as e:
    logger.warning(f"Could not import UserServiceV4: {e}")
    UserServiceV4 = None
try:
    from services.marketplace_service_v4 import MarketplaceServiceV4
except ImportError as e:
    logger.warning(f"Could not import MarketplaceServiceV4: {e}")
    MarketplaceServiceV4 = None
try:
    from services.order_service_v4 import OrderServiceV4
except ImportError as e:
    logger.warning(f"Could not import OrderServiceV4: {e}")
    OrderServiceV4 = None
try:
    from utils.unified_search_service import (
        SearchFilters,
        SearchType,
        UnifiedSearchService,
    )
except ImportError as e:
    logger.warning(f"Could not import UnifiedSearchService: {e}")
    UnifiedSearchService = None
    SearchFilters = None
    SearchType = None
try:
    from utils.error_handler import (
        APIError,
        DatabaseError,
        ExternalServiceError,
        NotFoundError,
        ValidationError,
    )
except ImportError as e:
    logger.warning(f"Could not import error handler classes: {e}")
    APIError = None
    ValidationError = None
    NotFoundError = None
    DatabaseError = None
    ExternalServiceError = None
try:
    from utils.cache_manager_v4 import CacheManagerV4
except ImportError as e:
    logger.warning(f"Could not import CacheManagerV4: {e}")
    CacheManagerV4 = None
try:
    from utils.config_manager import ConfigManager
except ImportError as e:
    logger.warning(f"Could not import ConfigManager: {e}")
    ConfigManager = None
# Import authentication decorators
try:
    from utils.security import require_admin_auth
except ImportError:
    # Fallback decorator if security module is not available
    def require_admin_auth(f):
        return f


# Super admin auth decorator
try:
    # Use the canonical security decorator to ensure consistent, fail-closed checks
    from utils.security import require_admin as _require_admin

    def require_super_admin_auth(f):
        """Require super_admin using the central security decorator."""
        return _require_admin("super_admin")(f)

except Exception:
    # Fallback: if security module unavailable, leave endpoint unmodified
    def require_super_admin_auth(f):
        return f


# Import Supabase authentication decorators
try:
    from utils.supabase_auth import (
        require_supabase_auth,
        optional_supabase_auth,
        get_current_supabase_user,
        is_supabase_authenticated,
        get_supabase_user_id,
        get_supabase_user_email,
    )
except ImportError:
    # Fallback decorators if Supabase auth module is not available
    def require_supabase_auth(f):
        return f

    def optional_supabase_auth(f):
        return f

    def get_current_supabase_user():
        return None

    def is_supabase_authenticated():
        return False

    def get_supabase_user_id():
        return None

    def get_supabase_user_email():
        return None


# Import feature flag decorators
try:
    from utils.feature_flags_v4 import get_migration_status as get_v4_migration_status
    from utils.feature_flags_v4 import require_api_v4_flag
except ImportError:
    # Fallback decorator if feature flags module is not available
    def require_api_v4_flag(flag_name: str, default: bool = False):
        def fallback_decorator(f):
            return f

        return fallback_decorator


logger = get_logger(__name__)
# !/usr/bin/env python3
"""API Routes v4 - Using the new service layer architecture.
This module provides API endpoints that use the v4 service layer instead of
directly calling the database manager. This provides better separation of
concerns, improved testability, and enhanced error handling.
Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""
# Create Blueprint for v4 API routes - be more lenient with dependencies
essential_dependencies = [
    APIError,
    ValidationError,
    NotFoundError,
    DatabaseError,
    ExternalServiceError,
]
missing_essential = [
    dep.__name__ if dep else "None" for dep in essential_dependencies if not dep
]
if all(essential_dependencies):
    api_v4 = Blueprint("api_v4", __name__, url_prefix="/api/v4")

    # Simple in-memory rate limiter for sensitive role mutation endpoints (dev safeguard only)
    _rate_limits: dict = {}

    def _allow_rate(user_key: str, max_ops: int = 30, window_sec: int = 60) -> bool:
        # Only apply rate limiting in development when explicitly enabled
        if (
            os.getenv("NODE_ENV") != "development"
            or os.getenv("ENABLE_DEV_RATE_LIMITING") != "true"
        ):
            return True

        import time

        now = int(time.time())
        bucket = _rate_limits.get(user_key)
        if not bucket or now - bucket["ts"] >= window_sec:
            bucket = {"count": 0, "ts": now}
        bucket["count"] += 1
        _rate_limits[user_key] = bucket
        return bucket["count"] <= max_ops

    logger.info("API v4 blueprint created successfully")
    # Log which optional dependencies are missing
    optional_dependencies = [
        MarketplaceServiceV4,
        CacheManagerV4,
        ConfigManager,
    ]
    missing_optional = [
        dep.__name__ if dep else "None" for dep in optional_dependencies if not dep
    ]
    if missing_optional:
        logger.info(f"Optional dependencies missing: {missing_optional}")
else:
    logger.warning(f"Essential dependencies missing for api_v4: {missing_essential}")
    api_v4 = None


# Create a safe route decorator that only works when api_v4 is available
def safe_route(path, methods=None, **kwargs):
    """Safe route decorator that only works when api_v4 blueprint is available."""
    if api_v4 is None:
        # Return a no-op decorator when api_v4 is not available
        def no_op_decorator(f):
            logger.warning(
                f"Route {path} not registered - api_v4 blueprint unavailable"
            )
            return f

        return no_op_decorator
    return api_v4.route(path, methods=methods, **kwargs)


def get_service_dependencies():
    """Get service dependencies from app context."""
    try:
        # Get dependencies from app context
        deps = current_app.config.get("dependencies", {})
        # Get database manager v4
        db_manager = deps.get("get_db_manager_v4")()
        if not db_manager:
            logger.error("Database manager v4 not available")
            raise DatabaseError("Database not available")
        # Get cache manager v4
        cache_manager = deps.get("cache_manager_v4")
        if not cache_manager:
            logger.warning("Cache manager v4 not available, using fallback")
            cache_manager = CacheManagerV4(enable_cache=False)
        # Get config manager
        config = deps.get("config_manager")
        if not config:
            config = ConfigManager()
        return db_manager, cache_manager, config
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        raise DatabaseError("Required modules not available")
    except ConnectionError as e:
        logger.error(f"Failed to connect to database: {e}")
        raise DatabaseError("Database connection failed")
    except Exception as e:
        logger.error(f"Failed to get service dependencies: {e}")
        raise DatabaseError("Service dependencies not available")


def create_restaurant_service():
    """Create and return a RestaurantServiceV4 instance."""
    try:
        db_manager, cache_manager, config = get_service_dependencies()
        return RestaurantServiceV4(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
    except DatabaseError as e:
        logger.error(f"Database error creating restaurant service: {e}")
        raise
    except ImportError as e:
        logger.error(f"Import error creating restaurant service: {e}")
        raise DatabaseError("Required modules not available")
    except Exception as e:
        logger.error(f"Failed to create restaurant service: {e}")
        # Fallback: create service directly with database manager
        try:
            from database.database_manager_v4 import DatabaseManager
            from utils.cache_manager_v4 import CacheManagerV4
            from utils.config_manager import ConfigManager

            db_manager = DatabaseManager()
            db_manager.connect()
            cache_manager = CacheManagerV4(enable_cache=False)
            config = ConfigManager()
            return RestaurantServiceV4(
                db_manager=db_manager, cache_manager=cache_manager, config=config
            )
        except ImportError as fallback_error:
            logger.error(
                f"Fallback service creation failed - import error: {fallback_error}"
            )
            raise DatabaseError("Required modules not available")
        except ConnectionError as fallback_error:
            logger.error(
                f"Fallback service creation failed - connection error: {fallback_error}"
            )
            raise DatabaseError("Database connection failed")
        except Exception as fallback_error:
            logger.error(f"Fallback service creation also failed: {fallback_error}")
            raise DatabaseError("Service creation failed")


def create_review_service():
    """Create and return a ReviewServiceV4 instance."""
    db_manager, cache_manager, config = get_service_dependencies()
    return ReviewServiceV4(
        db_manager=db_manager, cache_manager=cache_manager, config=config
    )


def create_user_service():
    """Create and return a UserServiceV4 instance."""
    db_manager, cache_manager, config = get_service_dependencies()
    return UserServiceV4(
        db_manager=db_manager, cache_manager=cache_manager, config=config
    )


def create_marketplace_service():
    """Create and return a MarketplaceServiceV4 instance."""
    try:
        db_manager, cache_manager, config = get_service_dependencies()
        if not db_manager:
            logger.error("Database manager not available for marketplace service")
            return None
        service = MarketplaceServiceV4(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
        if service:
            logger.info("MarketplaceServiceV4 created successfully")
        else:
            logger.error("Failed to create MarketplaceServiceV4")
        return service
    except DatabaseError as e:
        logger.error(f"Database error creating marketplace service: {e}")
        return None
    except ImportError as e:
        logger.error(f"Import error creating marketplace service: {e}")
        return None
    except Exception as e:
        logger.error(f"Error creating marketplace service: {e}")
        return None


def get_marketplace_service():
    """Get or create a MarketplaceServiceV4 instance."""
    try:
        return create_marketplace_service()
    except DatabaseError as e:
        logger.error(f"Database error getting marketplace service: {e}")
        return None
    except ImportError as e:
        logger.error(f"Import error getting marketplace service: {e}")
        return None
    except Exception as e:
        logger.error(f"Error getting marketplace service: {e}")
        return None


def success_response(data: Any, message: str = "Success", status_code: int = 200):
    """Create a standardized success response."""
    return jsonify({"success": True, "message": message, "data": data})


def error_response(
    message: str, status_code: int = 500, details: Optional[Dict] = None
):
    """Create a standardized error response."""
    response = {"success": False, "error": message, "status_code": status_code}
    if details:
        response["details"] = details
    return jsonify(response)


def not_found_response(message: str, resource_type: str = "resource"):
    """Create a standardized not found response."""
    return error_response(f"{resource_type.capitalize()} not found: {message}", 404)


# Restaurant Routes
@safe_route("/restaurants", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def get_restaurants():
    """Get restaurants with optional filtering and pagination using v4 service."""
    try:
        # Get query parameters
        kosher_type = request.args.get("kosher_type")
        status = request.args.get("status")
        limit = min(int(request.args.get("limit", 100)), 1000)
        offset = max(int(request.args.get("offset", 0)), 0)
        business_types = request.args.getlist("business_types")
        # Build filters
        filters = {}
        if kosher_type:
            filters["kosher_category"] = kosher_type
        if status:
            filters["status"] = status
        if business_types:
            filters["business_types"] = business_types
        # Optional field projection to reduce payload size
        fields_param = request.args.get("fields")
        selected_fields = None
        if fields_param:
            # Accept comma-separated list, trim whitespace
            selected_fields = {f.strip() for f in fields_param.split(",") if f.strip()}
        # Use v4 service
        service = create_restaurant_service()
        # Get total count via DB for accurate pagination
        db_manager, _, _ = get_service_dependencies()
        total_count = 0
        try:
            if db_manager and hasattr(db_manager, "get_restaurants_count"):
                total_count = db_manager.get_restaurants_count(
                    filters=filters
                )
        except Exception:
            # Fallback if count fails
            total_count = 0
        # Fetch only the current page from DB
        paginated_restaurants = service.get_all_restaurants(
            filters=filters,
            limit=limit,
            offset=offset,
        )
        # Apply field selection projection if requested
        if selected_fields:
            def _project(item: dict) -> dict:
                return {k: v for k, v in item.items() if k in selected_fields}
            paginated_restaurants = [_project(r) for r in paginated_restaurants]
        # Calculate total pages for frontend compatibility
        total_pages = (total_count + limit - 1) // limit if total_count else 0
        # Return response in the format expected by frontend
        return (
            jsonify(
                {
                    "success": True,
                    "restaurants": paginated_restaurants,
                    "totalPages": total_pages,
                    "totalRestaurants": total_count,
                    "page": (offset // limit) + 1,
                    "limit": limit,
                    "message": f"Retrieved {len(paginated_restaurants)} restaurants",
                }
            ),
            200,
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurants")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching restaurants", error=str(e))
        return error_response("Failed to fetch restaurants", 500)


@safe_route("/restaurants/search", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def search_restaurants():
    """Search restaurants by query using unified search service."""
    try:
        query = request.args.get("q", "").strip()
        if not query:
            return error_response("Query parameter 'q' is required", 400)
        limit = min(int(request.args.get("limit", 20)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
        # Get search filters from query parameters
        filters = SearchFilters(
            query=query,
            kosher_type=request.args.get("kosher_type"),
            certifying_agency=request.args.get("certifying_agency"),
            city=request.args.get("city"),
            state=request.args.get("state"),
            category=request.args.get("category"),
            listing_type=request.args.get("listing_type"),
            price_range=request.args.get("price_range"),
            min_rating=(
                float(request.args.get("min_rating"))
                if request.args.get("min_rating")
                else None
            ),
            has_reviews=(
                request.args.get("has_reviews") == "true"
                if request.args.get("has_reviews")
                else None
            ),
            open_now=(
                request.args.get("open_now") == "true"
                if request.args.get("open_now")
                else None
            ),
            is_cholov_yisroel=(
                request.args.get("is_cholov_yisroel") == "true"
                if request.args.get("is_cholov_yisroel")
                else None
            ),
            is_pas_yisroel=(
                request.args.get("is_pas_yisroel") == "true"
                if request.args.get("is_pas_yisroel")
                else None
            ),
            cholov_stam=(
                request.args.get("cholov_stam") == "true"
                if request.args.get("cholov_stam")
                else None
            ),
            lat=float(request.args.get("lat")) if request.args.get("lat") else None,
            lng=float(request.args.get("lng")) if request.args.get("lng") else None,
            radius=(
                float(request.args.get("radius"))
                if request.args.get("radius")
                else None
            ),
            limit=limit,
            offset=offset,
        )
        # Use unified search service
        db_manager, cache_manager, config = get_service_dependencies()
        search_service = UnifiedSearchService(db_manager, cache_manager)
        # Determine search type based on parameters
        if filters.lat and filters.lng:
            search_type = SearchType.LOCATION
        elif filters.kosher_type or filters.certifying_agency or filters.category:
            search_type = SearchType.ADVANCED
        else:
            search_type = SearchType.BASIC
        # Perform search
        search_response = search_service.search(filters, search_type)
        return success_response(
            {
                "results": [result.to_dict() for result in search_response.results],
                "query": query,
                "total_results": search_response.total_results,
                "execution_time": search_response.execution_time,
                "suggestions": search_response.suggestions,
                "statistics": search_response.statistics,
            }
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error searching restaurants", error=str(e))
        return error_response("Failed to search restaurants", 500)


@safe_route("/restaurants/<int:restaurant_id>", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID using v4 service."""
    try:
        service = create_restaurant_service()
        restaurant = service.get_restaurant_by_id(restaurant_id)
        if not restaurant:
            return not_found_response(
                f"Restaurant with ID {restaurant_id}", "restaurant"
            )
        return success_response({"restaurant": restaurant})
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error fetching restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to fetch restaurant", 500)


@safe_route("/restaurants", methods=["POST"])
@require_api_v4_flag("api_v4_restaurants")
@limiter.limit("120/minute")
def create_restaurant():
    """Create a new restaurant using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        logger.info("Received restaurant creation request", data=data)
        # Debug business_images field
        if "business_images" in data:
            logger.info(
                "business_images field details",
                type=type(data["business_images"]),
                value=data["business_images"],
            )
            # Check if it's a JSON string that needs to be parsed
            if isinstance(data["business_images"], str):
                try:
                    import json

                    parsed_images = json.loads(data["business_images"])
                    logger.info(
                        "Parsed business_images from JSON string",
                        parsed_type=type(parsed_images),
                        parsed_value=parsed_images,
                    )
                    data["business_images"] = parsed_images
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(
                        "Failed to parse business_images as JSON", error=str(e)
                    )
        service = create_restaurant_service()
        logger.info("Restaurant service created successfully")
        restaurant_data = service.create_restaurant(data)
        logger.info("Restaurant creation result", result=restaurant_data)
        if restaurant_data:
            return success_response(
                {"restaurant": restaurant_data},
                "Restaurant created successfully",
                201,
            )
        else:
            return error_response("Failed to create restaurant", 500)
    except ValidationError as e:
        logger.error("Validation error", error=str(e))
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        logger.error("Database error", error=str(e))
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error creating restaurant", error=str(e))
        return error_response("Failed to create restaurant", 500)


@safe_route("/restaurants/by-name/<name>", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def get_restaurant_by_name(name: str):
    """Get a restaurant by URL-friendly name."""
    try:
        # Use the same approach as the working restaurants endpoint
        # Get database manager from the app context
        from flask import current_app

        # Try to get the database manager from the app context
        db_manager = None
        try:
            # Try to access the database manager through the app context
            if hasattr(current_app, "deps") and "get_db_manager" in current_app.deps:
                db_manager = current_app.deps["get_db_manager"]()
            else:
                # Fallback: create a new database manager instance
                from database.database_manager_v3 import EnhancedDatabaseManager

                db_manager = EnhancedDatabaseManager()
                if not db_manager.connect():
                    return error_response("Database connection failed", 503)
        except Exception as e:
            logger.error(f"Failed to get database manager: {e}")
            return error_response("Database connection failed", 503)

        try:
            # Get all restaurants using the database manager
            restaurants = db_manager.get_restaurants(limit=1000, as_dict=True)
            logger.info(f"Retrieved {len(restaurants)} restaurants from database")

            # Find restaurant by URL-friendly name
            for restaurant in restaurants:
                restaurant_url_name = restaurant.get("name", "").lower()
                restaurant_url_name = re.sub(r"[^a-z0-9\s-]", "", restaurant_url_name)
                restaurant_url_name = re.sub(r"\s+", "-", restaurant_url_name)
                restaurant_url_name = re.sub(r"-+", "-", restaurant_url_name).strip()

                if restaurant_url_name == name.lower():
                    logger.info(
                        f"Found restaurant: {restaurant.get('name')} (ID: {restaurant.get('id')})"
                    )
                    return success_response({"restaurant": restaurant})

            logger.warning(f"No restaurant found with name: {name}")
            return not_found_response(f"Restaurant with name '{name}'", "restaurant")

        finally:
            # Close database connection if we created it
            try:
                if hasattr(db_manager, "close"):
                    db_manager.close()
            except Exception as e:
                logger.warning(f"Error closing database connection: {e}")

    except Exception as e:
        logger.exception("Error fetching restaurant by name", name=name, error=str(e))
        return error_response("Failed to fetch restaurant", 500)


@safe_route("/restaurants/<int:restaurant_id>", methods=["PUT"])
@require_api_v4_flag("api_v4_restaurants")
@limiter.limit("120/minute")
def update_restaurant(restaurant_id: int):
    """Update a restaurant using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        service = create_restaurant_service()
        success = service.update_restaurant(restaurant_id, data)
        if success:
            # Get the updated restaurant
            restaurant = service.get_restaurant_by_id(restaurant_id)
            return success_response(
                {"restaurant": restaurant}, "Restaurant updated successfully"
            )
        else:
            return error_response("Failed to update restaurant", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error updating restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to update restaurant", 500)


@safe_route("/restaurants/<int:restaurant_id>", methods=["DELETE"])
@require_api_v4_flag("api_v4_restaurants")
@limiter.limit("120/minute")
def delete_restaurant(restaurant_id: int):
    """Delete a restaurant using v4 service."""
    try:
        service = create_restaurant_service()
        success = service.delete_restaurant(restaurant_id)
        if success:
            return success_response(
                {"restaurant_id": restaurant_id}, "Restaurant deleted successfully"
            )
        else:
            return error_response("Failed to delete restaurant", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error deleting restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to delete restaurant", 500)


def _fetch_filter_rows(db_manager):
    """Fetch filter rows using the repository pattern instead of raw SQL."""
    try:
        # Use the restaurant repository to get filter data
        restaurants = db_manager.restaurant_repo.get_restaurants_with_filters(
            status="active",
            limit=10000,  # Get all active restaurants for filtering
            offset=0
        )
        
        # Extract unique values from the restaurant data
        agencies = set()
        kosher_categories = set()
        listing_types = set()
        price_ranges = set()
        cities = set()
        states = set()
        
        for restaurant in restaurants:
            if hasattr(restaurant, 'certifying_agency') and restaurant.certifying_agency:
                agencies.add(restaurant.certifying_agency)
            if hasattr(restaurant, 'kosher_category') and restaurant.kosher_category:
                kosher_categories.add(restaurant.kosher_category)
            if hasattr(restaurant, 'listing_type') and restaurant.listing_type:
                listing_types.add(restaurant.listing_type)
            if hasattr(restaurant, 'price_range') and restaurant.price_range:
                price_ranges.add(restaurant.price_range)
            if hasattr(restaurant, 'city') and restaurant.city:
                cities.add(restaurant.city)
            if hasattr(restaurant, 'state') and restaurant.state:
                states.add(restaurant.state)
        
        # Return as a list of tuples to maintain compatibility with existing code
        # Each tuple represents one restaurant's data
        results = []
        for restaurant in restaurants:
            results.append((
                getattr(restaurant, 'certifying_agency', None),
                getattr(restaurant, 'kosher_category', None),
                getattr(restaurant, 'listing_type', None),
                getattr(restaurant, 'price_range', None),
                getattr(restaurant, 'city', None),
                getattr(restaurant, 'state', None)
            ))
        
        return results
        
    except Exception as e:
        logger.error(f"Error fetching filter rows: {e}")
        # Return empty results on error
        return []


def _collect_sets_from_rows(rows):
    agencies, kosher_categories, listing_types, price_ranges, cities, states = (
        set(),
        set(),
        set(),
        set(),
        set(),
        set(),
    )
    for row in rows:
        if row[0]:
            agencies.add(row[0])
        if row[1]:
            kosher_categories.add(row[1])
        if row[2]:
            listing_types.add(row[2])
        if row[3]:
            price_ranges.add(row[3])
        if row[4]:
            cities.add(row[4])
        if row[5]:
            states.add(row[5])
    return agencies, kosher_categories, listing_types, price_ranges, cities, states


def _collect_sets_from_restaurants(restaurants):
    agencies = {
        r.get("certifying_agency") for r in restaurants if r.get("certifying_agency")
    }
    kosher_categories = {
        r.get("kosher_category") for r in restaurants if r.get("kosher_category")
    }
    listing_types = {
        r.get("listing_type") for r in restaurants if r.get("listing_type")
    }
    price_ranges = {r.get("price_range") for r in restaurants if r.get("price_range")}
    cities = {r.get("city") for r in restaurants if r.get("city")}
    states = {r.get("state") for r in restaurants if r.get("state")}
    return agencies, kosher_categories, listing_types, price_ranges, cities, states


def _build_filter_options_response(sets_tuple):
    agencies, kosher_categories, listing_types, price_ranges, cities, states = (
        sets_tuple
    )
    return {
        "agencies": sorted(list(agencies)),
        "kosherCategories": sorted(list(kosher_categories)),
        "listingTypes": sorted(list(listing_types)),
        "priceRanges": sorted(list(price_ranges)),
        "cities": sorted(list(cities)),
        "states": sorted(list(states)),
    }


@safe_route("/restaurants/filter-options", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def get_restaurant_filter_options():
    """Get restaurant filter options with caching and optimized DB path."""
    try:
        db_manager, cache_manager, _ = get_service_dependencies()
        cache_key = "restaurant_filter_options"
        # Try cache first
        if cache_manager:
            cached_options = cache_manager.get(cache_key)
            if cached_options:
                logger.debug("Returning cached filter options")
                return success_response(cached_options)
        # Try optimized DB path, then fallback to service
        try:
            rows = _fetch_filter_rows(db_manager)
            sets_tuple = _collect_sets_from_rows(rows)
        except Exception as db_error:
            logger.warning(
                "Optimized DB query failed, falling back to service method: %s",
                db_error,
            )
            service = create_restaurant_service()
            restaurants = service.get_all_restaurants()
            sets_tuple = _collect_sets_from_restaurants(restaurants)
        filter_options = _build_filter_options_response(sets_tuple)
        if cache_manager:
            cache_manager.set(cache_key, filter_options, ttl=900)
            logger.debug("Cached filter options for 15 minutes")
        return success_response(filter_options)
    except Exception as e:
        logger.exception("Error fetching filter options", error=str(e))
        return error_response("Failed to fetch filter options", 500)


# Restaurant Approval/Rejection Routes
@safe_route("/restaurants/<int:restaurant_id>/approve", methods=["PUT"])
@require_api_v4_flag("api_v4_restaurants")
@limiter.limit("30/minute")
def approve_restaurant(restaurant_id: int):
    """Approve a restaurant submission using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        status = data.get("status", "approved")
        service = create_restaurant_service()
        success = service.update_restaurant_status(restaurant_id, status, "approved")
        if success:
            # Get the updated restaurant
            restaurant = service.get_restaurant_by_id(restaurant_id)
            return success_response(
                {"restaurant": restaurant, "status": status},
                "Restaurant approved successfully",
            )
        else:
            return error_response("Failed to approve restaurant", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error approving restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to approve restaurant", 500)


@safe_route("/restaurants/<int:restaurant_id>/reject", methods=["PUT"])
@require_api_v4_flag("api_v4_restaurants")
@limiter.limit("30/minute")
def reject_restaurant(restaurant_id: int):
    """Reject a restaurant submission using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        status = data.get("status", "rejected")
        reason = data.get("reason", "Rejected by admin")
        service = create_restaurant_service()
        success = service.update_restaurant_status(
            restaurant_id, status, "rejected", reason
        )
        if success:
            # Get the updated restaurant
            restaurant = service.get_restaurant_by_id(restaurant_id)
            return success_response(
                {"restaurant": restaurant, "status": status, "reason": reason},
                "Restaurant rejected successfully",
            )
        else:
            return error_response("Failed to reject restaurant", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error rejecting restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to reject restaurant", 500)


@safe_route("/restaurants/<int:restaurant_id>/hours", methods=["GET"])
@require_api_v4_flag("api_v4_restaurants")
def get_restaurant_hours(restaurant_id: int):
    """Get restaurant hours using v4 service."""
    try:
        service = create_restaurant_service()
        restaurant = service.get_restaurant_by_id(restaurant_id)
        if not restaurant:
            return not_found_response("Restaurant not found", "restaurant")
        # Extract hours data from restaurant
        hours_data = {
            "status": "available" if restaurant.get("hours_open") else "unavailable",
            "message": (
                "Hours information available"
                if restaurant.get("hours_open")
                else "Hours information not available"
            ),
            "is_open": False,  # This would need to be calculated based on current time
            "today_hours": {},  # This would need to be parsed from hours_open
            "formatted_hours": (
                restaurant.get("hours_open", "").split("\n")
                if restaurant.get("hours_open")
                else []
            ),
            "timezone": "America/New_York",  # Default timezone
            "last_updated": restaurant.get("updated_at", datetime.now().isoformat()),
        }
        return success_response(hours_data, "Restaurant hours retrieved successfully")
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error fetching restaurant hours", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to fetch restaurant hours", 500)


# Review Routes
@safe_route("/reviews", methods=["GET"])
@require_api_v4_flag("api_v4_reviews")
def get_reviews():
    """Get reviews with optional filtering using v4 service."""
    try:
        (
            restaurant_id,
            status,
            limit,
            offset,
            include_google_reviews,
        ) = _parse_review_query_params(request)
        filters = _build_review_filters(restaurant_id, status)

        service = create_review_service()
        _log_fetch_reviews(restaurant_id, status, limit, offset, include_google_reviews)

        reviews = _fetch_reviews(
            service,
            restaurant_id,
            status,
            limit,
            offset,
            filters,
            include_google_reviews,
        )

        total_count = _compute_total_reviews(service, restaurant_id, status, filters)
        if include_google_reviews and restaurant_id:
            total_count += _safe_google_review_count(service, restaurant_id)

        return success_response(
            {
                "reviews": reviews,
                "pagination": _build_pagination(total_count, limit, offset),
            }
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching reviews", error=str(e))
        return error_response("Failed to fetch reviews", 500)


def _parse_review_query_params(req):
    restaurant_id = req.args.get("restaurantId")
    status = req.args.get("status", "approved")
    limit = int(req.args.get("limit", 10))
    offset = int(req.args.get("offset", 0))
    include_google_reviews = (
        req.args.get("includeGoogleReviews", "true").lower() == "true"
    )
    return restaurant_id, status, limit, offset, include_google_reviews


def _build_review_filters(restaurant_id, status):
    filters: Dict[str, Any] = {}
    if restaurant_id:
        filters["restaurant_id"] = int(restaurant_id)
    if status:
        filters["status"] = status
    return filters


def _log_fetch_reviews(restaurant_id, status, limit, offset, include_google_reviews):
    logger.info(
        "Fetching reviews",
        extra={
            "restaurant_id": restaurant_id,
            "status": status,
            "limit": limit,
            "offset": offset,
            "include_google_reviews": include_google_reviews,
        },
    )


def _fetch_reviews(
    service, restaurant_id, status, limit, offset, filters, include_google_reviews
):
    return service.get_reviews(
        restaurant_id=int(restaurant_id) if restaurant_id else None,
        status=status,
        limit=limit,
        offset=offset,
        filters=filters,
        include_google_reviews=include_google_reviews,
    )


def _compute_total_reviews(service, restaurant_id, status, filters):
    return service.get_reviews_count(
        restaurant_id=int(restaurant_id) if restaurant_id else None,
        status=status,
        filters=filters,
    )


def _safe_google_review_count(service, restaurant_id: str) -> int:
    try:
        restaurant = service.db_manager.get_restaurant_by_id(int(restaurant_id))
        if restaurant and restaurant.get("place_id"):
            return service.db_manager.get_google_reviews_count(
                restaurant_id=int(restaurant_id),
                place_id=restaurant["place_id"],
            )
    except Exception as e:
        logger.warning("Error getting Google reviews count", extra={"error": str(e)})
    return 0


def _build_pagination(
    total_count: int, limit: int, offset: int
) -> Dict[str, int | bool]:
    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "hasMore": offset + limit < total_count,
        "currentPage": (offset // limit) + 1,
        "totalPages": (total_count + limit - 1) // limit,
    }


@safe_route("/reviews/sync-google", methods=["POST"])
@require_api_v4_flag("api_v4_reviews")
@limiter.limit("30/minute")
def sync_google_reviews():
    """Sync Google reviews for restaurants."""
    try:
        from services.google_review_sync_service import GoogleReviewSyncService

        data = request.get_json(silent=True) or {}
        restaurant_id = data.get("restaurantId")
        place_id = data.get("placeId")
        max_reviews = int(data.get("maxReviews", 20))

        service = GoogleReviewSyncService()

        if restaurant_id and place_id:
            # Sync for specific restaurant
            success = service.sync_restaurant_google_reviews(
                restaurant_id=int(restaurant_id),
                place_id=place_id,
                max_reviews=max_reviews,
            )

            if success:
                return success_response(
                    {
                        "message": f"Successfully synced Google reviews for restaurant {restaurant_id}"
                    }
                )
            else:
                return error_response(
                    f"Failed to sync Google reviews for restaurant {restaurant_id}", 500
                )
        else:
            # Sync for all restaurants
            results = service.sync_all_restaurants_google_reviews(
                max_reviews=max_reviews
            )

            return success_response(
                {"message": "Google review sync completed", "results": results}
            )

    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error syncing Google reviews", error=str(e))
        return error_response("Failed to sync Google reviews", 500)


@safe_route("/reviews", methods=["POST"])
@require_api_v4_flag("api_v4_reviews")
@limiter.limit("120/minute")
def create_review():
    """Create a new review using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        service = create_review_service()
        review_id = service.create_review(data)
        if review_id:
            # Get the created review
            review = service.get_review_by_id(review_id)
            return success_response(
                {"review": review, "id": review_id}, "Review created successfully", 201
            )
        else:
            return error_response("Failed to create review", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error creating review", error=str(e))
        return error_response("Failed to create review", 500)


@safe_route("/reviews/<int:review_id>", methods=["GET"])
@require_api_v4_flag("api_v4_reviews")
def get_review(review_id: int):
    """Get a specific review by ID using v4 service."""
    try:
        service = create_review_service()
        review = service.get_review_by_id(review_id)
        if not review:
            return not_found_response(f"Review with ID {review_id}", "review")
        return success_response({"review": review})
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "review")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching review", review_id=review_id, error=str(e))
        return error_response("Failed to fetch review", 500)


@safe_route("/reviews/<int:review_id>", methods=["PUT"])
@require_api_v4_flag("api_v4_reviews")
@limiter.limit("120/minute")
def update_review(review_id: int):
    """Update a review using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        service = create_review_service()
        success = service.update_review(review_id, data)
        if success:
            # Get the updated review
            review = service.get_review_by_id(review_id)
            return success_response({"review": review}, "Review updated successfully")
        else:
            return error_response("Failed to update review", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "review")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error updating review", review_id=review_id, error=str(e))
        return error_response("Failed to update review", 500)


@safe_route("/reviews/<int:review_id>", methods=["DELETE"])
@require_api_v4_flag("api_v4_reviews")
@limiter.limit("120/minute")
def delete_review(review_id: int):
    """Delete a review using v4 service."""
    try:
        service = create_review_service()
        success = service.delete_review(review_id)
        if success:
            return success_response({"id": review_id}, "Review deleted successfully")
        else:
            return error_response("Failed to delete review", 500)
    except NotFoundError as e:
        return not_found_response(str(e), "review")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error deleting review", review_id=review_id, error=str(e))
        return error_response("Failed to delete review", 500)


# User Routes (Admin only)
@safe_route("/admin/users", methods=["GET"])
@limiter.limit("30/minute")
@require_api_v4_flag("api_v4_users")
@require_admin_auth
def admin_get_users():
    """Get all users for admin management using v4 service."""
    try:
        page = int(request.args.get("page", 1))
        limit = min(int(request.args.get("limit", 20)), 100)
        search = request.args.get("search", "").strip()
        # Build filters
        filters = {}
        if search:
            filters["search"] = search
        service = create_user_service()
        users = service.get_users(
            limit=limit, offset=(page - 1) * limit, filters=filters
        )
        total_count = service.get_users_count(filters=filters)
        return success_response(
            {
                "users": users,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit,
                },
            }
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching users", error=str(e))
        return error_response("Failed to fetch users", 500)


@safe_route("/admin/users", methods=["PUT"])
@limiter.limit("30/minute")
@require_api_v4_flag("api_v4_users")
@require_admin_auth
def admin_update_user():
    """Update a user's admin role using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get("userId") or data.get("id")
        is_super_admin = data.get("isSuperAdmin")
        if not user_id or is_super_admin is None:
            return error_response("userId and isSuperAdmin are required", 400)
        service = create_user_service()
        success = service.update_user_role(user_id, is_super_admin)
        if success:
            return success_response({"success": True}, "User updated successfully")
        else:
            return error_response("Failed to update user", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error updating user", error=str(e))
        return error_response("Failed to update user", 500)


@safe_route("/admin/users", methods=["DELETE"])
@limiter.limit("30/minute")
@require_api_v4_flag("api_v4_users")
@require_admin_auth
def admin_delete_user():
    """Delete a user using v4 service."""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get("userId") or data.get("id")
        if not user_id:
            return error_response("userId is required", 400)
        service = create_user_service()
        success = service.delete_user(user_id)
        if success:
            return success_response({"success": True}, "User deleted successfully")
        else:
            return error_response("Failed to delete user", 500)
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "user")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error deleting user", error=str(e))
        return error_response("Failed to delete user", 500)


# Role Management Routes
@safe_route("/admin/roles/assign", methods=["POST"])
@limiter.limit("30/minute")
@require_super_admin_auth
def assign_admin_role():
    """Assign an admin role to a user"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        user_id, role, expires_at, notes = _parse_role_mutation_body(data)
        if not user_id or not role:
            return error_response("user_id and role are required", 400)

        current_user = _require_current_user()
        if isinstance(current_user, tuple):
            return current_user

        if not _is_allowed_role(role):
            return error_response(
                "Invalid role. Must be one of: moderator, data_admin, system_admin, super_admin",
                400,
            )

        perm_err = _check_role_assign_permissions(current_user)
        if perm_err:
            return perm_err

        fmt_err = _validate_expires_at(expires_at)
        if fmt_err:
            return fmt_err

        prep = _prepare_role_mutation(current_user, action_prefix="roles_assign")
        if isinstance(prep, tuple):
            return prep
        user_service = prep

        return _assign_role_and_respond(
            user_service,
            user_id=user_id,
            role=role,
            assigned_by=current_user["id"],
            expires_at=expires_at,
            notes=notes,
        )

    except ValueError as e:
        return error_response(str(e), 400)
    except ExternalServiceError:
        return error_response("Role service unavailable", 503)
    except Exception as e:
        logger.exception(f"Error assigning admin role: {str(e)}")
        return error_response("Internal server error", 500)


@safe_route("/admin/roles/revoke", methods=["POST"])
@limiter.limit("30/minute")
@require_super_admin_auth
def revoke_admin_role():
    """Revoke an admin role from a user"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        user_id = data.get("user_id")
        role = data.get("role")
        err = _validate_revoke_request(user_id, role)
        if err:
            return err

        current_user = _require_current_user()
        if isinstance(current_user, tuple):
            return current_user

        perm_err = _check_revoke_constraints(current_user, role, user_id)
        if perm_err:
            return perm_err

        prep = _prepare_role_mutation(current_user, action_prefix="roles_revoke")
        if isinstance(prep, tuple):
            return prep
        user_service = prep

        guard_err = _guard_last_super_admin(user_service, role)
        if guard_err:
            return guard_err

        return _revoke_role_and_respond(user_service, user_id, role, current_user["id"])

    except ValueError as e:
        return error_response(str(e), 400)
    except ExternalServiceError:
        return error_response("Role service unavailable", 503)
    except Exception as e:
        logger.exception(f"Error revoking admin role: {str(e)}")
        return error_response("Internal server error", 500)


def _parse_role_mutation_body(data: Dict[str, Any]):
    return (
        data.get("user_id"),
        data.get("role"),
        data.get("expires_at"),
        data.get("notes"),
    )


def _require_current_user():
    current_user = get_current_supabase_user()
    if not current_user:
        return error_response("Authentication required", 401)
    return current_user


def _is_allowed_role(role: str) -> bool:
    return role in {"moderator", "data_admin", "system_admin", "super_admin"}


def _is_super_admin_user(user: Dict[str, Any]) -> bool:
    user_role = user.get("role") or user.get("adminRole")
    return user_role == "super_admin"


def _check_role_assign_permissions(current_user: Dict[str, Any]):
    if not _is_super_admin_user(current_user):
        return error_response(
            "Insufficient permissions: super_admin role required", 403
        )
    return None


def _validate_expires_at(expires_at: Optional[str]):
    if not expires_at:
        return None
    try:
        iso = expires_at.replace("Z", "+00:00")
        datetime.fromisoformat(iso)
        return None
    except Exception:
        return error_response("Invalid expires_at format. Use ISO8601 UTC.", 400)


def _prepare_role_mutation(current_user: Dict[str, Any], action_prefix: str):
    if not _allow_rate(f"{action_prefix}_{current_user['id']}"):
        return error_response("Too many requests", 429)
    user_service = _require_user_service()
    return user_service


def _assign_role_and_respond(
    user_service,
    user_id: str,
    role: str,
    assigned_by: str,
    expires_at: Optional[str],
    notes: Optional[str],
):
    result = user_service.assign_user_role(
        target_user_id=user_id,
        role=role,
        assigned_by_user_id=assigned_by,
        expires_at=expires_at,
        notes=notes,
    )
    if isinstance(result, dict) and result.get("success"):
        _invalidate_role_cache_safe(user_id)
        return success_response(
            _build_role_assigned_payload(user_id, role, assigned_by),
            "Role assigned successfully",
        )
    if isinstance(result, dict) and "error" in result:
        return _map_role_service_error(result, default_message="Failed to assign role")
    return error_response("Failed to assign role", 500)


def _validate_revoke_request(user_id: Optional[str], role: Optional[str]):
    if not user_id or not role:
        return error_response("user_id and role are required", 400)
    if role not in {"moderator", "data_admin", "system_admin", "super_admin"}:
        return error_response(
            "Invalid role. Must be one of: moderator, data_admin, system_admin, super_admin",
            400,
        )
    return None


def _check_revoke_constraints(current_user: Dict[str, Any], role: str, user_id: str):
    if not _is_super_admin_user(current_user):
        return error_response(
            "Insufficient permissions: super_admin role required", 403
        )
    if role == "super_admin" and user_id == current_user["id"]:
        return error_response("Cannot revoke your own super_admin role", 409)
    return None


def _require_user_service():
    user_service = create_user_service() if UserServiceV4 else None
    if not user_service:
        return error_response("User service not available", 503)
    return user_service


def _map_role_service_error(result: Dict[str, Any], default_message: str):
    error_type = result.get("error_type")
    if error_type == "conflict":
        return error_response(result.get("error", "Conflict"), 409)
    if error_type == "not_found":
        return error_response(result.get("error", "Not found"), 404)
    status_code = result.get("status_code", 500)
    return error_response(result.get("error", default_message), status_code)


def _guard_last_super_admin(user_service, role: str):
    if role != "super_admin":
        return None
    try:
        count = 0
        if hasattr(user_service, "get_active_super_admin_count"):
            count = user_service.get_active_super_admin_count()
        if count <= 1:
            return error_response("Cannot remove the last super_admin", 409)
    except Exception as e:
        logger.warning("Could not verify super_admin count", extra={"error": str(e)})
        return error_response("Cannot verify super_admin count for safe removal", 503)
    return None


def _revoke_role_and_respond(user_service, user_id: str, role: str, removed_by: str):
    result = user_service.revoke_user_role(
        target_user_id=user_id, role=role, removed_by_user_id=removed_by
    )
    if isinstance(result, dict) and result.get("success"):
        _invalidate_role_cache_safe(user_id)
        return success_response(
            _build_role_revoked_payload(user_id, role, removed_by),
            "Role revoked successfully",
        )
    if isinstance(result, dict) and "error" in result:
        return _map_role_service_error(result, default_message="Failed to revoke role")
    return error_response("Failed to revoke role", 500)


def _invalidate_role_cache_safe(user_id: str) -> None:
    try:
        from utils.supabase_role_manager import get_role_manager

        rm = get_role_manager()
        rm.invalidate_user_role(user_id)
    except Exception:
        pass


def _build_role_assigned_payload(
    user_id: str, role: str, assigned_by: str
) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "role": role,
        "assigned_by": assigned_by,
        "assigned_at": datetime.utcnow().isoformat(),
    }


def _build_role_revoked_payload(
    user_id: str, role: str, removed_by: str
) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "role": role,
        "removed_by": removed_by,
        "removed_at": datetime.utcnow().isoformat(),
    }


@safe_route("/admin/roles", methods=["GET"])
@require_admin_auth
def get_admin_roles():
    """Get list of users with their admin roles"""
    try:
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 50, type=int)
        search = request.args.get("search", "")
        user_id = request.args.get("user_id")
        role_filter = request.args.get("role")
        include_all = request.args.get("include_all", "false").lower() == "true"
        include_expired = request.args.get("include_expired", "false").lower() == "true"

        # Validate pagination parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 50

        # Create user service instance
        user_service = create_user_service() if UserServiceV4 else None
        if not user_service:
            return error_response("User service not available", 503)

        users_with_roles = user_service.get_user_roles(
            user_id=user_id,
            page=page,
            limit=limit,
            search=search,
            role_filter=role_filter,
            include_all=include_all,
            include_expired=include_expired,
        )

        return success_response(
            users_with_roles, "Users with roles retrieved successfully"
        )

    except ExternalServiceError:
        return error_response("Role service unavailable", 503)
    except Exception as e:
        logger.exception(f"Error retrieving admin roles: {str(e)}")
        return error_response("Internal server error", 500)


@safe_route("/admin/roles/available", methods=["GET"])
@require_admin_auth
def get_available_roles():
    """Get list of available admin roles and their descriptions"""
    try:
        # Create user service instance
        user_service = create_user_service() if UserServiceV4 else None
        if not user_service:
            return error_response("User service not available", 503)

        available_roles = user_service.get_available_roles()
        return success_response(
            available_roles, "Available roles retrieved successfully"
        )

    except ExternalServiceError:
        return error_response("Role service unavailable", 503)
    except Exception as e:
        logger.exception(f"Error retrieving available roles: {str(e)}")
        return error_response("Internal server error", 500)


# Statistics Routes
@safe_route("/statistics", methods=["GET"])
@require_api_v4_flag("api_v4_statistics")
def get_statistics():
    """Get application statistics using v4 service."""
    try:
        service = create_restaurant_service()
        stats = service.get_restaurant_statistics()
        return success_response(stats, "Statistics retrieved successfully")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching statistics", error=str(e))
        return error_response("Failed to fetch statistics", 500)


# Migration Status Routes
@safe_route("/migration/status", methods=["GET"])
def get_migration_status():
    """Get the current migration status for v4 API."""
    try:
        status = get_v4_migration_status()
        return success_response(status, "Migration status retrieved successfully")
    except Exception as e:
        logger.exception("Error fetching migration status", error=str(e))
        return error_response("Failed to fetch migration status", 500)


@safe_route("/migration/health", methods=["GET"])
def get_migration_health():
    """Get health status of v4 API components."""
    try:
        health_status = {
            "database_v4": False,
            "cache_v4": False,
            "services_v4": False,
            "overall": False,
        }
        # Check database v4
        try:
            db_manager, _, _ = get_service_dependencies()
            if db_manager and hasattr(db_manager, "connect"):
                health_status["database_v4"] = True
        except Exception as e:
            logger.warning(f"Database v4 health check failed: {e}")
        # Check cache v4
        try:
            _, cache_manager, _ = get_service_dependencies()
            if cache_manager and hasattr(cache_manager, "health_check"):
                health_status["cache_v4"] = cache_manager.health_check()
        except Exception as e:
            logger.warning(f"Cache v4 health check failed: {e}")
        # Check services v4
        try:
            restaurant_service = create_restaurant_service()
            if restaurant_service and hasattr(restaurant_service, "health_check"):
                health_status["services_v4"] = restaurant_service.health_check()
        except Exception as e:
            logger.warning(f"Services v4 health check failed: {e}")
        # Overall health
        health_status["overall"] = all(
            [
                health_status["database_v4"],
                health_status["cache_v4"],
                health_status["services_v4"],
            ]
        )
        return success_response(health_status, "Migration health check completed")
    except Exception as e:
        logger.exception("Error checking migration health", error=str(e))
        return error_response("Failed to check migration health", 500)


# Marketplace endpoints
@safe_route("/marketplace/listings", methods=["GET"])
# @require_api_v4_flag("api_v4_marketplace")  # Temporarily disabled for testing
def get_marketplace_listings():
    """Get marketplace listings with filtering and pagination."""
    try:
        # Check if marketplace service is available
        if not MarketplaceServiceV4:
            logger.warning(
                "MarketplaceServiceV4 not available, returning empty listings"
            )
            return success_response(
                {
                    "listings": [],
                    "pagination": {
                        "total": 0,
                        "limit": 50,
                        "offset": 0,
                        "hasMore": False,
                    },
                }
            )
        # Get query parameters
        limit = min(int(request.args.get("limit", 50)), 1000)
        offset = max(int(request.args.get("offset", 0)), 0)
        search = request.args.get("search")
        category = request.args.get("category")
        subcategory = request.args.get("subcategory")
        kind = request.args.get("kind")  # regular, vehicle, appliance
        condition = request.args.get("condition")
        min_price = request.args.get("min_price", type=int)
        max_price = request.args.get("max_price", type=int)
        city = request.args.get("city")
        region = request.args.get("region")
        status = request.args.get("status", "active")
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        radius = min(request.args.get("radius", 10, type=float), 1000)  # miles
        # Use marketplace service
        # Reduce verbose logs to avoid serializing large payloads
        logger.info("Creating marketplace service")
        service = create_marketplace_service()
        if not service:
            # Return empty marketplace response instead of error
            logger.warning(
                "Marketplace service not available, returning empty response"
            )
            return success_response(
                {
                    "listings": [],
                    "pagination": {
                        "total": 0,
                        "limit": limit,
                        "offset": offset,
                        "hasMore": False,
                    },
                }
            )
        logger.info("Marketplace service ready; fetching listings")
        result = service.get_listings(
            limit=limit,
            offset=offset,
            search=search,
            category=category,
            subcategory=subcategory,
            kind=kind,
            condition=condition,
            min_price=min_price,
            max_price=max_price,
            city=city,
            region=region,
            status=status,
            lat=lat,
            lng=lng,
            radius=radius,
        )
        # Log only summary to avoid huge payloads in logs
        if result.get("success"):
            data = result.get("data", {})
            listings_count = len(data.get("listings", [])) if isinstance(data, dict) else None
            total = (data.get("pagination", {}) or {}).get("total") if isinstance(data, dict) else None
            logger.info("Marketplace listings fetched", listings_count=listings_count, total=total)
            return success_response(result["data"])
        else:
            return error_response(result.get("error", "Failed to fetch listings"), 500)
    except Exception as e:
        logger.exception("Error fetching marketplace listings")
        return error_response(
            "Failed to fetch marketplace listings", 500, {"details": str(e)}
        )


@safe_route("/marketplace/listings/<listing_id>", methods=["GET"])
@require_api_v4_flag("api_v4_marketplace")
def get_marketplace_listing(listing_id):
    """Get a specific marketplace listing by ID."""
    try:
        # Use marketplace service
        service = create_marketplace_service()
        if not service:
            logger.warning("Marketplace service not available")
            return not_found_response(f"Listing with ID {listing_id}", "listing")
        result = service.get_listing_by_id(listing_id)
        if result["success"]:
            return success_response(result["data"])
        else:
            return not_found_response(f"Listing with ID {listing_id}", "listing")
    except Exception as e:
        logger.exception("Error fetching marketplace listing")
        return error_response(
            "Failed to fetch marketplace listing", 500, {"details": str(e)}
        )


@safe_route("/marketplace/listings", methods=["POST"])
@limiter.limit("120/minute")
@require_api_v4_flag("api_v4_marketplace")
@require_supabase_auth
def create_marketplace_listing():
    """Create a new marketplace listing."""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)
        # Get authenticated user information
        user = get_current_supabase_user()
        if not user:
            return error_response("User authentication required", 401)
        # Add user information to listing data
        listing_data = {
            **data,
            "seller_id": user.get("user_id"),
            "seller_email": user.get("email"),
            "created_by": user.get("user_id"),
        }
        # Use marketplace service
        service = create_marketplace_service()
        if not service:
            return error_response("Marketplace service unavailable", 503)
        result = service.create_listing(listing_data)
        if result["success"]:
            return success_response(result["data"], "Listing created successfully", 201)
        else:
            return error_response(result.get("error", "Failed to create listing"), 400)
    except Exception as e:
        logger.exception("Error creating marketplace listing")
        return error_response(
            "Failed to create marketplace listing", 500, {"details": str(e)}
        )


@safe_route("/marketplace/listings/<listing_id>", methods=["PUT"])
@limiter.limit("120/minute")
@require_api_v4_flag("api_v4_marketplace")
@require_supabase_auth
def update_marketplace_listing(listing_id: str):
    """Update a marketplace listing."""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)
        # Get authenticated user information
        user = get_current_supabase_user()
        if not user:
            return error_response("User authentication required", 401)
        # Use marketplace service
        service = create_marketplace_service()
        if not service:
            return error_response("Marketplace service unavailable", 503)
        # Add user information to update data
        update_data = {
            **data,
            "updated_by": user.get("user_id"),
            "seller_id": user.get(
                "user_id"
            ),  # Ensure seller can only update their own listings
        }
        result = service.update_listing(listing_id, update_data)
        if result["success"]:
            return success_response(result["data"], "Listing updated successfully")
        else:
            return error_response(result.get("error", "Failed to update listing"), 400)
    except Exception as e:
        logger.exception("Error updating marketplace listing")
        return error_response(
            "Failed to update marketplace listing", 500, {"details": str(e)}
        )


@safe_route("/marketplace/listings/<listing_id>", methods=["DELETE"])
@limiter.limit("120/minute")
@require_api_v4_flag("api_v4_marketplace")
@require_supabase_auth
def delete_marketplace_listing(listing_id: str):
    """Delete a marketplace listing."""
    try:
        # Get authenticated user information
        user = get_current_supabase_user()
        if not user:
            return error_response("User authentication required", 401)
        # Use marketplace service
        service = create_marketplace_service()
        if not service:
            return error_response("Marketplace service unavailable", 503)
        # Add user information for verification
        delete_data = {
            "deleted_by": user.get("user_id"),
            "seller_id": user.get(
                "user_id"
            ),  # Ensure seller can only delete their own listings
        }
        result = service.delete_listing(listing_id, delete_data)
        if result["success"]:
            return success_response(result["data"], "Listing deleted successfully")
        else:
            return error_response(result.get("error", "Failed to delete listing"), 400)
    except Exception as e:
        logger.exception("Error deleting marketplace listing")
        return error_response(
            "Failed to delete marketplace listing", 500, {"details": str(e)}
        )


@safe_route("/marketplace/categories", methods=["GET"])
# @require_api_v4_flag("api_v4_marketplace")  # Temporarily disabled for testing
def get_marketplace_categories():
    """Get marketplace categories and subcategories."""
    try:
        # Check if marketplace service is available
        if not MarketplaceServiceV4:
            logger.warning(
                "MarketplaceServiceV4 not available, returning fallback categories"
            )
            # Use config manager instead of hardcoded values
            config = ConfigManager()
            fallback_categories = config.get_marketplace_categories()
            return success_response(fallback_categories)
        # Try to use the marketplace service if available
        try:
            service = get_marketplace_service()
            if service:
                result = service.get_categories()
                if result.get("success") and result.get("data"):
                    return success_response(result["data"])
                else:
                    logger.warning(
                        "Marketplace service returned no data, using fallback"
                    )
            else:
                logger.warning("Could not create marketplace service, using fallback")
        except Exception as e:
            logger.warning(f"Error using marketplace service: {e}, using fallback")
        # Return fallback categories if service fails
        logger.info("Returning fallback categories for marketplace")
        fallback_categories = [
            {
                "id": 1,
                "name": "Baked Goods",
                "slug": "baked-goods",
                "sort_order": 1,
                "active": True,
                "subcategories": [
                    {
                        "id": 1,
                        "name": "Bread",
                        "slug": "bread",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 2,
                        "name": "Pastries",
                        "slug": "pastries",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 2,
                "name": "Accessories",
                "slug": "accessories",
                "sort_order": 2,
                "active": True,
                "subcategories": [
                    {
                        "id": 3,
                        "name": "Jewelry",
                        "slug": "jewelry",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 4,
                        "name": "Clothing",
                        "slug": "clothing",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 3,
                "name": "Vehicles",
                "slug": "vehicles",
                "sort_order": 3,
                "active": True,
                "subcategories": [
                    {
                        "id": 5,
                        "name": "Cars",
                        "slug": "cars",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 6,
                        "name": "Motorcycles",
                        "slug": "motorcycles",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
            {
                "id": 4,
                "name": "Appliances",
                "slug": "appliances",
                "sort_order": 4,
                "active": True,
                "subcategories": [
                    {
                        "id": 7,
                        "name": "Kitchen",
                        "slug": "kitchen",
                        "sort_order": 1,
                        "active": True,
                    },
                    {
                        "id": 8,
                        "name": "Laundry",
                        "slug": "laundry",
                        "sort_order": 2,
                        "active": True,
                    },
                ],
            },
        ]
        return success_response(fallback_categories)
    except Exception as e:
        logger.exception("Error fetching marketplace categories")
        return error_response(
            "Failed to fetch marketplace categories", 500, {"details": str(e)}
        )


@safe_route("/marketplace/migrate", methods=["POST"])
def migrate_marketplace_tables():
    """Run marketplace migration to create necessary tables."""
    try:
        # Import the migration function
        from database.migrations.create_marketplace_unified import run_migration

        logger.info("Starting marketplace migration via API v4")
        # Run the migration
        success = run_migration()
        if success:
            logger.info("Marketplace migration completed successfully")
            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Marketplace migration completed successfully",
                        "tables_created": [
                            "categories",
                            "subcategories",
                            "Marketplace listings",
                            "gemachs",
                            "listing_images",
                            "listing_transactions",
                            "listing_endorsements",
                            "usernames",
                        ],
                    }
                ),
                200,
            )
        else:
            logger.error("Marketplace migration failed")
            return (
                jsonify({"success": False, "message": "Marketplace migration failed"}),
                500,
            )
    except Exception as e:
        logger.exception("Error during marketplace migration")
        return (
            jsonify({"success": False, "message": f"Error during migration: {str(e)}"}),
            500,
        )


@safe_route("/marketplace/create-tables", methods=["POST"])
def create_marketplace_tables():
    """Create basic marketplace tables."""
    try:
        from sqlalchemy import create_engine, text
        import os

        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return (
                jsonify({"success": False, "message": "DATABASE_URL not configured"}),
                500,
            )
        engine = create_engine(database_url)
        with engine.begin() as conn:
            # Create categories table
            conn.execute(
                text(
                    """
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    sort_order INTEGER DEFAULT 0,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
                )
            )
            # Create subcategories table
            conn.execute(
                text(
                    """
                CREATE TABLE IF NOT EXISTS subcategories (
                    id SERIAL PRIMARY KEY,
                    category_id INTEGER REFERENCES categories(id),
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    sort_order INTEGER DEFAULT 0,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
                )
            )
            # Insert sample categories
            conn.execute(
                text(
                    """
                INSERT INTO categories (id, name, slug, sort_order, active)
                VALUES
                    (1, 'Baked Goods', 'baked-goods', 1, true),
                    (2, 'Accessories', 'accessories', 2, true)
                ON CONFLICT (id) DO NOTHING
            """
                )
            )
            # Insert sample subcategories
            conn.execute(
                text(
                    """
                INSERT INTO subcategories (
                    id,
                    category_id,
                    name,
                    slug,
                    sort_order,
                    active
                )
                VALUES
                    (1, 1, 'Bread', 'bread', 1, true),
                    (2, 1, 'Pastries', 'pastries', 2, true),
                    (3, 2, 'Jewelry', 'jewelry', 1, true),
                    (4, 2, 'Clothing', 'clothing', 2, true)
                ON CONFLICT (id) DO NOTHING
            """
                )
            )
        logger.info("Marketplace tables created successfully")
        return (
            jsonify(
                {"success": True, "message": "Marketplace tables created successfully"}
            ),
            200,
        )
    except Exception as e:
        logger.exception("Error creating marketplace tables")
        return (
            jsonify({"success": False, "message": f"Error creating tables: {str(e)}"}),
            500,
        )


def create_order_service():
    """Create and return an OrderServiceV4 instance."""
    try:
        db_manager, cache_manager, config = get_service_dependencies()
        return OrderServiceV4(db_session=db_manager.get_session())
    except DatabaseError as e:
        logger.error(f"Database error creating order service: {e}")
        raise
    except ImportError as e:
        logger.error(f"Import error creating order service: {e}")
        raise DatabaseError("Required modules not available")
    except Exception as e:
        logger.error(f"Failed to create order service: {e}")
        raise DatabaseError("Failed to create order service")


# Order Routes
@safe_route("/orders", methods=["POST"])
@require_api_v4_flag("api_v4_orders")
@limiter.limit("60/minute")
def create_order():
    """Create a new order."""
    try:
        if not request.is_json:
            return error_response("Content-Type must be application/json", 400)
        order_data = request.get_json()
        # Validate required fields
        required_fields = [
            "restaurant_id",
            "customer_name",
            "customer_phone",
            "customer_email",
            "order_type",
            "payment_method",
            "items",
        ]
        for field in required_fields:
            if field not in order_data:
                return error_response(f"Missing required field: {field}", 400)
        # Create order service and submit order
        service = create_order_service()
        order = service.create_order(order_data)
        return success_response(
            {
                "order": order,
                "message": f"Order {order['order_number']} created successfully",
            }
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error creating order", error=str(e))
        return error_response("Failed to create order", 500)


@safe_route("/orders/<int:order_id>", methods=["GET"])
@require_api_v4_flag("api_v4_orders")
def get_order(order_id: int):
    """Get order by ID."""
    try:
        service = create_order_service()
        order = service.get_order_by_id(order_id)
        return success_response({"order": order})
    except NotFoundError as e:
        return not_found_response(str(e), "order")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error retrieving order", error=str(e))
        return error_response("Failed to retrieve order", 500)


@safe_route("/orders/number/<order_number>", methods=["GET"])
@require_api_v4_flag("api_v4_orders")
def get_order_by_number(order_number: str):
    """Get order by order number."""
    try:
        service = create_order_service()
        order = service.get_order_by_number(order_number)
        return success_response({"order": order})
    except NotFoundError as e:
        return not_found_response(str(e), "order")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error retrieving order", error=str(e))
        return error_response("Failed to retrieve order", 500)


@safe_route("/orders/restaurant/<int:restaurant_id>", methods=["GET"])
@require_api_v4_flag("api_v4_orders")
def get_restaurant_orders(restaurant_id: int):
    """Get orders for a specific restaurant."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
        service = create_order_service()
        orders = service.get_orders_by_restaurant(restaurant_id, limit, offset)
        return success_response(
            {
                "orders": orders,
                "pagination": {"limit": limit, "offset": offset, "count": len(orders)},
            }
        )
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error retrieving restaurant orders", error=str(e))
        return error_response("Failed to retrieve restaurant orders", 500)


@safe_route("/orders/customer/<email>", methods=["GET"])
@require_api_v4_flag("api_v4_orders")
def get_customer_orders(email: str):
    """Get orders for a specific customer."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
        service = create_order_service()
        orders = service.get_orders_by_customer(email, limit, offset)
        return success_response(
            {
                "orders": orders,
                "pagination": {"limit": limit, "offset": offset, "count": len(orders)},
            }
        )
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error retrieving customer orders", error=str(e))
        return error_response("Failed to retrieve customer orders", 500)


@safe_route("/orders/<int:order_id>/status", methods=["PUT"])
@require_api_v4_flag("api_v4_orders")
@limiter.limit("60/minute")
def update_order_status(order_id: int):
    """Update order status."""
    try:
        if not request.is_json:
            return error_response("Content-Type must be application/json", 400)
        data = request.get_json()
        status = data.get("status")
        if not status:
            return error_response("Status field is required", 400)
        service = create_order_service()
        order = service.update_order_status(order_id, status)
        return success_response(
            {"order": order, "message": f"Order status updated to {status}"}
        )
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "order")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error updating order status", error=str(e))
        return error_response("Failed to update order status", 500)


# Error handlers - only register if api_v4 blueprint is available
if api_v4 is not None:

    @api_v4.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors."""
        return error_response(str(error), 400, {"validation_errors": error.details})

    @api_v4.errorhandler(NotFoundError)
    def handle_not_found_error(error):
        """Handle not found errors."""
        return not_found_response(str(error))

    @api_v4.errorhandler(DatabaseError)
    def handle_database_error(error):
        """Handle database errors."""
        return error_response(str(error), 503)

    @api_v4.errorhandler(ExternalServiceError)
    def handle_external_service_error(error):
        """Handle external service errors."""
        return error_response(str(error), 502)

    @api_v4.errorhandler(HTTPException)
    def handle_http_error(error):
        """Handle HTTP exceptions."""
        return error_response(error.description, error.code)

    @api_v4.errorhandler(Exception)
    def handle_generic_error(error):
        """Handle generic exceptions."""
        logger.exception("Unhandled exception in API v4", error=str(error))
        return error_response("Internal server error", 500)


@safe_route("/admin/run-marketplace-migration", methods=["POST"])
@require_admin_auth
@limiter.limit("5/minute")
def run_marketplace_migration():
    """Temporary admin endpoint to run marketplace migration."""
    try:
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
                jsonify({"success": False, "error": "Marketplace migration failed"}),
                500,
            )
    except Exception as e:
        logger.exception("Error running marketplace migration")
        return jsonify({"success": False, "error": str(e)}), 500


@safe_route("/proxy-image", methods=["GET"])
def proxy_image():
    """Proxy external images to avoid CORS issues."""
    try:
        image_url = request.args.get("url")
        if not image_url:
            return error_response("Image URL is required", 400)

        # Validate URL to prevent SSRF attacks
        if not image_url.startswith(("http://", "https://")):
            return error_response("Invalid image URL", 400)

        # Only allow Google profile images for security
        if not any(
            domain in image_url
            for domain in ["googleusercontent.com", "lh3.googleusercontent.com"]
        ):
            return error_response("Only Google profile images are allowed", 403)

        # For now, return a redirect to the original URL with CORS headers
        # This is a simpler approach that should work for most cases
        from flask import redirect

        response = redirect(image_url)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "public, max-age=3600"
        return response

    except Exception as e:
        logger.error(f"Error proxying image: {e}")
        return error_response("Internal server error", 500)


# Test endpoint for CI/CD (no authentication required)
@safe_route("/test/health", methods=["GET"])
def test_health():
    """Simple health check endpoint for testing."""
    return jsonify(
        {
            "status": "healthy",
            "message": "API v4 is working",
            "timestamp": datetime.now().isoformat(),
        }
    )


# Additional test endpoints for comprehensive testing
@safe_route("/test/info", methods=["GET"])
def test_info():
    """Test endpoint that returns system information."""
    return jsonify(
        {
            "version": "4.0",
            "environment": os.getenv("NODE_ENV", "development"),
            "timestamp": datetime.now().isoformat(),
            "endpoints": [
                "/api/v4/test/health",
                "/api/v4/test/info",
                "/api/v4/test/status",
                "/api/v4/test/echo",
            ],
        }
    )


@safe_route("/test/status", methods=["GET"])
def test_status():
    """Test endpoint that returns detailed status information."""
    return jsonify(
        {
            "status": "operational",
            "uptime": "running",
            "version": "4.0.0",
            "build_date": "2024-01-01",
            "features": {
                "authentication": "enabled",
                "rate_limiting": "enabled",
                "caching": "enabled",
            },
            "timestamp": datetime.now().isoformat(),
        }
    )


@safe_route("/test/echo", methods=["POST"])
def test_echo():
    """Test endpoint that echoes back the request data."""
    try:
        data = request.get_json() or {}
        return jsonify(
            {
                "echo": data,
                "method": request.method,
                "headers": dict(request.headers),
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e), "timestamp": datetime.now().isoformat()}), 400


@safe_route("/test/validate", methods=["POST"])
def test_validate():
    """Test endpoint that validates JSON data."""
    try:
        data = request.get_json()
        if not data:
            return (
                jsonify(
                    {
                        "error": "No JSON data provided",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        # Simple validation
        if "name" not in data:
            return (
                jsonify(
                    {
                        "error": "Missing required field: name",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        if "email" not in data:
            return (
                jsonify(
                    {
                        "error": "Missing required field: email",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        return jsonify(
            {"valid": True, "data": data, "timestamp": datetime.now().isoformat()}
        )
    except Exception as e:
        return jsonify({"error": str(e), "timestamp": datetime.now().isoformat()}), 400
