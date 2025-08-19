from utils.logging_config import get_logger

import os
import sys
from typing import Any, Dict, List, Optional
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
    from utils.unified_search_service import UnifiedSearchService, SearchFilters, SearchType
except ImportError as e:
    logger.warning(f"Could not import UnifiedSearchService: {e}")
    UnifiedSearchService = None
    SearchFilters = None
    SearchType = None

try:
    from utils.error_handler import (
        APIError, ValidationError, NotFoundError, DatabaseError, ExternalServiceError
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
    from utils.feature_flags_v4 import require_api_v4_flag
    from utils.feature_flags_v4 import get_migration_status as get_v4_migration_status
except ImportError:
    # Fallback decorator if feature flags module is not available
    def require_api_v4_flag(flag_name: str, default: bool = False):
        def decorator(f):
            return f
        return decorator



from flask import Blueprint, request, jsonify, current_app

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


# Create Blueprint for v4 API routes - only require essential dependencies
required_dependencies = [
    MarketplaceServiceV4,  # Only require marketplace service for now
    APIError, ValidationError, NotFoundError, DatabaseError, ExternalServiceError,
    CacheManagerV4, ConfigManager
]

missing_dependencies = [dep.__name__ if dep else "None" for dep in required_dependencies if not dep]

if all(required_dependencies):
    api_v4 = Blueprint('api_v4', __name__, url_prefix='/api/v4')
    logger.info("API v4 blueprint created successfully")
else:
    logger.warning(f"Missing dependencies for api_v4: {missing_dependencies}")
    api_v4 = None

# Create a safe route decorator that only works when api_v4 is available
def safe_route(path, methods=None, **kwargs):
    """Safe route decorator that only works when api_v4 blueprint is available."""
    if api_v4 is None:
        # Return a no-op decorator when api_v4 is not available
        def no_op_decorator(f):
            logger.warning(f"Route {path} not registered - api_v4 blueprint unavailable")
            return f
        return no_op_decorator
    
    return api_v4.route(path, methods=methods, **kwargs)

def get_service_dependencies():
    """Get service dependencies from app context."""
    try:
        # Get dependencies from app context
        deps = current_app.config.get('dependencies', {})
        
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
    return RestaurantServiceV4(db_manager=db_manager, cache_manager=cache_manager, config=config)

def create_review_service():
    """Create and return a ReviewServiceV4 instance."""
    db_manager, cache_manager, config = get_service_dependencies()
    return ReviewServiceV4(db_manager=db_manager, cache_manager=cache_manager, config=config)

def create_user_service():
    """Create and return a UserServiceV4 instance."""
    db_manager, cache_manager, config = get_service_dependencies()
    return UserServiceV4(db_manager=db_manager, cache_manager=cache_manager, config=config)

def create_marketplace_service():
    """Create and return a MarketplaceServiceV4 instance."""
    try:
        db_manager, cache_manager, config = get_service_dependencies()
        if not db_manager:
            logger.error("Database manager not available for marketplace service")
            return None
        
        service = MarketplaceServiceV4(db_manager=db_manager, cache_manager=cache_manager, config=config)
        if service:
            logger.info("MarketplaceServiceV4 created successfully")
        else:
            logger.error("Failed to create MarketplaceServiceV4")
        return service
    except Exception as e:
        logger.error(f"Error creating marketplace service: {str(e)}")
        return None

def success_response(data: Any, message: str = "Success", status_code: int = 200):
    """Create a standardized success response."""
    return jsonify({
        "success": True,
        "message": message,
        "data": data
    }), status_code

def error_response(message: str, status_code: int = 500, details: Optional[Dict] = None):
    """Create a standardized error response."""
    response = {
        "success": False,
        "error": message,
        "status_code": status_code
    }
    if details:
        response["details"] = details
    return jsonify(response), status_code

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
        paginated_restaurants = restaurants[offset:offset + limit]
        
        return success_response({
            "restaurants": paginated_restaurants,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "hasMore": offset + limit < total_count
            }
        })
        
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
            min_rating=float(request.args.get("min_rating")) if request.args.get("min_rating") else None,
            has_reviews=request.args.get("has_reviews") == "true" if request.args.get("has_reviews") else None,
            open_now=request.args.get("open_now") == "true" if request.args.get("open_now") else None,
            is_cholov_yisroel=request.args.get("is_cholov_yisroel") == "true" if request.args.get("is_cholov_yisroel") else None,
            is_pas_yisroel=request.args.get("is_pas_yisroel") == "true" if request.args.get("is_pas_yisroel") else None,
            cholov_stam=request.args.get("cholov_stam") == "true" if request.args.get("cholov_stam") else None,
            lat=float(request.args.get("lat")) if request.args.get("lat") else None,
            lng=float(request.args.get("lng")) if request.args.get("lng") else None,
            radius=float(request.args.get("radius")) if request.args.get("radius") else None,
            limit=limit,
            offset=offset
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
        
        return success_response({
            "results": [result.to_dict() for result in search_response.results],
            "query": query,
            "total_results": search_response.total_results,
            "execution_time": search_response.execution_time,
            "suggestions": search_response.suggestions,
            "statistics": search_response.statistics
        })
        
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
            return not_found_response(f"Restaurant with ID {restaurant_id}", "restaurant")
        
        return success_response({"restaurant": restaurant})
        
    except ValidationError as e:
        return error_response(str(e), 400, {"validation_errors": e.details})
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error fetching restaurant", restaurant_id=restaurant_id, error=str(e))
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
                201
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
                {"restaurant": restaurant},
                "Restaurant updated successfully"
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
        logger.exception("Error updating restaurant", restaurant_id=restaurant_id, error=str(e))
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
                {"id": restaurant_id},
                "Restaurant deleted successfully"
            )
        else:
            return error_response("Failed to delete restaurant", 500)
        
    except NotFoundError as e:
        return not_found_response(str(e), "restaurant")
    except DatabaseError as e:
        return error_response(str(e), 503)
    except Exception as e:
        logger.exception("Error deleting restaurant", restaurant_id=restaurant_id, error=str(e))
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
            filters=filters
        )
        
        # Get total count for pagination
        total_count = service.get_reviews_count(
            restaurant_id=int(restaurant_id) if restaurant_id else None,
            status=status,
            filters=filters
        )
        
        return success_response({
            "reviews": reviews,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "hasMore": offset + limit < total_count
            }
        })
        
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
                {"review": review, "id": review_id},
                "Review created successfully",
                201
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
            return success_response(
                {"review": review},
                "Review updated successfully"
            )
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
            return success_response(
                {"id": review_id},
                "Review deleted successfully"
            )
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
        users = service.get_users(limit=limit, offset=(page - 1) * limit, filters=filters)
        total_count = service.get_users_count(filters=filters)
        
        return success_response({
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        })
        
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
            "overall": False
        }
        
        # Check database v4
        try:
            db_manager, _, _ = get_service_dependencies()
            if db_manager and hasattr(db_manager, 'connect'):
                health_status["database_v4"] = True
        except Exception as e:
            logger.warning(f"Database v4 health check failed: {e}")
        
        # Check cache v4
        try:
            _, cache_manager, _ = get_service_dependencies()
            if cache_manager and hasattr(cache_manager, 'health_check'):
                health_status["cache_v4"] = cache_manager.health_check()
        except Exception as e:
            logger.warning(f"Cache v4 health check failed: {e}")
        
        # Check services v4
        try:
            restaurant_service = create_restaurant_service()
            if restaurant_service and hasattr(restaurant_service, 'health_check'):
                health_status["services_v4"] = restaurant_service.health_check()
        except Exception as e:
            logger.warning(f"Services v4 health check failed: {e}")
        
        # Overall health
        health_status["overall"] = all([
            health_status["database_v4"],
            health_status["cache_v4"],
            health_status["services_v4"]
        ])
        
        return success_response(health_status, "Migration health check completed")
        
    except Exception as e:
        logger.exception("Error checking migration health", error=str(e))
        return error_response("Failed to check migration health", 500)



# Marketplace endpoints
@safe_route("/api/v4/marketplace/listings", methods=["GET"])
@require_api_v4_flag("api_v4_marketplace")
def get_marketplace_listings():
    """Get marketplace listings with filtering and pagination."""
    try:
        # Get query parameters
        limit = min(int(request.args.get('limit', 50)), 1000)
        offset = min(int(request.args.get('offset', 0)), 0)
        search = request.args.get('search')
        category = request.args.get('category')
        subcategory = request.args.get('subcategory')
        listing_type = request.args.get('type')  # sale, free, borrow, gemach
        condition = request.args.get('condition')
        min_price = request.args.get('min_price', type=int)
        max_price = request.args.get('max_price', type=int)
        city = request.args.get('city')
        region = request.args.get('region')
        status = request.args.get('status', 'active')
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = min(request.args.get('radius', 10, type=float), 1000)  # miles
        
        # TEMPORARY: Check if marketplace tables exist
        try:
            # Test if listings table exists
            with get_service_dependencies()[0] as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM listings LIMIT 1")
        except Exception as table_error:
            logger.warning(f"Marketplace tables not found: {table_error}")
            # Return empty response when tables don't exist
            return success_response({
                'success': True,
                'data': {
                    'listings': [],
                    'total': 0,
                    'limit': limit,
                    'offset': offset
                },
                'message': 'Marketplace is not yet available'
            }), 200
        
        # Build query
        query = """
            SELECT l.*, 
                   c.name as category_name,
                   sc.name as subcategory_name,
                   u.display_name as seller_name,
                   g.name as gemach_name
            FROM listings l
            LEFT JOIN categories c ON l.category_id = c.id
            LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
            LEFT JOIN users u ON l.seller_user_id = u.id
            LEFT JOIN gemachs g ON l.seller_gemach_id = g.id
            WHERE l.status = %s
        """
        params = [status]
        
        # Add filters
        if search:
            query += " AND (l.title ILIKE %s OR l.description ILIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        if category:
            query += " AND c.slug = %s"
            params.append(category)
            
        if subcategory:
            query += " AND sc.slug = %s"
            params.append(subcategory)
            
        if listing_type:
            query += " AND l.type = %s"
            params.append(listing_type)
            
        if condition:
            query += " AND l.condition = %s"
            params.append(condition)
            
        if min_price is not None:
            query += " AND l.price_cents >= %s"
            params.append(min_price)
            
        if max_price is not None:
            query += " AND l.price_cents <= %s"
            params.append(max_price)
            
        if city:
            query += " AND l.city ILIKE %s"
            params.append(f'%{city}%')
            
        if region:
            query += " AND l.region = %s"
            params.append(region)
        
        # Location-based filtering
        if lat and lng and radius:
            # Convert radius from miles to degrees (approximate)
            radius_degrees = radius / 69.0
            query += """
                AND l.lat IS NOT NULL 
                AND l.lng IS NOT NULL
                AND l.lat BETWEEN %s AND %s
                AND l.lng BETWEEN %s AND %s
            """
            params.extend([
                lat - radius_degrees, lat + radius_degrees,
                lng - radius_degrees, lng + radius_degrees
            ])
        
        # Add ordering and pagination
        query += " ORDER BY l.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Execute query
        with get_service_dependencies()[0] as conn: # Assuming get_service_dependencies()[0] is db_manager
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                listings = cursor.fetchall()
                
                # Get total count for pagination
                count_query = query.replace("SELECT l.*, ", "SELECT COUNT(*) as total FROM listings l ")
                count_query = count_query.split("ORDER BY")[0]  # Remove ORDER BY and LIMIT
                cursor.execute(count_query, params[:-2])  # Remove limit and offset
                total = cursor.fetchone()['total']
        
        # Format response
        formatted_listings = []
        for listing in listings:
            formatted_listing = {
                'id': str(listing['id']),
                'title': listing['title'],
                'description': listing['description'],
                'type': listing['type'],
                'category': listing['category_name'],
                'subcategory': listing['subcategory_name'],
                'price_cents': listing['price_cents'],
                'currency': listing['currency'],
                'condition': listing['condition'],
                'city': listing['city'],
                'region': listing['region'],
                'zip': listing['zip'],
                'country': listing['country'],
                'lat': listing['lat'],
                'lng': listing['lng'],
                'seller_name': listing['seller_name'] or listing['gemach_name'],
                'seller_type': 'user' if listing['seller_name'] else 'gemach',
                'available_from': listing['available_from'].isoformat() if listing['available_from'] else None,
                'available_to': listing['available_to'].isoformat() if listing['available_to'] else None,
                'loan_terms': listing['loan_terms'],
                'attributes': listing['attributes'],
                'endorse_up': listing['endorse_up'],
                'endorse_down': listing['endorse_down'],
                'status': listing['status'],
                'created_at': listing['created_at'].isoformat(),
                'updated_at': listing['updated_at'].isoformat()
            }
            formatted_listings.append(formatted_listing)
        
        return success_response({
            'success': True,
            'data': {
                'listings': formatted_listings,
                'total': total,
                'limit': limit,
                'offset': offset
            }
        }), 200
        
    except Exception as e:
        logger.exception("Error fetching marketplace listings")
        return error_response("Failed to fetch marketplace listings", 500, {"details": str(e)})


@safe_route("/api/v4/marketplace/listings/<listing_id>", methods=["GET"])
@require_api_v4_flag("api_v4_marketplace")
def get_marketplace_listing(listing_id):
    """Get a specific marketplace listing by ID."""
    try:
        # TEMPORARY: Check if marketplace tables exist
        try:
            # Test if listings table exists
            with get_service_dependencies()[0] as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM listings LIMIT 1")
        except Exception as table_error:
            logger.warning(f"Marketplace tables not found: {table_error}")
            # Return not found when tables don't exist
            return not_found_response(f"Listing with ID {listing_id}", "listing")
        
        with get_service_dependencies()[0] as conn: # Assuming get_service_dependencies()[0] is db_manager
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT l.*, 
                           c.name as category_name,
                           sc.name as subcategory_name,
                           u.display_name as seller_name,
                           u.username as seller_username,
                           g.name as gemach_name,
                           g.phone as gemach_phone,
                           g.email as gemach_email
                    FROM listings l
                    LEFT JOIN categories c ON l.category_id = c.id
                    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
                    LEFT JOIN users u ON l.seller_user_id = u.id
                    LEFT JOIN gemachs g ON l.seller_gemach_id = g.id
                    WHERE l.id = %s
                """, [listing_id])
                
                listing = cursor.fetchone()
                
                if not listing:
                    return not_found_response(f"Listing with ID {listing_id}", "listing")
                
                # Format response
                formatted_listing = {
                    'id': str(listing['id']),
                    'title': listing['title'],
                    'description': listing['description'],
                    'type': listing['type'],
                    'category': listing['category_name'],
                    'subcategory': listing['subcategory_name'],
                    'price_cents': listing['price_cents'],
                    'currency': listing['currency'],
                    'condition': listing['condition'],
                    'city': listing['city'],
                    'region': listing['region'],
                    'zip': listing['zip'],
                    'country': listing['country'],
                    'lat': listing['lat'],
                    'lng': listing['lng'],
                    'seller_name': listing['seller_name'] or listing['gemach_name'],
                    'seller_username': listing['seller_username'],
                    'seller_type': 'user' if listing['seller_name'] else 'gemach',
                    'seller_contact': {
                        'phone': listing['gemach_phone'] if listing['gemach_name'] else None,
                        'email': listing['gemach_email'] if listing['gemach_name'] else None
                    },
                    'available_from': listing['available_from'].isoformat() if listing['available_from'] else None,
                    'available_to': listing['available_to'].isoformat() if listing['available_to'] else None,
                    'loan_terms': listing['loan_terms'],
                    'attributes': listing['attributes'],
                    'endorse_up': listing['endorse_up'],
                    'endorse_down': listing['endorse_down'],
                    'status': listing['status'],
                    'created_at': listing['created_at'].isoformat(),
                    'updated_at': listing['updated_at'].isoformat()
                }
                
                return success_response({
                    'success': True,
                    'data': formatted_listing
                }), 200
                
    except Exception as e:
        logger.exception("Error fetching marketplace listing")
        return error_response("Failed to fetch marketplace listing", 500, {"details": str(e)})


@safe_route("/api/v4/marketplace/listings", methods=["POST"])
@require_api_v4_flag("api_v4_marketplace")
def create_marketplace_listing():
    """Create a new marketplace listing."""
    try:
        # TEMPORARY: Check if marketplace tables exist
        try:
            # Test if listings table exists
            with get_service_dependencies()[0] as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM listings LIMIT 1")
        except Exception as table_error:
            logger.warning(f"Marketplace tables not found: {table_error}")
            # Return error when tables don't exist
            return error_response("Marketplace is not yet available", 503, {"details": "Database tables not created"})
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'type', 'category_id', 'price_cents']
        for field in required_fields:
            if field not in data:
                return error_response(f'Missing required field: {field}', 400)
        
        # Validate listing type
        valid_types = ['sale', 'free', 'borrow', 'gemach']
        if data['type'] not in valid_types:
            return error_response(f'Invalid listing type. Must be one of: {", ".join(valid_types)}', 400)
        
        # Validate price for free listings
        if data['type'] == 'free' and data['price_cents'] != 0:
            return error_response('Free listings must have price_cents = 0', 400)
        
        # Validate loan terms for borrow/gemach
        if data['type'] in ['borrow', 'gemach'] and not data.get('loan_terms'):
            return error_response(f'{data["type"].title()} listings must include loan_terms', 400)
        
        # Validate gemach seller
        if data['type'] == 'gemach' and not data.get('seller_gemach_id'):
            return error_response('Gemach listings must include seller_gemach_id', 400)
        
        # Get user ID from session (for now, use a placeholder)
        # TODO: Integrate with Supabase auth
        seller_user_id = data.get('seller_user_id')  # For now, accept from request
        
        with get_service_dependencies()[0] as conn: # Assuming get_service_dependencies()[0] is db_manager
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Insert listing
                cursor.execute("""
                    INSERT INTO listings (
                        title, description, type, category_id, subcategory_id,
                        price_cents, currency, condition, city, region, zip, country,
                        lat, lng, seller_user_id, seller_gemach_id, available_from,
                        available_to, loan_terms, attributes, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id
                """, [
                    data['title'],
                    data.get('description'),
                    data['type'],
                    data['category_id'],
                    data.get('subcategory_id'),
                    data['price_cents'],
                    data.get('currency', 'USD'),
                    data.get('condition'),
                    data.get('city'),
                    data.get('region'),
                    data.get('zip'),
                    data.get('country', 'US'),
                    data.get('lat'),
                    data.get('lng'),
                    seller_user_id,
                    data.get('seller_gemach_id'),
                    data.get('available_from'),
                    data.get('available_to'),
                    json.dumps(data.get('loan_terms')) if data.get('loan_terms') else None,
                    json.dumps(data.get('attributes', {})),
                    'active'
                ])
                
                listing_id = cursor.fetchone()['id']
                conn.commit()
                
                return success_response({
                    'success': True,
                    'data': {
                        'id': str(listing_id),
                        'message': 'Listing created successfully'
                    }
                }), 201
                
    except Exception as e:
        logger.exception("Error creating marketplace listing")
        return error_response("Failed to create marketplace listing", 500, {"details": str(e)})


@safe_route("/api/v4/marketplace/categories", methods=["GET"])
@require_api_v4_flag("api_v4_marketplace")
def get_marketplace_categories():
    """Get marketplace categories and subcategories."""
    try:
        service = create_marketplace_service()
        if not service:
            return error_response("Marketplace service unavailable", 503)
        
        result = service.get_categories()
        
        if result["success"]:
            return success_response(result)
        else:
            return error_response(result.get("error", "Failed to retrieve categories"), 500)
        
    except Exception as e:
        logger.exception("Error fetching marketplace categories")
        return error_response("Failed to fetch marketplace categories", 500, {"details": str(e)})




# Error handlers
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
