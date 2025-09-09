"""
PostGIS geospatial utilities for JewGo backend.
Replaces Python Haversine calculations with PostGIS spatial functions.
"""

def user_point_sql() -> str:
    """Generate PostGIS point SQL for user coordinates."""
    return "ST_SetSRID(ST_MakePoint(:lng,:lat), 4326)::geography"

def distance_select(alias: str = "r") -> str:
    """Generate distance calculation SQL using PostGIS."""
    return f"ST_Distance({alias}.geom::geography, {user_point_sql()}) AS distance_m"

def distance_where_clause(max_distance_m: float, alias: str = "r") -> str:
    """Generate WHERE clause for distance filtering using ST_DWithin."""
    return f"ST_DWithin({alias}.geom::geography, {user_point_sql()}, :max_distance)"

def knn_order_clause(alias: str = "r") -> str:
    """Generate KNN ordering clause for nearest neighbor queries."""
    return f"ORDER BY {alias}.geom <-> ST_SetSRID(ST_MakePoint(:lng,:lat), 4326), {alias}.id"
