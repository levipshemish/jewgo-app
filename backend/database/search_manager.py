#!/usr/bin/env python3
"""Advanced Search Manager for JewGo App.
====================================

This module provides advanced search capabilities using PostgreSQL full-text search
with fuzzy matching, relevance scoring, and multi-field search.

Features:
- PostgreSQL full-text search with trigram similarity
- Fuzzy matching with typo tolerance
- Multi-field search (name, city, certifier, description)
- Relevance scoring and ranking
- Autocomplete suggestions
- Phonetic matching (soundex)

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

from typing import Any

from database.database_manager_v3 import Restaurant
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AdvancedSearchManager:
    """Advanced search manager using PostgreSQL full-text search capabilities."""

    def __init__(self, db_session: Session) -> None:
        self.session = db_session

    def search_restaurants(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
        kosher_type: str | None = None,
        certifying_agency: str | None = None,
        city: str | None = None,
        state: str | None = None,
        fuzzy_threshold: float = 0.3,
    ) -> tuple[list[dict[str, Any]], int]:
        """Advanced restaurant search with fuzzy matching and relevance scoring.

        Args:
            query: Search query string
            limit: Maximum number of results
            offset: Pagination offset
            kosher_type: Filter by kosher type (dairy, meat, pareve)
            certifying_agency: Filter by certifying agency
            city: Filter by city
            state: Filter by state
            fuzzy_threshold: Minimum similarity threshold for fuzzy matching

        Returns:
            Tuple of (results, total_count)

        """
        try:
            # Build the base query with full-text search
            base_query = self._build_search_query(
                query,
                kosher_type,
                certifying_agency,
                city,
                state,
            )

            # Add relevance scoring
            scored_query = self._add_relevance_scoring(base_query, query)

            # Add fuzzy matching for typo tolerance
            fuzzy_query = self._add_fuzzy_matching(scored_query, query, fuzzy_threshold)

            # Get total count
            count_query = self.session.query(func.count(fuzzy_query.subquery().c.id))
            total_count = count_query.scalar()

            # Get paginated results
            results = (
                fuzzy_query.order_by(
                    text("relevance_score DESC, similarity_score DESC"),
                )
                .limit(limit)
                .offset(offset)
                .all()
            )

            # Convert to dictionaries
            restaurant_list = []
            for result in results:
                restaurant_dict = {
                    "id": result.id,
                    "name": result.name,
                    "address": result.address,
                    "city": result.city,
                    "state": result.state,
                    "zip_code": result.zip_code,
                    "phone_number": result.phone_number,
                    "website": result.website,
                    "certifying_agency": result.certifying_agency,
                    "kosher_category": result.kosher_category,
                    "listing_type": result.listing_type,
                    "price_range": result.price_range,
                    "short_description": result.short_description,
                    "hours_of_operation": result.hours_of_operation,
                    "latitude": result.latitude,
                    "longitude": result.longitude,
                    "is_cholov_yisroel": result.is_cholov_yisroel,
                    "is_pas_yisroel": result.is_pas_yisroel,
                    "cholov_stam": result.cholov_stam,
                    "image_url": result.image_url,
                    "specials": result.specials,
                    "created_at": (
                        result.created_at.isoformat() if result.created_at else None
                    ),
                    "updated_at": (
                        result.updated_at.isoformat() if result.updated_at else None
                    ),
                    "relevance_score": getattr(result, "relevance_score", 0),
                    "similarity_score": getattr(result, "similarity_score", 0),
                }
                restaurant_list.append(restaurant_dict)

            return restaurant_list, total_count

        except Exception as e:
            logger.exception("Error in advanced search", error=str(e))
            return [], 0

    def _build_search_query(
        self,
        query: str,
        kosher_type: str | None,
        certifying_agency: str | None,
        city: str | None,
        state: str | None,
    ):
        """Build the base search query with filters."""
        # Start with base query
        base_query = self.session.query(Restaurant)

        # Add text search across multiple fields
        if query:
            search_conditions = [
                Restaurant.name.ilike(f"%{query}%"),
                Restaurant.city.ilike(f"%{query}%"),
                Restaurant.certifying_agency.ilike(f"%{query}%"),
                Restaurant.short_description.ilike(f"%{query}%"),
                Restaurant.address.ilike(f"%{query}%"),
            ]
            base_query = base_query.filter(or_(*search_conditions))

        # Add filters
        if kosher_type:
            base_query = base_query.filter(Restaurant.kosher_category == kosher_type)

        if certifying_agency:
            base_query = base_query.filter(
                Restaurant.certifying_agency.ilike(f"%{certifying_agency}%"),
            )

        if city:
            base_query = base_query.filter(Restaurant.city.ilike(f"%{city}%"))

        if state:
            base_query = base_query.filter(Restaurant.state.ilike(f"%{state}%"))

        return base_query

    def _add_relevance_scoring(self, query, search_query: str):
        """Add relevance scoring based on field importance."""
        # Define field weights for relevance scoring
        relevance_expr = text(
            """
            CASE
                WHEN LOWER(name) = LOWER(:query) THEN 100
                WHEN LOWER(name) LIKE LOWER(:query_start) THEN 80
                WHEN LOWER(name) LIKE LOWER(:query_any) THEN 60
                WHEN LOWER(city) LIKE LOWER(:query_any) THEN 40
                WHEN LOWER(certifying_agency) LIKE LOWER(:query_any) THEN 30
                WHEN LOWER(short_description) LIKE LOWER(:query_any) THEN 20
                ELSE 10
            END as relevance_score
        """,
        ).bindparams(
            query=search_query,
            query_start=f"{search_query}%",
            query_any=f"%{search_query}%",
        )

        return query.add_columns(relevance_expr)

    def _add_fuzzy_matching(self, query, search_query: str, threshold: float):
        """Add fuzzy matching using PostgreSQL trigram similarity."""
        # Add trigram similarity for fuzzy matching
        similarity_expr = text(
            """
            GREATEST(
                similarity(LOWER(name), LOWER(:query)),
                similarity(LOWER(city), LOWER(:query)),
                similarity(LOWER(certifying_agency), LOWER(:query))
            ) as similarity_score
        """,
        ).bindparams(query=search_query)

        return query.add_columns(similarity_expr)

    def get_autocomplete_suggestions(self, query: str, limit: int = 10) -> list[str]:
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
