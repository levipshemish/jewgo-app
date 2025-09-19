#!/usr/bin/env python3
"""
Enhanced Health Check Service for JewGo App.

Provides:
- Comprehensive health monitoring
- Dependency health checks
- Performance metrics
- Service status tracking
- Alerting capabilities
"""

import time
import psutil
import threading
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import text
from flask import current_app

from utils.logging_config import get_logger

logger = get_logger(__name__)


class HealthStatus(Enum):
    """Health check status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    name: str
    status: HealthStatus
    message: str
    response_time_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class HealthCheckService:
    """Comprehensive health check service."""
    
    def __init__(self):
        self.checks: Dict[str, Callable] = {}
        self.results: Dict[str, HealthCheckResult] = {}
        self.monitoring_active = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.check_interval = 30  # seconds
        
        # Register default checks
        self._register_default_checks()
    
    def _register_default_checks(self):
        """Register default health checks."""
        self.register_check("database", self._check_database)
        self.register_check("redis", self._check_redis)
        self.register_check("system", self._check_system_resources)
        self.register_check("disk", self._check_disk_space)
        self.register_check("memory", self._check_memory)
        self.register_check("cpu", self._check_cpu)
    
    def register_check(self, name: str, check_function: Callable):
        """Register a health check function."""
        self.checks[name] = check_function
        logger.info(f"Registered health check: {name}")
    
    def run_check(self, name: str) -> HealthCheckResult:
        """Run a specific health check."""
        if name not in self.checks:
            return HealthCheckResult(
                name=name,
                status=HealthStatus.UNKNOWN,
                message=f"Health check '{name}' not found"
            )
        
        start_time = time.time()
        
        try:
            result = self.checks[name]()
            response_time = (time.time() - start_time) * 1000
            
            if isinstance(result, HealthCheckResult):
                result.response_time_ms = response_time
                result.timestamp = datetime.utcnow()
            else:
                # Convert simple result to HealthCheckResult
                result = HealthCheckResult(
                    name=name,
                    status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                    message="Check completed",
                    response_time_ms=response_time
                )
            
            self.results[name] = result
            return result
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            result = HealthCheckResult(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message=f"Health check failed: {str(e)}",
                response_time_ms=response_time,
                details={'error': str(e)}
            )
            
            self.results[name] = result
            logger.error(f"Health check '{name}' failed: {e}")
            return result
    
    def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """Run all registered health checks."""
        results = {}
        
        for name in self.checks:
            results[name] = self.run_check(name)
        
        return results
    
    def get_overall_status(self) -> HealthStatus:
        """Get overall system health status."""
        if not self.results:
            return HealthStatus.UNKNOWN
        
        statuses = [result.status for result in self.results.values()]
        
        if HealthStatus.UNHEALTHY in statuses:
            return HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        elif all(status == HealthStatus.HEALTHY for status in statuses):
            return HealthStatus.HEALTHY
        else:
            return HealthStatus.UNKNOWN
    
    def start_monitoring(self):
        """Start background health monitoring."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info("Health check monitoring started")
    
    def stop_monitoring(self):
        """Stop background health monitoring."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("Health check monitoring stopped")
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        while self.monitoring_active:
            try:
                self.run_all_checks()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                time.sleep(self.check_interval)
    
    def _check_database(self) -> HealthCheckResult:
        """Check database connectivity and performance."""
        try:
            # Get database connection
            db_manager = getattr(current_app, 'unified_connection_manager', None)
            if not db_manager or not db_manager.engine:
                return HealthCheckResult(
                    name="database",
                    status=HealthStatus.UNHEALTHY,
                    message="Database connection manager not available"
                )
            
            # Test connection
            with db_manager.engine.connect() as conn:
                # Simple query test
                result = conn.execute(text("SELECT 1")).fetchone()
                
                if result and result[0] == 1:
                    # Get connection pool stats
                    pool = db_manager.engine.pool
                    pool_stats = {
                        'pool_size': pool.size(),
                        'checked_out': pool.checkedout(),
                        'overflow': pool.overflow(),
                        'checked_in': pool.checkedin()
                    }
                    
                    return HealthCheckResult(
                        name="database",
                        status=HealthStatus.HEALTHY,
                        message="Database connection healthy",
                        details=pool_stats
                    )
                else:
                    return HealthCheckResult(
                        name="database",
                        status=HealthStatus.UNHEALTHY,
                        message="Database query test failed"
                    )
        
        except Exception as e:
            return HealthCheckResult(
                name="database",
                status=HealthStatus.UNHEALTHY,
                message=f"Database check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def _check_redis(self) -> HealthCheckResult:
        """Check Redis connectivity and performance."""
        try:
            # Get Redis connection
            redis_manager = getattr(current_app, 'redis_manager', None)
            if not redis_manager:
                return HealthCheckResult(
                    name="redis",
                    status=HealthStatus.UNHEALTHY,
                    message="Redis manager not available"
                )
            
            # Test Redis connection
            redis_client = redis_manager.get_client()
            if not redis_client:
                return HealthCheckResult(
                    name="redis",
                    status=HealthStatus.UNHEALTHY,
                    message="Redis client not available"
                )
            
            # Ping test
            start_time = time.time()
            redis_client.ping()
            response_time = (time.time() - start_time) * 1000
            
            # Get Redis info
            info = redis_client.info()
            redis_stats = {
                'version': info.get('redis_version'),
                'uptime': info.get('uptime_in_seconds'),
                'connected_clients': info.get('connected_clients'),
                'used_memory': info.get('used_memory_human'),
                'response_time_ms': response_time
            }
            
            return HealthCheckResult(
                name="redis",
                status=HealthStatus.HEALTHY,
                message="Redis connection healthy",
                details=redis_stats
            )
        
        except Exception as e:
            return HealthCheckResult(
                name="redis",
                status=HealthStatus.UNHEALTHY,
                message=f"Redis check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def _check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Load average (Unix only)
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                load_avg = None
            
            system_stats = {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'load_average': load_avg
            }
            
            # Determine status based on resource usage
            status = HealthStatus.HEALTHY
            message = "System resources healthy"
            
            if cpu_percent > 90:
                status = HealthStatus.UNHEALTHY
                message = "CPU usage critically high"
            elif cpu_percent > 80:
                status = HealthStatus.DEGRADED
                message = "CPU usage high"
            elif memory.percent > 90:
                status = HealthStatus.UNHEALTHY
                message = "Memory usage critically high"
            elif memory.percent > 80:
                status = HealthStatus.DEGRADED
                message = "Memory usage high"
            
            return HealthCheckResult(
                name="system",
                status=status,
                message=message,
                details=system_stats
            )
        
        except Exception as e:
            return HealthCheckResult(
                name="system",
                status=HealthStatus.UNHEALTHY,
                message=f"System check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def _check_disk_space(self) -> HealthCheckResult:
        """Check disk space usage."""
        try:
            disk_usage = psutil.disk_usage('/')
            
            disk_stats = {
                'total_gb': disk_usage.total / (1024**3),
                'used_gb': disk_usage.used / (1024**3),
                'free_gb': disk_usage.free / (1024**3),
                'percent_used': (disk_usage.used / disk_usage.total) * 100
            }
            
            # Determine status based on disk usage
            status = HealthStatus.HEALTHY
            message = "Disk space healthy"
            
            if disk_stats['percent_used'] > 95:
                status = HealthStatus.UNHEALTHY
                message = "Disk space critically low"
            elif disk_stats['percent_used'] > 85:
                status = HealthStatus.DEGRADED
                message = "Disk space low"
            
            return HealthCheckResult(
                name="disk",
                status=status,
                message=message,
                details=disk_stats
            )
        
        except Exception as e:
            return HealthCheckResult(
                name="disk",
                status=HealthStatus.UNHEALTHY,
                message=f"Disk check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def _check_memory(self) -> HealthCheckResult:
        """Check memory usage."""
        try:
            memory = psutil.virtual_memory()
            
            memory_stats = {
                'total_gb': memory.total / (1024**3),
                'available_gb': memory.available / (1024**3),
                'used_gb': memory.used / (1024**3),
                'percent_used': memory.percent,
                'cached_gb': memory.cached / (1024**3) if hasattr(memory, 'cached') else 0
            }
            
            # Determine status based on memory usage
            status = HealthStatus.HEALTHY
            message = "Memory usage healthy"
            
            if memory.percent > 95:
                status = HealthStatus.UNHEALTHY
                message = "Memory usage critically high"
            elif memory.percent > 85:
                status = HealthStatus.DEGRADED
                message = "Memory usage high"
            
            return HealthCheckResult(
                name="memory",
                status=status,
                message=message,
                details=memory_stats
            )
        
        except Exception as e:
            return HealthCheckResult(
                name="memory",
                status=HealthStatus.UNHEALTHY,
                message=f"Memory check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def _check_cpu(self) -> HealthCheckResult:
        """Check CPU usage."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            cpu_stats = {
                'cpu_percent': cpu_percent,
                'cpu_count': cpu_count,
                'cpu_freq': psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
            }
            
            # Determine status based on CPU usage
            status = HealthStatus.HEALTHY
            message = "CPU usage healthy"
            
            if cpu_percent > 95:
                status = HealthStatus.UNHEALTHY
                message = "CPU usage critically high"
            elif cpu_percent > 80:
                status = HealthStatus.DEGRADED
                message = "CPU usage high"
            
            return HealthCheckResult(
                name="cpu",
                status=status,
                message=message,
                details=cpu_stats
            )
        
        except Exception as e:
            return HealthCheckResult(
                name="cpu",
                status=HealthStatus.UNHEALTHY,
                message=f"CPU check failed: {str(e)}",
                details={'error': str(e)}
            )
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive health summary."""
        overall_status = self.get_overall_status()
        
        return {
            'overall_status': overall_status.value,
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {
                name: {
                    'status': result.status.value,
                    'message': result.message,
                    'response_time_ms': result.response_time_ms,
                    'details': result.details,
                    'timestamp': result.timestamp.isoformat() if result.timestamp else None
                }
                for name, result in self.results.items()
            },
            'summary': {
                'total_checks': len(self.results),
                'healthy_checks': len([r for r in self.results.values() if r.status == HealthStatus.HEALTHY]),
                'degraded_checks': len([r for r in self.results.values() if r.status == HealthStatus.DEGRADED]),
                'unhealthy_checks': len([r for r in self.results.values() if r.status == HealthStatus.UNHEALTHY]),
                'unknown_checks': len([r for r in self.results.values() if r.status == HealthStatus.UNKNOWN])
            }
        }


# Global health check service instance
health_check_service = HealthCheckService()