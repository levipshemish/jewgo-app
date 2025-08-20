from datetime import datetime
from typing import Any

from flask import Response, g, jsonify
from utils.logging_config import get_logger

logger = get_logger(__name__)

#!/usr/bin/env python3
"""API Response Utilities for JewGo Backend.
=======================================

Provides standardized response formatting for consistent API responses
across all endpoints.

Author: JewGo Development Team
Version: 2.0
"""


class APIResponse:
    """Standardized API response class."""

    def __init__(
        self,
        data: Any = None,
        message: str | None = None,
        status_code: int = 200,
        meta: dict[str, Any] | None = None,
    ) -> None:
        self.data = data
        self.message = message
        self.status_code = status_code
        self.meta = meta or {}
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> dict[str, Any]:
        """Convert response to dictionary format."""
        response = {
            "success": 200 <= self.status_code < 300,
            "timestamp": self.timestamp,
            "status_code": self.status_code,
        }

        if self.data is not None:
            response["data"] = self.data

        if self.message:
            response["message"] = self.message

        # Always include meta to carry request_id and any provided metadata
        meta: dict[str, Any] = {}
        try:
            request_id = getattr(g, "request_id", None)
            if request_id:
                meta["request_id"] = request_id
        except (RuntimeError, Exception):
            # Flask application context not available or other error
            pass

        if self.meta:
            meta.update(self.meta)

        if meta:
            response["meta"] = meta

        return response

    def to_response(self) -> Response:
        """Convert to Flask Response object."""
        return jsonify(self.to_dict()), self.status_code


# ============================================================================
# SUCCESS RESPONSES
# ============================================================================


def success_response(
    data: Any = None,
    message: str = "Success",
    meta: dict[str, Any] | None = None,
) -> Response:
    """Create a success response."""
    response = APIResponse(data=data, message=message, status_code=200, meta=meta)
    return response.to_response()


def created_response(
    data: Any = None,
    message: str = "Resource created successfully",
    meta: dict[str, Any] | None = None,
) -> Response:
    """Create a 201 Created response."""
    response = APIResponse(data=data, message=message, status_code=201, meta=meta)
    return response.to_response()


def paginated_response(
    data: list[Any],
    total: int,
    page: int = 1,
    limit: int = 50,
    message: str = "Success",
) -> Response:
    """Create a paginated response."""
    total_pages = (total + limit - 1) // limit

    meta = {
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }

    response = APIResponse(data=data, message=message, status_code=200, meta=meta)
    return response.to_response()


# ============================================================================
# DOMAIN-SPECIFIC RESPONSES
# ============================================================================


def restaurants_response(
    restaurants: list[dict[str, Any]],
    total: int | None = None,
    limit: int | None = None,
    offset: int | None = None,
    filters: dict[str, Any] | None = None,
) -> Response:
    """Create a standardized restaurants response."""
    if total is None:
        total = len(restaurants)

    meta = {"count": len(restaurants), "total": total}

    if limit is not None:
        meta["limit"] = limit

    if offset is not None:
        meta["offset"] = offset

    if filters:
        meta["filters"] = filters

    base = APIResponse(
        data={"restaurants": restaurants},
        message=f"Retrieved {len(restaurants)} restaurants",
        status_code=200,
        meta=meta,
    ).to_dict()

    # Backward compatibility: also expose top-level key expected by existing clients
    base["restaurants"] = restaurants
    # Provide a top-level pagination block similar to legacy responses
    pagination = {
        "limit": limit if limit is not None else meta.get("limit", 0),
        "offset": offset if offset is not None else meta.get("offset", 0),
        "count": len(restaurants),
        "total": total,
    }
    base["pagination"] = pagination
    return jsonify(base), 200


def restaurant_response(restaurant: dict[str, Any]) -> Response:
    """Create a standardized single restaurant response."""
    base = APIResponse(
        data={"restaurant": restaurant},
        message="Restaurant retrieved successfully",
        status_code=200,
    ).to_dict()

    # Backward compatibility
    base["restaurant"] = restaurant
    return jsonify(base), 200


def statistics_response(stats: dict[str, Any]) -> Response:
    """Create a standardized statistics response."""
    base = APIResponse(
        data={"statistics": stats},
        message="Statistics retrieved successfully",
        status_code=200,
    ).to_dict()

    base["statistics"] = stats
    return jsonify(base), 200


def kosher_types_response(kosher_types: list[dict[str, Any]]) -> Response:
    """Create a standardized kosher types response."""
    base = APIResponse(
        data={"kosher_types": kosher_types},
        message=f"Retrieved {len(kosher_types)} kosher types",
        status_code=200,
    ).to_dict()

    base["kosher_types"] = kosher_types
    return jsonify(base), 200


def search_response(
    results: list[dict[str, Any]],
    query: str,
    total: int | None = None,
) -> Response:
    """Create a standardized search response."""
    if total is None:
        total = len(results)

    meta = {"query": query, "count": len(results), "total": total}

    response = APIResponse(
        data={"results": results},
        message=f"Found {len(results)} results for '{query}'",
        status_code=200,
        meta=meta,
    )

    return response.to_response()


# ============================================================================
# HEALTH CHECK RESPONSES
# ============================================================================


def health_response(
    status: str = "ok",
    checks: dict[str, Any] | None = None,
    warnings: list[str] | None = None,
    error: str | None = None,
) -> Response:
    """Create a standardized health check response."""
    data = {"status": status}

    if checks:
        data["checks"] = checks

    if warnings:
        data["warnings"] = warnings

    if error:
        data["error"] = error

    # Health checks use a simpler format without the standard APIResponse wrapper
    response_data = {
        "status": status,
        "ts": datetime.utcnow().isoformat(),
    }

    if checks:
        response_data["checks"] = checks

    if warnings:
        response_data["warnings"] = warnings

    if error:
        response_data["error"] = error

    return jsonify(response_data), 200 if status in ["ok", "healthy"] else 503


def redis_health_response(
    status: str,
    redis_url: str | None = None,
    ping_time_ms: float | None = None,
    set_time_ms: float | None = None,
    get_time_ms: float | None = None,
    redis_version: str | None = None,
    connected_clients: int | None = None,
    used_memory_human: str | None = None,
    total_commands_processed: int | None = None,
    error: str | None = None,
) -> Response:
    """Create a standardized Redis health response."""
    response_data = {
        "status": status,
        "timestamp": datetime.utcnow().timestamp(),
    }

    if redis_url:
        response_data["redis_url"] = redis_url

    if ping_time_ms is not None:
        response_data["ping_time_ms"] = round(ping_time_ms, 2)

    if set_time_ms is not None:
        response_data["set_time_ms"] = round(set_time_ms, 2)

    if get_time_ms is not None:
        response_data["get_time_ms"] = round(get_time_ms, 2)

    if redis_version:
        response_data["redis_version"] = redis_version

    if connected_clients is not None:
        response_data["connected_clients"] = connected_clients

    if used_memory_human:
        response_data["used_memory_human"] = used_memory_human

    if total_commands_processed is not None:
        response_data["total_commands_processed"] = total_commands_processed

    if error:
        response_data["error"] = error

    status_code = 200 if status in ["healthy", "not_configured"] else 503
    return jsonify(response_data), status_code


def redis_stats_response(
    status: str,
    stats: dict[str, Any] | None = None,
    error: str | None = None,
) -> Response:
    """Create a standardized Redis statistics response."""
    response_data = {
        "status": status,
        "timestamp": datetime.utcnow().timestamp(),
    }

    if stats:
        response_data["stats"] = stats

    if error:
        response_data["error"] = error

    status_code = 200 if status in ["ok", "not_configured"] else 503
    return jsonify(response_data), status_code


# ============================================================================
# ERROR RESPONSES
# ============================================================================


def no_content_response() -> Response:
    """Create a 204 No Content response."""
    return "", 204


def not_found_response(
    message: str = "Resource not found",
    resource_type: str = "Resource",
) -> Response:
    """Create a 404 Not Found response."""
    response = APIResponse(
        message=message,
        status_code=404,
        meta={"resource_type": resource_type},
    )

    return response.to_response()


def error_response(
    message: str = "An error occurred",
    status_code: int = 500,
    meta: dict[str, Any] | None = None,
) -> Response:
    """Create a generic error response."""
    response = APIResponse(message=message, status_code=status_code, meta=meta)
    return response.to_response()


def validation_error_response(
    message: str = "Validation failed",
    errors: list[str] | None = None,
) -> Response:
    """Create a 400 Bad Request response for validation errors."""
    meta = {}
    if errors:
        meta["validation_errors"] = errors

    response = APIResponse(message=message, status_code=400, meta=meta)

    return response.to_response()


def unauthorized_response(
    message: str = "Unauthorized",
    details: str | None = None,
) -> Response:
    """Create a 401 Unauthorized response."""
    meta = {}
    if details:
        meta["details"] = details

    response = APIResponse(message=message, status_code=401, meta=meta)
    return response.to_response()


def forbidden_response(
    message: str = "Forbidden",
    details: str | None = None,
) -> Response:
    """Create a 403 Forbidden response."""
    meta = {}
    if details:
        meta["details"] = details

    response = APIResponse(message=message, status_code=403, meta=meta)
    return response.to_response()


def service_unavailable_response(
    message: str = "Service temporarily unavailable",
    details: str | None = None,
) -> Response:
    """Create a 503 Service Unavailable response."""
    meta = {}
    if details:
        meta["details"] = details

    response = APIResponse(message=message, status_code=503, meta=meta)
    return response.to_response()


# ============================================================================
# LEGACY COMPATIBILITY RESPONSES
# ============================================================================


def legacy_success_response(
    message: str = "Success",
    data: dict[str, Any] | None = None,
) -> Response:
    """Create a legacy-style success response for backward compatibility."""
    response_data = {"success": True}

    if message:
        response_data["message"] = message

    if data:
        response_data.update(data)

    return jsonify(response_data), 200


def legacy_error_response(
    message: str = "An error occurred",
    status_code: int = 500,
) -> Response:
    """Create a legacy-style error response for backward compatibility."""
    response_data = {"error": message}

    if status_code == 500:
        response_data["error"] = "Internal server error"

    return jsonify(response_data), status_code
