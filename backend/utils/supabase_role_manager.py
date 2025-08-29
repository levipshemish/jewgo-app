"""
Supabase Role Manager for admin role operations with strict fail-closed security.
This module handles Supabase admin role queries with production-hardened caching,
stampede control, and strict security boundaries that never serve expired privileges.
"""

import os
import json
import time
import random
import requests
from typing import Optional, Dict, Any
from utils.logging_config import get_logger
from utils.redis_client import get_redis_client

logger = get_logger(__name__)


class SupabaseRoleManager:
    """Manages Supabase admin role operations with strict fail-closed security."""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.base_ttl = int(os.getenv("ADMIN_ROLE_CACHE_SECONDS", "90"))
        self.redis = get_redis_client()
        if not self.supabase_url or not self.supabase_anon_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

    def get_user_admin_role(self, verified_sub: str, user_token: str) -> Optional[Dict[str, Any]]:
        """
        Get admin role for user from verified JWT token.
        Args:
            verified_sub: Verified user ID from JWT sub claim
            user_token: Verified Supabase JWT token for RPC call
        Returns:
            Dict with role data or None if no admin role or system failure
        """
        try:
            if not verified_sub:
                logger.warning("No verified user ID provided")
                return None
            # Get role with strict singleflight control
            return self._call_supabase_rpc_with_strict_locking(user_token, verified_sub)
        except Exception as e:
            logger.error(f"Error getting admin role: {e}")
            return None

    def _parse_sub_from_verified_token(self, token: str) -> Optional[str]:
        """
        Extract user_id from verified JWT token sub claim.
        Args:
            token: Verified Supabase JWT token
        Returns:
            User ID from sub claim or None if invalid
        """
        try:
            import jwt

            # Decode without verification (token already verified)
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            if not user_id or not self._is_valid_uuid(user_id):
                logger.warning(f"Invalid sub claim in token: {user_id}")
                return None
            return user_id
        except Exception as e:
            logger.error(f"Error parsing token sub claim: {e}")
            return None

    def _call_supabase_rpc_with_strict_locking(
        self, user_token: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Call Supabase RPC with strict singleflight locking and fail-closed behavior.
        Args:
            user_token: User's JWT token for authentication
            user_id: User ID for caching and locking
        Returns:
            Role data or None if system failure or expired cache
        """
        cache_key = f"admin_role:{user_id}"
        lock_key = f"lock:role:{user_id}"
        # Check cache first - only serve if within TTL
        cached = self.redis.get(cache_key)
        if cached:
            try:
                cache_data = json.loads(cached)
                if cache_data.get("expires_at", 0) > time.time():
                    logger.info(f"ROLE_CACHE_HIT for user {user_id}")
                    return cache_data
                else:
                    logger.info(f"ROLE_CACHE_EXPIRED for user {user_id}")
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Invalid cache data for user {user_id}: {e}")
        # Try to acquire lock
        got_lock = self.redis.set(lock_key, "1", nx=True, ex=5)
        if got_lock:
            try:
                logger.info(f"ROLE_LOCK_ACQUIRED for user {user_id}")
                return self._fetch_role_from_supabase(user_token, user_id, cache_key)
            finally:
                self.redis.delete(lock_key)
                logger.info(f"ROLE_LOCK_RELEASED for user {user_id}")
        else:
            # Lock exists - check cache again (within TTL only)
            logger.info(f"ROLE_LOCK_WAIT for user {user_id}")
            time.sleep(min(150, 150) / 1000.0)  # Wait up to 150ms
            cached = self.redis.get(cache_key)
            if cached:
                try:
                    cache_data = json.loads(cached)
                    if cache_data.get("expires_at", 0) > time.time():
                        logger.info(f"ROLE_CACHE_HIT_AFTER_WAIT for user {user_id}")
                        return cache_data
                except (json.JSONDecodeError, KeyError):
                    pass
            # Cache expired and lock exists - fail closed
            logger.warning(
                f"ROLE_FAIL_CLOSED for user {user_id} - expired cache with lock"
            )
            return None

    def _fetch_role_from_supabase(
        self, user_token: str, user_id: str, cache_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch role from Supabase RPC with strict timeout and error handling.
        Args:
            user_token: User's JWT token
            user_id: User ID for logging
            cache_key: Redis cache key
        Returns:
            Role data or None on failure
        """
        try:
            url = f"{self.supabase_url}/rest/v1/rpc/get_current_admin_role"
            headers = {
                "Authorization": f"Bearer {user_token}",
                "apikey": self.supabase_anon_key,
                "Content-Type": "application/json",
            }
            # Strict timeout: connect 200ms, read 400ms, total ≤600ms
            response = requests.post(
                url,
                headers=headers,
                timeout=(0.2, 0.4),  # (connect_timeout, read_timeout)
                json={},
            )
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    role_data = data[0]  # First row
                    role = role_data.get("admin_role")
                    level = role_data.get("role_level", 0)
                    if role and level > 0:
                        # Cache positive result
                        self._cache_set_role(user_id, {"role": role, "level": level})
                        logger.info(f"ROLE_DB_SUCCESS for user {user_id}: {role}")
                        return {"role": role, "level": level}
                    else:
                        # Cache negative result
                        self._cache_set_role(user_id, {"role": None, "level": 0})
                        logger.info(f"ROLE_DB_NO_ROLE for user {user_id}")
                        return {"role": None, "level": 0}
                else:
                    # No role found - cache negative result
                    self._cache_set_role(user_id, {"role": None, "level": 0})
                    logger.info(f"ROLE_DB_EMPTY for user {user_id}")
                    return {"role": None, "level": 0}
            else:
                logger.error(
                    f"ROLE_DB_FAIL for user {user_id}: HTTP {response.status_code}"
                )
                return None
        except requests.Timeout:
            logger.error(f"ROLE_DB_TIMEOUT for user {user_id}")
            return None
        except requests.RequestException as e:
            logger.error(f"ROLE_DB_REQUEST_ERROR for user {user_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"ROLE_DB_UNEXPECTED_ERROR for user {user_id}: {e}")
            return None

    def _cache_set_role(self, user_id: str, role_data: Dict[str, Any]) -> None:
        """
        Cache role data with TTL and jitter.
        Args:
            user_id: User ID for cache key
            role_data: Role data to cache
        """
        try:
            ttl = self._ttl_with_jitter(self.base_ttl)
            expires_at = time.time() + ttl
            cache_data = {
                "role": role_data.get("role"),
                "level": role_data.get("level", 0),
                "expires_at": expires_at,
            }
            cache_key = f"admin_role:{user_id}"
            self.redis.setex(cache_key, ttl, json.dumps(cache_data))
            logger.debug(f"Cached role for user {user_id} with TTL {ttl}s")
        except Exception as e:
            logger.error(f"Error caching role for user {user_id}: {e}")

    def _ttl_with_jitter(self, base_ttl: int) -> int:
        """
        Add jitter to TTL to prevent cache stampede.
        Args:
            base_ttl: Base TTL in seconds
        Returns:
            TTL with ±10% jitter
        """
        jitter = random.uniform(0.9, 1.1)
        return int(base_ttl * jitter)

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

    def invalidate_user_role(self, user_id: str) -> None:
        """
        Invalidate cached role for user.
        Args:
            user_id: User ID to invalidate
        """
        try:
            cache_key = f"admin_role:{user_id}"
            self.redis.delete(cache_key)
            logger.info(f"Invalidated role cache for user {user_id}")
        except Exception as e:
            logger.error(f"Error invalidating role cache for user {user_id}: {e}")


# Global instance
_role_manager = None


def get_role_manager() -> SupabaseRoleManager:
    """Get global role manager instance."""
    global _role_manager
    if _role_manager is None:
        _role_manager = SupabaseRoleManager()
    return _role_manager
