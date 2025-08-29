# !/usr/bin/env python3
"""Order Service V4 for JewGo Backend.
This module provides order management functionality including order creation,
retrieval, and status updates. It follows the service layer architecture pattern
and integrates with the database through SQLAlchemy.
Author: JewGo Development Team
Version: 4.0
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from database.models import Order, OrderItem, Restaurant
from services.base_service import BaseService
from utils.error_handler import (
    DatabaseError,
    NotFoundError,
    ValidationError,
)
from utils.logging_config import get_logger

logger = get_logger(__name__)


class OrderServiceV4(BaseService):
    """Order service for managing customer orders.
    This service handles all order-related business logic including:
    - Order creation and validation
    - Order status management
    - Order retrieval and filtering
    - Order item management
    """

    def __init__(self, db_session: Session):
        """Initialize the order service.
        Args:
            db_session: SQLAlchemy database session
        """
        super().__init__()
        self.db_session = db_session
        self.logger = logger

    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new order.
        Args:
            order_data: Dictionary containing order information
        Returns:
            Dictionary containing the created order data
        Raises:
            ValidationError: If order data is invalid
            DatabaseError: If database operation fails
            NotFoundError: If restaurant not found
        """
        try:
            # Validate required fields
            self._validate_order_data(order_data)
            # Check if restaurant exists
            restaurant = (
                self.db_session.query(Restaurant)
                .filter(Restaurant.id == order_data["restaurant_id"])
                .first()
            )
            if not restaurant:
                raise NotFoundError(
                    f"Restaurant with ID {order_data['restaurant_id']} not found"
                )
            # Generate order number
            order_number = self._generate_order_number()
            # Calculate totals
            items = order_data.get("items", [])
            subtotal = sum(item["price"] * item["quantity"] for item in items)
            tax = subtotal * 0.08  # 8% tax rate (configurable)
            delivery_fee = 0.0
            if order_data["order_type"] == "delivery":
                delivery_fee = 5.0  # $5 delivery fee (configurable)
            total = subtotal + tax + delivery_fee
            # Create order
            order = Order(
                order_number=order_number,
                restaurant_id=order_data["restaurant_id"],
                customer_name=order_data["customer_name"],
                customer_phone=order_data["customer_phone"],
                customer_email=order_data["customer_email"],
                delivery_address=order_data.get("delivery_address"),
                delivery_instructions=order_data.get("delivery_instructions"),
                order_type=order_data["order_type"],
                payment_method=order_data["payment_method"],
                estimated_time=order_data.get("estimated_time"),
                subtotal=subtotal,
                tax=tax,
                delivery_fee=delivery_fee,
                total=total,
                status="pending",
            )
            self.db_session.add(order)
            self.db_session.flush()  # Get the order ID
            # Create order items
            for item_data in items:
                order_item = OrderItem(
                    order_id=order.id,
                    item_id=item_data["id"],
                    name=item_data["name"],
                    price=item_data["price"],
                    quantity=item_data["quantity"],
                    special_instructions=item_data.get("special_instructions"),
                    subtotal=item_data["price"] * item_data["quantity"],
                )
                self.db_session.add(order_item)
            self.db_session.commit()
            # Return order data
            return self._format_order_response(order)
        except (ValidationError, NotFoundError):
            raise
        except Exception as e:
            self.db_session.rollback()
            self.logger.error(f"Error creating order: {str(e)}")
            raise DatabaseError(f"Failed to create order: {str(e)}")

    def get_order_by_id(self, order_id: int) -> Dict[str, Any]:
        """Get order by ID.
        Args:
            order_id: Order ID
        Returns:
            Dictionary containing order data
        Raises:
            NotFoundError: If order not found
            DatabaseError: If database operation fails
        """
        try:
            order = self.db_session.query(Order).filter(Order.id == order_id).first()
            if not order:
                raise NotFoundError(f"Order with ID {order_id} not found")
            return self._format_order_response(order)
        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error retrieving order {order_id}: {str(e)}")
            raise DatabaseError(f"Failed to retrieve order: {str(e)}")

    def get_order_by_number(self, order_number: str) -> Dict[str, Any]:
        """Get order by order number.
        Args:
            order_number: Order number
        Returns:
            Dictionary containing order data
        Raises:
            NotFoundError: If order not found
            DatabaseError: If database operation fails
        """
        try:
            order = (
                self.db_session.query(Order)
                .filter(Order.order_number == order_number)
                .first()
            )
            if not order:
                raise NotFoundError(f"Order with number {order_number} not found")
            return self._format_order_response(order)
        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error retrieving order {order_number}: {str(e)}")
            raise DatabaseError(f"Failed to retrieve order: {str(e)}")

    def get_orders_by_restaurant(
        self, restaurant_id: int, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get orders for a specific restaurant.
        Args:
            restaurant_id: Restaurant ID
            limit: Maximum number of orders to return
            offset: Number of orders to skip
        Returns:
            List of order dictionaries
        Raises:
            DatabaseError: If database operation fails
        """
        try:
            orders = (
                self.db_session.query(Order)
                .filter(Order.restaurant_id == restaurant_id)
                .order_by(Order.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            return [self._format_order_response(order) for order in orders]
        except Exception as e:
            self.logger.error(
                f"Error retrieving orders for restaurant {restaurant_id}: {str(e)}"
            )
            raise DatabaseError(f"Failed to retrieve orders: {str(e)}")

    def get_orders_by_customer(
        self, customer_email: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get orders for a specific customer.
        Args:
            customer_email: Customer email address
            limit: Maximum number of orders to return
            offset: Number of orders to skip
        Returns:
            List of order dictionaries
        Raises:
            DatabaseError: If database operation fails
        """
        try:
            orders = (
                self.db_session.query(Order)
                .filter(Order.customer_email == customer_email)
                .order_by(Order.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            return [self._format_order_response(order) for order in orders]
        except Exception as e:
            self.logger.error(
                f"Error retrieving orders for customer {customer_email}: {str(e)}"
            )
            raise DatabaseError(f"Failed to retrieve orders: {str(e)}")

    def update_order_status(self, order_id: int, status: str) -> Dict[str, Any]:
        """Update order status.
        Args:
            order_id: Order ID
            status: New status
        Returns:
            Dictionary containing updated order data
        Raises:
            NotFoundError: If order not found
            ValidationError: If status is invalid
            DatabaseError: If database operation fails
        """
        try:
            # Validate status
            valid_statuses = [
                "pending",
                "confirmed",
                "preparing",
                "ready",
                "delivered",
                "cancelled",
            ]
            if status not in valid_statuses:
                raise ValidationError(
                    f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                )
            order = self.db_session.query(Order).filter(Order.id == order_id).first()
            if not order:
                raise NotFoundError(f"Order with ID {order_id} not found")
            order.status = status
            order.updated_at = datetime.utcnow()
            self.db_session.commit()
            return self._format_order_response(order)
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.db_session.rollback()
            self.logger.error(f"Error updating order {order_id} status: {str(e)}")
            raise DatabaseError(f"Failed to update order status: {str(e)}")

    def _validate_order_data(self, order_data: Dict[str, Any]) -> None:
        """Validate order data.
        Args:
            order_data: Order data to validate
        Raises:
            ValidationError: If data is invalid
        """
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
            if field not in order_data or not order_data[field]:
                raise ValidationError(f"Missing required field: {field}")
        # Validate order type
        if order_data["order_type"] not in ["pickup", "delivery"]:
            raise ValidationError("Order type must be 'pickup' or 'delivery'")
        # Validate payment method
        if order_data["payment_method"] not in ["cash", "card", "online"]:
            raise ValidationError("Payment method must be 'cash', 'card', or 'online'")
        # Validate items
        items = order_data.get("items", [])
        if not items:
            raise ValidationError("Order must contain at least one item")
        for item in items:
            if not all(key in item for key in ["id", "name", "price", "quantity"]):
                raise ValidationError(
                    "Each item must have id, name, price, and quantity"
                )
            if item["price"] < 0:
                raise ValidationError("Item price cannot be negative")
            if item["quantity"] <= 0:
                raise ValidationError("Item quantity must be greater than 0")
        # Validate delivery address for delivery orders
        if order_data["order_type"] == "delivery" and not order_data.get(
            "delivery_address"
        ):
            raise ValidationError("Delivery address is required for delivery orders")

    def _generate_order_number(self) -> str:
        """Generate a unique order number.
        Returns:
            Unique order number
        """
        return f"ORD-{uuid.uuid4().hex[:8].upper()}"

    def _format_order_response(self, order: Order) -> Dict[str, Any]:
        """Format order for API response.
        Args:
            order: Order object
        Returns:
            Formatted order dictionary
        """
        return {
            "id": order.id,
            "order_number": order.order_number,
            "restaurant_id": order.restaurant_id,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_email": order.customer_email,
            "delivery_address": order.delivery_address,
            "delivery_instructions": order.delivery_instructions,
            "order_type": order.order_type,
            "payment_method": order.payment_method,
            "estimated_time": order.estimated_time,
            "subtotal": order.subtotal,
            "tax": order.tax,
            "delivery_fee": order.delivery_fee,
            "total": order.total,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "items": [
                {
                    "id": item.id,
                    "item_id": item.item_id,
                    "name": item.name,
                    "price": item.price,
                    "quantity": item.quantity,
                    "special_instructions": item.special_instructions,
                    "subtotal": item.subtotal,
                }
                for item in order.items
            ],
        }
