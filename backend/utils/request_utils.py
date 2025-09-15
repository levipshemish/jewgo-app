"""
Request utility functions for consistent request handling across the application.
"""

from flask import request


def get_client_ip() -> str:
    """
    Get client IP address with proxy support.
    
    This function provides consistent IP extraction logic across the application
    to ensure CSRF tokens and other IP-based features work correctly.
    
    Returns:
        Client IP address as string
    """
    # Check X-Forwarded-For header
    xff = request.headers.get('X-Forwarded-For')
    if xff:
        # Get first IP from comma-separated list
        ip = xff.split(',')[0].strip()
        return ip
    
    # Check X-Real-IP header
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    # Fallback to remote_addr
    return request.remote_addr or 'unknown'


def get_session_id() -> str:
    """
    Get session ID for CSRF and other session-based features.
    
    This function provides consistent session ID generation logic
    across the application.
    
    Returns:
        Session ID string
    """
    from flask import g
    
    # Try to get session ID from authenticated user
    if hasattr(g, 'user') and g.user:
        user_id = g.user.get('user_id')
        if user_id:
            return f"user:{user_id}"
    
    # For unauthenticated requests, use IP-based session
    client_ip = get_client_ip()
    return f"anon:{client_ip}"