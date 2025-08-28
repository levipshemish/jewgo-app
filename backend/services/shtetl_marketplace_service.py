#!/usr/bin/env python3
"""Shtetl Marketplace Service - Jewish Community Marketplace Operations.

This service handles all operations for the separate shtetl marketplace,
including Gemach (free loans), kosher certifications, and community features.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from utils.logging_config import get_logger

from .base_service import BaseService

logger = get_logger(__name__)


class ShtetlMarketplaceService(BaseService):
    """Shtetl marketplace service for Jewish community items and Gemach loans."""

    def __init__(self, db_manager=None, cache_manager=None, config=None):
        """Initialize the shtetl marketplace service."""
        super().__init__(
            db_manager=db_manager, cache_manager=cache_manager, config=config
        )

        logger.info("ShtetlMarketplaceService initialized successfully - v1.0")

    def get_listings(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        transaction_type: Optional[str] = None,  # sale, gemach, trade, donation
        is_gemach: Optional[bool] = None,
        kosher_agency: Optional[str] = None,
        holiday_category: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        status: str = "active",
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: float = 10.0,
    ) -> Dict[str, Any]:
        """Get shtetl marketplace listings with community-specific filtering."""
        try:
            # Check if shtetl_marketplace table exists
            if not self.db_manager or not hasattr(self.db_manager, 'connection_manager'):
                logger.warning("Database manager not available for shtetl marketplace")
                return self._get_empty_listings_response(limit, offset)
            
            # Try to check if shtetl_marketplace table exists
            try:
                with self.db_manager.connection_manager.get_session_context() as session:
                    from sqlalchemy import text
                    # Test if shtetl_marketplace table exists
                    result = session.execute(text('SELECT 1 FROM information_schema.tables WHERE table_name = \'shtetl_marketplace\''))
                    if not result.fetchone():
                        logger.warning("Shtetl marketplace table does not exist, returning empty response")
                        return self._get_empty_listings_response(limit, offset)
            except Exception as e:
                logger.warning(f"Could not check shtetl_marketplace table: {e}")
                return self._get_empty_listings_response(limit, offset)
            
            # Build query for shtetl_marketplace table
            query = """
                SELECT s.id, s.title, s.description, s.price_cents, s.currency, s.city, s.state, s.zip_code,
                       s.latitude as lat, s.longitude as lng, s.seller_name, s.seller_phone, s.seller_email,
                       s.category_name, s.subcategory, s.status, s.created_at, s.updated_at,
                       s.thumbnail, s.images, s.kosher_agency, s.kosher_level, s.kosher_verified,
                       s.rabbi_endorsed, s.community_verified, s.is_gemach, s.gemach_type,
                       s.holiday_category, s.condition, s.stock_quantity, s.is_available, s.is_featured,
                       s.rating, s.review_count, s.transaction_type, s.contact_preference, s.notes
                FROM shtetl_marketplace s
                WHERE s.status = :status
            """
            params = {"status": status}

            # Add filters
            if search:
                query += " AND (s.title ILIKE :search1 OR s.description ILIKE :search2 OR s.keywords ILIKE :search3)"
                params["search1"] = f"%{search}%"
                params["search2"] = f"%{search}%"
                params["search3"] = f"%{search}%"

            if category:
                query += " AND s.category_name ILIKE :category"
                params["category"] = f"%{category}%"

            if subcategory:
                query += " AND s.subcategory ILIKE :subcategory"
                params["subcategory"] = f"%{subcategory}%"

            if transaction_type:
                query += " AND s.transaction_type = :transaction_type"
                params["transaction_type"] = transaction_type

            if is_gemach is not None:
                query += " AND s.is_gemach = :is_gemach"
                params["is_gemach"] = is_gemach

            if kosher_agency:
                query += " AND s.kosher_agency ILIKE :kosher_agency"
                params["kosher_agency"] = f"%{kosher_agency}%"

            if holiday_category:
                query += " AND s.holiday_category = :holiday_category"
                params["holiday_category"] = holiday_category

            if min_price is not None:
                query += " AND s.price_cents >= :min_price"
                params["min_price"] = min_price

            if max_price is not None:
                query += " AND s.price_cents <= :max_price"
                params["max_price"] = max_price

            if city:
                query += " AND s.city ILIKE :city"
                params["city"] = f"%{city}%"

            if state:
                query += " AND s.state ILIKE :state"
                params["state"] = f"%{state}%"

            # Community-prioritized sorting
            query += """
                ORDER BY 
                    s.is_gemach DESC,              -- Gemach items first
                    s.community_verified DESC,     -- Community verified next
                    s.rabbi_endorsed DESC,         -- Rabbi endorsed next
                    s.kosher_verified DESC,        -- Kosher verified next
                    s.is_featured DESC,            -- Featured items
                    s.created_at DESC              -- Newest first
                LIMIT :limit OFFSET :offset
            """
            params["limit"] = limit
            params["offset"] = offset

            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                result = session.execute(text(query), params)
                rows = result.fetchall()

                # Convert rows to dictionaries
                listings = []
                for row in rows:
                    listing = dict(row._mapping)
                    
                    # Handle JSON fields
                    if listing.get('images'):
                        try:
                            if isinstance(listing['images'], str):
                                listing['images'] = json.loads(listing['images'])
                        except (json.JSONDecodeError, TypeError):
                            listing['images'] = []
                    
                    listings.append(listing)

                # Get total count for pagination
                count_query = query.replace(
                    "SELECT s.id, s.title, s.description, s.price_cents, s.currency, s.city, s.state, s.zip_code, s.latitude as lat, s.longitude as lng, s.seller_name, s.seller_phone, s.seller_email, s.category_name, s.subcategory, s.status, s.created_at, s.updated_at, s.thumbnail, s.images, s.kosher_agency, s.kosher_level, s.kosher_verified, s.rabbi_endorsed, s.community_verified, s.is_gemach, s.gemach_type, s.holiday_category, s.condition, s.stock_quantity, s.is_available, s.is_featured, s.rating, s.review_count, s.transaction_type, s.contact_preference, s.notes FROM shtetl_marketplace s",
                    "SELECT COUNT(*) as total FROM shtetl_marketplace s"
                ).split("ORDER BY")[0]  # Remove ORDER BY and LIMIT clauses
                
                count_result = session.execute(text(count_query), {k: v for k, v in params.items() if k not in ['limit', 'offset']})
                total = count_result.fetchone()[0]

                return {
                    "success": True,
                    "data": {
                        "listings": listings,
                        "total": total,
                        "limit": limit,
                        "offset": offset,
                        "community_focus": True  # Indicates this is community-focused data
                    }
                }

        except Exception as e:
            logger.exception("Error fetching shtetl marketplace listings")
            return {
                "success": False,
                "error": f"Failed to fetch shtetl listings: {str(e)}",
                "data": {"listings": [], "total": 0, "limit": limit, "offset": offset}
            }

    def get_listing_by_id(self, listing_id: str) -> Dict[str, Any]:
        """Get a specific shtetl marketplace listing by ID."""
        try:
            if not self.db_manager:
                logger.warning("Database manager not available")
                return {"success": False, "error": "Database unavailable"}

            query = """
                SELECT s.*, 
                       CASE WHEN s.seller_user_id IS NOT NULL THEN 'registered' ELSE 'guest' END as seller_type
                FROM shtetl_marketplace s
                WHERE s.id = :listing_id AND s.status != 'deleted'
            """

            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                result = session.execute(text(query), {"listing_id": listing_id})
                row = result.fetchone()

                if not row:
                    return {"success": False, "error": "Shtetl listing not found"}

                listing = dict(row._mapping)
                
                # Handle JSON fields
                if listing.get('images'):
                    try:
                        if isinstance(listing['images'], str):
                            listing['images'] = json.loads(listing['images'])
                    except (json.JSONDecodeError, TypeError):
                        listing['images'] = []

                return {"success": True, "data": listing}

        except Exception as e:
            logger.exception(f"Error fetching shtetl listing {listing_id}")
            return {"success": False, "error": f"Failed to fetch shtetl listing: {str(e)}"}

    def create_listing(self, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new shtetl marketplace listing."""
        try:
            if not self.db_manager:
                return {"success": False, "error": "Database unavailable"}

            # Validate required fields
            required_fields = ["title", "category_name", "seller_name", "city", "state"]
            for field in required_fields:
                if not listing_data.get(field):
                    return {"success": False, "error": f"Missing required field: {field}"}

            # Set defaults and process data
            now = datetime.now(timezone.utc)
            processed_data = {
                "title": listing_data["title"],
                "description": listing_data.get("description"),
                "price_cents": listing_data.get("price_cents", 0),
                "currency": listing_data.get("currency", "USD"),
                "city": listing_data["city"],
                "state": listing_data["state"],
                "zip_code": listing_data.get("zip_code"),
                "latitude": listing_data.get("latitude"),
                "longitude": listing_data.get("longitude"),
                "category_name": listing_data["category_name"],
                "subcategory": listing_data.get("subcategory"),
                "seller_name": listing_data["seller_name"],
                "seller_phone": listing_data.get("seller_phone"),
                "seller_email": listing_data.get("seller_email"),
                "seller_user_id": listing_data.get("seller_user_id"),
                "kosher_agency": listing_data.get("kosher_agency"),
                "kosher_level": listing_data.get("kosher_level"),
                "kosher_verified": listing_data.get("kosher_verified", False),
                "rabbi_endorsed": listing_data.get("rabbi_endorsed", False),
                "community_verified": listing_data.get("community_verified", False),
                "is_gemach": listing_data.get("is_gemach", False),
                "gemach_type": listing_data.get("gemach_type"),
                "loan_duration_days": listing_data.get("loan_duration_days"),
                "return_condition": listing_data.get("return_condition"),
                "holiday_category": listing_data.get("holiday_category"),
                "seasonal_item": listing_data.get("seasonal_item", False),
                "available_until": listing_data.get("available_until"),
                "condition": listing_data.get("condition", "good"),
                "stock_quantity": listing_data.get("stock_quantity", 1),
                "is_available": listing_data.get("is_available", True),
                "is_featured": listing_data.get("is_featured", False),
                "rating": 0.0,
                "review_count": 0,
                "status": "active",
                "transaction_type": listing_data.get("transaction_type", "sale"),
                "contact_preference": listing_data.get("contact_preference", "phone"),
                "pickup_instructions": listing_data.get("pickup_instructions"),
                "notes": listing_data.get("notes"),
                "created_at": now,
                "updated_at": now
            }

            # If price is 0, mark as Gemach automatically
            if processed_data["price_cents"] == 0:
                processed_data["is_gemach"] = True
                processed_data["transaction_type"] = "gemach"

            insert_query = """
                INSERT INTO shtetl_marketplace 
                (title, description, price_cents, currency, city, state, zip_code, latitude, longitude,
                 category_name, subcategory, seller_name, seller_phone, seller_email, seller_user_id,
                 kosher_agency, kosher_level, kosher_verified, rabbi_endorsed, community_verified,
                 is_gemach, gemach_type, loan_duration_days, return_condition, holiday_category,
                 seasonal_item, available_until, condition, stock_quantity, is_available, is_featured,
                 rating, review_count, status, transaction_type, contact_preference,
                 pickup_instructions, notes, created_at, updated_at)
                VALUES 
                (:title, :description, :price_cents, :currency, :city, :state, :zip_code, :latitude, :longitude,
                 :category_name, :subcategory, :seller_name, :seller_phone, :seller_email, :seller_user_id,
                 :kosher_agency, :kosher_level, :kosher_verified, :rabbi_endorsed, :community_verified,
                 :is_gemach, :gemach_type, :loan_duration_days, :return_condition, :holiday_category,
                 :seasonal_item, :available_until, :condition, :stock_quantity, :is_available, :is_featured,
                 :rating, :review_count, :status, :transaction_type, :contact_preference,
                 :pickup_instructions, :notes, :created_at, :updated_at)
                RETURNING id
            """

            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                result = session.execute(text(insert_query), processed_data)
                listing_id = result.fetchone()[0]
                session.commit()

                logger.info(f"Created shtetl listing {listing_id}: {processed_data['title']}")
                
                return {
                    "success": True,
                    "data": {"id": listing_id, **processed_data},
                    "message": "Shtetl listing created successfully"
                }

        except Exception as e:
            logger.exception("Error creating shtetl listing")
            return {"success": False, "error": f"Failed to create shtetl listing: {str(e)}"}

    def get_categories(self) -> Dict[str, Any]:
        """Get shtetl marketplace categories."""
        # Hardcoded Jewish community categories
        categories = [
            {"name": "Judaica", "subcategories": ["Mezuzot", "Kiddush Cups", "Havdalah Sets", "Tallitot", "Tefillin"]},
            {"name": "Holiday Items", "subcategories": ["Passover", "Sukkot", "Purim", "Chanukah", "Rosh Hashana"]},
            {"name": "Religious Books", "subcategories": ["Siddur", "Chumash", "Gemara", "Halacha", "Jewish Philosophy"]},
            {"name": "Kosher Food", "subcategories": ["Meat", "Dairy", "Pareve", "Bakery", "Wine"]},
            {"name": "Baby Items", "subcategories": ["Furniture", "Toys", "Clothes", "Feeding", "Safety"]},
            {"name": "Appliances", "subcategories": ["Kitchen", "Cleaning", "Electronics"]},
            {"name": "Furniture", "subcategories": ["Dining", "Living Room", "Bedroom", "Office"]},
            {"name": "Clothing", "subcategories": ["Men", "Women", "Children", "Formal Wear"]},
            {"name": "Books & Media", "subcategories": ["Jewish Books", "Children's Books", "Music", "DVDs"]},
            {"name": "Gemach Items", "subcategories": ["Baby Gear", "Medical Equipment", "Tools", "Books", "Toys"]}
        ]
        
        return {
            "success": True,
            "data": {"categories": categories}
        }

    def _get_empty_listings_response(self, limit: int, offset: int) -> Dict[str, Any]:
        """Return empty listings response."""
        return {
            "success": True,
            "data": {
                "listings": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "community_focus": True
            }
        }