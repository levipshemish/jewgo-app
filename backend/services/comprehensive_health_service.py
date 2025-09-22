#!/usr/bin/env python3
"""
Comprehensive Health Check Service
Provides detailed health checks for JWT keys, CSRF config, CORS origins, database connectivity, and Redis.
"""

import time
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import asyncio
import redis
import psycopg2

from utils.logging_config import get_logger
from config.config import get_config

logger = get_logger(__name__)


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    name: str
    status: str  # "healthy", "unhealthy", "degraded"
    response_time_ms: float
    details: Dict[str, Any]
    error: Optional[str] = None
    warnings: Optional[List[str]] = None


class ComprehensiveHealthService:
    """Comprehensive health check service for authentication and infrastructure."""
    
    def __init__(self):
        """Initialize the health service."""
        self.logger = logger
        self.config = get_config()
        self.start_time = datetime.now(timezone.utc)
        
        # Health check thresholds
        self.max_response_time_ms = 100  # Target <100ms p95
        self.warning_response_time_ms = 50  # Warning at 50ms
        
    def get_uptime_seconds(self) -> float:
        """Get service uptime in seconds."""
        return (datetime.now(timezone.utc) - self.start_time).total_seconds()
    
    async def check_jwt_keys(self) -> HealthCheckResult:
        """Check JWT key presence and configuration."""
        start_time = time.time()
        
        try:
            # Check if JWT secret is configured
            jwt_secret = os.getenv('JWT_SECRET_KEY')
            if not jwt_secret:
                return HealthCheckResult(
                    name="jwt_keys",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"keys_configured": False},
                    error="JWT secret key not configured"
                )
            
            # Check if JWT secret is not the default development value
            default_secrets = ["your-secret-key", "dev-secret", "development", "changeme"]
            if jwt_secret in default_secrets:
                return HealthCheckResult(
                    name="jwt_keys",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"keys_configured": True, "using_default": True},
                    error="Using default JWT secret - not secure for production"
                )
            
            # Check for additional JWT configuration
            jwt_algorithm = os.getenv('JWT_ALGORITHM', 'HS256')
            jwt_expiry = os.getenv('JWT_EXPIRY_SECONDS', '3600')
            
            return HealthCheckResult(
                name="jwt_keys",
                status="healthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={
                    "keys_configured": True,
                    "algorithm": jwt_algorithm,
                    "expiry_seconds": int(jwt_expiry),
                    "secret_length": len(jwt_secret)
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="jwt_keys",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={},
                error=f"JWT key check failed: {str(e)}"
            )
    
    async def check_csrf_config(self) -> HealthCheckResult:
        """Check CSRF configuration."""
        start_time = time.time()
        
        try:
            csrf_secret = os.getenv('CSRF_SECRET')
            csrf_token_lifetime = os.getenv('CSRF_TOKEN_LIFETIME', '3600')
            
            if not csrf_secret:
                return HealthCheckResult(
                    name="csrf_config",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"csrf_configured": False},
                    error="CSRF secret not configured"
                )
            
            # Check if CSRF secret is not default
            default_csrf = ["csrf-secret", "changeme", "development"]
            if csrf_secret in default_csrf:
                return HealthCheckResult(
                    name="csrf_config",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"csrf_configured": True, "using_default": True},
                    error="Using default CSRF secret - not secure for production"
                )
            
            return HealthCheckResult(
                name="csrf_config",
                status="healthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={
                    "csrf_configured": True,
                    "token_lifetime_seconds": int(csrf_token_lifetime),
                    "secret_length": len(csrf_secret)
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="csrf_config",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={},
                error=f"CSRF config check failed: {str(e)}"
            )
    
    async def check_cors_origins(self) -> HealthCheckResult:
        """Check CORS origins configuration."""
        start_time = time.time()
        
        try:
            cors_origins = os.getenv('FRONTEND_ORIGINS', '')
            allowed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
            
            if not allowed_origins:
                return HealthCheckResult(
                    name="cors_origins",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"origins_configured": False},
                    error="No CORS origins configured"
                )
            
            # Check for wildcard origins (security risk)
            if '*' in allowed_origins:
                return HealthCheckResult(
                    name="cors_origins",
                    status="degraded",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={
                        "origins_configured": True,
                        "origins": allowed_origins,
                        "has_wildcard": True
                    },
                    warnings=["Wildcard CORS origin detected - security risk"]
                )
            
            return HealthCheckResult(
                name="cors_origins",
                status="healthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={
                    "origins_configured": True,
                    "origins": allowed_origins,
                    "origin_count": len(allowed_origins)
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="cors_origins",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={},
                error=f"CORS origins check failed: {str(e)}"
            )
    
    async def check_database_connectivity(self) -> HealthCheckResult:
        """Check database connectivity and performance."""
        start_time = time.time()
        
        try:
            # Get database URL from environment
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                return HealthCheckResult(
                    name="database_connectivity",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"connected": False},
                    error="Database URL not configured"
                )
            
            # Test database connection
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor()
            
            # Simple query to test connectivity
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            # Get database version
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
            
            # Get connection info
            cursor.execute("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()")
            db_info = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                name="database_connectivity",
                status="healthy" if response_time < self.max_response_time_ms else "degraded",
                response_time_ms=response_time,
                details={
                    "connected": True,
                    "database": db_info[0] if db_info else "unknown",
                    "user": db_info[1] if db_info else "unknown",
                    "host": db_info[2] if db_info else "unknown",
                    "port": db_info[3] if db_info else "unknown",
                    "version": version[:50] + "..." if len(version) > 50 else version
                },
                warnings=[f"Database response time {response_time:.1f}ms exceeds warning threshold"] if response_time > self.warning_response_time_ms else None
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="database_connectivity",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"connected": False},
                error=f"Database connection failed: {str(e)}"
            )
    
    async def check_redis_connectivity(self) -> HealthCheckResult:
        """Check Redis connectivity and session system validation."""
        start_time = time.time()
        
        try:
            redis_url = os.getenv('REDIS_URL')
            if not redis_url:
                return HealthCheckResult(
                    name="redis_connectivity",
                    status="unhealthy",
                    response_time_ms=(time.time() - start_time) * 1000,
                    details={"connected": False},
                    error="Redis URL not configured"
                )
            
            # Connect to Redis
            r = redis.from_url(redis_url)
            
            # Test basic operations
            test_key = f"health_check_{int(time.time())}"
            test_value = "health_check_value"
            
            # Set and get test
            r.set(test_key, test_value, ex=60)
            retrieved_value = r.get(test_key)
            r.delete(test_key)

            if retrieved_value is None:
                raise Exception("Redis read/write test failed: value not found")

            if isinstance(retrieved_value, bytes):
                normalized_value = retrieved_value.decode("utf-8", errors="replace")
            else:
                normalized_value = str(retrieved_value)

            if normalized_value != test_value:
                raise Exception("Redis read/write test failed")
            
            # Get Redis info
            info = r.info()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                name="redis_connectivity",
                status="healthy" if response_time < self.max_response_time_ms else "degraded",
                response_time_ms=response_time,
                details={
                    "connected": True,
                    "version": info.get('redis_version', 'unknown'),
                    "used_memory_human": info.get('used_memory_human', 'unknown'),
                    "connected_clients": info.get('connected_clients', 0),
                    "total_commands_processed": info.get('total_commands_processed', 0)
                },
                warnings=[f"Redis response time {response_time:.1f}ms exceeds warning threshold"] if response_time > self.warning_response_time_ms else None
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="redis_connectivity",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"connected": False},
                error=f"Redis connection failed: {str(e)}"
            )
    
    async def check_session_system(self) -> HealthCheckResult:
        """Check session system validation."""
        start_time = time.time()
        
        try:
            # Check if session-related environment variables are configured
            session_secret = os.getenv('SESSION_SECRET')
            cookie_domain = os.getenv('COOKIE_DOMAIN')
            cookie_secure = os.getenv('COOKIE_SECURE', 'true').lower() == 'true'
            
            details = {
                "session_secret_configured": bool(session_secret),
                "cookie_domain_configured": bool(cookie_domain),
                "cookie_secure": cookie_secure
            }
            
            warnings = []
            if not session_secret:
                warnings.append("Session secret not configured")
            if not cookie_domain:
                warnings.append("Cookie domain not configured")
            if not cookie_secure and os.getenv('NODE_ENV') == 'production':
                warnings.append("Cookies not secure in production")
            
            status = "healthy"
            if not session_secret:
                status = "unhealthy"
            elif warnings:
                status = "degraded"
            
            return HealthCheckResult(
                name="session_system",
                status=status,
                response_time_ms=(time.time() - start_time) * 1000,
                details=details,
                warnings=warnings if warnings else None
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="session_system",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={},
                error=f"Session system check failed: {str(e)}"
            )
    
    async def run_all_health_checks(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status."""
        start_time = time.time()
        
        # Run all health checks concurrently
        checks = await asyncio.gather(
            self.check_jwt_keys(),
            self.check_csrf_config(),
            self.check_cors_origins(),
            self.check_database_connectivity(),
            self.check_redis_connectivity(),
            self.check_session_system(),
            return_exceptions=True
        )
        
        total_time = (time.time() - start_time) * 1000
        
        # Process results
        results = {}
        overall_status = "healthy"
        warnings = []
        errors = []
        
        for check in checks:
            if isinstance(check, Exception):
                results["error"] = {
                    "status": "unhealthy",
                    "error": str(check)
                }
                overall_status = "unhealthy"
                errors.append(str(check))
            else:
                results[check.name] = {
                    "status": check.status,
                    "response_time_ms": round(check.response_time_ms, 2),
                    "details": check.details,
                    "error": check.error,
                    "warnings": check.warnings
                }
                
                if check.status == "unhealthy":
                    overall_status = "unhealthy"
                    if check.error:
                        errors.append(check.error)
                elif check.status == "degraded":
                    if overall_status == "healthy":
                        overall_status = "degraded"
                    if check.warnings:
                        warnings.extend(check.warnings)
        
        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(self.get_uptime_seconds(), 2),
            "total_check_time_ms": round(total_time, 2),
            "checks": results,
            "warnings": warnings if warnings else None,
            "errors": errors if errors else None
        }
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get a quick health summary without running all checks."""
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(self.get_uptime_seconds(), 2),
            "service": "comprehensive_health_service",
            "version": "1.0.0"
        }


# Global health service instance
health_service = ComprehensiveHealthService()
