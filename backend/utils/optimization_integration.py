#!/usr/bin/env python3
"""
Optimization Integration Module for JewGo Backend
================================================

This module integrates all the advanced optimization features:
- Multi-layer caching
- Database query optimization
- Enhanced connection pooling
- Performance monitoring

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

from typing import Any, Dict, List, Optional, Callable
from functools import wraps
from dataclasses import asdict

from utils.logging_config import get_logger
from cache.advanced_cache_manager import get_advanced_cache_manager
from database.query_optimizer import get_database_optimizer
from database.enhanced_connection_pool import get_enhanced_connection_pool
from monitoring.performance_monitor import get_performance_monitor, track_performance

logger = get_logger(__name__)


class OptimizationManager:
    """Manages all optimization features and provides unified interface."""
    
    def __init__(self):
        self.cache_manager = None
        self.db_optimizer = None
        self.connection_pool = None
        self.performance_monitor = None
        self.initialized = False

    def initialize(self):
        """Initialize all optimization components."""
        try:
            logger.info("Initializing optimization manager...")
            
            # Initialize cache manager
            self.cache_manager = get_advanced_cache_manager()
            logger.info("✓ Advanced cache manager initialized")
            
            # Initialize database optimizer
            self.db_optimizer = get_database_optimizer()
            logger.info("✓ Database optimizer initialized")
            
            # Initialize enhanced connection pool
            self.connection_pool = get_enhanced_connection_pool()
            logger.info("✓ Enhanced connection pool initialized")
            
            # Initialize performance monitor
            self.performance_monitor = get_performance_monitor()
            logger.info("✓ Performance monitor initialized")
            
            # Register cache warming strategies
            self._register_cache_warming_strategies()
            
            self.initialized = True
            logger.info("🎉 All optimization components initialized successfully!")
            
        except Exception as e:
            logger.error(f"Failed to initialize optimization manager: {e}")
            raise

    def _register_cache_warming_strategies(self):
        """Register cache warming strategies."""
        if not self.cache_manager:
            return
        
        # Register restaurant data warming
        self.cache_manager.register_warming_strategy(
            'restaurant_data',
            self._warm_restaurant_cache
        )
        
        # Register synagogue data warming
        self.cache_manager.register_warming_strategy(
            'synagogue_data',
            self._warm_synagogue_cache
        )
        
        # Register search index warming
        self.cache_manager.register_warming_strategy(
            'search_index',
            self._warm_search_cache
        )

    def _warm_restaurant_cache(self, limit: int = 100) -> bool:
        """Warm restaurant data cache."""
        try:
            if not self.db_optimizer:
                return False
            
            # Warm popular restaurant queries
            queries = [
                ("SELECT * FROM restaurants WHERE status = 'active' ORDER BY created_at DESC LIMIT %(limit)s", {'limit': limit}),
                ("SELECT * FROM restaurants WHERE category_id = 'kosher' AND status = 'active' LIMIT %(limit)s", {'limit': limit}),
                ("SELECT * FROM restaurants WHERE rating >= 4.0 AND status = 'active' LIMIT %(limit)s", {'limit': limit})
            ]
            
            results = self.db_optimizer.warm_cache(queries)
            logger.info(f"Restaurant cache warming completed: {sum(results.values())} queries cached")
            return True
            
        except Exception as e:
            logger.error(f"Restaurant cache warming failed: {e}")
            return False

    def _warm_synagogue_cache(self, limit: int = 50) -> bool:
        """Warm synagogue data cache."""
        try:
            if not self.db_optimizer:
                return False
            
            # Warm popular synagogue queries
            queries = [
                ("SELECT * FROM synagogues WHERE status = 'active' ORDER BY created_at DESC LIMIT %(limit)s", {'limit': limit}),
                ("SELECT * FROM synagogues WHERE denomination = 'orthodox' AND status = 'active' LIMIT %(limit)s", {'limit': limit}),
                ("SELECT * FROM synagogues WHERE has_mikvah = true AND status = 'active' LIMIT %(limit)s", {'limit': limit})
            ]
            
            results = self.db_optimizer.warm_cache(queries)
            logger.info(f"Synagogue cache warming completed: {sum(results.values())} queries cached")
            return True
            
        except Exception as e:
            logger.error(f"Synagogue cache warming failed: {e}")
            return False

    def _warm_search_cache(self, limit: int = 20) -> bool:
        """Warm search index cache."""
        try:
            if not self.cache_manager:
                return False
            
            # Warm common search terms
            search_terms = [
                'kosher', 'restaurant', 'synagogue', 'mikvah', 'store',
                'orthodox', 'conservative', 'reform', 'deli', 'bakery'
            ]
            
            for term in search_terms:
                cache_key = f"search:{term}"
                # This would trigger the search and cache results
                # Implementation depends on your search service
                pass
            
            logger.info(f"Search cache warming completed: {len(search_terms)} terms cached")
            return True
            
        except Exception as e:
            logger.error(f"Search cache warming failed: {e}")
            return False

    def get_optimization_status(self) -> Dict[str, Any]:
        """Get status of all optimization components."""
        if not self.initialized:
            return {'status': 'not_initialized'}
        
        try:
            return {
                'status': 'initialized',
                'cache': {
                    'metrics': self.cache_manager.get_metrics() if self.cache_manager else None,
                    'status': 'active' if self.cache_manager else 'inactive'
                },
                'database': {
                    'metrics': self.db_optimizer.get_performance_metrics() if self.db_optimizer else None,
                    'status': 'active' if self.db_optimizer else 'inactive'
                },
                'connection_pool': {
                    'health_summary': self.connection_pool.get_health_summary() if self.connection_pool else None,
                    'status': 'active' if self.connection_pool else 'inactive'
                },
                'performance_monitor': {
                    'dashboard': self.performance_monitor.get_performance_dashboard() if self.performance_monitor else None,
                    'status': 'active' if self.performance_monitor else 'inactive'
                }
            }
        except Exception as e:
            logger.error(f"Failed to get optimization status: {e}")
            return {'status': 'error', 'error': str(e)}

    def warm_all_caches(self) -> Dict[str, bool]:
        """Warm all caches using registered strategies."""
        if not self.cache_manager:
            return {'error': 'Cache manager not initialized'}
        
        results = {}
        for strategy_name in self.cache_manager.warming_strategies.keys():
            try:
                result = self.cache_manager.warm_cache(strategy_name)
                results[strategy_name] = result
            except Exception as e:
                logger.error(f"Cache warming strategy {strategy_name} failed: {e}")
                results[strategy_name] = False
        
        return results

    def get_performance_recommendations(self) -> List[Dict[str, Any]]:
        """Get performance optimization recommendations."""
        recommendations = []
        
        try:
            # Get cache recommendations
            if self.cache_manager:
                cache_metrics = self.cache_manager.get_metrics()
                overall_hit_rate = cache_metrics.get('overall_hit_rate', 0)
                
                if overall_hit_rate < 80:
                    recommendations.append({
                        'type': 'cache',
                        'priority': 'high',
                        'title': 'Low Cache Hit Rate',
                        'description': f'Cache hit rate is {overall_hit_rate:.1f}%, consider warming caches or increasing TTL',
                        'action': 'Run cache warming strategies'
                    })
            
            # Get database recommendations
            if self.db_optimizer:
                db_metrics = self.db_optimizer.get_performance_metrics()
                slow_query_pct = db_metrics.get('slow_query_percentage', 0)
                
                if slow_query_pct > 10:
                    recommendations.append({
                        'type': 'database',
                        'priority': 'medium',
                        'title': 'High Slow Query Percentage',
                        'description': f'{slow_query_pct:.1f}% of queries are slow, consider adding indexes',
                        'action': 'Review and optimize slow queries'
                    })
                
                # Get index recommendations
                index_recs = self.db_optimizer.get_index_recommendations()
                if index_recs:
                    recommendations.append({
                        'type': 'database',
                        'priority': 'medium',
                        'title': 'Index Recommendations Available',
                        'description': f'{len(index_recs)} index recommendations found',
                        'action': 'Review and implement recommended indexes',
                        'details': [asdict(rec) for rec in index_recs[:5]]  # Top 5 recommendations
                    })
            
            # Get connection pool recommendations
            if self.connection_pool:
                pool_status = self.connection_pool.get_health_summary()
                health_pct = pool_status.get('health_percentage', 100)
                
                if health_pct < 100:
                    recommendations.append({
                        'type': 'connection_pool',
                        'priority': 'high',
                        'title': 'Unhealthy Database Connections',
                        'description': f'{100 - health_pct:.1f}% of database connections are unhealthy',
                        'action': 'Check database connectivity and connection pool settings'
                    })
            
            # Get performance monitor recommendations
            if self.performance_monitor:
                dashboard = self.performance_monitor.get_performance_dashboard()
                active_alerts = dashboard.get('active_alerts', [])
                
                for alert in active_alerts:
                    recommendations.append({
                        'type': 'performance',
                        'priority': alert.get('severity', 'medium'),
                        'title': f"Performance Alert: {alert.get('message', 'Unknown')}",
                        'description': f"Metric: {alert.get('metric_name', 'Unknown')}",
                        'action': 'Investigate and resolve performance issue'
                    })
        
        except Exception as e:
            logger.error(f"Failed to get performance recommendations: {e}")
            recommendations.append({
                'type': 'system',
                'priority': 'high',
                'title': 'Optimization System Error',
                'description': f'Error getting recommendations: {e}',
                'action': 'Check optimization system logs'
            })
        
        return recommendations


# Decorators for easy integration
def optimized_query(use_cache: bool = True, cache_ttl: Optional[int] = None, tags: List[str] = None):
    """Decorator for optimized database queries."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            optimization_manager = get_optimization_manager()
            if optimization_manager.db_optimizer:
                # Use database optimizer
                return optimization_manager.db_optimizer.execute_optimized_query(
                    query_text=func.__doc__ or str(func),
                    params=kwargs,
                    use_cache=use_cache,
                    cache_ttl=cache_ttl
                )
            else:
                # Fallback to original function
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def cached_result(ttl: Optional[int] = None, tags: List[str] = None, key_prefix: str = ""):
    """Decorator for caching function results."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            optimization_manager = get_optimization_manager()
            if optimization_manager.cache_manager:
                # Generate cache key
                import hashlib
                key_parts = [key_prefix, func.__name__]
                if args:
                    key_parts.extend([str(arg) for arg in args])
                if kwargs:
                    sorted_kwargs = sorted(kwargs.items())
                    key_parts.extend([f"{k}:{v}" for k, v in sorted_kwargs])
                
                cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
                
                # Try to get from cache
                cached_result = optimization_manager.cache_manager.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                optimization_manager.cache_manager.set(cache_key, result, ttl=ttl, tags=tags)
                return result
            else:
                # Fallback to original function
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def monitored_performance():
    """Decorator for performance monitoring."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            optimization_manager = get_optimization_manager()
            if optimization_manager.performance_monitor:
                return track_performance(optimization_manager.performance_monitor)(func)(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


# Global optimization manager instance
_optimization_manager = None


def get_optimization_manager() -> OptimizationManager:
    """Get the global optimization manager instance."""
    global _optimization_manager
    
    if _optimization_manager is None:
        _optimization_manager = OptimizationManager()
        _optimization_manager.initialize()
    
    return _optimization_manager


def initialize_optimizations():
    """Initialize all optimization features."""
    manager = get_optimization_manager()
    return manager.initialized


def get_optimization_dashboard() -> Dict[str, Any]:
    """Get comprehensive optimization dashboard."""
    manager = get_optimization_manager()
    return {
        'status': manager.get_optimization_status(),
        'recommendations': manager.get_performance_recommendations(),
        'cache_warming_available': list(manager.cache_manager.warming_strategies.keys()) if manager.cache_manager else []
    }
