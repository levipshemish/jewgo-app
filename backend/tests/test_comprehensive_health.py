#!/usr/bin/env python3
"""
Tests for comprehensive health check system.
"""

import pytest
import asyncio
import os
import time
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone

from services.comprehensive_health_service import ComprehensiveHealthService, HealthCheckResult


class TestComprehensiveHealthService:
    """Test cases for comprehensive health service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.health_service = ComprehensiveHealthService()
    
    def test_get_uptime_seconds(self):
        """Test uptime calculation."""
        # Wait a small amount to ensure uptime > 0
        time.sleep(0.01)
        uptime = self.health_service.get_uptime_seconds()
        assert uptime > 0
        assert isinstance(uptime, float)
    
    @patch.dict(os.environ, {'JWT_SECRET_KEY': 'test-secret-key'})
    async def test_check_jwt_keys_healthy(self):
        """Test JWT keys check when properly configured."""
        result = await self.health_service.check_jwt_keys()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "jwt_keys"
        assert result.status == "healthy"
        assert result.details["keys_configured"] is True
        assert result.details["secret_length"] > 0
        assert result.error is None
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_check_jwt_keys_unhealthy_no_secret(self):
        """Test JWT keys check when not configured."""
        result = await self.health_service.check_jwt_keys()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "jwt_keys"
        assert result.status == "unhealthy"
        assert result.details["keys_configured"] is False
        assert "not configured" in result.error
    
    @patch.dict(os.environ, {'JWT_SECRET_KEY': 'dev-secret'})
    async def test_check_jwt_keys_unhealthy_default_secret(self):
        """Test JWT keys check when using default secret."""
        result = await self.health_service.check_jwt_keys()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "jwt_keys"
        assert result.status == "unhealthy"
        assert result.details["keys_configured"] is True
        assert result.details["using_default"] is True
        assert "default JWT secret" in result.error
    
    @patch.dict(os.environ, {'CSRF_SECRET': 'test-csrf-secret'})
    async def test_check_csrf_config_healthy(self):
        """Test CSRF config check when properly configured."""
        result = await self.health_service.check_csrf_config()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "csrf_config"
        assert result.status == "healthy"
        assert result.details["csrf_configured"] is True
        assert result.details["secret_length"] > 0
        assert result.error is None
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_check_csrf_config_unhealthy_no_secret(self):
        """Test CSRF config check when not configured."""
        result = await self.health_service.check_csrf_config()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "csrf_config"
        assert result.status == "unhealthy"
        assert result.details["csrf_configured"] is False
        assert "not configured" in result.error
    
    @patch.dict(os.environ, {'FRONTEND_ORIGINS': 'https://jewgo.app,https://jewgo-app.vercel.app'})
    async def test_check_cors_origins_healthy(self):
        """Test CORS origins check when properly configured."""
        result = await self.health_service.check_cors_origins()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "cors_origins"
        assert result.status == "healthy"
        assert result.details["origins_configured"] is True
        assert len(result.details["origins"]) == 2
        assert result.details["origin_count"] == 2
        assert result.error is None
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_check_cors_origins_unhealthy_no_origins(self):
        """Test CORS origins check when not configured."""
        result = await self.health_service.check_cors_origins()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "cors_origins"
        assert result.status == "unhealthy"
        assert result.details["origins_configured"] is False
        assert "No CORS origins configured" in result.error
    
    @patch.dict(os.environ, {'FRONTEND_ORIGINS': '*'})
    async def test_check_cors_origins_degraded_wildcard(self):
        """Test CORS origins check when wildcard is used."""
        result = await self.health_service.check_cors_origins()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "cors_origins"
        assert result.status == "degraded"
        assert result.details["origins_configured"] is True
        assert result.details["has_wildcard"] is True
        assert "Wildcard CORS origin detected" in result.warnings[0]
    
    @patch.dict(os.environ, {'DATABASE_URL': 'postgresql://user:pass@localhost/test'})
    @patch('psycopg2.connect')
    async def test_check_database_connectivity_healthy(self, mock_connect):
        """Test database connectivity check when healthy."""
        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock query results
        mock_cursor.fetchone.side_effect = [
            (1,),  # SELECT 1
            ("PostgreSQL 14.5",),  # SELECT version()
            ("testdb", "testuser", "127.0.0.1", 5432)  # Connection info
        ]
        
        result = await self.health_service.check_database_connectivity()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "database_connectivity"
        assert result.status == "healthy"
        assert result.details["connected"] is True
        assert result.details["database"] == "testdb"
        assert result.details["user"] == "testuser"
        assert result.error is None
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_check_database_connectivity_unhealthy_no_url(self):
        """Test database connectivity check when URL not configured."""
        result = await self.health_service.check_database_connectivity()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "database_connectivity"
        assert result.status == "unhealthy"
        assert result.details["connected"] is False
        assert "not configured" in result.error
    
    @patch.dict(os.environ, {'REDIS_URL': 'redis://localhost:6379'})
    @patch('redis.from_url')
    async def test_check_redis_connectivity_healthy(self, mock_redis_from_url):
        """Test Redis connectivity check when healthy."""
        # Mock Redis connection
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Mock Redis operations
        mock_redis.set.return_value = True
        mock_redis.get.return_value = b"health_check_value"
        mock_redis.delete.return_value = 1
        mock_redis.info.return_value = {
            'redis_version': '6.2.7',
            'used_memory_human': '1.2M',
            'connected_clients': 5,
            'total_commands_processed': 1000
        }
        
        result = await self.health_service.check_redis_connectivity()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "redis_connectivity"
        assert result.status == "healthy"
        assert result.details["connected"] is True
        assert result.details["version"] == "6.2.7"
        assert result.error is None
    
    @patch.dict(os.environ, {'SESSION_SECRET': 'test-session-secret', 'COOKIE_DOMAIN': '.jewgo.app'})
    async def test_check_session_system_healthy(self):
        """Test session system check when properly configured."""
        result = await self.health_service.check_session_system()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "session_system"
        assert result.status == "healthy"
        assert result.details["session_secret_configured"] is True
        assert result.details["cookie_domain_configured"] is True
        assert result.error is None
        assert result.warnings is None
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_check_session_system_unhealthy_no_secret(self):
        """Test session system check when not configured."""
        result = await self.health_service.check_session_system()
        
        assert isinstance(result, HealthCheckResult)
        assert result.name == "session_system"
        assert result.status == "unhealthy"
        assert result.details["session_secret_configured"] is False
        assert "Session secret not configured" in result.warnings[0]
    
    @patch.dict(os.environ, {
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'CSRF_SECRET': 'test-csrf-secret',
        'FRONTEND_ORIGINS': 'https://jewgo.app',
        'DATABASE_URL': 'postgresql://user:pass@localhost/test',
        'REDIS_URL': 'redis://localhost:6379',
        'SESSION_SECRET': 'test-session-secret',
        'COOKIE_DOMAIN': '.jewgo.app'
    })
    @patch('psycopg2.connect')
    @patch('redis.from_url')
    async def test_run_all_health_checks_healthy(self, mock_redis_from_url, mock_connect):
        """Test running all health checks when everything is healthy."""
        # Mock database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [
            (1,),  # SELECT 1
            ("PostgreSQL 14.5",),  # SELECT version()
            ("testdb", "testuser", "127.0.0.1", 5432)  # Connection info
        ]
        
        # Mock Redis connection
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        mock_redis.set.return_value = True
        mock_redis.get.return_value = b"health_check_value"
        mock_redis.delete.return_value = 1
        mock_redis.info.return_value = {
            'redis_version': '6.2.7',
            'used_memory_human': '1.2M',
            'connected_clients': 5,
            'total_commands_processed': 1000
        }
        
        result = await self.health_service.run_all_health_checks()
        
        assert isinstance(result, dict)
        assert result["status"] == "healthy"
        assert "timestamp" in result
        assert "uptime_seconds" in result
        assert "total_check_time_ms" in result
        assert "checks" in result
        
        # Check that all health checks are present
        expected_checks = [
            "jwt_keys", "csrf_config", "cors_origins", 
            "database_connectivity", "redis_connectivity", "session_system"
        ]
        for check_name in expected_checks:
            assert check_name in result["checks"]
            assert result["checks"][check_name]["status"] == "healthy"
    
    @patch.dict(os.environ, {}, clear=True)
    async def test_run_all_health_checks_unhealthy(self):
        """Test running all health checks when nothing is configured."""
        result = await self.health_service.run_all_health_checks()
        
        assert isinstance(result, dict)
        assert result["status"] == "unhealthy"
        assert "errors" in result
        assert len(result["errors"]) > 0
    
    def test_get_health_summary(self):
        """Test getting health summary."""
        summary = self.health_service.get_health_summary()
        
        assert isinstance(summary, dict)
        assert summary["status"] == "healthy"
        assert "timestamp" in summary
        assert "uptime_seconds" in summary
        assert "service" in summary
        assert "version" in summary


@pytest.mark.asyncio
class TestHealthCheckIntegration:
    """Integration tests for health check system."""
    
    async def test_health_check_performance(self):
        """Test that health checks complete within acceptable time."""
        health_service = ComprehensiveHealthService()
        
        start_time = time.time()
        result = await health_service.run_all_health_checks()
        end_time = time.time()
        
        total_time_ms = (end_time - start_time) * 1000
        
        # Health checks should complete quickly
        assert total_time_ms < 5000  # Less than 5 seconds
        assert result["total_check_time_ms"] < 5000
    
    async def test_health_check_error_handling(self):
        """Test that health checks handle errors gracefully."""
        health_service = ComprehensiveHealthService()
        
        # Test with invalid database URL
        with patch.dict(os.environ, {'DATABASE_URL': 'invalid://url'}):
            result = await health_service.check_database_connectivity()
            assert result.status == "unhealthy"
            assert result.error is not None
    
    async def test_health_check_response_times(self):
        """Test that health checks track response times."""
        health_service = ComprehensiveHealthService()
        
        # Test a simple check
        result = await health_service.check_jwt_keys()
        assert isinstance(result.response_time_ms, float)
        assert result.response_time_ms >= 0
