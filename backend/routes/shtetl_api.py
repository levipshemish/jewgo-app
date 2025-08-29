# !/usr/bin/env python3
"""Shtetl Marketplace API Routes.
Dedicated API routes for the Jewish community marketplace (shtetl),
completely separate from the regular marketplace. Includes both marketplace
listings and store management functionality.
Author: JewGo Development Team
Version: 2.0
Last Updated: 2025-08-28
"""
from flask import Blueprint, request
from utils.logging_config import get_logger
from utils.response_helpers import success_response, error_response
from utils.feature_flags_v4 import require_api_v4_flag
from utils.supabase_auth import require_supabase_auth, get_current_supabase_user
from utils.admin_auth import require_admin_auth

# Service imports
from services.shtetl_marketplace_service import ShtetlMarketplaceService
from services.shtetl_store_service import ShtetlStoreService, StoreData

logger = get_logger(__name__)
# Create blueprint
shtetl_bp = Blueprint("shtetl", __name__, url_prefix="/api/v4/shtetl")


def create_shtetl_service():
    """Create shtetl marketplace service instance."""
    try:
        from database.database_manager_v4 import DatabaseManager
        from utils.cache_manager_v4 import CacheManagerV4
        from utils.config_manager import ConfigManager

        db_manager = DatabaseManager()
        cache_manager = CacheManagerV4()
        config = ConfigManager()
        return ShtetlMarketplaceService(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
    except Exception as e:
        logger.error(f"Failed to create shtetl service: {e}")
        return None


def create_shtetl_store_service():
    """Create shtetl store service instance."""
    try:
        from database.database_manager_v4 import DatabaseManager
        from utils.cache_manager_v4 import CacheManagerV4
        from utils.config_manager import ConfigManager

        db_manager = DatabaseManager()
        cache_manager = CacheManagerV4()
        config = ConfigManager()
        return ShtetlStoreService(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
    except Exception as e:
        logger.error(f"Failed to create shtetl store service: {e}")
        return None


# ============================================================================
# MARKETPLACE LISTINGS ROUTES
# ============================================================================
@shtetl_bp.route("/listings", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_shtetl_listings():
    """Get shtetl marketplace listings with community-specific filtering."""
    try:
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        search = request.args.get("search")
        category = request.args.get("category")
        subcategory = request.args.get("subcategory")
        transaction_type = request.args.get(
            "transaction_type"
        )  # sale, gemach, trade, donation
        is_gemach = request.args.get("is_gemach")
        kosher_agency = request.args.get("kosher_agency")
        holiday_category = request.args.get("holiday_category")
        min_price = request.args.get("min_price")
        max_price = request.args.get("max_price")
        city = request.args.get("city")
        state = request.args.get("state")
        status = request.args.get("status", "active")
        lat = request.args.get("lat")
        lng = request.args.get("lng")
        radius = float(request.args.get("radius", 10.0))
        # Convert string parameters to appropriate types
        if is_gemach is not None:
            is_gemach = is_gemach.lower() in ("true", "1", "yes")
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
        if result["success"]:
            return success_response(result["data"])
        else:
            return error_response(
                result.get("error", "Failed to get shtetl listings"), 500
            )
    except Exception as e:
        logger.exception("Error fetching shtetl marketplace listings")
        return error_response(
            "Failed to fetch shtetl listings", 500, {"details": str(e)}
        )


@shtetl_bp.route("/listings/<listing_id>", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_shtetl_listing(listing_id):
    """Get a specific shtetl marketplace listing."""
    try:
        service = create_shtetl_service()
        if not service:
            return error_response("Shtetl marketplace service unavailable", 503)
        result = service.get_listing(listing_id)
        if result["success"]:
            return success_response(result["data"])
        else:
            return error_response(result.get("error", "Listing not found"), 404)
    except Exception as e:
        logger.exception("Error fetching shtetl listing")
        return error_response(
            "Failed to fetch shtetl listing", 500, {"details": str(e)}
        )


@shtetl_bp.route("/listings", methods=["POST"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def create_shtetl_listing():
    """Create a new shtetl marketplace listing."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        data = request.get_json()
        if not data:
            return error_response("Request data required", 400)
        service = create_shtetl_service()
        if not service:
            return error_response("Shtetl marketplace service unavailable", 503)
        # Add user ID to the listing data
        data["user_id"] = current_user.get("id")
        result = service.create_listing(data)
        if result["success"]:
            return success_response(
                result["data"], "Shtetl listing created successfully", 201
            )
        else:
            return error_response(
                result.get("error", "Failed to create shtetl listing"), 400
            )
    except Exception as e:
        logger.exception("Error creating shtetl marketplace listing")
        return error_response(
            "Failed to create shtetl listing", 500, {"details": str(e)}
        )


@shtetl_bp.route("/categories", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_shtetl_categories():
    """Get shtetl marketplace categories and subcategories."""
    try:
        # Use shtetl service
        service = create_shtetl_service()
        if not service:
            # Fallback categories for Jewish community
            fallback_categories = [
                {
                    "name": "Judaica",
                    "subcategories": ["Mezuzot", "Kiddush Cups", "Tallitot"],
                },
                {
                    "name": "Holiday Items",
                    "subcategories": ["Passover", "Sukkot", "Purim"],
                },
                {
                    "name": "Religious Books",
                    "subcategories": ["Siddur", "Chumash", "Gemara"],
                },
                {
                    "name": "Gemach Items",
                    "subcategories": ["Baby Gear", "Books", "Tools"],
                },
                {"name": "Kosher Food", "subcategories": ["Meat", "Dairy", "Bakery"]},
            ]
            return success_response({"categories": fallback_categories})
        result = service.get_categories()
        if result["success"]:
            return success_response(result["data"])
        else:
            return error_response(
                result.get("error", "Failed to get shtetl categories"), 500
            )
    except Exception as e:
        logger.exception("Error fetching shtetl categories")
        return error_response(
            "Failed to fetch shtetl categories", 500, {"details": str(e)}
        )


@shtetl_bp.route("/stats", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_shtetl_stats():
    """Get shtetl marketplace statistics."""
    try:
        service = create_shtetl_service()
        if not service:
            return error_response("Shtetl marketplace service unavailable", 503)
        # Get basic stats
        result = service.get_listings(
            limit=1000, offset=0
        )  # Get all listings for stats
        if not result["success"]:
            return error_response("Failed to get shtetl stats", 500)
        listings = result["data"]["listings"]
        total_listings = result["data"]["total"]
        # Calculate statistics
        gemach_count = sum(1 for listing in listings if listing.get("is_gemach"))
        kosher_verified_count = sum(
            1 for listing in listings if listing.get("kosher_verified")
        )
        community_verified_count = sum(
            1 for listing in listings if listing.get("community_verified")
        )
        # Category breakdown
        category_stats = {}
        for listing in listings:
            category = listing.get("category_name", "Other")
            category_stats[category] = category_stats.get(category, 0) + 1
        stats = {
            "total_listings": total_listings,
            "active_listings": len(
                [l for line in listings if l.get("status") == "active"]
            ),
            "gemach_items": gemach_count,
            "kosher_verified_items": kosher_verified_count,
            "community_verified_items": community_verified_count,
            "category_breakdown": category_stats,
            "community_focus": True,
        }
        return success_response(stats)
    except Exception as e:
        logger.exception("Error fetching shtetl marketplace stats")
        return error_response("Failed to fetch shtetl stats", 500, {"details": str(e)})


# ============================================================================
# STORE MANAGEMENT ROUTES
# ============================================================================
@shtetl_bp.route("/stores", methods=["POST"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def create_store():
    """Create a new store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Get request data
        data = request.get_json()
        if not data:
            return error_response("Request data required", 400)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Create store data object
        store_data = StoreData(
            owner_user_id=current_user.get("id"),
            store_name=data.get("store_name"),
            store_description=data.get("store_description"),
            store_type=data.get("store_type", "general"),
            store_category=data.get("store_category", "general"),
            subcategory=data.get("subcategory"),
            owner_name=data.get("owner_name", current_user.get("name", "")),
            owner_email=data.get("owner_email", current_user.get("email", "")),
            owner_phone=data.get("owner_phone"),
            address=data.get("address", ""),
            city=data.get("city", ""),
            state=data.get("state", ""),
            zip_code=data.get("zip_code"),
            phone_number=data.get("phone_number"),
            email=data.get("email"),
            website=data.get("website"),
            business_hours=data.get("business_hours"),
            timezone=data.get("timezone"),
            delivery_enabled=data.get("delivery_enabled", False),
            delivery_radius_miles=data.get("delivery_radius_miles", 10.0),
            delivery_fee=data.get("delivery_fee", 0.0),
            delivery_minimum=data.get("delivery_minimum", 0.0),
            pickup_enabled=data.get("pickup_enabled", True),
            kosher_certification=data.get("kosher_certification"),
            kosher_agency=data.get("kosher_agency"),
            kosher_level=data.get("kosher_level"),
            is_cholov_yisroel=data.get("is_cholov_yisroel", False),
            is_pas_yisroel=data.get("is_pas_yisroel", False),
            shabbos_orders=data.get("shabbos_orders", False),
            shabbos_delivery=data.get("shabbos_delivery", False),
            logo_url=data.get("logo_url"),
            banner_url=data.get("banner_url"),
            color_scheme=data.get("color_scheme", "blue"),
            custom_domain=data.get("custom_domain"),
            plan_type=data.get("plan_type", "free"),
        )
        # Create store
        success, message, result = service.create_store(store_data)
        if not success:
            return error_response(message, 400)
        return success_response(result, "Store created successfully", 201)
    except Exception as e:
        logger.exception("Error creating store")
        return error_response("Failed to create store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/my-store", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def get_my_store():
    """Get the current user's store."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.get_store_by_owner(current_user.get("id"))
        if not success:
            return error_response(message, 404)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching user's store")
        return error_response("Failed to fetch store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/<store_id>", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_store(store_id):
    """Get a specific store by ID."""
    try:
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store")
        return error_response("Failed to fetch store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/<store_id>", methods=["PUT"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def update_store(store_id):
    """Update a store."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        data = request.get_json()
        if not data:
            return error_response("Request data required", 400)
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Verify ownership
        success, message, store = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        if store.get("owner_user_id") != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Update store
        success, message, result = service.update_store(store_id, data)
        if not success:
            return error_response(message, 400)
        return success_response(result, "Store updated successfully")
    except Exception as e:
        logger.exception("Error updating store")
        return error_response("Failed to update store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/<store_id>", methods=["DELETE"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def delete_store(store_id):
    """Delete a store."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Verify ownership
        success, message, store = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        if store.get("owner_user_id") != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Delete store
        success, message = service.delete_store(store_id)
        if not success:
            return error_response(message, 400)
        return success_response(None, "Store deleted successfully")
    except Exception as e:
        logger.exception("Error deleting store")
        return error_response("Failed to delete store", 500, {"details": str(e)})


@shtetl_bp.route("/stores", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_stores():
    """Get all stores with filtering."""
    try:
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        search = request.args.get("search")
        category = request.args.get("category")
        city = request.args.get("city")
        state = request.args.get("state")
        kosher_agency = request.args.get("kosher_agency")
        delivery_enabled = request.args.get("delivery_enabled")
        pickup_enabled = request.args.get("pickup_enabled")
        status = request.args.get("status", "active")
        # Convert string parameters to appropriate types
        if delivery_enabled is not None:
            delivery_enabled = delivery_enabled.lower() in ("true", "1", "yes")
        if pickup_enabled is not None:
            pickup_enabled = pickup_enabled.lower() in ("true", "1", "yes")
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.get_stores(
            limit=limit,
            offset=offset,
            search=search,
            category=category,
            city=city,
            state=state,
            kosher_agency=kosher_agency,
            delivery_enabled=delivery_enabled,
            pickup_enabled=pickup_enabled,
            status=status,
        )
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching stores")
        return error_response("Failed to fetch stores", 500, {"details": str(e)})


@shtetl_bp.route("/stores/search", methods=["GET"])
@require_api_v4_flag("shtetl")
def search_stores():
    """Search stores with advanced filtering."""
    try:
        # Extract query parameters
        query = request.args.get("q", "")
        category = request.args.get("category")
        city = request.args.get("city")
        state = request.args.get("state")
        kosher_agency = request.args.get("kosher_agency")
        delivery_enabled = request.args.get("delivery_enabled")
        pickup_enabled = request.args.get("pickup_enabled")
        lat = request.args.get("lat")
        lng = request.args.get("lng")
        radius = float(request.args.get("radius", 10.0))
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = int(request.args.get("offset", 0))
        # Convert string parameters to appropriate types
        if delivery_enabled is not None:
            delivery_enabled = delivery_enabled.lower() in ("true", "1", "yes")
        if pickup_enabled is not None:
            pickup_enabled = pickup_enabled.lower() in ("true", "1", "yes")
        if lat is not None:
            lat = float(lat)
        if lng is not None:
            lng = float(lng)
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.search_stores(
            query=query,
            category=category,
            city=city,
            state=state,
            kosher_agency=kosher_agency,
            delivery_enabled=delivery_enabled,
            pickup_enabled=pickup_enabled,
            lat=lat,
            lng=lng,
            radius=radius,
            limit=limit,
            offset=offset,
        )
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error searching stores")
        return error_response("Failed to search stores", 500, {"details": str(e)})


@shtetl_bp.route("/stores/<store_id>/analytics", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def get_store_analytics(store_id):
    """Get store analytics."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Verify ownership
        success, message, store = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        if store.get("owner_user_id") != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Get analytics
        success, message, result = service.get_store_analytics(store_id)
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store analytics")
        return error_response(
            "Failed to fetch store analytics", 500, {"details": str(e)}
        )


@shtetl_bp.route("/stores/<store_id>/products", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_store_products(store_id):
    """Get products for a specific store."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        category = request.args.get("category")
        search = request.args.get("search")
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.get_store_products(
            store_id=store_id,
            limit=limit,
            offset=offset,
            category=category,
            search=search,
        )
        if not success:
            return error_response(message, 404)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store products")
        return error_response(
            "Failed to fetch store products", 500, {"details": str(e)}
        )


@shtetl_bp.route("/stores/<store_id>/orders", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def get_store_orders(store_id):
    """Get orders for a specific store."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        status = request.args.get("status")
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Verify ownership
        success, message, store = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        if store.get("owner_user_id") != current_user.get("id"):
            return error_response("Unauthorized", 403)
        success, message, result = service.get_store_orders(
            store_id=store_id, limit=limit, offset=offset, status=status
        )
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store orders")
        return error_response("Failed to fetch store orders", 500, {"details": str(e)})


@shtetl_bp.route("/stores/<store_id>/messages", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_supabase_auth
def get_store_messages(store_id):
    """Get messages for a specific store."""
    try:
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Verify ownership
        success, message, store = service.get_store(store_id)
        if not success:
            return error_response(message, 404)
        if store.get("owner_user_id") != current_user.get("id"):
            return error_response("Unauthorized", 403)
        success, message, result = service.get_store_messages(
            store_id=store_id, limit=limit, offset=offset
        )
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store messages")
        return error_response(
            "Failed to fetch store messages", 500, {"details": str(e)}
        )


@shtetl_bp.route("/stores/plan-limits", methods=["GET"])
@require_api_v4_flag("shtetl")
def get_plan_limits():
    """Get store plan limits and features."""
    try:
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.get_plan_limits()
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching plan limits")
        return error_response("Failed to fetch plan limits", 500, {"details": str(e)})


# ============================================================================
# ADMIN ROUTES
# ============================================================================
@shtetl_bp.route("/stores/admin/stores", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_admin_auth
def admin_get_stores():
    """Admin endpoint to get all stores."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        status = request.args.get("status")
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.admin_get_stores(
            limit=limit, offset=offset, status=status
        )
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching stores (admin)")
        return error_response("Failed to fetch stores", 500, {"details": str(e)})


@shtetl_bp.route("/stores/admin/stores/<store_id>/approve", methods=["POST"])
@require_api_v4_flag("shtetl")
@require_admin_auth
def admin_approve_store(store_id):
    """Admin endpoint to approve a store."""
    try:
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.admin_approve_store(store_id)
        if not success:
            return error_response(message, 400)
        return success_response(result, "Store approved successfully")
    except Exception as e:
        logger.exception("Error approving store")
        return error_response("Failed to approve store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/admin/stores/<store_id>/suspend", methods=["POST"])
@require_api_v4_flag("shtetl")
@require_admin_auth
def admin_suspend_store(store_id):
    """Admin endpoint to suspend a store."""
    try:
        data = request.get_json() or {}
        reason = data.get("reason", "No reason provided")
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.admin_suspend_store(store_id, reason)
        if not success:
            return error_response(message, 400)
        return success_response(result, "Store suspended successfully")
    except Exception as e:
        logger.exception("Error suspending store")
        return error_response("Failed to suspend store", 500, {"details": str(e)})


@shtetl_bp.route("/stores/admin/stores/<store_id>/analytics", methods=["GET"])
@require_api_v4_flag("shtetl")
@require_admin_auth
def admin_get_store_analytics(store_id):
    """Admin endpoint to get store analytics."""
    try:
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        success, message, result = service.admin_get_store_analytics(store_id)
        if not success:
            return error_response(message, 500)
        return success_response(result)
    except Exception as e:
        logger.exception("Error fetching store analytics (admin)")
        return error_response(
            "Failed to fetch store analytics", 500, {"details": str(e)}
        )


# ============================================================================
# ERROR HANDLERS
# ============================================================================
# Register error handlers for the blueprint
@shtetl_bp.errorhandler(404)
def shtetl_not_found(error):
    return error_response("Shtetl endpoint not found", 404)


@shtetl_bp.errorhandler(500)
def shtetl_internal_error(error):
    return error_response("Internal shtetl marketplace error", 500)
