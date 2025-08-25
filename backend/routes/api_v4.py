import os
import sys
from typing import Any, Dict, List, Optional

from psycopg2.extras import RealDictCursor
from utils.logging_config import get_logger
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


# Import feature flag decorators
try:
    from utils.feature_flags_v4 import get_migration_status as get_v4_migration_status
    from utils.feature_flags_v4 import require_api_v4_flag
except ImportError:
    # Fallback decorator if feature flags module is not available
    def require_api_v4_flag(flag_name: str, default: bool = False):
        def decorator(f):
            return f

        return decorator


from flask import Blueprint, current_app, jsonify, request

logger = get_logger(__name__)

#!/usr/bin/env python3
"""API Routes v4 - Using the new service layer architecture.

This module provides API endpoints that use the v4 service layer instead of
directly calling the database manager. This provides better separation of
concerns, improved testability, and enhanced error handling.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


# Create Blueprint for v4 API routes - be more lenient with dependencies
# Only require the most essential dependencies
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

    except Exception as e:
        logger.error("Failed to get service dependencies", error=str(e))
        raise DatabaseError("Service dependencies not available")


def create_restaurant_service():
    """Create and return a RestaurantServiceV4 instance."""
    db_manager, cache_manager, config = get_service_dependencies()
    return RestaurantServiceV4(
        db_manager=db_manager, cache_manager=cache_manager, config=config
    )


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
    except Exception as e:
        logger.error(f"Error creating marketplace service: {str(e)}")
        return None


def get_marketplace_service():
    """Get or create a MarketplaceServiceV4 instance."""
    try:
        return create_marketplace_service()
    except Exception as e:
        logger.error(f"Error getting marketplace service: {str(e)}")
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
        offset = int(request.args.get("offset", 0))
        business_types = request.args.getlist("business_types")

        # Build filters
        filters = {}
        if kosher_type:
            filters["kosher_category"] = kosher_type
        if status:
            filters["status"] = status
        if business_types:
            filters["business_types"] = business_types

        # Use v4 service
        service = create_restaurant_service()
        restaurants = service.get_all_restaurants(filters=filters)

        # Apply pagination
        total_count = len(restaurants)
        paginated_restaurants = restaurants[offset : offset + limit]

        return success_response(
            {
                "restaurants": paginated_restaurants,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "hasMore": offset + limit < total_count,
                },
            }
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
            min_rating=float(request.args.get("min_rating"))
            if request.args.get("min_rating")
            else None,
            has_reviews=request.args.get("has_reviews") == "true"
            if request.args.get("has_reviews")
            else None,
            open_now=request.args.get("open_now") == "true"
            if request.args.get("open_now")
            else None,
            is_cholov_yisroel=request.args.get("is_cholov_yisroel") == "true"
            if request.args.get("is_cholov_yisroel")
            else None,
            is_pas_yisroel=request.args.get("is_pas_yisroel") == "true"
            if request.args.get("is_pas_yisroel")
            else None,
            cholov_stam=request.args.get("cholov_stam") == "true"
            if request.args.get("cholov_stam")
            else None,
            lat=float(request.args.get("lat")) if request.args.get("lat") else None,
            lng=float(request.args.get("lng")) if request.args.get("lng") else None,
            radius=float(request.args.get("radius"))
            if request.args.get("radius")
            else None,
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
def create_restaurant():
    """Create a new restaurant using v4 service."""
    try:
        data = request.get_json(silent=True) or {}

        service = create_restaurant_service()
        restaurant_id = service.create_restaurant(data)

        if restaurant_id:
            # Get the created restaurant
            restaurant = service.get_restaurant_by_id(restaurant_id)
            return success_response(
                {"restaurant": restaurant, "id": restaurant_id},
                "Restaurant created successfully",
                201,
            )
        else:
            return error_response("Failed to create restaurant", 500)

    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error creating restaurant", error=str(e))
        return error_response("Failed to create restaurant", 500)


@safe_route("/restaurants/<int:restaurant_id>", methods=["PUT"])
@require_api_v4_flag("api_v4_restaurants")
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
def delete_restaurant(restaurant_id: int):
    """Delete a restaurant using v4 service."""
    try:
        service = create_restaurant_service()
        success = service.delete_restaurant(restaurant_id)

        if success:
            return success_response(
                {"id": restaurant_id}, "Restaurant deleted successfully"
            )
        else:
            return error_response("Failed to delete restaurant", 500)

    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception(
            "Error deleting restaurant", restaurant_id=restaurant_id, error=str(e)
        )
        return error_response("Failed to delete restaurant", 500)


# Review Routes
@safe_route("/reviews", methods=["GET"])
@require_api_v4_flag("api_v4_reviews")
def get_reviews():
    """Get reviews with optional filtering using v4 service."""
    try:
        restaurant_id = request.args.get("restaurantId")
        status = request.args.get("status", "approved")
        limit = int(request.args.get("limit", 10))
        offset = int(request.args.get("offset", 0))

        # Build filters
        filters = {}
        if restaurant_id:
            filters["restaurant_id"] = int(restaurant_id)
        if status:
            filters["status"] = status

        service = create_review_service()
        reviews = service.get_reviews(
            restaurant_id=int(restaurant_id) if restaurant_id else None,
            status=status,
            limit=limit,
            offset=offset,
            filters=filters,
        )

        # Get total count for pagination
        total_count = service.get_reviews_count(
            restaurant_id=int(restaurant_id) if restaurant_id else None,
            status=status,
            filters=filters,
        )

        return success_response(
            {
                "reviews": reviews,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "hasMore": offset + limit < total_count,
                },
            }
        )

    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching reviews", error=str(e))
        return error_response("Failed to fetch reviews", 500)


@safe_route("/reviews", methods=["POST"])
@require_api_v4_flag("api_v4_reviews")
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
            logger.warning("MarketplaceServiceV4 not available, returning empty listings")
            return success_response({
                "listings": [],
                "pagination": {
                    "total": 0,
                    "limit": 50,
                    "offset": 0,
                    "hasMore": False,
                }
            })
        
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
        logger.info("Creating marketplace service...")
        service = create_marketplace_service()
        if not service:
            # Return empty marketplace response instead of error
            logger.warning("Marketplace service not available, returning empty response")
            return success_response({
                "listings": [],
                "pagination": {
                    "total": 0,
                    "limit": limit,
                    "offset": offset,
                    "hasMore": False,
                }
            })
        
        logger.info("Marketplace service created successfully, calling get_listings...")

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
        
        logger.info(f"Service result: {result}")

        if result["success"]:
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
@require_api_v4_flag("api_v4_marketplace")
def create_marketplace_listing():
    """Create a new marketplace listing."""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        # Use marketplace service
        service = create_marketplace_service()
        if not service:
            return error_response("Marketplace service unavailable", 503)

        result = service.create_listing(data)

        if result["success"]:
            return success_response(result["data"], "Listing created successfully", 201)
        else:
            return error_response(result.get("error", "Failed to create listing"), 400)

    except Exception as e:
        logger.exception("Error creating marketplace listing")
        return error_response(
            "Failed to create marketplace listing", 500, {"details": str(e)}
        )


@safe_route("/marketplace/categories", methods=["GET"])
# @require_api_v4_flag("api_v4_marketplace")  # Temporarily disabled for testing
def get_marketplace_categories():
    """Get marketplace categories and subcategories."""
    try:
        # Check if marketplace service is available
        if not MarketplaceServiceV4:
            logger.warning("MarketplaceServiceV4 not available, returning fallback categories")
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
                        }
                    ]
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
                        }
                    ]
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
                        }
                    ]
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
                        }
                    ]
                }
            ]
            return success_response(fallback_categories)
        
        # Try to use the marketplace service if available
        try:
            service = get_marketplace_service()
            if service:
                result = service.get_categories()
                if result.get("success") and result.get("data"):
                    return success_response(result["data"])
                else:
                    logger.warning("Marketplace service returned no data, using fallback")
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
                    }
                ]
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
                    }
                ]
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
                    }
                ]
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
                    }
                ]
            }
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
            return jsonify({
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
                    "usernames"
                ]
            }), 200
        else:
            logger.error("Marketplace migration failed")
            return jsonify({
                "success": False,
                "message": "Marketplace migration failed"
            }), 500
            
    except Exception as e:
        logger.exception("Error during marketplace migration")
        return jsonify({
            "success": False,
            "message": f"Error during migration: {str(e)}"
        }), 500


@safe_route("/marketplace/create-tables", methods=["POST"])
def create_marketplace_tables():
    """Create basic marketplace tables."""
    try:
        from sqlalchemy import create_engine, text
        import os
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return jsonify({
                "success": False,
                "message": "DATABASE_URL not configured"
            }), 500
        
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            # Create categories table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    sort_order INTEGER DEFAULT 0,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create subcategories table
            conn.execute(text("""
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
            """))
            
            # Insert sample categories
            conn.execute(text("""
                INSERT INTO categories (id, name, slug, sort_order, active) 
                VALUES 
                    (1, 'Baked Goods', 'baked-goods', 1, true),
                    (2, 'Accessories', 'accessories', 2, true)
                ON CONFLICT (id) DO NOTHING
            """))
            
            # Insert sample subcategories
            conn.execute(text("""
                INSERT INTO subcategories (id, category_id, name, slug, sort_order, active) 
                VALUES 
                    (1, 1, 'Bread', 'bread', 1, true),
                    (2, 1, 'Pastries', 'pastries', 2, true),
                    (3, 2, 'Jewelry', 'jewelry', 1, true),
                    (4, 2, 'Clothing', 'clothing', 2, true)
                ON CONFLICT (id) DO NOTHING
            """))
        
        logger.info("Marketplace tables created successfully")
        return jsonify({
            "success": True,
            "message": "Marketplace tables created successfully"
        }), 200
        
    except Exception as e:
        logger.exception("Error creating marketplace tables")
        return jsonify({
            "success": False,
            "message": f"Error creating tables: {str(e)}"
        }), 500

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
def run_marketplace_migration():
    """Temporary admin endpoint to run marketplace migration."""
    try:
        # Check for admin token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        admin_token = os.getenv("ADMIN_TOKEN")
        
        if not admin_token or token != admin_token:
            return jsonify({"error": "Invalid admin token"}), 401
        
        # Import and run the migration
        from database.migrations.create_marketplace_unified import run_migration
        
        success = run_migration()
        
        if success:
            return jsonify({
                "success": True,
                "message": "Marketplace migration completed successfully",
                "tables_created": [
                    "categories", "subcategories", "listings", "gemachs",
                    "listing_images", "listing_transactions", "listing_endorsements", "usernames"
                ]
            })
        else:
            return jsonify({
                "success": False,
                "error": "Marketplace migration failed"
            }), 500
            
    except Exception as e:
        logger.exception("Error running marketplace migration")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
