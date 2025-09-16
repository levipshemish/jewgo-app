#!/usr/bin/env python3
"""
Authentication Audit Logger

This module provides centralized audit logging for all authentication events
with structured logging, security monitoring, and compliance features.
"""

import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from utils.logging_config import get_logger

logger = get_logger(__name__)


class AuthEventType(Enum):
    """Authentication event types for audit logging."""
    
    # User Management Events
    USER_REGISTRATION = "user_registration"
    USER_LOGIN = "user_login" 
    USER_LOGOUT = "user_logout"
    USER_PROFILE_UPDATE = "user_profile_update"
    USER_DELETION = "user_deletion"
    USER_SUSPENSION = "user_suspension"
    USER_REACTIVATION = "user_reactivation"
    
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGIN_ATTEMPT = "login_attempt"
    LOGOUT_SUCCESS = "logout_success"
    
    # Token Events
    TOKEN_GENERATION = "token_generation"
    TOKEN_REFRESH = "token_refresh"
    TOKEN_REVOCATION = "token_revocation"
    TOKEN_VALIDATION = "token_validation"
    TOKEN_EXPIRY = "token_expiry"
    
    # Session Events
    SESSION_CREATION = "session_creation"
    SESSION_TERMINATION = "session_termination"
    SESSION_TIMEOUT = "session_timeout"
    SESSION_ROTATION = "session_rotation"
    
    # Password Events
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_SUCCESS = "password_reset_success"
    PASSWORD_RESET_FAILURE = "password_reset_failure"
    
    # Security Events
    ACCOUNT_LOCKOUT = "account_lockout"
    ACCOUNT_UNLOCK = "account_unlock"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    TOKEN_REUSE_DETECTED = "token_reuse_detected"
    
    # Authorization Events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_ASSIGNMENT = "role_assignment"
    ROLE_REVOCATION = "role_revocation"
    
    # Step-up Authentication Events
    STEP_UP_CHALLENGE_CREATED = "step_up_challenge_created"
    STEP_UP_CHALLENGE_COMPLETED = "step_up_challenge_completed"
    STEP_UP_CHALLENGE_FAILED = "step_up_challenge_failed"
    
    # WebAuthn Events
    WEBAUTHN_REGISTRATION = "webauthn_registration"
    WEBAUTHN_AUTHENTICATION = "webauthn_authentication"
    WEBAUTHN_CHALLENGE_CREATED = "webauthn_challenge_created"
    
    # System Events
    AUTH_SERVICE_STARTED = "auth_service_started"
    AUTH_SERVICE_STOPPED = "auth_service_stopped"
    AUTH_CONFIG_CHANGED = "auth_config_changed"


class AuthEventSeverity(Enum):
    """Severity levels for authentication events."""
    
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuthAuditLogger:
    """
    Centralized authentication audit logger with structured logging.
    
    This class provides consistent audit logging for all authentication events
    with proper security context, compliance features, and monitoring support.
    """
    
    def __init__(self, service_name: str = "auth_service"):
        """
        Initialize the auth audit logger.
        
        Args:
            service_name: Name of the service using this logger
        """
        self.service_name = service_name
        self.audit_logger = get_logger(f"{service_name}.audit")
        
    def log_auth_event(
        self,
        event_type: AuthEventType,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        success: bool = True,
        severity: AuthEventSeverity = AuthEventSeverity.INFO,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log an authentication event with full context.
        
        Args:
            event_type: Type of authentication event
            user_id: User ID (if applicable)
            email: User email (if applicable)
            success: Whether the event was successful
            severity: Event severity level
            details: Additional event details
            ip_address: Client IP address
            user_agent: Client user agent
            session_id: Session ID (if applicable)
            error_message: Error message (if failure)
            metadata: Additional metadata
        """
        # Build audit record
        audit_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'service': self.service_name,
            'event_type': event_type.value,
            'severity': severity.value,
            'success': success,
            'user_id': user_id,
            'email': email,
            'session_id': session_id,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'error_message': error_message,
            'details': details or {},
            'metadata': metadata or {}
        }
        
        # Add performance timing if available
        if 'start_time' in (metadata or {}):
            audit_record['duration_ms'] = int((time.time() - metadata['start_time']) * 1000)
        
        # Log based on severity
        log_message = self._format_log_message(event_type, success, user_id, email)
        
        if severity == AuthEventSeverity.CRITICAL:
            self.audit_logger.critical(log_message, extra=audit_record)
        elif severity == AuthEventSeverity.ERROR:
            self.audit_logger.error(log_message, extra=audit_record)
        elif severity == AuthEventSeverity.WARNING:
            self.audit_logger.warning(log_message, extra=audit_record)
        else:
            self.audit_logger.info(log_message, extra=audit_record)
    
    def log_login_attempt(
        self,
        email: str,
        success: bool,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a login attempt with appropriate severity."""
        event_type = AuthEventType.LOGIN_SUCCESS if success else AuthEventType.LOGIN_FAILURE
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {}
        if failure_reason:
            details['failure_reason'] = failure_reason
        
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            email=email,
            success=success,
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_registration_attempt(
        self,
        email: str,
        success: bool,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a user registration attempt."""
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {}
        if failure_reason:
            details['failure_reason'] = failure_reason
        
        self.log_auth_event(
            event_type=AuthEventType.USER_REGISTRATION,
            user_id=user_id,
            email=email,
            success=success,
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_token_event(
        self,
        event_type: AuthEventType,
        user_id: str,
        success: bool,
        token_type: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a token-related event."""
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {'token_type': token_type} if token_type else {}
        if failure_reason:
            details['failure_reason'] = failure_reason
        
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            success=success,
            severity=severity,
            details=details,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_security_event(
        self,
        event_type: AuthEventType,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: AuthEventSeverity = AuthEventSeverity.WARNING,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a security-related event with high severity."""
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            email=email,
            success=False,  # Security events are typically failures/alerts
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_password_event(
        self,
        event_type: AuthEventType,
        user_id: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a password-related event."""
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {}
        if failure_reason:
            details['failure_reason'] = failure_reason
        
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            success=success,
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_session_event(
        self,
        event_type: AuthEventType,
        user_id: str,
        session_id: str,
        success: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a session-related event."""
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            success=success,
            severity=AuthEventSeverity.INFO,
            details=details,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_step_up_event(
        self,
        event_type: AuthEventType,
        user_id: str,
        challenge_id: str,
        success: bool,
        method: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a step-up authentication event."""
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {
            'challenge_id': challenge_id,
            'method': method
        }
        if failure_reason:
            details['failure_reason'] = failure_reason
        
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            success=success,
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def log_permission_event(
        self,
        event_type: AuthEventType,
        user_id: str,
        resource: str,
        action: str,
        success: bool,
        roles: Optional[List[str]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a permission/authorization event."""
        severity = AuthEventSeverity.INFO if success else AuthEventSeverity.WARNING
        
        details = {
            'resource': resource,
            'action': action,
            'roles': roles or []
        }
        
        self.log_auth_event(
            event_type=event_type,
            user_id=user_id,
            success=success,
            severity=severity,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    def _format_log_message(
        self, 
        event_type: AuthEventType, 
        success: bool, 
        user_id: Optional[str] = None, 
        email: Optional[str] = None
    ) -> str:
        """Format a human-readable log message."""
        status = "SUCCESS" if success else "FAILURE"
        user_identifier = email or user_id or "unknown"
        
        event_descriptions = {
            AuthEventType.USER_REGISTRATION: f"User registration {status.lower()} for {user_identifier}",
            AuthEventType.LOGIN_SUCCESS: f"User login successful for {user_identifier}",
            AuthEventType.LOGIN_FAILURE: f"User login failed for {user_identifier}",
            AuthEventType.TOKEN_REFRESH: f"Token refresh {status.lower()} for user {user_identifier}",
            AuthEventType.PASSWORD_CHANGE: f"Password change {status.lower()} for user {user_identifier}",
            AuthEventType.ACCOUNT_LOCKOUT: f"Account locked for user {user_identifier}",
            AuthEventType.TOKEN_REUSE_DETECTED: f"Token reuse detected for user {user_identifier}",
            AuthEventType.SUSPICIOUS_ACTIVITY: f"Suspicious activity detected for user {user_identifier}",
            AuthEventType.STEP_UP_CHALLENGE_CREATED: f"Step-up challenge created for user {user_identifier}",
            AuthEventType.STEP_UP_CHALLENGE_COMPLETED: f"Step-up challenge completed for user {user_identifier}",
        }
        
        return event_descriptions.get(
            event_type, 
            f"{event_type.value} {status} for user {user_identifier}"
        )


# Global audit logger instance
_auth_audit_logger = None


def get_auth_audit_logger(service_name: str = "auth_service") -> AuthAuditLogger:
    """
    Get the global auth audit logger instance.
    
    Args:
        service_name: Name of the service using this logger
        
    Returns:
        AuthAuditLogger: Global audit logger instance
    """
    global _auth_audit_logger
    
    if _auth_audit_logger is None:
        _auth_audit_logger = AuthAuditLogger(service_name)
    
    return _auth_audit_logger


# Convenience functions for common audit events
def log_login_attempt(email: str, success: bool, **kwargs):
    """Log a login attempt."""
    get_auth_audit_logger().log_login_attempt(email, success, **kwargs)


def log_registration_attempt(email: str, success: bool, **kwargs):
    """Log a registration attempt."""
    get_auth_audit_logger().log_registration_attempt(email, success, **kwargs)


def log_token_refresh(user_id: str, success: bool, **kwargs):
    """Log a token refresh attempt."""
    get_auth_audit_logger().log_token_event(
        AuthEventType.TOKEN_REFRESH, user_id, success, **kwargs
    )


def log_security_event(event_type: AuthEventType, **kwargs):
    """Log a security event."""
    get_auth_audit_logger().log_security_event(event_type, **kwargs)


def log_password_change(user_id: str, success: bool, **kwargs):
    """Log a password change attempt."""
    get_auth_audit_logger().log_password_event(
        AuthEventType.PASSWORD_CHANGE, user_id, success, **kwargs
    )
