from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Abstract Base Search Interface.
==============================

This module defines the abstract base class for all search providers in the JewGo app.
All search implementations must inherit from this base class and implement the required methods.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


@dataclass
class SearchResult:
    """Represents a single search result."""

    id: int
    name: str
    relevance_score: float
    search_type: str
    metadata: Dict[str, Any]
    created_at: datetime


@dataclass
class SearchFilters:
    """Search filters for refining results."""

    kosher_category: Optional[str] = None
    certifying_agency: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    price_range: Optional[str] = None
    is_cholov_yisroel: Optional[bool] = None
    is_pas_yisroel: Optional[bool] = None
    min_rating: Optional[float] = None
    max_distance: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BaseSearchProvider(ABC):
    """Abstract base class for all search providers."""

    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        """Initialize the search provider.

        Args:
            name: Name of the search provider
            config: Configuration dictionary
        """
        self.name = name
        self.config = config or {}
        self.logger = logger.bind(provider=name)

    @abstractmethod
    async def search(
        self,
        query: str,
        filters: Optional[SearchFilters] = None,
        limit: int = 20,
        offset: int = 0,
        **kwargs,
    ) -> List[SearchResult]:
        """Execute search and return results.

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

    @abstractmethod
    async def get_suggestions(self, query: str, limit: int = 10) -> List[str]:
        """Get search suggestions for autocomplete.

        Args:
            query: Partial query string
            limit: Maximum number of suggestions

        Returns:
            List of suggestion strings
        """

    @abstractmethod
    def get_search_type(self) -> str:
        """Return the type of search this provider implements.

        Returns:
            Search type string (e.g., 'postgresql', 'fuzzy')
        """

    @abstractmethod
    async def is_healthy(self) -> bool:
        """Check if the search provider is healthy and available.

        Returns:
            True if healthy, False otherwise
        """

    async def preprocess_query(self, query: str) -> str:
        """Preprocess the search query.

        Args:
            query: Raw query string

        Returns:
            Preprocessed query string
        """
        # Default implementation - can be overridden
        return query.strip().lower()

    def apply_filters(
        self, base_query: Any, filters: Optional[SearchFilters] = None
    ) -> Any:
        """Apply search filters to the base query.

        Args:
            base_query: Base query object
            filters: Search filters to apply

        Returns:
            Filtered query object
        """
        # Default implementation - can be overridden
        return base_query

    async def get_search_stats(self) -> Dict[str, Any]:
        """Get search provider statistics.

        Returns:
            Dictionary containing search statistics
        """
        return {
            "provider_name": self.name,
            "search_type": self.get_search_type(),
            "is_healthy": await self.is_healthy(),
            "config": self.config,
        }

    def __str__(self) -> str:
        return f"{self.__class__.__name__}(name='{self.name}', type='{self.get_search_type()}')"

    def __repr__(self) -> str:
        return self.__str__()


class SearchError(Exception):
    """Base exception for search-related errors."""

    def __init__(self, message: str, provider: str = None, query: str = None):
        self.message = message
        self.provider = provider
        self.query = query
        super().__init__(self.message)

    def __str__(self) -> str:
        parts = [self.message]
        if self.provider:
            parts.append(f"Provider: {self.provider}")
        if self.query:
            parts.append(f"Query: {self.query}")
        return " | ".join(parts)


class SearchTimeoutError(SearchError):
    """Raised when search operation times out."""



class SearchConfigurationError(SearchError):
    """Raised when search configuration is invalid."""



class SearchProviderUnavailableError(SearchError):
    """Raised when search provider is unavailable."""

