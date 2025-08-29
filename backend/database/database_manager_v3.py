import json
import os
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, urlunparse

import pytz
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
    event,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from utils.logging_config import get_logger

# Import models
from .models import User

# Import ConfigManager at module level
try:
    from utils.unified_database_config import ConfigManager
except ImportError:
    # Fallback for when utils module is not available
    import os

    class ConfigManager:
        @staticmethod
        def get_database_url():
            return os.getenv("DATABASE_URL")

        @staticmethod
        def get_pg_keepalives_idle():
            return int(os.getenv("PG_KEEPALIVES_IDLE", "60"))

        @staticmethod
        def get_pg_keepalives_interval():
            return int(os.getenv("PG_KEEPALIVES_INTERVAL", "20"))

        @staticmethod
        def get_pg_keepalives_count():
            return int(os.getenv("PG_KEEPALIVES_COUNT", "5"))

        @staticmethod
        def get_pg_statement_timeout():
            return os.getenv("PG_STATEMENT_TIMEOUT", "60000")

        @staticmethod
        def get_pg_idle_tx_timeout():
            return os.getenv("PG_IDLE_TX_TIMEOUT", "120000")

        @staticmethod
        def get_pg_sslmode():
            return os.getenv("PGSSLMODE", "prefer")

        @staticmethod
        def get_pg_sslrootcert():
            return os.getenv("PGSSLROOTCERT")


try:
    from utils.restaurant_status import get_restaurant_status, is_restaurant_open
except ImportError:

    def get_restaurant_status(restaurant):
        return "unknown"

    def is_restaurant_open(restaurant):
        return False


try:
    from utils.hours_parser import parse_hours_blob
except ImportError:

    def parse_hours_blob(hours_blob):
        return {}


try:
    from utils.hours_manager import HoursManager
except ImportError:

    class HoursManager:
        def __init__(self):
            pass

        def parse_hours(self, hours_blob):
            return {}


logger = get_logger(__name__)

#!/usr/bin/env python3
"""Enhanced Database Manager for JewGo App v3.
==========================================

This module provides a comprehensive database management system for the JewGo application,
handling all PostgreSQL database operations with SQLAlchemy 1.4. The system is designed
to work with a consolidated restaurants table that contains all kosher restaurant data.

Key Features:
- SQLAlchemy 1.4 compatibility with PostgreSQL
- Structured logging with structlog
- Comprehensive restaurant data management
- Kosher supervision categorization
- Search and filtering capabilities
- Geographic location support
- Statistics and reporting

Database Schema:
- 28 optimized columns for restaurant data
- Kosher supervision flags (Chalav Yisroel, Pas Yisroel, etc.)
- ORB certification information
- Contact and location details
- Timestamps for tracking changes

Author: JewGo Development Team
Version: 3.0
Last Updated: 2024
"""

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

    # 🏢 Enhanced Add Eatery Workflow Fields
    # Owner management
    owner_name = Column(Text)  # Restaurant owner name
    owner_email = Column(Text)  # Restaurant owner email
    owner_phone = Column(Text)  # Restaurant owner phone
    is_owner_submission = Column(Boolean, default=False)  # Whether submitted by owner

    # Additional business fields
    business_email = Column(Text)  # Business contact email
    instagram_link = Column(Text)  # Instagram profile link
    facebook_link = Column(Text)  # Facebook page link
    tiktok_link = Column(Text)  # TikTok profile link

    # Multiple images support
    business_images = Column(ARRAY(String))  # Array of image URLs

    # Enhanced status tracking
    submission_status = Column(
        String(20), default="pending_approval"
    )  # pending_approval, approved, rejected, draft
    submission_date = Column(DateTime)  # When submitted
    approval_date = Column(DateTime)  # When approved/rejected
    approved_by = Column(Text)  # Who approved/rejected
    rejection_reason = Column(Text)  # Reason for rejection

    # Additional business details
    business_license = Column(Text)  # Business license number
    tax_id = Column(Text)  # Tax ID number
    years_in_business = Column(Integer)  # Years in business
    seating_capacity = Column(Integer)  # Restaurant seating capacity
    delivery_available = Column(Boolean, default=False)  # Delivery service available
    takeout_available = Column(Boolean, default=False)  # Takeout service available
    catering_available = Column(Boolean, default=False)  # Catering service available

    # Contact preferences
    preferred_contact_method = Column(Text)  # email, phone, text, any
    preferred_contact_time = Column(Text)  # morning, afternoon, evening
    contact_notes = Column(Text)  # Additional contact notes


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
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    resolved_by = Column(String(50), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)


class Marketplace(Base):
    """Marketplace model for SQLAlchemy (marketplace table).

    This model represents the marketplace table in the JewGo database.
    It contains all marketplace product information including product details,
    vendor information, kosher certification, and pricing data.

    Schema Design:
    - Optimized for marketplace product data
    - Supports kosher certification and dietary information
    - Includes vendor management and product categorization
    - Maintains audit trail with timestamps

    Required Fields:
    - name: Product name
    - title: Product title/display name
    - price: Product price
    - category: Main category
    - location: Product location/address
    - vendor_name: Vendor/store name
    """

    __tablename__ = "marketplace"

    # 🔒 System-Generated / Controlled
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # 🧾 Required Fields
    name = Column(String(255), nullable=False)  # Product name (required)
    title = Column(String(500), nullable=False)  # Product title/display name (required)
    price = Column(Numeric(10, 2), nullable=False)  # Product price (required)
    category = Column(String(100), nullable=False)  # Main category (required)
    location = Column(String(500), nullable=False)  # Location/address (required)
    vendor_name = Column(String(255), nullable=False)  # Vendor/store name (required)

    # 📍 Location Details
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # 🖼️ Product Images
    product_image = Column(String(2000), nullable=True)  # Main product image
    additional_images = Column(
        ARRAY(String), nullable=True
    )  # Additional product images
    thumbnail = Column(String(2000), nullable=True)  # Thumbnail image

    # 📋 Product Details
    subcategory = Column(String(100), nullable=True)  # Subcategory
    description = Column(Text, nullable=True)  # Product description
    original_price = Column(Numeric(10, 2), nullable=True)  # Original price for sales
    currency = Column(String(10), default="USD", nullable=False)
    stock = Column(Integer, default=0, nullable=False)  # Stock quantity
    is_available = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    is_on_sale = Column(Boolean, default=False, nullable=False)
    discount_percentage = Column(Integer, nullable=True)  # Discount percentage

    # 🏪 Vendor Information
    vendor_id = Column(String(100), nullable=True)  # Vendor identifier
    vendor_logo = Column(String(2000), nullable=True)  # Vendor logo
    vendor_address = Column(String(500), nullable=True)  # Vendor address
    vendor_phone = Column(String(50), nullable=True)  # Vendor phone
    vendor_email = Column(String(255), nullable=True)  # Vendor email
    vendor_website = Column(String(500), nullable=True)  # Vendor website
    vendor_rating = Column(Float, nullable=True)  # Vendor rating
    vendor_review_count = Column(Integer, default=0, nullable=False)
    vendor_is_verified = Column(Boolean, default=False, nullable=False)
    vendor_is_premium = Column(Boolean, default=False, nullable=False)

    # 🧼 Kosher Certification
    kosher_agency = Column(String(100), nullable=True)  # Kosher certification agency
    kosher_level = Column(
        String(50), nullable=True
    )  # Glatt, regular, chalav_yisrael, pas_yisrael
    kosher_certificate_number = Column(String(100), nullable=True)
    kosher_expiry_date = Column(Date, nullable=True)
    kosher_is_verified = Column(Boolean, default=False, nullable=False)

    # 🥗 Dietary Information
    is_gluten_free = Column(Boolean, default=False, nullable=False)
    is_dairy_free = Column(Boolean, default=False, nullable=False)
    is_nut_free = Column(Boolean, default=False, nullable=False)
    is_vegan = Column(Boolean, default=False, nullable=False)
    is_vegetarian = Column(Boolean, default=False, nullable=False)
    allergens = Column(ARRAY(String), nullable=True)  # Array of allergens

    # 🏷️ Product Metadata
    tags = Column(ARRAY(String), nullable=True)  # Product tags
    specifications = Column(JSONB, nullable=True)  # Product specifications
    shipping_info = Column(JSONB, nullable=True)  # Shipping information

    # ⭐ Ratings & Reviews
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)

    # 📊 Business Logic
    status = Column(
        String(20), default="active", nullable=False
    )  # active, inactive, pending, sold_out
    priority = Column(Integer, default=0, nullable=False)  # For featured/sorting
    expiry_date = Column(Date, nullable=True)  # Product expiry date
    created_by = Column(String(100), nullable=True)  # Who created the listing
    approved_by = Column(String(100), nullable=True)  # Who approved the listing
    approved_at = Column(DateTime, nullable=True)  # When it was approved

    # 📝 Additional Information
    notes = Column(Text, nullable=True)  # Internal notes
    external_id = Column(String(100), nullable=True)  # External system ID
    source = Column(String(50), default="manual", nullable=False)  # manual, import, api


class EnhancedDatabaseManager:
    """Enhanced database manager with SQLAlchemy 1.4 support for consolidated restaurants table."""

    def __init__(self, database_url: str | None = None) -> None:
        """Initialize database manager with connection string."""
        self.database_url = database_url or ConfigManager.get_database_url()

        # Validate that DATABASE_URL is provided
        if not self.database_url:
            msg = "DATABASE_URL environment variable is required"
            raise ValueError(msg)

        # Initialize SQLAlchemy components
        self.engine = None
        self.SessionLocal = None
        self.session = None

        logger.info(
            "Database manager initialized",
            database_url=self.database_url[:50] + "...",
        )

    def connect(self) -> bool:
        """Connect to the database and create tables if they don't exist."""
        try:
            # Fix database URL format if needed (postgres:// -> postgresql://)
            if self.database_url.startswith("postgres://"):
                self.database_url = self.database_url.replace(
                    "postgres://", "postgresql://"
                )
                logger.info(
                    "Fixed database URL format from postgres:// to postgresql://"
                )

            # Ensure SSL for all non-local Postgres connections (helps avoid TLS issues on hosts like Neon, RDS, etc.)
            try:
                parsed = urlparse(self.database_url)
                hostname = (parsed.hostname or "").lower()
                is_local = hostname in ("localhost", "127.0.0.1")
                if (
                    parsed.scheme.startswith("postgres")
                    and (not is_local)
                    and ("sslmode=" not in (parsed.query or ""))
                ):
                    # Use sslmode=prefer for better compatibility with Neon and other providers
                    new_query = (
                        f"{parsed.query}&sslmode=prefer"
                        if parsed.query
                        else "sslmode=prefer"
                    )
                    self.database_url = urlunparse(parsed._replace(query=new_query))
                    logger.info(
                        "Added sslmode=prefer to database URL for non-local connection",
                        hostname=hostname,
                    )
            except Exception as e:
                # Non-fatal: continue without altering URL
                logger.warning(
                    "Failed to normalize database URL for SSL; continuing", error=str(e)
                )

            # Create the engine with SQLAlchemy 2.0 + psycopg2-binary
            # Add connection pool + TCP keepalive settings for better reliability under TLS
            keepalives_idle = ConfigManager.get_pg_keepalives_idle()
            keepalives_interval = ConfigManager.get_pg_keepalives_interval()
            keepalives_count = ConfigManager.get_pg_keepalives_count()
            statement_timeout = ConfigManager.get_pg_statement_timeout()
            idle_tx_timeout = ConfigManager.get_pg_idle_tx_timeout()

            connect_args = {
                "connect_timeout": 30,
                "application_name": "jewgo-backend",
                # Ensure SSL is on but avoid verify-full unless you ship CA certs
                # If using Neon/Render typical: sslmode=require
                "sslmode": ConfigManager.get_pg_sslmode(),
                # TCP keepalives so dead links get detected quickly
                "keepalives": 1,
                "keepalives_idle": keepalives_idle,
                "keepalives_interval": keepalives_interval,
                "keepalives_count": keepalives_count,
                # Set server-side timeouts defensively (may be removed for some providers below)
                "options": f"-c statement_timeout={statement_timeout} -c idle_in_transaction_session_timeout={idle_tx_timeout}",
            }

            # Optional certificate pinning if provided via environment (PGSSLROOTCERT)
            sslrootcert = ConfigManager.get_pg_sslrootcert()
            if sslrootcert:
                connect_args["sslrootcert"] = sslrootcert

            # Some providers (e.g., Neon pooler) reject startup options like statement_timeout.
            # Detect Neon and remove unsupported startup options, then set timeouts after connect.
            parsed = urlparse(self.database_url)
            hostname = (parsed.hostname or "").lower()
            is_neon = "neon.tech" in hostname
            if is_neon:
                connect_args.pop("options", None)

            self.engine = create_engine(
                self.database_url,
                echo=False,
                pool_size=ConfigManager.get_db_pool_size(),
                max_overflow=ConfigManager.get_db_max_overflow(),
                pool_timeout=ConfigManager.get_db_pool_timeout(),
                pool_recycle=ConfigManager.get_db_pool_recycle(),  # 3 minutes
                pool_pre_ping=True,
                connect_args=connect_args,
            )

            # If provider disallowed startup options, set per-connection timeouts
            if is_neon:
                try:

                    @event.listens_for(self.engine, "connect")
                    def _set_timeouts_on_connect(dbapi_connection, connection_record):
                        try:
                            with dbapi_connection.cursor() as cursor:
                                cursor.execute(
                                    f"SET statement_timeout = {statement_timeout}"
                                )
                                cursor.execute(
                                    f"SET idle_in_transaction_session_timeout = {idle_tx_timeout}"
                                )
                        except Exception:
                            # Non-fatal: leave defaults if SET fails
                            pass

                except Exception:
                    # Non-fatal: proceed without event listener if unsupported
                    pass

            # Test the connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()  # Consume the result
                logger.info("Database connection successful")

            # Create session factory
            self.SessionLocal = scoped_session(
                sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=self.engine,
                    expire_on_commit=False,
                )
            )

            # Create tables if they don't exist
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created/verified")

            return True

        except Exception as e:
            logger.exception(
                "Failed to connect to database",
                error=str(e),
                database_url=self.database_url[:50] + "...",
            )
            return False

    def get_session(self) -> Session:
        """Get a new database session, auto-connecting if needed."""
        if not self.SessionLocal:
            # Attempt a lazy connect so callers don't have to remember connect()
            connected = self.connect()
            if not connected or not self.SessionLocal:
                msg = "Database not connected. Call connect() first."
                raise RuntimeError(msg)
        return self.SessionLocal()

    @contextmanager
    def get_connection(self):
        """Get a raw database connection for direct SQL queries.

        This method provides a psycopg2 connection for services that need
        to execute raw SQL queries instead of using SQLAlchemy ORM.

        Yields:
            psycopg2 connection object
        """
        if not self.engine:
            # Attempt a lazy connect so callers don't have to remember connect()
            connected = self.connect()
            if not connected or not self.engine:
                msg = "Database not connected. Call connect() first."
                raise RuntimeError(msg)

        connection = self.engine.raw_connection()
        try:
            yield connection
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    @contextmanager
    def session_scope(self):
        """Context manager for database sessions with proper error handling."""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except OperationalError as e:
            session.rollback()
            raise
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def with_retry(self, fn, retries=2, delay=0.2):
        """Retry function with exponential backoff for OperationalError."""
        for i in range(retries + 1):
            try:
                return fn()
            except OperationalError:
                if i == retries:
                    raise
                time.sleep(delay * (i + 1))
                # Dispose engine to drop broken connections before retry
                try:
                    if self.engine:
                        self.engine.dispose()
                except Exception:
                    pass

    def add_restaurant(self, restaurant_data: dict[str, Any]) -> bool:
        """Add a new restaurant to the database."""
        try:
            session = self.get_session()

            # Validate required fields
            required_fields = [
                "name",
                "address",
                "city",
                "state",
                "zip_code",
                "phone_number",
                "kosher_category",
                "listing_type",
            ]
            for field in required_fields:
                if not restaurant_data.get(field):
                    logger.error("Missing required field", field=field)
                    return False

            # Set default values for required fields
            restaurant_data.setdefault("certifying_agency", "ORB")
            restaurant_data.setdefault("created_at", datetime.utcnow())
            restaurant_data.setdefault("updated_at", datetime.utcnow())
            restaurant_data.setdefault("hours_parsed", False)

            # Handle specials field (convert to JSON string if it's a list)
            if "specials" in restaurant_data and isinstance(
                restaurant_data["specials"],
                list,
            ):
                restaurant_data["specials"] = json.dumps(restaurant_data["specials"])

            # Create new restaurant object
            restaurant = Restaurant(**restaurant_data)
            session.add(restaurant)
            session.commit()

            logger.info(
                "Restaurant added successfully",
                restaurant_id=restaurant.id,
                name=restaurant.name,
            )
            return True

        except Exception as e:
            logger.exception(
                "Failed to add restaurant",
                error=str(e),
                restaurant_data=restaurant_data,
            )
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def get_restaurants(
        self,
        kosher_type: str | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
        as_dict: bool = False,
        filters: dict[str, Any] | None = None,
    ) -> list[Any]:
        """Get restaurants with optional filtering and pagination."""
        session = None
        last_error = None

        for attempt in range(3):  # Retry up to 3 times
            try:
                session = self.get_session()

                # Optimize query by selecting only needed columns for better performance
                query = session.query(Restaurant)

                # Apply filters if provided
                if filters:
                    if filters.get("search"):
                        search_term = filters["search"]
                        query = query.filter(Restaurant.name.ilike(f"%{search_term}%"))
                    if filters.get("status"):
                        query = query.filter(Restaurant.status == filters["status"])
                    if filters.get("kosher_category"):
                        query = query.filter(
                            Restaurant.kosher_category == filters["kosher_category"]
                        )
                    if filters.get("business_types"):
                        business_types = filters["business_types"]
                        if isinstance(business_types, list) and business_types:
                            query = query.filter(
                                Restaurant.business_types.in_(business_types)
                            )
                        elif isinstance(business_types, str):
                            query = query.filter(
                                Restaurant.business_types == business_types
                            )

                # Apply legacy filters if no filters dict provided
                if not filters:
                    if kosher_type:
                        query = query.filter(Restaurant.kosher_category == kosher_type)
                    if status:
                        query = query.filter(Restaurant.status == status)

                # Add ordering for consistent results
                query = query.order_by(Restaurant.id)

                restaurants = query.limit(limit).offset(offset).all()

                if as_dict:
                    # Eager load all restaurant images in a single query to avoid N+1
                    restaurant_images_map = self._eager_load_restaurant_images(
                        session, restaurants
                    )

                    # Convert restaurants to dict with pre-loaded images
                    return [
                        self._restaurant_to_unified_dict_with_images(
                            r, restaurant_images_map.get(r.id, [])
                        )
                        for r in restaurants
                    ]

                return restaurants
            except (OperationalError, DBAPIError) as db_err:
                last_error = db_err
                logger.warning(
                    "Transient database error while fetching restaurants; will retry if possible",
                    attempt=attempt + 1,
                    error=str(db_err),
                )
                try:
                    if session:
                        session.rollback()
                except Exception:
                    pass
                finally:
                    if session:
                        try:
                            session.close()
                        except Exception:
                            pass
                try:
                    if self.engine:
                        self.engine.dispose()
                except Exception:
                    pass
                if attempt == 2:  # Last attempt
                    logger.exception(
                        "Failed to fetch restaurants after retries",
                        error=str(last_error),
                    )
                    raise last_error
                continue
            except Exception as e:
                logger.exception("Error fetching restaurants", error=str(e))
                raise e
            finally:
                if session:
                    session.close()

    def get_restaurants_count(
        self,
        kosher_type: str | None = None,
        status: str | None = None,
        filters: dict[str, Any] | None = None,
    ) -> int:
        """Get the total count of restaurants with optional filtering."""
        session = None
        try:
            session = self.get_session()
            query = session.query(Restaurant)

            # Apply filters if provided
            if filters:
                if filters.get("search"):
                    search_term = filters["search"]
                    query = query.filter(Restaurant.name.ilike(f"%{search_term}%"))
                if filters.get("status"):
                    query = query.filter(Restaurant.status == filters["status"])
                if filters.get("kosher_category"):
                    query = query.filter(
                        Restaurant.kosher_category == filters["kosher_category"]
                    )

            # Apply legacy filters if no filters dict provided
            if not filters:
                if kosher_type:
                    query = query.filter(Restaurant.kosher_category == kosher_type)
                if status:
                    query = query.filter(Restaurant.status == status)

            return query.count()
        except Exception as e:
            logger.exception("Error getting restaurants count", error=str(e))
            return 0
        finally:
            if session:
                session.close()

    def get_restaurants_with_hours_count(self) -> int:
        """Get the count of restaurants that have hours data."""
        session = None
        try:
            session = self.get_session()
            count = (
                session.query(Restaurant)
                .filter(
                    Restaurant.hours_of_operation.isnot(None),
                    Restaurant.hours_of_operation != "",
                    Restaurant.hours_of_operation != "None",
                )
                .count()
            )
            return count
        except Exception as e:
            logger.exception("Error getting restaurants with hours count", error=str(e))
            return 0
        finally:
            if session:
                session.close()

    def get_all_places(
        self, limit: int = 1000, offset: int = 0
    ) -> list[dict[str, Any]]:
        """Get all places from the consolidated restaurants table."""
        session = None
        try:
            session = self.get_session()
            restaurants = session.query(Restaurant).limit(limit).offset(offset).all()

            logger.info("Found restaurants in database", count=len(restaurants))

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            # Convert to unified format with pre-loaded images
            all_places = []
            for restaurant in restaurants:
                try:
                    place_dict = self._restaurant_to_unified_dict_with_images(
                        restaurant, restaurant_images_map.get(restaurant.id, [])
                    )
                    all_places.append(place_dict)
                except Exception as e:
                    logger.exception(
                        "Error converting restaurant",
                        restaurant_name=restaurant.name,
                        error=str(e),
                    )
                    continue

            logger.info("Successfully converted restaurants", count=len(all_places))

            # Sort by name
            all_places.sort(key=lambda x: x["name"])
            return all_places

        except Exception as e:
            logger.exception("Failed to get all places", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def search_places(
        self,
        query: str | None = None,
        category: str | None = None,
        state: str | None = None,
        limit: int = 50,
        offset: int = 0,
        is_kosher: bool | None = None,
    ) -> list[dict[str, Any]]:
        """Search places from the consolidated restaurants table."""
        try:
            session = self.get_session()
            restaurant_query = session.query(Restaurant)

            if query:
                restaurant_query = restaurant_query.filter(
                    Restaurant.name.ilike(f"%{query}%"),
                )
            if category:
                restaurant_query = restaurant_query.filter(
                    Restaurant.listing_type.ilike(f"%{category}%"),
                )
            if state:
                restaurant_query = restaurant_query.filter(
                    Restaurant.state.ilike(f"%{state}%"),
                )
            if is_kosher is not None:
                # All restaurants in our database are kosher, so this filter is not needed
                pass

            restaurants = restaurant_query.limit(limit).offset(offset).all()

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            # Convert to unified format with pre-loaded images
            all_places = []
            for restaurant in restaurants:
                place_dict = self._restaurant_to_unified_dict_with_images(
                    restaurant, restaurant_images_map.get(restaurant.id, [])
                )
                all_places.append(place_dict)

            return all_places

        except Exception as e:
            logger.exception("Failed to search places", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def search_restaurants(
        self,
        limit: int = 1000,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Search restaurants and return as list of dictionaries."""
        try:
            session = self.get_session()
            restaurants = session.query(Restaurant).limit(limit).offset(offset).all()

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            return [
                self._restaurant_to_unified_dict_with_images(
                    restaurant, restaurant_images_map.get(restaurant.id, [])
                )
                for restaurant in restaurants
            ]
        except Exception as e:
            logger.exception("Error searching restaurants", error=str(e))
            return []
        finally:
            session.close()

    def search_restaurants_near_location(
        self,
        lat: float,
        lng: float,
        radius: float = 50,
        query: str | None = None,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Restaurant]:
        """Search restaurants near a specific location using distance calculation."""
        try:
            session = self.get_session()
            query_obj = session.query(Restaurant)

            # Apply basic filters first
            if query:
                query_obj = query_obj.filter(
                    Restaurant.name.ilike(f"%{query}%")
                    | Restaurant.short_description.ilike(f"%{query}%"),
                )

            if category:
                query_obj = query_obj.filter(
                    Restaurant.cuisine_type.ilike(f"%{category}%"),
                )

            # Get all restaurants and filter by distance (simplified approach)
            restaurants = (
                query_obj.limit(limit * 2).offset(offset).all()
            )  # Get more to account for distance filtering

            # Filter by distance (simplified - in production you'd use PostGIS or similar)
            nearby_restaurants = []
            for restaurant in restaurants:
                if restaurant.latitude is not None and restaurant.longitude is not None:
                    # Simple distance calculation (Haversine formula would be better)
                    distance = (
                        (restaurant.latitude - lat) ** 2
                        + (restaurant.longitude - lng) ** 2
                    ) ** 0.5
                    if distance <= radius / 69:  # Rough conversion: 1 degree ≈ 69 miles
                        nearby_restaurants.append(restaurant)
                        if len(nearby_restaurants) >= limit:
                            break
                else:
                    # If no coordinates, include the restaurant anyway (fallback behavior)
                    nearby_restaurants.append(restaurant)
                    if len(nearby_restaurants) >= limit:
                        break

            return nearby_restaurants[:limit]

        except Exception as e:
            logger.exception("Failed to search restaurants near location", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def get_place_by_id(self, place_id: int) -> dict[str, Any] | None:
        """Get a place by ID from the consolidated restaurants table."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == place_id).first()
            )
            if restaurant:
                return self._restaurant_to_unified_dict(restaurant)
            return None

        except Exception as e:
            logger.exception(
                "Failed to get place by ID", error=str(e), place_id=place_id
            )
            return None
        finally:
            if session:
                session.close()

    def get_statistics(self) -> dict[str, Any]:
        """Get statistics from the consolidated restaurants table (safe fields only)."""
        session = None
        try:
            session = self.get_session()

            # Counts
            total_count = session.query(Restaurant).count()

            # Distinct states
            states = (
                session.query(Restaurant.state)
                .filter(Restaurant.state.isnot(None))
                .distinct()
                .all()
            )
            state_list = [row[0] for row in states if row[0]]

            # Distinct listing types (category/classification)
            listing_types = (
                session.query(Restaurant.listing_type)
                .filter(Restaurant.listing_type.isnot(None))
                .distinct()
                .all()
            )
            listing_type_list = [row[0] for row in listing_types if row[0]]

            # Counts by kosher category
            categories = ["meat", "dairy", "pareve"]
            counts_by_kosher_category = {}
            for cat in categories:
                counts_by_kosher_category[cat] = (
                    session.query(Restaurant)
                    .filter(Restaurant.kosher_category == cat)
                    .count()
                )

            return {
                "total_restaurants": total_count,
                "states": state_list,
                "listing_types": listing_type_list,
                "counts_by_kosher_category": counts_by_kosher_category,
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.exception("Failed to get statistics", error=str(e))
            return {}
        finally:
            if session:
                session.close()

    def get_kosher_types(self) -> list[str]:
        """Return the distinct kosher categories available in the dataset."""
        session = None
        try:
            session = self.get_session()
            rows = (
                session.query(Restaurant.kosher_category)
                .filter(Restaurant.kosher_category.isnot(None))
                .distinct()
                .all()
            )
            return sorted({row[0] for row in rows if row[0]})
        except Exception as e:
            logger.exception("Failed to get kosher types", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def get_google_reviews_statistics(self) -> dict[str, Any]:
        """Get statistics about Google reviews in the database.

        Returns:
            Dictionary with Google reviews statistics

        """
        try:
            session = self.get_session()

            # Count restaurants with Google reviews
            restaurants_with_reviews = (
                session.query(Restaurant)
                .filter(
                    Restaurant.google_reviews.isnot(None),
                )
                .count()
            )

            # Count restaurants without Google reviews
            restaurants_without_reviews = (
                session.query(Restaurant)
                .filter(
                    Restaurant.google_reviews.is_(None),
                )
                .count()
            )

            # Count restaurants with recent reviews (last 7 days)
            one_week_ago = datetime.utcnow() - timedelta(days=7)
            recent_reviews = (
                session.query(Restaurant)
                .filter(
                    Restaurant.google_reviews.isnot(None),
                    Restaurant.updated_at >= one_week_ago,
                )
                .count()
            )

            # Sample of restaurants with reviews
            sample_restaurants = (
                session.query(Restaurant)
                .filter(
                    Restaurant.google_reviews.isnot(None),
                )
                .limit(5)
                .all()
            )

            sample_data = []
            for restaurant in sample_restaurants:
                try:
                    reviews_data = json.loads(restaurant.google_reviews)
                    review_count = len(reviews_data.get("reviews", []))
                    sample_data.append(
                        {
                            "id": restaurant.id,
                            "name": restaurant.name,
                            "review_count": review_count,
                            "overall_rating": reviews_data.get("overall_rating"),
                            "last_updated": (
                                restaurant.updated_at.isoformat()
                                if restaurant.updated_at
                                else None
                            ),
                        },
                    )
                except (json.JSONDecodeError, TypeError):
                    sample_data.append(
                        {
                            "id": restaurant.id,
                            "name": restaurant.name,
                            "review_count": 0,
                            "overall_rating": None,
                            "last_updated": (
                                restaurant.updated_at.isoformat()
                                if restaurant.updated_at
                                else None
                            ),
                        },
                    )

            return {
                "total_restaurants": restaurants_with_reviews
                + restaurants_without_reviews,
                "restaurants_with_reviews": restaurants_with_reviews,
                "restaurants_without_reviews": restaurants_without_reviews,
                "recent_reviews_count": recent_reviews,
                "coverage_percentage": (
                    round(
                        (
                            restaurants_with_reviews
                            / (restaurants_with_reviews + restaurants_without_reviews)
                        )
                        * 100,
                        2,
                    )
                    if (restaurants_with_reviews + restaurants_without_reviews) > 0
                    else 0
                ),
                "sample_restaurants": sample_data,
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.exception("Error getting Google reviews statistics", error=str(e))
            return {}
        finally:
            if session:
                session.close()

    def _restaurant_to_unified_dict(self, restaurant: Restaurant) -> dict[str, Any]:
        """Convert restaurant object to unified dictionary format."""
        # Create base restaurant data dictionary
        restaurant_data = {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "city": restaurant.city,
            "state": restaurant.state,
            "zip_code": restaurant.zip_code,
            "phone_number": restaurant.phone_number,
            "website": restaurant.website,
            "kosher_category": restaurant.kosher_category,
            "listing_type": restaurant.listing_type,
            "hours_of_operation": restaurant.hours_of_operation,
            "hours_json": self._parse_hours_json_field(restaurant.hours_json),
            "hours_last_updated": (
                restaurant.hours_last_updated.isoformat()
                if restaurant.hours_last_updated
                else None
            ),
            "short_description": restaurant.short_description,
            "price_range": restaurant.price_range,
            "image_url": restaurant.image_url,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "specials": self._parse_specials_field(restaurant.specials),
            "is_cholov_yisroel": restaurant.is_cholov_yisroel,
            "is_pas_yisroel": restaurant.is_pas_yisroel,
            "cholov_stam": restaurant.cholov_stam,
            "certifying_agency": restaurant.certifying_agency,
            "google_listing_url": restaurant.google_listing_url,
            # Google Reviews Data
            "google_rating": restaurant.google_rating,
            "google_review_count": restaurant.google_review_count,
            "google_reviews": restaurant.google_reviews,
            "created_at": (
                restaurant.created_at.isoformat() if restaurant.created_at else None
            ),
            "updated_at": (
                restaurant.updated_at.isoformat() if restaurant.updated_at else None
            ),
            "current_time_local": (
                restaurant.current_time_local.isoformat()
                if restaurant.current_time_local
                else None
            ),
            "timezone": restaurant.timezone,
            "hours_parsed": restaurant.hours_parsed,
        }

        # Calculate dynamic status based on business hours and current time
        try:
            status_info = get_restaurant_status(restaurant_data)
            restaurant_data.update(
                {
                    "status": status_info.get("status", "unknown"),
                    "is_open": status_info.get("is_open", False),
                    "status_reason": status_info.get(
                        "status_reason",
                        "Status calculation failed",
                    ),
                    "next_open_time": status_info.get("next_open_time"),
                    "current_time_local": status_info.get("current_time_local"),
                    "timezone": status_info.get("timezone", "UTC"),
                    "hours_parsed": status_info.get("hours_parsed", False),
                },
            )
        except Exception as e:
            logger.exception(
                "Error calculating dynamic status for restaurant",
                restaurant_name=restaurant.name,
                error=str(e),
            )
            # Fallback to stored status if dynamic calculation fails
            restaurant_data.update(
                {
                    "status": "unknown",
                    "is_open": False,
                    "status_reason": f"Dynamic status calculation failed: {e!s}",
                    "next_open_time": None,
                    "current_time_local": None,
                    "timezone": "UTC",
                    "hours_parsed": False,
                },
            )

        # Fetch additional images from restaurant_images table
        try:
            additional_images_data = self.get_restaurant_images(restaurant.id)
            # Extract just the URLs for the frontend
            additional_images = [
                img["image_url"]
                for img in additional_images_data
                if img.get("image_url")
            ]
            restaurant_data["additional_images"] = additional_images

            logger.info(
                "Added additional images to restaurant",
                restaurant_id=restaurant.id,
                image_count=len(additional_images),
            )
        except Exception as e:
            logger.warning(
                "Failed to fetch additional images for restaurant",
                restaurant_id=restaurant.id,
                error=str(e),
            )
            restaurant_data["additional_images"] = []

        return restaurant_data

    def _restaurant_to_unified_dict_with_images(
        self, restaurant: Restaurant, preloaded_images: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Convert restaurant object to unified dictionary format with pre-loaded images to avoid N+1 queries."""
        # Create base restaurant data dictionary (same as _restaurant_to_unified_dict)
        restaurant_data = {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "city": restaurant.city,
            "state": restaurant.state,
            "zip_code": restaurant.zip_code,
            "phone_number": restaurant.phone_number,
            "website": restaurant.website,
            "kosher_category": restaurant.kosher_category,
            "listing_type": restaurant.listing_type,
            "hours_of_operation": restaurant.hours_of_operation,
            "hours_json": self._parse_hours_json_field(restaurant.hours_json),
            "hours_last_updated": (
                restaurant.hours_last_updated.isoformat()
                if restaurant.hours_last_updated
                else None
            ),
            "short_description": restaurant.short_description,
            "price_range": restaurant.price_range,
            "image_url": restaurant.image_url,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "specials": self._parse_specials_field(restaurant.specials),
            "is_cholov_yisroel": restaurant.is_cholov_yisroel,
            "is_pas_yisroel": restaurant.is_pas_yisroel,
            "cholov_stam": restaurant.cholov_stam,
            "certifying_agency": restaurant.certifying_agency,
            "google_listing_url": restaurant.google_listing_url,
            # Google Reviews Data
            "google_rating": restaurant.google_rating,
            "google_review_count": restaurant.google_review_count,
            "google_reviews": restaurant.google_reviews,
            "created_at": (
                restaurant.created_at.isoformat() if restaurant.created_at else None
            ),
            "updated_at": (
                restaurant.updated_at.isoformat() if restaurant.updated_at else None
            ),
            "current_time_local": (
                restaurant.current_time_local.isoformat()
                if restaurant.current_time_local
                else None
            ),
            "timezone": restaurant.timezone,
            "hours_parsed": restaurant.hours_parsed,
        }

        # Calculate dynamic status based on business hours and current time
        try:
            status_info = get_restaurant_status(restaurant_data)
            restaurant_data.update(
                {
                    "status": status_info.get("status", "unknown"),
                    "is_open": status_info.get("is_open", False),
                    "status_reason": status_info.get(
                        "status_reason",
                        "Status calculation failed",
                    ),
                    "next_open_time": status_info.get("next_open_time"),
                    "current_time_local": status_info.get("current_time_local"),
                    "timezone": status_info.get("timezone", "UTC"),
                    "hours_parsed": status_info.get("hours_parsed", False),
                },
            )
        except Exception as e:
            logger.exception(
                "Error calculating dynamic status for restaurant",
                restaurant_name=restaurant.name,
                error=str(e),
            )
            # Fallback to stored status if dynamic calculation fails
            restaurant_data.update(
                {
                    "status": "unknown",
                    "is_open": False,
                    "status_reason": f"Dynamic status calculation failed: {e!s}",
                    "next_open_time": None,
                    "current_time_local": None,
                    "timezone": "UTC",
                    "hours_parsed": False,
                },
            )

        # Use pre-loaded images instead of making a database query
        try:
            # Extract just the URLs for the frontend from pre-loaded images
            additional_images = [
                img["image_url"] for img in preloaded_images if img.get("image_url")
            ]
            restaurant_data["additional_images"] = additional_images

            logger.debug(
                "Added pre-loaded additional images to restaurant",
                restaurant_id=restaurant.id,
                image_count=len(additional_images),
            )
        except Exception as e:
            logger.warning(
                "Failed to process pre-loaded images for restaurant",
                restaurant_id=restaurant.id,
                error=str(e),
            )
            restaurant_data["additional_images"] = []

        return restaurant_data

    def _parse_specials_field(self, specials_data) -> list[dict[str, Any]]:
        """Parse the specials field from JSON string to list of dictionaries."""
        if not specials_data:
            return []

        try:
            # If it's already a list, return it
            if isinstance(specials_data, list):
                return specials_data

            # If it's a string, try to parse it as JSON
            if isinstance(specials_data, str):
                parsed = json.loads(specials_data)
                if isinstance(parsed, list):
                    return parsed
                logger.warning("Specials data is not a list", data_type=type(parsed))
                return []
            # If it's any other type, log and return empty list
            logger.warning(
                "Unexpected specials data type", data_type=type(specials_data)
            )
            return []
        except json.JSONDecodeError as e:
            logger.exception("Failed to parse specials JSON", error=str(e))
            return []
        except Exception as e:
            logger.exception("Error parsing specials field", error=str(e))
            return []

    def _parse_hours_json_field(self, hours_json_data) -> dict[str, Any]:
        """Parse the hours_json field from JSON string to dictionary."""
        if not hours_json_data:
            return {}

        try:
            # If it's already a dict, return it
            if isinstance(hours_json_data, dict):
                return hours_json_data

            # If it's a string, try to parse it using the robust parser
            if isinstance(hours_json_data, str):
                parsed = parse_hours_blob(hours_json_data)
                if parsed:
                    return parsed
                logger.warning(
                    "Could not parse hours data", data_type=type(hours_json_data)
                )
                return {}

            # If it's any other type, log and return empty dict
            logger.warning(
                "Unexpected hours JSON data type", data_type=type(hours_json_data)
            )
            return {}
        except Exception as e:
            logger.warning("Error parsing hours field", error=str(e))
            return {}

    def normalize_restaurant_hours(
        self,
        restaurant_id: int,
        hours_source: str = "unknown",
    ) -> bool:
        """Normalize hours for a restaurant using the HoursManager.

        Args:
            restaurant_id: ID of the restaurant
            hours_source: Source of hours data ('google_places', 'orb', 'manual')

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Import HoursManager
            hours_manager = HoursManager()

            # Get timezone from restaurant or use default
            timezone = restaurant.timezone or "America/New_York"
            hours_manager.timezone = pytz.timezone(timezone)

            # Determine which hours data to normalize
            hours_data = None
            if restaurant.hours_json:
                hours_data = restaurant.hours_json
            elif restaurant.hours_of_operation:
                hours_data = restaurant.hours_of_operation
            else:
                logger.warning(
                    "No hours data available for restaurant",
                    restaurant_id=restaurant_id,
                )
                return False

            # Normalize the hours
            normalized_hours = hours_manager.normalize_hours(hours_data, hours_source)

            # Update the restaurant with normalized hours
            restaurant.hours_json = json.dumps(normalized_hours)
            restaurant.hours_parsed = True
            restaurant.updated_at = datetime.utcnow()

            session.commit()
            logger.info(
                "Successfully normalized hours for restaurant",
                restaurant_id=restaurant_id,
            )
            return True

        except Exception as e:
            logger.exception(
                "Error normalizing hours for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def get_restaurant_hours_status(self, restaurant_id: int) -> dict[str, Any]:
        """Get comprehensive hours status for a restaurant.

        Args:
            restaurant_id: ID of the restaurant

        Returns:
            Dictionary with hours status information

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                return {"error": "Restaurant not found"}

            # Import HoursManager
            # Get timezone from restaurant or use default
            timezone = restaurant.timezone or "America/New_York"
            hours_manager = HoursManager(timezone)

            # Parse hours JSON
            hours_json = self._parse_hours_json_field(restaurant.hours_json)

            if not hours_json:
                return {
                    "status": "unknown",
                    "message": "Hours not available",
                    "is_open": False,
                    "today_hours": None,
                    "formatted_hours": [],
                }

            # Get today's hours
            today_hours = hours_manager.get_today_hours(hours_json)

            # Check if currently open
            is_open = hours_manager.is_open_now(hours_json)

            # Get formatted hours for UI
            formatted_hours = hours_manager.get_formatted_hours_for_ui(
                hours_json,
                "dropdown",
            )

            # Get today's status
            today_status = hours_manager.get_formatted_hours_for_ui(hours_json, "today")

            return {
                "status": today_status["status"],
                "message": today_status["message"],
                "is_open": is_open,
                "today_hours": today_hours,
                "formatted_hours": formatted_hours,
                "timezone": timezone,
                "last_updated": (
                    restaurant.hours_last_updated.isoformat()
                    if restaurant.hours_last_updated
                    else None
                ),
            }

        except Exception as e:
            logger.exception(
                "Error getting hours status for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return {
                "status": "error",
                "message": "Error retrieving hours",
                "is_open": False,
                "today_hours": None,
                "formatted_hours": [],
            }
        finally:
            session.close()

    def update_restaurant_hours(
        self,
        restaurant_id: int,
        hours_data: Any,
        source: str = "manual",
    ) -> bool:
        """Update restaurant hours with normalization.

        Args:
            restaurant_id: ID of the restaurant
            hours_data: Raw hours data
            source: Source of hours data ('google_places', 'orb', 'manual')

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Import HoursManager
            # Get timezone from restaurant or use default
            timezone = restaurant.timezone or "America/New_York"
            hours_manager = HoursManager(timezone)

            # Normalize the hours
            normalized_hours = hours_manager.normalize_hours(hours_data, source)

            # Update the restaurant
            restaurant.hours_json = json.dumps(normalized_hours)
            restaurant.hours_parsed = True
            restaurant.hours_last_updated = datetime.utcnow()
            restaurant.updated_at = datetime.utcnow()

            # If hours_data is a string, also update hours_of_operation for backward compatibility
            if isinstance(hours_data, str):
                restaurant.hours_of_operation = hours_data

            session.commit()
            logger.info(
                "Successfully updated hours for restaurant", restaurant_id=restaurant_id
            )
            return True

        except Exception as e:
            logger.exception(
                "Error updating hours for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def get_restaurant_by_name(self, name: str) -> dict[str, Any] | None:
        """Get restaurant by name."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.name == name).first()
            )
            if restaurant:
                return self._restaurant_to_unified_dict(restaurant)
            return None
        except Exception as e:
            logger.exception(
                "Error getting restaurant by name", name=name, error=str(e)
            )
            return None
        finally:
            session.close()

    def find_restaurant_by_name_and_address(
        self,
        name: str,
        address: str,
    ) -> dict[str, Any] | None:
        """Find restaurant by name and address (for duplicate detection)."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant)
                .filter(Restaurant.name == name)
                .filter(Restaurant.address == address)
                .first()
            )
            if restaurant:
                return self._restaurant_to_unified_dict(restaurant)
            return None
        except Exception as e:
            logger.exception(
                "Error finding restaurant by name and address",
                name=name,
                address=address,
                error=str(e),
            )
            return None
        finally:
            session.close()

    def update_restaurant_data(
        self,
        restaurant_id: int,
        restaurant_data: dict[str, Any],
    ) -> bool:
        """Update existing restaurant with new data."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error(
                    "Restaurant with ID not found", restaurant_id=restaurant_id
                )
                return False

            # Update fields that can be changed
            updateable_fields = [
                "address",
                "city",
                "state",
                "zip_code",
                "phone_number",
                "kosher_category",
                "listing_type",
                "certifying_agency",
                "is_cholov_yisroel",
                "is_pas_yisroel",
                "cholov_stam",
                "latitude",
                "longitude",
                "website",
                "image_url",
            ]

            updated = False
            for field in updateable_fields:
                if field in restaurant_data and restaurant_data[field] is not None:
                    if hasattr(restaurant, field):
                        old_value = getattr(restaurant, field)
                        new_value = restaurant_data[field]

                        # Only update if value is different
                        if old_value != new_value:
                            setattr(restaurant, field, new_value)
                            updated = True
                            logger.info(
                                "Updated field for restaurant",
                                field=field,
                                restaurant_id=restaurant_id,
                                old_value=old_value,
                                new_value=new_value,
                            )

            if updated:
                restaurant.updated_at = datetime.utcnow()
                session.commit()
                logger.info(
                    "Successfully updated restaurant", restaurant_id=restaurant_id
                )
                return True
            logger.info("No changes needed for restaurant", restaurant_id=restaurant_id)
            return True

        except Exception as e:
            logger.exception(
                "Error updating restaurant", restaurant_id=restaurant_id, error=str(e)
            )
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def update_restaurant(
        self,
        restaurant_id: int,
        update_data: dict[str, Any],
    ) -> bool:
        """Update restaurant with any fields including enhanced add eatery workflow fields."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error(
                    "Restaurant with ID not found", restaurant_id=restaurant_id
                )
                return False

            # All updateable fields including enhanced add eatery workflow fields
            updateable_fields = [
                # Core fields
                "address",
                "city",
                "state",
                "zip_code",
                "phone_number",
                "kosher_category",
                "listing_type",
                "certifying_agency",
                "is_cholov_yisroel",
                "is_pas_yisroel",
                "cholov_stam",
                "latitude",
                "longitude",
                "website",
                "image_url",
                "short_description",
                "price_range",
                "hours_open",
                "hours_of_operation",
                "google_listing_url",
                "business_email",
                # Enhanced add eatery workflow fields
                "owner_name",
                "owner_email",
                "owner_phone",
                "is_owner_submission",
                "business_license",
                "tax_id",
                "years_in_business",
                "seating_capacity",
                "delivery_available",
                "takeout_available",
                "catering_available",
                "preferred_contact_method",
                "preferred_contact_time",
                "contact_notes",
                "instagram_link",
                "facebook_link",
                "tiktok_link",
                "business_images",
                "submission_status",
                "submission_date",
                "approval_date",
                "approved_by",
                "rejection_reason",
            ]

            updated = False
            for field in updateable_fields:
                if field in update_data and update_data[field] is not None:
                    if hasattr(restaurant, field):
                        old_value = getattr(restaurant, field)
                        new_value = update_data[field]

                        # Only update if value is different
                        if old_value != new_value:
                            setattr(restaurant, field, new_value)
                            updated = True
                            logger.info(
                                "Updated field for restaurant",
                                field=field,
                                restaurant_id=restaurant_id,
                                old_value=old_value,
                                new_value=new_value,
                            )

            if updated:
                restaurant.updated_at = datetime.utcnow()
                session.commit()
                logger.info(
                    "Successfully updated restaurant", restaurant_id=restaurant_id
                )
                return True
            logger.info("No changes needed for restaurant", restaurant_id=restaurant_id)
            return True

        except Exception as e:
            logger.exception(
                "Error updating restaurant", restaurant_id=restaurant_id, error=str(e)
            )
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def delete_restaurant(self, restaurant_id: int) -> bool:
        """Delete a restaurant from the database."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error(
                    "Restaurant with ID not found", restaurant_id=restaurant_id
                )
                return False

            # Delete the restaurant
            session.delete(restaurant)
            session.commit()

            logger.info("Successfully deleted restaurant", restaurant_id=restaurant_id)
            return True

        except Exception as e:
            logger.exception(
                "Error deleting restaurant", restaurant_id=restaurant_id, error=str(e)
            )
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def upsert_restaurant(self, restaurant_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update restaurant based on name and address.

        Returns:
            Dict with 'action' ('inserted' or 'updated') and 'restaurant_id'

        """
        try:
            name = restaurant_data.get("name")
            address = restaurant_data.get("address")

            if not name or not address:
                logger.error("Name and address are required for upsert")
                return {"action": "error", "error": "Name and address required"}

            # Check if restaurant already exists
            existing = self.find_restaurant_by_name_and_address(name, address)

            if existing:
                # Update existing restaurant
                restaurant_id = existing["id"]
                if self.update_restaurant_data(restaurant_id, restaurant_data):
                    logger.info(
                        "Updated existing restaurant", name=name, address=address
                    )
                    return {
                        "action": "updated",
                        "restaurant_id": restaurant_id,
                        "restaurant": existing,
                    }
                return {"action": "error", "error": "Failed to update restaurant"}
            # Insert new restaurant
            if self.add_restaurant(restaurant_data):
                # Get the newly created restaurant
                new_restaurant = self.find_restaurant_by_name_and_address(name, address)
                if new_restaurant:
                    logger.info("Inserted new restaurant", name=name, address=address)
                    return {
                        "action": "inserted",
                        "restaurant_id": new_restaurant["id"],
                        "restaurant": new_restaurant,
                    }
                return {
                    "action": "error",
                    "error": "Failed to retrieve newly created restaurant",
                }
            return {"action": "error", "error": "Failed to insert restaurant"}

        except Exception as e:
            logger.exception("Error in upsert_restaurant", error=str(e))
            return {"action": "error", "error": str(e)}

    def update_restaurant_orb_data(
        self,
        restaurant_id: int,
        address: str,
        kosher_category: str,
        certifying_agency: str,
        extra_kosher_info: str | None = None,
    ) -> bool:
        """Update restaurant with ORB data."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )
            if restaurant:
                restaurant.address = address
                restaurant.kosher_category = kosher_category
                restaurant.certifying_agency = certifying_agency

                # Update extra kosher information
                if extra_kosher_info:
                    # Parse extra kosher info and update boolean fields
                    extra_info_lower = extra_kosher_info.lower()
                    restaurant.is_pas_yisroel = "pas yisroel" in extra_info_lower

                    # Milk supervision - mutually exclusive
                    if "cholov yisroel" in extra_info_lower:
                        restaurant.is_cholov_yisroel = True
                        restaurant.cholov_stam = False
                    elif (
                        "cholov stam" in extra_info_lower
                        or restaurant.kosher_category == "dairy"
                    ):
                        restaurant.is_cholov_yisroel = False
                        restaurant.cholov_stam = True

                restaurant.updated_at = datetime.utcnow()
                session.commit()
                logger.info(
                    "Updated restaurant with ORB data", restaurant_id=restaurant_id
                )
                return True
            return False
        except Exception as e:
            logger.exception(
                "Error updating restaurant with ORB data",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def add_restaurant_simple(
        self,
        name: str,
        address: str | None = None,
        phone_number: str | None = None,
        kosher_category: str | None = None,
        certifying_agency: str | None = None,
        extra_kosher_info: str | None = None,
        source: str = "orb",
    ) -> bool:
        """Add a new restaurant with basic information (simplified version)."""
        try:
            # Validate required fields
            if not name:
                logger.error("Restaurant name is required")
                return False

            # Set default values for required fields
            restaurant_data = {
                "name": name,
                "address": address or "Address not provided",
                "city": "City not provided",
                "state": "State not provided",
                "zip_code": "ZIP not provided",
                "phone_number": phone_number or "Phone not provided",
                "kosher_category": kosher_category or "pareve",
                "listing_type": "restaurant",
                "certifying_agency": certifying_agency or "ORB",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "hours_parsed": False,
            }

            # Set extra kosher information
            if extra_kosher_info:
                extra_info_lower = extra_kosher_info.lower()
                restaurant_data["is_pas_yisroel"] = "pas yisroel" in extra_info_lower

                # Milk supervision - mutually exclusive
                if "cholov yisroel" in extra_info_lower:
                    restaurant_data["is_cholov_yisroel"] = True
                    restaurant_data["cholov_stam"] = False
                elif "cholov stam" in extra_info_lower or kosher_category == "dairy":
                    restaurant_data["is_cholov_yisroel"] = False
                    restaurant_data["cholov_stam"] = True

            return self.add_restaurant(restaurant_data)

        except Exception as e:
            logger.exception("Error adding restaurant", name=name, error=str(e))
            return False

    def get_restaurant_specials(
        self,
        restaurant_id: int,
        paid_only: bool = False,
    ) -> list[dict[str, Any]]:
        """Get specials for a specific restaurant."""
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )
            if restaurant and restaurant.specials:
                specials = self._parse_specials_field(restaurant.specials)
                if paid_only:
                    specials = [s for s in specials if s.get("is_paid", False)]
                return specials
            return []
        except Exception as e:
            logger.exception(
                "Error getting specials for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return []
        finally:
            session.close()

    def update_special_payment_status(
        self,
        special_id: int,
        is_paid: bool,
        payment_status: str = "paid",
    ) -> bool:
        """Update payment status for a special."""
        try:
            session = self.get_session()
            # Find the restaurant that contains this special
            restaurants = session.query(Restaurant).all()

            for restaurant in restaurants:
                if restaurant.specials:
                    specials = self._parse_specials_field(restaurant.specials)
                    for special in specials:
                        if special.get("id") == special_id:
                            # Update the special
                            special["is_paid"] = is_paid
                            special["payment_status"] = payment_status
                            special["updated_at"] = datetime.utcnow().isoformat()

                            # Save back to database
                            restaurant.specials = json.dumps(specials)
                            restaurant.updated_at = datetime.utcnow()
                            session.commit()
                            logger.info(
                                "Updated special payment status", special_id=special_id
                            )
                            return True

            logger.warning("Special not found", special_id=special_id)
            return False
        except Exception as e:
            logger.exception(
                "Error updating special payment status",
                special_id=special_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def add_restaurant_special(
        self,
        restaurant_id: int,
        special_data: dict[str, Any],
    ) -> bool:
        """Add a special to a restaurant, enforcing the 3-specials limit.

        Args:
            restaurant_id: ID of the restaurant
            special_data: Special data to add

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Get current specials
            current_specials = self._parse_specials_field(restaurant.specials)

            # Check if we're at the limit
            if len(current_specials) >= 3:
                logger.error(
                    "Restaurant already has 3 specials, cannot add more",
                    restaurant_id=restaurant_id,
                )
                return False

            # Generate unique ID for the special
            special_id = self._generate_special_id()
            special_data["id"] = special_id
            special_data["created_at"] = datetime.utcnow().isoformat()
            special_data["updated_at"] = datetime.utcnow().isoformat()

            # Add the new special
            current_specials.append(special_data)

            # Update the restaurant
            restaurant.specials = json.dumps(current_specials)
            restaurant.updated_at = datetime.utcnow()

            session.commit()
            logger.info(
                "Added special to restaurant",
                restaurant_id=restaurant_id,
                total_specials=len(current_specials),
            )
            return True

        except Exception as e:
            logger.exception(
                "Error adding special to restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def update_restaurant_special(
        self,
        restaurant_id: int,
        special_id: str,
        special_data: dict[str, Any],
    ) -> bool:
        """Update a specific special for a restaurant.

        Args:
            restaurant_id: ID of the restaurant
            special_id: ID of the special to update
            special_data: Updated special data

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Get current specials
            current_specials = self._parse_specials_field(restaurant.specials)

            # Find and update the special
            special_found = False
            for i, special in enumerate(current_specials):
                if special.get("id") == special_id:
                    # Update the special data
                    special_data["id"] = special_id  # Preserve the ID
                    special_data["updated_at"] = datetime.utcnow().isoformat()
                    if "created_at" not in special_data:
                        special_data["created_at"] = special.get(
                            "created_at",
                            datetime.utcnow().isoformat(),
                        )

                    current_specials[i] = special_data
                    special_found = True
                    break

            if not special_found:
                logger.error(
                    "Special not found in restaurant",
                    special_id=special_id,
                    restaurant_id=restaurant_id,
                )
                return False

            # Update the restaurant
            restaurant.specials = json.dumps(current_specials)
            restaurant.updated_at = datetime.utcnow()

            session.commit()
            logger.info(
                "Updated special in restaurant",
                special_id=special_id,
                restaurant_id=restaurant_id,
            )
            return True

        except Exception as e:
            logger.exception(
                "Error updating special in restaurant",
                special_id=special_id,
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def remove_restaurant_special(self, restaurant_id: int, special_id: str) -> bool:
        """Remove a specific special from a restaurant.

        Args:
            restaurant_id: ID of the restaurant
            special_id: ID of the special to remove

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Get current specials
            current_specials = self._parse_specials_field(restaurant.specials)

            # Remove the special
            original_count = len(current_specials)
            current_specials = [
                s for s in current_specials if s.get("id") != special_id
            ]

            if len(current_specials) == original_count:
                logger.error(
                    "Special not found in restaurant",
                    special_id=special_id,
                    restaurant_id=restaurant_id,
                )
                return False

            # Update the restaurant
            restaurant.specials = (
                json.dumps(current_specials) if current_specials else None
            )
            restaurant.updated_at = datetime.utcnow()

            session.commit()
            logger.info(
                "Removed special from restaurant",
                special_id=special_id,
                restaurant_id=restaurant_id,
            )
            return True

        except Exception as e:
            logger.exception(
                "Error removing special from restaurant",
                special_id=special_id,
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def replace_restaurant_specials(
        self,
        restaurant_id: int,
        specials_data: list[dict[str, Any]],
    ) -> bool:
        """Replace all specials for a restaurant, enforcing the 3-specials limit.

        Args:
            restaurant_id: ID of the restaurant
            specials_data: List of specials to set

        Returns:
            True if successful, False otherwise

        """
        try:
            # Validate the number of specials
            if len(specials_data) > 3:
                logger.error(
                    "Cannot set more than 3 specials for restaurant",
                    restaurant_id=restaurant_id,
                    provided_count=len(specials_data),
                )
                return False

            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant:
                logger.error("Restaurant not found", restaurant_id=restaurant_id)
                return False

            # Process specials data
            processed_specials = []
            for special in specials_data:
                # Generate ID if not provided
                if "id" not in special:
                    special["id"] = self._generate_special_id()

                # Set timestamps
                if "created_at" not in special:
                    special["created_at"] = datetime.utcnow().isoformat()
                special["updated_at"] = datetime.utcnow().isoformat()

                processed_specials.append(special)

            # Update the restaurant
            restaurant.specials = (
                json.dumps(processed_specials) if processed_specials else None
            )
            restaurant.updated_at = datetime.utcnow()

            session.commit()
            logger.info(
                "Replaced specials for restaurant",
                restaurant_id=restaurant_id,
                total_specials=len(processed_specials),
            )
            return True

        except Exception as e:
            logger.exception(
                "Error replacing specials for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            session.rollback()
            return False
        finally:
            session.close()

    def get_specials_count(self, restaurant_id: int) -> int:
        """Get the number of specials for a restaurant.

        Args:
            restaurant_id: ID of the restaurant

        Returns:
            Number of specials (0-3)

        """
        try:
            session = self.get_session()
            restaurant = (
                session.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            )

            if not restaurant or not restaurant.specials:
                return 0

            specials = self._parse_specials_field(restaurant.specials)
            return len(specials)

        except Exception as e:
            logger.exception(
                "Error getting specials count for restaurant",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return 0
        finally:
            session.close()

    def can_add_special(self, restaurant_id: int) -> bool:
        """Check if a restaurant can add another special.

        Args:
            restaurant_id: ID of the restaurant

        Returns:
            True if can add special, False if at limit

        """
        current_count = self.get_specials_count(restaurant_id)
        return current_count < 3

    def _generate_special_id(self) -> str:
        """Generate a unique ID for a special.

        Returns:
            Unique special ID

        """
        return str(uuid.uuid4())

    def validate_specials_data(
        self,
        specials_data: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Validate specials data and return validation results.

        Args:
            specials_data: List of specials to validate

        Returns:
            Validation results with success status and any errors

        """
        errors = []
        warnings = []

        # Check count
        if len(specials_data) > 3:
            errors.append(
                f"Cannot have more than 3 specials. Provided: {len(specials_data)}",
            )

        # Validate each special
        for i, special in enumerate(specials_data):
            # Check required fields
            if not special.get("title"):
                errors.append(f"Special {i+1}: Missing required field 'title'")

            if not special.get("description"):
                errors.append(f"Special {i+1}: Missing required field 'description'")

            # Check field types
            if "is_paid" in special and not isinstance(special["is_paid"], bool):
                warnings.append(f"Special {i+1}: 'is_paid' should be boolean")

            if "price" in special and not isinstance(special["price"], (int, float)):
                warnings.append(f"Special {i+1}: 'price' should be numeric")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "count": len(specials_data),
        }

    def disconnect(self) -> None:
        """Disconnect from the database."""
        if self.session:
            self.session.close()
        if self.engine:
            self.engine.dispose()
        logger.info("Database disconnected")

    def close(self) -> None:
        """Alias for disconnect."""
        self.disconnect()

    def get_restaurants_without_websites(
        self,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Get restaurants that don't have website links.

        Args:
            limit: Maximum number of restaurants to return

        Returns:
            List of restaurant dictionaries

        """
        try:
            session = self.get_session()
            query = (
                session.query(Restaurant)
                .filter(
                    (Restaurant.website.is_(None))
                    | (Restaurant.website == "")
                    | (Restaurant.website == " "),
                )
                .order_by(Restaurant.name)
            )

            if limit:
                query = query.limit(limit)

            restaurants = query.all()

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            # Convert to dictionaries with pre-loaded images
            result = []
            for restaurant in restaurants:
                restaurant_dict = self._restaurant_to_unified_dict_with_images(
                    restaurant, restaurant_images_map.get(restaurant.id, [])
                )
                result.append(restaurant_dict)

            logger.info("Found restaurants without websites", count=len(result))
            return result

        except Exception as e:
            logger.exception("Error getting restaurants without websites", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def get_restaurants_without_recent_reviews(
        self, days: int = 30, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Get restaurants that haven't had their Google reviews updated recently.

        Args:
            days: Number of days to consider "recent" (default: 30)
            limit: Maximum number of restaurants to return (default: 10)

        Returns:
            List of restaurant dictionaries

        """
        try:
            session = self.get_session()

            # Get restaurants that either have no Google reviews or haven't been updated recently
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            restaurants = (
                session.query(Restaurant)
                .filter(
                    (Restaurant.google_reviews.is_(None))
                    | (Restaurant.updated_at < cutoff_date),
                )
                .limit(limit)
                .all()
            )

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            result = []
            for restaurant in restaurants:
                restaurant_dict = self._restaurant_to_unified_dict_with_images(
                    restaurant, restaurant_images_map.get(restaurant.id, [])
                )
                result.append(restaurant_dict)

            logger.info("Found restaurants without recent reviews", count=len(result))
            return result

        except Exception as e:
            logger.exception(
                "Error getting restaurants without recent reviews", error=str(e)
            )
            return []

        finally:
            session.close()

    def get_restaurants_without_images(self, limit: int = 10) -> list[dict[str, Any]]:
        """Get restaurants that don't have images.

        Args:
            limit: Maximum number of restaurants to return (default: 10)

        Returns:
            List of restaurant dictionaries

        """
        try:
            session = self.get_session()

            restaurants = (
                session.query(Restaurant)
                .filter(
                    (Restaurant.image_url.is_(None)) | (Restaurant.image_url == ""),
                )
                .limit(limit)
                .all()
            )

            # Eager load all restaurant images in a single query to avoid N+1
            restaurant_images_map = self._eager_load_restaurant_images(
                session, restaurants
            )

            result = []
            for restaurant in restaurants:
                restaurant_dict = self._restaurant_to_unified_dict_with_images(
                    restaurant, restaurant_images_map.get(restaurant.id, [])
                )
                result.append(restaurant_dict)

            logger.info("Found restaurants without images", count=len(result))
            return result

        except Exception as e:
            logger.exception("Error getting restaurants without images", error=str(e))
            return []

        finally:
            session.close()

    def health_check(self) -> bool:
        """Perform a health check on the database connection.

        Returns:
            True if connection is healthy, False otherwise

        """
        session = None
        try:
            session = self.get_session()
            # Try a simple query
            result = session.execute(text("SELECT 1"))
            result.fetchone()
            return True
        except Exception as e:
            logger.exception("Database health check failed", error=str(e))
            return False
        finally:
            if session:
                session.close()

    def test_connection(self) -> bool:
        """Test database connection (alias for health_check).

        Returns:
            True if connection is healthy, False otherwise

        """
        return self.health_check()

    def get_restaurant_by_id(self, restaurant_id: int) -> dict[str, Any] | None:
        """Get a restaurant by ID.

        Args:
            restaurant_id: The restaurant ID

        Returns:
            Restaurant dictionary or None if not found

        Notes:
            Implements one retry on transient database connection errors
            (e.g., SSL EOF, connection closed) and propagates errors instead
            of masking them as 404s.
        """
        last_error: Exception | None = None
        for attempt in range(2):  # initial try + 1 retry on transient errors
            session = None
            try:
                session = self.get_session()
                restaurant = (
                    session.query(Restaurant)
                    .filter(Restaurant.id == restaurant_id)
                    .first()
                )

                if restaurant:
                    return self._restaurant_to_unified_dict(restaurant)
                return None

            except (OperationalError, DBAPIError) as db_err:
                # Likely transient DB error (e.g., SSL EOF / connection dropped)
                last_error = db_err
                logger.warning(
                    "Transient database error while fetching restaurant; will retry if possible",
                    restaurant_id=restaurant_id,
                    attempt=attempt + 1,
                    error=str(db_err),
                )
                try:
                    if session:
                        session.rollback()
                except Exception:
                    pass
                finally:
                    if session:
                        try:
                            session.close()
                        except Exception:
                            pass
                # Dispose engine to drop broken connections before retry
                try:
                    if self.engine:
                        self.engine.dispose()
                except Exception:
                    pass
                # Retry once
                if attempt == 0:
                    continue
                # On second failure, propagate
                logger.error(
                    "Database error persisted after retry while fetching restaurant",
                    restaurant_id=restaurant_id,
                    error=str(db_err),
                )
                raise
            except Exception as e:
                # Non-transient or unexpected error: propagate so route returns 500
                logger.exception(
                    "Error getting restaurant",
                    restaurant_id=restaurant_id,
                    error=str(e),
                )
                raise
            finally:
                if session:
                    try:
                        session.close()
                    except Exception:
                        pass
        # If loop exits due to control flow (shouldn't happen), raise last error if any
        if last_error:
            raise last_error
        return None

    def get_restaurant_images(self, restaurant_id: int) -> list[dict[str, Any]]:
        """Get all images for a specific restaurant.

        Args:
            restaurant_id: The restaurant ID

        Returns:
            List of restaurant image dictionaries

        """
        session = None
        try:
            session = self.get_session()
            images = (
                session.query(RestaurantImage)
                .filter(RestaurantImage.restaurant_id == restaurant_id)
                .order_by(RestaurantImage.image_order.asc())
                .all()
            )

            result = []
            for image in images:
                if image.image_url:  # Only include images with valid URLs
                    result.append(
                        {
                            "id": image.id,
                            "image_url": image.image_url,
                            "image_order": image.image_order,
                            "cloudinary_public_id": image.cloudinary_public_id,
                            "created_at": (
                                image.created_at.isoformat()
                                if image.created_at
                                else None
                            ),
                            "updated_at": (
                                image.updated_at.isoformat()
                                if image.updated_at
                                else None
                            ),
                        }
                    )

            logger.info(
                "Retrieved restaurant images",
                restaurant_id=restaurant_id,
                count=len(result),
            )
            return result

        except Exception as e:
            logger.exception(
                "Error getting restaurant images",
                restaurant_id=restaurant_id,
                error=str(e),
            )
            return []
        finally:
            if session:
                try:
                    session.close()
                except Exception:
                    pass

    # Reviews methods
    def get_reviews(
        self,
        restaurant_id: int | None = None,
        status: str = "approved",
        limit: int = 10,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get reviews with optional filtering.

        Args:
            restaurant_id: Filter by restaurant ID
            status: Filter by review status (pending, approved, rejected, flagged)
            limit: Maximum number of reviews to return
            offset: Number of reviews to skip

        Returns:
            List of review dictionaries

        """
        try:
            session = self.get_session()
            query = session.query(Review)

            if restaurant_id:
                query = query.filter(Review.restaurant_id == restaurant_id)

            if status != "all":
                query = query.filter(Review.status == status)

            # Order by creation date (newest first)
            query = query.order_by(Review.created_at.desc())

            # Apply pagination
            query = query.offset(offset).limit(limit)

            reviews = query.all()

            # Convert to dictionaries
            result = []
            for review in reviews:
                review_dict = {
                    "id": review.id,
                    "restaurant_id": review.restaurant_id,
                    "user_id": review.user_id,
                    "user_name": review.user_name,
                    "user_email": review.user_email,
                    "rating": review.rating,
                    "title": review.title,
                    "content": review.content,
                    "images": json.loads(review.images) if review.images else [],
                    "status": review.status,
                    "created_at": (
                        review.created_at.isoformat() if review.created_at else None
                    ),
                    "updated_at": (
                        review.updated_at.isoformat() if review.updated_at else None
                    ),
                    "moderator_notes": review.moderator_notes,
                    "verified_purchase": review.verified_purchase,
                    "helpful_count": review.helpful_count,
                    "report_count": review.report_count,
                }
                result.append(review_dict)

            return result

        except Exception as e:
            logger.exception("Error getting reviews", error=str(e))
            return []
        finally:
            if session:
                session.close()

    def get_reviews_count(
        self,
        restaurant_id: int | None = None,
        status: str = "approved",
    ) -> int:
        """Get the total count of reviews with optional filtering.

        Args:
            restaurant_id: Filter by restaurant ID
            status: Filter by review status

        Returns:
            Total count of reviews

        """
        try:
            session = self.get_session()
            query = session.query(Review)

            if restaurant_id:
                query = query.filter(Review.restaurant_id == restaurant_id)

            if status != "all":
                query = query.filter(Review.status == status)

            return query.count()

        except Exception as e:
            logger.exception("Error getting reviews count", error=str(e))
            return 0
        finally:
            if session:
                session.close()

    def get_review_by_id(self, review_id: str) -> dict[str, Any] | None:
        """Get a review by ID.

        Args:
            review_id: The review ID

        Returns:
            Review dictionary or None if not found

        """
        try:
            session = self.get_session()
            review = session.query(Review).filter(Review.id == review_id).first()

            if review:
                return {
                    "id": review.id,
                    "restaurant_id": review.restaurant_id,
                    "user_id": review.user_id,
                    "user_name": review.user_name,
                    "user_email": review.user_email,
                    "rating": review.rating,
                    "title": review.title,
                    "content": review.content,
                    "images": json.loads(review.images) if review.images else [],
                    "status": review.status,
                    "created_at": (
                        review.created_at.isoformat() if review.created_at else None
                    ),
                    "updated_at": (
                        review.updated_at.isoformat() if review.updated_at else None
                    ),
                    "moderator_notes": review.moderator_notes,
                    "verified_purchase": review.verified_purchase,
                    "helpful_count": review.helpful_count,
                    "report_count": review.report_count,
                }
            return None

        except Exception as e:
            logger.exception("Error getting review", review_id=review_id, error=str(e))
            return None
        finally:
            if session:
                session.close()

    def create_review(self, review_data: dict[str, Any]) -> str | None:
        """Create a new review.

        Args:
            review_data: Dictionary containing review data

        Returns:
            Review ID if successful, None otherwise

        """
        try:
            session = self.get_session()

            # Generate review ID
            review_id = f"rev_{int(datetime.utcnow().timestamp())}_{hash(str(review_data)) % 10000}"

            # Create review object
            review = Review(
                id=review_id,
                restaurant_id=review_data["restaurant_id"],
                user_id=review_data["user_id"],
                user_name=review_data["user_name"],
                user_email=review_data.get("user_email"),
                rating=review_data["rating"],
                title=review_data.get("title", ""),
                content=review_data["content"],
                images=json.dumps(review_data.get("images", [])),
                status=review_data.get("status", "pending"),
                verified_purchase=review_data.get("verified_purchase", False),
            )

            session.add(review)
            session.commit()

            logger.info(
                "Created review for restaurant",
                review_id=review_id,
                restaurant_id=review_data["restaurant_id"],
            )
            return review_id

        except Exception as e:
            logger.exception("Error creating review", error=str(e))
            if session:
                session.rollback()
            return None
        finally:
            if session:
                session.close()

    def update_review(self, review_id: str, update_data: dict[str, Any]) -> bool:
        """Update a review.

        Args:
            review_id: The review ID
            update_data: Dictionary containing fields to update

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            review = session.query(Review).filter(Review.id == review_id).first()

            if not review:
                return False

            # Update fields
            if "rating" in update_data:
                review.rating = update_data["rating"]
            if "title" in update_data:
                review.title = update_data["title"]
            if "content" in update_data:
                review.content = update_data["content"]
            if "images" in update_data:
                review.images = json.dumps(update_data["images"])
            if "status" in update_data:
                review.status = update_data["status"]

            review.updated_at = datetime.utcnow()

            session.commit()

            logger.info("Updated review", review_id=review_id)
            return True

        except Exception as e:
            logger.exception("Error updating review", review_id=review_id, error=str(e))
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def delete_review(self, review_id: str) -> bool:
        """Delete a review.

        Args:
            review_id: The review ID

        Returns:
            True if successful, False otherwise

        """
        try:
            session = self.get_session()
            review = session.query(Review).filter(Review.id == review_id).first()

            if not review:
                return False

            session.delete(review)
            session.commit()

            logger.info("Deleted review", review_id=review_id)
            return True

        except Exception as e:
            logger.exception("Error deleting review", review_id=review_id, error=str(e))
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    # User Management Methods
    def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get users with optional filtering."""
        try:
            session = self.get_session()
            query = session.query(User)

            # Apply filters
            if filters:
                if filters.get("search"):
                    search = f"%{filters['search']}%"
                    query = query.filter(
                        (User.name.ilike(search)) | (User.email.ilike(search))
                    )
                if filters.get("role"):
                    if filters["role"] == "admin":
                        query = query.filter(User.isSuperAdmin == True)
                    elif filters["role"] == "user":
                        query = query.filter(User.isSuperAdmin == False)

            # Apply pagination
            users = (
                query.order_by(User.createdAt.desc()).offset(offset).limit(limit).all()
            )

            # Convert to dict format
            result = []
            for user in users:
                user_dict = {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "emailVerified": (
                        user.emailVerified.isoformat() if user.emailVerified else None
                    ),
                    "image": user.image,
                    "isSuperAdmin": user.isSuperAdmin,
                    "role": "admin" if user.isSuperAdmin else "user",
                    "createdAt": user.createdAt.isoformat() if user.createdAt else None,
                    "updatedAt": user.updatedAt.isoformat() if user.updatedAt else None,
                    "_count": {"sessions": self._get_user_session_count(user.id)},
                }
                result.append(user_dict)

            return result

        except Exception as e:
            logger.exception("Error getting users", error=str(e))
            return []
        finally:
            session.close()

    def get_users_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get total count of users with optional filtering."""
        try:
            session = self.get_session()
            query = session.query(User)

            # Apply filters
            if filters:
                if filters.get("search"):
                    search = f"%{filters['search']}%"
                    query = query.filter(
                        (User.name.ilike(search)) | (User.email.ilike(search))
                    )
                if filters.get("role"):
                    if filters["role"] == "admin":
                        query = query.filter(User.isSuperAdmin == True)
                    elif filters["role"] == "user":
                        query = query.filter(User.isSuperAdmin == False)

            return query.count()

        except Exception as e:
            logger.exception("Error getting users count", error=str(e))
            return 0
        finally:
            session.close()

    def update_user_role(self, user_id: str, is_super_admin: bool) -> bool:
        """Update user's admin role."""
        try:
            session = self.get_session()
            user = session.query(User).filter(User.id == user_id).first()

            if not user:
                return False

            user.isSuperAdmin = is_super_admin
            user.updatedAt = datetime.utcnow()
            session.commit()

            logger.info(
                "Updated user role", user_id=user_id, is_super_admin=is_super_admin
            )
            return True

        except Exception as e:
            logger.exception("Error updating user role", user_id=user_id, error=str(e))
            if session:
                session.rollback()
            return False
        finally:
            session.close()

    def delete_user(self, user_id: str) -> bool:
        """Delete a user (admin only)."""
        try:
            session = self.get_session()
            user = session.query(User).filter(User.id == user_id).first()

            if not user:
                return False

            # Don't allow deleting the last super admin
            if user.isSuperAdmin:
                admin_count = (
                    session.query(User).filter(User.isSuperAdmin == True).count()
                )
                if admin_count <= 1:
                    logger.warning("Cannot delete last super admin", user_id=user_id)
                    return False

            session.delete(user)
            session.commit()

            logger.info("Deleted user", user_id=user_id)
            return True

        except Exception as e:
            logger.exception("Error deleting user", user_id=user_id, error=str(e))
            if session:
                session.rollback()
            return False
        finally:
            session.close()

    def _eager_load_restaurant_images(
        self, session, restaurants: list[Restaurant]
    ) -> dict[int, list[dict[str, Any]]]:
        """Eager load all restaurant images for a list of restaurants to avoid N+1 queries.

        Args:
            session: Database session
            restaurants: List of restaurant objects

        Returns:
            Dictionary mapping restaurant_id to list of image dictionaries
        """
        restaurant_images_map = {}

        if not restaurants:
            return restaurant_images_map

        restaurant_ids = [r.id for r in restaurants]

        # Fetch all images for all restaurants in one query
        images_query = (
            session.query(RestaurantImage)
            .filter(RestaurantImage.restaurant_id.in_(restaurant_ids))
            .order_by(RestaurantImage.restaurant_id, RestaurantImage.image_order.asc())
            .all()
        )

        # Group images by restaurant_id
        for image in images_query:
            if image.restaurant_id not in restaurant_images_map:
                restaurant_images_map[image.restaurant_id] = []
            if image.image_url:  # Only include images with valid URLs
                restaurant_images_map[image.restaurant_id].append(
                    {
                        "id": image.id,
                        "image_url": image.image_url,
                        "image_order": image.image_order,
                        "cloudinary_public_id": image.cloudinary_public_id,
                        "created_at": (
                            image.created_at.isoformat() if image.created_at else None
                        ),
                        "updated_at": (
                            image.updated_at.isoformat() if image.updated_at else None
                        ),
                    }
                )

        logger.info(
            "Eager loaded restaurant images",
            restaurant_count=len(restaurants),
            total_images=sum(len(images) for images in restaurant_images_map.values()),
        )

        return restaurant_images_map

    def _get_user_session_count(self, user_id: str) -> int:
        """Get the number of active sessions for a user.

        Args:
            user_id: User ID to get session count for

        Returns:
            Number of active sessions
        """
        try:
            session = self.get_session()
            # Count active sessions (not expired)
            count = (
                session.query(Session)
                .filter(Session.userId == user_id, Session.expires > datetime.utcnow())
                .count()
            )
            return count
        except Exception as e:
            logger.warning("Error getting session count", user_id=user_id, error=str(e))
            return 0
        finally:
            session.close()
