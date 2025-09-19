#!/usr/bin/env python3
"""
Enhanced Health Check Service for JewGo Backend
===============================================

This service provides comprehensive health checks for all system components:
- Database connectivity and performance
- Redis connectivity and performance  
- External service dependencies
- System resources (CPU, memory, disk)
- Application-specific health metrics

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import time
import psutil
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import text
from utils.logging_config import get_logger

logger = get_logger(__name__)


class HealthStatus(Enum):
    """Health check status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    status: HealthStatus
    message: str
    response_time_ms: float
    details: Dict[str, Any]
    timestamp: datetime


class EnhancedHealthService:
    """Comprehensive health check service."""
    
    def __init__(self):
        self.checks = {}
        self.last_results = {}
        self.start_time = datetime.utcnow()
        
    def register_check(self, name: str, check_func, critical: bool = False):
        """Register a health check function."""
        self.checks[name] = {
            'function': check_func,
            'critical': critical,
            'last_run': None,
            'consecutive_failures': 0
        }
        logger.info(f"Registered health check: {name}")
    
    def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """Run all registered health checks."""
        results = {}
        
        for name, check_info in self.checks.items():
            try:
                start_time = time.time()
                result = check_info['function']()
                response_time = (time.time() - start_time) * 1000
                
                if isinstance(result, tuple):
                    status, message, details = result
                else:
                    status = HealthStatus.HEALTHY
                    message = "OK"
                    details = result if isinstance(result, dict) else {}
                
                health_result = HealthCheckResult(
                    status=status,
                    message=message,
                    response_time_ms=response_time,
                    details=details,
                    timestamp=datetime.utcnow()
                )
                
                results[name] = health_result
                self.last_results[name] = health_result
                
                # Track consecutive failures
                if status in [HealthStatus.UNHEALTHY, HealthStatus.CRITICAL]:
                    check_info['consecutive_failures'] += 1
                else:
                    check_info['consecutive_failures'] = 0
                
                check_info['last_run'] = datetime.utcnow()
                
            except Exception as e:
                logger.error(f"Health check {name} failed with exception: {e}")
                results[name] = HealthCheckResult(
                    status=HealthStatus.CRITICAL,
                    message=f"Check failed: {str(e)}",
                    response_time_ms=0,
                    details={'error': str(e)},
                    timestamp=datetime.utcnow()
                )
                check_info['consecutive_failures'] += 1
        
        return results
    
    def get_overall_status(self) -> Dict[str, Any]:
        """Get overall system health status."""
        results = self.run_all_checks()
        
        # Determine overall status
        critical_failures = 0
        unhealthy_failures = 0
        degraded_failures = 0
        
        for name, result in results.items():
            check_info = self.checks[name]
            if result.status == HealthStatus.CRITICAL:
                critical_failures += 1
            elif result.status == HealthStatus.UNHEALTHY:
                unhealthy_failures += 1
            elif result.status == HealthStatus.DEGRADED:
                degraded_failures += 1
        
        # Determine overall status
        if critical_failures > 0:
            overall_status = HealthStatus.CRITICAL
        elif unhealthy_failures > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif degraded_failures > 0:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Calculate uptime
        uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            'status': overall_status.value,
            'timestamp': datetime.utcnow().isoformat(),
            'uptime_seconds': uptime_seconds,
            'uptime_human': self._format_uptime(uptime_seconds),
            'checks': {
                name: {
                    'status': result.status.value,
                    'message': result.message,
                    'response_time_ms': result.response_time_ms,
                    'critical': self.checks[name]['critical'],
                    'consecutive_failures': self.checks[name]['consecutive_failures'],
                    'last_run': result.timestamp.isoformat()
                }
                for name, result in results.items()
            },
            'summary': {
                'total_checks': len(results),
                'healthy': len([r for r in results.values() if r.status == HealthStatus.HEALTHY]),
                'degraded': len([r for r in results.values() if r.status == HealthStatus.DEGRADED]),
                'unhealthy': len([r for r in results.values() if r.status == HealthStatus.UNHEALTHY]),
                'critical': len([r for r in results.values() if r.status == HealthStatus.CRITICAL])
            }
        }
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human-readable format."""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"


# Health check functions
def check_database_health():
    """Check database connectivity and performance."""
    try:
        from database.unified_connection_manager import get_unified_connection_manager
        
        start_time = time.time()
        connection_manager = get_unified_connection_manager()
        
        # Test basic connectivity
        with connection_manager.session_scope() as session:
            result = session.execute(text("SELECT 1 as health_check"))
            result.fetchone()
        
        response_time = (time.time() - start_time) * 1000
        
        # Get connection pool stats
        pool_stats = connection_manager.get_connection_info()
        
        # Determine status based on response time and pool health
        if response_time > 1000:  # > 1 second
            status = HealthStatus.CRITICAL
            message = f"Database response time too slow: {response_time:.1f}ms"
        elif response_time > 500:  # > 500ms
            status = HealthStatus.DEGRADED
            message = f"Database response time elevated: {response_time:.1f}ms"
        else:
            status = HealthStatus.HEALTHY
            message = f"Database healthy: {response_time:.1f}ms"
        
        return status, message, {
            'response_time_ms': response_time,
            'pool_stats': pool_stats,
            'connected': connection_manager.is_connected()
        }
        
    except Exception as e:
        return HealthStatus.CRITICAL, f"Database check failed: {str(e)}", {'error': str(e)}


def check_redis_health():
    """Check Redis connectivity and performance."""
    try:
        from cache.redis_manager_v5 import get_redis_manager_v5
        
        start_time = time.time()
        redis_manager = get_redis_manager_v5()
        
        # Test basic connectivity
        test_key = f"health_check_{int(time.time())}"
        redis_manager.set(test_key, "test_value", ttl=10)
        value = redis_manager.get(test_key)
        redis_manager.delete(test_key)
        
        response_time = (time.time() - start_time) * 1000
        
        if value != "test_value":
            return HealthStatus.CRITICAL, "Redis read/write test failed", {}
        
        if response_time > 100:  # > 100ms
            status = HealthStatus.DEGRADED
            message = f"Redis response time elevated: {response_time:.1f}ms"
        else:
            status = HealthStatus.HEALTHY
            message = f"Redis healthy: {response_time:.1f}ms"
        
        return status, message, {
            'response_time_ms': response_time,
            'test_passed': True
        }
        
    except Exception as e:
        return HealthStatus.CRITICAL, f"Redis check failed: {str(e)}", {'error': str(e)}


def check_system_resources():
    """Check system resource usage."""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Determine status
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
            status = HealthStatus.CRITICAL
            message = "System resources critically high"
        elif cpu_percent > 80 or memory.percent > 80 or disk.percent > 80:
            status = HealthStatus.DEGRADED
            message = "System resources elevated"
        else:
            status = HealthStatus.HEALTHY
            message = "System resources healthy"
        
        return status, message, {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_used_gb': memory.used / (1024**3),
            'memory_total_gb': memory.total / (1024**3),
            'disk_percent': disk.percent,
            'disk_used_gb': disk.used / (1024**3),
            'disk_total_gb': disk.total / (1024**3)
        }
        
    except Exception as e:
        return HealthStatus.CRITICAL, f"System resource check failed: {str(e)}", {'error': str(e)}


def check_application_health():
    """Check application-specific health metrics."""
    try:
        from services.database_pool_monitor import db_pool_monitor
        
        # Get database pool health
        pool_health = db_pool_monitor.get_health_status()
        
        # Check if pool is healthy
        if not pool_health.get('healthy', False):
            status = HealthStatus.DEGRADED
            message = f"Database pool unhealthy: {pool_health.get('status', 'unknown')}"
        else:
            status = HealthStatus.HEALTHY
            message = "Application components healthy"
        
        return status, message, {
            'database_pool': pool_health,
            'application_started': True
        }
        
    except Exception as e:
        return HealthStatus.DEGRADED, f"Application health check failed: {str(e)}", {'error': str(e)}


# Global health service instance
health_service = EnhancedHealthService()

# Register default health checks
health_service.register_check('database', check_database_health, critical=True)
health_service.register_check('redis', check_redis_health, critical=True)
health_service.register_check('system_resources', check_system_resources, critical=False)
health_service.register_check('application', check_application_health, critical=False)


def get_health_service() -> EnhancedHealthService:
    """Get the global health service instance."""
    return health_service