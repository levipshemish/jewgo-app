"""
Shared DB-backed distance helpers using PostGIS earthdistance with safe fallbacks.

Provides tiny utility functions to calculate distances via the database to
ensure consistency and avoid Python-side Haversine implementations.
"""

from typing import Optional

from sqlalchemy import text

from utils.logging_config import get_logger
from database.connection_manager import get_connection_manager

logger = get_logger(__name__)


def _meters_via_db(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    *,
    session=None,
) -> Optional[float]:
    """Return distance in meters using DB-side functions.

    Tries earthdistance first; falls back to ST_Distance on geography.
    Returns None on failure.
    """
    try:
        owns_session = session is None
        if owns_session:
            session_cm = get_connection_manager().get_session()
        else:
            # Dummy context manager that yields provided session
            class _Noop:
                def __enter__(self_inner):
                    return session

                def __exit__(self_inner, exc_type, exc, tb):
                    return False

            session_cm = _Noop()

        with session_cm as s:
            # Try earthdistance (cube + earthdistance extensions)
            q1 = text(
                "SELECT earth_distance(ll_to_earth(:lat1,:lon1), ll_to_earth(:lat2,:lon2)) AS m"
            )
            m = s.execute(
                q1,
                {"lat1": float(lat1), "lon1": float(lon1), "lat2": float(lat2), "lon2": float(lon2)},
            ).scalar()
            if m is not None:
                return float(m)

            # Fallback: ST_Distance on geography
            q2 = text(
                """
                SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint(:lon1,:lat1),4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lon2,:lat2),4326)::geography
                ) AS m
                """
            )
            m2 = s.execute(
                q2,
                {"lat1": float(lat1), "lon1": float(lon1), "lat2": float(lat2), "lon2": float(lon2)},
            ).scalar()
            return float(m2) if m2 is not None else None
    except Exception as e:
        logger.warning(f"DB distance calculation failed: {e}")
        return None


def distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    *,
    session=None,
) -> float:
    """Distance in kilometers using database-backed calculation.

    Returns float('inf') if distance cannot be computed.
    """
    m = _meters_via_db(lat1, lon1, lat2, lon2, session=session)
    return (m / 1000.0) if m is not None else float("inf")


def distance_miles(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    *,
    session=None,
) -> float:
    """Distance in miles using database-backed calculation.

    Returns float('inf') if distance cannot be computed.
    """
    m = _meters_via_db(lat1, lon1, lat2, lon2, session=session)
    return (m / 1609.344) if m is not None else float("inf")

