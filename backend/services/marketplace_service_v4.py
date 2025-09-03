# !/usr/bin/env python3
"""Marketplace Service v4 - Streamlined marketplace operations.
This service provides marketplace functionality with three creation paths:
- Regular (generic items)
- Vehicle (with vehicle-specific attributes)
- Appliance (with kosher flags)
Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""
import json
from typing import Any, Dict, Optional
from utils.logging_config import get_logger
from .base_service import BaseService

logger = get_logger(__name__)


class MarketplaceServiceV4(BaseService):
    """Marketplace service for managing listings and categories."""

    def __init__(self, db_manager=None, cache_manager=None, config=None):
        """Initialize the marketplace service."""
        super().__init__(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )
        logger.info(
            "MarketplaceServiceV4 (Streamlined) initialized successfully - v2.0 with get_listing_by_id"
        )

    def get_listings(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        kind: Optional[str] = None,  # Changed from listing_type to kind
        condition: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        city: Optional[str] = None,
        region: Optional[str] = None,
        status: str = "active",
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: float = 10.0,
    ) -> Dict[str, Any]:
        """Get marketplace listings with filtering and pagination."""
        try:
            if not self._is_db_available():
                return self._get_empty_listings_response(limit, offset)
            if not self._marketplace_table_exists():
                return self._get_empty_listings_response(limit, offset)
            query, params = self._build_listings_query(
                status,
                search,
                category,
                subcategory,
                kind,
                condition,
                min_price,
                max_price,
                city,
                region,
                lat,
                lng,
                radius,
                limit,
                offset,
            )
            listings, total = self._execute_listings_query(query, params, status)
            formatted_listings = [self._format_listing_row(row) for row in listings]
            return {
                "success": True,
                "data": {
                    "listings": formatted_listings,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                },
            }
        except Exception as e:
            logger.exception(
                "Error fetching marketplace listings", extra={"error": str(e)}
            )
            return self._get_empty_listings_response(limit, offset)

    def _get_empty_listings_response(self, limit: int, offset: int) -> Dict[str, Any]:
        """Return empty marketplace listings response."""
        return {
            "success": True,
            "data": {
                "listings": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
            },
        }

    def get_listing_by_id(self, listing_id: str) -> Dict[str, Any]:
        """Get a specific marketplace listing by ID - v2.0."""
        try:
            # Check if marketplace tables exist
            if not self.db_manager or not hasattr(
                self.db_manager, "connection_manager"
            ):
                logger.warning("Database manager not available for marketplace")
                return {"success": False, "error": "Listing not found"}
            # Try to check if marketplace tables exist
            try:
                with self.db_manager.connection_manager.get_session_context() as session:
                    from sqlalchemy import text

                    # Test if marketplace table exists
                    result = session.execute(
                        text(
                            "SELECT 1 FROM information_schema.tables WHERE table_name = 'Marketplace listings'"
                        )
                    )
                    if not result.fetchone():
                        logger.warning("Marketplace tables do not exist")
                        return {"success": False, "error": "Listing not found"}
            except Exception as e:
                logger.warning(f"Could not check marketplace tables: {e}")
                return {"success": False, "error": "Listing not found"}
            # Use the existing get_listing method
            return self.get_listing(listing_id)
        except Exception:
            logger.exception("Error fetching marketplace listing by ID")
            return {"success": False, "error": "Listing not found"}

    def get_listing(self, listing_id: str) -> Dict[str, Any]:
        """Get a specific marketplace listing by ID."""
        try:
            row = self._fetch_listing_row(listing_id)
            if not row:
                return {"success": False, "error": "Listing not found"}
            formatted = self._format_listing_row(row)
            return {"success": True, "data": formatted}
        except Exception as e:
            logger.exception(
                "Error fetching marketplace listing", extra={"error": str(e)}
            )
            return {
                "success": False,
                "error": "Failed to fetch marketplace listing",
                "details": str(e),
            }

    def _fetch_listing_row(self, listing_id: str):
        from sqlalchemy import text

        with self.db_manager.connection_manager.get_session_context() as session:
            query = """
                SELECT m.id, m.title, m.description, m.price, m.currency, m.city,
                       m.state as region, m.zip_code as zip,
                       m.latitude as lat, m.longitude as lng,
                       m.vendor_id as seller_user_id,
                       m.category as type, m.status as condition,
                       m.category, m.subcategory, m.status,
                       m.created_at, m.updated_at,
                       m.product_image, m.additional_images, m.thumbnail
                FROM marketplace m
                WHERE m.id = :listing_id
            """
            result = session.execute(text(query), {"listing_id": listing_id})
            return result.fetchone()

    def create_listing(self, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new marketplace listing."""
        try:
            # Validate required fields
            required_fields = [
                "title",
                "kind",
                "category_id",
                "condition",
                "price_cents",
            ]
            for field in required_fields:
                if field not in listing_data:
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                    }
            # Validate listing kind
            valid_kinds = ["regular", "vehicle", "appliance"]
            if listing_data["kind"] not in valid_kinds:
                return {
                    "success": False,
                    "error": f"Invalid listing kind. Must be one of: {valid_kinds}",
                }
            # Validate condition
            valid_conditions = ["new", "used_like_new", "used_good", "used_fair"]
            if listing_data["condition"] not in valid_conditions:
                return {
                    "success": False,
                    "error": f"Invalid condition. Must be one of: {valid_conditions}",
                }
            # Validate price
            if listing_data["price_cents"] < 0:
                return {"success": False, "error": "Price cannot be negative"}
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text

                # Set defaults
                listing_data.setdefault("txn_type", "sale")
                listing_data.setdefault("currency", "USD")
                listing_data.setdefault("country", "US")
                listing_data.setdefault("status", "active")
                listing_data.setdefault("attributes", {})
                # Insert listing
                result = session.execute(
                    text(
                        """
                    INSERT INTO listings (
                        kind, txn_type, title, description, price_cents, currency,
                        condition, category_id, subcategory_id, city, region, zip,
                        country, lat, lng, seller_user_id, attributes, status
                    ) VALUES (
                        :kind, :txn_type, :title, :description, :price_cents, :currency,
                        :condition, :category_id, :subcategory_id, :city, :region, :zip,
                        :country, :lat, :lng, :seller_user_id, :attributes, :status
                    ) RETURNING id
                """
                    ),
                    {
                        "kind": listing_data["kind"],
                        "txn_type": listing_data["txn_type"],
                        "title": listing_data["title"],
                        "description": listing_data.get("description"),
                        "price_cents": listing_data["price_cents"],
                        "currency": listing_data["currency"],
                        "condition": listing_data["condition"],
                        "category_id": listing_data["category_id"],
                        "subcategory_id": listing_data.get("subcategory_id"),
                        "city": listing_data.get("city"),
                        "region": listing_data.get("region"),
                        "zip": listing_data.get("zip"),
                        "country": listing_data["country"],
                        "lat": listing_data.get("lat"),
                        "lng": listing_data.get("lng"),
                        "seller_user_id": listing_data.get("seller_user_id"),
                        "attributes": json.dumps(listing_data["attributes"]),
                        "status": listing_data["status"],
                    },
                )
                listing_id = result.scalar()
            return {
                "success": True,
                "data": {
                    "id": str(listing_id),
                    "message": "Listing created successfully",
                },
            }
        except Exception as e:
            logger.exception("Error creating marketplace listing")
            return {
                "success": False,
                "error": "Failed to create marketplace listing",
                "details": str(e),
            }

    def get_categories(self) -> Dict[str, Any]:
        """Get marketplace categories and subcategories."""
        try:
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text

                # Get categories
                result = session.execute(
                    text(
                        """
                    SELECT id, name, slug, sort_order, active
                    FROM categories
                    WHERE active = true
                    ORDER BY sort_order, name
                """
                    )
                )
                categories = result.fetchall()
                # Get subcategories for each category
                formatted_categories = []
                for category in categories:
                    sub_result = session.execute(
                        text(
                            """
                        SELECT id, name, slug, sort_order, active
                        FROM subcategories
                        WHERE category_id = :category_id AND active = true
                        ORDER BY sort_order, name
                    """
                        ),
                        {"category_id": category[0]},
                    )
                    subcategories = sub_result.fetchall()
                    formatted_category = {
                        "id": category[0],
                        "name": category[1],
                        "slug": category[2],
                        "sort_order": category[3],
                        "active": category[4],
                        "subcategories": [
                            {
                                "id": sub[0],
                                "name": sub[1],
                                "slug": sub[2],
                                "sort_order": sub[3],
                                "active": sub[4],
                            }
                            for sub in subcategories
                        ],
                    }
                    formatted_categories.append(formatted_category)
                return {"success": True, "data": formatted_categories}
        except Exception as e:
            logger.exception("Error fetching marketplace categories")
            # Return mock data when database is not available
            if "Database not connected" in str(
                e
            ) or "Failed to establish database" in str(e):
                logger.info(
                    "Database not available, returning mock marketplace categories"
                )
                return {
                    "success": True,
                    "data": [
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
                                    "name": "Kippahs",
                                    "slug": "kippahs",
                                    "sort_order": 1,
                                    "active": True,
                                },
                                {
                                    "id": 4,
                                    "name": "Tallits",
                                    "slug": "tallits",
                                    "sort_order": 2,
                                    "active": True,
                                },
                            ],
                        },
                        {
                            "id": 3,
                            "name": "Home & Garden",
                            "slug": "home-garden",
                            "sort_order": 3,
                            "active": True,
                            "subcategories": [
                                {
                                    "id": 5,
                                    "name": "Candles",
                                    "slug": "candles",
                                    "sort_order": 1,
                                    "active": True,
                                },
                                {
                                    "id": 6,
                                    "name": "Decor",
                                    "slug": "decor",
                                    "sort_order": 2,
                                    "active": True,
                                },
                            ],
                        },
                        {
                            "id": 4,
                            "name": "Books",
                            "slug": "books",
                            "sort_order": 4,
                            "active": True,
                            "subcategories": [
                                {
                                    "id": 7,
                                    "name": "Torah",
                                    "slug": "torah",
                                    "sort_order": 1,
                                    "active": True,
                                },
                                {
                                    "id": 8,
                                    "name": "Prayer Books",
                                    "slug": "prayer-books",
                                    "sort_order": 2,
                                    "active": True,
                                },
                            ],
                        },
                        {
                            "id": 5,
                            "name": "Food & Beverages",
                            "slug": "food-beverages",
                            "sort_order": 5,
                            "active": True,
                            "subcategories": [
                                {
                                    "id": 9,
                                    "name": "Wine",
                                    "slug": "wine",
                                    "sort_order": 1,
                                    "active": True,
                                },
                                {
                                    "id": 10,
                                    "name": "Snacks",
                                    "slug": "snacks",
                                    "sort_order": 2,
                                    "active": True,
                                },
                            ],
                        },
                    ],
                }
            return {
                "success": False,
                "error": "Failed to fetch marketplace categories",
                "details": str(e),
            }

    def update_listing(self, listing_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a marketplace listing."""
        try:
            if not self.db_manager or not hasattr(
                self.db_manager, "connection_manager"
            ):
                logger.warning("Database manager not available for marketplace update")
                return {"success": False, "error": "Database service unavailable"}
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text

                # First, verify the listing exists and belongs to the user
                verify_query = """
                    SELECT id, vendor_id as seller_id, status
                    FROM marketplace
                    WHERE id = :listing_id
                """
                result = session.execute(text(verify_query), {"listing_id": listing_id})
                listing = result.fetchone()
                if not listing:
                    return {"success": False, "error": "Listing not found"}
                # Check if user owns the listing
                seller_id = data.get("seller_id")
                if listing.seller_id != seller_id:
                    return {
                        "success": False,
                        "error": "Unauthorized to update this listing",
                    }
                # Check if listing is active
                if listing.status != "active":
                    return {"success": False, "error": "Cannot update inactive listing"}
                # Build update query with allowed fields
                allowed_fields = [
                    "title",
                    "description",
                    "price",
                    "currency",
                    "city",
                    "state",
                    "zip_code",
                    "latitude",
                    "longitude",
                    "category_id",
                    "subcategory_id",
                    "condition",
                    "product_image",
                    "additional_images",
                    "thumbnail",
                ]
                update_fields = []
                update_params = {"listing_id": listing_id}
                for field in allowed_fields:
                    if field in data:
                        update_fields.append(f"{field} = :{field}")
                        update_params[field] = data[field]
                if not update_fields:
                    return {"success": False, "error": "No valid fields to update"}
                # Add updated_at timestamp
                update_fields.append("updated_at = NOW()")
                update_query = """
                    UPDATE marketplace
                    SET {', '.join(update_fields)}
                    WHERE id = :listing_id
                """
                session.execute(text(update_query), update_params)
                session.commit()
                logger.info(f"Marketplace listing {listing_id} updated successfully")
                return {
                    "success": True,
                    "data": {
                        "listing_id": listing_id,
                        "message": "Listing updated successfully",
                    },
                }
        except Exception as e:
            logger.exception(f"Error updating marketplace listing {listing_id}")
            return {
                "success": False,
                "error": "Failed to update listing",
                "details": str(e),
            }

    def delete_listing(self, listing_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a marketplace listing."""
        try:
            if not self.db_manager or not hasattr(
                self.db_manager, "connection_manager"
            ):
                logger.warning("Database manager not available for marketplace delete")
                return {"success": False, "error": "Database service unavailable"}
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text

                # First, verify the listing exists and belongs to the user
                verify_query = """
                    SELECT id, vendor_id as seller_id, status
                    FROM marketplace
                    WHERE id = :listing_id
                """
                result = session.execute(text(verify_query), {"listing_id": listing_id})
                listing = result.fetchone()
                if not listing:
                    return {"success": False, "error": "Listing not found"}
                # Check if user owns the listing
                seller_id = data.get("seller_id")
                if listing.seller_id != seller_id:
                    return {
                        "success": False,
                        "error": "Unauthorized to delete this listing",
                    }
                # Soft delete by setting status to 'deleted'
                delete_query = """
                    UPDATE marketplace
                    SET status = 'deleted', updated_at = NOW()
                    WHERE id = :listing_id
                """
                session.execute(text(delete_query), {"listing_id": listing_id})
                session.commit()
                logger.info(f"Marketplace listing {listing_id} deleted successfully")
                return {
                    "success": True,
                    "data": {
                        "listing_id": listing_id,
                        "message": "Listing deleted successfully",
                    },
                }
        except Exception as e:
            logger.exception(f"Error deleting marketplace listing {listing_id}")
            return {
                "success": False,
                "error": "Failed to delete listing",
                "details": str(e),
            }
