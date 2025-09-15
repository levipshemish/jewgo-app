# !/usr/bin/env python3
"""SQLAlchemy models for JewGo App.
This module contains all database models used in the JewGo application.
Models are separated from business logic to follow single responsibility principle.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    ForeignKey,
    ARRAY,
    Numeric,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
# SQLAlchemy Base
Base = declarative_base()

def utc_now():
    """Get current UTC time for SQLAlchemy defaults."""
    return datetime.now(timezone.utc)

class Restaurant(Base):
    """Optimized Restaurant model for SQLAlchemy (consolidated table).
    This model represents the main restaurants table in the JewGo database.
    It contains all kosher restaurant information including contact details,
    kosher supervision status, and ORB certification information.
    Schema Design:
    - Optimized for kosher restaurant data
    - Supports multiple kosher supervision levels
    - Includes ORB certification details
    - Maintains audit trail with timestamps
    Current Data:
    - 107 total restaurants
    - 99 dairy restaurants, 8 pareve restaurants
    - 104 Chalav Yisroel, 3 Chalav Stam
    - 22 Pas Yisroel restaurants
    """
    __tablename__ = "restaurants"
    # 🔒 System-Generated / Controlled
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
    current_time_local = Column(DateTime)  # System-generated (local time snapshot)
    hours_parsed = Column(Boolean, default=False)  # Internal flag — OK to keep
    # 🧾 Required (updated via ORB scrape every 3 weeks)
    name = Column(String(255), nullable=False)  # Restaurant name (required)
    address = Column(String(500), nullable=False)  # Street address
    city = Column(String(100), nullable=False)  # City name
    state = Column(String(50), nullable=False)  # State abbreviation
    zip_code = Column(String(20), nullable=False)  # ZIP code
    phone_number = Column(String(50), nullable=False)  # Phone number
    website = Column(String(500))  # Website URL
    certifying_agency = Column(
        String(100),
        default="ORB",
        nullable=False,
    )  # Auto-filled = "ORB"
    kosher_category = Column(
        String(20),
        nullable=False,
    )  # ENUM('meat', 'dairy', 'pareve')
    listing_type = Column(String(100), nullable=False)  # Business category
    # 📍 Enriched via Google Places API (on creation or scheduled)
    google_listing_url = Column(String(500))  # Optional (1-time fetch)
    place_id = Column(String(255))  # Google Places place ID for fetching reviews
    google_reviews = Column(Text)  # JSONB for recent reviews (limited)
    price_range = Column(String(20))  # Optional
    short_description = Column(Text)  # Optional (e.g. from GMB or internal AI)
    hours_of_operation = Column(Text)  # Optional (check every 7 days)
    hours_json = Column(Text)  # JSONB for structured hours data
    hours_last_updated = Column(DateTime)  # Track when hours were last updated
    timezone = Column(String(50))  # Based on geolocation or ORB data
    latitude = Column(Float)  # Based on geocoded address
    longitude = Column(Float)  # Based on geocoded address
    # 🧼 Kosher Details Source ORB data
    is_cholov_yisroel = Column(Boolean)  # Optional (only if dairy)
    is_pas_yisroel = Column(Boolean)  # Optional (only if meat/pareve)
    cholov_stam = Column(Boolean, default=False)  # Optional (Cholov Stam certification)
    # 🖼️ Display/UX
    image_url = Column(
        String(2000),
    )  # Optional — fallback to placeholder (increased for multiple images)
    specials = Column(
        Text,
    )  # Optional — special offers or announcements
    status = Column(
        String(20),
        default="active",
        nullable=False,
    )  # ENUM('active', 'inactive', 'pending', 'closed')
    # 📊 Google Reviews & Rating
    google_rating = Column(Float)  # Google rating (1-5)
    google_review_count = Column(Integer)  # Number of Google reviews
    view_count = Column(Integer, default=0)  # Number of page views
    
    # 👤 Owner/Contact Information
    user_email = Column(String(255))  # User who submitted/owns this listing
    owner_name = Column(Text)  # Business owner name
    owner_email = Column(Text)  # Business owner email
    owner_phone = Column(Text)  # Business owner phone
    is_owner_submission = Column(Boolean, default=False)  # Whether this was submitted by owner
    business_email = Column(Text)  # Business email address
    
    # 📱 Social Media Links
    instagram_link = Column(Text)  # Instagram profile URL
    facebook_link = Column(Text)  # Facebook page URL
    tiktok_link = Column(Text)  # TikTok profile URL
    
    # 🖼️ Business Images
    business_images = Column(ARRAY(String))  # Array of business image URLs
    
    # 📋 Submission & Approval Process
    submission_status = Column(String(50), default='pending_approval')  # pending_approval, approved, rejected
    submission_date = Column(DateTime)  # When the submission was made
    approval_date = Column(DateTime)  # When it was approved
    approved_by = Column(Text)  # Who approved it
    rejection_reason = Column(Text)  # Reason for rejection if applicable
    
    # 🏢 Business Details
    business_license = Column(Text)  # Business license number
    tax_id = Column(Text)  # Tax ID number
    years_in_business = Column(Integer)  # Years in business
    seating_capacity = Column(Integer)  # Restaurant seating capacity
    
    # 🚚 Service Options
    delivery_available = Column(Boolean, default=False)  # Offers delivery
    takeout_available = Column(Boolean, default=False)  # Offers takeout
    catering_available = Column(Boolean, default=False)  # Offers catering
    
    # 📞 Contact Preferences
    preferred_contact_method = Column(Text)  # Preferred way to contact
    preferred_contact_time = Column(Text)  # Preferred time to contact
    contact_notes = Column(Text)  # Additional contact notes
    
    # 🗑️ Soft Delete
    deleted_at = Column(DateTime)  # Soft delete timestamp
    
    # 🔗 Relationships
    orders = relationship("Order", back_populates="restaurant")
    restaurant_images = relationship("RestaurantImage", back_populates="restaurant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Restaurant(id={self.id}, name='{self.name}', city='{self.city}')>"
class Order(Base):
    """Order model for tracking customer orders.
    This model represents customer orders placed through the JewGo platform.
    It tracks order details, customer information, and order status.
    """
    __tablename__ = "orders"
    # 🔒 System-Generated / Controlled
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
    order_number = Column(
        String(50), unique=True, nullable=False
    )  # Human-readable order number
    # 🏪 Restaurant Information
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    restaurant = relationship("Restaurant", back_populates="orders")
    # 👤 Customer Information
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=False)
    delivery_address = Column(Text)  # Optional for pickup orders
    delivery_instructions = Column(Text)  # Optional delivery notes
    # 📋 Order Details
    order_type = Column(String(20), nullable=False)  # 'pickup' or 'delivery'
    payment_method = Column(String(20), nullable=False)  # 'cash', 'card', 'online'
    estimated_time = Column(String(100))  # Estimated pickup/delivery time
    subtotal = Column(Float, nullable=False, default=0.0)
    tax = Column(Float, nullable=False, default=0.0)
    delivery_fee = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    # 📊 Order Status
    status = Column(
        String(20),
        default="pending",
        nullable=False,
    )  # 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
    # 🔗 Relationships
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    def __repr__(self):
        return f"<Order(id={self.id}, order_number='{self.order_number}', status='{self.status}')>"
class OrderItem(Base):
    """OrderItem model for individual items in an order.
    This model represents individual menu items that are part of a customer order.
    """
    __tablename__ = "order_items"
    # 🔒 System-Generated / Controlled
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    # 🔗 Order Relationship
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    order = relationship("Order", back_populates="items")
    # 📋 Item Details
    item_id = Column(String(100), nullable=False)  # Menu item ID
    name = Column(String(255), nullable=False)  # Menu item name
    price = Column(Float, nullable=False)  # Unit price
    quantity = Column(Integer, nullable=False, default=1)  # Quantity ordered
    special_instructions = Column(Text)  # Special instructions for this item
    subtotal = Column(Float, nullable=False)  # Price * quantity
    def __repr__(self):
        return (
            f"<OrderItem(id={self.id}, name='{self.name}', quantity={self.quantity})>"
        )
class Review(Base):
    """Review model for user reviews of restaurants.
    This model represents user reviews stored in the reviews table.
    Reviews go through a moderation process before being displayed.
    """
    __tablename__ = "reviews"
    id = Column(String(50), primary_key=True)
    restaurant_id = Column(Integer, nullable=False)
    user_id = Column(String(50), nullable=False)
    user_name = Column(String(255), nullable=False)
    user_email = Column(String(255), nullable=True)
    rating = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    images = Column(Text)  # JSON array of image URLs
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
    moderator_notes = Column(Text, nullable=True)
    verified_purchase = Column(Boolean, nullable=False, default=False)
    helpful_count = Column(Integer, nullable=False, default=0)
    report_count = Column(Integer, nullable=False, default=0)


class GoogleReview(Base):
    """Google Review model for storing Google Places reviews.
    This model represents Google reviews fetched from Google Places API.
    These reviews are read-only and updated via scheduled jobs.
    """
    __tablename__ = "google_reviews"
    id = Column(String(50), primary_key=True)
    restaurant_id = Column(Integer, nullable=False)
    place_id = Column(String(255), nullable=False)
    google_review_id = Column(String(255), nullable=False)  # Google's review ID
    author_name = Column(String(255), nullable=False)
    author_url = Column(String(500), nullable=True)  # Google profile URL
    profile_photo_url = Column(String(500), nullable=True)
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=True)  # Review text
    time = Column(DateTime, nullable=False)  # Google timestamp
    relative_time_description = Column(String(100), nullable=True)  # "2 weeks ago"
    language = Column(String(10), nullable=True)  # Review language
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

class Listing(Base):
    """Listing model for the listings table.
    This model represents the listings table that contains all business listings
    including restaurants, synagogues, and other entities.
    """
    __tablename__ = "listings"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String, nullable=True)
    owner_id = Column(String, nullable=True)
    location = Column(String, nullable=True)  # PostGIS location data
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    images = Column(ARRAY(String), nullable=True)
    long_description = Column(Text, nullable=True)
    facebook_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    tiktok_url = Column(String, nullable=True)
    whatsapp_url = Column(String, nullable=True)

class RestaurantImage(Base):
    """Restaurant Image model for multiple images per restaurant.
    This model represents the restaurant_images table that stores
    multiple images for each restaurant with order and Cloudinary info.
    """
    __tablename__ = "restaurant_images"
    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=True)
    image_url = Column(String, nullable=True)
    image_order = Column(Integer, nullable=True)
    cloudinary_public_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=True)
    updated_at = Column(
        DateTime, default=utc_now, onupdate=utc_now, nullable=True
    )
    
    # 🔗 Relationships
    restaurant = relationship("Restaurant", back_populates="restaurant_images")
    
    def __repr__(self):
        return f"<RestaurantImage(id={self.id}, restaurant_id={self.restaurant_id}, image_url='{self.image_url}')>"

class ReviewFlag(Base):
    """Review flag model for reporting inappropriate reviews.
    This model represents flags/reports for reviews that require moderation.
    """
    __tablename__ = "review_flags"
    id = Column(String(50), primary_key=True)
    review_id = Column(String(50), nullable=False)
    reason = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    reported_by = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    status = Column(String(20), nullable=False, default="pending")


class Synagogue(Base):
    """Synagogue model for Jewish places of worship.
    This model represents synagogues and Jewish community centers.
    """
    __tablename__ = "shuls"
    
    # System fields
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    # Basic information
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    phone_number = Column(String(50))
    website = Column(String(500))
    email = Column(String(255))
    
    # Location data
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Synagogue details (using actual shuls table column names)
    denomination = Column(String(100))  # Orthodox, Conservative, Reform, etc.
    shul_type = Column(String(100))  # Daily, Shabbat, High Holidays, etc.
    rabbi_name = Column(String(255))
    rabbi_phone = Column(String(50))
    rabbi_email = Column(String(255))
    
    # Services and amenities (using actual shuls table column names)
    has_daily_minyan = Column(Boolean, default=False)
    has_shabbat_services = Column(Boolean, default=False)
    has_holiday_services = Column(Boolean, default=False)
    has_hebrew_school = Column(Boolean, default=False)
    has_adult_education = Column(Boolean, default=False)
    has_social_hall = Column(Boolean, default=False)
    has_kiddush_facilities = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    has_disabled_access = Column(Boolean, default=False)
    
    # Hours and schedule (using actual shuls table column names)
    business_hours = Column(Text)  # Operating hours as text
    hours_parsed = Column(Boolean, default=False)
    
    # Additional information (using actual shuls table column names)
    description = Column(Text)
    image_url = Column(String(2000))
    logo_url = Column(String(2000))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Additional shul-specific fields
    shul_category = Column(String(100))
    community_affiliation = Column(String(255))
    religious_authority = Column(String(255))
    kosher_certification = Column(String(255))
    membership_required = Column(Boolean, default=False)
    membership_fee = Column(Numeric(10, 2))
    visitor_policy = Column(Text)
    accepts_visitors = Column(Boolean, default=True)
    
    # Rating and reviews
    rating = Column(Float)
    review_count = Column(Integer, default=0)
    star_rating = Column(Float)
    google_rating = Column(Float)
    
    # Additional amenities
    has_mechitza = Column(Boolean, default=False)
    has_women_section = Column(Boolean, default=False)
    has_separate_entrance = Column(Boolean, default=False)
    has_library = Column(Boolean, default=False)
    has_youth_programs = Column(Boolean, default=False)
    has_senior_programs = Column(Boolean, default=False)
    
    # Distance and location
    distance = Column(String(50))
    distance_miles = Column(Numeric(8, 2))
    timezone = Column(String(50))
    
    # Search and categorization
    search_vector = Column(Text)
    tags = Column(ARRAY(String))
    listing_type = Column(String(100), default='shul')
    specials = Column(Text)
    admin_notes = Column(Text)
    
    # Audit fields (commented out - don't exist in actual database)
    # created_by = Column(String(255))
    # updated_by = Column(String(255))
    # deleted_at = Column(DateTime)
    
    def __repr__(self):
        return f"<Synagogue(id={self.id}, name='{self.name}', city='{self.city}')>"


class Mikvah(Base):
    """Mikvah model for Jewish ritual baths.
    This model represents mikvahs with specialized religious requirements.
    """
    __tablename__ = "mikvah"
    
    # System fields
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    # Basic information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    country = Column(String(50), default='USA')
    phone_number = Column(String(50))
    website = Column(String(500))
    email = Column(String(255))
    
    # Location data
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    
    # Mikvah details
    mikvah_type = Column(String(100))
    mikvah_category = Column(String(100))
    business_hours = Column(Text)
    hours_parsed = Column(Boolean, default=False)
    timezone = Column(String(50))
    requires_appointment = Column(Boolean, default=False)
    appointment_phone = Column(String(50))
    appointment_website = Column(String(500))
    walk_in_available = Column(Boolean, default=False)
    advance_booking_days = Column(Integer, default=0)
    
    # Distance and rating
    distance = Column(String(50))
    distance_miles = Column(Numeric(8, 2))
    rating = Column(Numeric(3, 2))
    review_count = Column(Integer, default=0)
    star_rating = Column(Numeric(3, 2))
    google_rating = Column(Numeric(3, 2))
    
    # Images
    image_url = Column(Text)
    logo_url = Column(Text)
    
    # Amenities
    has_changing_rooms = Column(Boolean, default=True)
    has_shower_facilities = Column(Boolean, default=True)
    has_towels_provided = Column(Boolean, default=False)
    has_soap_provided = Column(Boolean, default=False)
    has_hair_dryers = Column(Boolean, default=False)
    has_private_entrance = Column(Boolean, default=False)
    has_disabled_access = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    
    # Religious and community
    rabbinical_supervision = Column(String(255))
    kosher_certification = Column(String(255))
    community_affiliation = Column(String(255))
    religious_authority = Column(String(255))
    
    # Pricing and payment
    fee_amount = Column(Numeric(10, 2))
    fee_currency = Column(String(3), default='USD')
    accepts_credit_cards = Column(Boolean, default=False)
    accepts_cash = Column(Boolean, default=True)
    accepts_checks = Column(Boolean, default=False)
    
    # Status and verification
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Search and metadata
    search_vector = Column(TSVECTOR)  # tsvector type
    tags = Column(ARRAY(Text))  # text[] type
    admin_notes = Column(Text)
    specials = Column(Text)
    listing_type = Column(String(100), default='mikvah')
    status = Column(String(50), default='active')
    
    def __repr__(self):
        return f"<Mikvah(id={self.id}, name='{self.name}', city='{self.city}')>"


class Store(Base):
    """Store model for Jewish businesses and retail stores.
    This model represents stores selling Jewish products and services.
    """
    __tablename__ = "stores"
    
    # System fields
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    # Basic information
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    phone_number = Column(String(50))
    website = Column(String(500))
    email = Column(String(255))
    
    # Location data
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Store details (using actual database column names)
    store_type = Column(String(100))  # Kosher grocery, Judaica, Books, etc.
    store_category = Column(String(100))  # Retail, Wholesale, Online, etc.
    kosher_certification = Column(String(255))  # OU, Kof-K, etc.
    
    # Services and features (using actual database column names)
    has_delivery = Column(Boolean, default=False)
    has_pickup = Column(Boolean, default=False)
    
    # Hours and schedule (using actual database column names)
    business_hours = Column(Text)  # Operating hours as text
    
    # Payment (using actual database column names)
    accepts_credit_cards = Column(Boolean, default=True)
    accepts_cash = Column(Boolean, default=True)
    
    # Additional information
    description = Column(Text)
    image_url = Column(String(2000))
    status = Column(String(20), default="active", nullable=False)
    
    # Audit fields (commented out - don't exist in actual database)
    # created_by = Column(String(255))
    # updated_by = Column(String(255))
    # deleted_at = Column(DateTime)
    
    def __repr__(self):
        return f"<Store(id={self.id}, name='{self.name}', city='{self.city}')>"


# NextAuth.js legacy models removed; using PostgreSQL auth tables exclusively
