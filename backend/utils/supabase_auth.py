"""
Supabase JWT verification utilities for backend authentication.
This module provides functions to verify Supabase JWT tokens and extract user information
for marketplace seller authentication and other protected endpoints.
"""

import os
import json
import time
import jwt
import requests
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, AuthorizationError

# Import the new role manager
try:
    from utils.supabase_role_manager import get_role_manager

    ROLE_MANAGER_AVAILABLE = True
except ImportError:
    ROLE_MANAGER_AVAILABLE = False
    logger = get_logger(__name__)
    logger.warning("SupabaseRoleManager not available - admin roles disabled")
logger = get_logger(__name__)


class SupabaseAuthManager:
    """Manages Supabase JWT verification and user authentication with explicit JWKS management."""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.project_id = os.getenv("SUPABASE_PROJECT_ID")
        self.expected_audience = os.getenv("SUPABASE_JWT_AUD", "authenticated")
        self.jwks_url = (
            f"{self.supabase_url}/.well-known/jwks.json" if self.supabase_url else None
        )
        self.cache_ttl = int(os.getenv("JWKS_CACHE_TTL", "86400"))  # 24 hours
        self.refresh_interval = int(
            os.getenv("JWKS_REFRESH_INTERVAL", "3600")
        )  # 1 hour
        # Initialize Redis for JWKS caching
        try:
            from utils.redis_client import get_redis_client

            self.redis = get_redis_client()
        except ImportError:
            self.redis = None
            logger.warning("Redis not available - JWKS caching disabled")

    def get_jwks_key(self, kid: str) -> Optional[Dict]:
        """
        Get JWKS key by kid with explicit caching behavior.
        Args:
            kid: Key ID to retrieve
        Returns:
            JWK data or None if not available
        """
        if not self.redis:
            return self._get_jwks_key_fallback(kid)
        # Check cache by kid
        cache_key = f"jwks_key:{kid}"
        cached_key = self.redis.get(cache_key)
        if cached_key:
            try:
                key_data = json.loads(cached_key)
                if key_data.get("expires_at", 0) > time.time():
                    return key_data["key"]
            except (json.JSONDecodeError, KeyError):
                pass
        # Unknown kid - singleflight fetch
        return self._fetch_jwks_with_singleflight(kid)

    def _fetch_jwks_with_singleflight(self, kid: str) -> Optional[Dict]:
        """
        Fetch JWKS with singleflight pattern and no fallbacks.
        Args:
            kid: Key ID to fetch
        Returns:
            JWK data or None on failure
        """
        if not self.redis:
            return None
        lock_key = f"jwks_fetch_lock:{kid}"
        got_lock = self.redis.set(lock_key, "1", nx=True, ex=10)
        if got_lock:
            try:
                # Fetch JWKS from Supabase
                response = requests.get(self.jwks_url, timeout=5)
                response.raise_for_status()
                jwks = response.json()
                # Cache each key by kid
                for key in jwks.get("keys", []):
                    if key.get("kid") == kid:
                        cache_ttl = self._get_cache_ttl(response.headers)
                        expires_at = time.time() + cache_ttl
                        key_data = {"key": key, "expires_at": expires_at}
                        self.redis.setex(
                            f"jwks_key:{kid}", cache_ttl, json.dumps(key_data)
                        )
                        return key
                # Kid not found in JWKS
                return None
            except Exception as e:
                logger.error(f"JWKS fetch failed for kid {kid}: {e}")
                return None  # Fail closed - no fallback to old keys
            finally:
                self.redis.delete(lock_key)
        else:
            # Another process is fetching - wait briefly then fail
            time.sleep(0.1)
            return None  # Fail closed

    def _get_cache_ttl(self, headers) -> int:
        """Get cache TTL from response headers or use default."""
        try:
            cache_control = headers.get("Cache-Control", "")
            if "max-age=" in cache_control:
                import re

                match = re.search(r"max-age=(\d+)", cache_control)
                if match:
                    return min(int(match.group(1)), self.cache_ttl)
        except Exception:
            pass
        return self.cache_ttl

    def _get_jwks_key_fallback(self, kid: str) -> Optional[Dict]:
        """Fallback JWKS fetching without Redis with in-process singleflight."""
        import threading
        import time

        # In-process lock for singleflight
        if not hasattr(self, "_jwks_fallback_locks"):
            self._jwks_fallback_locks = {}
        lock_key = f"jwks_fallback_{kid}"
        if lock_key not in self._jwks_fallback_locks:
            self._jwks_fallback_locks[lock_key] = threading.Lock()
        lock = self._jwks_fallback_locks[lock_key]
        # Try to acquire lock with timeout
        if lock.acquire(timeout=1.0):
            try:
                # Check if another thread already fetched the key
                if hasattr(self, "_jwks_fallback_cache"):
                    cached_key = self._jwks_fallback_cache.get(kid)
                    if cached_key and cached_key.get("expires_at", 0) > time.time():
                        return cached_key.get("key")
                # Fetch JWKS
                response = requests.get(self.jwks_url, timeout=5)
                response.raise_for_status()
                jwks = response.json()
                # Initialize cache if needed
                if not hasattr(self, "_jwks_fallback_cache"):
                    self._jwks_fallback_cache = {}
                # Cache all keys
                cache_ttl = 3600  # 1 hour fallback cache
                expires_at = time.time() + cache_ttl
                for key in jwks.get("keys", []):
                    key_kid = key.get("kid")
                    if key_kid:
                        self._jwks_fallback_cache[key_kid] = {
                            "key": key,
                            "expires_at": expires_at,
                        }
                # Return the requested key
                return self._jwks_fallback_cache.get(kid, {}).get("key")
            except Exception as e:
                logger.error(f"JWKS fallback fetch failed for kid {kid}: {e}")
                return None
            finally:
                lock.release()
        else:
            # Lock acquisition failed - wait briefly and check cache
            time.sleep(0.1)
            if hasattr(self, "_jwks_fallback_cache"):
                cached_key = self._jwks_fallback_cache.get(kid)
                if cached_key and cached_key.get("expires_at", 0) > time.time():
                    return cached_key.get("key")
            logger.warning(f"JWKS fallback lock timeout for kid {kid}")
            return None

    def pre_warm_jwks(self):
        """Pre-warm JWKS cache on application boot."""
        if not self.redis or not self.jwks_url:
            return
        try:
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()
            cache_ttl = self._get_cache_ttl(response.headers)
            expires_at = time.time() + cache_ttl
            for key in jwks.get("keys", []):
                kid = key.get("kid")
                if kid:
                    key_data = {"key": key, "expires_at": expires_at}
                    self.redis.setex(f"jwks_key:{kid}", cache_ttl, json.dumps(key_data))
            logger.info(f"Pre-warmed {len(jwks.get('keys', []))} JWKS keys")
        except Exception as e:
            logger.error(f"JWKS pre-warming failed: {e}")

    def get_jwks(self) -> Optional[Dict[str, Any]]:
        """Get JSON Web Key Set from Supabase (legacy method)."""
        try:
            if not self.jwks_url:
                logger.error("SUPABASE_URL not configured")
                return None
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()
            logger.debug("JWKS fetched successfully")
            return jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            return None

    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Supabase JWT token with strict algorithm enforcement.
        Args:
            token: JWT token to verify
        Returns:
            Token payload or None if verification fails
        """
        try:
            if not token:
                return None
            # Decode header to get algorithm and kid
            header = jwt.get_unverified_header(token)
            # Enforce RS256 only - reject everything else
            if header.get("alg") != "RS256":
                logger.warning(f"Rejected JWT with algorithm: {header.get('alg')}")
                return None
            kid = header.get("kid")
            if not kid:
                logger.warning("JWT missing kid in header")
                return None
            # Get public key (fail-closed if not available)
            public_key = self.get_jwks_key(kid)
            if not public_key:
                logger.warning(f"JWKS key not available for kid: {kid}")
                return None
            # Convert JWK to public key
            try:
                rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(public_key)
            except Exception as e:
                logger.error(f"Failed to convert JWK to RSA key: {e}")
                return None
            # Build issuer from SUPABASE_URL or SUPABASE_PROJECT_ID
            issuer = None
            if self.project_id:
                issuer = f"https://{self.project_id}.supabase.co/auth/v1"
            elif self.supabase_url:
                # Build issuer from SUPABASE_URL
                issuer = f"{self.supabase_url.rstrip('/')}/auth/v1"
            if not issuer:
                logger.error(
                    "SUPABASE_PROJECT_ID or SUPABASE_URL not configured for issuer validation"
                )
                return None
            # Verify with strict validation
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],  # Only RS256
                issuer=issuer,
                audience=self.expected_audience,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nb": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                },
            )
            # Additional validations
            if payload.get("role") == "anon":
                logger.warning("Rejected anonymous token")
                return None
            sub = payload.get("sub")
            if not sub or not self._is_valid_uuid(sub):
                logger.warning("Invalid or missing sub claim")
                return None
            logger.debug(f"JWT token verified for user: {sub}")
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None

    def _is_valid_uuid(self, uuid_string: str) -> bool:
        """
        Validate UUID format.
        Args:
            uuid_string: String to validate
        Returns:
            True if valid UUID format
        """
        import re

        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE,
        )
        return bool(uuid_pattern.match(uuid_string))

    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Extract user information from JWT token."""
        payload = self.verify_jwt_token(token)
        if not payload:
            return None
        # Extract user information
        user_info = {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "aud": payload.get("aud"),
            "exp": payload.get("exp"),
            "iat": payload.get("iat"),
        }
        # Add app_metadata if available
        if "app_metadata" in payload:
            user_info["app_metadata"] = payload["app_metadata"]
        # Add user_metadata if available
        if "user_metadata" in payload:
            user_info["user_metadata"] = payload["user_metadata"]
        return user_info


# Global instance
supabase_auth = SupabaseAuthManager()


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify Supabase JWT token and return user information."""
    return supabase_auth.get_user_from_token(token)


def verify_supabase_admin_role(
    token: str, required_role: str = "system_admin"
) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase JWT token and check admin role.
    Args:
        token: Supabase JWT token
        required_role: Minimum required admin role level
    Returns:
        Role data if user has sufficient privileges, None otherwise
    """
    if not ROLE_MANAGER_AVAILABLE:
        logger.warning("Role manager not available - admin role verification disabled")
        return None
    try:
        # First verify the JWT token
        payload = supabase_auth.verify_jwt_token(token)
        if not payload:
            logger.warning("Invalid JWT token for admin role verification")
            return None
        # Get role manager and check admin role
        role_manager = get_role_manager()
        role_data = role_manager.get_user_admin_role(payload.get('sub'), token)
        if not role_data:
            logger.warning("No admin role found for user")
            return None
        # Check role level
        role_level = role_data.get("level", 0)
        required_level = _get_role_level(required_role)
        if role_level >= required_level:
            logger.info(
                f"Admin role verified: {role_data.get('role')} (level {role_level})"
            )
            return role_data
        else:
            logger.warning(
                f"Insufficient admin role: {role_data.get('role')} (level {role_level}) < {required_role} (level {required_level})"
            )
            return None
    except Exception as e:
        logger.error(f"Error verifying admin role: {e}")
        return None


def _get_role_level(role: str) -> int:
    """Get numeric level for admin role."""
    role_levels = {"moderator": 1, "data_admin": 2, "system_admin": 3, "super_admin": 4}
    return role_levels.get(role, 0)


def require_supabase_auth(f):
    """Decorator to require Supabase authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                raise AuthenticationError("Authorization header required")
            # Check Bearer token format
            if not auth_header.startswith("Bearer "):
                raise AuthenticationError("Bearer token required")
            token = auth_header.split(" ")[1]
            if not token:
                raise AuthenticationError("Token required")
            # Verify Supabase JWT token
            user_info = verify_supabase_token(token)
            if not user_info:
                raise AuthenticationError("Invalid or expired token")
            # Add user info to Flask g context
            from flask import g

            g.user = user_info
            # Log successful authentication
            logger.info("AUTH_SUCCESS", extra={"endpoint": request.endpoint})
            return f(*args, **kwargs)
        except AuthenticationError as e:
            logger.warning(
                f"AUTH_401_SIG: {e.message}", extra={"endpoint": request.endpoint}
            )
            response = jsonify({"error": "unauthorized"})
            response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
            return response, 401
        except Exception as e:
            logger.error(f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint})
            return jsonify({"error": "unavailable"}), 503

    return decorated_function


def require_supabase_admin_role(required_role: str = "system_admin"):
    """
    Decorator to require Supabase authentication with admin role.
    Args:
        required_role: Minimum required admin role level
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Check for Authorization header
                auth_header = request.headers.get("Authorization")
                if not auth_header:
                    raise AuthenticationError("Authorization header required")
                # Check Bearer token format
                if not auth_header.startswith("Bearer "):
                    raise AuthenticationError("Bearer token required")
                token = auth_header.split(" ")[1]
                if not token:
                    raise AuthenticationError("Token required")
                # Verify admin role
                role_data = verify_supabase_admin_role(token, required_role)
                if not role_data:
                    raise AuthorizationError("Insufficient admin privileges")
                # Add role info to Flask g context
                from flask import g

                g.admin_role = role_data
                # Log successful admin authentication
                logger.info(
                    "AUTH_SUCCESS",
                    extra={
                        "endpoint": request.endpoint,
                        "role": role_data.get("role"),
                        "level": role_data.get("level"),
                    },
                )
                return f(*args, **kwargs)
            except AuthenticationError as e:
                logger.warning(
                    f"AUTH_401_SIG: {e.message}", extra={"endpoint": request.endpoint}
                )
                response = jsonify({"error": "unauthorized"})
                response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
                return response, 401
            except AuthorizationError as e:
                logger.warning(
                    f"AUTH_403_ROLE: {e.message}", extra={"endpoint": request.endpoint}
                )
                return jsonify({"error": "forbidden"}), 403
            except Exception as e:
                logger.error(f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint})
                return jsonify({"error": "unavailable"}), 503

        return decorated_function

    return decorator


def optional_supabase_auth(f):
    """Decorator for optional Supabase authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                if token:
                    # Verify Supabase JWT token
                    user_info = verify_supabase_token(token)
                    if user_info:
                        # Add user info to Flask g context
                        from flask import g

                        g.user = user_info
                        logger.debug(
                            "AUTH_OPTIONAL_SUCCESS",
                            extra={"endpoint": request.endpoint},
                        )
                    else:
                        logger.debug(
                            "AUTH_OPTIONAL_INVALID",
                            extra={"endpoint": request.endpoint},
                        )
                else:
                    logger.debug(
                        "AUTH_OPTIONAL_EMPTY", extra={"endpoint": request.endpoint}
                    )
            else:
                logger.debug(
                    "AUTH_OPTIONAL_NO_HEADER", extra={"endpoint": request.endpoint}
                )
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(
                f"AUTH_OPTIONAL_ERROR: {e}", extra={"endpoint": request.endpoint}
            )
            # Continue without authentication
            return f(*args, **kwargs)

    return decorated_function


def get_current_supabase_user() -> Optional[Dict[str, Any]]:
    """Get current authenticated user from Flask g context."""
    from flask import g

    return getattr(g, "user", None)


def is_supabase_authenticated() -> bool:
    """Check if user is authenticated via Supabase."""
    return get_current_supabase_user() is not None


def get_supabase_user_id() -> Optional[str]:
    """Get current user ID from Supabase authentication."""
    user = get_current_supabase_user()
    return user.get("user_id") if user else None


def get_supabase_user_email() -> Optional[str]:
    """Get current user email from Supabase authentication."""
    user = get_current_supabase_user()
    return user.get("email") if user else None


# Aliases for backward compatibility
require_user_auth = require_supabase_auth
optional_user_auth = optional_supabase_auth
get_current_user = get_current_supabase_user
get_user_id = get_supabase_user_id
