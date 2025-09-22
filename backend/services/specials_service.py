#!/usr/bin/env python3
"""Service layer for the Specials System.

Contains core business logic extracted from routes:
- time window parsing
- fetching active specials
- claim eligibility and creation
- redemption validation
- formatting responses
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from database.database_manager_v5 import get_database_manager_v5
from database.specials_models import Special, SpecialClaim, SpecialEvent, SpecialMedia
from services.redis_cache_service import cache_service
from utils.specials_helpers import parse_time_window as _parse_time_window, generate_redeem_code, is_special_active, safe_float


def _db_session():
    return get_database_manager_v5().get_session()


def parse_time_window(window: str, from_iso: Optional[str], until_iso: Optional[str]) -> Tuple[datetime, datetime]:
    return _parse_time_window(window, from_iso, until_iso)


def get_active_specials_for_restaurant(
    restaurant_id: int,
    time_from: datetime,
    time_until: datetime,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Special], int]:
    """Return active specials overlapping the given window for a restaurant."""
    with _db_session() as session:
        base_query = session.query(Special).filter(
            Special.restaurant_id == restaurant_id,
            Special.is_active.is_(True),
            Special.deleted_at.is_(None),
            Special.valid_from <= time_until,
            Special.valid_until >= time_from,
        )
        total = base_query.count()
        specials = (
            base_query.order_by(Special.valid_from.asc()).offset(offset).limit(limit).all()
        )
        return specials, total


def _cache_key_for_formatted(restaurant_id: int, time_from: datetime, time_until: datetime, limit: int, offset: int) -> str:
    return (
        f"restaurant:{restaurant_id}:from:{time_from.isoformat(timespec='seconds')}:"
        f"until:{time_until.isoformat(timespec='seconds')}:limit:{limit}:offset:{offset}"
    )


def get_formatted_specials_for_restaurant(
    restaurant_id: int,
    time_from: datetime,
    time_until: datetime,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Return formatted specials with simple caching (5 min TTL)."""
    cache_namespace = "specials"
    key = _cache_key_for_formatted(restaurant_id, time_from, time_until, limit, offset)

    def _compute():
        with _db_session() as session:
            base_query = session.query(Special).filter(
                Special.restaurant_id == restaurant_id,
                Special.is_active.is_(True),
                Special.deleted_at.is_(None),
                Special.valid_from <= time_until,
                Special.valid_until >= time_from,
            )
            total_local = base_query.count()
            specials_local = (
                base_query.order_by(Special.valid_from.asc()).offset(offset).limit(limit).all()
            )
            current_user_id = None  # formatting without user context for cache
            formatted = [format_special(session, s, current_user_id) for s in specials_local]
            return {"formatted": formatted, "total": total_local}

    cached = cache_service.get(key, cache_namespace)
    if cached is None:
        computed = _compute()
        cache_service.set(key, computed, ttl=300, namespace=cache_namespace)
        cached = computed
    return cached["formatted"], cached["total"]


def get_formatted_specials_all(
    time_from: datetime,
    time_until: datetime,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Return formatted specials across all restaurants with caching."""
    cache_namespace = "specials_all"
    key = (
        f"from:{time_from.isoformat(timespec='seconds')}:"
        f"until:{time_until.isoformat(timespec='seconds')}:"
        f"limit:{limit}:offset:{offset}"
    )

    def _compute():
        with _db_session() as session:
            base_query = session.query(Special).filter(
                Special.is_active.is_(True),
                Special.deleted_at.is_(None),
                Special.valid_from <= time_until,
                Special.valid_until >= time_from,
            )
            total_local = base_query.count()
            specials_local = (
                base_query.order_by(Special.valid_from.asc()).offset(offset).limit(limit).all()
            )
            formatted = [format_special(session, special, None) for special in specials_local]
            return {"formatted": formatted, "total": total_local}

    cached = cache_service.get(key, cache_namespace)
    if cached is None:
        computed = _compute()
        cache_service.set(key, computed, ttl=300, namespace=cache_namespace)
        cached = computed
    return cached["formatted"], cached["total"]


def invalidate_specials_cache_for_restaurant(restaurant_id: int) -> None:
    try:
        cache_service.delete_pattern(f"restaurant:{restaurant_id}:*", namespace="specials")
    except Exception:
        # best-effort invalidation
        pass


def refresh_active_specials_mv() -> bool:
    """Refresh materialized view outside hot paths.

    Returns True on success, False on failure.
    """
    try:
        with _db_session() as session:
            session.execute("REFRESH MATERIALIZED VIEW IF EXISTS mv_active_specials")
            session.commit()
        return True
    except Exception:
        return False


def calculate_claims_remaining(session, special: Special, user_id: Optional[str]) -> int:
    if user_id is None:
        return 0
    if special.max_claims_per_user is None:
        return 0
    if special.per_visit:
        today = datetime.now(timezone.utc).date()
        today_claims = session.query(SpecialClaim).filter(
            SpecialClaim.special_id == special.id,
            SpecialClaim.user_id == user_id,
            func.date(SpecialClaim.claimed_at) == today,
        ).count()
        return max(0, special.max_claims_per_user - today_claims)
    else:
        existing_claims = session.query(SpecialClaim).filter(
            SpecialClaim.special_id == special.id,
            SpecialClaim.user_id == user_id,
        ).count()
        return max(0, special.max_claims_per_user - existing_claims)


def can_user_claim(session, special: Special, user_id: Optional[str], guest_id: Optional[str]) -> Tuple[bool, Optional[str]]:
    now = datetime.now(timezone.utc)
    if not is_special_active(now, special.valid_from, special.valid_until, special.is_active):
        return False, "Special is not currently active"
    if special.max_claims_total:
        total_claims = session.query(SpecialClaim).filter(
            SpecialClaim.special_id == special.id
        ).count()
        if total_claims >= special.max_claims_total:
            return False, "Special has reached maximum claims limit"
    if user_id:
        remaining = calculate_claims_remaining(session, special, user_id)
        return (remaining > 0), (None if remaining > 0 else "No remaining claims")
    if guest_id:
        # Check guest duplication when configured by unique index
        existing = session.query(SpecialClaim).filter(
            SpecialClaim.special_id == special.id,
            SpecialClaim.guest_session_id == guest_id,
        ).count()
        return (existing == 0), (None if existing == 0 else "Guest already claimed")
    return False, "Either user or guest required"


def create_claim(
    special: Special,
    user_id: Optional[str],
    guest_session_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> Tuple[SpecialClaim, Optional[str]]:
    """Create a claim and an associated claim event. Returns (claim, redeem_code)."""
    with _db_session() as session:
        claim = SpecialClaim(
            special_id=special.id,
            user_id=user_id,
            guest_session_id=guest_session_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        try:
            session.add(claim)
            session.flush()
        except IntegrityError as exc:
            session.rollback()
            raise
        # Log event
        event = SpecialEvent(
            special_id=special.id,
            user_id=user_id,
            guest_session_id=guest_session_id,
            event_type='claim',
            ip_address=ip_address,
            user_agent=user_agent,
        )
        session.add(event)
        # Generate redeem code if required
        redeem_code = generate_redeem_code() if special.requires_code else None
        session.commit()
        return claim, redeem_code


def redeem_claim(claim: SpecialClaim, current_user_id: str, redeem_code: Optional[str]) -> SpecialClaim:
    """Redeem a claim; assumes upstream staff authorization checks."""
    with _db_session() as session:
        # Reload claim in this session
        db_claim = session.query(SpecialClaim).filter(
            SpecialClaim.id == claim.id,
            SpecialClaim.status == 'claimed',
        ).first()
        if not db_claim:
            from werkzeug.exceptions import NotFound
            raise NotFound("Valid claim not found")
        # In a future enhancement, verify code with server-side store/HMAC
        db_claim.status = 'redeemed'
        db_claim.redeemed_at = datetime.now(timezone.utc)
        db_claim.redeemed_by = current_user_id
        session.commit()
        return db_claim


def format_special(session, special: Special, current_user_id: Optional[str]) -> Dict[str, Any]:
    media_items = (
        session.query(SpecialMedia)
        .filter(SpecialMedia.special_id == special.id)
        .order_by(SpecialMedia.position.asc())
        .all()
    )
    can_claim_flag = True
    remaining = 0
    if current_user_id:
        remaining = calculate_claims_remaining(session, special, current_user_id)
        can_claim_flag = remaining > 0
    return {
        'id': str(special.id),
        'restaurant_id': special.restaurant_id,
        'title': special.title,
        'subtitle': special.subtitle,
        'description': special.description,
        'discount_type': special.discount_type,
        'discount_value': safe_float(special.discount_value),
        'discount_label': special.discount_label,
        'valid_from': special.valid_from.isoformat(),
        'valid_until': special.valid_until.isoformat(),
        'max_claims_total': special.max_claims_total,
        'max_claims_per_user': special.max_claims_per_user,
        'per_visit': special.per_visit,
        'is_active': special.is_active,
        'requires_code': special.requires_code,
        'code_hint': special.code_hint,
        'terms': special.terms,
        'hero_image_url': special.hero_image_url,
        'media_items': [
            {
                'id': str(item.id),
                'kind': item.kind,
                'url': item.url,
                'alt_text': item.alt_text,
                'position': item.position,
            }
            for item in media_items
        ],
        'can_claim': can_claim_flag,
        'user_claims_remaining': remaining,
        'created_at': special.created_at.isoformat(),
        'updated_at': special.updated_at.isoformat() if special.updated_at else None,
    }

