import hashlib
import hmac
import ipaddress
import os
import secrets
import time
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from flask import jsonify, make_response, request
from utils.logging_config import get_logger

logger = get_logger(__name__)

"""Security Utilities for JewGo App.

This module provides security utilities for protecting scraper and admin endpoints
including IP restriction, token-based authentication, and request validation.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""

F = TypeVar("F", bound=Callable[..., Any])

# Token type constants
TOKEN_TYPE_ADMIN = "admin"
TOKEN_TYPE_SCRAPER = "scraper"


class SecurityManager:
    """Security manager for protecting sensitive endpoints."""

    def __init__(self) -> None:
        """Initialize the security manager."""
        self.allowed_ips = self._load_allowed_ips()
        self.admin_tokens = self._load_admin_tokens()
        self.scraper_tokens = self._load_scraper_tokens()
        self.rate_limit_config = self._load_rate_limit_config()

    def _load_allowed_ips(self) -> list[str]:
        """Load allowed IP addresses from environment variables."""
        allowed_ips = []

        # Load from environment variables
        env_ips = os.environ.get("ALLOWED_IPS", "")
        if env_ips:
            allowed_ips.extend([ip.strip() for ip in env_ips.split(",") if ip.strip()])

        # Add common local IPs for development
        if os.environ.get("ENVIRONMENT") != "production":
            allowed_ips.extend(
                [
                    "127.0.0.1",
                    "localhost",
                    "::1",
                ],
            )

        # Add Render internal IPs if on Render
        if os.environ.get("RENDER"):
            allowed_ips.extend(
                [
                    "10.0.0.0/8",  # Render internal network
                    "172.16.0.0/12",  # Render internal network
                    "192.168.0.0/16",  # Render internal network
                ],
            )

        logger.info("Loaded %d allowed IP addresses", len(allowed_ips))
        return allowed_ips

    def _load_admin_tokens(self) -> dict[str, dict[str, any]]:
        """Load admin tokens from environment variables."""
        tokens = {}

        # Load from environment variables
        admin_token = os.environ.get("ADMIN_TOKEN")
        if admin_token:
            tokens[admin_token] = {
                "type": "admin",
                "permissions": ["read", "write", "delete", "admin"],
                "created_at": time.time(),
                "description": "Admin token from environment",
            }

        # Load additional admin tokens
        for i in range(1, 6):  # Support up to 5 additional tokens
            token_key = f"ADMIN_TOKEN_{i}"
            token_value = os.environ.get(token_key)
            if token_value:
                tokens[token_value] = {
                    "type": "admin",
                    "permissions": ["read", "write", "delete", "admin"],
                    "created_at": time.time(),
                    "description": f"Admin token {i} from environment",
                }

        logger.info("Loaded %d admin tokens", len(tokens))
        return tokens

    def _load_scraper_tokens(self) -> dict[str, dict[str, any]]:
        """Load scraper tokens from environment variables."""
        tokens = {}

        # Load from environment variables
        scraper_token = os.environ.get("SCRAPER_TOKEN")
        if scraper_token:
            tokens[scraper_token] = {
                "type": "scraper",
                "permissions": ["scrape"],
                "created_at": time.time(),
                "description": "Scraper token from environment",
            }

        # Load additional scraper tokens
        for i in range(1, 6):  # Support up to 5 additional tokens
            token_key = f"SCRAPER_TOKEN_{i}"
            token_value = os.environ.get(token_key)
            if token_value:
                tokens[token_value] = {
                    "type": "scraper",
                    "permissions": ["scrape"],
                    "created_at": time.time(),
                    "description": f"Scraper token {i} from environment",
                }

        logger.info("Loaded %d scraper tokens", len(tokens))
        return tokens

    def _load_rate_limit_config(self) -> dict[str, any]:
        """Load rate limiting configuration from environment variables."""
        return {
            "scraper_requests_per_hour": int(
                os.environ.get("SCRAPER_RATE_LIMIT_HOUR", "100"),
            ),
            "admin_requests_per_hour": int(
                os.environ.get("ADMIN_RATE_LIMIT_HOUR", "50")
            ),
            "ip_requests_per_hour": int(os.environ.get("IP_RATE_LIMIT_HOUR", "1000")),
            "token_requests_per_hour": int(
                os.environ.get("TOKEN_RATE_LIMIT_HOUR", "500"),
            ),
        }

    def is_ip_allowed(self, ip_address: str) -> bool:
        """Check if an IP address is allowed to access protected endpoints.

        Args:
            ip_address: IP address to check

        Returns:
            True if IP is allowed, False otherwise

        """
        # Check exact IP match
        if ip_address in self.allowed_ips:
            return True

        # Check CIDR ranges
        for allowed_ip in self.allowed_ips:
            if "/" in allowed_ip and self._ip_in_cidr(ip_address, allowed_ip):
                return True

        return False

    def _ip_in_cidr(self, ip: str, cidr: str) -> bool:
        """Check if an IP address is within a CIDR range.

        Args:
            ip: IP address to check
            cidr: CIDR range (e.g., "192.168.1.0/24")

        Returns:
            True if IP is in CIDR range, False otherwise

        """
        try:
            return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr)
        except ValueError:
            return False

    def validate_token(
        self,
        token: str,
        required_permissions: list[str] | None = None,
    ) -> dict[str, any]:
        """Validate an authentication token.

        Args:
            token: Token to validate
            required_permissions: List of required permissions

        Returns:
            Token information if valid, empty dict if invalid

        """
        if not token:
            return {}

        # Check admin tokens
        if token in self.admin_tokens:
            token_info = self.admin_tokens[token]
            if self._has_permissions(token_info, required_permissions or []):
                return token_info

        # Check scraper tokens
        if token in self.scraper_tokens:
            token_info = self.scraper_tokens[token]
            if self._has_permissions(token_info, required_permissions or []):
                return token_info

        return {}

    def _has_permissions(
        self,
        token_info: dict[str, any],
        required_permissions: list[str],
    ) -> bool:
        """Check if token has required permissions.

        Args:
            token_info: Token information dictionary
            required_permissions: List of required permissions

        Returns:
            True if token has required permissions, False otherwise

        """
        if not required_permissions:
            return True

        token_permissions = token_info.get("permissions", [])
        return all(perm in token_permissions for perm in required_permissions)

    def generate_token(
        self,
        token_type: str = TOKEN_TYPE_SCRAPER,
        permissions: list[str] | None = None,
    ) -> str:
        """Generate a new authentication token.

        Args:
            token_type: Type of token ('admin' or 'scraper')
            permissions: List of permissions for the token

        Returns:
            Generated token string
        """
        # Generate a secure random token
        token = secrets.token_urlsafe(32)

        # Set default permissions based on type
        if permissions is None:
            if token_type == TOKEN_TYPE_ADMIN:
                permissions = ["read", "write", "delete", "admin"]
            else:
                permissions = ["read", "write"]

        # Create token info
        token_info = {
            "type": token_type,
            "permissions": permissions,
            "created_at": time.time(),
            "description": f"{token_type} token generated at {time.time()}",
        }

        # Store token based on type
        if token_type == TOKEN_TYPE_ADMIN:
            self.admin_tokens[token] = token_info
        else:
            self.scraper_tokens[token] = token_info

        logger.info("Generated %s token with permissions: %s", token_type, permissions)
        return token

    # Compatibility method expected by tests
    def validate_admin_token(self, token: str) -> dict[str, Any] | None:  # type: ignore[name-defined]
        """Validate an admin token and return token info if valid.

        This mirrors validate_token but restricts to admin tokens for tests.
        """
        if not token:
            return None
        token_info = self.admin_tokens.get(token)
        if token_info and self._has_permissions(token_info, ["admin"]):
            return token_info
        return None

    def get_client_ip(self) -> str:
        """Get the client IP address from the request.

        Returns:
            Client IP address

        """
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to remote address
        return request.remote_addr

    def log_security_event(self, event_type: str, details: dict[str, any]) -> None:
        """Log a security event.

        Args:
            event_type: Type of security event
            details: Additional event details

        """
        client_ip = self.get_client_ip()
        user_agent = request.headers.get("User-Agent", "Unknown")

        logger.warning(
            "Security event: %s",
            event_type,
            client_ip=client_ip,
            user_agent=user_agent,
            **details,
        )


# Global security manager instance
security_manager = SecurityManager()


def require_ip_restriction(f: F) -> F:
    """Require IP restriction for endpoints."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        client_ip = security_manager.get_client_ip()
        if not security_manager.is_ip_allowed(client_ip):
            security_manager.log_security_event(
                "unauthorized_ip_access",
                {"ip": client_ip, "endpoint": request.endpoint},
            )
            return make_response(jsonify({"error": "Access denied"}), 403)
        return f(*args, **kwargs)

    return decorated_function


def require_token_auth(
    required_permissions: list[str] | None = None,
) -> Callable[[F], F]:
    """Require token authentication for endpoints.

    Args:
        required_permissions: List of required permissions

    """

    def decorator(f: F) -> F:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # Get token from headers
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                security_manager.log_security_event(
                    "missing_token",
                    {"endpoint": request.endpoint},
                )
                return make_response(
                    jsonify({"error": "Missing or invalid authorization header"}),
                    401,
                )

            token = auth_header[7:]  # Remove "Bearer " prefix
            token_info = security_manager.validate_token(token, required_permissions)

            if not token_info:
                security_manager.log_security_event(
                    "invalid_token",
                    {"endpoint": request.endpoint, "token": token[:8] + "..."},
                )
                return make_response(
                    jsonify({"error": "Invalid or expired token"}), 401
                )

            # Add token info to request context
            request.token_info = token_info
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_admin_auth(f: F) -> F:
    """Require admin authentication for endpoints."""
    return require_token_auth(["admin"])(f)


def require_scraper_auth(f: F) -> F:
    """Require scraper authentication for endpoints."""
    return require_token_auth(["scrape"])(f)


def validate_request_data(
    required_fields: list[str] | None = None,
    optional_fields: list[str] | None = None,  # noqa: ARG001
) -> Callable[[F], F]:
    """Validate request data.

    Args:
        required_fields: List of required fields
        optional_fields: List of optional fields (unused)

    """

    def decorator(f: F) -> F:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            if request.method in ["POST", "PUT", "PATCH"]:
                data = request.get_json()
                if not data:
                    return make_response(jsonify({"error": "Invalid JSON data"}), 400)

                # Validate required fields
                if required_fields:
                    missing_fields = [
                        field for field in required_fields if field not in data
                    ]
                    if missing_fields:
                        return make_response(
                            jsonify(
                                {
                                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                                }
                            ),
                            400,
                        )

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def log_request(f: F) -> F:
    """Log all requests to protected endpoints."""

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        client_ip = security_manager.get_client_ip()
        user_agent = request.headers.get("User-Agent", "Unknown")

        logger.info(
            "Protected endpoint accessed: %s",
            request.endpoint,
            method=request.method,
            client_ip=client_ip,
            user_agent=user_agent,
        )

        return f(*args, **kwargs)

    return decorated_function


def generate_secure_token(length: int = 32) -> str:
    """Generate a secure random token.

    Args:
        length: Length of the token in bytes

    Returns:
        Generated token string

    """
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    """Hash a token for secure storage.

    Args:
        token: Token to hash

    Returns:
        Hashed token string

    """
    return hashlib.sha256(token.encode()).hexdigest()


def verify_token_hash(token: str, token_hash: str) -> bool:
    """Verify a token against its hash.

    Args:
        token: Token to verify
        token_hash: Hash to verify against

    Returns:
        True if token matches hash, False otherwise

    """
    return hmac.compare_digest(hash_token(token), token_hash)
