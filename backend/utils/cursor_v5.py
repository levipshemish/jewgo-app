"""
Enhanced cursor pagination system with canonicalization support for v5 API.

Builds upon existing cursor utilities with improved features including cursor
canonicalization for consistent ordering across entity types, enhanced validation,
support for multiple sort keys, cursor expiration and refresh mechanisms.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from utils.logging_config import get_logger

logger = get_logger(__name__)

# Enhanced cursor configuration
DEFAULT_TTL_HOURS = 24
MAX_TTL_HOURS = 168  # 7 days for v5
CURSOR_VERSION_V5 = 2  # Upgraded version for v5
MIN_PAGE_SIZE = 1
MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20

# Get enhanced HMAC secret
CURSOR_SECRET_V5 = os.environ.get('CURSOR_HMAC_SECRET_V5', os.environ.get('CURSOR_HMAC_SECRET'))
if not CURSOR_SECRET_V5:
    # Check if we're in production
    is_production = os.environ.get('ENVIRONMENT', '').lower() == 'production'
    if is_production:
        logger.error("CURSOR_HMAC_SECRET_V5 is required in production environment")
        raise ValueError("CURSOR_HMAC_SECRET_V5 environment variable is required in production")
    
    # Development fallback with stronger warning
    CURSOR_SECRET_V5 = 'dev-cursor-v5-secret-not-secure-do-not-use-in-production'
    logger.warning("CURSOR_HMAC_SECRET_V5 not set in environment. Using insecure development default. "
                  "This will fail in production!")


class CursorV5Error(Exception):
    """Base exception for v5 cursor-related errors."""
    pass


class CursorV5ValidationError(CursorV5Error):
    """Exception raised when v5 cursor validation fails."""
    pass


class CursorV5ExpiredError(CursorV5Error):
    """Exception raised when v5 cursor has expired."""
    pass


class CursorV5IncompatibleError(CursorV5Error):
    """Exception raised when cursor is incompatible with current data version."""
    pass


class CursorV5Manager:
    """Enhanced cursor manager for v5 API with canonicalization support."""
    
    # Supported sort strategies with canonicalization rules
    SORT_STRATEGIES = {
        'created_at_desc': {
            'primary': 'created_at',
            'direction': 'DESC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'DESC',
            'canonicalization': 'timestamp_id'
        },
        'created_at_asc': {
            'primary': 'created_at',
            'direction': 'ASC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'ASC',
            'canonicalization': 'timestamp_id'
        },
        'updated_at_desc': {
            'primary': 'updated_at',
            'direction': 'DESC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'DESC',
            'canonicalization': 'timestamp_id'
        },
        'name_asc': {
            'primary': 'name',
            'direction': 'ASC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'ASC',
            'canonicalization': 'text_id'
        },
        'name_desc': {
            'primary': 'name',
            'direction': 'DESC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'DESC',
            'canonicalization': 'text_id'
        },
        'distance_asc': {
            'primary': 'distance',
            'direction': 'ASC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'ASC',
            'canonicalization': 'numeric_id'
        },
        'rating_desc': {
            'primary': 'rating',
            'direction': 'DESC',
            'tiebreaker': 'id',
            'tiebreaker_direction': 'DESC',
            'canonicalization': 'numeric_id'
        }
    }
    
    def __init__(self):
        self.version = CURSOR_VERSION_V5
        self.secret = CURSOR_SECRET_V5
    
    def create_cursor(
        self,
        *,
        primary_value: Union[str, int, float, datetime],
        record_id: int,
        sort_key: str = 'created_at_desc',
        direction: str = 'next',
        entity_type: str = 'generic',
        data_version: str,
        page_size: int = DEFAULT_PAGE_SIZE,
        filters: Optional[Dict[str, Any]] = None,
        ttl_hours: int = DEFAULT_TTL_HOURS
    ) -> str:
        """
        Create an enhanced HMAC-signed cursor token with canonicalization.
        
        Args:
            primary_value: The value of the primary sort field
            record_id: The record ID for tie-breaking
            sort_key: Sorting strategy
            direction: Pagination direction ('next' or 'prev')
            entity_type: Type of entity for canonicalization
            data_version: Server-authored data version hash
            page_size: Number of items per page
            filters: Applied filters for consistency
            ttl_hours: Token expiration time in hours
            
        Returns:
            Base64-encoded HMAC-signed cursor token
        """
        try:
            # Validate parameters
            self._validate_cursor_params(record_id, sort_key, direction, page_size, ttl_hours)
            
            # Canonicalize the cursor values
            canonical_primary, canonical_id = self._canonicalize_cursor_values(
                primary_value, record_id, sort_key, entity_type
            )
            
            # Create cursor payload
            now = datetime.now(timezone.utc)
            exp = int(now.timestamp()) + (ttl_hours * 3600)
            
            payload = {
                'primaryValue': canonical_primary,
                'id': canonical_id,
                'sortKey': sort_key,
                'dir': direction,
                'entityType': entity_type,
                'ver': self.version,
                'dataVer': data_version,
                'pageSize': page_size,
                'filters': filters or {},
                'canonicalization': self.SORT_STRATEGIES[sort_key]['canonicalization'],
                'exp': exp,
                'iat': int(now.timestamp())
            }
            
            # Create secure signature
            cursor_token = self._sign_and_encode(payload)
            
            logger.debug(
                "Created v5 cursor",
                cursor_preview=cursor_token[:20] + "...",
                entity_type=entity_type,
                sort_key=sort_key,
                direction=direction
            )
            
            return cursor_token
            
        except Exception as e:
            logger.error("Failed to create v5 cursor", error=str(e))
            raise CursorV5Error(f"V5 cursor creation failed: {e}") from e
    
    def decode_cursor(
        self,
        cursor_token: str,
        expected_direction: Optional[str] = None,
        expected_entity_type: Optional[str] = None,
        current_data_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Decode and validate an enhanced HMAC-signed cursor token.
        
        Args:
            cursor_token: Base64-encoded cursor token
            expected_direction: Optional direction validation
            expected_entity_type: Optional entity type validation
            current_data_version: Current data version for compatibility check
            
        Returns:
            Decoded cursor payload dictionary
        """
        try:
            # Decode and verify signature
            payload = self._decode_and_verify(cursor_token)
            
            # Validate cursor structure and content
            self._validate_cursor_payload(payload)
            
            # Check expiration
            self._check_cursor_expiration(payload)
            
            # Validate expected values
            if expected_direction and payload['dir'] != expected_direction:
                raise CursorV5ValidationError(
                    f"Direction mismatch: expected {expected_direction}, got {payload['dir']}"
                )
            
            if expected_entity_type and payload.get('entityType') != expected_entity_type:
                raise CursorV5ValidationError(
                    f"Entity type mismatch: expected {expected_entity_type}, got {payload.get('entityType')}"
                )
            
            # Check data version compatibility
            if current_data_version and payload.get('dataVer') != current_data_version:
                logger.warning(
                    "Cursor data version mismatch",
                    cursor_version=payload.get('dataVer'),
                    current_version=current_data_version
                )
                # Could raise CursorV5IncompatibleError if strict compatibility required
            
            logger.debug(
                "Successfully decoded v5 cursor",
                entity_type=payload.get('entityType'),
                sort_key=payload['sortKey'],
                direction=payload['dir']
            )
            
            return payload
            
        except (CursorV5ValidationError, CursorV5ExpiredError, CursorV5IncompatibleError):
            raise
        except Exception as e:
            logger.error("V5 cursor decode error", error=str(e))
            raise CursorV5ValidationError(f"V5 cursor decode failed: {e}") from e
    
    def extract_cursor_position(self, payload: Dict[str, Any]) -> Tuple[Any, int]:
        """
        Extract position information from decoded cursor payload.
        
        Args:
            payload: Decoded cursor payload
            
        Returns:
            Tuple of (primary_value, id) for database querying
        """
        try:
            primary_value = payload['primaryValue']
            record_id = payload['id']
            sort_key = payload['sortKey']
            canonicalization = payload.get('canonicalization')
            
            # Reconstruct original value based on canonicalization
            if canonicalization == 'timestamp_id':
                # Convert back to datetime if needed
                if isinstance(primary_value, str):
                    primary_value = datetime.fromisoformat(primary_value.replace('Z', '+00:00'))
            elif canonicalization == 'text_id':
                # Text values are stored as-is
                pass
            elif canonicalization == 'numeric_id':
                # Numeric values might need type conversion
                if sort_key in ['rating_desc', 'distance_asc']:
                    primary_value = float(primary_value) if primary_value is not None else None
            
            return primary_value, record_id
            
        except (KeyError, ValueError, TypeError) as e:
            raise CursorV5ValidationError(f"Invalid v5 cursor position data: {e}") from e
    
    def create_next_cursor(
        self,
        last_item: Dict[str, Any],
        sort_key: str = 'created_at_desc',
        entity_type: str = 'generic',
        data_version: str = '',
        page_size: int = DEFAULT_PAGE_SIZE,
        filters: Optional[Dict[str, Any]] = None,
        ttl_hours: int = DEFAULT_TTL_HOURS
    ) -> Optional[str]:
        """
        Create a cursor for the next page based on the last item in current page.
        
        Args:
            last_item: The last record from current page
            sort_key: Sorting strategy used
            entity_type: Type of entity
            data_version: Current data version
            page_size: Page size
            filters: Applied filters
            ttl_hours: Token expiration time
            
        Returns:
            Cursor token for next page, or None if no more pages
        """
        try:
            if not last_item:
                return None
            
            # Get sort strategy
            if sort_key not in self.SORT_STRATEGIES:
                logger.warning(f"Unknown sort key: {sort_key}, using default")
                sort_key = 'created_at_desc'
            
            strategy = self.SORT_STRATEGIES[sort_key]
            primary_field = strategy['primary']
            
            # Extract primary value
            primary_value = last_item.get(primary_field)
            if primary_value is None:
                logger.warning(f"Missing primary field '{primary_field}' in last item")
                return None
            
            # Extract record ID
            record_id = last_item.get('id')
            if not record_id:
                logger.warning("Cannot create v5 cursor: missing ID in last item")
                return None
            
            return self.create_cursor(
                primary_value=primary_value,
                record_id=record_id,
                sort_key=sort_key,
                direction='next',
                entity_type=entity_type,
                data_version=data_version,
                page_size=page_size,
                filters=filters,
                ttl_hours=ttl_hours
            )
            
        except Exception as e:
            logger.error("Failed to create v5 next cursor", error=str(e), last_item_id=last_item.get('id'))
            return None
    
    def create_prev_cursor(
        self,
        first_item: Dict[str, Any],
        sort_key: str = 'created_at_desc',
        entity_type: str = 'generic',
        data_version: str = '',
        page_size: int = DEFAULT_PAGE_SIZE,
        filters: Optional[Dict[str, Any]] = None,
        ttl_hours: int = DEFAULT_TTL_HOURS
    ) -> Optional[str]:
        """Create a cursor for the previous page based on the first item in current page."""
        try:
            if not first_item:
                return None
            
            strategy = self.SORT_STRATEGIES.get(sort_key, self.SORT_STRATEGIES['created_at_desc'])
            primary_field = strategy['primary']
            
            primary_value = first_item.get(primary_field)
            record_id = first_item.get('id')
            
            if primary_value is None or not record_id:
                return None
            
            return self.create_cursor(
                primary_value=primary_value,
                record_id=record_id,
                sort_key=sort_key,
                direction='prev',
                entity_type=entity_type,
                data_version=data_version,
                page_size=page_size,
                filters=filters,
                ttl_hours=ttl_hours
            )
            
        except Exception as e:
            logger.error("Failed to create v5 prev cursor", error=str(e))
            return None
    
    def refresh_cursor(self, cursor_token: str, new_data_version: str) -> str:
        """
        Refresh a cursor with a new data version while preserving position.
        
        Args:
            cursor_token: Existing cursor token
            new_data_version: New data version
            
        Returns:
            Refreshed cursor token
        """
        try:
            # Decode existing cursor
            payload = self.decode_cursor(cursor_token)
            
            # Create new cursor with updated data version
            return self.create_cursor(
                primary_value=payload['primaryValue'],
                record_id=payload['id'],
                sort_key=payload['sortKey'],
                direction=payload['dir'],
                entity_type=payload.get('entityType', 'generic'),
                data_version=new_data_version,
                page_size=payload.get('pageSize', DEFAULT_PAGE_SIZE),
                filters=payload.get('filters'),
                ttl_hours=DEFAULT_TTL_HOURS
            )
            
        except Exception as e:
            logger.error("Failed to refresh v5 cursor", error=str(e))
            raise CursorV5Error(f"V5 cursor refresh failed: {e}") from e
    
    def _validate_cursor_params(
        self,
        record_id: int,
        sort_key: str,
        direction: str,
        page_size: int,
        ttl_hours: int
    ):
        """Validate cursor creation parameters."""
        if not isinstance(record_id, int) or record_id <= 0:
            raise CursorV5Error("ID must be a positive integer")
        
        if sort_key not in self.SORT_STRATEGIES:
            raise CursorV5Error(f"Unsupported sort key: {sort_key}")
        
        if direction not in ('next', 'prev'):
            raise CursorV5Error("Direction must be 'next' or 'prev'")
        
        if not (MIN_PAGE_SIZE <= page_size <= MAX_PAGE_SIZE):
            raise CursorV5Error(f"Page size must be between {MIN_PAGE_SIZE} and {MAX_PAGE_SIZE}")
        
        if ttl_hours <= 0 or ttl_hours > MAX_TTL_HOURS:
            raise CursorV5Error(f"TTL must be between 1 and {MAX_TTL_HOURS} hours")
    
    def _canonicalize_cursor_values(
        self,
        primary_value: Union[str, int, float, datetime],
        record_id: int,
        sort_key: str,
        entity_type: str
    ) -> Tuple[Any, int]:
        """Canonicalize cursor values for consistent ordering."""
        strategy = self.SORT_STRATEGIES[sort_key]
        canonicalization = strategy['canonicalization']
        
        if canonicalization == 'timestamp_id':
            # Ensure datetime is in ISO format
            if isinstance(primary_value, datetime):
                canonical_primary = primary_value.isoformat()
            else:
                canonical_primary = primary_value
        elif canonicalization == 'text_id':
            # Normalize text values
            canonical_primary = str(primary_value).lower().strip() if primary_value else ''
        elif canonicalization == 'numeric_id':
            # Ensure numeric values are properly typed
            if primary_value is None:
                canonical_primary = None
            else:
                canonical_primary = float(primary_value)
        else:
            canonical_primary = primary_value
        
        return canonical_primary, record_id
    
    def _sign_and_encode(self, payload: Dict[str, Any]) -> str:
        """Sign and encode cursor payload."""
        # JSON encode with deterministic ordering
        payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'), default=str)
        
        # Create HMAC signature
        signature = hmac.new(
            self.secret.encode('utf-8'),
            payload_json.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Combine payload and signature
        cursor_data = payload_json.encode('utf-8') + b'|' + signature
        
        # Base64 encode for URL safety
        return base64.urlsafe_b64encode(cursor_data).decode('ascii')
    
    def _decode_and_verify(self, cursor_token: str) -> Dict[str, Any]:
        """Decode and verify cursor signature."""
        try:
            cursor_data = base64.urlsafe_b64decode(cursor_token.encode('ascii'))
        except Exception as e:
            raise CursorV5ValidationError("Invalid base64 encoding") from e
        
        try:
            payload_bytes, signature = cursor_data.rsplit(b'|', 1)
        except ValueError:
            raise CursorV5ValidationError("Invalid cursor format")
        
        # Verify HMAC signature
        expected_signature = hmac.new(
            self.secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(signature, expected_signature):
            raise CursorV5ValidationError("Invalid cursor signature")
        
        # Parse JSON payload
        try:
            return json.loads(payload_bytes.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise CursorV5ValidationError("Invalid cursor payload JSON") from e
    
    def _validate_cursor_payload(self, payload: Dict[str, Any]):
        """Validate cursor payload structure."""
        required_fields = {
            'primaryValue', 'id', 'sortKey', 'dir', 'ver', 'dataVer', 
            'exp', 'iat', 'entityType', 'canonicalization'
        }
        
        if not all(field in payload for field in required_fields):
            missing = required_fields - set(payload.keys())
            raise CursorV5ValidationError(f"Missing required cursor fields: {missing}")
        
        if payload['ver'] != self.version:
            raise CursorV5ValidationError(f"Unsupported cursor version: {payload['ver']}")
        
        if payload['sortKey'] not in self.SORT_STRATEGIES:
            raise CursorV5ValidationError(f"Unknown sort key: {payload['sortKey']}")
    
    def _check_cursor_expiration(self, payload: Dict[str, Any]):
        """Check if cursor has expired."""
        current_time = int(time.time())
        if payload['exp'] < current_time:
            raise CursorV5ExpiredError(
                f"Cursor expired at {datetime.fromtimestamp(payload['exp'])}, "
                f"current time is {datetime.fromtimestamp(current_time)}"
            )


# Global instance
cursor_manager_v5 = CursorV5Manager()

# Convenience functions
def create_cursor_v5(**kwargs) -> str:
    """Create a v5 cursor token."""
    return cursor_manager_v5.create_cursor(**kwargs)

def decode_cursor_v5(cursor_token: str, **kwargs) -> Dict[str, Any]:
    """Decode a v5 cursor token."""
    return cursor_manager_v5.decode_cursor(cursor_token, **kwargs)

def extract_cursor_position_v5(payload: Dict[str, Any]) -> Tuple[Any, int]:
    """Extract position from v5 cursor payload."""
    return cursor_manager_v5.extract_cursor_position(payload)

def create_next_cursor_v5(**kwargs) -> Optional[str]:
    """Create next cursor for v5."""
    return cursor_manager_v5.create_next_cursor(**kwargs)

def create_prev_cursor_v5(**kwargs) -> Optional[str]:
    """Create previous cursor for v5."""
    return cursor_manager_v5.create_prev_cursor(**kwargs)

def refresh_cursor_v5(cursor_token: str, new_data_version: str) -> str:
    """Refresh a v5 cursor."""
    return cursor_manager_v5.refresh_cursor(cursor_token, new_data_version)

def get_cursor_v5_stats() -> Dict[str, Any]:
    """Get v5 cursor configuration statistics."""
    return {
        'version': CURSOR_VERSION_V5,
        'supported_sort_strategies': list(cursor_manager_v5.SORT_STRATEGIES.keys()),
        'default_ttl_hours': DEFAULT_TTL_HOURS,
        'max_ttl_hours': MAX_TTL_HOURS,
        'min_page_size': MIN_PAGE_SIZE,
        'max_page_size': MAX_PAGE_SIZE,
        'default_page_size': DEFAULT_PAGE_SIZE,
        'secret_configured': CURSOR_SECRET_V5 != 'dev-cursor-v5-secret-not-secure-do-not-use-in-production',
        'canonicalization_types': list(set(
            strategy['canonicalization'] for strategy in cursor_manager_v5.SORT_STRATEGIES.values()
        ))
    }