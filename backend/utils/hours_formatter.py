from typing import Any, Dict, List, Optional
import datetime
import pytz

from backend.utils.logging_config import get_logger
            




"""Unified hours formatting utilities.

This module provides a centralized location for all hours formatting functions
that were previously duplicated across multiple files in the codebase.
"""

logger = get_logger(__name__)


class HoursFormatter:
    """Unified hours formatting class that consolidates all hours formatting logic."""
    
    # Day name mappings for consistent formatting
    DAY_MAPPING = {
        "Monday": "Mon",
        "Tuesday": "Tue", 
        "Wednesday": "Wed",
        "Thursday": "Thu",
        "Friday": "Fri",
        "Saturday": "Sat",
        "Sunday": "Sun",
    }
    
    SHORT_DAY_NAMES = {
        "mon": "Monday",
        "tue": "Tuesday", 
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }
    
    DAY_NAMES = {
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday", 
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }

    @staticmethod
    def from_google_places(opening_hours: Dict[str, Any]) -> str:
        """Convert Google Places API format to text format.
        
        Args:
            opening_hours: Google Places API opening_hours object
            
        Returns:
            Formatted hours string (e.g., "Mon 11:00 AM – 10:00 PM, Tue 11:00 AM – 10:00 PM")
        """
        try:
            if not opening_hours or "weekday_text" not in opening_hours:
                return ""

            # Google Places API provides weekday_text as a list of formatted strings
            # e.g., ["Monday: 11:00 AM – 10:00 PM", "Tuesday: 11:00 AM – 10:00 PM", ...]
            weekday_text = opening_hours["weekday_text"]

            # Convert to our format: "Mon 11:00 AM – 10:00 PM, Tue 11:00 AM – 10:00 PM, ..."
            formatted_hours = []
            for day_text in weekday_text:
                # Parse "Monday: 11:00 AM – 10:00 PM"
                if ": " in day_text:
                    day, hours = day_text.split(": ", 1)
                    short_day = HoursFormatter.DAY_MAPPING.get(day, day[:3])
                    formatted_hours.append(f"{short_day} {hours}")

            return ", ".join(formatted_hours)
            
        except Exception as e:
            logger.exception("Error formatting hours from Google Places API", error=str(e))
            return ""

    @staticmethod
    def for_ui(hours_json: Dict[str, Any], format_type: str = "dropdown") -> Any:
        """Format hours for UI display.
        
        Args:
            hours_json: Normalized hours data
            format_type: 'dropdown', 'compact', 'detailed', 'today'
            
        Returns:
            Formatted hours data for UI
        """
        try:
            if format_type == "dropdown":
                return HoursFormatter._format_for_dropdown(hours_json)
            elif format_type == "compact":
                return HoursFormatter._format_compact(hours_json)
            elif format_type == "detailed":
                return HoursFormatter._format_detailed(hours_json)
            elif format_type == "today":
                return HoursFormatter._format_today(hours_json)
            else:
                return HoursFormatter._format_compact(hours_json)
                
        except Exception as e:
            logger.exception("Error formatting hours for UI", error=str(e))
            return []

    @staticmethod
    def for_display(hours_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Format hours document for frontend display.
        
        Args:
            hours_doc: Hours document from database
            
        Returns:
            Formatted hours data for frontend display
        """
        try:
            if not hours_doc:
                return HoursFormatter._get_empty_hours_response()
                
            # Extract basic info
            hours_data = hours_doc.get("hours", {})
            timezone = hours_doc.get("timezone", "America/New_York")
            last_updated = hours_doc.get("last_updated")
            
            # Calculate current status
            is_open_now_status = HoursFormatter._is_open_now(hours_doc)
            status = "open" if is_open_now_status else "closed"
            
            # Format weekly hours
            formatted_hours = HoursFormatter._format_weekly_hours(hours_data)
            
            # Get today's hours
            today_hours = HoursFormatter._get_today_hours(hours_data, timezone)
            
            # Create response
            response = {
                "status": status,
                "is_open": is_open_now_status,
                "message": HoursFormatter._get_status_message(status, today_hours),
                "today_hours": today_hours,
                "formatted_hours": formatted_hours,
                "timezone": timezone,
                "last_updated": last_updated
            }
            
            return response
            
        except Exception as e:
            logger.exception("Error formatting hours for display", error=str(e))
            return HoursFormatter._get_empty_hours_response()

    @staticmethod
    def to_text(opening_hours: Dict[str, Any]) -> str:
        """Format opening hours into human-readable text.
        
        Args:
            opening_hours: Google Places API opening_hours object
            
        Returns:
            Formatted text with each day on a new line
        """
        try:
            if not opening_hours or "weekday_text" not in opening_hours:
                return ""

            return "\n".join(opening_hours["weekday_text"])
            
        except Exception as e:
            logger.exception("Error formatting hours to text", error=str(e))
            return ""

    # Private helper methods
    
    @staticmethod
    def _format_for_dropdown(hours_json: Dict[str, Any]) -> List[Dict[str, str]]:
        """Format hours for dropdown display."""
        result = []

        if "hours" not in hours_json:
            return result

        for day_abbr, day_name in HoursFormatter.SHORT_DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                hours_str = f"{day_hours['open']} - {day_hours['close']}"
            else:
                hours_str = "Closed"

            result.append({
                "day": day_name,
                "hours": hours_str,
                "is_open": day_hours.get("is_open", False),
            })

        return result

    @staticmethod
    def _format_compact(hours_json: Dict[str, Any]) -> str:
        """Format hours in compact string format."""
        if "hours" not in hours_json:
            return "Hours not available"

        parts = []
        for day_abbr, day_name in HoursFormatter.SHORT_DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                hours_str = f"{day_hours['open']}-{day_hours['close']}"
            else:
                hours_str = "Closed"

            parts.append(f"{day_name} {hours_str}")

        return ", ".join(parts)

    @staticmethod
    def _format_detailed(hours_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format hours in detailed format with additional info."""
        result = []

        if "hours" not in hours_json:
            return result

        for day_abbr, day_name in HoursFormatter.DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            result.append({
                "day": day_name,
                "day_abbr": day_abbr,
                "open": day_hours.get("open", "Closed"),
                "close": day_hours.get("close", ""),
                "is_open": day_hours.get("is_open", False),
                "hours_display": (
                    f"{day_hours.get('open', 'Closed')} - {day_hours.get('close', '')}"
                    if day_hours.get("is_open", False)
                    else "Closed"
                ),
            })

        return result

    @staticmethod
    def _format_today(hours_json: Dict[str, Any]) -> Dict[str, Any]:
        """Format today's hours specifically."""
        try:
            today = datetime.datetime.now().strftime("%A").lower()
            day_abbr = HoursFormatter._get_day_abbreviation(today)
            
            if "hours" not in hours_json:
                return {"is_open": False, "hours": "Hours not available"}

            day_hours = hours_json["hours"].get(day_abbr, {})
            
            if day_hours.get("is_open", False):
                return {
                    "is_open": True,
                    "hours": f"{day_hours['open']} - {day_hours['close']}",
                    "open": day_hours['open'],
                    "close": day_hours['close']
                }
            else:
                return {"is_open": False, "hours": "Closed"}
                
        except Exception as e:
            logger.exception("Error formatting today's hours", error=str(e))
            return {"is_open": False, "hours": "Hours not available"}

    @staticmethod
    def _format_weekly_hours(hours_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format weekly hours for display."""
        result = []
        
        for day_abbr, day_name in HoursFormatter.SHORT_DAY_NAMES.items():
            day_hours = hours_data.get(day_abbr, {})
            
            result.append({
                "day": day_name,
                "day_abbr": day_abbr,
                "open": day_hours.get("open", "Closed"),
                "close": day_hours.get("close", ""),
                "is_open": day_hours.get("is_open", False),
            })
            
        return result

    @staticmethod
    def _get_today_hours(hours_data: Dict[str, Any], timezone: str) -> Optional[Dict[str, Any]]:
        """Get today's hours information."""
        try:
            tz = pytz.timezone(timezone)
            now = datetime.datetime.now(tz)
            current_day = now.strftime("%A").lower()
            day_abbr = HoursFormatter._get_day_abbreviation(current_day)
            
            today_hours = hours_data.get(day_abbr, {})
            
            if today_hours.get("is_open", False):
                return {
                    "day": current_day.title(),
                    "open": today_hours.get("open", ""),
                    "close": today_hours.get("close", ""),
                    "is_open": True
                }
            else:
                return {
                    "day": current_day.title(),
                    "open": "",
                    "close": "",
                    "is_open": False
                }
                
        except Exception as e:
            logger.exception("Error getting today's hours", error=str(e))
            return None

    @staticmethod
    def _is_open_now(hours_doc: Dict[str, Any]) -> bool:
        """Check if restaurant is currently open."""
        try:
            if not hours_doc:
                return False
                
            hours_data = hours_doc.get("hours", {})
            timezone = hours_doc.get("timezone", "America/New_York")
            
            # Get current time in restaurant's timezone
            tz = pytz.timezone(timezone)
            now = datetime.datetime.now(tz)
            current_day = now.strftime("%A").lower()
            current_time = now.time()
            
            # Get today's hours
            day_abbr = HoursFormatter._get_day_abbreviation(current_day)
            today_hours = hours_data.get(day_abbr, {})
            
            if not today_hours.get("is_open", False):
                return False
                
            # Parse open and close times
            open_time = HoursFormatter._parse_time_string(today_hours.get("open", ""))
            close_time = HoursFormatter._parse_time_string(today_hours.get("close", ""))
            
            if not open_time or not close_time:
                return False
                
            # Handle overnight hours (e.g., 11PM - 2AM)
            if close_time < open_time:
                return current_time >= open_time or current_time <= close_time
            return open_time <= current_time <= close_time
            
        except Exception as e:
            logger.exception("Error checking if open now", error=str(e))
            return False

    @staticmethod
    def _get_status_message(status: str, today_hours: Optional[Dict[str, Any]]) -> str:
        """Get status message for display."""
        if status == "open":
            return "Open now"
        elif today_hours and today_hours.get("is_open"):
            return f"Opens {today_hours.get('open', '')}"
        else:
            return "Closed"

    @staticmethod
    def _get_empty_hours_response() -> Dict[str, Any]:
        """Get empty hours response."""
        return {
            "status": "unknown",
            "is_open": False,
            "message": "Hours not available",
            "today_hours": None,
            "formatted_hours": [],
            "timezone": "America/New_York",
            "last_updated": None
        }

    @staticmethod
    def _get_day_abbreviation(day_name: str) -> str:
        """Convert full day name to abbreviation."""
        day_mapping = {
            "monday": "mon",
            "tuesday": "tue", 
            "wednesday": "wed",
            "thursday": "thu",
            "friday": "fri",
            "saturday": "sat",
            "sunday": "sun",
        }
        return day_mapping.get(day_name.lower(), day_name[:3].lower())

    @staticmethod
    def _parse_time_string(time_str: str) -> Optional[Any]:
        """Parse time string to time object."""
        try:
            if not time_str:
                return None
                
            # Handle various time formats
            time_str = time_str.strip().upper()
            
            # Remove AM/PM for parsing
            if "AM" in time_str or "PM" in time_str:
                time_obj = datetime.datetime.strptime(time_str, "%I:%M %p").time()
            else:
                time_obj = datetime.datetime.strptime(time_str, "%H:%M").time()
                
            return time_obj
            
        except Exception as e:
            logger.exception("Error parsing time string", time_str=time_str, error=str(e))
            return None
