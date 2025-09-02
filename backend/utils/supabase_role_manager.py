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
import threading
from typing import Optional, Dict, Any
from utils.logging_config import get_logger
from utils.redis_client import get_redis_client

logger = get_logger(__name__)

# Single source of truth for role levels
ROLE_LEVELS = {
    "moderator": 1,
    "data_admin": 2, 
    "system_admin": 3,
    "super_admin": 4
}

# Module-level locks for singleflight when Redis is disabled
_fallback_locks = {}
_fallback_locks_lock = threading.Lock()


class SupabaseRoleManager:
    """Manages Supabase admin role operations with strict fail-closed security."""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.base_ttl = int(os.getenv("ADMIN_ROLE_CACHE_TTL", os.getenv("ADMIN_ROLE_CACHE_SECONDS", "90")))
        
        # Initialize Redis with graceful degradation
        try:
            self.redis = get_redis_client()
            if not self.redis:
                logger.warning("STARTUP_WARNING: Redis client not available - admin role caching disabled. Performance may be degraded under load.")
                self.redis = None
        except Exception as e:
            logger.warning(f"STARTUP_WARNING: Failed to initialize Redis client: {e} - admin role caching disabled. Performance may be degraded under load.")
            self.redis = None
        
        # Initialize in-process cache fallback for when Redis is unavailable
        self._fallback_cache = {}
        self._fallback_cache_lock = threading.Lock()
        self._fallback_cache_ttl = 60  # Short 60-second TTL for in-process cache
        
        # Require URL, but allow missing anon key (optional header)
        if not self.supabase_url:
            raise ValueError("SUPABASE_URL must be set")

    def get_user_admin_role(self, user_token: str) -> Optional[Dict[str, Any]]:
        """
        Get admin role for user from verified JWT token.
        Args:
            user_token: Verified Supabase JWT token for RPC call
        Returns:
            Dict with role data or None if no admin role or system failure
        """
        try:
            # Always derive user_id from verified token to prevent confused-deputy attacks
            from utils.supabase_auth import parse_sub_from_verified_token
            user_id = parse_sub_from_verified_token(user_token)
            if not user_id:
                logger.error("Could not parse sub from verified token - rejecting request")
                return None
            
            # Get role with strict singleflight control
            return self._call_supabase_rpc_with_strict_locking(user_token, user_id)
        except Exception as e:
            logger.error(f"Error getting admin role: {e}")
            return None

    def get_user_admin_role_checked(self, user_token: str, verified_sub: str) -> Optional[Dict[str, Any]]:
        """
        Get admin role for user with hard equality check on user_id.
        Args:
            user_token: Supabase JWT token for RPC call (already verified)
            verified_sub: User ID from already-verified JWT payload
        Returns:
            Dict with role data or None if no admin role or system failure
        """
        try:
            # Parse sub from token header without re-verification to prevent confused-deputy attacks
            from utils.supabase_auth import parse_sub_unverified_payload
            token_sub = parse_sub_unverified_payload(user_token)
            if not token_sub:
                logger.error("Could not parse sub from token header - rejecting request")
                return None
            
            # Hard equality check - fail-closed if mismatch
            if token_sub != verified_sub:
                logger.error(f"Token sub ({token_sub}) does not match verified_sub ({verified_sub}) - rejecting request")
                return None
            
            return self._call_supabase_rpc_with_strict_locking(user_token, verified_sub)
        except Exception as e:
            logger.error(f"Error getting admin role with verified sub: {e}")
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
        
        # If Redis is not available, use in-process caching and singleflight
        if not self.redis:
            logger.debug(f"Redis not available - using in-process cache and singleflight for user {user_id}")
            
            # Check in-process cache first
            with self._fallback_cache_lock:
                cached_data = self._fallback_cache.get(user_id)
                if cached_data and cached_data.get("expires_at", 0) > time.time():
                    logger.debug(f"FALLBACK_CACHE_HIT for user {user_id}")
                    return cached_data
                    
            # Cache miss or expired - fetch with singleflight
            result = self._fetch_role_from_supabase_with_singleflight(user_token, user_id)
            
            # Cache the result if successful and normalize shape
            if result is not None:
                with self._fallback_cache_lock:
                    expires_at = time.time() + self._ttl_with_jitter(self._fallback_cache_ttl)
                    cache_data = {
                        "role": result.get("role"),
                        "level": result.get("level", 0),
                        "expires_at": expires_at,
                    }
                    self._fallback_cache[user_id] = cache_data
                    logger.debug(
                        f"FALLBACK_CACHE_SET for user {user_id} with TTL {self._fallback_cache_ttl}s"
                    )

                    # Cleanup expired entries to prevent memory leaks
                    self._cleanup_fallback_cache()

                return cache_data

            return result
        
        # Check cache first - only serve if within TTL
        cached = self.redis.get(cache_key)
        if cached:
            try:
                # Handle potential bytes response from Redis
                if isinstance(cached, (bytes, bytearray)):
                    cached = cached.decode('utf-8')
                cache_data = json.loads(cached)
                if cache_data.get("expires_at", 0) > time.time():
                    logger.debug(f"ROLE_CACHE_HIT for user {user_id}")
                    return cache_data
                else:
                    logger.debug(f"ROLE_CACHE_EXPIRED for user {user_id}")
            except (json.JSONDecodeError, KeyError, UnicodeDecodeError) as e:
                logger.warning(f"Invalid cache data for user {user_id}: {e}")
        # Try to acquire lock
        got_lock = self.redis.set(lock_key, "1", nx=True, ex=5)
        if got_lock:
            try:
                logger.debug(f"ROLE_LOCK_ACQUIRED for user {user_id}")
                return self._fetch_role_from_supabase(user_token, user_id, cache_key)
            finally:
                self.redis.delete(lock_key)
                logger.debug(f"ROLE_LOCK_RELEASED for user {user_id}")
        else:
            # Lock exists - check cache again (within TTL only)
            logger.debug(f"ROLE_LOCK_WAIT for user {user_id}")
            time.sleep(min(150, 150) / 1000.0)  # Wait up to 150ms
            cached = self.redis.get(cache_key)
            if cached:
                try:
                    # Handle potential bytes response from Redis
                    if isinstance(cached, (bytes, bytearray)):
                        cached = cached.decode('utf-8')
                    cache_data = json.loads(cached)
                    if cache_data.get("expires_at", 0) > time.time():
                        logger.debug(f"ROLE_CACHE_HIT_AFTER_WAIT for user {user_id}")
                        return cache_data
                except (json.JSONDecodeError, KeyError, UnicodeDecodeError):
                    pass
            # Cache expired and lock exists - fail closed
            logger.warning(
                f"ROLE_FAIL_CLOSED for user {user_id} - expired cache with lock"
            )
            return None

    def _fetch_role_from_supabase_with_singleflight(
        self, user_token: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch role from Supabase with in-process singleflight when Redis is disabled.
        Args:
            user_token: User's JWT token
            user_id: User ID for logging and locking
        Returns:
            Role data or None on failure
        """
        # Get or create lock for this user_id
        with _fallback_locks_lock:
            if user_id not in _fallback_locks:
                _fallback_locks[user_id] = threading.Lock()
            lock = _fallback_locks[user_id]
        
        # Try to acquire lock with timeout
        if lock.acquire(timeout=1.0):
            try:
                logger.debug(f"ROLE_FALLBACK_LOCK_ACQUIRED for user {user_id}")
                return self._fetch_role_from_supabase(user_token, user_id, cache_key=None)
            finally:
                lock.release()
                logger.debug(f"ROLE_FALLBACK_LOCK_RELEASED for user {user_id}")
        else:
            # Lock acquisition failed - wait briefly then check cache again with TTL validation
            import time
            time.sleep(0.1 + random.uniform(0, 0.05))  # 100-150ms jitter
            
            # Recheck in-process cache and validate TTL (fail-closed if expired)
            with self._fallback_cache_lock:
                cached_data = self._fallback_cache.get(user_id)
                if cached_data and cached_data.get("expires_at", 0) > time.time():
                    logger.debug(f"ROLE_FALLBACK_CACHE_HIT_AFTER_WAIT for user {user_id}")
                    return cached_data
                else:
                    # Cache expired or missing - fail closed
                    logger.warning(f"ROLE_FALLBACK_LOCK_TIMEOUT for user {user_id} - expired cache")
                    return None

    def _fetch_role_from_supabase(
        self, user_token: str, user_id: str, cache_key: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch role from Supabase RPC with strict timeout and error handling.
        Args:
            user_token: User's JWT token
            user_id: User ID for logging
            cache_key: Redis cache key (optional, only used if Redis is available)
        Returns:
            Role data or None on failure
        """
        try:
            url = f"{self.supabase_url}/rest/v1/rpc/get_current_admin_role"
            headers = {
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json",
            }
            # Only include apikey header if anon key is available
            if self.supabase_anon_key:
                headers["apikey"] = self.supabase_anon_key
            # Strict timeout: connect 200ms, read 400ms, total ≤600ms
            response = requests.post(
                url,
                headers=headers,
                timeout=(0.2, 0.4),  # (connect_timeout, read_timeout)
                json={},
            )
            if response.status_code == 200:
                data = response.json()
                row = data[0] if isinstance(data, list) and data else (data if isinstance(data, dict) else None)
                if row is not None:
                    role = row.get("admin_role")
                    level = row.get("role_level", 0)
                    if role and level > 0:
                        # Cache positive result only if Redis is available
                        if self.redis:
                            self._cache_set_role(user_id, {"role": role, "level": level})
                        logger.info(f"ROLE_DB_SUCCESS for user {user_id}: {role}")
                        # Normalize return with expires_at using base TTL
                        expires_at = time.time() + self._ttl_with_jitter(self.base_ttl)
                        return {"role": role, "level": level, "expires_at": expires_at}
                    else:
                        # Cache negative result only if Redis is available
                        if self.redis:
                            self._cache_set_role(user_id, {"role": None, "level": 0})
                        logger.info(f"ROLE_DB_NO_ROLE for user {user_id}")
                        expires_at = time.time() + self._ttl_with_jitter(self.base_ttl)
                        return {"role": None, "level": 0, "expires_at": expires_at}
                else:
                    # No role found - cache negative result only if Redis is available
                    if self.redis:
                        self._cache_set_role(user_id, {"role": None, "level": 0})
                    logger.info(f"ROLE_DB_EMPTY for user {user_id}")
                    expires_at = time.time() + self._ttl_with_jitter(self.base_ttl)
                    return {"role": None, "level": 0, "expires_at": expires_at}
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
        if not self.redis:
            logger.debug(f"Redis not available - skipping cache for user {user_id}")
            return
            
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
            TTL with ±20% jitter
        """
        # Get jitter percent from environment or use default 20%
        jitter_percent = float(os.getenv("ADMIN_ROLE_CACHE_JITTER", "20")) / 100.0
        jitter = random.uniform(1.0 - jitter_percent, 1.0 + jitter_percent)
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
        # Invalidate Redis cache
        if self.redis:
            try:
                cache_key = f"admin_role:{user_id}"
                self.redis.delete(cache_key)
                logger.info(f"Invalidated Redis role cache for user {user_id}")
            except Exception as e:
                logger.error(f"Error invalidating Redis role cache for user {user_id}: {e}")
        
        # Also invalidate fallback cache
        with self._fallback_cache_lock:
            if user_id in self._fallback_cache:
                del self._fallback_cache[user_id]
                logger.debug(f"Invalidated fallback cache for user {user_id}")

    def _cleanup_fallback_cache(self) -> None:
        """
        Clean up expired entries from fallback cache to prevent memory leaks.
        Should be called with _fallback_cache_lock held.
        """
        current_time = time.time()
        expired_keys = []
        
        for user_id, cached_data in self._fallback_cache.items():
            if cached_data.get("expires_at", 0) <= current_time:
                expired_keys.append(user_id)
        
        for user_id in expired_keys:
            del self._fallback_cache[user_id]
            
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired entries from fallback cache")

    def start_cache_invalidation_listener(self):
        """
        Start background worker to listen for admin role changes and invalidate cache.
        This method should be called once during application startup.
        
        Requires:
        - ENABLE_CACHE_INVALIDATION_LISTENER=true
        - POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT environment variables
        - psycopg2 package installed
        - Dedicated read-only database role with LISTEN privileges
        """
        # Check if cache invalidation listener is enabled
        if os.getenv("ENABLE_CACHE_INVALIDATION_LISTENER", "false").lower() != "true":
            logger.info("Cache invalidation listener disabled by ENABLE_CACHE_INVALIDATION_LISTENER=false")
            return
        
        # Validate required environment variables
        required_env_vars = ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_PORT"]
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            logger.error(f"Cache invalidation listener disabled - missing required environment variables: {missing_vars}")
            return
        
        try:
            import threading
            import psycopg2
            from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
            
            def listen_for_changes():
                """Background thread to listen for PostgreSQL notifications."""
                try:
                    # Connect to PostgreSQL with notification support using dedicated read-only role
                    # Use POSTGRES_READONLY_USER if available, otherwise fall back to POSTGRES_USER
                    db_user = os.getenv("POSTGRES_READONLY_USER", os.getenv("POSTGRES_USER", "postgres"))
                    db_password = os.getenv("POSTGRES_READONLY_PASSWORD", os.getenv("POSTGRES_PASSWORD"))
                    
                    conn = psycopg2.connect(
                        dbname=os.getenv("POSTGRES_DB", "postgres"),
                        user=db_user,
                        password=db_password,
                        host=os.getenv("POSTGRES_HOST", "localhost"),
                        port=os.getenv("POSTGRES_PORT", "5432")
                    )
                    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                    cur = conn.cursor()
                    
                    # Listen for admin role change notifications
                    cur.execute("LISTEN admin_roles_changed;")
                    logger.info("Started listening for admin role changes")
                    
                    while True:
                        # Wait for notifications with blocking select
                        import select
                        if select.select([conn], [], [], 10) == ([], [], []):
                            continue
                        conn.poll()
                        while conn.notifies:
                            notify = conn.notifies.pop()
                            user_id = notify.payload
                            if user_id:
                                logger.info(f"Received admin role change notification for user {user_id}")
                                self.invalidate_user_role(user_id)
                                
                except Exception as e:
                    logger.error(f"Cache invalidation listener error: {e}")
                    # Log additional context for debugging
                    logger.error(f"Cache invalidation listener failed - check database connectivity and permissions")
                finally:
                    try:
                        cur.close()
                        conn.close()
                    except Exception as cleanup_error:
                        logger.warning(f"Error cleaning up cache invalidation listener connection: {cleanup_error}")
            
            # Start listener in background thread
            listener_thread = threading.Thread(
                target=listen_for_changes,
                daemon=True,
                name="AdminRoleCacheInvalidator"
            )
            listener_thread.start()
            logger.info("Admin role cache invalidation listener started")
            
        except ImportError:
            logger.warning("psycopg2 not available - cache invalidation listener not started")
        except Exception as e:
            logger.error(f"Failed to start cache invalidation listener: {e}")


# Global instance
_role_manager = None


def get_role_manager() -> SupabaseRoleManager:
    """Get global role manager instance."""
    global _role_manager
    if _role_manager is None:
        _role_manager = SupabaseRoleManager()
    return _role_manager
