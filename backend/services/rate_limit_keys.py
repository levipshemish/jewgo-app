"""
Rate limiting key generation utilities.

This module provides utilities for generating consistent rate limiting keys
based on user authentication status and request context.
"""

from flask import request, g


def key_user_or_ip() -> str:
    """
    Generate a rate limiting key based on user authentication status.

    Returns:
        - User ID if user is authenticated (g.user_id exists)
        - Client IP address if user is not authenticated

    Note:
        This function requires ProxyFix middleware to be configured
        when running behind a reverse proxy (nginx, load balancer, etc.)
        to ensure request.remote_addr returns the actual client IP
        rather than the proxy IP.

        Example ProxyFix configuration:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    Returns:
        String identifier for rate limiting

    Example:
        >>> # Authenticated user
        >>> g.user_id = "user123"
        >>> key_user_or_ip()
        "user123"

        >>> # Unauthenticated user
        >>> g.user_id = None
        >>> # request.remote_addr = "192.168.1.100"
        >>> key_user_or_ip()
        "192.168.1.100"
    """
    # Check if user is authenticated (using existing pattern from codebase)
    user_id = getattr(g, "user_id", None)
    if user_id:
        return str(user_id)

    # Fall back to IP address
    # Handle proxy headers for accurate client IP
    client_ip = request.remote_addr

    # Check for forwarded IP headers (common with reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.headers.get("X-Real-IP"):
        client_ip = request.headers.get("X-Real-IP")

    return client_ip or "unknown"
