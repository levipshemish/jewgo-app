#!/usr/bin/env python3
"""Server-authored data version computation for cursor consistency.

This module computes deterministic data version hashes to ensure cursor
validity across data changes, following Phase 2 requirements.
"""

import hashlib
import json
import math
from typing import Any, Dict, List, Optional

from utils.logging_config import get_logger

logger = get_logger(__name__)

# Version constants
SCHEMA_VERSION = "v4.1"
SORT_VERSION = "sort_v2"
GEOHASH_PRECISION = 3  # Decimal places for location rounding


def round_coordinates(lat: Optional[float], lng: Optional[float]) -> Optional[str]:
    """Round coordinates to reduce version noise from minor location changes.
    
    Args:
        lat: Latitude coordinate
        lng: Longitude coordinate
        
    Returns:
        Rounded geohash string or None if coordinates invalid
    """
    try:
        if lat is None or lng is None:
            return None
            
        # Round to specified precision to reduce noise
        rounded_lat = round(lat, GEOHASH_PRECISION)
        rounded_lng = round(lng, GEOHASH_PRECISION)
        
        # Create simple geohash-like string
        return f"{rounded_lat},{rounded_lng}"
        
    except (TypeError, ValueError):
        return None


def normalize_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize filters for consistent hashing.
    
    Args:
        filters: Raw filter dictionary
        
    Returns:
        Normalized filter dictionary
    """
    normalized = {}
    
    # Handle common filter fields
    if filters.get('search'):
        # Normalize search queries
        search = str(filters['search']).strip().lower()
        if search:
            normalized['search'] = search
    
    if filters.get('kosher_category'):
        normalized['kosher_category'] = str(filters['kosher_category']).strip()
    
    if filters.get('status'):
        normalized['status'] = str(filters['status']).strip()
    
    if filters.get('business_types'):
        # Sort business types for consistency
        business_types = filters['business_types']
        if isinstance(business_types, list):
            normalized['business_types'] = sorted([str(bt).strip() for bt in business_types])
        elif business_types:
            normalized['business_types'] = [str(business_types).strip()]
    
    if filters.get('certifying_agency'):
        normalized['certifying_agency'] = str(filters['certifying_agency']).strip()
    
    if filters.get('city'):
        normalized['city'] = str(filters['city']).strip().lower()
    
    if filters.get('state'):
        normalized['state'] = str(filters['state']).strip().upper()
    
    if filters.get('price_range'):
        normalized['price_range'] = str(filters['price_range']).strip()
    
    if filters.get('min_rating'):
        # Round rating to avoid float precision issues
        try:
            rating = float(filters['min_rating'])
            normalized['min_rating'] = round(rating, 1)
        except (TypeError, ValueError):
            pass
    
    # Handle location-based filters
    if filters.get('latitude') and filters.get('longitude'):
        geohash = round_coordinates(
            filters.get('latitude'), 
            filters.get('longitude')
        )
        if geohash:
            normalized['location'] = geohash
    
    if filters.get('radius'):
        try:
            # Round radius to avoid minor variations
            radius = float(filters['radius'])
            normalized['radius'] = round(radius, 1)
        except (TypeError, ValueError):
            pass
    
    # Sort keys for deterministic output
    return dict(sorted(normalized.items()))


def get_feature_flags() -> Dict[str, bool]:
    """Get current feature flag states that affect data.
    
    Returns:
        Dictionary of feature flags affecting data queries
    """
    # In a real implementation, this would read from your feature flag system
    # For now, return static flags that affect restaurant queries
    return {
        'filter_test_restaurants': True,
        'include_inactive_restaurants': False,
        'enhanced_search': True,
        'kosher_verification': True
    }


def get_cohorts(user_id: Optional[int] = None) -> List[str]:
    """Get user cohorts for A/B testing that affect data presentation.
    
    Args:
        user_id: Optional user ID for cohort assignment
        
    Returns:
        List of cohort names affecting data queries
    """
    cohorts = []
    
    # Example cohort logic - replace with your actual implementation
    if user_id:
        # Simple hash-based cohort assignment
        cohort_hash = hash(str(user_id)) % 100
        
        if cohort_hash < 10:
            cohorts.append('enhanced_filtering_v2')
        elif cohort_hash < 30:
            cohorts.append('location_boost_v1')
        
        if cohort_hash % 2 == 0:
            cohorts.append('image_optimization_v1')
    
    return sorted(cohorts)  # Sort for consistency


def compute_data_version(
    *,
    filters: Optional[Dict[str, Any]] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    sort_key: str = 'created_at_desc',
    user_id: Optional[int] = None,
    include_metadata: bool = False
) -> str:
    """Compute server-authored data version hash for cursor consistency.
    
    Args:
        filters: Query filters affecting results
        latitude: User latitude for location-based queries
        longitude: User longitude for location-based queries
        sort_key: Sorting strategy used
        user_id: Optional user ID for personalization
        include_metadata: Whether to include detailed metadata
        
    Returns:
        16-character hex hash representing current data version
    """
    try:
        # Build version computation input
        version_input = {
            'schema': SCHEMA_VERSION,
            'sort': SORT_VERSION,
            'sort_key': sort_key
        }
        
        # Add normalized filters
        if filters:
            normalized_filters = normalize_filters(filters)
            if normalized_filters:
                version_input['filters'] = normalized_filters
        
        # Add location if provided
        geohash = round_coordinates(latitude, longitude)
        if geohash:
            version_input['geo'] = geohash
        
        # Add feature flags that affect data
        feature_flags = get_feature_flags()
        if feature_flags:
            version_input['flags'] = feature_flags
        
        # Add user cohorts
        cohorts = get_cohorts(user_id)
        if cohorts:
            version_input['cohorts'] = cohorts
        
        # Add metadata if requested
        if include_metadata:
            import time
            # Round to hour to prevent constant version changes
            hour_timestamp = int(time.time() // 3600) * 3600
            version_input['computed_at'] = hour_timestamp
        
        # Create deterministic JSON and hash
        version_json = json.dumps(version_input, sort_keys=True, separators=(',', ':'))
        version_hash = hashlib.sha256(version_json.encode('utf-8')).hexdigest()
        
        # Return first 16 characters for reasonable length
        short_hash = version_hash[:16]
        
        logger.debug("Computed data version",
                    version=short_hash,
                    input_keys=list(version_input.keys()),
                    sort_key=sort_key)
        
        return short_hash
        
    except Exception as e:
        logger.error("Failed to compute data version", error=str(e))
        # Return a fallback version based on sort key and timestamp
        import time
        fallback_input = f"{sort_key}:{int(time.time() // 3600)}"
        fallback_hash = hashlib.md5(fallback_input.encode('utf-8')).hexdigest()
        return fallback_hash[:16]


def validate_data_version(
    current_version: str,
    cursor_version: str,
    tolerance_hours: int = 1
) -> bool:
    """Validate if a cursor's data version is still compatible.
    
    Args:
        current_version: Currently computed data version
        cursor_version: Data version from the cursor
        tolerance_hours: Hours of tolerance for version mismatches
        
    Returns:
        True if versions are compatible, False otherwise
    """
    try:
        # Exact match is always valid
        if current_version == cursor_version:
            return True
        
        # For development/testing, be more lenient
        if tolerance_hours > 0:
            logger.info("Data version mismatch with tolerance",
                       current=current_version,
                       cursor=cursor_version,
                       tolerance_hours=tolerance_hours)
            return True
        
        logger.warning("Data version validation failed",
                      current=current_version,
                      cursor=cursor_version)
        return False
        
    except Exception as e:
        logger.error("Data version validation error", error=str(e))
        return False


def get_version_metadata(version_hash: str) -> Dict[str, Any]:
    """Get metadata about a data version for debugging.
    
    Args:
        version_hash: The version hash to analyze
        
    Returns:
        Dictionary with version metadata
    """
    return {
        'hash': version_hash,
        'length': len(version_hash),
        'schema_version': SCHEMA_VERSION,
        'sort_version': SORT_VERSION,
        'geohash_precision': GEOHASH_PRECISION,
        'created_at': None  # Could store creation time if needed
    }


def compute_query_signature(
    filters: Optional[Dict[str, Any]] = None,
    sort_key: str = 'created_at_desc',
    limit: int = 24
) -> str:
    """Compute a signature for caching query results.
    
    Args:
        filters: Query filters
        sort_key: Sorting strategy
        limit: Result limit
        
    Returns:
        Query signature hash for caching
    """
    query_input = {
        'filters': normalize_filters(filters or {}),
        'sort_key': sort_key,
        'limit': limit
    }
    
    query_json = json.dumps(query_input, sort_keys=True, separators=(',', ':'))
    query_hash = hashlib.sha256(query_json.encode('utf-8')).hexdigest()
    
    return query_hash[:12]  # Shorter hash for cache keys