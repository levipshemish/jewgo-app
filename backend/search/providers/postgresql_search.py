# !/usr/bin/env python3
"""PostgreSQL Search Provider for JewGo App.
========================================
This module provides PostgreSQL-based search capabilities using ILIKE queries
and relevance scoring.
Features:
- PostgreSQL ILIKE-based search
- Multi-field search (name, city, certifier, description)
- Relevance scoring and ranking
- Autocomplete suggestions
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from database.database_manager_v3 import Restaurant
from sqlalchemy import or_, text
from sqlalchemy.orm import Session
from utils.logging_config import get_logger
from ..core.base_search import BaseSearchProvider, SearchError
from ..core.search_types import (
    SearchFilters,
    SearchResult,
    SearchType,
)

logger = get_logger(__name__)


class PostgreSQLSearchProvider(BaseSearchProvider):
    """PostgreSQL search provider using full-text search and trigram similarity."""

    def __init__(
        self, db_session: Session, config: Optional[Dict[str, Any]] = None
    ) -> None:
        """Initialize PostgreSQL search provider.
        Args:
            db_session: Database session
            config: Provider configuration
        """
        super().__init__("postgresql_search", config)
        self.session = db_session

    async def search(
        self,
        query: str,
        filters: Optional[SearchFilters] = None,
        limit: int = 20,
        offset: int = 0,
        **kwargs,
    ) -> List[SearchResult]:
        """Execute PostgreSQL search and return results.
        Args:
            query: Search query string
            filters: Optional search filters
            limit: Maximum number of results to return
            offset: Number of results to skip
            **kwargs: Additional search parameters
        Returns:
            List of search results
        Raises:
            SearchError: If search fails
        """
        try:
            # Preprocess query
            processed_query = await self.preprocess_query(query)
            # Use simple SQL query for now
            sql_query = text(
                """
                SELECT
                    id,
                    name,
                    address,
                    city,
                    state,
                    zip_code,
                    phone_number,
                    website,
                    kosher_category,
                    certifying_agency,
                    is_cholov_yisroel,
                    is_pas_yisroel,
                    latitude,
                    longitude,
                    rating,
                    price_range,
                    image_url,
                    CASE
                        WHEN LOWER(name) = LOWER(:query) THEN 100
                        WHEN LOWER(name) LIKE LOWER(:query_start) THEN 80
                        WHEN LOWER(name) LIKE LOWER(:query_any) THEN 60
                        WHEN LOWER(city) LIKE LOWER(:query_any) THEN 40
                        WHEN LOWER(certifying_agency) LIKE LOWER(:query_any) THEN 30
                        ELSE 10
                    END as relevance_score
                FROM restaurants
                WHERE name ILIKE :query_any
                   OR city ILIKE :query_any
                   OR certifying_agency ILIKE :query_any
                   OR short_description ILIKE :query_any
                ORDER BY relevance_score DESC
                LIMIT :limit OFFSET :offset
            """
            )
            # Execute query
            result = self.session.execute(
                sql_query,
                {
                    "query": processed_query,
                    "query_start": f"{processed_query}%",
                    "query_any": f"%{processed_query}%",
                    "limit": limit,
                    "offset": offset,
                },
            )
            rows = result.fetchall()
            # Convert to SearchResult objects
            search_results = []
            for row in rows:
                search_result = self._convert_to_search_result(row, processed_query)
                search_results.append(search_result)
            return search_results
        except Exception as e:
            self.logger.error("PostgreSQL search failed", error=str(e), query=query)
            raise SearchError(f"PostgreSQL search failed: {str(e)}", self.name, query)

    # Unused methods removed - search now uses direct SQL queries
    async def get_suggestions(self, query: str, limit: int = 10) -> List[str]:
        """Get search suggestions for autocomplete.
        Args:
            query: Partial query string
            limit: Maximum number of suggestions
        Returns:
            List of suggestion strings
        """
        try:
            processed_query = await self.preprocess_query(query)
            # Get restaurant name suggestions
            name_suggestions = self._get_name_suggestions(processed_query, limit // 2)
            # Get city suggestions
            city_suggestions = self._get_city_suggestions(processed_query, limit // 2)
            # Combine and return suggestions
            suggestions = name_suggestions + city_suggestions
            return suggestions[:limit]
        except Exception as e:
            self.logger.error("Failed to get suggestions", error=str(e), query=query)
            return []

    def get_search_type(self) -> str:
        """Return the type of search this provider implements."""
        return SearchType.POSTGRESQL.value

    async def is_healthy(self) -> bool:
        """Check if the search provider is healthy and available."""
        try:
            # Simple health check query
            result = self.session.execute(text("SELECT 1")).fetchone()
            return result is not None
        except Exception as e:
            self.logger.error("PostgreSQL search health check failed", error=str(e))
            return False

    def _get_name_suggestions(self, query: str, limit: int) -> List[str]:
        """Get restaurant name suggestions."""
        suggestions = (
            self.session.query(Restaurant.name)
            .filter(Restaurant.name.ilike(f"%{query}%"))
            .distinct()
            .limit(limit)
            .all()
        )
        return [suggestion[0] for suggestion in suggestions]

    def _get_city_suggestions(self, query: str, limit: int) -> List[str]:
        """Get city suggestions."""
        suggestions = (
            self.session.query(Restaurant.city)
            .filter(Restaurant.city.ilike(f"%{query}%"))
            .distinct()
            .limit(limit)
            .all()
        )
        return [suggestion[0] for suggestion in suggestions]

    def _convert_to_search_result(self, row: Any, query: str) -> SearchResult:
        """Convert database row to SearchResult object."""
        # Extract relevance score if available
        relevance_score = getattr(row, "relevance_score", 0.0)
        similarity_score = getattr(row, "similarity_score", None)
        # Extract metadata
        metadata = {
            "similarity_score": similarity_score,
            "query": query,
            "search_provider": self.name,
        }
        return SearchResult(
            id=row.id,
            name=row.name,
            address=row.address,
            city=row.city,
            state=row.state,
            zip_code=getattr(row, "zip_code", None),
            phone_number=getattr(row, "phone_number", None),
            website=getattr(row, "website", None),
            kosher_category=getattr(row, "kosher_category", None),
            certifying_agency=getattr(row, "certifying_agency", None),
            is_cholov_yisroel=getattr(row, "is_cholov_yisroel", None),
            is_pas_yisroel=getattr(row, "is_pas_yisroel", None),
            latitude=getattr(row, "latitude", None),
            longitude=getattr(row, "longitude", None),
            rating=getattr(row, "rating", None),
            price_range=getattr(row, "price_range", None),
            relevance_score=relevance_score,
            search_type=SearchType.POSTGRESQL,
            metadata=metadata,
            created_at=datetime.utcnow(),
        )

    def get_autocomplete_suggestions(
        self,
        query: str,
        limit: int = 10,
    ) -> list[str]:
        """Get autocomplete suggestions for search queries.
        Args:
            query: Partial search query
            limit: Maximum number of suggestions
        Returns:
            List of suggestion strings
        """
        try:
            # Get suggestions from restaurant names
            name_suggestions = (
                self.session.query(Restaurant.name)
                .filter(Restaurant.name.ilike(f"{query}%"))
                .distinct()
                .limit(limit // 2)
                .all()
            )
            # Get suggestions from cities
            city_suggestions = (
                self.session.query(Restaurant.city)
                .filter(Restaurant.city.ilike(f"{query}%"))
                .distinct()
                .limit(limit // 2)
                .all()
            )
            # Get suggestions from certifying agencies
            agency_suggestions = (
                self.session.query(Restaurant.certifying_agency)
                .filter(Restaurant.certifying_agency.ilike(f"{query}%"))
                .distinct()
                .limit(limit // 4)
                .all()
            )
            # Combine and deduplicate suggestions
            suggestions = set()
            for suggestion_list in [
                name_suggestions,
                city_suggestions,
                agency_suggestions,
            ]:
                for suggestion in suggestion_list:
                    suggestions.add(suggestion[0])
            return sorted(suggestions)[:limit]
        except Exception as e:
            logger.exception("Error getting autocomplete suggestions", error=str(e))
            return []

    def get_search_suggestions(
        self,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Get search suggestions with additional context.
        Args:
            query: Search query
            limit: Maximum number of suggestions
        Returns:
            List of suggestion objects with context
        """
        try:
            # Get restaurants that match the query
            matching_restaurants = (
                self.session.query(
                    Restaurant.name,
                    Restaurant.city,
                    Restaurant.certifying_agency,
                    Restaurant.kosher_category,
                )
                .filter(
                    or_(
                        Restaurant.name.ilike(f"%{query}%"),
                        Restaurant.city.ilike(f"%{query}%"),
                        Restaurant.certifying_agency.ilike(f"%{query}%"),
                    ),
                )
                .limit(limit)
                .all()
            )
            suggestions = []
            for restaurant in matching_restaurants:
                suggestion = {
                    "text": restaurant.name,
                    "type": "restaurant",
                    "context": f"{restaurant.city}, {restaurant.certifying_agency}",
                    "kosher_type": restaurant.kosher_category,
                }
                suggestions.append(suggestion)
            return suggestions
        except Exception as e:
            logger.exception("Error getting search suggestions", error=str(e))
            return []
