import logging
import re
from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Tuple, Union
import json

import pytz
from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta

try:
    from timezonefinder import TimezoneFinder
    TIMEZONEFINDER_AVAILABLE = True
except ImportError:
    TimezoneFinder = None
    TIMEZONEFINDER_AVAILABLE = False

"""Unified Hours Utility Module.

This module provides centralized time parsing and business hours management functions
for the JewGo application. It consolidates all time-related utilities into a single
reusable module.

Features:
- Timezone-aware time parsing
- Business hours format parsing
- Time conversion utilities
- Status calculation helpers
- Caching for performance optimization
"""

# Configure logging
logger = logging.getLogger(__name__)


class HoursParser:
    """Unified parser for business hours in various formats.

    Supports formats like:
    - "Mon-Fri: 9:00 AM - 10:00 PM"
    - "Monday: 9:00 AM - 10:00 PM"
    - "Mon, Tue, Wed: 9:00 AM - 10:00 PM"
    - "Daily: 9:00 AM - 10:00 PM"
    """

    def __init__(self) -> None:
        """Initialize the hours parser."""
        self.day_mapping = {
            "monday": "mon",
            "mon": "mon",
            "tuesday": "tue",
            "tue": "tue",
            "wednesday": "wed",
            "wed": "wed",
            "thursday": "thu",
            "thu": "thu",
            "friday": "fri",
            "fri": "fri",
            "saturday": "sat",
            "sat": "sat",
            "sunday": "sun",
            "sun": "sun",
            "daily": "daily",
        }

        self.day_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    def parse_hours(self, hours_data: str | None) -> tuple[bool, list[dict]]:
        """Parse business hours from various formats.

        Args:
            hours_data: String containing business hours

        Returns:
            Tuple of (success, parsed_hours_list)

        """
        if not hours_data:
            return False, []

        try:
            # Try structured parsing first
            parsed = self._parse_structured_hours(hours_data)
            if parsed:
                return True, parsed

            # Fallback to regex parsing
            parsed = self._parse_regex_hours(hours_data)
            if parsed:
                return True, parsed

            # Final fallback
            return self._fallback_parsing(hours_data)

        except Exception as e:
            logger.exception("Error parsing hours", hours_data=hours_data, error=str(e))
            return False, []

    def _parse_structured_hours(self, hours_data: str) -> list[dict] | None:
        """Parse structured hours format."""
        # Handle JSON-like formats
        if hours_data.startswith(("{", "[")):
            try:
                data = json.loads(hours_data)
                return self._convert_json_hours(data)
            except json.JSONDecodeError as e:
                logger.warning("Failed to parse JSON hours data", 
                             hours_data=hours_data[:100],  # Log first 100 chars
                             error=str(e),
                             line_number=e.lineno if hasattr(e, 'lineno') else None,
                             column_number=e.colno if hasattr(e, 'colno') else None)
            except Exception as e:
                logger.warning("Unexpected error parsing JSON hours data", 
                             hours_data=hours_data[:100],  # Log first 100 chars
                             error=str(e),
                             error_type=type(e).__name__)

        # Handle common structured formats
        lines = hours_data.split("\n")
        parsed_hours = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Pattern: "Mon-Fri: 9:00 AM - 10:00 PM"
            match = re.match(
                r"([A-Za-z-,\s]+):\s*([0-9:]+)\s*(AM|PM)\s*-\s*([0-9:]+)\s*(AM|PM)",
                line,
            )
            if match:
                days_str, start_time, start_ampm, end_time, end_ampm = match.groups()
                days = self._parse_days(days_str)
                start = self._parse_time(f"{start_time} {start_ampm}")
                end = self._parse_time(f"{end_time} {end_ampm}")

                for day in days:
                    parsed_hours.append({"day": day, "start": start, "end": end})

        return parsed_hours if parsed_hours else None

    def _parse_regex_hours(self, hours_data: str) -> list[dict] | None:
        """Parse hours using regex patterns."""
        patterns = [
            # Mon-Fri: 9:00 AM - 10:00 PM
            r"([A-Za-z]+)-([A-Za-z]+):\s*([0-9:]+)\s*(AM|PM)\s*-\s*([0-9:]+)\s*(AM|PM)",
            # Mon, Tue, Wed: 9:00 AM - 10:00 PM
            r"([A-Za-z,\s]+):\s*([0-9:]+)\s*(AM|PM)\s*-\s*([0-9:]+)\s*(AM|PM)",
            # Daily: 9:00 AM - 10:00 PM
            r"Daily:\s*([0-9:]+)\s*(AM|PM)\s*-\s*([0-9:]+)\s*(AM|PM)",
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, hours_data, re.IGNORECASE)
            parsed_hours = []

            for match in matches:
                groups = match.groups()
                if "Daily" in pattern:
                    start_time, start_ampm, end_time, end_ampm = groups
                    days = self.day_order
                elif len(groups) == 6:  # Mon-Fri pattern
                    start_day, end_day, start_time, start_ampm, end_time, end_ampm = (
                        groups
                    )
                    days = self._get_days_between(start_day, end_day)
                elif len(groups) == 5:  # Mon, Tue, Wed pattern
                    days_str, start_time, start_ampm, end_time, end_ampm = groups
                    days = self._parse_days(days_str)
                else:
                    continue  # Skip unexpected patterns

                start = self._parse_time(f"{start_time} {start_ampm}")
                end = self._parse_time(f"{end_time} {end_ampm}")

                for day in days:
                    parsed_hours.append({"day": day, "start": start, "end": end})

            if parsed_hours:
                return parsed_hours

        return None

    def _fallback_parsing(self, hours_data: str) -> tuple[bool, list[dict]]:
        """Fallback parsing for complex or malformed hours."""
        try:
            # Try to extract any time-like patterns
            time_pattern = r"([0-9]{1,2}):?([0-9]{2})?\s*(AM|PM)"
            times = re.findall(time_pattern, hours_data, re.IGNORECASE)

            if len(times) >= 2:
                # Assume first two times are start and end
                start_time = self._parse_time(
                    f"{times[0][0]}:{times[0][1] or '00'} {times[0][2]}",
                )
                end_time = self._parse_time(
                    f"{times[1][0]}:{times[1][1] or '00'} {times[1][2]}",
                )

                # Assume daily hours
                return True, [{"day": "daily", "start": start_time, "end": end_time}]

            return False, []

        except Exception as e:
            logger.exception("Fallback parsing failed", error=str(e))
            return False, []

    def _parse_days(self, days_str: str) -> list[str]:
        """Parse day specifications into list of day codes."""
        days = []
        parts = [part.strip().lower() for part in days_str.split(",")]

        for part in parts:
            if part in self.day_mapping:
                day_code = self.day_mapping[part]
                if day_code == "daily":
                    days.extend(self.day_order)
                else:
                    days.append(day_code)

        return days

    def _get_days_between(self, start_day: str, end_day: str) -> list[str]:
        """Get all days between start_day and end_day inclusive."""
        start = self.day_mapping.get(start_day.lower())
        end = self.day_mapping.get(end_day.lower())

        if not start or not end:
            return []

        if start == "daily" or end == "daily":
            return self.day_order

        start_idx = self.day_order.index(start)
        end_idx = self.day_order.index(end)

        if start_idx <= end_idx:
            return self.day_order[start_idx : end_idx + 1]
        # Handle wraparound (e.g., Sat-Mon)
        return self.day_order[start_idx:] + self.day_order[: end_idx + 1]

    def _parse_time(self, time_str: str) -> time:
        """Parse time string into time object."""
        try:
            # Handle various time formats
            time_str = time_str.strip().upper()

            # Pattern: "9:00 AM" or "9 AM"
            match = re.match(r"([0-9]{1,2}):?([0-9]{2})?\s*(AM|PM)", time_str)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2) or "0")
                ampm = match.group(3)

                if ampm == "PM" and hour != 12:
                    hour += 12
                elif ampm == "AM" and hour == 12:
                    hour = 0

                return time(hour, minute)

            # Try direct parsing
            return date_parser.parse(time_str).time()

        except Exception as e:
            logger.exception("Error parsing time", time_str=time_str, error=str(e))
            return time(0, 0)

    def _convert_json_hours(self, data: dict | list) -> list[dict]:
        """Convert JSON hours data to standard format."""
        parsed_hours = []

        if isinstance(data, dict):
            for day, hours in data.items():
                if isinstance(hours, dict) and "open" in hours and "close" in hours:
                    start = self._parse_time(hours["open"])
                    end = self._parse_time(hours["close"])
                    parsed_hours.append(
                        {"day": day.lower()[:3], "start": start, "end": end},
                    )

        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "day" in item and "hours" in item:
                    hours = item["hours"]
                    if isinstance(hours, str):
                        # Parse "9:00 AM - 10:00 PM" format
                        times = hours.split("-")
                        if len(times) == 2:
                            start = self._parse_time(times[0].strip())
                            end = self._parse_time(times[1].strip())
                            parsed_hours.append(
                                {
                                    "day": item["day"].lower()[:3],
                                    "start": start,
                                    "end": end,
                                },
                            )

        return parsed_hours


class TimezoneHelper:
    """Helper class for timezone operations."""

    @staticmethod
    def get_timezone(
        latitude: float | None,
        longitude: float | None,
        city: str | None,
        state: str | None,
    ) -> str:
        """Determine timezone based on location.

        Args:
            latitude: Restaurant latitude
            longitude: Restaurant longitude
            city: Restaurant city
            state: Restaurant state

        Returns:
            Timezone string (e.g., 'America/New_York')

        """
        # Default to Eastern Time for Florida
        default_tz = "America/New_York"

        if not latitude or not longitude:
            # Fallback based on state/city
            if state and state.upper() == "FL":
                return default_tz
            return default_tz

        if TIMEZONEFINDER_AVAILABLE:
            try:
                # Use timezonefinder for precise timezone lookup
                tf = TimezoneFinder()
                tz_name = tf.timezone_at(lat=latitude, lng=longitude)
                return tz_name or default_tz
            except Exception as e:
                logger.warning("TimezoneFinder failed, falling back to manual lookup", 
                             error=str(e),
                             latitude=latitude,
                             longitude=longitude)
        
        # Fallback to manual mapping
        return TimezoneHelper._manual_timezone_lookup(
            latitude,
            longitude,
            city,
            state,
        )

    @staticmethod
    def _manual_timezone_lookup(
        latitude: float,
        longitude: float,
        city: str | None,
        state: str | None,
    ) -> str:
        """Manual timezone lookup based on coordinates and location."""
        # Florida timezone mapping
        if state and state.upper() == "FL":
            # Most of Florida is Eastern Time
            # Panhandle counties are Central Time
            central_counties = [
                "Escambia",
                "Santa Rosa",
                "Okaloosa",
                "Walton",
                "Holmes",
                "Washington",
                "Bay",
                "Jackson",
                "Calhoun",
                "Liberty",
                "Gulf",
                "Franklin",
                "Wakulla",
                "Jefferson",
                "Leon",
                "Gadsden",
            ]

            if city and any(
                county.lower() in city.lower() for county in central_counties
            ):
                return "America/Chicago"
            return "America/New_York"

        # Default to Eastern Time
        return "America/New_York"

    @staticmethod
    def get_current_time_in_timezone(timezone_str: str) -> datetime:
        """Get current time in specified timezone.

        Args:
            timezone_str: Timezone string

        Returns:
            Current datetime in specified timezone

        """
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz)
        except Exception as e:
            logger.exception(
                "Error getting time in timezone",
                timezone_str=timezone_str,
                error=str(e),
            )
            # Fallback to UTC
            return datetime.now(pytz.UTC)


class StatusCalculator:
    """Calculate restaurant open/closed status."""

    @staticmethod
    def is_open_now(
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> tuple[bool, datetime | None, str]:
        """Check if restaurant is currently open.

        Args:
            parsed_hours: List of parsed business hours
            current_time: Current time in restaurant's timezone

        Returns:
            Tuple of (is_open, next_open_time, reason)

        """
        if not parsed_hours:
            return False, None, "No business hours available"

        current_day = current_time.strftime("%a").lower()[:3]
        current_time_obj = current_time.time()

        # Check today's hours
        today_hours = [
            h for h in parsed_hours if h["day"] == current_day or h["day"] == "daily"
        ]

        if not today_hours:
            # Check if closed today
            next_open = StatusCalculator._calculate_next_open_time(
                parsed_hours,
                current_time,
            )
            return False, next_open, "Closed today"

        # Check if currently open
        for hours in today_hours:
            start = hours["start"]
            end = hours["end"]

            # Handle overnight hours (e.g., 10 PM - 2 AM)
            if end < start:
                # Current time is after start OR before end
                if current_time_obj >= start or current_time_obj <= end:
                    return True, None, "Open"
            # Normal hours
            elif start <= current_time_obj <= end:
                return True, None, "Open"

        # Not open now, calculate next open time
        next_open = StatusCalculator._calculate_next_open_time(
            parsed_hours,
            current_time,
        )
        return False, next_open, "Closed"

    @staticmethod
    def _calculate_next_open_time(
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> datetime | None:
        """Calculate the next time the restaurant will open."""
        if not parsed_hours:
            return None

        current_day = current_time.strftime("%a").lower()[:3]
        current_time_obj = current_time.time()

        # Check remaining hours today
        today_hours = [
            h for h in parsed_hours if h["day"] == current_day or h["day"] == "daily"
        ]

        for hours in today_hours:
            start = hours["start"]
            if start > current_time_obj:
                # Opens later today
                return datetime.combine(
                    current_time.date(),
                    start,
                    tzinfo=current_time.tzinfo,
                )

        # Check future days
        day_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        current_day_idx = day_order.index(current_day)

        for i in range(1, 8):  # Check next 7 days
            check_day_idx = (current_day_idx + i) % 7
            check_day = day_order[check_day_idx]

            day_hours = [
                h for h in parsed_hours if h["day"] == check_day or h["day"] == "daily"
            ]
            if day_hours:
                # Found next open day
                next_open_time = min(h["start"] for h in day_hours)
                next_date = current_time.date() + timedelta(days=i)
                return datetime.combine(
                    next_date,
                    next_open_time,
                    tzinfo=current_time.tzinfo,
                )

        return None


# Global instances
hours_parser = HoursParser()
timezone_helper = TimezoneHelper()
status_calculator = StatusCalculator()


# Convenience functions
def parse_business_hours(hours_data: str | None) -> tuple[bool, list[dict]]:
    """Parse business hours from string."""
    return hours_parser.parse_hours(hours_data)


def get_timezone(
    latitude: float | None,
    longitude: float | None,
    city: str | None,
    state: str | None,
) -> str:
    """Get timezone for location."""
    return timezone_helper.get_timezone(latitude, longitude, city, state)


def get_current_time_in_timezone(timezone_str: str) -> datetime:
    """Get current time in timezone."""
    return timezone_helper.get_current_time_in_timezone(timezone_str)


def is_restaurant_open(
    parsed_hours: list[dict],
    current_time: datetime,
) -> tuple[bool, datetime | None, str]:
    """Check if restaurant is open."""
    return status_calculator.is_open_now(parsed_hours, current_time)
