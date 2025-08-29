"""
Open Now Service for JewGo Backend
=================================

This service provides timezone-aware "open now" filtering for restaurants.
It handles different timezones, business hours parsing, and accurate open/closed status.

Features:
- Timezone-aware time calculations
- Structured hours parsing and validation
- Accurate "open now" status determination
- Support for complex business hours (24h, closed days, etc.)
- Integration with distance filtering

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

import logging
import json
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime, time
import pytz
from enum import Enum

logger = logging.getLogger(__name__)


class DayOfWeek(Enum):
    """Enumeration for days of the week."""

    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


@dataclass
class BusinessHours:
    """Structured business hours data."""

    day: DayOfWeek
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    is_closed: bool = False
    is_24_hours: bool = False


class OpenNowService:
    """Service for timezone-aware "open now" filtering."""

    def __init__(self):
        """Initialize the open now service."""
        self.default_timezone = "America/New_York"

    def parse_hours_text(self, hours_text: str) -> List[BusinessHours]:
        """
        Parse human-readable hours text into structured format.

        Args:
            hours_text: Human-readable hours string

        Returns:
            List of BusinessHours objects
        """
        if not hours_text:
            return []

        hours = []
        lines = hours_text.split("\n")

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Parse common patterns
            if "closed" in line.lower():
                # Handle closed days
                day_name = self._extract_day_name(line)
                if day_name:
                    hours.append(BusinessHours(day=day_name, is_closed=True))
            elif "24" in line or "24 hours" in line.lower():
                # Handle 24-hour days
                day_name = self._extract_day_name(line)
                if day_name:
                    hours.append(BusinessHours(day=day_name, is_24_hours=True))
            else:
                # Parse regular hours
                day_name, open_time, close_time = self._parse_regular_hours(line)
                if day_name and open_time and close_time:
                    hours.append(
                        BusinessHours(
                            day=day_name, open_time=open_time, close_time=close_time
                        )
                    )

        return hours

    def _extract_day_name(self, text: str) -> Optional[DayOfWeek]:
        """Extract day name from text."""
        text_lower = text.lower()

        if "monday" in text_lower or "mon" in text_lower:
            return DayOfWeek.MONDAY
        elif "tuesday" in text_lower or "tue" in text_lower:
            return DayOfWeek.TUESDAY
        elif "wednesday" in text_lower or "wed" in text_lower:
            return DayOfWeek.WEDNESDAY
        elif "thursday" in text_lower or "thu" in text_lower:
            return DayOfWeek.THURSDAY
        elif "friday" in text_lower or "fri" in text_lower:
            return DayOfWeek.FRIDAY
        elif "saturday" in text_lower or "sat" in text_lower:
            return DayOfWeek.SATURDAY
        elif "sunday" in text_lower or "sun" in text_lower:
            return DayOfWeek.SUNDAY

        return None

    def _parse_regular_hours(
        self, text: str
    ) -> tuple[Optional[DayOfWeek], Optional[time], Optional[time]]:
        """Parse regular business hours from text."""
        try:
            # Extract day name
            day_name = self._extract_day_name(text)
            if not day_name:
                return None, None, None

            # Extract time range
            time_pattern = (
                r"(\d{1,2}):?(\d{2})?\s*(am|pm)\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)"
            )
            import re

            match = re.search(time_pattern, text, re.IGNORECASE)

            if match:
                open_hour = int(match.group(1))
                open_minute = int(match.group(2)) if match.group(2) else 0
                open_period = match.group(3).lower()
                close_hour = int(match.group(4))
                close_minute = int(match.group(5)) if match.group(5) else 0
                close_period = match.group(6).lower()

                # Convert to 24-hour format
                open_time = self._convert_to_24hour(open_hour, open_minute, open_period)
                close_time = self._convert_to_24hour(
                    close_hour, close_minute, close_period
                )

                return day_name, open_time, close_time

            return day_name, None, None

        except Exception as e:
            logger.warning(f"Failed to parse hours: {text}, error: {e}")
            return None, None, None

    def _convert_to_24hour(self, hour: int, minute: int, period: str) -> time:
        """Convert 12-hour format to 24-hour time."""
        if period == "pm" and hour != 12:
            hour += 12
        elif period == "am" and hour == 12:
            hour = 0

        return time(hour, minute)

    def is_open_now(
        self, restaurant: Dict[str, Any], reference_time: Optional[datetime] = None
    ) -> Optional[bool]:
        """
        Determine if a restaurant is currently open.

        Args:
            restaurant: Restaurant data dictionary
            reference_time: Reference time (defaults to current time)

        Returns:
            True if open, False if closed, None if unknown
        """
        try:
            # Get restaurant timezone
            timezone_str = restaurant.get("timezone", self.default_timezone)
            tz = pytz.timezone(timezone_str)

            # Get current time in restaurant's timezone
            if reference_time:
                current_time = reference_time.astimezone(tz)
            else:
                current_time = datetime.now(tz)

            # Get business hours
            hours_structured = restaurant.get("hours_structured")
            hours_text = restaurant.get("hours_of_operation", "")

            if hours_structured:
                # Use structured hours if available
                hours = self._parse_structured_hours(hours_structured)
            elif hours_text:
                # Parse text hours
                hours = self.parse_hours_text(hours_text)
            else:
                # No hours data available
                return None

            # Find today's hours
            current_day = current_time.weekday()
            today_hours = None

            for hour in hours:
                if hour.day.value == current_day:
                    today_hours = hour
                    break

            if not today_hours:
                return None

            # Check if closed today
            if today_hours.is_closed:
                return False

            # Check if 24 hours
            if today_hours.is_24_hours:
                return True

            # Check regular hours
            if today_hours.open_time and today_hours.close_time:
                current_time_obj = current_time.time()

                # Handle overnight hours (e.g., 11 PM - 2 AM)
                if today_hours.close_time < today_hours.open_time:
                    # Overnight hours
                    return (
                        current_time_obj >= today_hours.open_time
                        or current_time_obj <= today_hours.close_time
                    )
                else:
                    # Regular hours
                    return (
                        today_hours.open_time
                        <= current_time_obj
                        <= today_hours.close_time
                    )

            return None

        except Exception as e:
            logger.error(f"Error checking if restaurant is open: {e}")
            return None

    def _parse_structured_hours(
        self, hours_json: Union[str, Dict]
    ) -> List[BusinessHours]:
        """Parse structured hours from JSON."""
        try:
            if isinstance(hours_json, str):
                hours_data = json.loads(hours_json)
            else:
                hours_data = hours_json

            hours = []
            for day_data in hours_data:
                day = DayOfWeek(day_data.get("day", 0))

                if day_data.get("is_closed", False):
                    hours.append(BusinessHours(day=day, is_closed=True))
                elif day_data.get("is_24_hours", False):
                    hours.append(BusinessHours(day=day, is_24_hours=True))
                else:
                    open_time_str = day_data.get("open_time")
                    close_time_str = day_data.get("close_time")

                    open_time = None
                    close_time = None

                    if open_time_str:
                        open_time = datetime.strptime(open_time_str, "%H:%M").time()
                    if close_time_str:
                        close_time = datetime.strptime(close_time_str, "%H:%M").time()

                    hours.append(
                        BusinessHours(
                            day=day, open_time=open_time, close_time=close_time
                        )
                    )

            return hours

        except Exception as e:
            logger.error(f"Error parsing structured hours: {e}")
            return []

    def get_next_open_time(
        self, restaurant: Dict[str, Any], reference_time: Optional[datetime] = None
    ) -> Optional[str]:
        """
        Get the next time the restaurant will open.

        Args:
            restaurant: Restaurant data dictionary
            reference_time: Reference time (defaults to current time)

        Returns:
            Formatted string of next open time, or None if unknown
        """
        try:
            # Get restaurant timezone
            timezone_str = restaurant.get("timezone", self.default_timezone)
            tz = pytz.timezone(timezone_str)

            # Get current time in restaurant's timezone
            if reference_time:
                current_time = reference_time.astimezone(tz)
            else:
                current_time = datetime.now(tz)

            # Get business hours
            hours_structured = restaurant.get("hours_structured")
            hours_text = restaurant.get("hours_of_operation", "")

            if hours_structured:
                hours = self._parse_structured_hours(hours_structured)
            elif hours_text:
                hours = self.parse_hours_text(hours_text)
            else:
                return None

            # Find next open time
            current_day = current_time.weekday()
            current_time_obj = current_time.time()

            # Check today first
            for hour in hours:
                if hour.day.value == current_day and not hour.is_closed:
                    if hour.is_24_hours:
                        return "Open 24 hours"
                    elif hour.open_time and hour.close_time:
                        if current_time_obj < hour.open_time:
                            return hour.open_time.strftime("%I:%M %p")

            # Check next 7 days
            for day_offset in range(1, 8):
                check_day = (current_day + day_offset) % 7

                for hour in hours:
                    if hour.day.value == check_day and not hour.is_closed:
                        if hour.is_24_hours:
                            return "Open 24 hours"
                        elif hour.open_time:
                            return hour.open_time.strftime("%I:%M %p")

            return None

        except Exception as e:
            logger.error(f"Error getting next open time: {e}")
            return None

    def build_open_now_filter(self, restaurant_timezone: str = None) -> str:
        """
        Build SQL filter for "open now" queries.

        Args:
            restaurant_timezone: Restaurant's timezone

        Returns:
            SQL WHERE clause for open now filtering
        """
        # This is a simplified version - in practice, you'd need more complex logic
        # to handle the timezone-aware filtering in SQL
        return """
        AND (
            hours_structured IS NOT NULL 
            OR hours_of_operation IS NOT NULL
        )
        """

    def get_open_now_stats(self, restaurants: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get statistics about restaurant opening status.

        Args:
            restaurants: List of restaurant dictionaries

        Returns:
            Dictionary with opening statistics
        """
        total = len(restaurants)
        open_count = 0
        closed_count = 0
        unknown_count = 0

        for restaurant in restaurants:
            is_open = self.is_open_now(restaurant)
            if is_open is True:
                open_count += 1
            elif is_open is False:
                closed_count += 1
            else:
                unknown_count += 1

        return {
            "total": total,
            "open": open_count,
            "closed": closed_count,
            "unknown": unknown_count,
            "open_percentage": (open_count / total * 100) if total > 0 else 0,
        }
