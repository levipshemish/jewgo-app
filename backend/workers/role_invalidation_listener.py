"""
Role invalidation listener worker using PostgreSQL LISTEN/NOTIFY.
This worker maintains a persistent connection to listen for admin role changes
and invalidates Redis and in-process caches accordingly.
"""

import os
import time
import json
import threading
import logging
from typing import Optional, Dict, Any
from utils.logging_config import get_logger
from utils.redis_client import get_redis_client

logger = get_logger(__name__)

# Configuration
ENABLE_LISTENER = os.getenv("ENABLE_ROLE_INVALIDATION_LISTENER", "false").lower() == "true"
NOTIFICATION_CHANNEL = os.getenv("ROLE_NOTIFICATION_CHANNEL", "admin_roles_changed")
RECONNECT_DELAY = int(os.getenv("ROLE_LISTENER_RECONNECT_DELAY", "5"))
MAX_RECONNECT_ATTEMPTS = int(os.getenv("ROLE_LISTENER_MAX_RECONNECT", "10"))
HEALTH_CHECK_INTERVAL = int(os.getenv("ROLE_LISTENER_HEALTH_CHECK", "300"))  # 5 minutes

# Metrics
_metrics = {
    "last_notification": 0,
    "notifications_received": 0,
    "cache_invalidations": 0,
    "reconnect_attempts": 0,
    "connection_errors": 0,
    "start_time": time.time()
}


class RoleInvalidationListener:
    """Listens for PostgreSQL notifications and invalidates role caches."""
    
    def __init__(self):
        self.redis = get_redis_client()
        self.connection = None
        self.cursor = None
        self.running = False
        self.listener_thread = None
        self.health_thread = None
        
        # Validate required environment variables
        self._validate_environment()
        
    def _validate_environment(self):
        """Validate required environment variables."""
        required_vars = ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_PORT"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Role invalidation listener disabled - missing required environment variables: {missing_vars}")
            raise ValueError(f"Missing required environment variables: {missing_vars}")
    
    def start(self):
        """Start the role invalidation listener."""
        if not ENABLE_LISTENER:
            logger.info("Role invalidation listener disabled by ENABLE_ROLE_INVALIDATION_LISTENER=false")
            return False
            
        if self.running:
            logger.warning("Role invalidation listener already running")
            return True
            
        try:
            # Start listener thread
            self.listener_thread = threading.Thread(
                target=self._run_listener,
                daemon=True,
                name="RoleInvalidationListener"
            )
            self.listener_thread.start()
            
            # Start health check thread
            self.health_thread = threading.Thread(
                target=self._health_check_loop,
                daemon=True,
                name="RoleInvalidationHealthCheck"
            )
            self.health_thread.start()
            
            self.running = True
            logger.info("Role invalidation listener started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start role invalidation listener: {e}")
            return False
    
    def stop(self):
        """Stop the role invalidation listener."""
        if not self.running:
            return
            
        self.running = False
        logger.info("Stopping role invalidation listener...")
        
        # Close database connection
        self._close_connection()
        
        # Wait for threads to finish
        if self.listener_thread and self.listener_thread.is_alive():
            self.listener_thread.join(timeout=5)
        if self.health_thread and self.health_thread.is_alive():
            self.health_thread.join(timeout=5)
            
        logger.info("Role invalidation listener stopped")
    
    def _run_listener(self):
        """Main listener loop with automatic reconnection."""
        attempt = 0
        
        while self.running and attempt < MAX_RECONNECT_ATTEMPTS:
            try:
                if self._connect_and_listen():
                    # Reset attempt counter on successful connection
                    attempt = 0
                    self._listen_loop()
                else:
                    attempt += 1
                    
            except Exception as e:
                attempt += 1
                _metrics["connection_errors"] += 1
                logger.error(f"Role invalidation listener error (attempt {attempt}/{MAX_RECONNECT_ATTEMPTS}): {e}")
                
                if attempt < MAX_RECONNECT_ATTEMPTS:
                    time.sleep(RECONNECT_DELAY * attempt)  # Exponential backoff
                else:
                    logger.error("Max reconnection attempts reached - stopping listener")
                    break
        
        if attempt >= MAX_RECONNECT_ATTEMPTS:
            logger.error("Role invalidation listener failed after max reconnection attempts")
    
    def _connect_and_listen(self) -> bool:
        """Establish database connection and start listening."""
        try:
            import psycopg2
            from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
            
            # Connect to PostgreSQL
            self.connection = psycopg2.connect(
                dbname=os.getenv("POSTGRES_DB", "postgres"),
                user=os.getenv("POSTGRES_USER", "postgres"),
                password=os.getenv("POSTGRES_PASSWORD"),
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=os.getenv("POSTGRES_PORT", "5432"),
                # Connection parameters for notification support
                application_name="role_invalidation_listener",
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5
            )
            
            # Set isolation level for notifications
            self.connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            # Create cursor
            self.cursor = self.connection.cursor()
            
            # Start listening for notifications
            self.cursor.execute(f"LISTEN {NOTIFICATION_CHANNEL};")
            
            logger.info(f"Connected to PostgreSQL and listening on channel '{NOTIFICATION_CHANNEL}'")
            return True
            
        except ImportError:
            logger.error("psycopg2 not available - cannot connect to PostgreSQL")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            return False
    
    def _listen_loop(self):
        """Main notification listening loop."""
        try:
            import select
            
            while self.running and self.connection and not self.connection.closed:
                # Wait for notifications with blocking select
                if select.select([self.connection], [], [], 10) == ([], [], []):
                    continue
                    
                # Process notifications
                self.connection.poll()
                while self.connection.notifies:
                    notify = self.connection.notifies.pop()
                    self._handle_notification(notify)
                    
        except Exception as e:
            logger.error(f"Error in notification listening loop: {e}")
        finally:
            self._close_connection()
    
    def _handle_notification(self, notify):
        """Handle a single notification."""
        try:
            payload = notify.payload
            if not payload:
                logger.warning("Received empty notification payload")
                return
                
            # Update metrics
            _metrics["last_notification"] = time.time()
            _metrics["notifications_received"] += 1
            
            logger.info(f"Received notification on channel '{notify.channel}': {payload}")
            
            # Parse payload (expected format: user_id or JSON with user_id)
            try:
                if payload.startswith('{'):
                    # JSON payload
                    data = json.loads(payload)
                    user_id = data.get("user_id")
                else:
                    # Simple string payload
                    user_id = payload
                    
                if user_id:
                    self._invalidate_user_role(user_id)
                else:
                    logger.warning(f"Invalid notification payload format: {payload}")
                    
            except json.JSONDecodeError:
                # Treat as simple user_id string
                self._invalidate_user_role(payload)
                
        except Exception as e:
            logger.error(f"Error handling notification: {e}")
    
    def _invalidate_user_role(self, user_id: str):
        """Invalidate role cache for a specific user."""
        try:
            # Invalidate Redis cache
            if self.redis:
                cache_key = f"admin_role:{user_id}"
                deleted = self.redis.delete(cache_key)
                if deleted:
                    logger.info(f"Invalidated Redis role cache for user {user_id}")
                else:
                    logger.debug(f"No Redis cache found for user {user_id}")
            
            # Invalidate any in-process caches (legacy Supabase role manager removed)
            
            _metrics["cache_invalidations"] += 1
            
        except Exception as e:
            logger.error(f"Error invalidating role cache for user {user_id}: {e}")
    
    def _close_connection(self):
        """Close database connection and cursor."""
        try:
            if self.cursor:
                self.cursor.close()
                self.cursor = None
        except Exception as e:
            logger.warning(f"Error closing cursor: {e}")
            
        try:
            if self.connection and not self.connection.closed:
                self.connection.close()
                self.connection = None
        except Exception as e:
            logger.warning(f"Error closing connection: {e}")
    
    def _health_check_loop(self):
        """Health check loop to monitor listener status."""
        while self.running:
            try:
                time.sleep(HEALTH_CHECK_INTERVAL)
                self._health_check()
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    def _health_check(self):
        """Perform health check and log metrics."""
        try:
            current_time = time.time()
            uptime = current_time - _metrics["start_time"]
            time_since_notification = current_time - _metrics["last_notification"]
            
            # Check connection health
            connection_healthy = (
                self.connection and 
                not self.connection.closed and 
                self.cursor and 
                not self.cursor.closed
            )
            
            logger.info("Role invalidation listener health check", extra={
                "uptime_seconds": int(uptime),
                "connection_healthy": connection_healthy,
                "notifications_received": _metrics["notifications_received"],
                "cache_invalidations": _metrics["cache_invalidations"],
                "time_since_last_notification": int(time_since_notification),
                "reconnect_attempts": _metrics["reconnect_attempts"],
                "connection_errors": _metrics["connection_errors"]
            })
            
            # Alert if no notifications received for extended period
            if time_since_notification > 3600:  # 1 hour
                logger.warning(f"No role change notifications received for {int(time_since_notification)} seconds")
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics."""
        current_time = time.time()
        return {
            "uptime_seconds": int(current_time - _metrics["start_time"]),
            "last_notification": _metrics["last_notification"],
            "notifications_received": _metrics["notifications_received"],
            "cache_invalidations": _metrics["cache_invalidations"],
            "reconnect_attempts": _metrics["reconnect_attempts"],
            "connection_errors": _metrics["connection_errors"],
            "running": self.running,
            "connection_healthy": (
                self.connection and 
                not self.connection.closed and 
                self.cursor and 
                not self.cursor.closed
            )
        }


# Global instance
_role_listener = None


def get_role_listener() -> Optional[RoleInvalidationListener]:
    """Get global role invalidation listener instance."""
    global _role_listener
    if _role_listener is None and ENABLE_LISTENER:
        try:
            _role_listener = RoleInvalidationListener()
        except Exception as e:
            logger.error(f"Failed to create role invalidation listener: {e}")
            return None
    return _role_listener


def start_role_invalidation_listener() -> bool:
    """Start the role invalidation listener."""
    try:
        listener = get_role_listener()
        if listener:
            return listener.start()
        return False
    except Exception as e:
        logger.error(f"Failed to start role invalidation listener: {e}")
        return False


def stop_role_invalidation_listener():
    """Stop the role invalidation listener."""
    global _role_listener
    if _role_listener:
        _role_listener.stop()
        _role_listener = None


def get_listener_metrics() -> Dict[str, Any]:
    """Get role invalidation listener metrics."""
    listener = get_role_listener()
    if listener:
        return listener.get_metrics()
    return {"error": "listener_not_available"}
