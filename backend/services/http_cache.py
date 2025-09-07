"""
HTTP caching utilities for stable ETag generation.

This module provides utilities for generating stable ETags for HTTP responses,
enabling efficient client-side caching and conditional requests.
"""

import hashlib
import json
from typing import Dict, Any
from email.utils import formatdate


def make_stable_etag(payload: Dict[str, Any]) -> str:
    """
    Generate a stable ETag from a dictionary payload.

    Creates a deterministic ETag by:
    1. Sorting the dictionary keys for consistent ordering
    2. Converting to JSON with sorted keys
    3. Computing SHA-256 hash
    4. Returning as weak ETag format

    Args:
        payload: Dictionary to generate ETag from

    Returns:
        Weak ETag string in format W/"<digest>"

    Example:
        >>> payload = {"id": 1, "name": "test", "data": [1, 2, 3]}
        >>> etag = make_stable_etag(payload)
        >>> etag.startswith('W/"')
        True
    """

    # Sort keys recursively to ensure consistent ordering
    def sort_dict_keys(obj):
        if isinstance(obj, dict):
            return {k: sort_dict_keys(v) for k, v in sorted(obj.items())}
        elif isinstance(obj, list):
            return [sort_dict_keys(item) for item in obj]
        else:
            return obj

    # Sort the payload for deterministic output
    sorted_payload = sort_dict_keys(payload)

    # Convert to JSON with sorted keys
    json_str = json.dumps(sorted_payload, sort_keys=True, separators=(",", ":"))

    # Compute SHA-256 hash
    digest = hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    # Return as weak ETag (RFC 7232)
    return f'W/"{digest}"'


def http_date(timestamp: float) -> str:
    """
    Generate an RFC 7231 compliant HTTP Date header.

    Args:
        timestamp: Unix timestamp (seconds since epoch)

    Returns:
        HTTP Date string in RFC 7231 format (e.g., "Wed, 21 Oct 2015 07:28:00 GMT")

    Example:
        >>> http_date(1445412480.0)
        'Wed, 21 Oct 2015 07:28:00 GMT'
    """
    return formatdate(timestamp, usegmt=True)
