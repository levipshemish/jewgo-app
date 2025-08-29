# !/usr/bin/env python3
"""Shtetl Order Service.
Comprehensive service for managing Jewish community marketplace orders.
Handles order creation, tracking, fulfillment, and analytics.
Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""
import uuid
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from utils.logging_config import get_logger
from utils.cache_manager_v4 import CacheManagerV4
from utils.config_manager import ConfigManager

logger = get_logger(__name__)


@dataclass
class OrderData:
    """Order data structure."""

    # Basic order information
    order_id: str
    store_id: str
    store_name: str
    customer_user_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    # Order details
    order_items: List[Dict] = None
    subtotal: float = 0.0
    tax_amount: float = 0.0
    delivery_fee: float = 0.0
    discount_amount: float = 0.0
    total_amount: float = 0.0
    # Delivery information
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_zip_code: Optional[str] = None
    delivery_instructions: Optional[str] = None
    # Payment information
    payment_method: Optional[str] = None
    payment_status: str = "pending"
    payment_transaction_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    # Order status
    order_status: str = "pending"
    fulfillment_method: str = "pickup"
    estimated_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    # Kosher features
    kosher_certification_required: bool = False
    kosher_agency_preference: Optional[str] = None
    is_cholov_yisroel: bool = False
    is_pas_yisroel: bool = False
    shabbos_delivery: bool = False
    holiday_delivery: bool = False
    special_instructions: Optional[str] = None
    # Customer notes
    customer_notes: Optional[str] = None
    store_notes: Optional[str] = None
    # Analytics
    source: Optional[str] = None
    referral_code: Optional[str] = None
    campaign_id: Optional[str] = None


@dataclass
class OrderAnalytics:
    """Order analytics data structure."""

    total_orders: int = 0
    total_revenue: float = 0.0
    average_order_value: float = 0.0
    orders_today: int = 0
    revenue_today: float = 0.0
    orders_this_week: int = 0
    revenue_this_week: float = 0.0
    orders_this_month: int = 0
    revenue_this_month: float = 0.0
    pending_orders: int = 0
    processing_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    return_requests: int = 0
    kosher_orders: int = 0
    delivery_orders: int = 0
    pickup_orders: int = 0


class ShtetlOrderService:
    """Service for managing Shtetl marketplace orders."""

    def __init__(
        self, db_manager, cache_manager: CacheManagerV4, config: ConfigManager
    ):
        """Initialize the order service."""
        self.db_manager = db_manager
        self.cache_manager = cache_manager
        self.config = config
        self.logger = get_logger(__name__)
        logger.info("ShtetlOrderService initialized successfully - v1.0")

    def create_order(self, order_data: OrderData) -> Tuple[bool, str, Optional[str]]:
        """Create a new order."""
        try:
            # Generate order ID
            order_id = str(uuid.uuid4())
            order_data.order_id = order_id
            # Validate required fields
            if not order_data.store_id or not order_data.customer_user_id:
                return False, "Store ID and customer user ID are required", None
            if not order_data.order_items or len(order_data.order_items) == 0:
                return False, "Order must contain at least one item", None
            # Calculate totals if not provided
            if order_data.subtotal == 0.0:
                order_data.subtotal = sum(
                    item.get("price", 0) * item.get("quantity", 1)
                    for item in order_data.order_items
                )
            if order_data.total_amount == 0.0:
                order_data.total_amount = (
                    order_data.subtotal
                    + order_data.tax_amount
                    + order_data.delivery_fee
                    - order_data.discount_amount
                )
            # Insert order into database
            query = """
                INSERT INTO shtetl_orders (
                    order_id, store_id, store_name, customer_user_id, customer_name,
                    customer_email, customer_phone, order_items, subtotal, tax_amount,
                    delivery_fee, discount_amount, total_amount, delivery_address,
                    delivery_city, delivery_state, delivery_zip_code, delivery_instructions,
                    payment_method, payment_status, payment_transaction_id, stripe_payment_intent_id,
                    order_status, fulfillment_method, estimated_delivery_date, actual_delivery_date,
                    tracking_number, carrier, kosher_certification_required, kosher_agency_preference,
                    is_cholov_yisroel, is_pas_yisroel, shabbos_delivery, holiday_delivery,
                    special_instructions, customer_notes, store_notes, source, referral_code, campaign_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            params = (
                order_data.order_id,
                order_data.store_id,
                order_data.store_name,
                order_data.customer_user_id,
                order_data.customer_name,
                order_data.customer_email,
                order_data.customer_phone,
                json.dumps(order_data.order_items),
                order_data.subtotal,
                order_data.tax_amount,
                order_data.delivery_fee,
                order_data.discount_amount,
                order_data.total_amount,
                order_data.delivery_address,
                order_data.delivery_city,
                order_data.delivery_state,
                order_data.delivery_zip_code,
                order_data.delivery_instructions,
                order_data.payment_method,
                order_data.payment_status,
                order_data.payment_transaction_id,
                order_data.stripe_payment_intent_id,
                order_data.order_status,
                order_data.fulfillment_method,
                order_data.estimated_delivery_date,
                order_data.actual_delivery_date,
                order_data.tracking_number,
                order_data.carrier,
                order_data.kosher_certification_required,
                order_data.kosher_agency_preference,
                order_data.is_cholov_yisroel,
                order_data.is_pas_yisroel,
                order_data.shabbos_delivery,
                order_data.holiday_delivery,
                order_data.special_instructions,
                order_data.customer_notes,
                order_data.store_notes,
                order_data.source,
                order_data.referral_code,
                order_data.campaign_id,
            )
            self.db_manager.execute_query(query, params)
            # Update store statistics
            self._update_store_order_stats(order_data.store_id)
            # Clear cache
            self.cache_manager.delete(f"store_orders:{order_data.store_id}")
            self.cache_manager.delete(f"customer_orders:{order_data.customer_user_id}")
            logger.info(f"Created order {order_id} for store {order_data.store_id}")
            return True, "Order created successfully", order_id
        except Exception as e:
            self.logger.error(f"Error creating order: {e}")
            return False, f"Failed to create order: {str(e)}", None

    def get_order(self, order_id: str) -> Optional[Dict]:
        """Get order by ID."""
        try:
            query = """
                SELECT * FROM shtetl_orders WHERE order_id = %s
            """
            result = self.db_manager.execute_query(query, (order_id,), fetch_one=True)
            return result
        except Exception as e:
            self.logger.error(f"Error getting order {order_id}: {e}")
            return None

    def get_store_orders(
        self,
        store_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> List[Dict]:
        """Get orders for a store."""
        try:
            cache_key = f"store_orders:{store_id}:{limit}:{offset}:{status}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            query = """
                SELECT * FROM shtetl_orders
                WHERE store_id = %s
            """
            params = [store_id]
            if status:
                query += " AND order_status = %s"
                params.append(status)
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            results = self.db_manager.execute_query(
                query, tuple(params), fetch_all=True
            )
            # Cache the result
            self.cache_manager.set(cache_key, results, ttl=300)  # 5 minutes
            return results if results else []
        except Exception as e:
            self.logger.error(f"Error getting orders for store {store_id}: {e}")
            return []

    def get_customer_orders(
        self, customer_user_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        """Get orders for a customer."""
        try:
            cache_key = f"customer_orders:{customer_user_id}:{limit}:{offset}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            query = """
                SELECT * FROM shtetl_orders
                WHERE customer_user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            results = self.db_manager.execute_query(
                query, (customer_user_id, limit, offset), fetch_all=True
            )
            # Cache the result
            self.cache_manager.set(cache_key, results, ttl=300)  # 5 minutes
            return results if results else []
        except Exception as e:
            self.logger.error(
                f"Error getting orders for customer {customer_user_id}: {e}"
            )
            return []

    def update_order_status(
        self, order_id: str, status: str, notes: Optional[str] = None
    ) -> bool:
        """Update order status."""
        try:
            query = """
                UPDATE shtetl_orders
                SET order_status = %s, updated_at = NOW()
            """
            params = [status]
            if notes:
                query += ", store_notes = %s"
                params.append(notes)
            query += " WHERE order_id = %s"
            params.append(order_id)
            self.db_manager.execute_query(query, tuple(params))
            # Clear cache
            self.cache_manager.delete_pattern("store_orders:*")
            self.cache_manager.delete_pattern("customer_orders:*")
            logger.info(f"Updated order {order_id} status to {status}")
            return True
        except Exception as e:
            self.logger.error(f"Error updating order {order_id} status: {e}")
            return False

    def update_payment_status(
        self, order_id: str, payment_status: str, transaction_id: Optional[str] = None
    ) -> bool:
        """Update payment status."""
        try:
            query = """
                UPDATE shtetl_orders
                SET payment_status = %s, payment_transaction_id = %s, updated_at = NOW()
                WHERE order_id = %s
            """
            self.db_manager.execute_query(
                query, (payment_status, transaction_id, order_id)
            )
            # Clear cache
            self.cache_manager.delete_pattern("store_orders:*")
            self.cache_manager.delete_pattern("customer_orders:*")
            logger.info(f"Updated order {order_id} payment status to {payment_status}")
            return True
        except Exception as e:
            self.logger.error(f"Error updating order {order_id} payment status: {e}")
            return False

    def get_store_analytics(
        self,
        store_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> OrderAnalytics:
        """Get order analytics for a store."""
        try:
            analytics = OrderAnalytics()
            # Base query
            base_query = "SELECT * FROM shtetl_orders WHERE store_id = %s"
            params = [store_id]
            if start_date and end_date:
                base_query += " AND created_at >= %s AND created_at <= %s"
                params.extend([start_date, end_date])
            # Total orders and revenue
            total_query = """
                SELECT COUNT(*) as total_orders,
                       COALESCE(SUM(total_amount), 0) as total_revenue,
                       COALESCE(AVG(total_amount), 0) as average_order_value
                FROM shtetl_orders
                WHERE store_id = %s
            """
            if start_date and end_date:
                total_query += " AND created_at >= %s AND created_at <= %s"
                total_params = [store_id, start_date, end_date]
            else:
                total_params = [store_id]
            total_result = self.db_manager.execute_query(
                total_query, tuple(total_params), fetch_one=True
            )
            if total_result:
                analytics.total_orders = int(total_result.get("total_orders", 0))
                analytics.total_revenue = float(total_result.get("total_revenue", 0))
                analytics.average_order_value = float(
                    total_result.get("average_order_value", 0)
                )
            # Status breakdown
            status_query = """
                SELECT order_status, COUNT(*) as count
                FROM shtetl_orders
                WHERE store_id = %s
                GROUP BY order_status
            """
            if start_date and end_date:
                status_query += " AND created_at >= %s AND created_at <= %s"
                status_params = [store_id, start_date, end_date]
            else:
                status_params = [store_id]
            status_results = self.db_manager.execute_query(
                status_query, tuple(status_params), fetch_all=True
            )
            for result in status_results:
                status = result.get("order_status")
                count = int(result.get("count", 0))
                if status == "pending":
                    analytics.pending_orders = count
                elif status == "processing":
                    analytics.processing_orders = count
                elif status == "delivered":
                    analytics.delivered_orders = count
                elif status == "cancelled":
                    analytics.cancelled_orders = count
            # Kosher orders
            kosher_query = """
                SELECT COUNT(*) as kosher_count
                FROM shtetl_orders
                WHERE store_id = %s AND kosher_certification_required = true
            """
            if start_date and end_date:
                kosher_query += " AND created_at >= %s AND created_at <= %s"
                kosher_params = [store_id, start_date, end_date]
            else:
                kosher_params = [store_id]
            kosher_result = self.db_manager.execute_query(
                kosher_query, tuple(kosher_params), fetch_one=True
            )
            if kosher_result:
                analytics.kosher_orders = int(kosher_result.get("kosher_count", 0))
            # Delivery vs pickup
            delivery_query = """
                SELECT fulfillment_method, COUNT(*) as count
                FROM shtetl_orders
                WHERE store_id = %s
                GROUP BY fulfillment_method
            """
            if start_date and end_date:
                delivery_query += " AND created_at >= %s AND created_at <= %s"
                delivery_params = [store_id, start_date, end_date]
            else:
                delivery_params = [store_id]
            delivery_results = self.db_manager.execute_query(
                delivery_query, tuple(delivery_params), fetch_all=True
            )
            for result in delivery_results:
                method = result.get("fulfillment_method")
                count = int(result.get("count", 0))
                if method == "delivery":
                    analytics.delivery_orders = count
                elif method == "pickup":
                    analytics.pickup_orders = count
            return analytics
        except Exception as e:
            self.logger.error(f"Error getting analytics for store {store_id}: {e}")
            return OrderAnalytics()

    def _update_store_order_stats(self, store_id: str) -> None:
        """Update store order statistics."""
        try:
            # Get order count and revenue
            query = """
                SELECT COUNT(*) as total_orders,
                       COALESCE(SUM(total_amount), 0) as total_revenue
                FROM shtetl_orders
                WHERE store_id = %s
            """
            result = self.db_manager.execute_query(query, (store_id,), fetch_one=True)
            if result:
                # Update store statistics
                update_query = """
                    UPDATE shtetl_stores
                    SET total_orders = %s, total_revenue = %s, updated_at = NOW()
                    WHERE store_id = %s
                """
                self.db_manager.execute_query(
                    update_query,
                    (
                        int(result.get("total_orders", 0)),
                        float(result.get("total_revenue", 0)),
                        store_id,
                    ),
                )
        except Exception as e:
            self.logger.error(f"Error updating store order stats for {store_id}: {e}")

    def search_orders(
        self, store_id: str, search_term: str, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        """Search orders by text."""
        try:
            query = """
                SELECT * FROM shtetl_orders
                WHERE store_id = %s
                AND (
                    order_id ILIKE %s OR
                    customer_name ILIKE %s OR
                    customer_email ILIKE %s OR
                    tracking_number ILIKE %s
                )
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            search_pattern = f"%{search_term}%"
            params = (
                store_id,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                limit,
                offset,
            )
            results = self.db_manager.execute_query(query, params, fetch_all=True)
            return results if results else []
        except Exception as e:
            self.logger.error(f"Error searching orders for store {store_id}: {e}")
            return []
