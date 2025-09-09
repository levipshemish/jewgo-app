from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session
from utils.logging_config import get_logger
from ..base_repository import BaseRepository
from ..connection_manager import DatabaseConnectionManager
from ..models import Restaurant, RestaurantImage

logger = get_logger(__name__)
# !/usr/bin/env python3
"""Restaurant repository for database operations.
This module handles all restaurant-related database operations,
separating data access logic from business logic.
"""


class RestaurantRepository(BaseRepository[Restaurant]):
    """Repository for restaurant database operations."""

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
            session = self.connection_manager.get_session()
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
            session.close()
            return restaurants
        except Exception as e:
            self.logger.exception("Error fetching restaurants", error=str(e))
            return []

    def search_restaurants(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Restaurant]:
        """Search restaurants by name or description."""
        try:
            session = self.connection_manager.get_session()
            search_term = f"%{query}%"
            restaurants = (
                session.query(Restaurant)
                .filter(
                    or_(
                        Restaurant.name.ilike(search_term),
                        Restaurant.short_description.ilike(search_term),
                        Restaurant.address.ilike(search_term),
                    )
                )
                .filter(Restaurant.status == "active")
                .order_by(Restaurant.name)
                .limit(limit)
                .offset(offset)
                .all()
            )
            session.close()
            return restaurants
        except Exception as e:
            self.logger.exception("Error searching restaurants", error=str(e))
            return []

    def search_restaurants_near_location(
        self,
        latitude: float,
        longitude: float,
        radius_miles: float = 10.0,
        limit: int = 50,
    ) -> List[Restaurant]:
        """Search restaurants within a radius of a location."""
        try:
            session = self.connection_manager.get_session()
            # Haversine formula for distance calculation
            haversine_formula = (
                func.acos(
                    func.cos(func.radians(latitude))
                    * func.cos(func.radians(Restaurant.latitude))
                    * func.cos(
                        func.radians(Restaurant.longitude) - func.radians(longitude)
                    )
                    + func.sin(func.radians(latitude))
                    * func.sin(func.radians(Restaurant.latitude))
                )
                * 3959
            )  # Earth radius in miles
            restaurants = (
                session.query(Restaurant)
                .filter(
                    and_(
                        Restaurant.latitude.isnot(None),
                        Restaurant.longitude.isnot(None),
                        Restaurant.status == "active",
                        haversine_formula <= radius_miles,
                    )
                )
                .order_by(haversine_formula)
                .limit(limit)
                .all()
            )
            session.close()
            return restaurants
        except Exception as e:
            self.logger.exception(
                "Error searching restaurants near location", error=str(e)
            )
            return []

    def get_restaurants_with_hours_count(self) -> int:
        """Get count of restaurants that have hours information."""
        try:
            session = self.connection_manager.get_session()
            count = (
                session.query(Restaurant)
                .filter(
                    and_(
                        Restaurant.hours_json.isnot(None),
                        Restaurant.hours_json != "",
                        Restaurant.status == "active",
                    )
                )
                .count()
            )
            session.close()
            return count
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants with hours count", error=str(e)
            )
            return 0

    def get_restaurants_without_websites(self, limit: int = 10) -> List[Restaurant]:
        """Get restaurants that don't have websites."""
        try:
            session = self.connection_manager.get_session()
            restaurants = (
                session.query(Restaurant)
                .filter(
                    and_(
                        or_(
                            Restaurant.website.is_(None),
                            Restaurant.website == "",
                            Restaurant.website == "N/A",
                        ),
                        Restaurant.status == "active",
                    )
                )
                .order_by(Restaurant.name)
                .limit(limit)
                .all()
            )
            session.close()
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
            session = self.connection_manager.get_session()
            restaurants = (
                session.query(Restaurant)
                .filter(
                    and_(
                        or_(
                            Restaurant.google_reviews.is_(None),
                            Restaurant.google_reviews == "",
                            Restaurant.google_reviews == "[]",
                        ),
                        Restaurant.status == "active",
                    )
                )
                .order_by(Restaurant.name)
                .limit(limit)
                .all()
            )
            session.close()
            return restaurants
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants without recent reviews", error=str(e)
            )
            return []

    def get_restaurants_without_images(self, limit: int = 10) -> List[Restaurant]:
        """Get restaurants that don't have images."""
        try:
            session = self.connection_manager.get_session()
            restaurants = (
                session.query(Restaurant)
                .filter(
                    and_(
                        or_(
                            Restaurant.image_url.is_(None),
                            Restaurant.image_url == "",
                            Restaurant.image_url == "N/A",
                        ),
                        Restaurant.status == "active",
                    )
                )
                .order_by(Restaurant.name)
                .limit(limit)
                .all()
            )
            session.close()
            return restaurants
        except Exception as e:
            self.logger.exception(
                "Error getting restaurants without images", error=str(e)
            )
            return []

    def get_restaurant_by_name(self, name: str) -> Optional[Restaurant]:
        """Get restaurant by exact name match."""
        try:
            session = self.connection_manager.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.name == name).first()
            )
            session.close()
            return restaurant
        except Exception as e:
            self.logger.exception("Error getting restaurant by name", error=str(e))
            return None

    def find_restaurant_by_name_and_address(
        self,
        name: str,
        address: str,
    ) -> Optional[Restaurant]:
        """Find restaurant by name and address combination."""
        try:
            session = self.connection_manager.get_session()
            restaurant = (
                session.query(Restaurant)
                .filter(and_(Restaurant.name == name, Restaurant.address == address))
                .first()
            )
            session.close()
            return restaurant
        except Exception as e:
            self.logger.exception(
                "Error finding restaurant by name and address", error=str(e)
            )
            return None

    def get_kosher_types(self) -> List[str]:
        """Get all unique kosher categories."""
        try:
            session = self.connection_manager.get_session()
            kosher_types = (
                session.query(Restaurant.kosher_category)
                .filter(Restaurant.status == "active")
                .distinct()
                .all()
            )
            session.close()
            return [kosher_type[0] for kosher_type in kosher_types if kosher_type[0]]
        except Exception as e:
            self.logger.exception("Error getting kosher types", error=str(e))
            return []

    def increment_view_count(self, restaurant_id: int) -> bool:
        """Increment the view count for a restaurant."""
        try:
            session = self.connection_manager.get_session()
            
            # Use raw SQL to increment view count to avoid model caching issues
            from sqlalchemy import text
            result = session.execute(
                text("UPDATE restaurants SET view_count = COALESCE(view_count, 0) + 1, updated_at = NOW() WHERE id = :restaurant_id RETURNING view_count"),
                {"restaurant_id": restaurant_id}
            )
            
            updated_count = result.fetchone()
            if updated_count:
                session.commit()
                session.close()
                self.logger.info("Incremented view count", restaurant_id=restaurant_id, new_count=updated_count[0])
                return True
            else:
                session.close()
                return False
                
        except Exception as e:
            self.logger.exception("Error incrementing view count", error=str(e))
            return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get restaurant statistics."""
        try:
            session = self.connection_manager.get_session()
            # Total restaurants
            total_restaurants = (
                session.query(Restaurant).filter(Restaurant.status == "active").count()
            )
            # Restaurants by kosher category
            kosher_stats = (
                session.query(Restaurant.kosher_category, func.count(Restaurant.id))
                .filter(Restaurant.status == "active")
                .group_by(Restaurant.kosher_category)
                .all()
            )
            # Restaurants with hours
            restaurants_with_hours = self.get_restaurants_with_hours_count()
            # Restaurants with websites
            restaurants_with_websites = (
                session.query(Restaurant)
                .filter(
                    and_(
                        Restaurant.website.isnot(None),
                        Restaurant.website != "",
                        Restaurant.website != "N/A",
                        Restaurant.status == "active",
                    )
                )
                .count()
            )
            # Restaurants with images
            restaurants_with_images = (
                session.query(Restaurant)
                .filter(
                    and_(
                        Restaurant.image_url.isnot(None),
                        Restaurant.image_url != "",
                        Restaurant.image_url != "N/A",
                        Restaurant.status == "active",
                    )
                )
                .count()
            )
            session.close()
            return {
                "total_restaurants": total_restaurants,
                "kosher_categories": dict(kosher_stats),
                "restaurants_with_hours": restaurants_with_hours,
                "restaurants_with_websites": restaurants_with_websites,
                "restaurants_with_images": restaurants_with_images,
                "restaurants_without_hours": total_restaurants - restaurants_with_hours,
                "restaurants_without_websites": total_restaurants
                - restaurants_with_websites,
                "restaurants_without_images": total_restaurants
                - restaurants_with_images,
            }
        except Exception as e:
            self.logger.exception("Error getting statistics", error=str(e))
            return {}

    def get_google_reviews_statistics(self) -> Dict[str, Any]:
        """Get Google reviews statistics."""
        try:
            session = self.connection_manager.get_session()
            # Restaurants with Google reviews
            restaurants_with_reviews = (
                session.query(Restaurant)
                .filter(
                    and_(
                        Restaurant.google_reviews.isnot(None),
                        Restaurant.google_reviews != "",
                        Restaurant.google_reviews != "[]",
                        Restaurant.status == "active",
                    )
                )
                .count()
            )
            # Average Google rating
            avg_rating = (
                session.query(func.avg(Restaurant.google_rating))
                .filter(
                    and_(
                        Restaurant.google_rating.isnot(None),
                        Restaurant.status == "active",
                    )
                )
                .scalar()
            )
            # Total review count
            total_reviews = (
                session.query(func.sum(Restaurant.google_review_count))
                .filter(
                    and_(
                        Restaurant.google_review_count.isnot(None),
                        Restaurant.status == "active",
                    )
                )
                .scalar()
            )
            session.close()
            return {
                "restaurants_with_reviews": restaurants_with_reviews,
                "average_rating": float(avg_rating) if avg_rating else 0.0,
                "total_reviews": int(total_reviews) if total_reviews else 0,
            }
        except Exception as e:
            self.logger.exception(
                "Error getting Google reviews statistics", error=str(e)
            )
            return {}

    def update_restaurant_hours(
        self,
        restaurant_id: int,
        hours_json: str,
        hours_parsed: bool = True,
    ) -> bool:
        """Update restaurant hours information."""
        try:
            update_data = {
                "hours_json": hours_json,
                "hours_parsed": hours_parsed,
                "hours_last_updated": datetime.utcnow(),
            }
            return self.update(restaurant_id, update_data)
        except Exception as e:
            self.logger.exception("Error updating restaurant hours", error=str(e))
            return False

    def update_restaurant_orb_data(
        self,
        restaurant_id: int,
        orb_data: Dict[str, Any],
    ) -> bool:
        """Update restaurant with ORB data."""
        try:
            # Extract relevant fields from ORB data
            update_data = {}
            orb_fields = [
                "name",
                "address",
                "city",
                "state",
                "zip_code",
                "phone_number",
                "website",
                "kosher_category",
                "listing_type",
                "is_cholov_yisroel",
                "is_pas_yisroel",
                "cholov_stam",
            ]
            for field in orb_fields:
                if field in orb_data:
                    update_data[field] = orb_data[field]
            update_data["updated_at"] = datetime.utcnow()
            return self.update(restaurant_id, update_data)
        except Exception as e:
            self.logger.exception("Error updating restaurant ORB data", error=str(e))
            return False

    def _eager_load_restaurant_images(
        self, session: Session, restaurants: List[Restaurant]
    ) -> Dict[int, List[Dict[str, Any]]]:
        """Eager load all restaurant images for a list of restaurants to avoid N+1 queries."""
        restaurant_images_map = {}
        if not restaurants:
            return restaurant_images_map
        restaurant_ids = [r.id for r in restaurants]
        # Fetch all images for all restaurants in one query
        images_query = (
            session.query(RestaurantImage)
            .filter(RestaurantImage.restaurant_id.in_(restaurant_ids))
            .order_by(RestaurantImage.restaurant_id, RestaurantImage.image_order.asc())
            .all()
        )
        # Group images by restaurant_id
        for image in images_query:
            if image.restaurant_id not in restaurant_images_map:
                restaurant_images_map[image.restaurant_id] = []
            if image.image_url:  # Only include images with valid URLs
                restaurant_images_map[image.restaurant_id].append(
                    {
                        "id": image.id,
                        "image_url": image.image_url,
                        "image_order": image.image_order,
                        "cloudinary_public_id": image.cloudinary_public_id,
                        "created_at": (
                            image.created_at.isoformat() if image.created_at else None
                        ),
                        "updated_at": (
                            image.updated_at.isoformat() if image.updated_at else None
                        ),
                    }
                )
        self.logger.info(
            "Eager loaded restaurant images",
            restaurant_count=len(restaurants),
            total_images=sum(len(images) for images in restaurant_images_map.values()),
        )
        return restaurant_images_map

    # ========================================
    # Keyset Pagination Methods (Phase 2)
    # ========================================

    def get_restaurants_with_keyset_pagination(
        self,
        *,
        cursor_created_at: Optional[datetime] = None,
        cursor_id: Optional[int] = None,
        direction: str = 'next',
        sort_key: str = 'created_at_desc',
        limit: int = 24,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Restaurant]:
        """Get restaurants using keyset (cursor-based) pagination.
        
        Args:
            cursor_created_at: Cursor position timestamp
            cursor_id: Cursor position ID for tie-breaking
            direction: 'next' or 'prev' for pagination direction
            sort_key: Sorting strategy (e.g., 'created_at_desc', 'name_asc')
            limit: Maximum number of results
            filters: Optional filtering criteria
            
        Returns:
            List of Restaurant objects
        """
        try:
            session = self.connection_manager.get_session()
            query = session.query(Restaurant)
            
            # Apply filters first
            query = self._apply_restaurant_filters(query, filters)
            
            # Apply cursor conditions for keyset pagination
            if cursor_created_at and cursor_id:
                if sort_key == 'created_at_desc':
                    if direction == 'next':
                        # For descending order, next means older records
                        query = query.filter(
                            or_(
                                Restaurant.created_at < cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id < cursor_id
                                )
                            )
                        )
                    else:  # direction == 'prev'
                        # For descending order, prev means newer records
                        query = query.filter(
                            or_(
                                Restaurant.created_at > cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id > cursor_id
                                )
                            )
                        )
                elif sort_key == 'created_at_asc':
                    if direction == 'next':
                        # For ascending order, next means newer records
                        query = query.filter(
                            or_(
                                Restaurant.created_at > cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id > cursor_id
                                )
                            )
                        )
                    else:  # direction == 'prev'
                        # For ascending order, prev means older records
                        query = query.filter(
                            or_(
                                Restaurant.created_at < cursor_created_at,
                                and_(
                                    Restaurant.created_at == cursor_created_at,
                                    Restaurant.id < cursor_id
                                )
                            )
                        )
                elif sort_key == 'name_asc':
                    # Name-based sorting with ID tie-breaking
                    if direction == 'next':
                        query = query.filter(
                            or_(
                                Restaurant.name > cursor_created_at,  # Using created_at field for cursor value
                                and_(
                                    Restaurant.name == cursor_created_at,
                                    Restaurant.id > cursor_id
                                )
                            )
                        )
                    else:  # direction == 'prev'
                        query = query.filter(
                            or_(
                                Restaurant.name < cursor_created_at,
                                and_(
                                    Restaurant.name == cursor_created_at,
                                    Restaurant.id < cursor_id
                                )
                            )
                        )
                elif sort_key == 'name_desc':
                    # Name-based descending sorting
                    if direction == 'next':
                        query = query.filter(
                            or_(
                                Restaurant.name < cursor_created_at,
                                and_(
                                    Restaurant.name == cursor_created_at,
                                    Restaurant.id < cursor_id
                                )
                            )
                        )
                    else:  # direction == 'prev'
                        query = query.filter(
                            or_(
                                Restaurant.name > cursor_created_at,
                                and_(
                                    Restaurant.name == cursor_created_at,
                                    Restaurant.id > cursor_id
                                )
                            )
                        )
            
            # Apply sorting based on sort_key
            if sort_key == 'created_at_desc':
                query = query.order_by(Restaurant.created_at.desc(), Restaurant.id.desc())
            elif sort_key == 'created_at_asc':
                query = query.order_by(Restaurant.created_at.asc(), Restaurant.id.asc())
            elif sort_key == 'name_asc':
                query = query.order_by(Restaurant.name.asc(), Restaurant.id.asc())
            elif sort_key == 'name_desc':
                query = query.order_by(Restaurant.name.desc(), Restaurant.id.desc())
            else:
                # Default fallback
                query = query.order_by(Restaurant.created_at.desc(), Restaurant.id.desc())
            
            # Apply limit
            restaurants = query.limit(limit).all()
            session.close()
            
            self.logger.debug("Keyset pagination query executed",
                            cursor_id=cursor_id,
                            direction=direction,
                            sort_key=sort_key,
                            result_count=len(restaurants))
            
            return restaurants
            
        except Exception as e:
            self.logger.exception("Error in keyset pagination", error=str(e))
            return []

    def _apply_restaurant_filters(self, query, filters: Optional[Dict[str, Any]]):
        """Apply filtering conditions to a restaurant query.
        
        Args:
            query: SQLAlchemy query object
            filters: Filter dictionary
            
        Returns:
            Modified query with filters applied
        """
        if not filters:
            return query
        
        # Search filter
        if filters.get("search"):
            search_term = filters["search"]
            query = query.filter(
                or_(
                    Restaurant.name.ilike(f"%{search_term}%"),
                    Restaurant.short_description.ilike(f"%{search_term}%"),
                    Restaurant.address.ilike(f"%{search_term}%")
                )
            )
        
        # Status filter
        if filters.get("status"):
            query = query.filter(Restaurant.status == filters["status"])
        else:
            # Default to active restaurants only
            query = query.filter(Restaurant.status == "active")
        
        # Kosher category filter
        if filters.get("kosher_category"):
            query = query.filter(Restaurant.kosher_category == filters["kosher_category"])
        
        # Business types filter
        if filters.get("business_types"):
            business_types = filters["business_types"]
            if isinstance(business_types, list):
                query = query.filter(Restaurant.listing_type.in_(business_types))
            else:
                query = query.filter(Restaurant.listing_type == business_types)
        
        # Certifying agency filter  
        if filters.get("certifying_agency"):
            query = query.filter(Restaurant.certifying_agency == filters["certifying_agency"])
        
        # City filter
        if filters.get("city"):
            query = query.filter(Restaurant.city.ilike(f"%{filters['city']}%"))
        
        # State filter
        if filters.get("state"):
            query = query.filter(Restaurant.state == filters["state"])
        
        # Filter out test data (consistent with existing methods)
        test_patterns = ['SUCCESS', 'TEST', '🎉', '🏆']
        for pattern in test_patterns:
            query = query.filter(~Restaurant.name.ilike(f'%{pattern}%'))
        
        return query

    def count_restaurants_with_filters(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count total restaurants matching the given filters.
        
        Args:
            filters: Optional filtering criteria
            
        Returns:
            Total count of matching restaurants
        """
        try:
            session = self.connection_manager.get_session()
            query = session.query(Restaurant)
            
            # Apply the same filters as keyset pagination
            query = self._apply_restaurant_filters(query, filters)
            
            count = query.count()
            session.close()
            
            return count
            
        except Exception as e:
            self.logger.exception("Error counting filtered restaurants", error=str(e))
            return 0
