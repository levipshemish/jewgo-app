#!/usr/bin/env python3
"""
Advanced Security Manager for JewGo Backend
===========================================
This module provides comprehensive security features including:
- Advanced rate limiting with multiple strategies
- IP-based blocking and whitelisting
- Request fingerprinting and anomaly detection
- Security headers and CORS management
- Brute force protection
- DDoS mitigation

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import time
import hashlib
import ipaddress
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
from dataclasses import dataclass
from collections import defaultdict, deque

from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)

class SecurityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BlockType(Enum):
    IP = "ip"
    USER = "user"
    SESSION = "session"
    FINGERPRINT = "fingerprint"

@dataclass
class SecurityEvent:
    timestamp: datetime
    event_type: str
    severity: SecurityLevel
    source_ip: str
    user_agent: str
    endpoint: str
    details: Dict[str, Any]
    fingerprint: str

@dataclass
class RateLimitRule:
    name: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: int
    window_size: int
    block_duration: int
    applies_to: List[str]  # IP, user, session, etc.

class AdvancedSecurityManager:
    """Manages advanced security features for the application."""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client if redis_client else get_redis_manager_v5().get_client()
        self.blocked_ips: Set[str] = set()
        self.whitelisted_ips: Set[str] = set()
        self.rate_limit_rules: Dict[str, RateLimitRule] = {}
        self.security_events: deque = deque(maxlen=10000)
        self.request_fingerprints: Dict[str, List[datetime]] = defaultdict(list)
        self.anomaly_thresholds = {
            'requests_per_minute': 100,
            'unique_endpoints_per_minute': 20,
            'error_rate_threshold': 0.5,
            'suspicious_patterns': ['sql_injection', 'xss', 'path_traversal']
        }
        
        # Initialize default rate limit rules
        self._initialize_default_rules()
        logger.info("AdvancedSecurityManager initialized")
    
    def _initialize_default_rules(self):
        """Initialize default rate limiting rules."""
        default_rules = [
            RateLimitRule(
                name="api_general",
                requests_per_minute=60,
                requests_per_hour=1000,
                requests_per_day=10000,
                burst_limit=10,
                window_size=60,
                block_duration=300,
                applies_to=["ip", "user"]
            ),
            RateLimitRule(
                name="auth_endpoints",
                requests_per_minute=5,
                requests_per_hour=20,
                requests_per_day=100,
                burst_limit=3,
                window_size=60,
                block_duration=900,
                applies_to=["ip", "user"]
            ),
            RateLimitRule(
                name="search_endpoints",
                requests_per_minute=30,
                requests_per_hour=500,
                requests_per_day=5000,
                burst_limit=5,
                window_size=60,
                block_duration=180,
                applies_to=["ip", "user"]
            ),
            RateLimitRule(
                name="admin_endpoints",
                requests_per_minute=10,
                requests_per_hour=100,
                requests_per_day=1000,
                burst_limit=2,
                window_size=60,
                block_duration=1800,
                applies_to=["ip", "user", "session"]
            )
        ]
        
        for rule in default_rules:
            self.rate_limit_rules[rule.name] = rule
    
    def generate_request_fingerprint(self, request_data: Dict[str, Any]) -> str:
        """Generate a unique fingerprint for a request."""
        fingerprint_data = {
            'ip': request_data.get('ip', ''),
            'user_agent': request_data.get('user_agent', ''),
            'endpoint': request_data.get('endpoint', ''),
            'method': request_data.get('method', ''),
            'headers': str(sorted(request_data.get('headers', {}).items()))
        }
        
        fingerprint_string = str(sorted(fingerprint_data.items()))
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:16]
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if an IP address is blocked."""
        if ip in self.whitelisted_ips:
            return False
        
        # Check local cache first
        if ip in self.blocked_ips:
            return True
        
        # Check Redis cache
        try:
            blocked = self.redis_client.get(f"blocked_ip:{ip}")
            if blocked:
                self.blocked_ips.add(ip)
                return True
        except Exception as e:
            logger.error(f"Error checking blocked IP in Redis: {e}")
        
        return False
    
    def block_ip(self, ip: str, duration: int = 3600, reason: str = "Security violation") -> bool:
        """Block an IP address for a specified duration."""
        try:
            # Validate IP address
            ipaddress.ip_address(ip)
            
            # Add to local cache
            self.blocked_ips.add(ip)
            
            # Add to Redis with expiration
            self.redis_client.setex(f"blocked_ip:{ip}", duration, reason)
            
            # Log security event
            self._log_security_event(
                event_type="ip_blocked",
                severity=SecurityLevel.HIGH,
                source_ip=ip,
                details={"reason": reason, "duration": duration}
            )
            
            logger.warning(f"IP {ip} blocked for {duration} seconds: {reason}")
            return True
            
        except ValueError:
            logger.error(f"Invalid IP address: {ip}")
            return False
        except Exception as e:
            logger.error(f"Error blocking IP {ip}: {e}")
            return False
    
    def unblock_ip(self, ip: str) -> bool:
        """Unblock an IP address."""
        try:
            # Remove from local cache
            self.blocked_ips.discard(ip)
            
            # Remove from Redis
            self.redis_client.delete(f"blocked_ip:{ip}")
            
            logger.info(f"IP {ip} unblocked")
            return True
            
        except Exception as e:
            logger.error(f"Error unblocking IP {ip}: {e}")
            return False
    
    def whitelist_ip(self, ip: str) -> bool:
        """Add an IP address to the whitelist."""
        try:
            ipaddress.ip_address(ip)
            self.whitelisted_ips.add(ip)
            self.redis_client.sadd("whitelisted_ips", ip)
            logger.info(f"IP {ip} added to whitelist")
            return True
        except ValueError:
            logger.error(f"Invalid IP address: {ip}")
            return False
        except Exception as e:
            logger.error(f"Error whitelisting IP {ip}: {e}")
            return False
    
    def check_rate_limit(self, identifier: str, rule_name: str, 
                        request_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Check if a request exceeds rate limits."""
        if rule_name not in self.rate_limit_rules:
            return True, {"status": "no_rule"}
        
        rule = self.rate_limit_rules[rule_name]
        current_time = time.time()
        
        # Check different time windows
        windows = [
            ("minute", rule.requests_per_minute, 60),
            ("hour", rule.requests_per_hour, 3600),
            ("day", rule.requests_per_day, 86400)
        ]
        
        for window_name, limit, window_size in windows:
            key = f"rate_limit:{rule_name}:{identifier}:{window_name}"
            
            try:
                # Get current count
                current_count = self.redis_client.get(key)
                if current_count is None:
                    current_count = 0
                else:
                    current_count = int(current_count)
                
                # Check if limit exceeded
                if current_count >= limit:
                    # Log security event
                    self._log_security_event(
                        event_type="rate_limit_exceeded",
                        severity=SecurityLevel.MEDIUM,
                        source_ip=request_data.get('ip', ''),
                        user_agent=request_data.get('user_agent', ''),
                        endpoint=request_data.get('endpoint', ''),
                        details={
                            "rule": rule_name,
                            "window": window_name,
                            "limit": limit,
                            "current": current_count,
                            "identifier": identifier
                        }
                    )
                    
                    return False, {
                        "status": "rate_limited",
                        "rule": rule_name,
                        "window": window_name,
                        "limit": limit,
                        "current": current_count,
                        "retry_after": window_size
                    }
                
                # Increment counter
                pipe = self.redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_size)
                pipe.execute()
                
            except Exception as e:
                logger.error(f"Error checking rate limit: {e}")
                return True, {"status": "error", "error": str(e)}
        
        return True, {"status": "allowed"}
    
    def detect_anomalies(self, request_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect suspicious patterns in requests."""
        anomalies = []
        
        # Check for SQL injection patterns
        sql_patterns = [
            "union select", "drop table", "insert into", "delete from",
            "update set", "or 1=1", "and 1=1", "' or '1'='1"
        ]
        
        request_string = str(request_data).lower()
        for pattern in sql_patterns:
            if pattern in request_string:
                anomalies.append({
                    "type": "sql_injection",
                    "pattern": pattern,
                    "severity": SecurityLevel.HIGH
                })
        
        # Check for XSS patterns
        xss_patterns = [
            "<script", "javascript:", "onload=", "onerror=",
            "onclick=", "onmouseover=", "alert(", "document.cookie"
        ]
        
        for pattern in xss_patterns:
            if pattern in request_string:
                anomalies.append({
                    "type": "xss",
                    "pattern": pattern,
                    "severity": SecurityLevel.HIGH
                })
        
        # Check for path traversal
        path_patterns = ["../", "..\\", "/etc/passwd", "\\windows\\system32"]
        for pattern in path_patterns:
            if pattern in request_string:
                anomalies.append({
                    "type": "path_traversal",
                    "pattern": pattern,
                    "severity": SecurityLevel.HIGH
                })
        
        # Check request frequency anomalies
        fingerprint = self.generate_request_fingerprint(request_data)
        current_time = datetime.now()
        
        # Clean old timestamps (older than 1 minute)
        self.request_fingerprints[fingerprint] = [
            ts for ts in self.request_fingerprints[fingerprint]
            if (current_time - ts).total_seconds() < 60
        ]
        
        # Add current request
        self.request_fingerprints[fingerprint].append(current_time)
        
        # Check if too many requests from same fingerprint
        if len(self.request_fingerprints[fingerprint]) > self.anomaly_thresholds['requests_per_minute']:
            anomalies.append({
                "type": "high_frequency",
                "count": len(self.request_fingerprints[fingerprint]),
                "severity": SecurityLevel.MEDIUM
            })
        
        return anomalies
    
    def _log_security_event(self, event_type: str, severity: SecurityLevel,
                           source_ip: str = "", user_agent: str = "",
                           endpoint: str = "", details: Dict[str, Any] = None):
        """Log a security event."""
        event = SecurityEvent(
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            source_ip=source_ip,
            user_agent=user_agent,
            endpoint=endpoint,
            details=details or {},
            fingerprint=self.generate_request_fingerprint({
                "ip": source_ip,
                "user_agent": user_agent,
                "endpoint": endpoint
            })
        )
        
        self.security_events.append(event)
        
        # Store in Redis for persistence
        try:
            event_key = f"security_event:{event.timestamp.isoformat()}"
            self.redis_client.hset(event_key, mapping={
                "event_type": event.event_type,
                "severity": event.severity.value,
                "source_ip": event.source_ip,
                "user_agent": event.user_agent,
                "endpoint": event.endpoint,
                "details": str(event.details),
                "fingerprint": event.fingerprint
            })
            self.redis_client.expire(event_key, 86400 * 7)  # Keep for 7 days
        except Exception as e:
            logger.error(f"Error storing security event: {e}")
        
        logger.warning(f"Security event: {event_type} - {severity.value} - {source_ip}")
    
    def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics."""
        current_time = datetime.now()
        last_hour = current_time - timedelta(hours=1)
        last_day = current_time - timedelta(days=1)
        
        # Count events by severity
        events_by_severity = defaultdict(int)
        events_by_type = defaultdict(int)
        blocked_ips_count = len(self.blocked_ips)
        
        for event in self.security_events:
            if event.timestamp >= last_day:
                events_by_severity[event.severity.value] += 1
                events_by_type[event.event_type] += 1
        
        return {
            "total_blocked_ips": blocked_ips_count,
            "whitelisted_ips": len(self.whitelisted_ips),
            "events_last_hour": len([e for e in self.security_events if e.timestamp >= last_hour]),
            "events_last_day": len([e for e in self.security_events if e.timestamp >= last_day]),
            "events_by_severity": dict(events_by_severity),
            "events_by_type": dict(events_by_type),
            "rate_limit_rules": len(self.rate_limit_rules),
            "anomaly_thresholds": self.anomaly_thresholds
        }
    
    def get_recent_security_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent security events."""
        recent_events = list(self.security_events)[-limit:]
        return [
            {
                "timestamp": event.timestamp.isoformat(),
                "event_type": event.event_type,
                "severity": event.severity.value,
                "source_ip": event.source_ip,
                "endpoint": event.endpoint,
                "details": event.details
            }
            for event in recent_events
        ]

# Global instance
security_manager: Optional[AdvancedSecurityManager] = None

def get_security_manager() -> AdvancedSecurityManager:
    """Get the global AdvancedSecurityManager instance."""
    global security_manager
    if security_manager is None:
        security_manager = AdvancedSecurityManager()
    return security_manager
