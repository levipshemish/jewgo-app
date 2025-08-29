import json
import re
from typing import Any, Dict, List
from utils.logging_config import get_logger

logger = get_logger(__name__)
# !/usr/bin/env python3
"""Robust Hours Parser for JewGo Backend.
========================================
Provides robust parsing of restaurant hours from various formats including
JSON and human-readable text with Unicode normalization.
Author: JewGo Development Team
Version: 1.0
"""
# Unicode characters that need normalization
UNICODE_SPACES = [
    "\u00a0",  # NO-BREAK SPACE
    "\u2007",  # FIGURE SPACE
    "\u2009",  # THIN SPACE
    "\u202f",  # NARROW NO-BREAK SPACE
    "\u200a",  # HAIR SPACE
]
DASHES = ["\u2013", "\u2014", "\u2212"]  # en dash, em dash, minus
DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
DAY_RE = re.compile(
    r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):\s*(.+)$", re.I
)


def _normalize_hours_text(s: str) -> str:
    """Normalize Unicode characters and formatting in hours text."""
    if not isinstance(s, str):
        return ""
    # Replace Unicode spaces with regular spaces
    for sp in UNICODE_SPACES:
        s = s.replace(sp, " ")
    # Replace Unicode dashes with regular dashes
    for d in DASHES:
        s = s.replace(d, "-")
    # Normalize spacing around dashes
    s = re.sub(r"\s+-\s+", "-", s)  # "  -  " → "-"
    s = re.sub(r"\s{2,}", " ", s).strip()  # collapse spaces
    return s


def parse_hours_blob(value: str) -> Dict[str, List[str]]:
    """
    Accepts either JSON **or** 'Day: time-range' lines.
    Returns {'Monday': ['09:00-17:00', '18:00-22:00'], ...} with 24h or original format preserved.
    """
    if not value:
        return {}
    # 1) Try JSON first
    try:
        obj = json.loads(value)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass  # fall through
    # 2) Treat as human-readable lines
    text = _normalize_hours_text(value)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    out: Dict[str, List[str]] = {d: [] for d in DAY_NAMES}
    for ln in lines:
        m = DAY_RE.match(ln)
        if not m:
            continue
        day, rest = m.group(1).title(), m.group(2)
        # split multiple ranges separated by comma
        parts = [p.strip() for p in rest.split(",") if p.strip()]
        # Optionally normalize AM/PM → 24h later, but store raw for now:
        normalized_parts = [p.replace(" AM", "AM").replace(" PM", "PM") for p in parts]
        out[day].extend(normalized_parts)
    # Drop empty days
    return {k: v for k, v in out.items() if v}


def get_restaurant_hours(restaurant_id: int, hours_raw: str) -> dict:
    """Get normalized restaurant hours with proper error handling."""
    parsed = parse_hours_blob(hours_raw)
    if not parsed:
        return {"source": "unknown", "hours": {}, "note": "unavailable"}
    return {"source": "normalized", "hours": parsed}


def validate_hours_format(hours_data: Any) -> Dict[str, Any]:
    """Validate hours data format and return validation results."""
    if not hours_data:
        return {"valid": False, "error": "No hours data provided"}
    try:
        if isinstance(hours_data, str):
            # Try to parse as JSON first
            try:
                parsed = json.loads(hours_data)
                if isinstance(parsed, dict):
                    return {"valid": True, "format": "json", "data": parsed}
            except json.JSONDecodeError:
                pass
            # Try to parse as human-readable text
            parsed = parse_hours_blob(hours_data)
            if parsed:
                return {"valid": True, "format": "text", "data": parsed}
            else:
                return {
                    "valid": False,
                    "error": "Could not parse as JSON or text format",
                }
        elif isinstance(hours_data, dict):
            return {"valid": True, "format": "dict", "data": hours_data}
        else:
            return {
                "valid": False,
                "error": f"Unsupported data type: {type(hours_data)}",
            }
    except Exception as e:
        return {"valid": False, "error": f"Validation error: {str(e)}"}
