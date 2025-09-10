"""
Connection Pool Monitoring for Memory Leak Detection
===================================================

This module provides monitoring for database and Redis connection pools
to detect potential memory leaks and connection issues.
"""

import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from collections import deque

from utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class ConnectionPoolMetrics:
    """Connection pool metrics snapshot."""
    timestamp: datetime
    pool_name: str
    total_connections: int
    active_connections: int
    idle_connections: int
    overflow_connections: int
    checked_out_connections: int
    pool_size: int
    max_overflow: int
    pool_timeout: float
    pool_recycle: int
    memory_usage_mb: float


@dataclass
class ConnectionLeakAlert:
    """Connection leak alert."""
    alert_type: str
    severity: str
    message: str
    pool_name: str
    metrics: ConnectionPoolMetrics
    recommendations: List[str]
    timestamp: datetime


class ConnectionPoolMonitor:
    """Monitor connection pools for leaks and issues."""
    
    def __init__(self, check_interval_seconds: int = 30):
        self.check_interval_seconds = check_interval_seconds
        self.monitoring_active = False
        self.monitor_thread = None
        self.metrics_history = deque(maxlen=100)  # Keep last 100 snapshots
        self.alerts = deque(maxlen=50)  # Keep last 50 alerts
        
        # Alert thresholds
        self.thresholds = {
            'high_connection_usage': 0.8,  # 80% of pool size
            'connection_leak_rate': 0.1,  # 10% growth per check
            'long_running_connections': 300,  # 5 minutes
            'pool_exhaustion': 0.95,  # 95% of pool size
        }
        
        # Track connection creation times
        self.connection_timestamps = {}
        
    def start_monitoring(self):
        """Start connection pool monitoring."""
        if self.monitoring_active:
            logger.warning("Connection pool monitoring already active")
            return
            
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True,
            name="ConnectionPoolMonitor"
        )
        self.monitor_thread.start()
        logger.info("Connection pool monitoring started")
    
    def stop_monitoring(self):
        """Stop connection pool monitoring."""
        self.monitoring_active = False
        
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
            if self.monitor_thread.is_alive():
                logger.warning("Connection pool monitor thread did not stop gracefully")
        
        self.monitor_thread = None
        logger.info("Connection pool monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.monitoring_active:
            try:
                self._collect_metrics()
                self._check_for_leaks()
                time.sleep(self.check_interval_seconds)
            except Exception as e:
                logger.error(f"Error in connection pool monitoring loop: {e}")
                time.sleep(self.check_interval_seconds)
    
    def _collect_metrics(self):
        """Collect metrics from all connection pools."""
        timestamp = datetime.now()
        
        # Monitor database connection pool
        try:
            from utils.database_connection_manager import get_db_manager
            db_manager = get_db_manager()
            
            if db_manager and db_manager.engine:
                pool = db_manager.engine.pool
                
                metrics = ConnectionPoolMetrics(
                    timestamp=timestamp,
                    pool_name="database",
                    total_connections=pool.size(),
                    active_connections=pool.checkedout(),
                    idle_connections=pool.checkedin(),
                    overflow_connections=pool.overflow(),
                    checked_out_connections=pool.checkedout(),
                    pool_size=pool.size(),
                    max_overflow=pool._max_overflow,
                    pool_timeout=pool._timeout,
                    pool_recycle=pool._recycle,
                    memory_usage_mb=self._estimate_pool_memory_usage(pool)
                )
                
                self.metrics_history.append(metrics)
                self._track_connection_timestamps(metrics)
                
        except Exception as e:
            logger.error(f"Error collecting database pool metrics: {e}")
        
        # Monitor Redis connection pool
        try:
            from utils.redis_client import get_redis_client
            redis_client = get_redis_client()
            
            if redis_client and hasattr(redis_client, 'connection_pool'):
                pool = redis_client.connection_pool
                
                metrics = ConnectionPoolMetrics(
                    timestamp=timestamp,
                    pool_name="redis",
                    total_connections=len(pool._available_connections) + len(pool._in_use_connections),
                    active_connections=len(pool._in_use_connections),
                    idle_connections=len(pool._available_connections),
                    overflow_connections=0,  # Redis doesn't have overflow concept
                    checked_out_connections=len(pool._in_use_connections),
                    pool_size=pool.max_connections,
                    max_overflow=0,
                    pool_timeout=pool.connection_kwargs.get('socket_timeout', 0),
                    pool_recycle=0,
                    memory_usage_mb=self._estimate_redis_pool_memory_usage(pool)
                )
                
                self.metrics_history.append(metrics)
                
        except Exception as e:
            logger.error(f"Error collecting Redis pool metrics: {e}")
    
    def _estimate_pool_memory_usage(self, pool) -> float:
        """Estimate memory usage of a connection pool."""
        try:
            # Rough estimate: each connection ~1MB
            total_connections = pool.size() + pool.overflow()
            return total_connections * 1.0
        except:
            return 0.0
    
    def _estimate_redis_pool_memory_usage(self, pool) -> float:
        """Estimate memory usage of Redis connection pool."""
        try:
            # Rough estimate: each Redis connection ~0.1MB
            total_connections = len(pool._available_connections) + len(pool._in_use_connections)
            return total_connections * 0.1
        except:
            return 0.0
    
    def _track_connection_timestamps(self, metrics: ConnectionPoolMetrics):
        """Track when connections were created to detect long-running connections."""
        pool_key = f"{metrics.pool_name}_{metrics.timestamp.isoformat()}"
        
        # Store current metrics for comparison
        if pool_key not in self.connection_timestamps:
            self.connection_timestamps[pool_key] = {
                'timestamp': metrics.timestamp,
                'active_connections': metrics.active_connections,
                'checked_out_connections': metrics.checked_out_connections
            }
        
        # Clean up old timestamps (older than 1 hour)
        cutoff = datetime.now() - timedelta(hours=1)
        self.connection_timestamps = {
            k: v for k, v in self.connection_timestamps.items()
            if v['timestamp'] > cutoff
        }
    
    def _check_for_leaks(self):
        """Check for connection leaks and issues."""
        if len(self.metrics_history) < 2:
            return
        
        # Get recent metrics for each pool
        recent_metrics = {}
        for metrics in list(self.metrics_history)[-10:]:  # Last 10 snapshots
            if metrics.pool_name not in recent_metrics:
                recent_metrics[metrics.pool_name] = []
            recent_metrics[metrics.pool_name].append(metrics)
        
        for pool_name, metrics_list in recent_metrics.items():
            if len(metrics_list) < 2:
                continue
                
            latest = metrics_list[-1]
            previous = metrics_list[-2]
            
            # Check for high connection usage
            if latest.pool_size > 0:
                usage_ratio = latest.active_connections / latest.pool_size
                if usage_ratio >= self.thresholds['high_connection_usage']:
                    self._create_alert(
                        alert_type="high_connection_usage",
                        severity="warning",
                        message=f"High connection usage in {pool_name} pool: {usage_ratio:.1%}",
                        pool_name=pool_name,
                        metrics=latest,
                        recommendations=[
                            "Monitor connection usage patterns",
                            "Consider increasing pool size if needed",
                            "Check for connection leaks",
                            "Review connection timeout settings"
                        ]
                    )
                
                # Check for pool exhaustion
                if usage_ratio >= self.thresholds['pool_exhaustion']:
                    self._create_alert(
                        alert_type="pool_exhaustion",
                        severity="critical",
                        message=f"Connection pool exhaustion in {pool_name}: {usage_ratio:.1%}",
                        pool_name=pool_name,
                        metrics=latest,
                        recommendations=[
                            "URGENT: Pool is nearly exhausted",
                            "Increase pool size immediately",
                            "Check for connection leaks",
                            "Review application connection patterns",
                            "Consider connection pooling optimization"
                        ]
                    )
            
            # Check for connection leak (growing active connections)
            connection_growth = latest.active_connections - previous.active_connections
            if connection_growth > 0:
                growth_rate = connection_growth / max(previous.active_connections, 1)
                if growth_rate >= self.thresholds['connection_leak_rate']:
                    self._create_alert(
                        alert_type="connection_leak",
                        severity="warning",
                        message=f"Potential connection leak in {pool_name}: {connection_growth} new connections",
                        pool_name=pool_name,
                        metrics=latest,
                        recommendations=[
                            "Check for unclosed connections",
                            "Review session management",
                            "Ensure proper cleanup in error handlers",
                            "Monitor connection lifecycle"
                        ]
                    )
    
    def _create_alert(self, alert_type: str, severity: str, message: str, 
                     pool_name: str, metrics: ConnectionPoolMetrics, 
                     recommendations: List[str]):
        """Create a connection leak alert."""
        alert = ConnectionLeakAlert(
            alert_type=alert_type,
            severity=severity,
            message=message,
            pool_name=pool_name,
            metrics=metrics,
            recommendations=recommendations,
            timestamp=datetime.now()
        )
        
        self.alerts.append(alert)
        
        # Log the alert
        if severity == "critical":
            logger.error(f"🚨 CRITICAL Connection Pool Alert: {message}", extra={
                "alert_type": alert_type,
                "pool_name": pool_name,
                "severity": severity,
                "recommendations": recommendations,
                "metrics": asdict(metrics)
            })
        else:
            logger.warning(f"⚠️ Connection Pool Alert: {message}", extra={
                "alert_type": alert_type,
                "pool_name": pool_name,
                "severity": severity,
                "recommendations": recommendations,
                "metrics": asdict(metrics)
            })
    
    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get a summary of connection pool metrics."""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics_history if m.timestamp >= cutoff]
        
        summary = {
            "period_hours": hours,
            "timestamp": datetime.now().isoformat(),
            "pools": {},
            "alerts": len([a for a in self.alerts if a.timestamp >= cutoff])
        }
        
        # Group by pool name
        pools = {}
        for metrics in recent_metrics:
            if metrics.pool_name not in pools:
                pools[metrics.pool_name] = []
            pools[metrics.pool_name].append(metrics)
        
        for pool_name, metrics_list in pools.items():
            if not metrics_list:
                continue
                
            latest = metrics_list[-1]
            avg_active = sum(m.active_connections for m in metrics_list) / len(metrics_list)
            max_active = max(m.active_connections for m in metrics_list)
            avg_memory = sum(m.memory_usage_mb for m in metrics_list) / len(metrics_list)
            
            summary["pools"][pool_name] = {
                "current_active": latest.active_connections,
                "pool_size": latest.pool_size,
                "usage_percentage": (latest.active_connections / latest.pool_size * 100) if latest.pool_size > 0 else 0,
                "avg_active": round(avg_active, 2),
                "max_active": max_active,
                "avg_memory_mb": round(avg_memory, 2),
                "total_metrics": len(metrics_list)
            }
        
        return summary
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts."""
        return [asdict(alert) for alert in self.alerts]


# Global connection pool monitor instance
_connection_pool_monitor = None


def get_connection_pool_monitor() -> ConnectionPoolMonitor:
    """Get or create global connection pool monitor instance."""
    global _connection_pool_monitor
    if _connection_pool_monitor is None:
        _connection_pool_monitor = ConnectionPoolMonitor()
    return _connection_pool_monitor


def start_connection_pool_monitoring():
    """Start global connection pool monitoring."""
    monitor = get_connection_pool_monitor()
    monitor.start_monitoring()


def stop_connection_pool_monitoring():
    """Stop global connection pool monitoring."""
    global _connection_pool_monitor
    if _connection_pool_monitor:
        _connection_pool_monitor.stop_monitoring()
        _connection_pool_monitor = None


def get_connection_pool_metrics(hours: int = 1) -> Dict[str, Any]:
    """Get connection pool metrics summary."""
    monitor = get_connection_pool_monitor()
    return monitor.get_metrics_summary(hours)


def get_connection_pool_alerts() -> List[Dict[str, Any]]:
    """Get active connection pool alerts."""
    monitor = get_connection_pool_monitor()
    return monitor.get_active_alerts()