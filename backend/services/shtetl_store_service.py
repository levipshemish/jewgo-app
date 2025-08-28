#!/usr/bin/env python3
"""Shtetl Store Service.

Comprehensive service for managing Jewish community marketplace stores.
Handles store creation, management, analytics, and business logic.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict

from utils.logging_config import get_logger
from utils.response_helpers import success_response, error_response
from utils.cache_manager_v4 import CacheManagerV4
from utils.config_manager import ConfigManager

logger = get_logger(__name__)


@dataclass
class StoreData:
    """Store data structure."""
    # Basic store information
    store_id: str
    owner_user_id: str
    store_name: str
    store_description: Optional[str] = None
    store_type: str = "general"
    store_category: str = "general"
    subcategory: Optional[str] = None
    
    # Owner information
    owner_name: str = ""
    owner_email: str = ""
    owner_phone: Optional[str] = None
    
    # Location
    address: str = ""
    city: str = ""
    state: str = ""
    zip_code: Optional[str] = None
    country: str = "USA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Contact
    phone_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    
    # Business hours
    business_hours: Optional[str] = None
    timezone: Optional[str] = None
    
    # Delivery settings
    delivery_enabled: bool = False
    delivery_radius_miles: float = 10.0
    delivery_fee: float = 0.0
    delivery_minimum: float = 0.0
    pickup_enabled: bool = True
    
    # Kosher settings
    kosher_certification: Optional[str] = None
    kosher_agency: Optional[str] = None
    kosher_level: Optional[str] = None
    is_cholov_yisroel: bool = False
    is_pas_yisroel: bool = False
    shabbos_orders: bool = False
    shabbos_delivery: bool = False
    
    # Customization
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    color_scheme: str = "blue"
    custom_domain: Optional[str] = None
    
    # Plan and billing
    plan_type: str = "free"
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_approved: bool = False
    status: str = "pending"
    
    # Statistics (computed)
    total_products: int = 0
    total_orders: int = 0
    total_revenue: float = 0.0
    total_customers: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class StoreAnalytics:
    """Store analytics data structure."""
    store_id: str
    period: str  # daily, weekly, monthly, total
    
    # Revenue metrics
    revenue: float = 0.0
    revenue_growth: float = 0.0
    
    # Order metrics
    orders: int = 0
    orders_growth: float = 0.0
    average_order_value: float = 0.0
    
    # Customer metrics
    new_customers: int = 0
    returning_customers: int = 0
    total_customers: int = 0
    customer_growth: float = 0.0
    
    # Product metrics
    active_products: int = 0
    featured_products: int = 0
    low_stock_products: int = 0
    total_products: int = 0
    
    # Performance metrics
    page_views: int = 0
    unique_visitors: int = 0
    conversion_rate: float = 0.0
    
    # Date range
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ShtetlStoreService:
    """Service for managing Shtetl marketplace stores."""

    def __init__(self, db_manager, cache_manager: CacheManagerV4, config: ConfigManager):
        """Initialize the service."""
        self.db_manager = db_manager
        self.cache_manager = cache_manager
        self.config = config
        self.logger = get_logger(__name__)

    def create_store(self, store_data: StoreData) -> Tuple[bool, str, Optional[Dict]]:
        """Create a new store."""
        try:
            # Generate store ID
            store_data.store_id = str(uuid.uuid4())
            store_data.created_at = datetime.utcnow()
            store_data.updated_at = datetime.utcnow()
            
            # Validate required fields
            if not store_data.store_name or not store_data.owner_user_id:
                return False, "Store name and owner user ID are required", None
            
            # Check if user already has a store
            existing_store = self.get_store_by_owner(store_data.owner_user_id)
            if existing_store:
                return False, "User already has a store", None
            
            # Insert store into database
            query = """
                INSERT INTO shtetl_stores (
                    store_id, owner_user_id, store_name, store_description, store_type, 
                    store_category, subcategory, owner_name, owner_email, owner_phone,
                    address, city, state, zip_code, country, latitude, longitude,
                    phone_number, email, website, business_hours, timezone,
                    delivery_enabled, delivery_radius_miles, delivery_fee, delivery_minimum, pickup_enabled,
                    kosher_certification, kosher_agency, kosher_level, is_cholov_yisroel, is_pas_yisroel,
                    shabbos_orders, shabbos_delivery, logo_url, banner_url, color_scheme, custom_domain,
                    plan_type, stripe_customer_id, stripe_subscription_id, is_active, is_approved, status,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """
            
            params = (
                store_data.store_id, store_data.owner_user_id, store_data.store_name,
                store_data.store_description, store_data.store_type, store_data.store_category,
                store_data.subcategory, store_data.owner_name, store_data.owner_email,
                store_data.owner_phone, store_data.address, store_data.city, store_data.state,
                store_data.zip_code, store_data.country, store_data.latitude, store_data.longitude,
                store_data.phone_number, store_data.email, store_data.website,
                store_data.business_hours, store_data.timezone, store_data.delivery_enabled,
                store_data.delivery_radius_miles, store_data.delivery_fee, store_data.delivery_minimum,
                store_data.pickup_enabled, store_data.kosher_certification, store_data.kosher_agency,
                store_data.kosher_level, store_data.is_cholov_yisroel, store_data.is_pas_yisroel,
                store_data.shabbos_orders, store_data.shabbos_delivery, store_data.logo_url,
                store_data.banner_url, store_data.color_scheme, store_data.custom_domain,
                store_data.plan_type, store_data.stripe_customer_id, store_data.stripe_subscription_id,
                store_data.is_active, store_data.is_approved, store_data.status,
                store_data.created_at, store_data.updated_at
            )
            
            result = self.db_manager.execute_query(query, params, fetch_one=True)
            if not result:
                return False, "Failed to create store", None
            
            # Clear cache
            self.cache_manager.delete(f"store:{store_data.store_id}")
            self.cache_manager.delete(f"store_owner:{store_data.owner_user_id}")
            
            self.logger.info(f"Created store {store_data.store_id} for user {store_data.owner_user_id}")
            return True, "Store created successfully", {"store_id": store_data.store_id}
            
        except Exception as e:
            self.logger.error(f"Error creating store: {e}")
            return False, f"Error creating store: {str(e)}", None

    def get_store(self, store_id: str) -> Optional[StoreData]:
        """Get store by ID."""
        try:
            # Check cache first
            cache_key = f"store:{store_id}"
            cached_store = self.cache_manager.get(cache_key)
            if cached_store:
                return StoreData(**json.loads(cached_store))
            
            # Query database
            query = """
                SELECT * FROM shtetl_stores WHERE store_id = %s
            """
            result = self.db_manager.execute_query(query, (store_id,), fetch_one=True)
            
            if not result:
                return None
            
            # Convert to StoreData
            store_data = StoreData(**result)
            
            # Cache the result
            self.cache_manager.set(cache_key, json.dumps(asdict(store_data)), ttl=300)
            
            return store_data
            
        except Exception as e:
            self.logger.error(f"Error getting store {store_id}: {e}")
            return None

    def get_store_by_owner(self, owner_user_id: str) -> Optional[StoreData]:
        """Get store by owner user ID."""
        try:
            # Check cache first
            cache_key = f"store_owner:{owner_user_id}"
            cached_store = self.cache_manager.get(cache_key)
            if cached_store:
                return StoreData(**json.loads(cached_store))
            
            # Query database
            query = """
                SELECT * FROM shtetl_stores WHERE owner_user_id = %s
            """
            result = self.db_manager.execute_query(query, (owner_user_id,), fetch_one=True)
            
            if not result:
                return None
            
            # Convert to StoreData
            store_data = StoreData(**result)
            
            # Cache the result
            self.cache_manager.set(cache_key, json.dumps(asdict(store_data)), ttl=300)
            
            return store_data
            
        except Exception as e:
            self.logger.error(f"Error getting store for owner {owner_user_id}: {e}")
            return None

    def update_store(self, store_id: str, updates: Dict[str, Any]) -> Tuple[bool, str]:
        """Update store information."""
        try:
            # Get current store
            current_store = self.get_store(store_id)
            if not current_store:
                return False, "Store not found"
            
            # Build update query
            set_clauses = []
            params = []
            
            for key, value in updates.items():
                if hasattr(current_store, key):
                    set_clauses.append(f"{key} = %s")
                    params.append(value)
            
            if not set_clauses:
                return False, "No valid fields to update"
            
            # Add updated_at
            set_clauses.append("updated_at = %s")
            params.append(datetime.utcnow())
            params.append(store_id)
            
            query = f"""
                UPDATE shtetl_stores 
                SET {', '.join(set_clauses)}
                WHERE store_id = %s
            """
            
            result = self.db_manager.execute_query(query, params)
            if not result:
                return False, "Failed to update store"
            
            # Clear cache
            self.cache_manager.delete(f"store:{store_id}")
            self.cache_manager.delete(f"store_owner:{current_store.owner_user_id}")
            
            self.logger.info(f"Updated store {store_id}")
            return True, "Store updated successfully"
            
        except Exception as e:
            self.logger.error(f"Error updating store {store_id}: {e}")
            return False, f"Error updating store: {str(e)}"

    def delete_store(self, store_id: str) -> Tuple[bool, str]:
        """Delete a store."""
        try:
            # Get store first
            store = self.get_store(store_id)
            if not store:
                return False, "Store not found"
            
            # Soft delete - set status to closed
            query = """
                UPDATE shtetl_stores 
                SET status = 'closed', is_active = false, updated_at = %s
                WHERE store_id = %s
            """
            
            result = self.db_manager.execute_query(query, (datetime.utcnow(), store_id))
            if not result:
                return False, "Failed to delete store"
            
            # Clear cache
            self.cache_manager.delete(f"store:{store_id}")
            self.cache_manager.delete(f"store_owner:{store.owner_user_id}")
            
            self.logger.info(f"Deleted store {store_id}")
            return True, "Store deleted successfully"
            
        except Exception as e:
            self.logger.error(f"Error deleting store {store_id}: {e}")
            return False, f"Error deleting store: {str(e)}"

    def get_stores(self, 
                   limit: int = 50, 
                   offset: int = 0,
                   city: Optional[str] = None,
                   state: Optional[str] = None,
                   store_type: Optional[str] = None,
                   store_category: Optional[str] = None,
                   kosher_agency: Optional[str] = None,
                   is_active: Optional[bool] = None,
                   is_approved: Optional[bool] = None,
                   plan_type: Optional[str] = None) -> List[StoreData]:
        """Get stores with filtering."""
        try:
            # Build query
            query = "SELECT * FROM shtetl_stores WHERE 1=1"
            params = []
            
            if city:
                query += " AND city ILIKE %s"
                params.append(f"%{city}%")
            
            if state:
                query += " AND state ILIKE %s"
                params.append(f"%{state}%")
            
            if store_type:
                query += " AND store_type = %s"
                params.append(store_type)
            
            if store_category:
                query += " AND store_category = %s"
                params.append(store_category)
            
            if kosher_agency:
                query += " AND kosher_agency = %s"
                params.append(kosher_agency)
            
            if is_active is not None:
                query += " AND is_active = %s"
                params.append(is_active)
            
            if is_approved is not None:
                query += " AND is_approved = %s"
                params.append(is_approved)
            
            if plan_type:
                query += " AND plan_type = %s"
                params.append(plan_type)
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            results = self.db_manager.execute_query(query, params, fetch_all=True)
            
            stores = []
            for result in results:
                stores.append(StoreData(**result))
            
            return stores
            
        except Exception as e:
            self.logger.error(f"Error getting stores: {e}")
            return []

    def approve_store(self, store_id: str, approved_by: str) -> Tuple[bool, str]:
        """Approve a store."""
        try:
            updates = {
                "is_approved": True,
                "approval_date": datetime.utcnow(),
                "approved_by": approved_by,
                "status": "active"
            }
            
            return self.update_store(store_id, updates)
            
        except Exception as e:
            self.logger.error(f"Error approving store {store_id}: {e}")
            return False, f"Error approving store: {str(e)}"

    def suspend_store(self, store_id: str, reason: str) -> Tuple[bool, str]:
        """Suspend a store."""
        try:
            updates = {
                "is_active": False,
                "status": "suspended",
                "admin_notes": f"Store suspended: {reason}"
            }
            
            return self.update_store(store_id, updates)
            
        except Exception as e:
            self.logger.error(f"Error suspending store {store_id}: {e}")
            return False, f"Error suspending store: {str(e)}"

    def get_store_analytics(self, store_id: str, period: str = "total") -> Optional[StoreAnalytics]:
        """Get store analytics."""
        try:
            # Check cache first
            cache_key = f"store_analytics:{store_id}:{period}"
            cached_analytics = self.cache_manager.get(cache_key)
            if cached_analytics:
                return StoreAnalytics(**json.loads(cached_analytics))
            
            # Calculate date range
            end_date = datetime.utcnow()
            if period == "daily":
                start_date = end_date - timedelta(days=1)
            elif period == "weekly":
                start_date = end_date - timedelta(weeks=1)
            elif period == "monthly":
                start_date = end_date - timedelta(days=30)
            else:  # total
                start_date = None
            
            # Get analytics data
            analytics = StoreAnalytics(
                store_id=store_id,
                period=period,
                start_date=start_date,
                end_date=end_date
            )
            
            # Query revenue and orders
            if start_date:
                revenue_query = """
                    SELECT COALESCE(SUM(total_amount), 0) as revenue,
                           COUNT(*) as orders
                    FROM shtetl_orders 
                    WHERE store_id = %s AND created_at >= %s AND created_at <= %s
                """
                revenue_result = self.db_manager.execute_query(
                    revenue_query, (store_id, start_date, end_date), fetch_one=True
                )
            else:
                revenue_query = """
                    SELECT COALESCE(SUM(total_amount), 0) as revenue,
                       COUNT(*) as orders
                    FROM shtetl_orders 
                    WHERE store_id = %s
                """
                revenue_result = self.db_manager.execute_query(
                    revenue_query, (store_id,), fetch_one=True
                )
            
            if revenue_result:
                analytics.revenue = float(revenue_result.get('revenue', 0))
                analytics.orders = int(revenue_result.get('orders', 0))
                analytics.average_order_value = analytics.revenue / analytics.orders if analytics.orders > 0 else 0
            
            # Query products
            products_query = """
                SELECT COUNT(*) as total_products,
                       COUNT(CASE WHEN is_available = true THEN 1 END) as active_products,
                       COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_products,
                       COUNT(CASE WHEN stock_quantity <= 5 THEN 1 END) as low_stock_products
                FROM shtetl_marketplace 
                WHERE seller_user_id = %s
            """
            products_result = self.db_manager.execute_query(
                products_query, (store_id,), fetch_one=True
            )
            
            if products_result:
                analytics.total_products = int(products_result.get('total_products', 0))
                analytics.active_products = int(products_result.get('active_products', 0))
                analytics.featured_products = int(products_result.get('featured_products', 0))
                analytics.low_stock_products = int(products_result.get('low_stock_products', 0))
            
            # Query customers
            customers_query = """
                SELECT COUNT(DISTINCT customer_user_id) as total_customers
                FROM shtetl_orders 
                WHERE store_id = %s
            """
            customers_result = self.db_manager.execute_query(
                customers_query, (store_id,), fetch_one=True
            )
            
            if customers_result:
                analytics.total_customers = int(customers_result.get('total_customers', 0))
            
            # Cache the result
            self.cache_manager.set(cache_key, json.dumps(asdict(analytics)), ttl=600)
            
            return analytics
            
        except Exception as e:
            self.logger.error(f"Error getting analytics for store {store_id}: {e}")
            return None

    def update_store_stats(self, store_id: str) -> Tuple[bool, str]:
        """Update store statistics."""
        try:
            # Get current stats
            analytics = self.get_store_analytics(store_id, "total")
            if not analytics:
                return False, "Could not calculate analytics"
            
            # Update store record
            updates = {
                "total_products": analytics.total_products,
                "total_orders": analytics.orders,
                "total_revenue": analytics.revenue,
                "total_customers": analytics.total_customers,
                "average_order_value": analytics.average_order_value
            }
            
            return self.update_store(store_id, updates)
            
        except Exception as e:
            self.logger.error(f"Error updating stats for store {store_id}: {e}")
            return False, f"Error updating stats: {str(e)}"

    def search_stores(self, search_term: str, limit: int = 50, offset: int = 0) -> List[StoreData]:
        """Search stores by name, description, or location."""
        try:
            query = """
                SELECT * FROM shtetl_stores 
                WHERE is_active = true AND is_approved = true
                AND (
                    store_name ILIKE %s OR 
                    store_description ILIKE %s OR 
                    city ILIKE %s OR 
                    state ILIKE %s OR
                    store_type ILIKE %s OR
                    store_category ILIKE %s
                )
                ORDER BY 
                    CASE WHEN store_name ILIKE %s THEN 1
                         WHEN city ILIKE %s THEN 2
                         ELSE 3
                    END,
                    average_rating DESC,
                    total_orders DESC
                LIMIT %s OFFSET %s
            """
            
            search_pattern = f"%{search_term}%"
            params = [
                search_pattern, search_pattern, search_pattern, search_pattern,
                search_pattern, search_pattern, search_pattern, search_pattern,
                limit, offset
            ]
            
            results = self.db_manager.execute_query(query, params, fetch_all=True)
            
            stores = []
            for result in results:
                stores.append(StoreData(**result))
            
            return stores
            
        except Exception as e:
            self.logger.error(f"Error searching stores: {e}")
            return []

    def get_store_products(self, store_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get products for a store."""
        try:
            query = """
                SELECT * FROM shtetl_marketplace 
                WHERE seller_user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            
            results = self.db_manager.execute_query(
                query, (store_id, limit, offset), fetch_all=True
            )
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting products for store {store_id}: {e}")
            return []

    def get_store_orders(self, store_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get orders for a store."""
        try:
            query = """
                SELECT * FROM shtetl_orders 
                WHERE store_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            
            results = self.db_manager.execute_query(
                query, (store_id, limit, offset), fetch_all=True
            )
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting orders for store {store_id}: {e}")
            return []

    def get_store_messages(self, store_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get messages for a store."""
        try:
            query = """
                SELECT * FROM shtetl_messages 
                WHERE store_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            
            results = self.db_manager.execute_query(
                query, (store_id, limit, offset), fetch_all=True
            )
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting messages for store {store_id}: {e}")
            return []

    def get_plan_limits(self, plan_type: str) -> Dict[str, Any]:
        """Get plan limits and features."""
        plans = {
            "free": {
                "max_products": 10,
                "max_images_per_product": 3,
                "max_messages": 50,
                "analytics_retention_days": 30,
                "custom_domain": False,
                "priority_support": False,
                "featured_listing": False,
                "bulk_operations": False,
                "api_access": False
            },
            "basic": {
                "max_products": 100,
                "max_images_per_product": 10,
                "max_messages": 500,
                "analytics_retention_days": 90,
                "custom_domain": False,
                "priority_support": False,
                "featured_listing": False,
                "bulk_operations": True,
                "api_access": False
            },
            "premium": {
                "max_products": 1000,
                "max_images_per_product": 20,
                "max_messages": 5000,
                "analytics_retention_days": 365,
                "custom_domain": True,
                "priority_support": True,
                "featured_listing": True,
                "bulk_operations": True,
                "api_access": True
            }
        }
        
        return plans.get(plan_type, plans["free"])

    def check_plan_limits(self, store_id: str, operation: str) -> Tuple[bool, str]:
        """Check if store can perform operation based on plan limits."""
        try:
            store = self.get_store(store_id)
            if not store:
                return False, "Store not found"
            
            plan_limits = self.get_plan_limits(store.plan_type)
            
            if operation == "add_product":
                if store.total_products >= plan_limits["max_products"]:
                    return False, f"Product limit reached for {store.plan_type} plan"
            
            elif operation == "add_message":
                # Count current messages
                messages_query = "SELECT COUNT(*) as count FROM shtetl_messages WHERE store_id = %s"
                result = self.db_manager.execute_query(messages_query, (store_id,), fetch_one=True)
                message_count = result.get('count', 0) if result else 0
                
                if message_count >= plan_limits["max_messages"]:
                    return False, f"Message limit reached for {store.plan_type} plan"
            
            return True, "Operation allowed"
            
        except Exception as e:
            self.logger.error(f"Error checking plan limits for store {store_id}: {e}")
            return False, "Error checking plan limits"
