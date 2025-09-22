#!/usr/bin/env python3
"""Helper utilities for the Specials System.

Utilities here are limited to stateless helpers used by routes/services.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional


def parse_time_window(window: str, from_iso: Optional[str], until_iso: Optional[str]) -> Tuple[datetime, datetime]:
    """Parse a time window descriptor into concrete UTC datetimes.

    window: 'now' | 'today' | 'range'
    """
    now = datetime.now(timezone.utc)
    if window == 'range':
        if not from_iso or not until_iso:
            raise ValueError("from and until parameters required for range window")
        try:
            from_time = datetime.fromisoformat(from_iso.replace('Z', '+00:00'))
            until_time = datetime.fromisoformat(until_iso.replace('Z', '+00:00'))
        except Exception as exc:
            raise ValueError("Invalid timestamp format") from exc
        return from_time, until_time
    if window == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1) - timedelta(microseconds=1)
        return start, end
    # default 'now'
    return now, now


def generate_redeem_code() -> str:
    """Generate a secure, URL-safe redeem code."""
    return secrets.token_urlsafe(10)


def is_special_active(now: datetime, valid_from: datetime, valid_until: datetime, is_active: bool) -> bool:
    """Check if a special is active at the given time."""
    if not is_active:
        return False
    return valid_from <= now <= valid_until


def safe_float(value):
    try:
        return float(value) if value is not None else None
    except Exception:
        return None


