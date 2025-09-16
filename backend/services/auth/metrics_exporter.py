"""
Metrics Exporter for Authentication System.

This module provides Prometheus metrics export for authentication performance
monitoring and Grafana dashboard integration.
"""

import time
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry, generate_latest
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuthMetricsExporter:
    """Prometheus metrics exporter for authentication system."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()
        
        # Authentication metrics
        self.auth_attempts_total = Counter(
            'auth_attempts_total',
            'Total number of authentication attempts',
            ['method', 'result'],
            registry=self.registry
        )
        
        self.auth_duration_seconds = Histogram(
            'auth_duration_seconds',
            'Authentication request duration',
            ['method', 'result'],
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
            registry=self.registry
        )
        
        self.auth_errors_total = Counter(
            'auth_errors_total',
            'Total number of authentication errors',
            ['error_type', 'method'],
            registry=self.registry
        )
        
        # Token metrics
        self.token_generations_total = Counter(
            'token_generations_total',
            'Total number of token generations',
            ['token_type'],
            registry=self.registry
        )
        
        self.token_validations_total = Counter(
            'token_validations_total',
            'Total number of token validations',
            ['token_type', 'result'],
            registry=self.registry
        )
        
        self.token_duration_seconds = Histogram(
            'token_duration_seconds',
            'Token operation duration',
            ['operation', 'token_type'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
            registry=self.registry
        )
        
        # Cache metrics
        self.cache_operations_total = Counter(
            'cache_operations_total',
            'Total number of cache operations',
            ['operation', 'cache_type', 'result'],
            registry=self.registry
        )
        
        self.cache_hit_ratio = Gauge(
            'cache_hit_ratio',
            'Cache hit ratio',
            ['cache_type'],
            registry=self.registry
        )
        
        self.cache_size_bytes = Gauge(
            'cache_size_bytes',
            'Cache size in bytes',
            ['cache_type'],
            registry=self.registry
        )
        
        # Database metrics
        self.db_queries_total = Counter(
            'db_queries_total',
            'Total number of database queries',
            ['query_type', 'result'],
            registry=self.registry
        )
        
        self.db_query_duration_seconds = Histogram(
            'db_query_duration_seconds',
            'Database query duration',
            ['query_type'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
            registry=self.registry
        )
        
        self.db_connections_active = Gauge(
            'db_connections_active',
            'Number of active database connections',
            registry=self.registry
        )
        
        # Session metrics
        self.sessions_active = Gauge(
            'sessions_active',
            'Number of active sessions',
            registry=self.registry
        )
        
        self.sessions_created_total = Counter(
            'sessions_created_total',
            'Total number of sessions created',
            registry=self.registry
        )
        
        self.sessions_expired_total = Counter(
            'sessions_expired_total',
            'Total number of expired sessions',
            registry=self.registry
        )
        
        # Rate limiting metrics
        self.rate_limit_hits_total = Counter(
            'rate_limit_hits_total',
            'Total number of rate limit hits',
            ['endpoint', 'limit_type'],
            registry=self.registry
        )
        
        self.rate_limit_requests_total = Counter(
            'rate_limit_requests_total',
            'Total number of rate limited requests',
            ['endpoint'],
            registry=self.registry
        )
        
        # Performance metrics
        self.password_hash_duration_seconds = Histogram(
            'password_hash_duration_seconds',
            'Password hashing duration',
            buckets=[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0],
            registry=self.registry
        )
        
        self.password_verify_duration_seconds = Histogram(
            'password_verify_duration_seconds',
            'Password verification duration',
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
            registry=self.registry
        )
        
        # System health metrics
        self.system_health_score = Gauge(
            'system_health_score',
            'Overall system health score (0-100)',
            registry=self.registry
        )
        
        self.performance_score = Gauge(
            'performance_score',
            'Performance optimization score (0-100)',
            registry=self.registry
        )
        
        logger.info("AuthMetricsExporter initialized")
    
    def record_auth_attempt(self, method: str, success: bool, duration: float):
        """Record authentication attempt metrics."""
        try:
            result = 'success' if success else 'failure'
            self.auth_attempts_total.labels(method=method, result=result).inc()
            self.auth_duration_seconds.labels(method=method, result=result).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record auth attempt: {e}")
    
    def record_auth_error(self, error_type: str, method: str):
        """Record authentication error metrics."""
        try:
            self.auth_errors_total.labels(error_type=error_type, method=method).inc()
        except Exception as e:
            logger.error(f"Failed to record auth error: {e}")
    
    def record_token_operation(self, operation: str, token_type: str, duration: float, success: bool = True):
        """Record token operation metrics."""
        try:
            if operation == 'generate':
                self.token_generations_total.labels(token_type=token_type).inc()
            elif operation == 'validate':
                result = 'success' if success else 'failure'
                self.token_validations_total.labels(token_type=token_type, result=result).inc()
            
            self.token_duration_seconds.labels(operation=operation, token_type=token_type).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record token operation: {e}")
    
    def record_cache_operation(self, operation: str, cache_type: str, hit: bool):
        """Record cache operation metrics."""
        try:
            result = 'hit' if hit else 'miss'
            self.cache_operations_total.labels(operation=operation, cache_type=cache_type, result=result).inc()
        except Exception as e:
            logger.error(f"Failed to record cache operation: {e}")
    
    def update_cache_metrics(self, cache_type: str, hit_ratio: float, size_bytes: int):
        """Update cache metrics."""
        try:
            self.cache_hit_ratio.labels(cache_type=cache_type).set(hit_ratio)
            self.cache_size_bytes.labels(cache_type=cache_type).set(size_bytes)
        except Exception as e:
            logger.error(f"Failed to update cache metrics: {e}")
    
    def record_db_query(self, query_type: str, duration: float, success: bool = True):
        """Record database query metrics."""
        try:
            result = 'success' if success else 'error'
            self.db_queries_total.labels(query_type=query_type, result=result).inc()
            self.db_query_duration_seconds.labels(query_type=query_type).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record db query: {e}")
    
    def update_db_connections(self, active_connections: int):
        """Update database connection metrics."""
        try:
            self.db_connections_active.set(active_connections)
        except Exception as e:
            logger.error(f"Failed to update db connections: {e}")
    
    def update_session_metrics(self, active_sessions: int, created: int = 0, expired: int = 0):
        """Update session metrics."""
        try:
            self.sessions_active.set(active_sessions)
            if created > 0:
                self.sessions_created_total.inc(created)
            if expired > 0:
                self.sessions_expired_total.inc(expired)
        except Exception as e:
            logger.error(f"Failed to update session metrics: {e}")
    
    def record_rate_limit(self, endpoint: str, limit_type: str, requests: int = 1):
        """Record rate limiting metrics."""
        try:
            self.rate_limit_hits_total.labels(endpoint=endpoint, limit_type=limit_type).inc()
            self.rate_limit_requests_total.labels(endpoint=endpoint).inc(requests)
        except Exception as e:
            logger.error(f"Failed to record rate limit: {e}")
    
    def record_password_operation(self, operation: str, duration: float):
        """Record password operation metrics."""
        try:
            if operation == 'hash':
                self.password_hash_duration_seconds.observe(duration)
            elif operation == 'verify':
                self.password_verify_duration_seconds.observe(duration)
        except Exception as e:
            logger.error(f"Failed to record password operation: {e}")
    
    def update_health_metrics(self, health_score: float, performance_score: float):
        """Update system health metrics."""
        try:
            self.system_health_score.set(health_score)
            self.performance_score.set(performance_score)
        except Exception as e:
            logger.error(f"Failed to update health metrics: {e}")
    
    def get_metrics(self) -> str:
        """Get Prometheus metrics in text format."""
        try:
            return generate_latest(self.registry).decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return ""
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get metrics summary for dashboard."""
        try:
            # This would typically query the metrics from Prometheus
            # For now, return a summary structure
            return {
                'authentication': {
                    'total_attempts': 'N/A',  # Would be queried from Prometheus
                    'success_rate': 'N/A',
                    'avg_duration_ms': 'N/A'
                },
                'tokens': {
                    'generations_total': 'N/A',
                    'validations_total': 'N/A',
                    'avg_generation_time_ms': 'N/A'
                },
                'cache': {
                    'hit_ratio': 'N/A',
                    'operations_total': 'N/A',
                    'size_bytes': 'N/A'
                },
                'database': {
                    'queries_total': 'N/A',
                    'avg_query_time_ms': 'N/A',
                    'active_connections': 'N/A'
                },
                'sessions': {
                    'active_sessions': 'N/A',
                    'created_total': 'N/A',
                    'expired_total': 'N/A'
                },
                'performance': {
                    'health_score': 'N/A',
                    'performance_score': 'N/A'
                }
            }
        except Exception as e:
            logger.error(f"Failed to get metrics summary: {e}")
            return {'error': str(e)}


# Global metrics exporter instance
_metrics_exporter = None


def get_metrics_exporter(registry: Optional[CollectorRegistry] = None) -> AuthMetricsExporter:
    """Get global metrics exporter instance."""
    global _metrics_exporter
    
    if _metrics_exporter is None:
        _metrics_exporter = AuthMetricsExporter(registry)
    
    return _metrics_exporter
