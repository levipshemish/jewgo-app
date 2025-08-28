#!/usr/bin/env python3
"""Shtetl Marketplace API Routes.

Dedicated API routes for the Jewish community marketplace (shtetl),
completely separate from the regular marketplace.

Author: JewGo Development Team  
Version: 1.0
Last Updated: 2025-08-28
"""

from flask import Blueprint, request, jsonify
from utils.logging_config import get_logger
from utils.response_helpers import success_response, error_response, not_found_response
from utils.feature_flags_v4 import require_api_v4_flag
from utils.supabase_auth import require_supabase_auth, get_current_supabase_user
from utils.decorators import safe_route

# Service imports
from services.shtetl_marketplace_service import ShtetlMarketplaceService

logger = get_logger(__name__)

# Create blueprint
shtetl_bp = Blueprint('shtetl', __name__, url_prefix='/api/v4/shtetl')


def create_shtetl_service():
    """Create shtetl marketplace service instance."""
    try:
        from database.database_manager_v4 import DatabaseManagerV4
        from utils.cache_manager_v4 import CacheManagerV4
        from utils.config_manager import ConfigManager
        
        db_manager = DatabaseManagerV4()
        cache_manager = CacheManagerV4()
        config = ConfigManager()
        
        return ShtetlMarketplaceService(
            db_manager=db_manager,
            cache_manager=cache_manager, 
            config=config
        )
    except Exception as e:
        logger.error(f"Failed to create shtetl service: {e}")
        return None


@shtetl_bp.route("/listings", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_shtetl_listings():
    """Get shtetl marketplace listings with community-specific filtering."""
    try:
        # Extract query parameters
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        search = request.args.get('search')
        category = request.args.get('category')
        subcategory = request.args.get('subcategory')
        transaction_type = request.args.get('transaction_type')  # sale, gemach, trade, donation
        is_gemach = request.args.get('is_gemach')
        kosher_agency = request.args.get('kosher_agency')
        holiday_category = request.args.get('holiday_category')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        city = request.args.get('city')
        state = request.args.get('state')
        status = request.args.get('status', 'active')
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        radius = float(request.args.get('radius', 10.0))

        # Convert string parameters to appropriate types
        if is_gemach is not None:
            is_gemach = is_gemach.lower() in ('true', '1', 'yes')
        if min_price is not None:
            min_price = int(min_price)
        if max_price is not None:
            max_price = int(max_price)
        if lat is not None:
            lat = float(lat)
        if lng is not None:
            lng = float(lng)

        # Create service instance
        service = create_shtetl_service()
        if not service:
            logger.warning("Shtetl marketplace service not available")
            return error_response("Shtetl marketplace service unavailable", 503)

        # Get listings
        result = service.get_listings(
            limit=limit,
            offset=offset,
            search=search,
            category=category,
            subcategory=subcategory,
            transaction_type=transaction_type,
            is_gemach=is_gemach,
            kosher_agency=kosher_agency,
            holiday_category=holiday_category,
            min_price=min_price,
            max_price=max_price,
            city=city,
            state=state,
            status=status,
            lat=lat,
            lng=lng,
            radius=radius,
        )
        
        logger.info(f"Shtetl service result: {result}")

        if result["success"]:
            return success_response(result["data"])
        else:
            return error_response(result.get("error", "Failed to fetch shtetl listings"), 500)

    except Exception as e:
        logger.exception("Error fetching shtetl marketplace listings")
        return error_response(
            "Failed to fetch shtetl listings", 500, {"details": str(e)}
        )


@shtetl_bp.route("/listings/<listing_id>", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_shtetl_listing(listing_id):
    """Get a specific shtetl marketplace listing by ID."""
    try:
        # Use shtetl service
        service = create_shtetl_service()
        if not service:
            logger.warning("Shtetl marketplace service not available")
            return not_found_response(f"Shtetl listing with ID {listing_id}", "listing")

        result = service.get_listing_by_id(listing_id)
        if result["success"]:
            return success_response(result["data"])
        else:
            return not_found_response(f"Shtetl listing with ID {listing_id}", "listing")

    except Exception as e:
        logger.exception("Error fetching shtetl marketplace listing")
        return error_response(
            "Failed to fetch shtetl listing", 500, {"details": str(e)}
        )


@shtetl_bp.route("/listings", methods=["POST"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def create_shtetl_listing():
    """Create a new shtetl marketplace listing."""
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
            "seller_user_id": user.get("user_id"),
            "created_by": user.get("user_id")
        }

        # Use shtetl service
        service = create_shtetl_service()
        if not service:
            return error_response("Shtetl marketplace service unavailable", 503)

        result = service.create_listing(listing_data)

        if result["success"]:
            return success_response(result["data"], "Shtetl listing created successfully", 201)
        else:
            return error_response(result.get("error", "Failed to create shtetl listing"), 400)

    except Exception as e:
        logger.exception("Error creating shtetl marketplace listing")
        return error_response(
            "Failed to create shtetl listing", 500, {"details": str(e)}
        )


@shtetl_bp.route("/categories", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_shtetl_categories():
    """Get shtetl marketplace categories and subcategories."""
    try:
        # Use shtetl service
        service = create_shtetl_service()
        if not service:
            # Fallback categories for Jewish community
            fallback_categories = [
                {"name": "Judaica", "subcategories": ["Mezuzot", "Kiddush Cups", "Tallitot"]},
                {"name": "Holiday Items", "subcategories": ["Passover", "Sukkot", "Purim"]},
                {"name": "Religious Books", "subcategories": ["Siddur", "Chumash", "Gemara"]},
                {"name": "Gemach Items", "subcategories": ["Baby Gear", "Books", "Tools"]},
                {"name": "Kosher Food", "subcategories": ["Meat", "Dairy", "Bakery"]}
            ]
            return success_response({"categories": fallback_categories})
        
        result = service.get_categories()
        if result["success"]:
            return success_response(result["data"])
        else:
            return error_response(result.get("error", "Failed to get shtetl categories"), 500)

    except Exception as e:
        logger.exception("Error fetching shtetl categories")
        return error_response(
            "Failed to fetch shtetl categories", 500, {"details": str(e)}
        )


@shtetl_bp.route("/stats", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_shtetl_stats():
    """Get shtetl marketplace statistics."""
    try:
        service = create_shtetl_service()
        if not service:
            return error_response("Shtetl marketplace service unavailable", 503)

        # Get basic stats
        result = service.get_listings(limit=1000, offset=0)  # Get all listings for stats
        
        if not result["success"]:
            return error_response("Failed to get shtetl stats", 500)

        listings = result["data"]["listings"]
        total_listings = result["data"]["total"]
        
        # Calculate statistics
        gemach_count = sum(1 for listing in listings if listing.get("is_gemach"))
        kosher_verified_count = sum(1 for listing in listings if listing.get("kosher_verified"))
        community_verified_count = sum(1 for listing in listings if listing.get("community_verified"))
        
        # Category breakdown
        category_stats = {}
        for listing in listings:
            category = listing.get("category_name", "Other")
            category_stats[category] = category_stats.get(category, 0) + 1

        stats = {
            "total_listings": total_listings,
            "active_listings": len([l for l in listings if l.get("status") == "active"]),
            "gemach_items": gemach_count,
            "kosher_verified_items": kosher_verified_count,
            "community_verified_items": community_verified_count,
            "category_breakdown": category_stats,
            "community_focus": True
        }

        return success_response(stats)

    except Exception as e:
        logger.exception("Error fetching shtetl marketplace stats")
        return error_response(
            "Failed to fetch shtetl stats", 500, {"details": str(e)}
        )


# Register error handlers for the blueprint
@shtetl_bp.errorhandler(404)
def shtetl_not_found(error):
    return error_response("Shtetl endpoint not found", 404)


@shtetl_bp.errorhandler(500)
def shtetl_internal_error(error):
    return error_response("Internal shtetl marketplace error", 500)