from utils.logging_config import get_logger

try:
    from utils.cache_manager_v4 import CacheManagerV4

    CACHE_AVAILABLE = True
except ImportError:
    CacheManagerV4 = None
    CACHE_AVAILABLE = False

import hashlib
import json
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

try:
    from utils.error_handler import handle_database_operation

    ERROR_HANDLER_AVAILABLE = True
except ImportError:

    def handle_database_operation(func):
        return func

    ERROR_HANDLER_AVAILABLE = False
import math

from database.database_manager_v3 import Restaurant
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from utils.config_manager import ConfigManager

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Unified Search Service for JewGo Backend.
==========================================

Provides a unified interface for all search operations across the application,
consolidating search functionality from multiple implementations into a single,
consistent service.

Author: JewGo Development Team
Version: 1.0
"""

# Import Restaurant model at module level to avoid repeated imports
try:
    from database.database_manager_v3 import Restaurant
except ImportError:
    Restaurant = None


class SearchType(Enum):
    """Search type enumeration."""

    BASIC = "basic"
    ADVANCED = "advanced"
    LOCATION = "location"
    FULL_TEXT = "full_text"
    FUZZY = "fuzzy"


@dataclass
class SearchFilters:
    """Search filters configuration."""

    query: Optional[str] = None
    kosher_type: Optional[str] = None
    certifying_agency: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    category: Optional[str] = None
    listing_type: Optional[str] = None
    price_range: Optional[str] = None
    min_rating: Optional[float] = None
    has_reviews: Optional[bool] = None
    open_now: Optional[bool] = None
    is_cholov_yisroel: Optional[bool] = None
    is_pas_yisroel: Optional[bool] = None
    cholov_stam: Optional[bool] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius: Optional[float] = None
    fuzzy_threshold: float = 0.3
    limit: int = 50
    offset: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert filters to dictionary."""
        return {key: value for key, value in self.__dict__.items() if value is not None}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchFilters":
        """Create filters from dictionary."""
        return cls(**{key: value for key, value in data.items() if hasattr(cls, key)})


@dataclass
class SearchResult:
    """Individual search result."""

    id: int
    name: str
    address: str
    city: str
    state: str
    zip_code: Optional[str]
    phone_number: Optional[str]
    website: Optional[str]
    certifying_agency: Optional[str]
    kosher_category: Optional[str]
    listing_type: Optional[str]
    price_range: Optional[str]
    short_description: Optional[str]
    hours_of_operation: Optional[Dict[str, Any]]
    latitude: Optional[float]
    longitude: Optional[float]
    is_cholov_yisroel: Optional[bool]
    is_pas_yisroel: Optional[bool]
    cholov_stam: Optional[bool]
    image_url: Optional[str]
    specials: Optional[Dict[str, Any]]
    created_at: Optional[str]
    updated_at: Optional[str]
    relevance_score: Optional[float] = None
    similarity_score: Optional[float] = None
    distance: Optional[float] = None

    @classmethod
    def from_restaurant(cls, restaurant: Any, **kwargs) -> "SearchResult":
        """Create search result from restaurant object."""
        return cls(
            id=restaurant.id,
            name=restaurant.name,
            address=restaurant.address,
            city=restaurant.city,
            state=restaurant.state,
            zip_code=restaurant.zip_code,
            phone_number=restaurant.phone_number,
            website=restaurant.website,
            certifying_agency=restaurant.certifying_agency,
            kosher_category=restaurant.kosher_category,
            listing_type=restaurant.listing_type,
            price_range=restaurant.price_range,
            short_description=restaurant.short_description,
            hours_of_operation=restaurant.hours_of_operation,
            latitude=restaurant.latitude,
            longitude=restaurant.longitude,
            is_cholov_yisroel=restaurant.is_cholov_yisroel,
            is_pas_yisroel=restaurant.is_pas_yisroel,
            cholov_stam=restaurant.cholov_stam,
            image_url=restaurant.image_url,
            specials=restaurant.specials,
            created_at=restaurant.created_at.isoformat()
            if restaurant.created_at
            else None,
            updated_at=restaurant.updated_at.isoformat()
            if restaurant.updated_at
            else None,
            **kwargs,
        )


@dataclass
class SearchResponse:
    """Search response with results and metadata."""

    results: List[SearchResult]
    total_count: int
    search_type: SearchType
    execution_time_ms: int
    filters_applied: SearchFilters
    suggestions: List[str] = None
    cache_hit: bool = False
    timestamp: datetime = None

    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary."""
        return {
            "results": [result.__dict__ for result in self.results],
            "total_count": self.total_count,
            "search_type": self.search_type.value,
            "execution_time_ms": self.execution_time_ms,
            "filters_applied": self.filters_applied.to_dict(),
            "suggestions": self.suggestions,
            "cache_hit": self.cache_hit,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class UnifiedSearchService:
    """Unified search service that consolidates all search functionality."""

    def __init__(self, db_session: Session):
        """Initialize the unified search service."""
        self.session = db_session
        self.config = ConfigManager()

        # Initialize cache manager
        if CACHE_AVAILABLE:
            self.cache_manager = CacheManagerV4(
                default_ttl=1800,  # 30 minutes for search results
                enable_cache=True,
                cache_prefix="jewgo:unified_search:",
            )
        else:
            self.cache_manager = None
            logger.warning("Cache manager not available, caching disabled")

    @handle_database_operation
    def search_restaurants(
        self,
        search_type: SearchType = SearchType.ADVANCED,
        filters: Optional[SearchFilters] = None,
        **kwargs,
    ) -> SearchResponse:
        """Search restaurants using the specified search type.

        Args:
            search_type: Type of search to perform
            filters: Search filters to apply
            **kwargs: Additional search parameters

        Returns:
            SearchResponse with results and metadata
        """
        start_time = time.time()

        if filters is None:
            filters = SearchFilters(**kwargs)

        logger.info(
            "Starting restaurant search",
            search_type=search_type.value,
            filters=filters.to_dict(),
        )

        # Generate cache key and try to get from cache first
        if self.cache_manager:
            cache_key = self._generate_search_cache_key(search_type, filters)
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                logger.info(
                    "Unified search cache hit",
                    search_type=search_type.value,
                    filters=filters.to_dict(),
                )
                # Update cache hit metadata
                cached_result.cache_hit = True
                cached_result.timestamp = datetime.utcnow()
                return cached_result

        try:
            if search_type == SearchType.BASIC:
                results, total_count = self._basic_search(filters)
            elif search_type == SearchType.ADVANCED:
                results, total_count = self._advanced_search(filters)
            elif search_type == SearchType.LOCATION:
                results, total_count = self._location_search(filters)
            elif search_type == SearchType.FULL_TEXT:
                results, total_count = self._full_text_search(filters)
            elif search_type == SearchType.FUZZY:
                results, total_count = self._fuzzy_search(filters)
            else:
                raise ValueError(f"Unsupported search type: {search_type}")

            execution_time_ms = int((time.time() - start_time) * 1000)

            # Get suggestions
            suggestions = self._get_suggestions(filters.query, limit=10)

            response = SearchResponse(
                results=results,
                total_count=total_count,
                search_type=search_type,
                execution_time_ms=execution_time_ms,
                filters_applied=filters,
                suggestions=suggestions,
            )

            # Cache the result
            if self.cache_manager:
                self.cache_manager.set(cache_key, response, ttl=1800)  # 30 minutes

            logger.info(
                "Search completed successfully",
                search_type=search_type.value,
                results_count=len(results),
                total_count=total_count,
                execution_time_ms=execution_time_ms,
            )

            return response

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "Search failed",
                search_type=search_type.value,
                error=str(e),
                execution_time_ms=execution_time_ms,
            )
            raise

    def _basic_search(self, filters: SearchFilters) -> Tuple[List[SearchResult], int]:
        """Perform basic search with simple filters."""

        query = self.session.query(Restaurant)

        # Apply filters
        if filters.query:
            query = query.filter(Restaurant.name.ilike(f"%{filters.query}%"))

        if filters.city:
            query = query.filter(Restaurant.city.ilike(f"%{filters.city}%"))

        if filters.state:
            query = query.filter(Restaurant.state.ilike(f"%{filters.state}%"))

        if filters.kosher_type:
            query = query.filter(
                Restaurant.kosher_category.ilike(f"%{filters.kosher_type}%")
            )

        if filters.certifying_agency:
            query = query.filter(
                Restaurant.certifying_agency.ilike(f"%{filters.certifying_agency}%")
            )

        # Get total count
        total_count = query.count()

        # Get paginated results
        restaurants = query.limit(filters.limit).offset(filters.offset).all()

        # Convert to search results
        results = [
            SearchResult.from_restaurant(restaurant) for restaurant in restaurants
        ]

        return results, total_count

    def _advanced_search(
        self, filters: SearchFilters
    ) -> Tuple[List[SearchResult], int]:
        """Perform advanced search with full-text search capabilities."""

        # Build the base query with full-text search
        base_query = self._build_search_query(filters)

        # Add relevance scoring
        scored_query = self._add_relevance_scoring(base_query, filters.query)

        # Get total count
        count_query = self.session.query(func.count(scored_query.subquery().c.id))
        total_count = count_query.scalar()

        # Get paginated results
        results_query = (
            scored_query.order_by(text("relevance_score DESC"))
            .limit(filters.limit)
            .offset(filters.offset)
        )

        restaurants = results_query.all()

        # Convert to search results
        results = []
        for restaurant in restaurants:
            result = SearchResult.from_restaurant(
                restaurant, relevance_score=getattr(restaurant, "relevance_score", 0)
            )
            results.append(result)

        return results, total_count

    def _location_search(
        self, filters: SearchFilters
    ) -> Tuple[List[SearchResult], int]:
        """Perform location-based search."""

        if not filters.lat or not filters.lng:
            raise ValueError("Location search requires lat and lng coordinates")

        query = self.session.query(Restaurant)

        # Apply basic filters
        if filters.query:
            query = query.filter(
                Restaurant.name.ilike(f"%{filters.query}%")
                | Restaurant.short_description.ilike(f"%{filters.query}%")
            )

        # Get restaurants with coordinates
        restaurants = query.filter(
            Restaurant.latitude.isnot(None), Restaurant.longitude.isnot(None)
        ).all()

        # Calculate distances and filter by radius
        nearby_restaurants = []
        for restaurant in restaurants:
            distance = self._calculate_distance(
                filters.lat, filters.lng, restaurant.latitude, restaurant.longitude
            )

            if distance <= (filters.radius or 50):
                result = SearchResult.from_restaurant(restaurant, distance=distance)
                nearby_restaurants.append(result)

        # Sort by distance
        nearby_restaurants.sort(key=lambda x: x.distance or float("inf"))

        # Apply pagination
        total_count = len(nearby_restaurants)
        start_idx = filters.offset
        end_idx = start_idx + filters.limit
        results = nearby_restaurants[start_idx:end_idx]

        return results, total_count

    def _full_text_search(
        self, filters: SearchFilters
    ) -> Tuple[List[SearchResult], int]:
        """Perform full-text search using PostgreSQL capabilities."""

        if not filters.query:
            return self._basic_search(filters)

        # Use PostgreSQL full-text search
        search_query = text(
            """
            SELECT *,
                   ts_rank(to_tsvector('english', name || ' ' || COALESCE(short_description, '')),
                           plainto_tsquery('english', :query)) as relevance_score
            FROM restaurants
            WHERE to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', :query)
        """
        )

        # Apply additional filters
        where_conditions = []
        params = {"query": filters.query}

        if filters.city:
            where_conditions.append("city ILIKE :city")
            params["city"] = f"%{filters.city}%"

        if filters.state:
            where_conditions.append("state ILIKE :state")
            params["state"] = f"%{filters.state}%"

        if where_conditions:
            search_query = text(
                str(search_query) + " AND " + " AND ".join(where_conditions)
            )

        # Execute query
        result = self.session.execute(search_query, params)
        restaurants = result.fetchall()

        # Convert to search results
        results = []
        for row in restaurants:
            result = SearchResult.from_restaurant(
                row, relevance_score=row.relevance_score
            )
            results.append(result)

        # Apply pagination
        total_count = len(results)
        start_idx = filters.offset
        end_idx = start_idx + filters.limit
        results = results[start_idx:end_idx]

        return results, total_count

    def _fuzzy_search(self, filters: SearchFilters) -> Tuple[List[SearchResult], int]:
        """Perform fuzzy search with typo tolerance."""

        if not filters.query:
            return self._basic_search(filters)

        # Use PostgreSQL similarity function for fuzzy matching
        similarity_query = text(
            """
            SELECT *,
                   similarity(name, :query) as similarity_score,
                   ts_rank(to_tsvector('english', name || ' ' || COALESCE(short_description, '')),
                           plainto_tsquery('english', :query)) as relevance_score
            FROM restaurants
            WHERE similarity(name, :query) > :threshold
               OR to_tsvector('english', name || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', :query)
        """
        )

        params = {"query": filters.query, "threshold": filters.fuzzy_threshold}

        # Execute query
        result = self.session.execute(similarity_query, params)
        restaurants = result.fetchall()

        # Convert to search results
        results = []
        for row in restaurants:
            result = SearchResult.from_restaurant(
                row,
                similarity_score=row.similarity_score,
                relevance_score=row.relevance_score,
            )
            results.append(result)

        # Sort by similarity and relevance
        results.sort(
            key=lambda x: (x.similarity_score or 0, x.relevance_score or 0),
            reverse=True,
        )

        # Apply pagination
        total_count = len(results)
        start_idx = filters.offset
        end_idx = start_idx + filters.limit
        results = results[start_idx:end_idx]

        return results, total_count

    def _build_search_query(self, filters: SearchFilters):
        """Build base search query with filters."""

        query = self.session.query(Restaurant)

        # Apply filters
        if filters.query:
            query = query.filter(
                Restaurant.name.ilike(f"%{filters.query}%")
                | Restaurant.short_description.ilike(f"%{filters.query}%")
            )

        if filters.city:
            query = query.filter(Restaurant.city.ilike(f"%{filters.city}%"))

        if filters.state:
            query = query.filter(Restaurant.state.ilike(f"%{filters.state}%"))

        if filters.kosher_type:
            query = query.filter(
                Restaurant.kosher_category.ilike(f"%{filters.kosher_type}%")
            )

        if filters.certifying_agency:
            query = query.filter(
                Restaurant.certifying_agency.ilike(f"%{filters.certifying_agency}%")
            )

        if filters.listing_type:
            query = query.filter(
                Restaurant.listing_type.ilike(f"%{filters.listing_type}%")
            )

        if filters.price_range:
            query = query.filter(Restaurant.price_range == filters.price_range)

        if filters.is_cholov_yisroel is not None:
            query = query.filter(
                Restaurant.is_cholov_yisroel == filters.is_cholov_yisroel
            )

        if filters.is_pas_yisroel is not None:
            query = query.filter(Restaurant.is_pas_yisroel == filters.is_pas_yisroel)

        if filters.cholov_stam is not None:
            query = query.filter(Restaurant.cholov_stam == filters.cholov_stam)

        return query

    def _add_relevance_scoring(self, query, search_query: Optional[str]):
        """Add relevance scoring to query."""
        if not search_query:
            return query

        # Add relevance scoring using PostgreSQL full-text search
        scored_query = query.add_columns(
            func.ts_rank(
                func.to_tsvector(
                    "english",
                    Restaurant.name
                    + " "
                    + func.coalesce(Restaurant.short_description, ""),
                ),
                func.plainto_tsquery("english", search_query),
            ).label("relevance_score")
        )

        return scored_query

    def _calculate_distance(
        self, lat1: float, lng1: float, lat2: float, lng2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula."""
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])

        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        # Earth's radius in miles
        r = 3956

        return c * r

    def _get_suggestions(self, query: Optional[str], limit: int = 10) -> List[str]:
        """Get search suggestions based on query."""
        if not query or len(query) < 2:
            return []

        # Get restaurant names that start with the query
        suggestions = (
            self.session.query(Restaurant.name)
            .filter(Restaurant.name.ilike(f"{query}%"))
            .limit(limit)
            .all()
        )

        return [suggestion[0] for suggestion in suggestions]

    @handle_database_operation
    def get_search_statistics(self) -> Dict[str, Any]:
        """Get search statistics and metrics."""

        total_restaurants = self.session.query(Restaurant).count()

        # Get counts by various criteria
        stats = {
            "total_restaurants": total_restaurants,
            "by_state": {},
            "by_kosher_category": {},
            "by_certifying_agency": {},
            "by_listing_type": {},
        }

        # Count by state
        state_counts = (
            self.session.query(Restaurant.state, func.count(Restaurant.id))
            .group_by(Restaurant.state)
            .all()
        )
        stats["by_state"] = {state: count for state, count in state_counts if state}

        # Count by kosher category
        category_counts = (
            self.session.query(Restaurant.kosher_category, func.count(Restaurant.id))
            .group_by(Restaurant.kosher_category)
            .all()
        )
        stats["by_kosher_category"] = {
            category: count for category, count in category_counts if category
        }

        # Count by certifying agency
        agency_counts = (
            self.session.query(Restaurant.certifying_agency, func.count(Restaurant.id))
            .group_by(Restaurant.certifying_agency)
            .all()
        )
        stats["by_certifying_agency"] = {
            agency: count for agency, count in agency_counts if agency
        }

        # Count by listing type
        type_counts = (
            self.session.query(Restaurant.listing_type, func.count(Restaurant.id))
            .group_by(Restaurant.listing_type)
            .all()
        )
        stats["by_listing_type"] = {
            listing_type: count for listing_type, count in type_counts if listing_type
        }

        return stats

    def _generate_search_cache_key(
        self, search_type: SearchType, filters: SearchFilters
    ) -> str:
        """Generate a unique cache key for search results.

        Args:
            search_type: Type of search
            filters: Search filters

        Returns:
            Unique cache key string
        """
        # Create a dictionary of all parameters
        key_data = {"search_type": search_type.value, "filters": filters.to_dict()}

        # Convert to JSON string and hash
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()

        return f"unified_search:{key_hash}"


# Factory function for creating search service
def create_search_service(db_session: Session) -> UnifiedSearchService:
    """Create a new unified search service instance."""
    return UnifiedSearchService(db_session)
