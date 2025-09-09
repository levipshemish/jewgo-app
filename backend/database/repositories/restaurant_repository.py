"""
Fixed Restaurant Repository with proper session management using context managers.
This file replaces the original restaurant_repository.py to fix memory leaks.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from database.base_repository import BaseRepository
from database.connection_manager import DatabaseConnectionManager
from database.models.restaurant import Restaurant

logger = logging.getLogger(__name__)


class RestaurantRepository(BaseRepository[Restaurant]):
    """Repository for restaurant data operations with proper session management."""

    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize restaurant repository."""
        super().__init__(connection_manager, Restaurant)
        self.logger = logger.bind(repository="RestaurantRepository")

    def get_restaurants_with_filters(
        self,
        kosher_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Restaurant]:
        """Get restaurants with advanced filtering and pagination."""
        try:
            with self.connection_manager.session_scope() as session:
                query = session.query(Restaurant)
                # Apply filters if provided
                if filters:
                    if filters.get("search"):
                        search_term = filters["search"]
                        query = query.filter(Restaurant.name.ilike(f"%{search_term}%"))
                    if filters.get("status"):
                        query = query.filter(Restaurant.status == filters["status"])
                    if filters.get("kosher_category"):
                        query = query.filter(
                            Restaurant.kosher_category == filters["kosher_category"]
                        )
                # Apply legacy filters if no filters dict provided
                if not filters:
                    if kosher_type:
                        query = query.filter(Restaurant.kosher_category == kosher_type)
                    if status:
                        query = query.filter(Restaurant.status == status)
                # Filter out obvious test data (restaurants with test-like names)
                test_patterns = ['SUCCESS', 'TEST', '🎉', '🏆']
                for pattern in test_patterns:
                    query = query.filter(~Restaurant.name.ilike(f'%{pattern}%'))
                
                # Add ordering for consistent results
                query = query.order_by(Restaurant.id)
                restaurants = query.limit(limit).offset(offset).all()
                return restaurants
        except Exception as e:
            self.logger.exception("Error fetching restaurants", error=str(e))
            return []

    def search_restaurants(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
        kosher_type: Optional[str] = None,
    ) -> List[Restaurant]:
        """Search restaurants by name or description."""
        try:
            with self.connection_manager.session_scope() as session:
                search_query = session.query(Restaurant)
                
                # Search in name and description
                search_conditions = or_(
                    Restaurant.name.ilike(f"%{query}%"),
                    Restaurant.description.ilike(f"%{query}%")
                )
                search_query = search_query.filter(search_conditions)
                
                # Apply kosher type filter if provided
                if kosher_type:
                    search_query = search_query.filter(
                        Restaurant.kosher_category == kosher_type
                    )
                
                restaurants = (
                    search_query
                    .order_by(Restaurant.name)
                    .limit(limit)
                    .offset(offset)
                    .all()
                )
                return restaurants
        except Exception as e:
            self.logger.exception("Error searching restaurants", error=str(e))
            return []

    def get_restaurants_near_location(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Restaurant]:
        """Get restaurants near a specific location using PostGIS."""
        try:
            with self.connection_manager.session_scope() as session:
                # Use PostGIS ST_DWithin for efficient spatial queries
                restaurants = (
                    session.query(Restaurant)
                    .filter(
                        text(
                            "ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :radius)"
                        ).params(
                            lng=longitude, lat=latitude, radius=radius_km * 1000
                        )
                    )
                    .order_by(
                        text(
                            "ST_Distance(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))"
                        ).params(lng=longitude, lat=latitude)
                    )
                    .limit(limit)
                    .offset(offset)
                    .all()
                )
                return restaurants
        except Exception as e:
            self.logger.exception(
                "Error searching restaurants near location", error=str(e)
            )
            return []

    def get_restaurants_with_hours_count(self) -> int:
        """Get count of restaurants that have hours information."""
        try:
            with self.connection_manager.session_scope() as session:
                count = (
                    session.query(Restaurant)
                    .filter(Restaurant.hours.isnot(None))
                    .filter(Restaurant.hours != "")
                    .count()
                )
                return count
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants with hours count", error=str(e)
            )
            return 0

    def get_restaurants_without_websites(self, limit: int = 10) -> List[Restaurant]:
        """Get restaurants that don't have websites."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurants = (
                    session.query(Restaurant)
                    .filter(
                        or_(
                            Restaurant.website.is_(None),
                            Restaurant.website == "",
                        )
                    )
                    .limit(limit)
                    .all()
                )
                return restaurants
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants without websites", error=str(e)
            )
            return []

    def get_restaurants_without_recent_reviews(
        self, limit: int = 10
    ) -> List[Restaurant]:
        """Get restaurants that don't have recent Google reviews."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurants = (
                    session.query(Restaurant)
                    .filter(
                        or_(
                            Restaurant.google_reviews_count == 0,
                            Restaurant.google_reviews_count.is_(None),
                        )
                    )
                    .limit(limit)
                    .all()
                )
                return restaurants
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants without recent reviews", error=str(e)
            )
            return []

    def get_restaurants_without_images(self, limit: int = 10) -> List[Restaurant]:
        """Get restaurants that don't have images."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurants = (
                    session.query(Restaurant)
                    .filter(
                        or_(
                            Restaurant.image_url.is_(None),
                            Restaurant.image_url == "",
                        )
                    )
                    .limit(limit)
                    .all()
                )
                return restaurants
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants without images", error=str(e)
            )
            return []

    def get_restaurant_by_name(self, name: str) -> Optional[Restaurant]:
        """Get restaurant by exact name match."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurant = (
                    session.query(Restaurant).filter(Restaurant.name == name).first()
                )
                return restaurant
        except Exception as e:
            self.logger.exception("Error getting restaurant by name", error=str(e))
            return None

    def get_restaurant_by_name_and_address(
        self, name: str, address: str
    ) -> Optional[Restaurant]:
        """Get restaurant by name and address."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurant = (
                    session.query(Restaurant)
                    .filter(
                        and_(Restaurant.name == name, Restaurant.address == address)
                    )
                    .first()
                )
                return restaurant
        except Exception as e:
            self.logger.exception(
                "Error getting restaurant by name and address", error=str(e)
            )
            return None

    def get_kosher_types(self) -> List[str]:
        """Get all unique kosher types."""
        try:
            with self.connection_manager.session_scope() as session:
                kosher_types = (
                    session.query(Restaurant.kosher_category)
                    .filter(Restaurant.kosher_category.isnot(None))
                    .distinct()
                    .all()
                )
                return [kosher_type[0] for kosher_type in kosher_types if kosher_type[0]]
        except Exception as e:
            self.logger.exception("Error getting kosher types", error=str(e))
            return []

    def increment_view_count(self, restaurant_id: int) -> bool:
        """Increment view count for a restaurant."""
        try:
            with self.connection_manager.session_scope() as session:
                result = session.execute(
                    text(
                        "UPDATE restaurants SET view_count = COALESCE(view_count, 0) + 1 WHERE id = :id RETURNING view_count"
                    ),
                    {"id": restaurant_id}
                )
                updated_count = result.fetchone()
                if updated_count:
                    self.logger.info("Incremented view count", restaurant_id=restaurant_id, new_count=updated_count[0])
                    return True
                else:
                    return False
        except Exception as e:
            self.logger.exception("Error incrementing view count", error=str(e))
            return False

    def get_restaurant_stats(self) -> Dict[str, Any]:
        """Get restaurant statistics."""
        try:
            with self.connection_manager.session_scope() as session:
                total_restaurants = session.query(Restaurant).count()
                
                kosher_stats = (
                    session.query(
                        Restaurant.kosher_category,
                        func.count(Restaurant.id).label("count")
                    )
                    .filter(Restaurant.kosher_category.isnot(None))
                    .group_by(Restaurant.kosher_category)
                    .all()
                )
                
                return {
                    "total_restaurants": total_restaurants,
                    "kosher_categories": dict(kosher_stats),
                }
        except Exception as e:
            self.logger.exception("Error getting restaurant stats", error=str(e))
            return {"total_restaurants": 0, "kosher_categories": {}}

    def get_review_stats(self) -> Dict[str, Any]:
        """Get review statistics."""
        try:
            with self.connection_manager.session_scope() as session:
                restaurants_with_reviews = (
                    session.query(Restaurant)
                    .filter(Restaurant.google_reviews_count > 0)
                    .count()
                )
                
                avg_rating = (
                    session.query(func.avg(Restaurant.google_rating))
                    .filter(Restaurant.google_rating.isnot(None))
                    .scalar()
                )
                
                return {
                    "restaurants_with_reviews": restaurants_with_reviews,
                    "average_rating": float(avg_rating) if avg_rating else 0.0,
                }
        except Exception as e:
            self.logger.exception("Error getting review stats", error=str(e))
            return {"restaurants_with_reviews": 0, "average_rating": 0.0}

    def get_restaurants_with_keyset_pagination(
        self,
        *,
        cursor_created_at: Optional[datetime] = None,
        cursor_id: Optional[int] = None,
        direction: str = 'next',
        limit: int = 50,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Restaurant], Optional[str]]:
        """
        Get restaurants using keyset pagination for better performance.
        
        Args:
            cursor_created_at: Cursor timestamp for pagination
            cursor_id: Cursor ID for pagination
            direction: 'next' or 'prev' for pagination direction
            limit: Number of results to return
            filters: Optional filters to apply
            
        Returns:
            Tuple of (restaurants, next_cursor)
        """
        try:
            with self.connection_manager.session_scope() as session:
                query = session.query(Restaurant)
                
                # Apply filters
                if filters:
                    query = self._apply_restaurant_filters(query, filters)
                
                # Apply cursor-based pagination
                if cursor_created_at and cursor_id:
                    if direction == 'next':
                        query = query.filter(
                            or_(
                                Restaurant.created_at > cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id > cursor_id
                                )
                            )
                        )
                    else:  # prev
                        query = query.filter(
                            or_(
                                Restaurant.created_at < cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id < cursor_id
                                )
                            )
                        )
                
                # Order by created_at, then by id for consistent pagination
                query = query.order_by(Restaurant.created_at, Restaurant.id)
                
                # Apply limit
                restaurants = query.limit(limit).all()
                
                # Generate next cursor
                next_cursor = None
                if restaurants and len(restaurants) == limit:
                    last_restaurant = restaurants[-1]
                    next_cursor = f"{last_restaurant.created_at.isoformat()}_{last_restaurant.id}"
                
                self.logger.debug("Keyset pagination query executed",
                                cursor_id=cursor_id,
                                direction=direction,
                                limit=limit,
                                results_count=len(restaurants),
                                next_cursor=next_cursor)
                
                return restaurants, next_cursor
                
        except Exception as e:
            self.logger.exception("Error in keyset pagination", error=str(e))
            return [], None

    def count_restaurants_with_filters(
        self,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Count restaurants matching the given filters."""
        try:
            with self.connection_manager.session_scope() as session:
                query = session.query(Restaurant)
                
                # Apply filters
                if filters:
                    query = self._apply_restaurant_filters(query, filters)
                
                count = query.count()
                
                return count
                
        except Exception as e:
            self.logger.exception("Error counting restaurants", error=str(e))
            return 0

    def _apply_restaurant_filters(self, query, filters: Dict[str, Any]):
        """Apply filters to a restaurant query."""
        if filters.get("search"):
            search_term = filters["search"]
            query = query.filter(Restaurant.name.ilike(f"%{search_term}%"))
        
        if filters.get("status"):
            query = query.filter(Restaurant.status == filters["status"])
        
        if filters.get("kosher_category"):
            query = query.filter(Restaurant.kosher_category == filters["kosher_category"])
        
        if filters.get("has_website"):
            if filters["has_website"]:
                query = query.filter(
                    and_(
                        Restaurant.website.isnot(None),
                        Restaurant.website != ""
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Restaurant.website.is_(None),
                        Restaurant.website == ""
                    )
                )
        
        if filters.get("min_rating"):
            query = query.filter(Restaurant.google_rating >= filters["min_rating"])
        
        if filters.get("max_rating"):
            query = query.filter(Restaurant.google_rating <= filters["max_rating"])
        
        return query