#!/usr/bin/env python3
"""Test suite for unified search service.

Tests the unified search service to ensure it provides consistent
search functionality across all search types.

Author: JewGo Development Team
Version: 1.0
"""

from datetime import datetime
from typing import Any, Dict, List
from unittest.mock import MagicMock, Mock, patch

import pytest
from utils.unified_search_service import (
    SearchFilters,
    SearchResponse,
    SearchResult,
    SearchType,
    UnifiedSearchService,
    create_search_service,
)


class TestSearchFilters:
    """Test SearchFilters dataclass."""

    def test_search_filters_creation(self):
        """Test creating SearchFilters with various parameters."""
        filters = SearchFilters(
            query="pizza",
            city="Miami",
            state="FL",
            kosher_type="dairy",
            limit=25,
            offset=10,
        )

        assert filters.query == "pizza"
        assert filters.city == "Miami"
        assert filters.state == "FL"
        assert filters.kosher_type == "dairy"
        assert filters.limit == 25
        assert filters.offset == 10
        assert filters.fuzzy_threshold == 0.3  # default value

    def test_search_filters_to_dict(self):
        """Test converting SearchFilters to dictionary."""
        filters = SearchFilters(query="pizza", city="Miami", kosher_type="dairy")

        filters_dict = filters.to_dict()
        expected = {
            "query": "pizza",
            "city": "Miami",
            "kosher_type": "dairy",
            "fuzzy_threshold": 0.3,
            "limit": 50,
            "offset": 0,
        }

        assert filters_dict == expected

    def test_search_filters_from_dict(self):
        """Test creating SearchFilters from dictionary."""
        data = {"query": "pizza", "city": "Miami", "kosher_type": "dairy", "limit": 25}

        filters = SearchFilters.from_dict(data)

        assert filters.query == "pizza"
        assert filters.city == "Miami"
        assert filters.kosher_type == "dairy"
        assert filters.limit == 25

    def test_search_filters_from_dict_ignores_invalid_keys(self):
        """Test that from_dict ignores invalid keys."""
        data = {"query": "pizza", "invalid_key": "value", "city": "Miami"}

        filters = SearchFilters.from_dict(data)

        assert filters.query == "pizza"
        assert filters.city == "Miami"
        assert not hasattr(filters, "invalid_key")


class TestSearchResult:
    """Test SearchResult dataclass."""

    def test_search_result_creation(self):
        """Test creating SearchResult with all fields."""
        result = SearchResult(
            id=1,
            name="Test Restaurant",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone_number="305-555-0123",
            website="https://test.com",
            certifying_agency="OU",
            kosher_category="dairy",
            listing_type="restaurant",
            price_range="$$",
            short_description="Great food",
            hours_of_operation={"mon": {"open": "9:00 AM", "close": "10:00 PM"}},
            latitude=25.7617,
            longitude=-80.1918,
            is_cholov_yisroel=True,
            is_pas_yisroel=False,
            cholov_stam=True,
            image_url="https://test.com/image.jpg",
            specials={"daily": "20% off"},
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-02T00:00:00",
            relevance_score=0.95,
            similarity_score=0.88,
            distance=2.5,
        )

        assert result.id == 1
        assert result.name == "Test Restaurant"
        assert result.relevance_score == 0.95
        assert result.similarity_score == 0.88
        assert result.distance == 2.5

    def test_search_result_from_restaurant(self):
        """Test creating SearchResult from restaurant object."""
        # Mock restaurant object
        restaurant = Mock()
        restaurant.id = 1
        restaurant.name = "Test Restaurant"
        restaurant.address = "123 Main St"
        restaurant.city = "Miami"
        restaurant.state = "FL"
        restaurant.zip_code = "33101"
        restaurant.phone_number = "305-555-0123"
        restaurant.website = "https://test.com"
        restaurant.certifying_agency = "OU"
        restaurant.kosher_category = "dairy"
        restaurant.listing_type = "restaurant"
        restaurant.price_range = "$$"
        restaurant.short_description = "Great food"
        restaurant.hours_of_operation = {
            "mon": {"open": "9:00 AM", "close": "10:00 PM"}
        }
        restaurant.latitude = 25.7617
        restaurant.longitude = -80.1918
        restaurant.is_cholov_yisroel = True
        restaurant.is_pas_yisroel = False
        restaurant.cholov_stam = True
        restaurant.image_url = "https://test.com/image.jpg"
        restaurant.specials = {"daily": "20% off"}
        restaurant.created_at = datetime(2024, 1, 1)
        restaurant.updated_at = datetime(2024, 1, 2)

        result = SearchResult.from_restaurant(
            restaurant, relevance_score=0.95, similarity_score=0.88
        )

        assert result.id == 1
        assert result.name == "Test Restaurant"
        assert result.relevance_score == 0.95
        assert result.similarity_score == 0.88
        assert result.created_at == "2024-01-01T00:00:00"
        assert result.updated_at == "2024-01-02T00:00:00"


class TestSearchResponse:
    """Test SearchResponse dataclass."""

    def test_search_response_creation(self):
        """Test creating SearchResponse with all fields."""
        results = [
            SearchResult(
                id=1,
                name="Restaurant 1",
                address="123 Main St",
                city="Miami",
                state="FL",
                zip_code="33101",
                phone_number=None,
                website=None,
                certifying_agency=None,
                kosher_category=None,
                listing_type=None,
                price_range=None,
                short_description=None,
                hours_of_operation=None,
                latitude=None,
                longitude=None,
                is_cholov_yisroel=None,
                is_pas_yisroel=None,
                cholov_stam=None,
                image_url=None,
                specials=None,
                created_at=None,
                updated_at=None,
            )
        ]

        filters = SearchFilters(query="pizza")
        response = SearchResponse(
            results=results,
            total_count=1,
            search_type=SearchType.ADVANCED,
            execution_time_ms=150,
            filters_applied=filters,
            suggestions=["pizza place", "pizza restaurant"],
            cache_hit=False,
            timestamp=datetime(2024, 1, 1, 12, 0, 0),
        )

        assert len(response.results) == 1
        assert response.total_count == 1
        assert response.search_type == SearchType.ADVANCED
        assert response.execution_time_ms == 150
        assert response.cache_hit is False
        assert len(response.suggestions) == 2

    def test_search_response_defaults(self):
        """Test SearchResponse with default values."""
        results = []
        filters = SearchFilters()
        response = SearchResponse(
            results=results,
            total_count=0,
            search_type=SearchType.BASIC,
            execution_time_ms=100,
            filters_applied=filters,
        )

        assert response.suggestions == []
        assert response.cache_hit is False
        assert response.timestamp is not None

    def test_search_response_to_dict(self):
        """Test converting SearchResponse to dictionary."""
        results = [
            SearchResult(
                id=1,
                name="Restaurant 1",
                address="123 Main St",
                city="Miami",
                state="FL",
                zip_code="33101",
                phone_number=None,
                website=None,
                certifying_agency=None,
                kosher_category=None,
                listing_type=None,
                price_range=None,
                short_description=None,
                hours_of_operation=None,
                latitude=None,
                longitude=None,
                is_cholov_yisroel=None,
                is_pas_yisroel=None,
                cholov_stam=None,
                image_url=None,
                specials=None,
                created_at=None,
                updated_at=None,
            )
        ]

        filters = SearchFilters(query="pizza")
        response = SearchResponse(
            results=results,
            total_count=1,
            search_type=SearchType.ADVANCED,
            execution_time_ms=150,
            filters_applied=filters,
            suggestions=["pizza place"],
        )

        response_dict = response.to_dict()

        assert response_dict["total_count"] == 1
        assert response_dict["search_type"] == "advanced"
        assert response_dict["execution_time_ms"] == 150
        assert response_dict["cache_hit"] is False
        assert len(response_dict["results"]) == 1
        assert len(response_dict["suggestions"]) == 1


class TestUnifiedSearchService:
    """Test UnifiedSearchService class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_session = Mock()
        self.search_service = UnifiedSearchService(self.mock_session)

    def test_search_service_initialization(self):
        """Test search service initialization."""
        assert self.search_service.session == self.mock_session
        assert self.search_service.config is not None

    def test_basic_search(self):
        """Test basic search functionality."""
        # Mock restaurant objects
        mock_restaurant1 = Mock()
        mock_restaurant1.id = 1
        mock_restaurant1.name = "Pizza Place"
        mock_restaurant1.address = "123 Main St"
        mock_restaurant1.city = "Miami"
        mock_restaurant1.state = "FL"
        mock_restaurant1.zip_code = "33101"
        mock_restaurant1.phone_number = None
        mock_restaurant1.website = None
        mock_restaurant1.certifying_agency = None
        mock_restaurant1.kosher_category = None
        mock_restaurant1.listing_type = None
        mock_restaurant1.price_range = None
        mock_restaurant1.short_description = None
        mock_restaurant1.hours_of_operation = None
        mock_restaurant1.latitude = None
        mock_restaurant1.longitude = None
        mock_restaurant1.is_cholov_yisroel = None
        mock_restaurant1.is_pas_yisroel = None
        mock_restaurant1.cholov_stam = None
        mock_restaurant1.image_url = None
        mock_restaurant1.specials = None
        mock_restaurant1.created_at = None
        mock_restaurant1.updated_at = None

        # Mock query chain
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.limit.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.all.return_value = [mock_restaurant1]

        self.mock_session.query.return_value = mock_query

        filters = SearchFilters(query="pizza", limit=10, offset=0)
        results, total_count = self.search_service._basic_search(filters)

        assert len(results) == 1
        assert total_count == 1
        assert results[0].name == "Pizza Place"

    def test_location_search_without_coordinates(self):
        """Test location search without coordinates raises error."""
        filters = SearchFilters(query="pizza")

        with pytest.raises(
            ValueError, match="Location search requires lat and lng coordinates"
        ):
            self.search_service._location_search(filters)

    def test_location_search_with_coordinates(self):
        """Test location search with coordinates."""
        # Mock restaurant objects
        mock_restaurant = Mock()
        mock_restaurant.id = 1
        mock_restaurant.name = "Pizza Place"
        mock_restaurant.address = "123 Main St"
        mock_restaurant.city = "Miami"
        mock_restaurant.state = "FL"
        mock_restaurant.zip_code = "33101"
        mock_restaurant.phone_number = None
        mock_restaurant.website = None
        mock_restaurant.certifying_agency = None
        mock_restaurant.kosher_category = None
        mock_restaurant.listing_type = None
        mock_restaurant.price_range = None
        mock_restaurant.short_description = None
        mock_restaurant.hours_of_operation = None
        mock_restaurant.latitude = 25.7617
        mock_restaurant.longitude = -80.1918
        mock_restaurant.is_cholov_yisroel = None
        mock_restaurant.is_pas_yisroel = None
        mock_restaurant.cholov_stam = None
        mock_restaurant.image_url = None
        mock_restaurant.specials = None
        mock_restaurant.created_at = None
        mock_restaurant.updated_at = None

        # Mock query chain
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [mock_restaurant]

        self.mock_session.query.return_value = mock_query

        filters = SearchFilters(query="pizza", lat=25.7617, lng=-80.1918, radius=10)

        results, total_count = self.search_service._location_search(filters)

        assert len(results) == 1
        assert total_count == 1
        assert results[0].distance is not None

    def test_get_suggestions(self):
        """Test getting search suggestions."""
        # Mock query results
        mock_suggestions = [("Pizza Place",), ("Pizza Restaurant",)]

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_suggestions

        self.mock_session.query.return_value = mock_query

        suggestions = self.search_service._get_suggestions("pizza", limit=5)

        assert len(suggestions) == 2
        assert "Pizza Place" in suggestions
        assert "Pizza Restaurant" in suggestions

    def test_get_suggestions_empty_query(self):
        """Test getting suggestions with empty query."""
        suggestions = self.search_service._get_suggestions("", limit=5)
        assert suggestions == []

        suggestions = self.search_service._get_suggestions(None, limit=5)
        assert suggestions == []

    def test_get_suggestions_short_query(self):
        """Test getting suggestions with short query."""
        suggestions = self.search_service._get_suggestions("p", limit=5)
        assert suggestions == []

    def test_calculate_distance(self):
        """Test distance calculation."""
        # Test distance between Miami and Orlando (approximately 200 miles)
        miami_lat, miami_lng = 25.7617, -80.1918
        orlando_lat, orlando_lng = 28.5383, -81.3792

        distance = self.search_service._calculate_distance(
            miami_lat, miami_lng, orlando_lat, orlando_lng
        )

        # Should be approximately 200 miles (allow some tolerance)
        assert 190 <= distance <= 210

    def test_calculate_distance_same_location(self):
        """Test distance calculation for same location."""
        lat, lng = 25.7617, -80.1918
        distance = self.search_service._calculate_distance(lat, lng, lat, lng)
        assert distance == 0.0

    @patch("utils.unified_search_service.func")
    def test_get_search_statistics(self, mock_func):
        """Test getting search statistics."""
        # Mock count results
        mock_count = Mock()
        mock_count.scalar.return_value = 100
        mock_func.count.return_value = mock_count

        # Mock group by results
        mock_state_counts = [("FL", 50), ("CA", 30), ("NY", 20)]
        mock_category_counts = [("dairy", 40), ("meat", 35), ("pareve", 25)]
        mock_agency_counts = [("OU", 60), ("Kof-K", 25), ("Star-K", 15)]
        mock_type_counts = [("restaurant", 70), ("bakery", 20), ("catering", 10)]

        mock_query = Mock()
        mock_query.group_by.return_value = mock_query
        mock_query.all.side_effect = [
            mock_state_counts,
            mock_category_counts,
            mock_agency_counts,
            mock_type_counts,
        ]

        self.mock_session.query.return_value = mock_query

        stats = self.search_service.get_search_statistics()

        assert stats["total_restaurants"] == 100
        assert stats["by_state"]["FL"] == 50
        assert stats["by_kosher_category"]["dairy"] == 40
        assert stats["by_certifying_agency"]["OU"] == 60
        assert stats["by_listing_type"]["restaurant"] == 70

    def test_search_restaurants_invalid_type(self):
        """Test search with invalid search type."""
        filters = SearchFilters(query="pizza")

        with pytest.raises(ValueError, match="Unsupported search type"):
            self.search_service.search_restaurants(
                search_type="invalid_type", filters=filters
            )

    @patch("utils.unified_search_service.time")
    def test_search_restaurants_basic(self, mock_time):
        """Test basic search through main interface."""
        mock_time.time.side_effect = [1000.0, 1000.15]  # 150ms execution time

        # Mock restaurant object
        mock_restaurant = Mock()
        mock_restaurant.id = 1
        mock_restaurant.name = "Pizza Place"
        mock_restaurant.address = "123 Main St"
        mock_restaurant.city = "Miami"
        mock_restaurant.state = "FL"
        mock_restaurant.zip_code = "33101"
        mock_restaurant.phone_number = None
        mock_restaurant.website = None
        mock_restaurant.certifying_agency = None
        mock_restaurant.kosher_category = None
        mock_restaurant.listing_type = None
        mock_restaurant.price_range = None
        mock_restaurant.short_description = None
        mock_restaurant.hours_of_operation = None
        mock_restaurant.latitude = None
        mock_restaurant.longitude = None
        mock_restaurant.is_cholov_yisroel = None
        mock_restaurant.is_pas_yisroel = None
        mock_restaurant.cholov_stam = None
        mock_restaurant.image_url = None
        mock_restaurant.specials = None
        mock_restaurant.created_at = None
        mock_restaurant.updated_at = None

        # Mock query chain
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.limit.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.all.return_value = [mock_restaurant]

        self.mock_session.query.return_value = mock_query

        response = self.search_service.search_restaurants(
            search_type=SearchType.BASIC, query="pizza"
        )

        assert response.search_type == SearchType.BASIC
        assert len(response.results) == 1
        assert response.total_count == 1
        assert response.execution_time_ms == 150
        assert response.filters_applied.query == "pizza"


class TestCreateSearchService:
    """Test factory function for creating search service."""

    def test_create_search_service(self):
        """Test creating search service with factory function."""
        mock_session = Mock()
        search_service = create_search_service(mock_session)

        assert isinstance(search_service, UnifiedSearchService)
        assert search_service.session == mock_session


class TestSearchType:
    """Test SearchType enumeration."""

    def test_search_type_values(self):
        """Test SearchType enum values."""
        assert SearchType.BASIC.value == "basic"
        assert SearchType.ADVANCED.value == "advanced"
        assert SearchType.LOCATION.value == "location"
        assert SearchType.FULL_TEXT.value == "full_text"
        assert SearchType.FUZZY.value == "fuzzy"

    def test_search_type_comparison(self):
        """Test SearchType comparison."""
        assert SearchType.BASIC == SearchType.BASIC
        assert SearchType.ADVANCED != SearchType.BASIC


if __name__ == "__main__":
    pytest.main([__file__])
