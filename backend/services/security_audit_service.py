"""
Enhanced Security Audit Logging Service.
Provides comprehensive security event tracking and monitoring.
"""

import os
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

from sqlalchemy import text
from utils.logging_config import get_logger
from database.unified_connection_manager import get_unified_connection_manager

logger = get_logger(__name__)


class SecurityEventType(Enum):
    """Security event types for audit logging."""
    
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_BLOCKED = "login_blocked"
    LOGOUT = "logout"
    
    # OAuth Events
    OAUTH_LOGIN_SUCCESS = "oauth_login_success"
    OAUTH_LOGIN_FAILED = "oauth_login_failed"
    OAUTH_ACCOUNT_LINKED = "oauth_account_linked"
    
    # Magic Link Events
    MAGIC_LINK_SENT = "magic_link_sent"
    MAGIC_LINK_USED = "magic_link_used"
    MAGIC_LINK_FAILED = "magic_link_failed"
    
    # Two-Factor Authentication Events
    TWO_FA_ENABLED = "2fa_enabled"
    TWO_FA_DISABLED = "2fa_disabled"
    TWO_FA_CODE_SENT = "2fa_code_sent"
    TWO_FA_CODE_VERIFIED = "2fa_code_verified"
    TWO_FA_CODE_FAILED = "2fa_code_failed"
    
    # Account Management Events
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DELETED = "account_deleted"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    EMAIL_VERIFIED = "email_verified"
    
    # Role and Permission Events
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    
    # Security Events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    CSRF_ATTACK_BLOCKED = "csrf_attack_blocked"
    INVALID_TOKEN_ATTEMPT = "invalid_token_attempt"
    BRUTE_FORCE_DETECTED = "brute_force_detected"
    
    # Session Events
    SESSION_CREATED = "session_created"
    SESSION_EXPIRED = "session_expired"
    SESSION_REVOKED = "session_revoked"
    CONCURRENT_SESSION_DETECTED = "concurrent_session_detected"


class SecurityLevel(Enum):
    """Security audit levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityAuditService:
    """Enhanced security audit logging service."""
    
    def __init__(self):
        self.db_connection = get_unified_connection_manager()
        
        # Configuration
        self.retention_days = int(os.getenv('AUDIT_LOG_RETENTION_DAYS', '365'))
        self.high_risk_threshold = int(os.getenv('HIGH_RISK_EVENT_THRESHOLD', '5'))
        self.critical_events_email = os.getenv('SECURITY_ALERTS_EMAIL', '')
        
        logger.info(f"SecurityAuditService initialized with {self.retention_days} day retention")

    def log_security_event(
        self,
        event_type: SecurityEventType,
        user_id: Optional[str] = None,
        success: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        security_level: SecurityLevel = SecurityLevel.MEDIUM,
        correlation_id: Optional[str] = None
    ) -> bool:
        """
        Log a comprehensive security event.
        
        Args:
            event_type: Type of security event
            user_id: User ID associated with the event (if applicable)
            success: Whether the event was successful
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional event-specific details
            security_level: Security level of the event
            correlation_id: Correlation ID for tracking related events
        
        Returns:
            bool: True if logged successfully
        """
        try:
            # Generate correlation ID if not provided
            if not correlation_id:
                correlation_id = f"sec_{secrets.token_hex(8)}"
            
            # Prepare audit data
            audit_data = {
                'id': secrets.token_hex(16),
                'user_id': user_id,
                'action': event_type.value,
                'success': success,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'security_level': security_level.value,
                'correlation_id': correlation_id,
                'details': json.dumps(details or {}),
                'created_at': datetime.utcnow()
            }
            
            # Store in database
            with self.db_connection.session_scope() as session:
                session.execute(
                    text("""
                        INSERT INTO auth_audit_log (
                            id, user_id, action, success, ip_address, user_agent,
                            details, created_at
                        ) VALUES (
                            :id, :user_id, :action, :success, :ip_address, :user_agent,
                            :details, :created_at
                        )
                    """),
                    audit_data
                )
            
            # Enhanced logging for high-risk events
            if security_level in [SecurityLevel.HIGH, SecurityLevel.CRITICAL]:
                logger.warning(
                    f"HIGH RISK SECURITY EVENT: {event_type.value}",
                    extra={
                        'security_level': security_level.value,
                        'user_id': user_id,
                        'ip_address': ip_address,
                        'correlation_id': correlation_id,
                        'success': success,
                        'details': details
                    }
                )
                
                # Send alert for critical events
                if security_level == SecurityLevel.CRITICAL and self.critical_events_email:
                    self._send_security_alert(event_type, audit_data)
            
            # Check for suspicious patterns
            if not success:
                self._check_suspicious_patterns(user_id, ip_address, event_type)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to log security event {event_type.value}: {e}")
            return False

    def get_user_security_summary(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get security summary for a user over the last N days."""
        try:
            with self.db_connection.session_scope() as session:
                # Get event counts by type
                events = session.execute(
                    text("""
                        SELECT action, success, COUNT(*) as count
                        FROM auth_audit_log
                        WHERE user_id = :user_id
                        AND created_at > NOW() - INTERVAL ':days days'
                        GROUP BY action, success
                        ORDER BY action, success
                    """),
                    {'user_id': user_id, 'days': days}
                ).mappings().all()
                
                # Get recent failed attempts
                failed_attempts = session.execute(
                    text("""
                        SELECT action, ip_address, created_at, details
                        FROM auth_audit_log
                        WHERE user_id = :user_id
                        AND success = FALSE
                        AND created_at > NOW() - INTERVAL ':days days'
                        ORDER BY created_at DESC
                        LIMIT 10
                    """),
                    {'user_id': user_id, 'days': days}
                ).mappings().all()
                
                # Get unique IP addresses
                unique_ips = session.execute(
                    text("""
                        SELECT DISTINCT ip_address, COUNT(*) as login_count
                        FROM auth_audit_log
                        WHERE user_id = :user_id
                        AND action IN ('login_success', 'oauth_login_success')
                        AND created_at > NOW() - INTERVAL ':days days'
                        GROUP BY ip_address
                        ORDER BY login_count DESC
                    """),
                    {'user_id': user_id, 'days': days}
                ).mappings().all()
                
                return {
                    'user_id': user_id,
                    'period_days': days,
                    'events_summary': list(events),
                    'recent_failed_attempts': list(failed_attempts),
                    'unique_ip_addresses': list(unique_ips),
                    'generated_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting user security summary: {e}")
            return {}

    def get_security_alerts(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get security alerts from the last N hours."""
        try:
            with self.db_connection.session_scope() as session:
                # Get high-risk events
                alerts = session.execute(
                    text("""
                        SELECT user_id, action, ip_address, success, details, created_at
                        FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                        AND (
                            success = FALSE 
                            OR action IN (
                                'brute_force_detected', 'suspicious_activity', 
                                'csrf_attack_blocked', 'rate_limit_exceeded'
                            )
                        )
                        ORDER BY created_at DESC
                        LIMIT 100
                    """),
                    {'hours': hours}
                ).mappings().all()
                
                return list(alerts)
                
        except Exception as e:
            logger.error(f"Error getting security alerts: {e}")
            return []

    def _check_suspicious_patterns(
        self, 
        user_id: Optional[str], 
        ip_address: Optional[str], 
        event_type: SecurityEventType
    ):
        """Check for suspicious activity patterns."""
        try:
            with self.db_connection.session_scope() as session:
                # Check for brute force attempts
                if event_type in [SecurityEventType.LOGIN_FAILED, SecurityEventType.TWO_FA_CODE_FAILED]:
                    # Check failed attempts from same IP in last hour
                    if ip_address:
                        ip_failures = session.execute(
                            text("""
                                SELECT COUNT(*) FROM auth_audit_log
                                WHERE ip_address = :ip_address
                                AND success = FALSE
                                AND created_at > NOW() - INTERVAL '1 hour'
                            """),
                            {'ip_address': ip_address}
                        ).scalar()
                        
                        if int(ip_failures or 0) >= self.high_risk_threshold:
                            self.log_security_event(
                                SecurityEventType.BRUTE_FORCE_DETECTED,
                                user_id=user_id,
                                success=False,
                                ip_address=ip_address,
                                details={
                                    'failed_attempts': int(ip_failures),
                                    'time_window': '1 hour',
                                    'trigger_event': event_type.value
                                },
                                security_level=SecurityLevel.CRITICAL
                            )
                
                # Check for account enumeration attempts
                if event_type == SecurityEventType.LOGIN_FAILED and ip_address:
                    unique_emails = session.execute(
                        text("""
                            SELECT COUNT(DISTINCT COALESCE(details->>'email', '')) FROM auth_audit_log
                            WHERE ip_address = :ip_address
                            AND action = 'login_failed'
                            AND created_at > NOW() - INTERVAL '1 hour'
                        """),
                        {'ip_address': ip_address}
                    ).scalar()
                    
                    if int(unique_emails or 0) >= 10:  # Trying many different emails
                        self.log_security_event(
                            SecurityEventType.SUSPICIOUS_ACTIVITY,
                            user_id=user_id,
                            success=False,
                            ip_address=ip_address,
                            details={
                                'pattern': 'account_enumeration',
                                'unique_emails_attempted': int(unique_emails),
                                'time_window': '1 hour'
                            },
                            security_level=SecurityLevel.HIGH
                        )
                        
        except Exception as e:
            logger.error(f"Error checking suspicious patterns: {e}")

    def _send_security_alert(self, event_type: SecurityEventType, audit_data: Dict[str, Any]):
        """Send security alert email for critical events."""
        try:
            if not self.critical_events_email:
                return
            
            from services.email_service import email_service
            
            subject = f"🚨 Security Alert: {event_type.value.replace('_', ' ').title()}"
            
            details = json.loads(audit_data.get('details', '{}'))
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb;">
                    <h2 style="color: #721c24; margin-top: 0;">🚨 Security Alert</h2>
                    <p><strong>Event:</strong> {event_type.value.replace('_', ' ').title()}</p>
                    <p><strong>Time:</strong> {audit_data['created_at']}</p>
                    <p><strong>User ID:</strong> {audit_data.get('user_id', 'N/A')}</p>
                    <p><strong>IP Address:</strong> {audit_data.get('ip_address', 'N/A')}</p>
                    <p><strong>Success:</strong> {audit_data.get('success', False)}</p>
                    <p><strong>Correlation ID:</strong> {audit_data.get('correlation_id', 'N/A')}</p>
                    
                    {f"<p><strong>Details:</strong></p><pre style='background-color: #f8f9fa; padding: 10px; border-radius: 4px;'>{json.dumps(details, indent=2)}</pre>" if details else ""}
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffeaa7;">
                        <p style="margin: 0; color: #856404;">
                            <strong>Action Required:</strong> Review this security event and take appropriate action if necessary.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Security Alert: {event_type.value.replace('_', ' ').title()}
            
            Event: {event_type.value.replace('_', ' ').title()}
            Time: {audit_data['created_at']}
            User ID: {audit_data.get('user_id', 'N/A')}
            IP Address: {audit_data.get('ip_address', 'N/A')}
            Success: {audit_data.get('success', False)}
            Correlation ID: {audit_data.get('correlation_id', 'N/A')}
            
            Details: {json.dumps(details, indent=2) if details else 'None'}
            
            Action Required: Review this security event and take appropriate action if necessary.
            """
            
            email_service.send_email(
                to_email=self.critical_events_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            
            logger.info(f"Security alert sent for {event_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")

    def cleanup_old_logs(self) -> Dict[str, int]:
        """Clean up old audit logs based on retention policy."""
        try:
            with self.db_connection.session_scope() as session:
                # Count logs to be deleted
                count_result = session.execute(
                    text("""
                        SELECT COUNT(*) FROM auth_audit_log
                        WHERE created_at < NOW() - INTERVAL ':days days'
                    """),
                    {'days': self.retention_days}
                ).scalar()
                
                deleted_count = int(count_result or 0)
                
                if deleted_count > 0:
                    # Delete old logs
                    session.execute(
                        text("""
                            DELETE FROM auth_audit_log
                            WHERE created_at < NOW() - INTERVAL ':days days'
                        """),
                        {'days': self.retention_days}
                    )
                    
                    logger.info(f"Cleaned up {deleted_count} old audit log entries")
                    
                    # Log the cleanup event
                    self.log_security_event(
                        SecurityEventType.SUSPICIOUS_ACTIVITY,  # Using existing enum
                        success=True,
                        details={
                            'action': 'audit_log_cleanup',
                            'deleted_count': deleted_count,
                            'retention_days': self.retention_days
                        },
                        security_level=SecurityLevel.LOW
                    )
                
                return {
                    'deleted_count': deleted_count,
                    'retention_days': self.retention_days
                }
                
        except Exception as e:
            logger.error(f"Error cleaning up old audit logs: {e}")
            return {'deleted_count': 0, 'error': str(e)}

    def get_security_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get security metrics for monitoring dashboard."""
        try:
            with self.db_connection.session_scope() as session:
                # Total events
                total_events = session.execute(
                    text("""
                        SELECT COUNT(*) FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                    """),
                    {'hours': hours}
                ).scalar()
                
                # Failed events
                failed_events = session.execute(
                    text("""
                        SELECT COUNT(*) FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                        AND success = FALSE
                    """),
                    {'hours': hours}
                ).scalar()
                
                # Unique users
                unique_users = session.execute(
                    text("""
                        SELECT COUNT(DISTINCT user_id) FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                        AND user_id IS NOT NULL
                    """),
                    {'hours': hours}
                ).scalar()
                
                # Top events
                top_events = session.execute(
                    text("""
                        SELECT action, COUNT(*) as count
                        FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                        GROUP BY action
                        ORDER BY count DESC
                        LIMIT 10
                    """),
                    {'hours': hours}
                ).mappings().all()
                
                # Top IPs
                top_ips = session.execute(
                    text("""
                        SELECT ip_address, COUNT(*) as count
                        FROM auth_audit_log
                        WHERE created_at > NOW() - INTERVAL ':hours hours'
                        AND ip_address IS NOT NULL
                        GROUP BY ip_address
                        ORDER BY count DESC
                        LIMIT 10
                    """),
                    {'hours': hours}
                ).mappings().all()
                
                return {
                    'period_hours': hours,
                    'total_events': int(total_events or 0),
                    'failed_events': int(failed_events or 0),
                    'success_rate': round((1 - (int(failed_events or 0) / max(int(total_events or 0), 1))) * 100, 2),
                    'unique_users': int(unique_users or 0),
                    'top_events': list(top_events),
                    'top_ip_addresses': list(top_ips),
                    'generated_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting security metrics: {e}")
            return {}

    def search_audit_logs(
        self,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        action: Optional[str] = None,
        success: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search audit logs with filters."""
        try:
            # Build dynamic query
            conditions = []
            params = {'limit': limit}
            
            if user_id:
                conditions.append("user_id = :user_id")
                params['user_id'] = user_id
            
            if ip_address:
                conditions.append("ip_address = :ip_address")
                params['ip_address'] = ip_address
            
            if action:
                conditions.append("action = :action")
                params['action'] = action
            
            if success is not None:
                conditions.append("success = :success")
                params['success'] = success
            
            if start_date:
                conditions.append("created_at >= :start_date")
                params['start_date'] = start_date
            
            if end_date:
                conditions.append("created_at <= :end_date")
                params['end_date'] = end_date
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query = f"""
                SELECT user_id, action, success, ip_address, user_agent, details, created_at
                FROM auth_audit_log
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit
            """
            
            with self.db_connection.session_scope() as session:
                results = session.execute(text(query), params).mappings().all()
                return list(results)
                
        except Exception as e:
            logger.error(f"Error searching audit logs: {e}")
            return []


# Singleton instance
_security_audit_service = None


def get_security_audit_service() -> SecurityAuditService:
    """Get singleton SecurityAuditService instance."""
    global _security_audit_service
    if _security_audit_service is None:
        _security_audit_service = SecurityAuditService()
    return _security_audit_service


# Convenience functions for common security events
def log_login_attempt(user_id: str, email: str, success: bool, ip_address: str = None, user_agent: str = None, details: Dict[str, Any] = None):
    """Log login attempt with enhanced context."""
    service = get_security_audit_service()
    event_type = SecurityEventType.LOGIN_SUCCESS if success else SecurityEventType.LOGIN_FAILED
    security_level = SecurityLevel.LOW if success else SecurityLevel.MEDIUM
    
    enhanced_details = {'email': email[:3] + '***@' + email.split('@')[1] if '@' in email else email}
    if details:
        enhanced_details.update(details)
    
    service.log_security_event(
        event_type=event_type,
        user_id=user_id,
        success=success,
        ip_address=ip_address,
        user_agent=user_agent,
        details=enhanced_details,
        security_level=security_level
    )


def log_oauth_attempt(user_id: str, provider: str, success: bool, ip_address: str = None, user_agent: str = None, details: Dict[str, Any] = None):
    """Log OAuth attempt with provider context."""
    service = get_security_audit_service()
    event_type = SecurityEventType.OAUTH_LOGIN_SUCCESS if success else SecurityEventType.OAUTH_LOGIN_FAILED
    security_level = SecurityLevel.LOW if success else SecurityLevel.MEDIUM
    
    enhanced_details = {'provider': provider}
    if details:
        enhanced_details.update(details)
    
    service.log_security_event(
        event_type=event_type,
        user_id=user_id,
        success=success,
        ip_address=ip_address,
        user_agent=user_agent,
        details=enhanced_details,
        security_level=security_level
    )


def log_2fa_event(user_id: str, event_type: SecurityEventType, success: bool, ip_address: str = None, details: Dict[str, Any] = None):
    """Log 2FA-related security events."""
    service = get_security_audit_service()
    security_level = SecurityLevel.MEDIUM if success else SecurityLevel.HIGH
    
    service.log_security_event(
        event_type=event_type,
        user_id=user_id,
        success=success,
        ip_address=ip_address,
        details=details,
        security_level=security_level
    )
