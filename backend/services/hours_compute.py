import logging
from datetime import datetime, time
from typing import Any, Dict, List, Optional
import pytz
from utils.hours_formatter import HoursFormatter

"""Hours computation utilities.
This module provides functions for computing restaurant hours status,
formatting hours for display, and calculating open/closed status.
"""
logger = logging.getLogger(__name__)


def format_hours_for_display(hours_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Format hours document for frontend display.
    Args:
        hours_doc: Hours document from database
    Returns:
        Formatted hours data for frontend
    """
    return HoursFormatter.for_display(hours_doc)


def is_open_now(hours_doc: Dict[str, Any]) -> bool:
    """Check if restaurant is currently open.
    Args:
        hours_doc: Hours document from database
    Returns:
        True if currently open, False otherwise
    """
    try:
        if not hours_doc:
            return False
        hours_data = hours_doc.get("hours", {})
        timezone = hours_doc.get("timezone", "America/New_York")
        # Get current time in restaurant's timezone
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        current_day = now.strftime("%A").lower()
        current_time = now.time()
        # Get today's hours
        day_abbr = _get_day_abbreviation(current_day)
        today_hours = hours_data.get(day_abbr, {})
        if not today_hours.get("is_open", False):
            return False
        # Parse open and close times
        open_time = _parse_time_string(today_hours.get("open", ""))
        close_time = _parse_time_string(today_hours.get("close", ""))
        if not open_time or not close_time:
            return False
        # Handle overnight hours (e.g., 11PM - 2AM)
        if close_time < open_time:
            return current_time >= open_time or current_time <= close_time
        else:
            return open_time <= current_time <= close_time
    except Exception as e:
        logger.exception("Error checking if restaurant is open: %s", str(e))
        return False


def _get_empty_hours_response() -> Dict[str, Any]:
    """Get empty hours response structure."""
    return {
        "status": "unknown",
        "is_open": False,
        "message": "Hours not available",
        "today_hours": {},
        "formatted_hours": [],
        "timezone": "America/New_York",
        "last_updated": None,
    }


def _format_weekly_hours(hours_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Format weekly hours for display.
    Args:
        hours_data: Hours data from database
    Returns:
        List of formatted day hours
    """
    day_names = {
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }
    formatted = []
    for day_abbr, day_name in day_names.items():
        day_hours = hours_data.get(day_abbr, {})
        if day_hours.get("is_open", False):
            open_time = day_hours.get("open", "")
            close_time = day_hours.get("close", "")
            hours_text = f"{open_time} - {close_time}"
        else:
            hours_text = "Closed"
        formatted.append(
            {
                "day": day_name,
                "hours": hours_text,
                "is_open": day_hours.get("is_open", False),
            }
        )
    return formatted


def _get_today_hours(hours_data: Dict[str, Any], timezone: str) -> Dict[str, Any]:
    """Get today's hours.
    Args:
        hours_data: Hours data from database
        timezone: Restaurant timezone
    Returns:
        Today's hours data
    """
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        current_day = now.strftime("%A").lower()
        day_abbr = _get_day_abbreviation(current_day)
        return hours_data.get(day_abbr, {})
    except Exception as e:
        logger.exception("Error getting today's hours: %s", str(e))
        return {}


def _get_status_message(status: str, today_hours: Dict[str, Any]) -> str:
    """Get status message for display.
    Args:
        status: Current status
        today_hours: Today's hours data
    Returns:
        Status message
    """
    if status == "open":
        close_time = today_hours.get("close", "")
        if close_time:
            return f"Open now - closes {close_time}"
        return "Open now"
    elif status == "closed":
        open_time = today_hours.get("open", "")
        if open_time:
            return f"Closed - opens {open_time}"
        return "Closed"
    else:
        return "Hours not available"


def _get_day_abbreviation(day_name: str) -> str:
    """Convert day name to abbreviation.
    Args:
        day_name: Full day name (e.g., "monday")
    Returns:
        Day abbreviation (e.g., "mon")
    """
    day_mapping = {
        "monday": "mon",
        "tuesday": "tue",
        "wednesday": "wed",
        "thursday": "thu",
        "friday": "fri",
        "saturday": "sat",
        "sunday": "sun",
    }
    return day_mapping.get(day_name.lower(), "mon")


def _parse_time_string(time_str: str) -> Optional[time]:
    """Parse time string to time object.
    Args:
        time_str: Time string (e.g., "11:00 AM", "23:00")
    Returns:
        Time object or None if parsing fails
    """
    if not time_str:
        return None
    try:
        # Handle 12-hour format
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            return datetime.strptime(time_str, "%I:%M %p").time()
        # Handle 24-hour format
        else:
            return datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        logger.warning(f"Could not parse time string: {time_str}")
        return None
