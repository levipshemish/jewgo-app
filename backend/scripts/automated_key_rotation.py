#!/usr/bin/env python3
"""
Automated JWT Key Rotation System

This script provides automated key rotation with monitoring, alerting,
and integration with the security monitoring system.

Features:
- Scheduled key rotation based on age and usage
- Health monitoring and alerting
- Integration with Prometheus metrics
- Emergency rotation triggers
- Rollback capabilities
- Audit logging

Usage:
    python automated_key_rotation.py --daemon     # Run as daemon
    python automated_key_rotation.py --check      # One-time check
    python automated_key_rotation.py --emergency  # Emergency rotation
"""

import sys
import os
import time
import signal
import argparse
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth.jwks_manager import JWKSManager
from services.auth.auth_metrics_v5 import AuthMetrics
from cache.redis_manager_v5 import get_redis_manager_v5
from utils.logging_config import get_logger

logger = get_logger(__name__)

class AutomatedKeyRotation:
    """Automated JWT key rotation system."""
    
    def __init__(self):
        self.jwks_manager = JWKSManager()
        self.auth_metrics = AuthMetrics()
        self.redis_manager = get_redis_manager_v5()
        self.running = False
        self.rotation_thread = None
        
        # Configuration
        self.config = {
            'rotation_interval_hours': int(os.getenv('JWT_ROTATION_INTERVAL_HOURS', '168')),  # 7 days
            'check_interval_minutes': int(os.getenv('JWT_CHECK_INTERVAL_MINUTES', '60')),    # 1 hour
            'emergency_threshold_hours': int(os.getenv('JWT_EMERGENCY_THRESHOLD_HOURS', '24')),  # 24 hours
            'max_key_age_days': int(os.getenv('JWT_MAX_KEY_AGE_DAYS', '30')),               # 30 days
            'min_keys_required': int(os.getenv('JWT_MIN_KEYS_REQUIRED', '2')),              # 2 keys minimum
            'enable_metrics': os.getenv('JWT_ENABLE_METRICS', 'true').lower() == 'true',
            'enable_alerts': os.getenv('JWT_ENABLE_ALERTS', 'true').lower() == 'true',
        }
        
        logger.info("Automated key rotation system initialized", config=self.config)
    
    def start_daemon(self):
        """Start the key rotation daemon."""
        if self.running:
            logger.warning("Key rotation daemon is already running")
            return
        
        self.running = True
        self.rotation_thread = threading.Thread(target=self._rotation_loop, daemon=True)
        self.rotation_thread.start()
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
        
        logger.info("Key rotation daemon started")
        
        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_daemon()
    
    def stop_daemon(self):
        """Stop the key rotation daemon."""
        if not self.running:
            return
        
        logger.info("Stopping key rotation daemon...")
        self.running = False
        
        if self.rotation_thread and self.rotation_thread.is_alive():
            self.rotation_thread.join(timeout=30)
        
        logger.info("Key rotation daemon stopped")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop_daemon()
    
    def _rotation_loop(self):
        """Main rotation loop."""
        logger.info("Key rotation loop started")
        
        while self.running:
            try:
                # Perform rotation check
                self._perform_rotation_check()
                
                # Update metrics
                if self.config['enable_metrics']:
                    self._update_metrics()
                
                # Sleep until next check
                sleep_seconds = self.config['check_interval_minutes'] * 60
                for _ in range(sleep_seconds):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error in rotation loop: {e}", exc_info=True)
                
                # Send alert
                if self.config['enable_alerts']:
                    self._send_alert('rotation_loop_error', str(e))
                
                # Sleep before retrying
                time.sleep(60)
    
    def _perform_rotation_check(self):
        """Perform rotation check and rotate if needed."""
        try:
            rotation_needed, reason = self._should_rotate_keys()
            
            if rotation_needed:
                logger.info(f"Key rotation needed: {reason}")
                success = self._rotate_keys_with_monitoring()
                
                if success:
                    logger.info("Automated key rotation completed successfully")
                    if self.config['enable_metrics']:
                        self.auth_metrics.record_key_rotation(success=True)
                else:
                    logger.error("Automated key rotation failed")
                    if self.config['enable_metrics']:
                        self.auth_metrics.record_key_rotation(success=False)
                    
                    if self.config['enable_alerts']:
                        self._send_alert('key_rotation_failed', 'Automated key rotation failed')
            else:
                logger.debug("No key rotation needed")
                
        except Exception as e:
            logger.error(f"Error in rotation check: {e}", exc_info=True)
            
            if self.config['enable_alerts']:
                self._send_alert('rotation_check_error', str(e))
    
    def _should_rotate_keys(self) -> tuple[bool, str]:
        """Check if keys should be rotated."""
        try:
            current_key = self.jwks_manager.get_current_key()
            if not current_key:
                return True, "No current key found"
            
            # Check key age
            created_at = datetime.fromisoformat(current_key['created_at'].replace('Z', '+00:00'))
            key_age = datetime.now(timezone.utc) - created_at
            
            # Regular rotation based on age
            rotation_interval = timedelta(hours=self.config['rotation_interval_hours'])
            if key_age >= rotation_interval:
                return True, f"Key age ({key_age}) exceeds rotation interval ({rotation_interval})"
            
            # Emergency rotation based on usage or compromise indicators
            if self._check_emergency_rotation_needed():
                return True, "Emergency rotation triggered"
            
            # Check if we have minimum number of keys
            jwks = self.jwks_manager.get_public_jwks()
            if len(jwks.get('keys', [])) < self.config['min_keys_required']:
                return True, f"Insufficient keys ({len(jwks.get('keys', []))}) - minimum required: {self.config['min_keys_required']}"
            
            # Check for old keys that need cleanup
            if self._has_expired_keys():
                return True, "Expired keys need cleanup"
            
            return False, "No rotation needed"
            
        except Exception as e:
            logger.error(f"Error checking rotation need: {e}")
            return True, f"Error in rotation check: {e}"
    
    def _check_emergency_rotation_needed(self) -> bool:
        """Check if emergency rotation is needed."""
        try:
            # Check for security indicators in Redis
            emergency_key = "jwt:emergency_rotation_required"
            if self.redis_manager.exists(emergency_key, prefix='auth'):
                reason = self.redis_manager.get(emergency_key, prefix='auth')
                logger.warning(f"Emergency rotation flag found: {reason}")
                # Clear the flag
                self.redis_manager.delete(emergency_key, prefix='auth')
                return True
            
            # Check for high failure rates (potential compromise)
            if self._check_high_failure_rates():
                return True
            
            # Check for suspicious patterns
            if self._check_suspicious_patterns():
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking emergency rotation: {e}")
            return False
    
    def _check_high_failure_rates(self) -> bool:
        """Check for high authentication failure rates."""
        try:
            # This would integrate with your metrics system
            # For now, return False as we don't have the metrics implementation
            return False
            
        except Exception as e:
            logger.error(f"Error checking failure rates: {e}")
            return False
    
    def _check_suspicious_patterns(self) -> bool:
        """Check for suspicious authentication patterns."""
        try:
            # Check for replay attacks
            replay_key = "auth:replay_attacks_detected"
            if self.redis_manager.exists(replay_key, prefix='auth'):
                logger.warning("Replay attacks detected - triggering emergency rotation")
                return True
            
            # Check for brute force attempts
            brute_force_key = "auth:brute_force_detected"
            if self.redis_manager.exists(brute_force_key, prefix='auth'):
                logger.warning("Brute force attacks detected - triggering emergency rotation")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking suspicious patterns: {e}")
            return False
    
    def _has_expired_keys(self) -> bool:
        """Check if there are expired keys that need cleanup."""
        try:
            key_list = self.jwks_manager._get_key_list()
            max_age = timedelta(days=self.config['max_key_age_days'])
            
            for kid in key_list:
                key_data = self.jwks_manager.get_key_by_kid(kid)
                if key_data and key_data['status'] == 'retired':
                    created_at = datetime.fromisoformat(key_data['created_at'].replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) - created_at > max_age:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking expired keys: {e}")
            return False
    
    def _rotate_keys_with_monitoring(self) -> bool:
        """Rotate keys with comprehensive monitoring."""
        start_time = time.time()
        
        try:
            # Pre-rotation health check
            health = self.jwks_manager.health_check()
            if health['status'] != 'healthy':
                logger.error(f"JWKS manager unhealthy before rotation: {health}")
                return False
            
            # Perform rotation
            success, message = self.jwks_manager.rotate_keys()
            
            if success:
                # Post-rotation verification
                if self._verify_rotation_success():
                    duration = time.time() - start_time
                    logger.info(f"Key rotation completed successfully in {duration:.2f}s")
                    
                    # Update metrics
                    if self.config['enable_metrics']:
                        self.auth_metrics.record_key_rotation_duration(duration)
                    
                    # Send success notification
                    if self.config['enable_alerts']:
                        self._send_notification('key_rotation_success', 
                                              f"Key rotation completed successfully: {message}")
                    
                    return True
                else:
                    logger.error("Key rotation verification failed")
                    return False
            else:
                logger.error(f"Key rotation failed: {message}")
                return False
                
        except Exception as e:
            logger.error(f"Error during key rotation: {e}", exc_info=True)
            return False
    
    def _verify_rotation_success(self) -> bool:
        """Verify that key rotation was successful."""
        try:
            # Check that we have a current key
            current_key = self.jwks_manager.get_current_key()
            if not current_key:
                logger.error("No current key after rotation")
                return False
            
            # Check that JWKS endpoint is accessible
            jwks = self.jwks_manager.get_public_jwks()
            if not jwks or not jwks.get('keys'):
                logger.error("JWKS endpoint not accessible after rotation")
                return False
            
            # Check that we can sign and verify a test token
            try:
                test_payload = {'test': True, 'iat': int(time.time())}
                test_token = self.jwks_manager.sign_token(test_payload)
                verified_payload = self.jwks_manager.verify_token(test_token)
                
                if not verified_payload or verified_payload.get('test') != True:
                    logger.error("Test token verification failed after rotation")
                    return False
                    
            except Exception as e:
                logger.error(f"Test token verification error: {e}")
                return False
            
            logger.info("Key rotation verification successful")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying rotation: {e}")
            return False
    
    def _update_metrics(self):
        """Update rotation system metrics."""
        try:
            # Key age metrics
            current_key = self.jwks_manager.get_current_key()
            if current_key:
                created_at = datetime.fromisoformat(current_key['created_at'].replace('Z', '+00:00'))
                key_age_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
                
                if self.config['enable_metrics']:
                    self.auth_metrics.record_key_age(key_age_hours)
            
            # Key count metrics
            jwks = self.jwks_manager.get_public_jwks()
            key_count = len(jwks.get('keys', []))
            
            if self.config['enable_metrics']:
                self.auth_metrics.record_key_count(key_count)
            
            # Health metrics
            health = self.jwks_manager.health_check()
            health_status = 1 if health['status'] == 'healthy' else 0
            
            if self.config['enable_metrics']:
                self.auth_metrics.record_jwks_health(health_status)
                
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    def _send_alert(self, alert_type: str, message: str):
        """Send security alert."""
        try:
            alert_data = {
                'type': alert_type,
                'message': message,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'severity': 'high' if 'emergency' in alert_type or 'failed' in alert_type else 'medium'
            }
            
            # Store alert in Redis for monitoring system
            alert_key = f"security_alerts:{alert_type}:{int(time.time())}"
            self.redis_manager.set(alert_key, alert_data, ttl=86400, prefix='monitoring')
            
            logger.warning(f"Security alert sent: {alert_type} - {message}")
            
        except Exception as e:
            logger.error(f"Error sending alert: {e}")
    
    def _send_notification(self, notification_type: str, message: str):
        """Send informational notification."""
        try:
            notification_data = {
                'type': notification_type,
                'message': message,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'severity': 'info'
            }
            
            # Store notification in Redis
            notification_key = f"notifications:{notification_type}:{int(time.time())}"
            self.redis_manager.set(notification_key, notification_data, ttl=86400, prefix='monitoring')
            
            logger.info(f"Notification sent: {notification_type} - {message}")
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    def perform_emergency_rotation(self) -> bool:
        """Perform emergency key rotation."""
        logger.warning("Performing emergency key rotation")
        
        try:
            # Set emergency flag
            emergency_key = "jwt:emergency_rotation_in_progress"
            self.redis_manager.set(emergency_key, 
                                 {'started_at': datetime.now(timezone.utc).isoformat()}, 
                                 ttl=3600, prefix='auth')
            
            # Perform rotation
            success = self._rotate_keys_with_monitoring()
            
            # Clear emergency flag
            self.redis_manager.delete(emergency_key, prefix='auth')
            
            if success:
                logger.info("Emergency key rotation completed successfully")
                if self.config['enable_alerts']:
                    self._send_notification('emergency_rotation_success', 
                                          'Emergency key rotation completed successfully')
            else:
                logger.error("Emergency key rotation failed")
                if self.config['enable_alerts']:
                    self._send_alert('emergency_rotation_failed', 
                                   'Emergency key rotation failed')
            
            return success
            
        except Exception as e:
            logger.error(f"Error in emergency rotation: {e}", exc_info=True)
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get current rotation system status."""
        try:
            current_key = self.jwks_manager.get_current_key()
            jwks = self.jwks_manager.get_public_jwks()
            health = self.jwks_manager.health_check()
            
            status = {
                'daemon_running': self.running,
                'current_key': {
                    'kid': current_key['kid'] if current_key else None,
                    'age_hours': None,
                    'algorithm': current_key['algorithm'] if current_key else None
                },
                'total_keys': len(jwks.get('keys', [])),
                'health_status': health['status'],
                'config': self.config,
                'next_rotation_check': 'N/A' if not self.running else f"{self.config['check_interval_minutes']} minutes"
            }
            
            if current_key:
                created_at = datetime.fromisoformat(current_key['created_at'].replace('Z', '+00:00'))
                age_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
                status['current_key']['age_hours'] = round(age_hours, 2)
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting status: {e}")
            return {'error': str(e)}


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(
        description='Automated JWT Key Rotation System',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--daemon', action='store_true', 
                       help='Run as daemon with continuous monitoring')
    parser.add_argument('--check', action='store_true', 
                       help='Perform one-time rotation check')
    parser.add_argument('--emergency', action='store_true', 
                       help='Perform emergency key rotation')
    parser.add_argument('--status', action='store_true', 
                       help='Show current system status')
    
    args = parser.parse_args()
    
    if not any([args.daemon, args.check, args.emergency, args.status]):
        parser.print_help()
        return 1
    
    rotation_system = AutomatedKeyRotation()
    
    try:
        if args.daemon:
            print("Starting automated key rotation daemon...")
            rotation_system.start_daemon()
            return 0
            
        elif args.check:
            print("Performing one-time rotation check...")
            rotation_system._perform_rotation_check()
            return 0
            
        elif args.emergency:
            print("Performing emergency key rotation...")
            success = rotation_system.perform_emergency_rotation()
            return 0 if success else 1
            
        elif args.status:
            print("Current rotation system status:")
            status = rotation_system.get_status()
            
            for key, value in status.items():
                if isinstance(value, dict):
                    print(f"{key}:")
                    for sub_key, sub_value in value.items():
                        print(f"  {sub_key}: {sub_value}")
                else:
                    print(f"{key}: {value}")
            return 0
            
    except KeyboardInterrupt:
        print("\nShutdown requested...")
        rotation_system.stop_daemon()
        return 0
    except Exception as e:
        print(f"Error: {e}")
        logger.error(f"Script error: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())