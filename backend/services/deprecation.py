"""
Deprecation headers utility for API versioning.

This module provides utilities for adding deprecation headers to API responses,
helping clients understand when endpoints will be deprecated and what to migrate to.
"""

from flask import request


def attach_deprecation_headers(
    response, successor_path: str, sunset_iso: str = "2025-10-15"
) -> None:
    """
    Attach deprecation headers to a Flask response object.

    Args:
        response: Flask response object to modify
        successor_path: Path to the successor endpoint (e.g., "/api/v2/user/profile")
        sunset_iso: ISO date string when the endpoint will be removed (default: "2025-10-15")

    Example:
        # In a route handler:
        response = make_response(jsonify(data))
        attach_deprecation_headers(
            response,
            "/api/v2/user/profile",
            "2025-12-31"
        )
        return response
    """
    # Set the Deprecation header (RFC 8594)
    response.headers["Deprecation"] = "true"

    # Build the successor URL with proper scheme and host
    if request.is_secure:
        scheme = "https"
    else:
        scheme = "http"

    host = request.host
    successor_url = f"{scheme}://{host}{successor_path}"

    # Set the Link header with successor relationship (RFC 5988)
    response.headers["Link"] = f'<{successor_url}>; rel="successor-version"'

    # Set the Sunset header with the deprecation date (RFC 8594)
    response.headers["Sunset"] = sunset_iso


# Example usage for legacy endpoints
def example_legacy_user_profile():
    """
    Example of how to use deprecation headers with the legacy user profile endpoint.

    This shows how to wrap an existing response with deprecation headers
    and suggests a migration plan to the new v2 API.
    """
    # This would be in the actual route handler:
    # response = make_response(jsonify(user_data))
    # attach_deprecation_headers(
    #     response,
    #     "/api/v2/user/profile",
    #     "2025-10-15"
    # )
    # return response

    # Migration plan:
    # 1. Update clients to use /api/v2/user/profile
    # 2. The new endpoint provides the same data structure
    # 3. Legacy endpoint will return 410 Gone after sunset date
    # 4. Consider using 307 Temporary Redirect during transition period
    pass
