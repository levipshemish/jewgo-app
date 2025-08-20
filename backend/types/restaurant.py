from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

#!/usr/bin/env python3
"""Restaurant Type Definitions for JewGo Backend.
============================================

Unified type definitions for restaurant data structures to ensure
consistency between frontend and backend.

Author: JewGo Development Team
Version: 1.0
"""


class KosherCategory(str, Enum):
    """Kosher category enumeration."""

    MEAT = "meat"
    DAIRY = "dairy"
    PAREVE = "pareve"


class RestaurantStatus(str, Enum):
    """Restaurant status enumeration."""

    OPEN = "open"
    CLOSED = "closed"
    UNKNOWN = "unknown"


class SpecialType(str, Enum):
    """Special type enumeration."""

    DISCOUNT = "discount"
    PROMOTION = "promotion"
    EVENT = "event"


@dataclass
class RestaurantSpecial:
    """Restaurant special offer data structure."""

    id: int
    restaurant_id: int
    title: str
    description: str | None = None
    discount_percent: float | None = None
    discount_amount: float | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_paid: bool = False
    payment_status: str = "pending"
    special_type: SpecialType = SpecialType.DISCOUNT
    priority: int = 1
    is_active: bool = True
    created_date: str | None = None
    updated_date: str | None = None


@dataclass
class MenuPricing:
    """Menu pricing data structure."""

    min: float
    max: float
    avg: float


@dataclass
class HoursData:
    """Hours of operation data structure."""

    day: str
    open_time: str | None = None
    close_time: str | None = None
    is_closed: bool = False
    is_24_hours: bool = False


@dataclass
class Restaurant:
    """Unified restaurant data structure."""

    # Core identification
    id: int
    name: str

    # Location information
    address: str
    city: str
    state: str
    zip_code: str
    latitude: float | None = None
    longitude: float | None = None

    # Contact information
    phone_number: str
    website: str | None = None
    google_listing_url: str | None = None

    # Kosher certification
    kosher_category: KosherCategory
    certifying_agency: str = "ORB"
    is_cholov_yisroel: bool | None = None
    is_pas_yisroel: bool | None = None

    # Business details
    listing_type: str
    short_description: str | None = None
    price_range: str | None = None
    min_avg_meal_cost: float | None = None
    max_avg_meal_cost: float | None = None

    # Hours and status
    hours_of_operation: str | None = None
    hours_json: str | None = None
    hours_last_updated: str | None = None
    timezone: str | None = None
    current_time_local: str | None = None
    hours_parsed: bool = False

    # Status information
    status: RestaurantStatus = RestaurantStatus.UNKNOWN
    is_open: bool | None = None
    status_reason: str | None = None
    next_open_time: str | None = None

    # Media
    image_url: str | None = None

    # Specials and offers
    specials: list[RestaurantSpecial] = None

    # Ratings and reviews
    rating: float | None = None
    star_rating: float | None = None
    quality_rating: float | None = None
    review_count: int | None = None
    google_rating: float | None = None
    google_review_count: int | None = None
    google_reviews: str | None = None

    # Timestamps
    created_at: str | None = None
    updated_at: str | None = None

    # Additional notes
    notes: str | None = None

    def __post_init__(self):
        """Post-initialization processing."""
        if self.specials is None:
            self.specials = []

        # Ensure kosher_category is an enum
        if isinstance(self.kosher_category, str):
            self.kosher_category = KosherCategory(self.kosher_category)

        # Ensure status is an enum
        if isinstance(self.status, str):
            self.status = RestaurantStatus(self.status)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary format for API responses."""
        data = asdict(self)

        # Convert enums to strings for JSON serialization
        data["kosher_category"] = self.kosher_category.value
        data["status"] = self.status.value

        # Convert specials to dictionaries
        if self.specials:
            data["specials"] = [
                special.to_dict() if hasattr(special, "to_dict") else asdict(special)
                for special in self.specials
            ]

        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Restaurant":
        """Create Restaurant instance from dictionary."""
        # Handle specials conversion
        if data.get("specials"):
            data["specials"] = [
                RestaurantSpecial(**special) if isinstance(special, dict) else special
                for special in data["specials"]
            ]

        return cls(**data)

    def get_rating(self) -> float | None:
        """Get the best available rating."""
        return self.rating or self.star_rating or self.google_rating

    def get_price_range(self) -> str:
        """Get formatted price range."""
        if self.price_range:
            return self.price_range

        if self.min_avg_meal_cost and self.max_avg_meal_cost:
            return f"${self.min_avg_meal_cost} - ${self.max_avg_meal_cost}"

        return "Price not available"

    def is_kosher_certified(self) -> bool:
        """Check if restaurant has kosher certification."""
        return bool(self.certifying_agency and self.certifying_agency != "None")

    def get_kosher_details(self) -> dict[str, Any]:
        """Get kosher certification details."""
        details = {
            "category": self.kosher_category.value,
            "agency": self.certifying_agency,
            "is_certified": self.is_kosher_certified(),
        }

        if (
            self.kosher_category == KosherCategory.DAIRY
            and self.is_cholov_yisroel is not None
        ):
            details["is_cholov_yisroel"] = self.is_cholov_yisroel

        if (
            self.kosher_category in [KosherCategory.MEAT, KosherCategory.PAREVE]
            and self.is_pas_yisroel is not None
        ):
            details["is_pas_yisroel"] = self.is_pas_yisroel

        return details


# Type aliases for convenience
RestaurantDict = dict[str, Any]
RestaurantList = list[Restaurant]
RestaurantDictList = list[RestaurantDict]

# Validation schemas
RESTAURANT_REQUIRED_FIELDS = [
    "name",
    "address",
    "city",
    "state",
    "zip_code",
    "phone_number",
    "kosher_category",
    "listing_type",
]

KOSHER_CATEGORIES = [cat.value for cat in KosherCategory]
RESTAURANT_STATUSES = [status.value for status in RestaurantStatus]
