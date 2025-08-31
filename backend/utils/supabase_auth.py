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
import uuid
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify
from utils.logging_config import get_logger
from utils.error_handler import AuthenticationError, AuthorizationError


class RoleLookupDependencyError(Exception):
    """Raised when role lookup fails due to system dependency issues."""
    pass


# Import the new role manager
try:
    from utils.supabase_role_manager import get_role_manager

    ROLE_MANAGER_AVAILABLE = True
except ImportError:
    ROLE_MANAGER_AVAILABLE = False
    logger = get_logger(__name__)
    logger.warning("SupabaseRoleManager not available - admin roles disabled")
except ValueError as e:
    # Handle missing Supabase environment variables during import
    ROLE_MANAGER_AVAILABLE = False
    logger = get_logger(__name__)
    logger.error(f"SupabaseRoleManager environment error - admin roles disabled: {e}")
logger = get_logger(__name__)


class SupabaseAuthManager:
    """Manages Supabase JWT verification and user authentication with explicit JWKS management."""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.project_id = os.getenv("SUPABASE_PROJECT_ID")
        self.expected_audience = os.getenv("SUPABASE_JWT_AUD", "authenticated")
        # Use the correct Supabase JWKS endpoint
        self.jwks_url = (
            f"{self.supabase_url}/auth/v1/keys" if self.supabase_url else None
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
            result = self._get_jwks_key_fallback(kid)
            if result is None:
                try:
                    req_id = request.headers.get('X-Request-ID', 'unknown')
                except:
                    req_id = 'unknown'
                logger.warning(f"AUTH_401_JWKS: JWKS key unavailable for kid {kid} (fallback)", extra={"request_id": req_id})
            return result
        # Check for exponential backoff first
        if self._is_jwks_kid_in_backoff(kid):
            return None  # Early return to avoid repeated fetch attempts
            
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
        result = self._fetch_jwks_with_singleflight(kid)
        if result is None:
            try:
                req_id = request.headers.get('X-Request-ID', 'unknown')
            except:
                req_id = 'unknown'
            logger.warning(f"AUTH_401_JWKS: JWKS key fetch failed for kid {kid}", extra={"request_id": req_id})
        return result

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
                try:
                    req_id = request.headers.get('X-Request-ID', 'unknown')
                except:
                    req_id = 'unknown'
                logger.warning(f"AUTH_401_JWKS: Kid {kid} not found in JWKS response", extra={"request_id": req_id})
                # Set exponential backoff for missing kid
                self._set_jwks_failure_backoff(kid, ttl_seconds=60)
                return None
            except Exception as e:
                try:
                    req_id = request.headers.get('X-Request-ID', 'unknown')
                except:
                    req_id = 'unknown'
                logger.error(f"AUTH_401_JWKS: JWKS fetch failed for kid {kid}: {e}", extra={"request_id": req_id})
                # Set exponential backoff for fetch failures
                self._set_jwks_failure_backoff(kid, ttl_seconds=30)
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

        # Check backoff first
        if hasattr(self, "_jwks_fallback_backoff") and kid in self._jwks_fallback_backoff:
            if self._jwks_fallback_backoff[kid] > time.time():
                return None  # Still in backoff

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
                # Cache all keys with proper TTL from headers
                cache_ttl = min(self._get_cache_ttl(response.headers), self.cache_ttl)
                expires_at = time.time() + cache_ttl
                for key in jwks.get("keys", []):
                    key_kid = key.get("kid")
                    if key_kid:
                        self._jwks_fallback_cache[key_kid] = {
                            "key": key,
                            "expires_at": expires_at,
                        }
                # Return the requested key
                result = self._jwks_fallback_cache.get(kid, {}).get("key")
                if result is None:
                    try:
                        req_id = request.headers.get('X-Request-ID', 'unknown')
                    except:
                        req_id = 'unknown'
                    logger.warning(f"AUTH_401_JWKS: Kid {kid} not found in fallback JWKS", extra={"request_id": req_id})
                    # Set backoff for missing kid
                    self._set_jwks_fallback_backoff(kid, 60)
                return result
            except Exception as e:
                try:
                    req_id = request.headers.get('X-Request-ID', 'unknown')
                except:
                    req_id = 'unknown'
                logger.error(f"AUTH_401_JWKS: JWKS fallback fetch failed for kid {kid}: {e}", extra={"request_id": req_id})
                # Set backoff for fetch failures
                self._set_jwks_fallback_backoff(kid, 30)
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

    def schedule_jwks_refresh(self):
        """Schedule periodic JWKS refresh using APScheduler with multi-process guard."""
        try:
            # Check if JWKS scheduler is enabled
            if os.getenv("ENABLE_JWKS_SCHEDULER", "true").lower() != "true":
                logger.info("JWKS scheduler disabled by ENABLE_JWKS_SCHEDULER=false")
                return None
            
            # Multi-process guard using Redis lock
            if self.redis:
                lock_key = "jwks_scheduler_lock"
                got_lock = self.redis.set(lock_key, "1", nx=True, ex=300)  # 5 minute lock
                if not got_lock:
                    logger.info("JWKS scheduler already running in another process")
                    return None
            else:
                logger.warning("Redis not available - JWKS scheduler may run in multiple processes")
            
            from apscheduler.schedulers.background import BackgroundScheduler
            
            scheduler = BackgroundScheduler()
            refresh_interval = int(os.getenv("JWKS_REFRESH_INTERVAL", "3600"))  # 1 hour default
            scheduler.add_job(
                func=self.pre_warm_jwks,
                trigger="interval",
                seconds=refresh_interval,
                id="jwks_refresh",
                name="JWKS Cache Refresh"
            )
            scheduler.start()
            logger.info(f"JWKS refresh scheduled every {refresh_interval} seconds")
            return scheduler
        except ImportError:
            logger.warning("APScheduler not available - JWKS refresh not scheduled")
            return None
        except Exception as e:
            logger.error(f"Failed to schedule JWKS refresh: {e}")
            return None

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
                # JWKS error already logged in get_jwks_key - don't duplicate
                return None
            # Convert JWK to public key using PyJWT 2.x API
            try:
                from jwt.algorithms import RSAAlgorithm
                rsa_key = RSAAlgorithm.from_jwk(json.dumps(public_key))
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
                leeway=int(os.getenv('JWT_CLOCK_SKEW_LEEWAY','0')),
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                },
            )
            # Additional audience normalization check
            aud = payload.get('aud')
            if isinstance(aud, str):
                auds = [aud]
            else:
                auds = aud or []
            if self.expected_audience not in auds:
                logger.warning(f"Invalid audience: {auds}, expected: {self.expected_audience}")
                return None
            
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
            "jwt_role": payload.get("role", "authenticated"),  # Renamed to avoid confusion with admin_role
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
    
    def _is_jwks_kid_in_backoff(self, kid: str) -> bool:
        """Check if a kid is currently in exponential backoff."""
        if not self.redis:
            return False
        neg_key = f"jwks_kid_neg:{kid}"
        return bool(self.redis.exists(neg_key))
    
    def _set_jwks_failure_backoff(self, kid: str, ttl_seconds: int = 30):
        """Set exponential backoff for a failed kid lookup."""
        if not self.redis:
            return
        neg_key = f"jwks_kid_neg:{kid}"
        # Set with small TTL to prevent repeated attempts
        self.redis.setex(neg_key, ttl_seconds, "1")
        logger.info(f"JWKS kid {kid} set to backoff for {ttl_seconds}s")

    def _set_jwks_fallback_backoff(self, kid: str, ttl_seconds: int = 30):
        """Set in-process backoff for a failed kid lookup in fallback mode."""
        if not hasattr(self, "_jwks_fallback_backoff"):
            self._jwks_fallback_backoff = {}
        import time
        expires_at = time.time() + ttl_seconds
        self._jwks_fallback_backoff[kid] = expires_at
        logger.info(f"JWKS fallback kid {kid} set to backoff for {ttl_seconds}s")


def parse_sub_from_verified_token(token: str) -> Optional[str]:
    """
    Parse sub claim from verified JWT token.
    Args:
        token: JWT token to parse
    Returns:
        Sub claim value or None if verification fails
    """
    try:
        payload = supabase_auth.verify_jwt_token(token)
        if payload:
            return payload.get('sub')
        return None
    except Exception as e:
        logger.error(f"Error parsing sub from token: {e}")
        return None


def parse_sub_unverified_payload(token: str) -> Optional[str]:
    """
    Parse sub claim from JWT token payload without signature verification.
    This is used to avoid redundant JWT verification in role lookup.
    Args:
        token: JWT token to parse
    Returns:
        Sub claim value or None if parsing fails
    """
    try:
        # Decode without verification to get the payload
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get('sub')
    except Exception as e:
        logger.error(f"Error parsing sub from unverified payload: {e}")
        return None


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
        raise RoleLookupDependencyError("role-manager-unavailable")
    try:
        # First verify the JWT token
        payload = supabase_auth.verify_jwt_token(token)
        if not payload:
            logger.warning("Invalid JWT token for admin role verification")
            raise AuthenticationError("Invalid or expired token")
        # Get role manager and check admin role
        try:
            role_manager = get_role_manager()
        except ValueError as e:
            # Handle missing Supabase environment variables
            logger.error(f"role-manager-init-error (env vars missing): {e}")
            raise RoleLookupDependencyError("role-manager-init-failed")
        except Exception as e:
            logger.error(f"role-manager-init-error: {e}")
            raise RoleLookupDependencyError("role-manager-init-failed")
        # Use optimized lookup to avoid JWT re-verification
        verified_sub = payload.get('sub')
        if verified_sub:
            role_data = role_manager.get_user_admin_role_checked(token, verified_sub)
        else:
            # Fallback to original method if sub is missing from payload
            role_data = role_manager.get_user_admin_role(token)
        if role_data is None:
            # Dependency failure - raise to trigger 503
            raise RoleLookupDependencyError("role-lookup-failed")
        # Check role level
        role_level = role_data.get("level", 0)
        required_level = _get_role_level(required_role)
        if role_level >= required_level:
            logger.info(
                f"Admin role verified: {role_data.get('role')} (level {role_level})"
            )
            return {"payload": payload, "role_data": role_data}
        else:
            logger.warning(
                f"Insufficient admin role: {role_data.get('role')} (level {role_level}) < {required_role} (level {required_level})"
            )
            return None
    except RoleLookupDependencyError:
        # Re-raise dependency errors to be handled by caller
        raise
    except AuthenticationError:
        # Re-raise authentication errors to be handled by caller
        raise
    except Exception as e:
        logger.error(f"admin-role-verify-error: {e}")
        raise RoleLookupDependencyError("role-lookup-failed")


def _get_role_level(role: str) -> int:
    """Get numeric level for admin role."""
    from utils.supabase_role_manager import ROLE_LEVELS
    return ROLE_LEVELS.get(role, 0)


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
            req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
            logger.info("AUTH_SUCCESS", extra={"endpoint": request.endpoint, "request_id": req_id})
            return f(*args, **kwargs)
        except AuthenticationError as e:
            req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
            logger.warning(
                f"AUTH_401_SIG: {getattr(e, 'message', str(e))}", extra={"endpoint": request.endpoint, "request_id": req_id}
            )
            response = jsonify({"error": "unauthorized"})
            response.headers["WWW-Authenticate"] = 'Bearer realm="api"'
            return response, 401
        except Exception as e:
            req_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
            logger.error(f"AUTH_503_DEP: {e}", extra={"endpoint": request.endpoint, "request_id": req_id})
            return jsonify({"error": "unavailable"}), 503

    return decorated_function


def require_supabase_admin_role(required_role: str = "system_admin"):
    """
    DEPRECATED: Use utils.security.require_admin() instead.
    This decorator is kept for backward compatibility but will be removed.
    """
    import warnings
    warnings.warn(
        "require_supabase_admin_role is deprecated. Use utils.security.require_admin() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    # Import the canonical decorator from security module
    from utils.security import require_admin
    return require_admin(required_role)


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
