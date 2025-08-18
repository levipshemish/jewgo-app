import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from utils.logging_config import get_logger
from utils.data_validator import DataValidator

"""Hours normalization utilities.

This module provides functions for normalizing hours data from different sources
(Google Places API, ORB, manual entry) into a standardized format.
"""

logger = get_logger(__name__)


def normalize_from_google(google_hours: Dict[str, Any], timezone: str) -> Dict[str, Any]:
    """Normalize hours data from Google Places API.
    
    Args:
        google_hours: Raw hours data from Google Places API
        timezone: Restaurant timezone
        
    Returns:
        Normalized hours document
    """
    try:
        normalized = {
            "hours": {},
            "timezone": timezone,
            "last_updated": datetime.utcnow().isoformat(),
            "source": "google_places"
        }
        
        # Handle periods format
        if "periods" in google_hours:
            for period in google_hours["periods"]:
                open_info = period.get("open", {})
                close_info = period.get("close", {})
                
                day_num = open_info.get("day", 0)
                day_abbr = _get_day_abbr_from_number(day_num)
                
                open_time = _format_google_time(open_info.get("time", ""))
                close_time = _format_google_time(close_info.get("time", ""))
                
                if day_abbr and open_time and close_time:
                    normalized["hours"][day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True
                    }
        
        # Handle weekday_text format
        elif "weekday_text" in google_hours:
            for day_text in google_hours["weekday_text"]:
                day_abbr, open_time, close_time = _parse_weekday_text(day_text)
                if day_abbr and open_time and close_time:
                    normalized["hours"][day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True
                    }
        
        # Fill in missing days as closed
        _fill_missing_days(normalized["hours"])
        
        return normalized
        
    except Exception as e:
        logger.exception("Error normalizing Google hours", error=str(e))
        return _get_empty_hours_doc(timezone, "google_places")


def normalize_from_orb(orb_hours: str, timezone: str) -> Dict[str, Any]:
    """Normalize hours data from ORB text.
    
    Args:
        orb_hours: Hours text from ORB
        timezone: Restaurant timezone
        
    Returns:
        Normalized hours document
    """
    try:
        normalized = {
            "hours": {},
            "timezone": timezone,
            "last_updated": datetime.utcnow().isoformat(),
            "source": "orb"
        }
        
        # Parse ORB hours text
        parsed_hours = _parse_orb_hours_text(orb_hours)
        
        for day_abbr, hours_info in parsed_hours.items():
            if hours_info.get("is_open", False):
                normalized["hours"][day_abbr] = {
                    "open": hours_info["open"],
                    "close": hours_info["close"],
                    "is_open": True
                }
            else:
                normalized["hours"][day_abbr] = {
                    "open": "",
                    "close": "",
                    "is_open": False
                }
        
        # Fill in missing days as closed
        _fill_missing_days(normalized["hours"])
        
        return normalized
        
    except Exception as e:
        logger.exception("Error normalizing ORB hours", error=str(e))
        return _get_empty_hours_doc(timezone, "orb")


def normalize_from_manual(hours_data: Dict[str, Any], timezone: str, updated_by: str) -> Dict[str, Any]:
    """Normalize hours data from manual entry.
    
    Args:
        hours_data: Manual hours data
        timezone: Restaurant timezone
        updated_by: User who updated the hours
        
    Returns:
        Normalized hours document
    """
    try:
        normalized = {
            "hours": {},
            "timezone": timezone,
            "last_updated": datetime.utcnow().isoformat(),
            "source": "manual",
            "updated_by": updated_by
        }
        
        # Process each day
        for day_abbr, day_hours in hours_data.items():
            if isinstance(day_hours, dict) and day_hours.get("is_open", False):
                normalized["hours"][day_abbr] = {
                    "open": day_hours.get("open", ""),
                    "close": day_hours.get("close", ""),
                    "is_open": True
                }
            else:
                normalized["hours"][day_abbr] = {
                    "open": "",
                    "close": "",
                    "is_open": False
                }
        
        # Fill in missing days as closed
        _fill_missing_days(normalized["hours"])
        
        return normalized
        
    except Exception as e:
        logger.exception("Error normalizing manual hours", error=str(e))
        return _get_empty_hours_doc(timezone, "manual")


def merge_hours(existing: Dict[str, Any], new: Dict[str, Any], strategy: str) -> Dict[str, Any]:
    """Merge existing and new hours data.
    
    Args:
        existing: Existing hours document
        new: New hours document
        strategy: Merge strategy ("prefer-incoming", "prefer-existing", "replace")
        
    Returns:
        Merged hours document
    """
    try:
        if strategy == "replace":
            return new.copy()
        
        merged = existing.copy()
        
        # Merge hours data
        existing_hours = existing.get("hours", {})
        new_hours = new.get("hours", {})
        
        for day_abbr in new_hours:
            if strategy == "prefer-incoming" or day_abbr not in existing_hours:
                merged["hours"][day_abbr] = new_hours[day_abbr]
        
        # Update metadata
        merged["last_updated"] = datetime.utcnow().isoformat()
        merged["source"] = f"merged_{new.get('source', 'unknown')}"
        
        return merged
        
    except Exception as e:
        logger.exception("Error merging hours", error=str(e))
        return existing


def validate_hours(hours_doc: Dict[str, Any]) -> None:
    """Validate hours document structure using unified data validator.
    
    Args:
        hours_doc: Hours document to validate
        
    Raises:
        ValueError: If hours document is invalid
    """
    DataValidator.validate_hours_format(hours_doc)


def _get_empty_hours_doc(timezone: str, source: str) -> Dict[str, Any]:
    """Get empty hours document structure."""
    return {
        "hours": {
            "mon": {"open": "", "close": "", "is_open": False},
            "tue": {"open": "", "close": "", "is_open": False},
            "wed": {"open": "", "close": "", "is_open": False},
            "thu": {"open": "", "close": "", "is_open": False},
            "fri": {"open": "", "close": "", "is_open": False},
            "sat": {"open": "", "close": "", "is_open": False},
            "sun": {"open": "", "close": "", "is_open": False}
        },
        "timezone": timezone,
        "last_updated": datetime.utcnow().isoformat(),
        "source": source
    }


def _get_day_abbr_from_number(day_num: int) -> Optional[str]:
    """Convert day number to abbreviation."""
    day_mapping = {
        0: "mon",  # Monday
        1: "tue",  # Tuesday
        2: "wed",  # Wednesday
        3: "thu",  # Thursday
        4: "fri",  # Friday
        5: "sat",  # Saturday
        6: "sun"   # Sunday
    }
    return day_mapping.get(day_num)


def _format_google_time(time_str: str) -> Optional[str]:
    """Format Google time string to display format."""
    if not time_str or len(time_str) != 4:
        return None
    
    try:
        hour = int(time_str[:2])
        minute = int(time_str[2:])
        
        if hour == 0:
            return f"12:{minute:02d} AM"
        elif hour < 12:
            return f"{hour}:{minute:02d} AM"
        elif hour == 12:
            return f"12:{minute:02d} PM"
        else:
            return f"{hour - 12}:{minute:02d} PM"
    except ValueError:
        return None


def _parse_weekday_text(day_text: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Parse weekday text like 'Monday: 11:00 AM – 10:00 PM'."""
    try:
        # Extract day name
        day_match = re.match(r'^(\w+):', day_text)
        if not day_match:
            return None, None, None
        
        day_name = day_match.group(1).lower()
        day_abbr = _get_day_abbr_from_name(day_name)
        
        # Extract times
        time_match = re.search(r'(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)', day_text)
        if not time_match:
            return day_abbr, None, None
        
        open_time = time_match.group(1).strip()
        close_time = time_match.group(2).strip()
        
        return day_abbr, open_time, close_time
        
    except Exception as e:
        logger.warning(f"Error parsing weekday text: {day_text}", error=str(e))
        return None, None, None


def _get_day_abbr_from_name(day_name: str) -> Optional[str]:
    """Convert day name to abbreviation."""
    day_mapping = {
        "monday": "mon",
        "tuesday": "tue",
        "wednesday": "wed",
        "thursday": "thu",
        "friday": "fri",
        "saturday": "sat",
        "sunday": "sun"
    }
    return day_mapping.get(day_name.lower())


def _parse_orb_hours_text(orb_text: str) -> Dict[str, Dict[str, Any]]:
    """Parse ORB hours text into structured format."""
    parsed = {}
    
    # Common patterns
    patterns = [
        # Mon-Fri: 11AM-9PM, Sat: 12PM-10PM, Sun: Closed
        r'(\w{3})-(\w{3}):\s*(\d{1,2}[AP]M)-(\d{1,2}[AP]M)',
        # Mon: 11AM-9PM, Tue: 11AM-9PM
        r'(\w{3}):\s*(\d{1,2}[AP]M)-(\d{1,2}[AP]M)',
        # Daily: 11AM-11PM
        r'Daily:\s*(\d{1,2}[AP]M)-(\d{1,2}[AP]M)',
        # Closed
        r'(\w{3}):\s*Closed'
    ]
    
    # Parse range patterns (e.g., Mon-Fri: 11AM-9PM)
    range_match = re.search(r'(\w{3})-(\w{3}):\s*(\d{1,2}[AP]M)-(\d{1,2}[AP]M)', orb_text)
    if range_match:
        start_day = range_match.group(1).lower()
        end_day = range_match.group(2).lower()
        open_time = range_match.group(3)
        close_time = range_match.group(4)
        
        days = _get_days_in_range(start_day, end_day)
        for day in days:
            parsed[day] = {
                "open": open_time,
                "close": close_time,
                "is_open": True
            }
    
    # Parse individual day patterns
    for match in re.finditer(r'(\w{3}):\s*(\d{1,2}[AP]M)-(\d{1,2}[AP]M)', orb_text):
        day = match.group(1).lower()
        open_time = match.group(2)
        close_time = match.group(3)
        
        parsed[day] = {
            "open": open_time,
            "close": close_time,
            "is_open": True
        }
    
    # Parse closed days
    for match in re.finditer(r'(\w{3}):\s*Closed', orb_text):
        day = match.group(1).lower()
        parsed[day] = {
            "open": "",
            "close": "",
            "is_open": False
        }
    
    return parsed


def _get_days_in_range(start_day: str, end_day: str) -> List[str]:
    """Get list of days between start and end day."""
    days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    
    try:
        start_idx = days.index(start_day)
        end_idx = days.index(end_day)
        
        if start_idx <= end_idx:
            return days[start_idx:end_idx + 1]
        else:
            # Handle wrap-around (e.g., Fri-Mon)
            return days[start_idx:] + days[:end_idx + 1]
    except ValueError:
        return [start_day]


def _fill_missing_days(hours: Dict[str, Any]) -> None:
    """Fill in missing days as closed."""
    all_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    
    for day in all_days:
        if day not in hours:
            hours[day] = {
                "open": "",
                "close": "",
                "is_open": False
            }
