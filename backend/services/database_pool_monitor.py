#!/usr/bin/env python3
"""
Database Connection Pool Monitoring Service.
Provides real-time monitoring of database connection pool health and performance.
"""

import time
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from database.unified_connection_manager import UnifiedConnectionManager
from utils.logging_config import get_logger
import os
import threading
from collections import deque

logger = get_logger(__name__)


class DatabasePoolMonitor:
    """Monitor database connection pool health and performance."""
    
    def __init__(self):
        self.database_url = os.environ.get('DATABASE_URL')
        self.engine = None
        self.connection_manager = None
        self.pool_stats_history = deque(maxlen=100)  # Keep last 100 measurements
        self.monitoring_active = False
        self.monitor_thread = None
        self.monitoring_interval = 30  # seconds
        
    def initialize(self):
        """Initialize database engine and start monitoring."""
        try:
            if not self.database_url:
                logger.error("DATABASE_URL not configured")
                return False
            
            # Try to get the global unified connection manager first
            from flask import current_app
            try:
                self.connection_manager = current_app.config.get("unified_connection_manager")
                if self.connection_manager and self.connection_manager.engine:
                    self.engine = self.connection_manager.engine
                    logger.info("Database pool monitor using global unified connection manager")
                else:
                    raise AttributeError("Global unified connection manager not available")
            except (RuntimeError, AttributeError):
                # Fallback: create our own instance
                logger.warning("Global unified connection manager not available, creating local instance")
                self.connection_manager = UnifiedConnectionManager()
                self.connection_manager.connect()
                self.engine = self.connection_manager.engine
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Database pool monitor initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize database pool monitor: {e}")
            return False
    
    def start_monitoring(self):
        """Start background monitoring thread."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("Database pool monitoring started")
    
    def stop_monitoring(self):
        """Stop background monitoring thread."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("Database pool monitoring stopped")
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        while self.monitoring_active:
            try:
                stats = self.get_pool_stats()
                self.pool_stats_history.append({
                    'timestamp': datetime.utcnow(),
                    'stats': stats
                })
                
                # Check for pool health issues
                self._check_pool_health(stats)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
            
            time.sleep(self.monitoring_interval)
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get current connection pool statistics."""
        if not self.engine:
            return {'error': 'Engine not initialized'}
        
        try:
            pool = self.engine.pool
            
            # Get pool statistics
            stats = {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': getattr(pool, 'invalid', lambda: 0)(),  # Handle missing invalid method
                'total_connections': pool.size() + pool.overflow(),
                'available_connections': pool.checkedin(),
                'active_connections': pool.checkedout(),
                'pool_timeout': getattr(pool, 'timeout', lambda: None)(),
                'pool_recycle': getattr(pool, 'recycle', lambda: None)(),
                'pool_pre_ping': getattr(pool, 'pre_ping', lambda: None)()
            }
            
            # Get database-specific stats
            db_stats = self._get_database_stats()
            stats.update(db_stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get pool stats: {e}")
            return {'error': str(e)}
    
    def _get_database_stats(self) -> Dict[str, Any]:
        """Get database-specific statistics."""
        try:
            with self.engine.connect() as conn:
                # Get PostgreSQL-specific stats
                result = conn.execute(text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections,
                        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """))
                
                row = result.fetchone()
                
                return {
                    'db_total_connections': row[0] if row else 0,
                    'db_active_connections': row[1] if row else 0,
                    'db_idle_connections': row[2] if row else 0,
                    'db_idle_in_transaction': row[3] if row else 0
                }
                
        except Exception as e:
            logger.warning(f"Failed to get database stats: {e}")
            return {}
    
    def _check_pool_health(self, stats: Dict[str, Any]):
        """Check for pool health issues and log warnings."""
        if 'error' in stats:
            return
        
        # Check for high connection usage
        total_connections = stats.get('total_connections', 0)
        active_connections = stats.get('active_connections', 0)
        
        if total_connections > 0:
            usage_percentage = (active_connections / total_connections) * 100
            
            if usage_percentage > 80:
                logger.warning(
                    f"High connection pool usage: {usage_percentage:.1f}% "
                    f"({active_connections}/{total_connections})"
                )
            
            if usage_percentage > 95:
                logger.error(
                    f"Critical connection pool usage: {usage_percentage:.1f}% "
                    f"({active_connections}/{total_connections})"
                )
        
        # Check for invalid connections
        invalid_connections = stats.get('invalid', 0)
        if invalid_connections > 0:
            logger.warning(f"Invalid connections detected: {invalid_connections}")
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall pool health status."""
        stats = self.get_pool_stats()
        
        if 'error' in stats:
            return {
                'healthy': False,
                'status': 'error',
                'message': stats['error'],
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Calculate health metrics
        total_connections = stats.get('total_connections', 0)
        active_connections = stats.get('active_connections', 0)
        
        if total_connections == 0:
            usage_percentage = 0
        else:
            usage_percentage = (active_connections / total_connections) * 100
        
        # Determine health status
        if usage_percentage > 95:
            status = 'critical'
            healthy = False
        elif usage_percentage > 80:
            status = 'warning'
            healthy = True
        else:
            status = 'healthy'
            healthy = True
        
        return {
            'healthy': healthy,
            'status': status,
            'usage_percentage': round(usage_percentage, 2),
            'total_connections': total_connections,
            'active_connections': active_connections,
            'available_connections': stats.get('available_connections', 0),
            'pool_size': stats.get('pool_size', 0),
            'overflow': stats.get('overflow', 0),
            'invalid_connections': stats.get('invalid', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_historical_stats(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Get historical pool statistics."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        historical_data = []
        for entry in self.pool_stats_history:
            if entry['timestamp'] >= cutoff_time:
                historical_data.append({
                    'timestamp': entry['timestamp'].isoformat(),
                    'stats': entry['stats']
                })
        
        return historical_data
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics from historical data."""
        if len(self.pool_stats_history) < 2:
            return {'error': 'Insufficient data for performance metrics'}
        
        # Calculate average usage over last hour
        recent_stats = self.get_historical_stats(hours=1)
        
        if not recent_stats:
            return {'error': 'No recent data available'}
        
        usage_percentages = []
        active_connections = []
        
        for entry in recent_stats:
            stats = entry['stats']
            if 'error' not in stats:
                total = stats.get('total_connections', 0)
                active = stats.get('active_connections', 0)
                
                if total > 0:
                    usage_percentages.append((active / total) * 100)
                    active_connections.append(active)
        
        if not usage_percentages:
            return {'error': 'No valid usage data'}
        
        return {
            'average_usage_percentage': round(sum(usage_percentages) / len(usage_percentages), 2),
            'max_usage_percentage': round(max(usage_percentages), 2),
            'min_usage_percentage': round(min(usage_percentages), 2),
            'average_active_connections': round(sum(active_connections) / len(active_connections), 2),
            'max_active_connections': max(active_connections),
            'min_active_connections': min(active_connections),
            'data_points': len(usage_percentages),
            'time_range_hours': 1
        }


# Global instance
db_pool_monitor = DatabasePoolMonitor()