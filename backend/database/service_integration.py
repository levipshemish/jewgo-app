#!/usr/bin/env python3
"""
Service Integration Module for Consolidated Database Manager
============================================================

This module provides easy integration patterns for services to use the
consolidated database manager. It includes:

- Service-specific database operations
- Automatic caching strategies
- Performance monitoring integration
- Error handling patterns
- Transaction management helpers

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import time
from typing import Any, Dict, List, Optional, Callable, Union
from contextlib import contextmanager
from datetime import datetime, timedelta
from functools import wraps

from utils.logging_config import get_logger
from database.consolidated_db_manager import (
    ConsolidatedDatabaseManager,
    get_consolidated_db_manager
)

logger = get_logger(__name__)


class DatabaseServiceBase:
    """Base class for database services using consolidated manager."""
    
    def __init__(self, service_name: str, db_manager: Optional[ConsolidatedDatabaseManager] = None):
        """Initialize database service."""
        self.service_name = service_name
        self.db_manager = db_manager or get_consolidated_db_manager()
        self.service_stats = {
            'queries_executed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0,
            'total_time_ms': 0.0
        }
        
        logger.info(f"Database service '{service_name}' initialized")
    
    def execute_query(self, query: str, params: Optional[Dict] = None, 
                     use_cache: bool = True, cache_ttl: Optional[int] = None) -> Any:
        """Execute query with service-specific monitoring."""
        start_time = time.time()
        
        try:
            result = self.db_manager.execute_query(query, params, use_cache, cache_ttl)
            
            # Update service stats
            duration = (time.time() - start_time) * 1000
            self.service_stats['queries_executed'] += 1
            self.service_stats['total_time_ms'] += duration
            
            # Check if result was cached
            if use_cache and self.db_manager.query_cache:
                cache_stats = self.db_manager.query_cache.get_stats()
                if cache_stats['hits'] > self.service_stats['cache_hits']:
                    self.service_stats['cache_hits'] += 1
                else:
                    self.service_stats['cache_misses'] += 1
            
            logger.debug(f"Service '{self.service_name}' executed query: {duration:.2f}ms")
            return result
            
        except Exception as e:
            self.service_stats['errors'] += 1
            logger.error(f"Service '{self.service_name}' query failed: {e}")
            raise
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service-specific statistics."""
        total_queries = self.service_stats['queries_executed']
        avg_time = (self.service_stats['total_time_ms'] / total_queries) if total_queries > 0 else 0
        
        cache_hit_rate = 0
        total_cache_requests = self.service_stats['cache_hits'] + self.service_stats['cache_misses']
        if total_cache_requests > 0:
            cache_hit_rate = (self.service_stats['cache_hits'] / total_cache_requests) * 100
        
        return {
            'service_name': self.service_name,
            'queries_executed': total_queries,
            'cache_hits': self.service_stats['cache_hits'],
            'cache_misses': self.service_stats['cache_misses'],
            'cache_hit_rate_percent': cache_hit_rate,
            'errors': self.service_stats['errors'],
            'avg_query_time_ms': avg_time,
            'total_time_ms': self.service_stats['total_time_ms']
        }


class RestaurantDatabaseService(DatabaseServiceBase):
    """Database service for restaurant operations."""
    
    def __init__(self, db_manager: Optional[ConsolidatedDatabaseManager] = None):
        super().__init__("restaurant_service", db_manager)
    
    def get_restaurants_by_location(self, latitude: float, longitude: float, 
                                  radius_km: float = 10.0, limit: int = 50) -> List[Dict]:
        """Get restaurants near a location."""
        query = """
        SELECT 
            r.id, r.name, r.address, r.city, r.state, r.zip_code,
            r.latitude, r.longitude, r.phone, r.website,
            r.kosher_supervision, r.kosher_category, r.cuisine_type,
            r.is_active, r.created_at, r.updated_at,
            ST_Distance(
                ST_Point(r.longitude, r.latitude)::geography,
                ST_Point(:longitude, :latitude)::geography
            ) / 1000 as distance_km
        FROM restaurants r
        WHERE r.is_active = true
        AND ST_DWithin(
            ST_Point(r.longitude, r.latitude)::geography,
            ST_Point(:longitude, :latitude)::geography,
            :radius_meters
        )
        ORDER BY distance_km
        LIMIT :limit
        """
        
        params = {
            'latitude': latitude,
            'longitude': longitude,
            'radius_meters': radius_km * 1000,
            'limit': limit
        }
        
        # Cache for 5 minutes
        return self.execute_query(query, params, use_cache=True, cache_ttl=300)
    
    def get_restaurant_by_id(self, restaurant_id: int) -> Optional[Dict]:
        """Get restaurant by ID."""
        query = """
        SELECT 
            r.*, 
            COUNT(rv.id) as review_count,
            AVG(rv.rating) as avg_rating
        FROM restaurants r
        LEFT JOIN reviews rv ON r.id = rv.restaurant_id
        WHERE r.id = :restaurant_id AND r.is_active = true
        GROUP BY r.id
        """
        
        params = {'restaurant_id': restaurant_id}
        
        # Cache for 10 minutes
        results = self.execute_query(query, params, use_cache=True, cache_ttl=600)
        return results[0] if results else None
    
    def search_restaurants(self, search_term: str, limit: int = 20) -> List[Dict]:
        """Search restaurants by name or cuisine."""
        query = """
        SELECT 
            r.id, r.name, r.address, r.city, r.state,
            r.kosher_supervision, r.kosher_category, r.cuisine_type,
            r.latitude, r.longitude, r.is_active,
            ts_rank(
                to_tsvector('english', r.name || ' ' || r.cuisine_type || ' ' || r.kosher_category),
                plainto_tsquery('english', :search_term)
            ) as rank
        FROM restaurants r
        WHERE r.is_active = true
        AND (
            to_tsvector('english', r.name || ' ' || r.cuisine_type || ' ' || r.kosher_category)
            @@ plainto_tsquery('english', :search_term)
            OR r.name ILIKE :search_pattern
            OR r.cuisine_type ILIKE :search_pattern
        )
        ORDER BY rank DESC, r.name
        LIMIT :limit
        """
        
        params = {
            'search_term': search_term,
            'search_pattern': f'%{search_term}%',
            'limit': limit
        }
        
        # Cache for 2 minutes
        return self.execute_query(query, params, use_cache=True, cache_ttl=120)
    
    def get_restaurant_reviews(self, restaurant_id: int, limit: int = 20, 
                              offset: int = 0) -> List[Dict]:
        """Get reviews for a restaurant."""
        query = """
        SELECT 
            rv.id, rv.user_id, rv.rating, rv.comment, rv.created_at,
            u.username, u.display_name
        FROM reviews rv
        JOIN users u ON rv.user_id = u.id
        WHERE rv.restaurant_id = :restaurant_id
        ORDER BY rv.created_at DESC
        LIMIT :limit OFFSET :offset
        """
        
        params = {
            'restaurant_id': restaurant_id,
            'limit': limit,
            'offset': offset
        }
        
        # Cache for 1 minute
        return self.execute_query(query, params, use_cache=True, cache_ttl=60)


class UserDatabaseService(DatabaseServiceBase):
    """Database service for user operations."""
    
    def __init__(self, db_manager: Optional[ConsolidatedDatabaseManager] = None):
        super().__init__("user_service", db_manager)
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID."""
        query = """
        SELECT 
            u.id, u.username, u.email, u.display_name, u.created_at,
            u.last_login, u.is_active, u.is_verified,
            COUNT(rv.id) as review_count
        FROM users u
        LEFT JOIN reviews rv ON u.id = rv.user_id
        WHERE u.id = :user_id
        GROUP BY u.id
        """
        
        params = {'user_id': user_id}
        
        # Cache for 5 minutes
        results = self.execute_query(query, params, use_cache=True, cache_ttl=300)
        return results[0] if results else None
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email."""
        query = """
        SELECT 
            u.id, u.username, u.email, u.display_name, u.password_hash,
            u.created_at, u.last_login, u.is_active, u.is_verified
        FROM users u
        WHERE u.email = :email AND u.is_active = true
        """
        
        params = {'email': email}
        
        # No caching for authentication queries
        results = self.execute_query(query, params, use_cache=False)
        return results[0] if results else None
    
    def create_user(self, username: str, email: str, password_hash: str, 
                   display_name: str) -> Dict:
        """Create a new user."""
        query = """
        INSERT INTO users (username, email, password_hash, display_name, created_at, is_active)
        VALUES (:username, :email, :password_hash, :display_name, NOW(), true)
        RETURNING id, username, email, display_name, created_at, is_active
        """
        
        params = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'display_name': display_name
        }
        
        # No caching for write operations
        results = self.execute_query(query, params, use_cache=False)
        return results[0] if results else {}


class AnalyticsDatabaseService(DatabaseServiceBase):
    """Database service for analytics operations."""
    
    def __init__(self, db_manager: Optional[ConsolidatedDatabaseManager] = None):
        super().__init__("analytics_service", db_manager)
    
    def get_restaurant_stats(self, restaurant_id: Optional[int] = None) -> Dict:
        """Get restaurant statistics."""
        if restaurant_id:
            query = """
            SELECT 
                COUNT(rv.id) as total_reviews,
                AVG(rv.rating) as avg_rating,
                COUNT(CASE WHEN rv.rating >= 4 THEN 1 END) as positive_reviews,
                COUNT(CASE WHEN rv.rating <= 2 THEN 1 END) as negative_reviews,
                MAX(rv.created_at) as last_review_date
            FROM reviews rv
            WHERE rv.restaurant_id = :restaurant_id
            """
            params = {'restaurant_id': restaurant_id}
        else:
            query = """
            SELECT 
                COUNT(DISTINCT r.id) as total_restaurants,
                COUNT(DISTINCT rv.id) as total_reviews,
                AVG(rv.rating) as avg_rating,
                COUNT(DISTINCT u.id) as total_users
            FROM restaurants r
            LEFT JOIN reviews rv ON r.id = rv.restaurant_id
            LEFT JOIN users u ON rv.user_id = u.id
            WHERE r.is_active = true
            """
            params = {}
        
        # Cache for 10 minutes
        results = self.execute_query(query, params, use_cache=True, cache_ttl=600)
        return results[0] if results else {}
    
    def get_popular_cuisines(self, limit: int = 10) -> List[Dict]:
        """Get most popular cuisines."""
        query = """
        SELECT 
            r.cuisine_type,
            COUNT(r.id) as restaurant_count,
            COUNT(rv.id) as review_count,
            AVG(rv.rating) as avg_rating
        FROM restaurants r
        LEFT JOIN reviews rv ON r.id = rv.restaurant_id
        WHERE r.is_active = true AND r.cuisine_type IS NOT NULL
        GROUP BY r.cuisine_type
        ORDER BY restaurant_count DESC, avg_rating DESC
        LIMIT :limit
        """
        
        params = {'limit': limit}
        
        # Cache for 15 minutes
        return self.execute_query(query, params, use_cache=True, cache_ttl=900)


def database_operation(service_name: str, use_cache: bool = True, cache_ttl: Optional[int] = None):
    """Decorator for database operations with automatic monitoring."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                # Get database manager
                db_manager = get_consolidated_db_manager()
                
                # Execute function
                result = func(db_manager, *args, **kwargs)
                
                # Log performance
                duration = (time.time() - start_time) * 1000
                logger.debug(f"Database operation '{service_name}' completed: {duration:.2f}ms")
                
                return result
                
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                logger.error(f"Database operation '{service_name}' failed: {e} ({duration:.2f}ms)")
                raise
        
        return wrapper
    return decorator


@contextmanager
def database_transaction():
    """Context manager for database transactions."""
    db_manager = get_consolidated_db_manager()
    
    with db_manager.get_session() as session:
        try:
            yield session
            session.commit()
            logger.debug("Database transaction committed")
        except Exception as e:
            session.rollback()
            logger.error(f"Database transaction rolled back: {e}")
            raise


def invalidate_service_cache(service_name: str, pattern: Optional[str] = None):
    """Invalidate cache for a specific service."""
    db_manager = get_consolidated_db_manager()
    
    if pattern:
        db_manager.invalidate_cache(f"{service_name}:{pattern}")
        logger.info(f"Cache invalidated for service '{service_name}' with pattern: {pattern}")
    else:
        db_manager.invalidate_cache(service_name)
        logger.info(f"All cache invalidated for service: {service_name}")


# Global service instances
_restaurant_service = None
_user_service = None
_analytics_service = None


def get_restaurant_service() -> RestaurantDatabaseService:
    """Get global restaurant service instance."""
    global _restaurant_service
    if _restaurant_service is None:
        _restaurant_service = RestaurantDatabaseService()
    return _restaurant_service


def get_user_service() -> UserDatabaseService:
    """Get global user service instance."""
    global _user_service
    if _user_service is None:
        _user_service = UserDatabaseService()
    return _user_service


def get_analytics_service() -> AnalyticsDatabaseService:
    """Get global analytics service instance."""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsDatabaseService()
    return _analytics_service


def get_all_service_stats() -> Dict[str, Any]:
    """Get statistics from all services."""
    services = {
        'restaurant': get_restaurant_service(),
        'user': get_user_service(),
        'analytics': get_analytics_service()
    }
    
    stats = {}
    for name, service in services.items():
        stats[name] = service.get_service_stats()
    
    return {
        'services': stats,
        'timestamp': datetime.now().isoformat(),
        'total_services': len(services)
    }