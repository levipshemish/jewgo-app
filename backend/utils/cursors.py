#!/usr/bin/env python3
"""HMAC-signed cursor utilities for secure, opaque pagination tokens.

This module provides cursor-based pagination with server-authored durability,
following Phase 2 requirements from the infinite scroll implementation plan.
"""

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from utils.logging_config import get_logger

logger = get_logger(__name__)

# Cursor configuration
DEFAULT_TTL_HOURS = 24
MAX_TTL_HOURS = 72
CURSOR_VERSION = 1

# Get HMAC secret from environment (required for production)
CURSOR_SECRET = os.environ.get('CURSOR_HMAC_SECRET')
if not CURSOR_SECRET:
    # Development fallback - generate a warning
    CURSOR_SECRET = 'dev-cursor-secret-not-secure-do-not-use-in-production'
    logger.warning(
        "CURSOR_HMAC_SECRET not set in environment. Using insecure development default."
    )


class CursorError(Exception):
    """Base exception for cursor-related errors."""
    pass


class CursorValidationError(CursorError):
    """Exception raised when cursor validation fails."""
    pass


class CursorExpiredError(CursorError):
    """Exception raised when cursor has expired."""
    pass


def create_cursor(
    *,
    created_at: datetime,
    id: int,
    sort_key: str = 'created_at_desc',
    direction: str = 'next',
    data_version: str,
    ttl_hours: int = DEFAULT_TTL_HOURS
) -> str:
    """Create an HMAC-signed opaque cursor token.
    
    Args:
        created_at: The timestamp for cursor positioning
        id: The record ID for tie-breaking
        sort_key: Sorting strategy (e.g., 'created_at_desc', 'name_asc')
        direction: Pagination direction ('next' or 'prev')
        data_version: Server-authored data version hash
        ttl_hours: Token expiration time in hours
        
    Returns:
        Base64-encoded HMAC-signed cursor token
        
    Raises:
        CursorError: If parameters are invalid
    """
    try:
        # Validate parameters
        if not isinstance(id, int) or id <= 0:
            raise CursorError("ID must be a positive integer")
        
        if direction not in ('next', 'prev'):
            raise CursorError("Direction must be 'next' or 'prev'")
        
        if ttl_hours <= 0 or ttl_hours > MAX_TTL_HOURS:
            raise CursorError(f"TTL must be between 1 and {MAX_TTL_HOURS} hours")
        
        # Create cursor payload
        now = datetime.now(timezone.utc)
        exp = int(now.timestamp()) + (ttl_hours * 3600)
        
        payload = {
            'createdAt': created_at.isoformat() if isinstance(created_at, datetime) else created_at,
            'id': id,
            'sortKey': sort_key,
            'dir': direction,
            'ver': CURSOR_VERSION,
            'dataVer': data_version,
            'exp': exp,
            'iat': int(now.timestamp())
        }
        
        # JSON encode and sign with HMAC
        payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        signature = hmac.new(
            CURSOR_SECRET.encode('utf-8'),
            payload_json.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Combine payload and signature
        cursor_data = payload_json.encode('utf-8') + b'|' + signature
        
        # Base64 encode for URL safety
        cursor_token = base64.urlsafe_b64encode(cursor_data).decode('ascii')
        
        logger.debug("Created cursor", 
                    cursor_preview=cursor_token[:20] + "...",
                    id=id,
                    direction=direction,
                    sort_key=sort_key)
        
        return cursor_token
        
    except Exception as e:
        logger.error("Failed to create cursor", error=str(e))
        raise CursorError(f"Cursor creation failed: {e}") from e


def decode_cursor(cursor_token: str, expected_direction: Optional[str] = None) -> Dict[str, Any]:
    """Decode and validate an HMAC-signed cursor token.
    
    Args:
        cursor_token: Base64-encoded cursor token
        expected_direction: Optional direction validation ('next' or 'prev')
        
    Returns:
        Decoded cursor payload dictionary
        
    Raises:
        CursorValidationError: If cursor is invalid or tampered
        CursorExpiredError: If cursor has expired
    """
    try:
        # Base64 decode
        try:
            cursor_data = base64.urlsafe_b64decode(cursor_token.encode('ascii'))
        except Exception as e:
            raise CursorValidationError("Invalid base64 encoding") from e
        
        # Split payload and signature
        try:
            payload_bytes, signature = cursor_data.rsplit(b'|', 1)
        except ValueError:
            raise CursorValidationError("Invalid cursor format")
        
        # Verify HMAC signature
        expected_signature = hmac.new(
            CURSOR_SECRET.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(signature, expected_signature):
            logger.warning("Cursor signature verification failed")
            raise CursorValidationError("Invalid cursor signature")
        
        # Parse JSON payload
        try:
            payload = json.loads(payload_bytes.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise CursorValidationError("Invalid cursor payload JSON") from e
        
        # Validate payload structure
        required_fields = {'createdAt', 'id', 'sortKey', 'dir', 'ver', 'dataVer', 'exp', 'iat'}
        if not all(field in payload for field in required_fields):
            raise CursorValidationError("Missing required cursor fields")
        
        # Check expiration
        current_time = int(time.time())
        if payload['exp'] < current_time:
            logger.info("Expired cursor accessed", exp=payload['exp'], now=current_time)
            raise CursorExpiredError("Cursor has expired")
        
        # Check version compatibility
        if payload['ver'] != CURSOR_VERSION:
            raise CursorValidationError(f"Unsupported cursor version: {payload['ver']}")
        
        # Validate direction if specified
        if expected_direction and payload['dir'] != expected_direction:
            raise CursorValidationError(
                f"Direction mismatch: expected {expected_direction}, got {payload['dir']}"
            )
        
        logger.debug("Successfully decoded cursor",
                    id=payload['id'],
                    direction=payload['dir'],
                    sort_key=payload['sortKey'])
        
        return payload
        
    except (CursorValidationError, CursorExpiredError):
        raise
    except Exception as e:
        logger.error("Cursor decode error", error=str(e))
        raise CursorValidationError(f"Cursor decode failed: {e}") from e


def extract_cursor_position(payload: Dict[str, Any]) -> Tuple[datetime, int]:
    """Extract position information from decoded cursor payload.
    
    Args:
        payload: Decoded cursor payload
        
    Returns:
        Tuple of (created_at, id) for database querying
        
    Raises:
        CursorValidationError: If payload format is invalid
    """
    try:
        created_at_str = payload['createdAt']
        id_value = payload['id']
        
        # Parse datetime
        if isinstance(created_at_str, str):
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        else:
            created_at = created_at_str
            
        # Validate ID
        if not isinstance(id_value, int) or id_value <= 0:
            raise CursorValidationError("Invalid cursor ID")
            
        return created_at, id_value
        
    except (KeyError, ValueError, TypeError) as e:
        raise CursorValidationError(f"Invalid cursor position data: {e}") from e


def get_cursor_metadata(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract metadata from decoded cursor payload.
    
    Args:
        payload: Decoded cursor payload
        
    Returns:
        Dictionary with cursor metadata
    """
    return {
        'sort_key': payload.get('sortKey'),
        'direction': payload.get('dir'),
        'data_version': payload.get('dataVer'),
        'version': payload.get('ver'),
        'issued_at': payload.get('iat'),
        'expires_at': payload.get('exp')
    }


def create_next_cursor(
    last_item: Dict[str, Any],
    sort_key: str = 'created_at_desc',
    data_version: str = '',
    ttl_hours: int = DEFAULT_TTL_HOURS
) -> Optional[str]:
    """Create a cursor for the next page based on the last item in current page.
    
    Args:
        last_item: The last restaurant record from current page
        sort_key: Sorting strategy used
        data_version: Current data version
        ttl_hours: Token expiration time
        
    Returns:
        Cursor token for next page, or None if no more pages
    """
    try:
        if not last_item:
            return None
            
        # Extract position info based on sort key
        if 'created_at' in sort_key.lower():
            created_at = last_item.get('created_at')
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            # Fallback to ID-based sorting
            created_at = datetime.now(timezone.utc)
            
        record_id = last_item.get('id')
        if not record_id:
            logger.warning("Cannot create cursor: missing ID in last item")
            return None
            
        return create_cursor(
            created_at=created_at,
            id=record_id,
            sort_key=sort_key,
            direction='next',
            data_version=data_version,
            ttl_hours=ttl_hours
        )
        
    except Exception as e:
        logger.error("Failed to create next cursor", error=str(e), last_item_id=last_item.get('id'))
        return None


# Health check and utilities
def validate_cursor_secret() -> bool:
    """Validate that cursor secret is properly configured.
    
    Returns:
        True if secret is secure, False if using development default
    """
    return CURSOR_SECRET != 'dev-cursor-secret-not-secure-do-not-use-in-production'


def get_cursor_stats() -> Dict[str, Any]:
    """Get cursor configuration statistics for monitoring.
    
    Returns:
        Dictionary with cursor configuration info
    """
    return {
        'version': CURSOR_VERSION,
        'default_ttl_hours': DEFAULT_TTL_HOURS,
        'max_ttl_hours': MAX_TTL_HOURS,
        'secret_configured': validate_cursor_secret(),
        'secret_length': len(CURSOR_SECRET) if CURSOR_SECRET else 0
    }