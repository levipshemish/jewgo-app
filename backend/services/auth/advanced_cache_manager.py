"""
Advanced Cache Manager for Authentication System.

This module provides comprehensive caching strategies including cache warming,
intelligent invalidation, cache analytics, and distributed cache management.
"""

import json
import time
import asyncio
from typing import Dict, Any, List, Optional, Set, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
from utils.logging_config import get_logger
from utils.postgres_auth import PostgresAuthManager

logger = get_logger(__name__)


class AdvancedCacheManager:
    """Advanced cache manager with warming, invalidation, and analytics."""
    
    def __init__(self, redis_client, postgres_auth: PostgresAuthManager):
        self.redis = redis_client
        self.postgres_auth = postgres_auth
        
        # Cache configuration
        self.cache_config = {
            'user_profiles': {'ttl': 300, 'warm_threshold': 10},      # 5 min, warm after 10 hits
            'user_roles': {'ttl': 900, 'warm_threshold': 5},          # 15 min, warm after 5 hits
            'token_validations': {'ttl': 60, 'warm_threshold': 20},   # 1 min, warm after 20 hits
            'session_data': {'ttl': 1800, 'warm_threshold': 3},       # 30 min, warm after 3 hits
            'permission_cache': {'ttl': 600, 'warm_threshold': 8},    # 10 min, warm after 8 hits
        }
        
        # Cache analytics
        self.cache_stats = {
            'hits': defaultdict(int),
            'misses': defaultdict(int),
            'warm_ups': defaultdict(int),
            'invalidations': defaultdict(int),
            'evictions': defaultdict(int),
            'access_patterns': defaultdict(lambda: deque(maxlen=1000))
        }
        
        # Cache warming strategies
        self.warming_strategies = {
            'user_profiles': self._warm_user_profiles,
            'user_roles': self._warm_user_roles,
            'permission_cache': self._warm_permissions,
            'session_data': self._warm_sessions
        }
        
        # Invalidation patterns
        self.invalidation_patterns = {
            'user_update': ['user_profiles', 'user_roles', 'permission_cache'],
            'role_change': ['user_roles', 'permission_cache'],
            'session_change': ['session_data', 'token_validations'],
            'permission_change': ['permission_cache']
        }
        
        logger.info("AdvancedCacheManager initialized")
    
    def get_with_warming(self, cache_type: str, key: str, fetch_func: Callable, *args, **kwargs) -> Any:
        """
        Get data from cache with automatic warming based on access patterns.
        
        Args:
            cache_type: Type of cache (user_profiles, user_roles, etc.)
            key: Cache key
            fetch_func: Function to fetch data if not in cache
            *args, **kwargs: Arguments for fetch_func
            
        Returns:
            Cached or fetched data
        """
        try:
            cache_key = f"{cache_type}:{key}"
            
            # Try to get from cache
            cached_data = self.redis.get(cache_key)
            
            if cached_data:
                # Cache hit
                self._record_cache_hit(cache_type, key)
                return json.loads(cached_data)
            
            # Cache miss - fetch from source
            self._record_cache_miss(cache_type, key)
            data = fetch_func(*args, **kwargs)
            
            if data is not None:
                # Store in cache
                config = self.cache_config.get(cache_type, {'ttl': 300})
                self.redis.setex(cache_key, config['ttl'], json.dumps(data))
                
                # Check if we should warm related caches
                self._check_warming_trigger(cache_type, key, data)
            
            return data
            
        except Exception as e:
            logger.error(f"Cache operation failed for {cache_type}:{key}: {e}")
            # Fallback to direct fetch
            return fetch_func(*args, **kwargs)
    
    def _record_cache_hit(self, cache_type: str, key: str):
        """Record cache hit statistics."""
        self.cache_stats['hits'][cache_type] += 1
        self.cache_stats['access_patterns'][cache_type].append({
            'key': key,
            'timestamp': time.time(),
            'type': 'hit'
        })
    
    def _record_cache_miss(self, cache_type: str, key: str):
        """Record cache miss statistics."""
        self.cache_stats['misses'][cache_type] += 1
        self.cache_stats['access_patterns'][cache_type].append({
            'key': key,
            'timestamp': time.time(),
            'type': 'miss'
        })
    
    def _check_warming_trigger(self, cache_type: str, key: str, data: Any):
        """Check if cache warming should be triggered."""
        try:
            config = self.cache_config.get(cache_type, {})
            threshold = config.get('warm_threshold', 10)
            
            # Count recent misses for this cache type
            recent_misses = sum(
                1 for access in self.cache_stats['access_patterns'][cache_type]
                if access['type'] == 'miss' and 
                time.time() - access['timestamp'] < 300  # Last 5 minutes
            )
            
            if recent_misses >= threshold:
                logger.info(f"Triggering cache warming for {cache_type} (misses: {recent_misses})")
                self._trigger_cache_warming(cache_type, key, data)
                
        except Exception as e:
            logger.error(f"Failed to check warming trigger: {e}")
    
    def _trigger_cache_warming(self, cache_type: str, key: str, data: Any):
        """Trigger cache warming for related data."""
        try:
            warming_func = self.warming_strategies.get(cache_type)
            if warming_func:
                # Run warming in background
                asyncio.create_task(self._async_warm_cache(warming_func, key, data))
                self.cache_stats['warm_ups'][cache_type] += 1
                
        except Exception as e:
            logger.error(f"Failed to trigger cache warming: {e}")
    
    async def _async_warm_cache(self, warming_func: Callable, key: str, data: Any):
        """Asynchronously warm cache."""
        try:
            await warming_func(key, data)
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
    
    def invalidate_pattern(self, pattern: str, context: Dict[str, Any] = None):
        """
        Invalidate caches based on patterns.
        
        Args:
            pattern: Invalidation pattern (user_update, role_change, etc.)
            context: Additional context for invalidation
        """
        try:
            cache_types = self.invalidation_patterns.get(pattern, [])
            
            for cache_type in cache_types:
                self._invalidate_cache_type(cache_type, context)
                self.cache_stats['invalidations'][cache_type] += 1
            
            logger.info(f"Invalidated caches for pattern {pattern}: {cache_types}")
            
        except Exception as e:
            logger.error(f"Failed to invalidate pattern {pattern}: {e}")
    
    def _invalidate_cache_type(self, cache_type: str, context: Dict[str, Any] = None):
        """Invalidate all keys for a specific cache type."""
        try:
            pattern = f"{cache_type}:*"
            keys = self.redis.keys(pattern)
            
            if keys:
                self.redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys for {cache_type}")
            
        except Exception as e:
            logger.error(f"Failed to invalidate cache type {cache_type}: {e}")
    
    def warm_user_profiles(self, user_ids: List[str] = None):
        """Warm user profile cache for specified users or active users."""
        try:
            if not user_ids:
                # Get active users from database
                user_ids = self._get_active_user_ids()
            
            for user_id in user_ids:
                self._warm_user_profile(user_id)
            
            logger.info(f"Warmed user profiles for {len(user_ids)} users")
            
        except Exception as e:
            logger.error(f"Failed to warm user profiles: {e}")
    
    def _warm_user_profile(self, user_id: str):
        """Warm cache for a specific user profile."""
        try:
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT u.id, u.name, u.email, u.email_verified, u.last_login
                        FROM users u
                        WHERE u.id = :user_id
                    """),
                    {'user_id': user_id}
                ).fetchone()
                
                if result:
                    user_data = dict(result._mapping)
                    cache_key = f"user_profiles:{user_data['email']}"
                    config = self.cache_config['user_profiles']
                    self.redis.setex(cache_key, config['ttl'], json.dumps(user_data))
                    
        except Exception as e:
            logger.error(f"Failed to warm user profile for {user_id}: {e}")
    
    def _warm_user_roles(self, user_id: str, data: Any = None):
        """Warm user roles cache."""
        try:
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT role, level, granted_at
                        FROM user_roles
                        WHERE user_id = :user_id AND is_active = TRUE 
                        AND (expires_at IS NULL OR expires_at > NOW())
                    """),
                    {'user_id': user_id}
                ).fetchall()
                
                roles = [{'role': row[0], 'level': row[1], 'granted_at': row[2]} for row in result]
                
                cache_key = f"user_roles:{user_id}"
                config = self.cache_config['user_roles']
                self.redis.setex(cache_key, config['ttl'], json.dumps(roles))
                
        except Exception as e:
            logger.error(f"Failed to warm user roles for {user_id}: {e}")
    
    def _warm_permissions(self, user_id: str, data: Any = None):
        """Warm permission cache for user."""
        try:
            # Get user roles first
            roles = self.get_with_warming('user_roles', user_id, self._fetch_user_roles, user_id)
            
            if roles:
                # Calculate permissions based on roles
                permissions = self._calculate_permissions(roles)
                
                cache_key = f"permission_cache:{user_id}"
                config = self.cache_config['permission_cache']
                self.redis.setex(cache_key, config['ttl'], json.dumps(permissions))
                
        except Exception as e:
            logger.error(f"Failed to warm permissions for {user_id}: {e}")
    
    def _warm_sessions(self, session_id: str, data: Any = None):
        """Warm session data cache."""
        try:
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT user_id, family_id, created_at, last_used, expires_at
                        FROM auth_sessions
                        WHERE id = :session_id AND revoked_at IS NULL
                    """),
                    {'session_id': session_id}
                ).fetchone()
                
                if result:
                    session_data = dict(result._mapping)
                    cache_key = f"session_data:{session_id}"
                    config = self.cache_config['session_data']
                    self.redis.setex(cache_key, config['ttl'], json.dumps(session_data))
                    
        except Exception as e:
            logger.error(f"Failed to warm session data for {session_id}: {e}")
    
    def _get_active_user_ids(self, limit: int = 100) -> List[str]:
        """Get list of recently active user IDs."""
        try:
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT id FROM users 
                        WHERE last_login > NOW() - INTERVAL '7 days'
                        ORDER BY last_login DESC
                        LIMIT :limit
                    """),
                    {'limit': limit}
                ).fetchall()
                
                return [row[0] for row in result]
                
        except Exception as e:
            logger.error(f"Failed to get active user IDs: {e}")
            return []
    
    def _fetch_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch user roles from database."""
        try:
            with self.postgres_auth.db.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(
                    text("""
                        SELECT role, level, granted_at
                        FROM user_roles
                        WHERE user_id = :user_id AND is_active = TRUE 
                        AND (expires_at IS NULL OR expires_at > NOW())
                    """),
                    {'user_id': user_id}
                ).fetchall()
                
                return [{'role': row[0], 'level': row[1], 'granted_at': row[2]} for row in result]
                
        except Exception as e:
            logger.error(f"Failed to fetch user roles: {e}")
            return []
    
    def _calculate_permissions(self, roles: List[Dict[str, Any]]) -> List[str]:
        """Calculate permissions based on user roles."""
        try:
            permissions = set()
            
            # Role-based permission mapping
            role_permissions = {
                'admin': ['*'],  # All permissions
                'moderator': ['read_all', 'update_content', 'manage_users'],
                'user': ['read_own', 'update_own', 'create_content'],
                'guest': ['read_public']
            }
            
            for role in roles:
                role_name = role.get('role', '')
                role_perms = role_permissions.get(role_name, [])
                permissions.update(role_perms)
            
            return list(permissions)
            
        except Exception as e:
            logger.error(f"Failed to calculate permissions: {e}")
            return []
    
    def get_cache_analytics(self) -> Dict[str, Any]:
        """Get comprehensive cache analytics."""
        try:
            analytics = {}
            
            for cache_type in self.cache_config.keys():
                hits = self.cache_stats['hits'][cache_type]
                misses = self.cache_stats['misses'][cache_type]
                total = hits + misses
                
                analytics[cache_type] = {
                    'hits': hits,
                    'misses': misses,
                    'hit_rate': (hits / total * 100) if total > 0 else 0,
                    'warm_ups': self.cache_stats['warm_ups'][cache_type],
                    'invalidations': self.cache_stats['invalidations'][cache_type],
                    'evictions': self.cache_stats['evictions'][cache_type],
                    'config': self.cache_config[cache_type]
                }
            
            # Overall statistics
            total_hits = sum(self.cache_stats['hits'].values())
            total_misses = sum(self.cache_stats['misses'].values())
            total_requests = total_hits + total_misses
            
            analytics['overall'] = {
                'total_hits': total_hits,
                'total_misses': total_misses,
                'total_requests': total_requests,
                'overall_hit_rate': (total_hits / total_requests * 100) if total_requests > 0 else 0,
                'total_warm_ups': sum(self.cache_stats['warm_ups'].values()),
                'total_invalidations': sum(self.cache_stats['invalidations'].values())
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get cache analytics: {e}")
            return {'error': str(e)}
    
    def optimize_cache_config(self) -> Dict[str, Any]:
        """Analyze cache performance and suggest optimizations."""
        try:
            analytics = self.get_cache_analytics()
            recommendations = []
            
            for cache_type, stats in analytics.items():
                if cache_type == 'overall':
                    continue
                
                hit_rate = stats['hit_rate']
                config = stats['config']
                
                # Low hit rate recommendations
                if hit_rate < 70:
                    recommendations.append({
                        'cache_type': cache_type,
                        'issue': 'Low hit rate',
                        'current_hit_rate': hit_rate,
                        'recommendation': 'Increase TTL or improve warming strategy',
                        'suggested_ttl': config['ttl'] * 2
                    })
                
                # High invalidation rate
                if stats['invalidations'] > stats['hits'] * 0.1:
                    recommendations.append({
                        'cache_type': cache_type,
                        'issue': 'High invalidation rate',
                        'invalidations': stats['invalidations'],
                        'recommendation': 'Review invalidation patterns or increase TTL'
                    })
            
            return {
                'analytics': analytics,
                'recommendations': recommendations,
                'optimization_score': self._calculate_optimization_score(analytics)
            }
            
        except Exception as e:
            logger.error(f"Failed to optimize cache config: {e}")
            return {'error': str(e)}
    
    def _calculate_optimization_score(self, analytics: Dict[str, Any]) -> float:
        """Calculate overall cache optimization score (0-100)."""
        try:
            overall = analytics.get('overall', {})
            hit_rate = overall.get('overall_hit_rate', 0)
            
            # Base score on hit rate
            score = min(hit_rate, 100)
            
            # Bonus for good warming
            warm_ups = overall.get('total_warm_ups', 0)
            if warm_ups > 0:
                score += min(10, warm_ups / 10)  # Up to 10 bonus points
            
            return round(score, 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate optimization score: {e}")
            return 0.0
    
    def schedule_cache_maintenance(self):
        """Schedule periodic cache maintenance tasks."""
        try:
            # Clean up expired keys
            self._cleanup_expired_keys()
            
            # Warm frequently accessed data
            self._warm_frequent_data()
            
            # Update cache statistics
            self._update_cache_statistics()
            
            logger.info("Cache maintenance completed")
            
        except Exception as e:
            logger.error(f"Cache maintenance failed: {e}")
    
    def _cleanup_expired_keys(self):
        """Clean up expired cache keys."""
        try:
            # Redis automatically handles TTL, but we can clean up patterns
            for cache_type in self.cache_config.keys():
                pattern = f"{cache_type}:*"
                keys = self.redis.keys(pattern)
                
                # Check for keys that might be stale
                for key in keys:
                    ttl = self.redis.ttl(key)
                    if ttl == -1:  # No expiration set
                        self.redis.delete(key)
                        logger.debug(f"Removed key without TTL: {key}")
                        
        except Exception as e:
            logger.error(f"Failed to cleanup expired keys: {e}")
    
    def _warm_frequent_data(self):
        """Warm frequently accessed data based on access patterns."""
        try:
            for cache_type, accesses in self.cache_stats['access_patterns'].items():
                if len(accesses) < 10:
                    continue
                
                # Find frequently accessed keys
                key_counts = defaultdict(int)
                for access in accesses:
                    if access['type'] == 'miss':
                        key_counts[access['key']] += 1
                
                # Warm top 5 most frequently missed keys
                top_keys = sorted(key_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                
                for key, count in top_keys:
                    if count >= 3:  # Missed at least 3 times
                        self._warm_specific_key(cache_type, key)
                        
        except Exception as e:
            logger.error(f"Failed to warm frequent data: {e}")
    
    def _warm_specific_key(self, cache_type: str, key: str):
        """Warm a specific cache key."""
        try:
            warming_func = self.warming_strategies.get(cache_type)
            if warming_func:
                warming_func(key, None)
                
        except Exception as e:
            logger.error(f"Failed to warm specific key {cache_type}:{key}: {e}")
    
    def _update_cache_statistics(self):
        """Update cache statistics and export to Redis."""
        try:
            analytics = self.get_cache_analytics()
            
            # Store in Redis for external monitoring
            self.redis.hset("cache_analytics", mapping={
                'timestamp': int(time.time()),
                'data': json.dumps(analytics)
            })
            
            # Set expiration (1 hour)
            self.redis.expire("cache_analytics", 3600)
            
        except Exception as e:
            logger.error(f"Failed to update cache statistics: {e}")
