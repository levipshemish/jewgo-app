"""
Query building utilities for JewGo backend.
Provides safe, parameterized query construction with named parameters.
"""

from typing import Any, Dict, Tuple

def build_where_clause(filters: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Build WHERE clause from filters dictionary using named parameters."""
    clauses, named = [], {}

    if city := filters.get("city"):
        clauses.append("r.city = :city")
        named["city"] = city

    if state := filters.get("state"):
        clauses.append("r.state = :state")
        named["state"] = state

    if zip_code := filters.get("zip_code"):
        clauses.append("r.zip_code = :zip_code")
        named["zip_code"] = zip_code

    if (is_approved := filters.get("is_approved")) not in (None, ""):
        clauses.append("r.is_approved = :is_approved")
        named["is_approved"] = str(is_approved).lower() in ("true", "1", "t", "yes")

    if search := filters.get("search"):
        clauses.append("(r.name ILIKE :search OR r.description ILIKE :search)")
        named["search"] = f"%{search}%"

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where, named

def build_pagination_clause(page: int, limit: int) -> Tuple[str, Dict[str, int]]:
    """Build LIMIT and OFFSET clause for pagination."""
    page = max(1, page)
    limit = max(1, min(limit, 100))
    return "LIMIT :limit OFFSET :offset", {"limit": limit, "offset": (page - 1) * limit}
