#!/usr/bin/env python3
"""SQLAlchemy models for Specials System.

This module contains all database models for the specials system including:
- Lookup tables for extensible enums
- Main specials table with time-range support
- Media attachments for specials
- Claims tracking with user/guest support
- Analytics events for tracking interactions
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
    CheckConstraint,
    Index,
    Computed,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID, INET, TSTZRANGE
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Import the base from the main models
from .models import Base, utc_now


class DiscountKind(Base):
    """Lookup table for discount types."""
    __tablename__ = "discount_kinds"
    
    code = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    # Relationships
    specials = relationship("Special", back_populates="discount_kind")


class ClaimStatus(Base):
    """Lookup table for claim statuses."""
    __tablename__ = "claim_statuses"
    
    code = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    # Relationships
    claims = relationship("SpecialClaim", back_populates="claim_status")


class MediaKind(Base):
    """Lookup table for media types."""
    __tablename__ = "media_kinds"
    
    code = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    # Relationships
    media_items = relationship("SpecialMedia", back_populates="media_kind")


class Special(Base):
    """Main specials table with time-range support and discount configuration."""
    __tablename__ = "specials"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    
    # Restaurant reference
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    restaurant = relationship("Restaurant")
    
    # Content
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255))
    description = Column(Text)
    
    # Discount Configuration
    discount_type = Column(String, ForeignKey("discount_kinds.code"), nullable=False)
    discount_kind = relationship("DiscountKind", back_populates="specials")
    discount_value = Column(Numeric(10, 2))
    discount_label = Column(String(100), nullable=False)
    
    # Time Windows (using TSTZRANGE for efficiency)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    valid_range = Column(
        TSTZRANGE,
        Computed("tstzrange(valid_from, valid_until, '[)')", persisted=True)
    )
    
    # Limits & Rules
    max_claims_total = Column(Integer)
    max_claims_per_user = Column(Integer, default=1)
    per_visit = Column(Boolean, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Terms & Conditions
    requires_code = Column(Boolean, default=False)
    code_hint = Column(String(100))
    terms = Column(Text)
    
    # Media
    hero_image_url = Column(Text)
    
    # Audit Trail
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    media_items = relationship("SpecialMedia", back_populates="special", cascade="all, delete-orphan")
    claims = relationship("SpecialClaim", back_populates="special", cascade="all, delete-orphan")
    events = relationship("SpecialEvent", back_populates="special", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("valid_until > valid_from", name="ck_valid_window"),
        CheckConstraint(
            "discount_type <> 'percentage' OR discount_value IS NULL OR (discount_value > 0 AND discount_value <= 100)",
            name="ck_pct_value"
        ),
        CheckConstraint(
            "(max_claims_total IS NULL OR max_claims_total > 0) AND (max_claims_per_user IS NULL OR max_claims_per_user > 0)",
            name="ck_positive_limits"
        ),
    )
    
    def __repr__(self):
        return f"<Special(id={self.id}, title='{self.title}', restaurant_id={self.restaurant_id})>"


class SpecialMedia(Base):
    """Media attachments for specials (images, videos, etc.)."""
    __tablename__ = "special_media"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    
    # Special reference
    special_id = Column(UUID(as_uuid=True), ForeignKey("specials.id", ondelete="CASCADE"), nullable=False)
    special = relationship("Special", back_populates="media_items")
    
    # Media details
    kind = Column(String, ForeignKey("media_kinds.code"), nullable=False, default="image")
    media_kind = relationship("MediaKind", back_populates="media_items")
    url = Column(Text, nullable=False)
    alt_text = Column(Text)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_positive_position"),
    )
    
    def __repr__(self):
        return f"<SpecialMedia(id={self.id}, special_id={self.special_id}, kind='{self.kind}')>"


class SpecialClaim(Base):
    """Claims tracking for specials with user/guest support."""
    __tablename__ = "special_claims"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    
    # Special reference
    special_id = Column(UUID(as_uuid=True), ForeignKey("specials.id", ondelete="CASCADE"), nullable=False)
    special = relationship("Special", back_populates="claims")
    
    # User/Guest Identity (one or the other, not both)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    guest_session_id = Column(UUID(as_uuid=True), ForeignKey("guest_sessions.id", ondelete="SET NULL"))
    
    # Claim Details
    claimed_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    ip_address = Column(INET)
    user_agent = Column(Text)
    
    # Status & Redemption
    status = Column(String, ForeignKey("claim_statuses.code"), nullable=False, default="claimed")
    claim_status = relationship("ClaimStatus", back_populates="claims")
    redeemed_at = Column(DateTime(timezone=True))
    redeemed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    revoked_at = Column(DateTime(timezone=True))
    revoke_reason = Column(Text)
    
    # Generated column for daily limits
    claim_day = Column(
        DateTime,
        Computed("(claimed_at AT TIME ZONE 'UTC')::date", persisted=True)
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_user_or_guest"
        ),
    )
    
    def __repr__(self):
        return f"<SpecialClaim(id={self.id}, special_id={self.special_id}, status='{self.status}')>"


class SpecialEvent(Base):
    """Analytics events for tracking user interactions with specials."""
    __tablename__ = "special_events"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    
    # Special reference
    special_id = Column(UUID(as_uuid=True), ForeignKey("specials.id", ondelete="CASCADE"), nullable=False)
    special = relationship("Special", back_populates="events")
    
    # User/Guest Identity (one or the other, not both)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    guest_session_id = Column(UUID(as_uuid=True), ForeignKey("guest_sessions.id", ondelete="SET NULL"))
    
    # Event Details
    event_type = Column(String, nullable=False)  # 'view', 'share', 'click', 'claim'
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    ip_address = Column(INET)
    user_agent = Column(Text)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("event_type IN ('view','share','click','claim')", name="ck_event_type"),
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_ev_user_or_guest"
        ),
    )
    
    def __repr__(self):
        return f"<SpecialEvent(id={self.id}, special_id={self.special_id}, event_type='{self.event_type}')>"


# Note: User and GuestSession models should be imported from the main models
# or defined separately if they don't exist yet
