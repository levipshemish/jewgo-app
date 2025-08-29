"""
Marketplace Configuration
This module centralizes marketplace-related configuration including categories,
subcategories, and other marketplace settings to replace hardcoded values.
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class MarketplaceCategoryType(Enum):
    """Marketplace category types."""

    BAKED_GOODS = "baked-goods"
    ACCESSORIES = "accessories"
    VEHICLES = "vehicles"
    APPLIANCES = "appliances"
    BOOKS = "books"
    ELECTRONICS = "electronics"
    FURNITURE = "furniture"
    CLOTHING = "clothing"
    TOYS = "toys"
    OTHER = "other"


@dataclass
class MarketplaceSubcategory:
    """Marketplace subcategory configuration."""

    id: int
    name: str
    slug: str
    sort_order: int
    active: bool = True
    description: str = ""


@dataclass
class MarketplaceCategory:
    """Marketplace category configuration."""

    id: int
    name: str
    slug: str
    sort_order: int
    active: bool = True
    description: str = ""
    subcategories: List[MarketplaceSubcategory] = None

    def __post_init__(self):
        if self.subcategories is None:
            self.subcategories = []


class MarketplaceConfig:
    """Centralized marketplace configuration."""

    # Default categories with subcategories
    DEFAULT_CATEGORIES = [
        MarketplaceCategory(
            id=1,
            name="Baked Goods",
            slug="baked-goods",
            sort_order=1,
            description="Fresh baked goods and pastries",
            subcategories=[
                MarketplaceSubcategory(1, "Bread", "bread", 1),
                MarketplaceSubcategory(2, "Pastries", "pastries", 2),
                MarketplaceSubcategory(3, "Cakes", "cakes", 3),
                MarketplaceSubcategory(4, "Cookies", "cookies", 4),
            ],
        ),
        MarketplaceCategory(
            id=2,
            name="Accessories",
            slug="accessories",
            sort_order=2,
            description="Jewelry and personal accessories",
            subcategories=[
                MarketplaceSubcategory(5, "Jewelry", "jewelry", 1),
                MarketplaceSubcategory(6, "Clothing", "clothing", 2),
                MarketplaceSubcategory(7, "Bags", "bags", 3),
                MarketplaceSubcategory(8, "Watches", "watches", 4),
            ],
        ),
        MarketplaceCategory(
            id=3,
            name="Vehicles",
            slug="vehicles",
            sort_order=3,
            description="Cars, motorcycles, and other vehicles",
            subcategories=[
                MarketplaceSubcategory(9, "Cars", "cars", 1),
                MarketplaceSubcategory(10, "Motorcycles", "motorcycles", 2),
                MarketplaceSubcategory(11, "Bicycles", "bicycles", 3),
                MarketplaceSubcategory(12, "Trucks", "trucks", 4),
            ],
        ),
        MarketplaceCategory(
            id=4,
            name="Appliances",
            slug="appliances",
            sort_order=4,
            description="Home and kitchen appliances",
            subcategories=[
                MarketplaceSubcategory(13, "Kitchen", "kitchen", 1),
                MarketplaceSubcategory(14, "Laundry", "laundry", 2),
                MarketplaceSubcategory(15, "Cleaning", "cleaning", 3),
                MarketplaceSubcategory(16, "Heating/Cooling", "heating-cooling", 4),
            ],
        ),
        MarketplaceCategory(
            id=5,
            name="Books",
            slug="books",
            sort_order=5,
            description="Books, magazines, and educational materials",
            subcategories=[
                MarketplaceSubcategory(17, "Fiction", "fiction", 1),
                MarketplaceSubcategory(18, "Non-Fiction", "non-fiction", 2),
                MarketplaceSubcategory(19, "Educational", "educational", 3),
                MarketplaceSubcategory(20, "Children's Books", "childrens-books", 4),
            ],
        ),
        MarketplaceCategory(
            id=6,
            name="Electronics",
            slug="electronics",
            sort_order=6,
            description="Computers, phones, and electronic devices",
            subcategories=[
                MarketplaceSubcategory(21, "Computers", "computers", 1),
                MarketplaceSubcategory(22, "Phones", "phones", 2),
                MarketplaceSubcategory(23, "Tablets", "tablets", 3),
                MarketplaceSubcategory(24, "Audio/Video", "audio-video", 4),
            ],
        ),
    ]

    @classmethod
    def get_categories(cls) -> List[Dict[str, Any]]:
        """Get all categories as dictionaries."""
        return [category.__dict__ for category in cls.DEFAULT_CATEGORIES]

    @classmethod
    def get_active_categories(cls) -> List[Dict[str, Any]]:
        """Get only active categories as dictionaries."""
        return [
            category.__dict__ for category in cls.DEFAULT_CATEGORIES if category.active
        ]

    @classmethod
    def get_category_by_id(cls, category_id: int) -> Dict[str, Any]:
        """Get a specific category by ID."""
        for category in cls.DEFAULT_CATEGORIES:
            if category.id == category_id:
                return category.__dict__
        return None

    @classmethod
    def get_category_by_slug(cls, slug: str) -> Dict[str, Any]:
        """Get a specific category by slug."""
        for category in cls.DEFAULT_CATEGORIES:
            if category.slug == slug:
                return category.__dict__
        return None

    @classmethod
    def get_subcategory_by_id(cls, subcategory_id: int) -> Dict[str, Any]:
        """Get a specific subcategory by ID."""
        for category in cls.DEFAULT_CATEGORIES:
            for subcategory in category.subcategories:
                if subcategory.id == subcategory_id:
                    return subcategory.__dict__
        return None

    @classmethod
    def get_subcategories_by_category_id(cls, category_id: int) -> List[Dict[str, Any]]:
        """Get all subcategories for a specific category."""
        category = cls.get_category_by_id(category_id)
        if category:
            return category.get("subcategories", [])
        return []


# Configuration constants
MARKETPLACE_CONFIG = {
    "max_listings_per_user": 50,
    "max_images_per_listing": 10,
    "max_title_length": 100,
    "max_description_length": 2000,
    "default_page_size": 20,
    "max_page_size": 100,
    "listing_expiry_days": 90,
    "auto_approve_listings": False,
    "require_approval": True,
    "enable_endorsements": True,
    "enable_transactions": True,
    "enable_messaging": True,
    "categories": MarketplaceConfig.get_categories(),
}
