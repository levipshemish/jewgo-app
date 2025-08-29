# !/usr/bin/env python3
"""Shtetl Store API Routes.
Comprehensive API routes for Jewish community marketplace store management.
Handles store creation, management, analytics, and admin functions.
Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""
from flask import Blueprint, request
from utils.logging_config import get_logger
from utils.response_helpers import success_response, error_response, not_found_response
from utils.feature_flags_v4 import require_api_v4_flag
from utils.supabase_auth import require_supabase_auth, get_current_supabase_user
from utils.admin_auth import require_admin_auth

# Service imports
from services.shtetl_store_service import ShtetlStoreService, StoreData

logger = get_logger(__name__)
# Create blueprint
shtetl_store_bp = Blueprint(
    "shtetl_store", __name__, url_prefix="/api/v4/shtetl/stores"
)


def create_shtetl_store_service():
    """Create shtetl store service instance."""
    try:
        from database.database_manager_v4 import DatabaseManagerV4
        from utils.cache_manager_v4 import CacheManagerV4
        from utils.config_manager import ConfigManager

        db_manager = DatabaseManagerV4()
        cache_manager = CacheManagerV4()
        config = ConfigManager()
        return ShtetlStoreService(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
    except Exception as e:
        logger.error(f"Failed to create shtetl store service: {e}")
        return None


@shtetl_store_bp.route("/", methods=["POST"])
@require_api_v4_flag("api_v4_shtetl")
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
        logger.info(
            f"Store created: {result.get('store_id')} by user {current_user.get('id')}"
        )
        return success_response(message, result)
    except Exception as e:
        logger.error(f"Error creating store: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/my-store", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def get_my_store():
    """Get current user's store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store by owner
        store = service.get_store_by_owner(current_user.get("id"))
        if not store:
            return not_found_response("Store not found")
        # Convert to dict for response
        store_dict = {
            "store_id": store.store_id,
            "store_name": store.store_name,
            "store_description": store.store_description,
            "store_type": store.store_type,
            "store_category": store.store_category,
            "subcategory": store.subcategory,
            "address": store.address,
            "city": store.city,
            "state": store.state,
            "zip_code": store.zip_code,
            "phone_number": store.phone_number,
            "email": store.email,
            "website": store.website,
            "business_hours": store.business_hours,
            "delivery_enabled": store.delivery_enabled,
            "delivery_radius_miles": store.delivery_radius_miles,
            "delivery_fee": store.delivery_fee,
            "delivery_minimum": store.delivery_minimum,
            "pickup_enabled": store.pickup_enabled,
            "kosher_certification": store.kosher_certification,
            "kosher_agency": store.kosher_agency,
            "kosher_level": store.kosher_level,
            "is_cholov_yisroel": store.is_cholov_yisroel,
            "is_pas_yisroel": store.is_pas_yisroel,
            "shabbos_orders": store.shabbos_orders,
            "shabbos_delivery": store.shabbos_delivery,
            "logo_url": store.logo_url,
            "banner_url": store.banner_url,
            "color_scheme": store.color_scheme,
            "custom_domain": store.custom_domain,
            "plan_type": store.plan_type,
            "is_active": store.is_active,
            "is_approved": store.is_approved,
            "status": store.status,
            "total_products": store.total_products,
            "total_orders": store.total_orders,
            "total_revenue": store.total_revenue,
            "total_customers": store.total_customers,
            "average_rating": store.average_rating,
            "review_count": store.review_count,
            "created_at": store.created_at.isoformat() if store.created_at else None,
            "updated_at": store.updated_at.isoformat() if store.updated_at else None,
        }
        return success_response("Store retrieved successfully", store_dict)
    except Exception as e:
        logger.error(f"Error getting store: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_store(store_id):
    """Get store by ID (public endpoint)."""
    try:
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        # Only return active and approved stores for public access
        if not store.is_active or not store.is_approved:
            return not_found_response("Store not found")
        # Convert to dict for response (limited public data)
        store_dict = {
            "store_id": store.store_id,
            "store_name": store.store_name,
            "store_description": store.store_description,
            "store_type": store.store_type,
            "store_category": store.store_category,
            "subcategory": store.subcategory,
            "city": store.city,
            "state": store.state,
            "phone_number": store.phone_number,
            "email": store.email,
            "website": store.website,
            "business_hours": store.business_hours,
            "delivery_enabled": store.delivery_enabled,
            "delivery_radius_miles": store.delivery_radius_miles,
            "delivery_fee": store.delivery_fee,
            "delivery_minimum": store.delivery_minimum,
            "pickup_enabled": store.pickup_enabled,
            "kosher_certification": store.kosher_certification,
            "kosher_agency": store.kosher_agency,
            "kosher_level": store.kosher_level,
            "is_cholov_yisroel": store.is_cholov_yisroel,
            "is_pas_yisroel": store.is_pas_yisroel,
            "shabbos_orders": store.shabbos_orders,
            "shabbos_delivery": store.shabbos_delivery,
            "logo_url": store.logo_url,
            "banner_url": store.banner_url,
            "color_scheme": store.color_scheme,
            "average_rating": store.average_rating,
            "review_count": store.review_count,
            "total_products": store.total_products,
            "total_orders": store.total_orders,
        }
        return success_response("Store retrieved successfully", store_dict)
    except Exception as e:
        logger.error(f"Error getting store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>", methods=["PUT"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def update_store(store_id):
    """Update store information."""
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
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Update store
        success, message = service.update_store(store_id, data)
        if not success:
            return error_response(message, 400)
        logger.info(f"Store updated: {store_id} by user {current_user.get('id')}")
        return success_response(message)
    except Exception as e:
        logger.error(f"Error updating store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>", methods=["DELETE"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def delete_store(store_id):
    """Delete store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Delete store
        success, message = service.delete_store(store_id)
        if not success:
            return error_response(message, 400)
        logger.info(f"Store deleted: {store_id} by user {current_user.get('id')}")
        return success_response(message)
    except Exception as e:
        logger.error(f"Error deleting store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_stores():
    """Get stores with filtering."""
    try:
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        city = request.args.get("city")
        state = request.args.get("state")
        store_type = request.args.get("store_type")
        store_category = request.args.get("store_category")
        kosher_agency = request.args.get("kosher_agency")
        is_active = request.args.get("is_active")
        is_approved = request.args.get("is_approved")
        plan_type = request.args.get("plan_type")
        # Convert string parameters to appropriate types
        if is_active is not None:
            is_active = is_active.lower() in ("true", "1", "yes")
        if is_approved is not None:
            is_approved = is_approved.lower() in ("true", "1", "yes")
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get stores
        stores = service.get_stores(
            limit=limit,
            offset=offset,
            city=city,
            state=state,
            store_type=store_type,
            store_category=store_category,
            kosher_agency=kosher_agency,
            is_active=is_active,
            is_approved=is_approved,
            plan_type=plan_type,
        )
        # Convert to list of dicts
        stores_list = []
        for store in stores:
            store_dict = {
                "store_id": store.store_id,
                "store_name": store.store_name,
                "store_description": store.store_description,
                "store_type": store.store_type,
                "store_category": store.store_category,
                "city": store.city,
                "state": store.state,
                "kosher_agency": store.kosher_agency,
                "kosher_level": store.kosher_level,
                "logo_url": store.logo_url,
                "average_rating": store.average_rating,
                "review_count": store.review_count,
                "total_products": store.total_products,
                "total_orders": store.total_orders,
                "created_at": (
                    store.created_at.isoformat() if store.created_at else None
                ),
            }
            stores_list.append(store_dict)
        return success_response(
            "Stores retrieved successfully",
            {
                "stores": stores_list,
                "total": len(stores_list),
                "limit": limit,
                "offset": offset,
            },
        )
    except Exception as e:
        logger.error(f"Error getting stores: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/search", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def search_stores():
    """Search stores."""
    try:
        # Extract query parameters
        search_term = request.args.get("q", "")
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        if not search_term:
            return error_response("Search term required", 400)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Search stores
        stores = service.search_stores(search_term, limit, offset)
        # Convert to list of dicts
        stores_list = []
        for store in stores:
            store_dict = {
                "store_id": store.store_id,
                "store_name": store.store_name,
                "store_description": store.store_description,
                "store_type": store.store_type,
                "store_category": store.store_category,
                "city": store.city,
                "state": store.state,
                "kosher_agency": store.kosher_agency,
                "kosher_level": store.kosher_level,
                "logo_url": store.logo_url,
                "average_rating": store.average_rating,
                "review_count": store.review_count,
                "total_products": store.total_products,
                "total_orders": store.total_orders,
            }
            stores_list.append(store_dict)
        return success_response(
            "Stores search completed",
            {
                "stores": stores_list,
                "total": len(stores_list),
                "search_term": search_term,
                "limit": limit,
                "offset": offset,
            },
        )
    except Exception as e:
        logger.error(f"Error searching stores: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>/analytics", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def get_store_analytics(store_id):
    """Get store analytics."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Extract query parameters
        period = request.args.get("period", "total")
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Get analytics
        analytics = service.get_store_analytics(store_id, period)
        if not analytics:
            return error_response("Could not retrieve analytics", 500)
        # Convert to dict for response
        analytics_dict = {
            "store_id": analytics.store_id,
            "period": analytics.period,
            "revenue": analytics.revenue,
            "revenue_growth": analytics.revenue_growth,
            "orders": analytics.orders,
            "orders_growth": analytics.orders_growth,
            "average_order_value": analytics.average_order_value,
            "new_customers": analytics.new_customers,
            "returning_customers": analytics.returning_customers,
            "total_customers": analytics.total_customers,
            "customer_growth": analytics.customer_growth,
            "active_products": analytics.active_products,
            "featured_products": analytics.featured_products,
            "low_stock_products": analytics.low_stock_products,
            "total_products": analytics.total_products,
            "page_views": analytics.page_views,
            "unique_visitors": analytics.unique_visitors,
            "conversion_rate": analytics.conversion_rate,
            "start_date": (
                analytics.start_date.isoformat() if analytics.start_date else None
            ),
            "end_date": analytics.end_date.isoformat() if analytics.end_date else None,
        }
        return success_response("Analytics retrieved successfully", analytics_dict)
    except Exception as e:
        logger.error(f"Error getting analytics for store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>/products", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def get_store_products(store_id):
    """Get products for a store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Get products
        products = service.get_store_products(store_id, limit, offset)
        return success_response(
            "Products retrieved successfully",
            {
                "products": products,
                "total": len(products),
                "limit": limit,
                "offset": offset,
            },
        )
    except Exception as e:
        logger.error(f"Error getting products for store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>/orders", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def get_store_orders(store_id):
    """Get orders for a store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Get orders
        orders = service.get_store_orders(store_id, limit, offset)
        return success_response(
            "Orders retrieved successfully",
            {"orders": orders, "total": len(orders), "limit": limit, "offset": offset},
        )
    except Exception as e:
        logger.error(f"Error getting orders for store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/<store_id>/messages", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_supabase_auth
def get_store_messages(store_id):
    """Get messages for a store."""
    try:
        # Get current user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get store and verify ownership
        store = service.get_store(store_id)
        if not store:
            return not_found_response("Store not found")
        if store.owner_user_id != current_user.get("id"):
            return error_response("Unauthorized", 403)
        # Get messages
        messages = service.get_store_messages(store_id, limit, offset)
        return success_response(
            "Messages retrieved successfully",
            {
                "messages": messages,
                "total": len(messages),
                "limit": limit,
                "offset": offset,
            },
        )
    except Exception as e:
        logger.error(f"Error getting messages for store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/plan-limits", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
def get_plan_limits():
    """Get plan limits and features."""
    try:
        plan_type = request.args.get("plan_type", "free")
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get plan limits
        plan_limits = service.get_plan_limits(plan_type)
        return success_response(
            "Plan limits retrieved successfully",
            {"plan_type": plan_type, "limits": plan_limits},
        )
    except Exception as e:
        logger.error(f"Error getting plan limits: {e}")
        return error_response("Internal server error", 500)


# Admin endpoints
@shtetl_store_bp.route("/admin/stores", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_admin_auth
def admin_get_stores():
    """Admin: Get all stores with admin data."""
    try:
        # Extract query parameters
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        status = request.args.get("status")
        is_approved = request.args.get("is_approved")
        # Convert string parameters to appropriate types
        if is_approved is not None:
            is_approved = is_approved.lower() in ("true", "1", "yes")
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get stores with admin filters
        stores = service.get_stores(limit=limit, offset=offset, is_approved=is_approved)
        # Filter by status if provided
        if status:
            stores = [s for s in stores if s.status == status]
        # Convert to list of dicts with admin data
        stores_list = []
        for store in stores:
            store_dict = {
                "store_id": store.store_id,
                "store_name": store.store_name,
                "owner_name": store.owner_name,
                "owner_email": store.owner_email,
                "city": store.city,
                "state": store.state,
                "store_type": store.store_type,
                "store_category": store.store_category,
                "plan_type": store.plan_type,
                "is_active": store.is_active,
                "is_approved": store.is_approved,
                "status": store.status,
                "total_products": store.total_products,
                "total_orders": store.total_orders,
                "total_revenue": store.total_revenue,
                "average_rating": store.average_rating,
                "created_at": (
                    store.created_at.isoformat() if store.created_at else None
                ),
                "updated_at": (
                    store.updated_at.isoformat() if store.updated_at else None
                ),
            }
            stores_list.append(store_dict)
        return success_response(
            "Stores retrieved successfully",
            {
                "stores": stores_list,
                "total": len(stores_list),
                "limit": limit,
                "offset": offset,
            },
        )
    except Exception as e:
        logger.error(f"Error getting stores (admin): {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/admin/stores/<store_id>/approve", methods=["POST"])
@require_api_v4_flag("api_v4_shtetl")
@require_admin_auth
def admin_approve_store(store_id):
    """Admin: Approve a store."""
    try:
        # Get current admin user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Approve store
        success, message = service.approve_store(store_id, current_user.get("id"))
        if not success:
            return error_response(message, 400)
        logger.info(f"Store approved: {store_id} by admin {current_user.get('id')}")
        return success_response(message)
    except Exception as e:
        logger.error(f"Error approving store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/admin/stores/<store_id>/suspend", methods=["POST"])
@require_api_v4_flag("api_v4_shtetl")
@require_admin_auth
def admin_suspend_store(store_id):
    """Admin: Suspend a store."""
    try:
        # Get request data
        data = request.get_json()
        reason = (
            data.get("reason", "No reason provided") if data else "No reason provided"
        )
        # Get current admin user
        current_user = get_current_supabase_user()
        if not current_user:
            return error_response("Authentication required", 401)
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Suspend store
        success, message = service.suspend_store(store_id, reason)
        if not success:
            return error_response(message, 400)
        logger.info(
            f"Store suspended: {store_id} by admin {current_user.get('id')} - Reason: {reason}"
        )
        return success_response(message)
    except Exception as e:
        logger.error(f"Error suspending store {store_id}: {e}")
        return error_response("Internal server error", 500)


@shtetl_store_bp.route("/admin/stores/<store_id>/analytics", methods=["GET"])
@require_api_v4_flag("api_v4_shtetl")
@require_admin_auth
def admin_get_store_analytics(store_id):
    """Admin: Get store analytics."""
    try:
        # Extract query parameters
        period = request.args.get("period", "total")
        # Create service instance
        service = create_shtetl_store_service()
        if not service:
            return error_response("Store service unavailable", 503)
        # Get analytics
        analytics = service.get_store_analytics(store_id, period)
        if not analytics:
            return error_response("Could not retrieve analytics", 500)
        # Convert to dict for response
        analytics_dict = {
            "store_id": analytics.store_id,
            "period": analytics.period,
            "revenue": analytics.revenue,
            "revenue_growth": analytics.revenue_growth,
            "orders": analytics.orders,
            "orders_growth": analytics.orders_growth,
            "average_order_value": analytics.average_order_value,
            "new_customers": analytics.new_customers,
            "returning_customers": analytics.returning_customers,
            "total_customers": analytics.total_customers,
            "customer_growth": analytics.customer_growth,
            "active_products": analytics.active_products,
            "featured_products": analytics.featured_products,
            "low_stock_products": analytics.low_stock_products,
            "total_products": analytics.total_products,
            "page_views": analytics.page_views,
            "unique_visitors": analytics.unique_visitors,
            "conversion_rate": analytics.conversion_rate,
            "start_date": (
                analytics.start_date.isoformat() if analytics.start_date else None
            ),
            "end_date": analytics.end_date.isoformat() if analytics.end_date else None,
        }
        return success_response("Analytics retrieved successfully", analytics_dict)
    except Exception as e:
        logger.error(f"Error getting analytics for store {store_id} (admin): {e}")
        return error_response("Internal server error", 500)
