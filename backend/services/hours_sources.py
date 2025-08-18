#!/usr/bin/env python3
"""Hours data sources.

This module provides functions for fetching hours data from external sources
like Google Places API and ORB certification data.
"""

import json
import logging
import os
import re
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)


def fetch_google_hours(place_id: str) -> Optional[Dict[str, Any]]:
    """Fetch hours data from Google Places API.
    
    Args:
        place_id: Google Places place_id
        
    Returns:
        Hours data from Google Places API or None if failed
    """
    try:
        api_key = _get_google_api_key()
        if not api_key:
            logger.error("Google Places API key not configured")
            return None
        
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "opening_hours,utc_offset_minutes",
            "key": api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("status") != "OK":
            logger.error(f"Google Places API error: {data.get('status')}")
            return None
        
        place_details = data.get("result", {})
        opening_hours = place_details.get("opening_hours", {})
        
        if not opening_hours:
            logger.warning(f"No opening hours found for place_id: {place_id}")
            return None
        
        # Extract timezone offset
        utc_offset = place_details.get("utc_offset_minutes", 0)
        timezone = _get_timezone_from_offset(utc_offset)
        
        return {
            "periods": opening_hours.get("periods", []),
            "weekday_text": opening_hours.get("weekday_text", []),
            "timezone": timezone,
            "place_id": place_id
        }
        
    except requests.RequestException as e:
        logger.exception("Error fetching Google Places data", error=str(e))
        return None
    except Exception as e:
        logger.exception("Unexpected error fetching Google hours", error=str(e))
        return None


def fetch_orb_hours(cert_url: str) -> Optional[str]:
    """Fetch hours data from ORB certification page.
    
    Args:
        cert_url: ORB certification URL
        
    Returns:
        Hours text from ORB or None if failed
    """
    try:
        # Add headers to mimic a real browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        
        response = requests.get(cert_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Look for hours information in the HTML
        html_content = response.text
        
        # Common patterns for hours in ORB pages
        hours_patterns = [
            r'<strong>Hours:</strong>\s*([^<]+)',
            r'<b>Hours:</b>\s*([^<]+)',
            r'Hours:\s*([^<]+)',
            r'<td[^>]*>Hours:</td>\s*<td[^>]*>([^<]+)</td>',
            r'<div[^>]*class="[^"]*hours[^"]*"[^>]*>([^<]+)</div>',
            r'<span[^>]*class="[^"]*hours[^"]*"[^>]*>([^<]+)</span>'
        ]
        
        for pattern in hours_patterns:
            match = re.search(pattern, html_content, re.IGNORECASE)
            if match:
                hours_text = match.group(1).strip()
                if hours_text and len(hours_text) > 5:  # Basic validation
                    logger.info(f"Found hours in ORB page: {hours_text[:50]}...")
                    return hours_text
        
        # If no specific hours pattern found, look for general business hours
        general_patterns = [
            r'(\w{3}-\w{3}:\s*\d{1,2}[AP]M-\d{1,2}[AP]M)',
            r'(\w{3}:\s*\d{1,2}[AP]M-\d{1,2}[AP]M)',
            r'(Daily:\s*\d{1,2}[AP]M-\d{1,2}[AP]M)',
            r'(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)'
        ]
        
        for pattern in general_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            if matches:
                hours_text = ", ".join(matches)
                logger.info(f"Found general hours pattern: {hours_text}")
                return hours_text
        
        logger.warning(f"No hours found in ORB page: {cert_url}")
        return None
        
    except requests.RequestException as e:
        logger.exception("Error fetching ORB data", error=str(e))
        return None
    except Exception as e:
        logger.exception("Unexpected error fetching ORB hours", error=str(e))
        return None


def _get_google_api_key() -> Optional[str]:
    """Get Google Places API key from environment."""
    return os.environ.get("GOOGLE_API_KEY")


def _get_timezone_from_offset(utc_offset_minutes: int) -> str:
    """Convert UTC offset to timezone name.
    
    Args:
        utc_offset_minutes: UTC offset in minutes
        
    Returns:
        Timezone name
    """
    # Common US timezone offsets
    offset_mapping = {
        -300: "America/New_York",    # EST (UTC-5)
        -240: "America/New_York",    # EDT (UTC-4)
        -360: "America/Chicago",     # CST (UTC-6)
        -300: "America/Chicago",     # CDT (UTC-5)
        -420: "America/Denver",      # MST (UTC-7)
        -360: "America/Denver",      # MDT (UTC-6)
        -480: "America/Los_Angeles", # PST (UTC-8)
        -420: "America/Los_Angeles", # PDT (UTC-7)
    }
    
    return offset_mapping.get(utc_offset_minutes, "America/New_York")
