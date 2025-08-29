import re
from datetime import datetime, time
from typing import Any

import pytz
from utils.logging_config import get_logger

from .hours_formatter import HoursFormatter

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Hours Management System for JewGo App.
====================================

This module provides comprehensive hours management functionality including:
- Normalization of hours from various sources (Google Places API, ORB, manual entry)
- Standardized JSON format for hours storage
- Helper functions for checking open/closed status
- Formatting functions for UI display

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


class HoursManager:
    """Comprehensive hours management system for restaurants."""

    # Standard day abbreviations
    DAYS = {
        "monday": "mon",
        "tuesday": "tue",
        "wednesday": "wed",
        "thursday": "thu",
        "friday": "fri",
        "saturday": "sat",
        "sunday": "sun",
    }

    # Day names for display
    DAY_NAMES = {
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }

    # Short day names for compact display
    SHORT_DAY_NAMES = {
        "mon": "Mon",
        "tue": "Tue",
        "wed": "Wed",
        "thu": "Thu",
        "fri": "Fri",
        "sat": "Sat",
        "sun": "Sun",
    }

    def __init__(self, timezone: str = "America/New_York") -> None:
        """Initialize HoursManager with timezone.

        Args:
            timezone: Timezone string (default: America/New_York for Miami)

        """
        self.timezone = pytz.timezone(timezone)

    def normalize_hours(
        self,
        hours_data: Any,
        source: str = "unknown",
    ) -> dict[str, Any]:
        """Normalize hours data from various sources to standard JSON format.

        Args:
            hours_data: Raw hours data from various sources
            source: Source of the hours data ('google_places', 'orb', 'manual')

        Returns:
            Normalized hours in standard JSON format

        """
        try:
            if source == "google_places":
                return self._normalize_google_places_hours(hours_data)
            if source == "orb":
                return self._normalize_orb_hours(hours_data)
            if source == "manual":
                return self._normalize_manual_hours(hours_data)
            return self._normalize_unknown_hours(hours_data)
        except Exception as e:
            logger.exception(
                "Error normalizing hours from source", source=source, error=str(e)
            )
            return self._get_empty_hours()

    def _normalize_google_places_hours(
        self,
        hours_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Normalize Google Places API hours format.

        Google Places format:
        {
            "open_now": true,
            "periods": [
                {
                    "open": {"day": 0, "time": "1100"},
                    "close": {"day": 0, "time": "2200"}
                }
            ],
            "weekday_text": [
                "Monday: 11:00 AM – 10:00 PM",
                "Tuesday: 11:00 AM – 10:00 PM",
                ...
            ]
        }
        """
        if not hours_data:
            return self._get_empty_hours()

        normalized = self._get_empty_hours()

        # Parse periods if available
        if "periods" in hours_data:
            for period in hours_data["periods"]:
                if "open" in period and "close" in period:
                    day_num = period["open"]["day"]
                    open_time = period["open"]["time"]
                    close_time = period["close"]["time"]

                    day_name = self._get_day_name_from_number(day_num)
                    if day_name:
                        normalized["hours"][day_name] = {
                            "open": self._format_time_from_google(open_time),
                            "close": self._format_time_from_google(close_time),
                            "is_open": True,
                        }

        # Parse weekday_text if periods are not available
        elif "weekday_text" in hours_data:
            for day_text in hours_data["weekday_text"]:
                day_name, hours_str = self._parse_weekday_text(day_text)
                if day_name and hours_str:
                    open_time, close_time = self._parse_hours_string(hours_str)
                    if open_time and close_time:
                        normalized["hours"][day_name] = {
                            "open": open_time,
                            "close": close_time,
                            "is_open": True,
                        }

        # Set open_now status
        normalized["open_now"] = hours_data.get("open_now", False)

        return normalized

    def _normalize_orb_hours(self, hours_text: str) -> dict[str, Any]:
        """Normalize ORB hours text format.

        ORB format examples:
        - "Mon-Fri: 11AM-9PM, Sat: 12PM-10PM, Sun: Closed"
        - "Daily: 11AM-11PM"
        - "Mon-Sat: 6AM-8PM, Sun: 7AM-6PM"
        """
        if not hours_text:
            return self._get_empty_hours()

        normalized = self._get_empty_hours()

        # Parse common ORB patterns
        patterns = [
            # "Mon-Fri: 11AM-9PM, Sat: 12PM-10PM, Sun: Closed"
            r"(\w{3})-(\w{3}):\s*([^,]+)",
            # "Daily: 11AM-11PM"
            r"Daily:\s*([^,]+)",
            # "Mon-Sat: 6AM-8PM, Sun: 7AM-6PM"
            r"(\w{3})-(\w{3}):\s*([^,]+),\s*(\w{3}):\s*([^,]+)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, hours_text, re.IGNORECASE)
            for match in matches:
                if len(match) == 3:  # Mon-Fri: 11AM-9PM
                    start_day, end_day, hours = match
                    self._apply_hours_range(normalized, start_day, end_day, hours)
                elif len(match) == 1:  # Daily: 11AM-11PM
                    hours = match[0]
                    self._apply_hours_to_all_days(normalized, hours)
                elif len(match) == 5:  # Mon-Sat: 6AM-8PM, Sun: 7AM-6PM
                    start_day, end_day, hours1, day2, hours2 = match
                    self._apply_hours_range(normalized, start_day, end_day, hours1)
                    self._apply_hours_to_day(normalized, day2, hours2)

        return normalized

    def _normalize_manual_hours(self, hours_data: Any) -> dict[str, Any]:
        """Normalize manually entered hours data."""
        if isinstance(hours_data, str):
            return self._normalize_orb_hours(hours_data)
        if isinstance(hours_data, dict):
            return self._normalize_unknown_hours(hours_data)
        return self._get_empty_hours()

    def _normalize_unknown_hours(self, hours_data: Any) -> dict[str, Any]:
        """Attempt to normalize unknown hours format."""
        if isinstance(hours_data, dict):
            # Check if it's already in our format
            if "hours" in hours_data and isinstance(hours_data["hours"], dict):
                return hours_data

            # Try to parse as Google Places format
            if "periods" in hours_data or "weekday_text" in hours_data:
                return self._normalize_google_places_hours(hours_data)

        elif isinstance(hours_data, str):
            return self._normalize_orb_hours(hours_data)

        return self._get_empty_hours()

    def get_today_hours(self, hours_json: dict[str, Any]) -> dict[str, Any] | None:
        """Get today's hours from normalized hours data.

        Args:
            hours_json: Normalized hours data

        Returns:
            Today's hours or None if not available

        """
        try:
            today = datetime.now(self.timezone).strftime("%A").lower()
            day_abbr = self.DAYS.get(today)

            if day_abbr and "hours" in hours_json:
                return hours_json["hours"].get(day_abbr)

            return None
        except Exception as e:
            logger.exception("Error getting today's hours", error=str(e))
            return None

    def is_open_now(self, hours_json: dict[str, Any]) -> bool:
        """Check if restaurant is currently open.

        Args:
            hours_json: Normalized hours data

        Returns:
            True if currently open, False otherwise

        """
        try:
            today_hours = self.get_today_hours(hours_json)
            if not today_hours or not today_hours.get("is_open", False):
                return False

            now = datetime.now(self.timezone)
            current_time = now.time()

            open_time = self._parse_time_string(today_hours["open"])
            close_time = self._parse_time_string(today_hours["close"])

            if not open_time or not close_time:
                return False

            # Handle overnight hours (e.g., 11PM - 2AM)
            if close_time < open_time:
                return current_time >= open_time or current_time <= close_time
            return open_time <= current_time <= close_time

        except Exception as e:
            logger.exception("Error checking if open now", error=str(e))
            return False

    def get_formatted_hours_for_ui(
        self,
        hours_json: dict[str, Any],
        format_type: str = "dropdown",
    ) -> Any:
        """Get formatted hours for UI display.

        Args:
            hours_json: Normalized hours data
            format_type: 'dropdown', 'compact', 'detailed', 'today'

        Returns:
            Formatted hours data

        """
        return HoursFormatter.for_ui(hours_json, format_type)

    def _format_for_dropdown(self, hours_json: dict[str, Any]) -> list[dict[str, str]]:
        """Format hours for dropdown display."""
        from .unified_hours_formatter import UnifiedHoursFormatter

        return UnifiedHoursFormatter.format_for_dropdown(hours_json)

    def _format_compact(self, hours_json: dict[str, Any]) -> str:
        """Format hours in compact string format."""
        from .unified_hours_formatter import UnifiedHoursFormatter

        return UnifiedHoursFormatter.format_compact(hours_json)

    def _format_detailed(self, hours_json: dict[str, Any]) -> list[dict[str, Any]]:
        """Format hours in detailed format with additional info."""
        from .unified_hours_formatter import UnifiedHoursFormatter

        return UnifiedHoursFormatter.format_detailed(hours_json)

    def _format_today(self, hours_json: dict[str, Any]) -> dict[str, Any]:
        """Format today's hours with status."""
        today_hours = self.get_today_hours(hours_json)
        is_open = self.is_open_now(hours_json)

        if not today_hours:
            return {
                "status": "unknown",
                "message": "Hours not available",
                "is_open": False,
            }

        if not today_hours.get("is_open", False):
            return {
                "status": "closed",
                "message": "Closed today",
                "is_open": False,
            }

        if is_open:
            return {
                "status": "open",
                "message": f"Open now • Closes {today_hours['close']}",
                "is_open": True,
                "closing_time": today_hours["close"],
            }
        return {
            "status": "closed_today",
            "message": f"Opens {today_hours['open']}",
            "is_open": False,
            "opening_time": today_hours["open"],
        }

    # Helper methods for parsing and formatting

    def _get_empty_hours(self) -> dict[str, Any]:
        """Get empty hours structure."""
        return {
            "hours": {
                "mon": {"open": "", "close": "", "is_open": False},
                "tue": {"open": "", "close": "", "is_open": False},
                "wed": {"open": "", "close": "", "is_open": False},
                "thu": {"open": "", "close": "", "is_open": False},
                "fri": {"open": "", "close": "", "is_open": False},
                "sat": {"open": "", "close": "", "is_open": False},
                "sun": {"open": "", "close": "", "is_open": False},
            },
            "open_now": False,
            "timezone": str(self.timezone),
            "last_updated": datetime.now().isoformat(),
        }

    def _get_day_name_from_number(self, day_num: int) -> str | None:
        """Convert day number (0-6) to day abbreviation."""
        days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
        return days[day_num] if 0 <= day_num <= 6 else None

    def _format_time_from_google(self, time_str: str) -> str:
        """Format Google Places time string (e.g., '1100') to readable format."""
        if len(time_str) == 4:
            hour = int(time_str[:2])
            minute = int(time_str[2:])

            if hour == 0:
                hour = 12
                period = "AM"
            elif hour < 12:
                period = "AM"
            elif hour == 12:
                period = "PM"
            else:
                hour -= 12
                period = "PM"

            return f"{hour}:{minute:02d} {period}"

        return time_str

    def _parse_weekday_text(self, day_text: str) -> tuple[str | None, str | None]:
        """Parse weekday text like 'Monday: 11:00 AM – 10:00 PM'."""
        match = re.match(r"(\w+):\s*(.+)", day_text)
        if match:
            day_name = match.group(1).lower()
            hours_str = match.group(2).strip()
            day_abbr = self.DAYS.get(day_name)
            return day_abbr, hours_str
        return None, None

    def _parse_hours_string(self, hours_str: str) -> tuple[str | None, str | None]:
        """Parse hours string like '11:00 AM – 10:00 PM'."""
        # Handle various separators
        separators = ["–", "-", "to", "until"]
        for sep in separators:
            if sep in hours_str:
                parts = hours_str.split(sep, 1)
                if len(parts) == 2:
                    open_time = parts[0].strip()
                    close_time = parts[1].strip()
                    return open_time, close_time

        return None, None

    def _apply_hours_range(
        self,
        normalized: dict[str, Any],
        start_day: str,
        end_day: str,
        hours: str,
    ) -> None:
        """Apply hours to a range of days."""
        days = list(self.DAYS.keys())
        start_idx = None
        end_idx = None

        # Find start and end day indices
        for i, day in enumerate(days):
            if day.startswith(start_day.lower()):
                start_idx = i
            if day.startswith(end_day.lower()):
                end_idx = i

        if start_idx is not None and end_idx is not None:
            open_time, close_time = self._parse_hours_string(hours)
            if open_time and close_time:
                for i in range(start_idx, end_idx + 1):
                    day_abbr = list(self.DAYS.values())[i]
                    normalized["hours"][day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True,
                    }

    def _apply_hours_to_all_days(self, normalized: dict[str, Any], hours: str) -> None:
        """Apply hours to all days."""
        open_time, close_time = self._parse_hours_string(hours)
        if open_time and close_time:
            for day_abbr in self.DAYS.values():
                normalized["hours"][day_abbr] = {
                    "open": open_time,
                    "close": close_time,
                    "is_open": True,
                }

    def _apply_hours_to_day(
        self, normalized: dict[str, Any], day: str, hours: str
    ) -> None:
        """Apply hours to a specific day."""
        for day_name, day_abbr in self.DAYS.items():
            if day_name.startswith(day.lower()):
                open_time, close_time = self._parse_hours_string(hours)
                if open_time and close_time:
                    normalized["hours"][day_abbr] = {
                        "open": open_time,
                        "close": close_time,
                        "is_open": True,
                    }
                break

    def _parse_time_string(self, time_str: str) -> time | None:
        """Parse time string to time object."""
        if not time_str:
            return None

        # Handle various time formats
        patterns = [
            r"(\d{1,2}):(\d{2})\s*(AM|PM)",
            r"(\d{1,2})\s*(AM|PM)",
            r"(\d{1,2}):(\d{2})(AM|PM)",
            r"(\d{1,2})(AM|PM)",
        ]

        for pattern in patterns:
            match = re.match(pattern, time_str, re.IGNORECASE)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                period = match.group(3) or match.group(4)

                if period.upper() == "PM" and hour != 12:
                    hour += 12
                elif period.upper() == "AM" and hour == 12:
                    hour = 0

                return time(hour, minute)

        return None
