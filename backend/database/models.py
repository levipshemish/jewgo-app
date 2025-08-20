#!/usr/bin/env python3
"""SQLAlchemy models for JewGo App.

This module contains all database models used in the JewGo application.
Models are separated from business logic to follow single responsibility principle.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base

# SQLAlchemy Base
Base = declarative_base()


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
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
    )  # JSONB for specials data (paid and unpaid) — keep as JSONB for flexibility
    status = Column(
        String(20),
        default="active",
    )  # ENUM('active', 'inactive', 'pending')

    # 📊 Google Places Data (enriched via API)
    google_rating = Column(Float)  # Optional
    google_review_count = Column(Integer)  # Optional
    google_reviews = Column(Text)  # JSONB for recent reviews (limited)
    user_email = Column(String(255))  # Optional — for contact form


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    moderator_notes = Column(Text, nullable=True)
    verified_purchase = Column(Boolean, nullable=False, default=False)
    helpful_count = Column(Integer, nullable=False, default=0)
    report_count = Column(Integer, nullable=False, default=0)


class RestaurantImage(Base):
    """Restaurant Image model for multiple images per restaurant.

    This model represents the restaurant_images table that stores
    multiple images for each restaurant with order and Cloudinary info.
    """

    __tablename__ = "restaurant_images"

    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, nullable=True)
    image_url = Column(String, nullable=True)
    image_order = Column(Integer, nullable=True)
    cloudinary_public_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True
    )


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), nullable=False, default="pending")


class User(Base):
    """User model for NextAuth.js integration.

    This model represents users in the system, supporting NextAuth.js
    authentication and authorization.
    """

    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False, unique=True)
    emailVerified = Column(DateTime, nullable=True)
    image = Column(String(500), nullable=True)
    isSuperAdmin = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class Account(Base):
    """Account model for NextAuth.js OAuth providers.

    This model represents OAuth accounts linked to users.
    """

    __tablename__ = "accounts"

    id = Column(String(50), primary_key=True)
    userId = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False)
    provider = Column(String(50), nullable=False)
    providerAccountId = Column(String(50), nullable=False)
    refresh_token = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    expires_at = Column(Integer, nullable=True)
    token_type = Column(String(50), nullable=True)
    scope = Column(String(255), nullable=True)
    id_token = Column(Text, nullable=True)
    session_state = Column(String(255), nullable=True)


class Session(Base):
    """Session model for NextAuth.js sessions.

    This model represents user sessions for authentication.
    """

    __tablename__ = "sessions"

    id = Column(String(50), primary_key=True)
    sessionToken = Column(String(255), nullable=False, unique=True)
    userId = Column(String(50), nullable=False)
    expires = Column(DateTime, nullable=False)


class VerificationToken(Base):
    """Verification token model for NextAuth.js email verification.

    This model represents email verification tokens.
    """

    __tablename__ = "verification_tokens"

    identifier = Column(String(255), nullable=False)
    token = Column(String(255), nullable=False, primary_key=True)
    expires = Column(DateTime, nullable=False)
