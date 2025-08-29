from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

#!/usr/bin/env python3
"""Search Types and Enums.
======================

This module defines the types, enums, and data structures used throughout the search system.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


class SearchType(Enum):
    """Types of search available in the system."""

    POSTGRESQL = "postgresql"
    FUZZY = "fuzzy"
    FULL_TEXT = "full_text"


class KosherCategory(Enum):
    """Kosher categories for restaurants."""

    MEAT = "meat"
    DAIRY = "dairy"
    PAREVE = "pareve"
    UNKNOWN = "unknown"


class CertifyingAgency(Enum):
    """Kosher certifying agencies."""

    ORB = "ORB"
    STAR_K = "Star-K"
    OU = "OU"
    CHABAD = "Chabad"
    KM = "KM"
    OTHER = "Other"


class PriceRange(Enum):
    """Price range categories."""

    BUDGET = "$"
    MODERATE = "$$"
    EXPENSIVE = "$$$"
    LUXURY = "$$$$"


@dataclass
class SearchMetadata:
    """Metadata for search operations."""

    query: str
    search_type: SearchType
    filters_applied: Dict[str, Any] = field(default_factory=dict)
    execution_time_ms: Optional[int] = None
    results_count: Optional[int] = None
    cache_hit: bool = False
    user_agent: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SearchSuggestion:
    """Represents a search suggestion for autocomplete."""

    text: str
    type: str  # 'restaurant', 'city', 'agency', etc.
    relevance_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchFilters:
    """Comprehensive search filters."""

    # Basic filters
    kosher_category: Optional[KosherCategory] = None
    certifying_agency: Optional[CertifyingAgency] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # Kosher-specific filters
    is_cholov_yisroel: Optional[bool] = None
    is_pas_yisroel: Optional[bool] = None
    is_glatt: Optional[bool] = None
    is_mehadrin: Optional[bool] = None

    # Location filters
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_distance: Optional[float] = None  # in miles

    # Rating and price filters
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    price_range: Optional[PriceRange] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    # Status filters
    is_open: Optional[bool] = None
    has_website: Optional[bool] = None
    has_phone: Optional[bool] = None

    # Search-specific filters
    fuzzy_threshold: Optional[float] = None
    similarity_threshold: Optional[float] = None
    include_inactive: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert filters to dictionary."""
        result = {}
        for field_name, value in self.__dict__.items():
            if value is not None:
                if isinstance(value, Enum):
                    result[field_name] = value.value
                else:
                    result[field_name] = value
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchFilters":
        """Create SearchFilters from dictionary."""
        # Convert enum values back to enums
        if "kosher_category" in data and data["kosher_category"]:
            data["kosher_category"] = KosherCategory(data["kosher_category"])

        if "certifying_agency" in data and data["certifying_agency"]:
            data["certifying_agency"] = CertifyingAgency(data["certifying_agency"])

        if "price_range" in data and data["price_range"]:
            data["price_range"] = PriceRange(data["price_range"])

        return cls(**data)


@dataclass
class SearchResult:
    """Enhanced search result with comprehensive data."""

    # Basic restaurant info
    id: int
    name: str
    address: str
    city: str
    state: str
    zip_code: Optional[str] = None

    # Contact info
    phone_number: Optional[str] = None
    website: Optional[str] = None

    # Kosher info
    kosher_category: Optional[KosherCategory] = None
    certifying_agency: Optional[CertifyingAgency] = None
    is_cholov_yisroel: Optional[bool] = None
    is_pas_yisroel: Optional[bool] = None

    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Ratings and pricing
    rating: Optional[float] = None
    price_range: Optional[PriceRange] = None

    # Search-specific fields
    relevance_score: float = 0.0
    search_type: SearchType = SearchType.POSTGRESQL
    similarity_score: Optional[float] = None
    # Semantic matches removed - vector search is no longer supported
    distance_miles: Optional[float] = None

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        result = self.__dict__.copy()

        # Convert enums to values
        if self.kosher_category:
            result["kosher_category"] = self.kosher_category.value
        if self.certifying_agency:
            result["certifying_agency"] = self.certifying_agency.value
        if self.price_range:
            result["price_range"] = self.price_range.value
        if self.search_type:
            result["search_type"] = self.search_type.value

        # Convert datetime to ISO string
        if self.created_at:
            result["created_at"] = self.created_at.isoformat()

        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchResult":
        """Create SearchResult from dictionary."""
        # Convert enum values back to enums
        if "kosher_category" in data and data["kosher_category"]:
            data["kosher_category"] = KosherCategory(data["kosher_category"])
        if "certifying_agency" in data and data["certifying_agency"]:
            data["certifying_agency"] = CertifyingAgency(data["certifying_agency"])
        if "price_range" in data and data["price_range"]:
            data["price_range"] = PriceRange(data["price_range"])
        if "search_type" in data and data["search_type"]:
            data["search_type"] = SearchType(data["search_type"])

        # Convert ISO string back to datetime
        if "created_at" in data and data["created_at"]:
            if isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])

        return cls(**data)


@dataclass
class SearchResponse:
    """Complete search response with results and metadata."""

    results: List[SearchResult]
    total_count: int
    search_metadata: SearchMetadata
    suggestions: List[SearchSuggestion] = field(default_factory=list)
    filters_applied: SearchFilters = field(default_factory=SearchFilters)

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary."""
        return {
            "results": [result.to_dict() for result in self.results],
            "total_count": self.total_count,
            "search_metadata": {
                "query": self.search_metadata.query,
                "search_type": self.search_metadata.search_type.value,
                "execution_time_ms": self.search_metadata.execution_time_ms,
                "results_count": self.search_metadata.results_count,
                "cache_hit": self.search_metadata.cache_hit,
                "timestamp": self.search_metadata.timestamp.isoformat(),
            },
            "suggestions": [
                {
                    "text": suggestion.text,
                    "type": suggestion.type,
                    "relevance_score": suggestion.relevance_score,
                }
                for suggestion in self.suggestions
            ],
            "filters_applied": self.filters_applied.to_dict(),
        }


@dataclass
class SearchStats:
    """Search performance and usage statistics."""

    total_searches: int = 0
    successful_searches: int = 0
    failed_searches: int = 0
    average_response_time_ms: float = 0.0
    cache_hit_rate: float = 0.0
    popular_queries: List[Dict[str, Any]] = field(default_factory=list)
    search_type_distribution: Dict[str, int] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.utcnow)
