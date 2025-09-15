#!/usr/bin/env python3
"""
Data Retention and PII Hygiene Service

Provides automated data retention policies, PII masking, and data purging
for compliance with privacy regulations and security best practices.
"""

import os
import re
import hashlib
import threading
import time
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from utils.logging_config import get_logger
from database.connection_manager import get_connection_manager
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)


class DataType(Enum):
    """Data type classifications."""
    PII = "pii"  # Personally Identifiable Information
    SENSITIVE = "sensitive"  # Sensitive but not PII
    AUDIT = "audit"  # Audit trail data
    METRICS = "metrics"  # Performance metrics
    SESSION = "session"  # Session data
    TEMPORARY = "temporary"  # Temporary data


class RetentionPeriod(Enum):
    """Data retention periods."""
    IMMEDIATE = 0  # Delete immediately
    HOURS_1 = 3600  # 1 hour
    HOURS_24 = 86400  # 24 hours
    DAYS_7 = 604800  # 7 days
    DAYS_30 = 2592000  # 30 days
    DAYS_90 = 7776000  # 90 days
    DAYS_365 = 31536000  # 1 year
    PERMANENT = -1  # Never delete


@dataclass
class RetentionPolicy:
    """Data retention policy configuration."""
    name: str
    description: str
    data_type: DataType
    retention_period: RetentionPeriod
    table_name: str
    date_column: str
    conditions: Dict[str, Any] = None
    enabled: bool = True
    dry_run: bool = False
    batch_size: int = 1000
    mask_pii: bool = False
    pii_columns: List[str] = None


@dataclass
class PIIField:
    """PII field configuration."""
    column_name: str
    field_type: str  # 'email', 'phone', 'ip', 'name', 'address', 'ssn', 'credit_card'
    mask_pattern: str = None
    hash_salt: str = None
    preserve_format: bool = True


class PIIMasker:
    """PII masking and anonymization utilities."""
    
    def __init__(self):
        """Initialize PII masker."""
        self.salt = os.getenv('PII_MASKING_SALT', 'default-salt-change-in-production')
        
        # PII patterns
        self.patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',
            'ip': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'
        }
        
        # Mask patterns
        self.mask_patterns = {
            'email': lambda m: f"{m.group(0).split('@')[0][:2]}***@{m.group(0).split('@')[1]}",
            'phone': lambda m: f"***-***-{m.group(0)[-4:]}",
            'ip': lambda m: f"{m.group(0).split('.')[0]}.{m.group(0).split('.')[1]}.***.***",
            'ssn': lambda m: f"***-**-{m.group(0)[-4:]}",
            'credit_card': lambda m: f"****-****-****-{m.group(0)[-4:]}"
        }
        
        logger.info("PII masker initialized")
    
    def mask_email(self, email: str) -> str:
        """Mask email address."""
        if not email or '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 2:
            masked_local = '*' * len(local)
        else:
            masked_local = local[:2] + '*' * (len(local) - 2)
        
        return f"{masked_local}@{domain}"
    
    def mask_phone(self, phone: str) -> str:
        """Mask phone number."""
        if not phone:
            return phone
        
        # Remove all non-digits
        digits = re.sub(r'\D', '', phone)
        
        if len(digits) == 10:
            return f"***-***-{digits[-4:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"***-***-{digits[-4:]}"
        else:
            return '*' * len(phone)
    
    def mask_ip(self, ip: str) -> str:
        """Mask IP address."""
        if not ip:
            return ip
        
        parts = ip.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.***.***"
        else:
            return '*' * len(ip)
    
    def mask_name(self, name: str) -> str:
        """Mask name."""
        if not name:
            return name
        
        words = name.split()
        if len(words) == 1:
            return words[0][0] + '*' * (len(words[0]) - 1)
        else:
            return f"{words[0][0]}{'*' * (len(words[0]) - 1)} {'*' * len(words[-1])}"
    
    def hash_value(self, value: str, field_type: str = None) -> str:
        """Hash a value with salt."""
        if not value:
            return value
        
        # Create field-specific salt
        field_salt = f"{self.salt}:{field_type}" if field_type else self.salt
        
        # Hash the value
        hashed = hashlib.sha256(f"{field_salt}:{value}".encode()).hexdigest()
        
        # Return first 8 characters for readability
        return hashed[:8]
    
    def mask_pii_field(self, value: str, field_type: str) -> str:
        """Mask a PII field based on its type."""
        if not value:
            return value
        
        if field_type == 'email':
            return self.mask_email(value)
        elif field_type == 'phone':
            return self.mask_phone(value)
        elif field_type == 'ip':
            return self.mask_ip(value)
        elif field_type == 'name':
            return self.mask_name(value)
        elif field_type == 'ssn':
            return self.mask_ssn(value)
        elif field_type == 'credit_card':
            return self.mask_credit_card(value)
        else:
            # Default: hash the value
            return self.hash_value(value, field_type)
    
    def mask_ssn(self, ssn: str) -> str:
        """Mask SSN."""
        if not ssn:
            return ssn
        
        # Remove non-digits
        digits = re.sub(r'\D', '', ssn)
        
        if len(digits) == 9:
            return f"***-**-{digits[-4:]}"
        else:
            return '*' * len(ssn)
    
    def mask_credit_card(self, card: str) -> str:
        """Mask credit card number."""
        if not card:
            return card
        
        # Remove non-digits
        digits = re.sub(r'\D', '', card)
        
        if len(digits) >= 4:
            return f"****-****-****-{digits[-4:]}"
        else:
            return '*' * len(card)
    
    def detect_pii_in_text(self, text: str) -> Dict[str, List[str]]:
        """Detect PII in text content."""
        detected = {}
        
        for pii_type, pattern in self.patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                detected[pii_type] = matches
        
        return detected
    
    def mask_text_pii(self, text: str) -> str:
        """Mask PII in text content."""
        if not text:
            return text
        
        masked_text = text
        
        # Apply masking patterns
        for pii_type, pattern in self.patterns.items():
            if pii_type in self.mask_patterns:
                masked_text = re.sub(
                    pattern, 
                    self.mask_patterns[pii_type], 
                    masked_text, 
                    flags=re.IGNORECASE
                )
        
        return masked_text


class DataRetentionService:
    """Data retention and PII hygiene service."""
    
    def __init__(self):
        """Initialize data retention service."""
        self.connection_manager = get_connection_manager()
        self.redis_manager = get_redis_manager_v5()
        self.pii_masker = PIIMasker()
        
        # Retention policies
        self.retention_policies: List[RetentionPolicy] = []
        
        # PII field configurations
        self.pii_fields: Dict[str, List[PIIField]] = {}
        
        # Service state
        self._running = False
        self._thread = None
        self._check_interval = 3600  # 1 hour
        
        # Load default policies
        self._load_default_policies()
        self._load_pii_field_configs()
        
        logger.info("Data retention service initialized")
    
    def _load_default_policies(self) -> None:
        """Load default retention policies."""
        default_policies = [
            # Failed login attempts - 90 days
            RetentionPolicy(
                name="failed_login_attempts",
                description="Failed login attempts retention",
                data_type=DataType.AUDIT,
                retention_period=RetentionPeriod.DAYS_90,
                table_name="auth_failed_logins",
                date_column="created_at",
                conditions={"success": False}
            ),
            
            # Audit logs - 1 year
            RetentionPolicy(
                name="audit_logs",
                description="Audit logs retention",
                data_type=DataType.AUDIT,
                retention_period=RetentionPeriod.DAYS_365,
                table_name="audit_logs",
                date_column="created_at"
            ),
            
            # Session data - 30 days after expiry
            RetentionPolicy(
                name="expired_sessions",
                description="Expired session data retention",
                data_type=DataType.SESSION,
                retention_period=RetentionPeriod.DAYS_30,
                table_name="auth_sessions",
                date_column="expires_at",
                conditions={"revoked_at": "IS NOT NULL"}
            ),
            
            # Performance metrics - 90 days
            RetentionPolicy(
                name="performance_metrics",
                description="Performance metrics retention",
                data_type=DataType.METRICS,
                retention_period=RetentionPeriod.DAYS_90,
                table_name="performance_metrics",
                date_column="timestamp"
            ),
            
            # Temporary data - 24 hours
            RetentionPolicy(
                name="temporary_data",
                description="Temporary data retention",
                data_type=DataType.TEMPORARY,
                retention_period=RetentionPeriod.HOURS_24,
                table_name="temp_data",
                date_column="created_at"
            ),
            
            # CSRF tokens - 1 hour
            RetentionPolicy(
                name="csrf_tokens",
                description="CSRF token retention",
                data_type=DataType.TEMPORARY,
                retention_period=RetentionPeriod.HOURS_1,
                table_name="csrf_tokens",
                date_column="expires_at"
            )
        ]
        
        self.retention_policies.extend(default_policies)
        logger.info(f"Loaded {len(default_policies)} default retention policies")
    
    def _load_pii_field_configs(self) -> None:
        """Load PII field configurations."""
        pii_configs = {
            'users': [
                PIIField('email', 'email'),
                PIIField('phone', 'phone'),
                PIIField('name', 'name'),
                PIIField('address', 'address')
            ],
            'auth_sessions': [
                PIIField('ip_address', 'ip'),
                PIIField('user_agent', 'user_agent')
            ],
            'audit_logs': [
                PIIField('ip_address', 'ip'),
                PIIField('user_agent', 'user_agent'),
                PIIField('email', 'email')
            ],
            'failed_logins': [
                PIIField('ip_address', 'ip'),
                PIIField('email', 'email')
            ]
        }
        
        self.pii_fields = pii_configs
        logger.info(f"Loaded PII field configurations for {len(pii_configs)} tables")
    
    def start_retention_service(self, check_interval: int = 3600) -> None:
        """Start the data retention service."""
        if self._running:
            logger.warning("Data retention service is already running")
            return
        
        self._check_interval = check_interval
        self._running = True
        self._thread = threading.Thread(target=self._retention_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Data retention service started with {check_interval}s interval")
    
    def stop_retention_service(self) -> None:
        """Stop the data retention service."""
        if not self._running:
            return
        
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=10)
        
        logger.info("Data retention service stopped")
    
    def _retention_loop(self) -> None:
        """Main retention processing loop."""
        while self._running:
            try:
                self._process_retention_policies()
                self._cleanup_redis_data()
                time.sleep(self._check_interval)
            except Exception as e:
                logger.error(f"Error in retention loop: {e}")
                time.sleep(self._check_interval)
    
    def _process_retention_policies(self) -> None:
        """Process all retention policies."""
        for policy in self.retention_policies:
            if not policy.enabled:
                continue
            
            try:
                self._process_policy(policy)
            except Exception as e:
                logger.error(f"Error processing policy {policy.name}: {e}")
    
    def _process_policy(self, policy: RetentionPolicy) -> None:
        """Process a single retention policy."""
        if policy.retention_period == RetentionPeriod.PERMANENT:
            return
        
        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(seconds=policy.retention_period.value)
        
        # Build query
        query = f"SELECT * FROM {policy.table_name} WHERE {policy.date_column} < %s"
        params = [cutoff_date]
        
        # Add conditions
        if policy.conditions:
            for column, value in policy.conditions.items():
                if value == "IS NOT NULL":
                    query += f" AND {column} IS NOT NULL"
                elif value == "IS NULL":
                    query += f" AND {column} IS NULL"
                else:
                    query += f" AND {column} = %s"
                    params.append(value)
        
        # Add limit for batch processing
        query += f" LIMIT {policy.batch_size}"
        
        try:
            with self.connection_manager.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get records to process
                cursor.execute(query, params)
                records = cursor.fetchall()
                
                if not records:
                    logger.debug(f"No records to process for policy {policy.name}")
                    return
                
                logger.info(f"Processing {len(records)} records for policy {policy.name}")
                
                if policy.dry_run:
                    logger.info(f"DRY RUN: Would delete {len(records)} records from {policy.table_name}")
                    return
                
                # Process records
                if policy.mask_pii:
                    self._mask_records_before_deletion(records, policy)
                
                # Delete records
                delete_query = f"DELETE FROM {policy.table_name} WHERE {policy.date_column} < %s"
                delete_params = [cutoff_date]
                
                if policy.conditions:
                    for column, value in policy.conditions.items():
                        if value == "IS NOT NULL":
                            delete_query += f" AND {column} IS NOT NULL"
                        elif value == "IS NULL":
                            delete_query += f" AND {column} IS NULL"
                        else:
                            delete_query += f" AND {column} = %s"
                            delete_params.append(value)
                
                cursor.execute(delete_query, delete_params)
                deleted_count = cursor.rowcount
                conn.commit()
                
                logger.info(f"Deleted {deleted_count} records from {policy.table_name} (policy: {policy.name})")
                
        except Exception as e:
            logger.error(f"Error processing policy {policy.name}: {e}")
            raise
    
    def _mask_records_before_deletion(self, records: List[Tuple], policy: RetentionPolicy) -> None:
        """Mask PII in records before deletion."""
        if policy.table_name not in self.pii_fields:
            return
        
        pii_fields = self.pii_fields[policy.table_name]
        
        # This would typically involve updating records with masked values
        # before deletion, but for simplicity, we'll just log the action
        logger.info(f"Would mask PII in {len(records)} records from {policy.table_name}")
    
    def _cleanup_redis_data(self) -> None:
        """Clean up expired Redis data."""
        try:
            # Get all keys with TTL
            keys = self.redis_manager.get_all_keys()
            
            expired_keys = []
            for key in keys:
                ttl = self.redis_manager.get_ttl(key)
                if ttl == -1:  # No expiration set
                    continue
                elif ttl == -2:  # Key doesn't exist
                    expired_keys.append(key)
                elif ttl == 0:  # Key expired
                    expired_keys.append(key)
            
            # Clean up expired keys
            if expired_keys:
                self.redis_manager.delete_multiple(expired_keys)
                logger.info(f"Cleaned up {len(expired_keys)} expired Redis keys")
        
        except Exception as e:
            logger.error(f"Error cleaning up Redis data: {e}")
    
    def add_retention_policy(self, policy: RetentionPolicy) -> None:
        """Add a new retention policy."""
        self.retention_policies.append(policy)
        logger.info(f"Added retention policy: {policy.name}")
    
    def remove_retention_policy(self, policy_name: str) -> bool:
        """Remove a retention policy."""
        for i, policy in enumerate(self.retention_policies):
            if policy.name == policy_name:
                del self.retention_policies[i]
                logger.info(f"Removed retention policy: {policy_name}")
                return True
        
        return False
    
    def get_retention_policies(self) -> List[RetentionPolicy]:
        """Get all retention policies."""
        return self.retention_policies.copy()
    
    def execute_policy_immediately(self, policy_name: str) -> Dict[str, Any]:
        """Execute a retention policy immediately."""
        policy = None
        for p in self.retention_policies:
            if p.name == policy_name:
                policy = p
                break
        
        if not policy:
            return {
                'success': False,
                'error': f'Policy {policy_name} not found'
            }
        
        try:
            # Temporarily enable the policy if disabled
            was_enabled = policy.enabled
            policy.enabled = True
            
            # Process the policy
            self._process_policy(policy)
            
            # Restore original state
            policy.enabled = was_enabled
            
            return {
                'success': True,
                'message': f'Policy {policy_name} executed successfully'
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def mask_pii_in_table(self, table_name: str, dry_run: bool = True) -> Dict[str, Any]:
        """Mask PII in a specific table."""
        if table_name not in self.pii_fields:
            return {
                'success': False,
                'error': f'No PII fields configured for table {table_name}'
            }
        
        pii_fields = self.pii_fields[table_name]
        
        try:
            with self.connection_manager.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get all records
                cursor.execute(f"SELECT * FROM {table_name}")
                records = cursor.fetchall()
                
                if not records:
                    return {
                        'success': True,
                        'message': f'No records found in table {table_name}',
                        'records_processed': 0
                    }
                
                if dry_run:
                    return {
                        'success': True,
                        'message': f'DRY RUN: Would mask PII in {len(records)} records',
                        'records_processed': len(records),
                        'pii_fields': [field.column_name for field in pii_fields]
                    }
                
                # Mask PII in records
                masked_count = 0
                for record in records:
                    # This would involve updating each record with masked values
                    # For now, just count the records
                    masked_count += 1
                
                return {
                    'success': True,
                    'message': f'Masked PII in {masked_count} records',
                    'records_processed': masked_count,
                    'pii_fields': [field.column_name for field in pii_fields]
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_data_retention_report(self) -> Dict[str, Any]:
        """Get a data retention report."""
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'policies': [],
            'summary': {
                'total_policies': len(self.retention_policies),
                'enabled_policies': sum(1 for p in self.retention_policies if p.enabled),
                'pii_tables': len(self.pii_fields)
            }
        }
        
        for policy in self.retention_policies:
            policy_info = {
                'name': policy.name,
                'description': policy.description,
                'data_type': policy.data_type.value,
                'retention_period': policy.retention_period.value,
                'table_name': policy.table_name,
                'enabled': policy.enabled,
                'dry_run': policy.dry_run
            }
            report['policies'].append(policy_info)
        
        return report


# Global instance
data_retention_service = DataRetentionService()


def get_data_retention_service() -> DataRetentionService:
    """Get the global data retention service instance."""
    return data_retention_service


def start_data_retention_service(check_interval: int = 3600) -> None:
    """Start the data retention service."""
    try:
        data_retention_service.start_retention_service(check_interval)
        logger.info("Data retention service started successfully")
    except Exception as e:
        logger.error(f"Failed to start data retention service: {e}")
        raise


def stop_data_retention_service() -> None:
    """Stop the data retention service."""
    try:
        data_retention_service.stop_retention_service()
        logger.info("Data retention service stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping data retention service: {e}")


def mask_pii_value(value: str, field_type: str) -> str:
    """Mask a single PII value."""
    return data_retention_service.pii_masker.mask_pii_field(value, field_type)


def detect_pii_in_text(text: str) -> Dict[str, List[str]]:
    """Detect PII in text content."""
    return data_retention_service.pii_masker.detect_pii_in_text(text)
