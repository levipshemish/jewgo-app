import json
import logging
import re
from datetime import UTC, datetime, time, timedelta
import pytz

"""Restaurant Status Calculation Module.
This module provides dynamic restaurant status calculation based on business hours
and current time, with proper timezone support. The status is calculated in real-time
rather than stored in the database, as per user requirements.
Features:
- Timezone-aware status calculation
- Support for various business hours formats
- Graceful handling of missing or invalid hours data
- Caching for performance optimization
- Comprehensive logging for debugging
"""
# Configure logging
logger = logging.getLogger(__name__)


class RestaurantStatusCalculator:
    """Calculates restaurant open/closed status based on business hours and current time.
    This class handles:
    - Timezone conversion based on restaurant location
    - Parsing various business hours formats
    - Real-time status calculation
    - Caching for performance
    """

    def __init__(self) -> None:
        """Initialize the status calculator."""
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache TTL

    def get_restaurant_status(self, restaurant_data: dict) -> dict[str, any]:
        """Calculate the current status of a restaurant based on business hours.
        Args:
            restaurant_data: Dictionary containing restaurant information including
                           hours_open, hours, latitude, longitude, city, state
        Returns:
            Dictionary with status information:
            {
                'is_open': bool,
                'status': str,  # 'open', 'closed', 'unknown'
                'next_open_time': str,  # ISO format or None
                'current_time_local': str,  # ISO format
                'timezone': str,
                'hours_parsed': bool,
                'status_reason': str
            }
        """
        try:
            # Extract restaurant information
            hours_data = restaurant_data.get("hours_open") or restaurant_data.get(
                "hours",
            )
            latitude = restaurant_data.get("latitude")
            longitude = restaurant_data.get("longitude")
            city = restaurant_data.get("city")
            state = restaurant_data.get("state")
            # Determine timezone
            timezone_str = self._get_timezone(latitude, longitude, city, state)
            # Get current time in restaurant's timezone
            current_time_local = self._get_current_time_in_timezone(timezone_str)
            # Parse business hours
            hours_parsed, parsed_hours = self._parse_business_hours(hours_data)
            if not hours_parsed:
                return {
                    "is_open": False,
                    "status": "unknown",
                    "next_open_time": None,
                    "current_time_local": current_time_local.isoformat(),
                    "timezone": timezone_str,
                    "hours_parsed": False,
                    "status_reason": "Unable to parse business hours",
                }
            # Check if restaurant is currently open
            is_open, next_open_time, status_reason = self._check_if_open(
                parsed_hours,
                current_time_local,
            )
            status = "open" if is_open else "closed"
            return {
                "is_open": is_open,
                "status": status,
                "next_open_time": (
                    next_open_time.isoformat() if next_open_time else None
                ),
                "current_time_local": current_time_local.isoformat(),
                "timezone": timezone_str,
                "hours_parsed": True,
                "status_reason": status_reason,
            }
        except Exception as e:
            logger.exception("Error calculating restaurant status")
            return {
                "is_open": False,
                "status": "unknown",
                "next_open_time": None,
                "current_time_local": datetime.now(UTC).isoformat(),
                "timezone": "UTC",
                "hours_parsed": False,
                "status_reason": f"Error determining status: {e!s}",
            }

    def _get_timezone(
        self,
        latitude: float | None,  # noqa: ARG002
        longitude: float | None,  # noqa: ARG002
        city: str | None,
        state: str | None,
    ) -> str:
        """Determine timezone based on location coordinates or city/state.
        Args:
            latitude: Restaurant latitude
            longitude: Restaurant longitude
            city: Restaurant city
            state: Restaurant state
        Returns:
            Timezone string (e.g., 'America/New_York')
        """
        # For now, use a simple mapping based on state
        # In a production environment, you might want to use a geocoding service
        # to get the exact timezone based on coordinates
        if state:
            state_lower = state.lower()
            if state_lower in ["fl", "florida"] or state_lower in ["ny", "new york"]:
                return "America/New_York"
            if state_lower in ["ca", "california"]:
                return "America/Los_Angeles"
            if state_lower in ["tx", "texas"] or state_lower in ["il", "illinois"]:
                return "America/Chicago"
        if city or state:
            logger.warning(
                "Could not determine timezone for location: %s, %s",
                city or "unknown",
                state or "unknown",
            )
        return "UTC"

    def _get_current_time_in_timezone(self, timezone_str: str) -> datetime:
        """Get current time in the specified timezone.
        Args:
            timezone_str: Timezone string
        Returns:
            Current datetime in the specified timezone
        """
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz)
        except Exception as e:
            logger.exception("Error getting time in timezone %s", timezone_str)
            return datetime.now(pytz.UTC)

    def _parse_business_hours(
        self,
        hours_data: str | None,
    ) -> tuple[bool, list[dict]]:
        """Parse business hours from various formats.
        Args:
            hours_data: Business hours string
        Returns:
            Tuple of (success, parsed_hours_list)
        """
        if not hours_data:
            return False, []
        try:
            # Try to parse as JSON first
            if isinstance(hours_data, str) and hours_data.strip().startswith("["):
                parsed_hours = json.loads(hours_data)
                if isinstance(parsed_hours, list):
                    return True, parsed_hours
            # Try regex-based parsing for common formats
            patterns = [
                r"(Daily|24\s*hours?|Open\s*24\s*hours?)",
                r"(\w+):\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)",
                r"(\w{3})\s*(\d{1,2})(AM|PM)-(\d{1,2})(AM|PM)",
                r"(\w+)\s*(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})",
                r"(\w{3})-(\w{3})\s*(\d{1,2})(AM|PM)-(\d{1,2})(AM|PM)",
            ]
            for pattern in patterns:
                matches = re.finditer(pattern, hours_data, re.IGNORECASE)
                parsed_hours = []
                for match in matches:
                    day_hours = self._parse_day_hours(match.groups(), pattern)
                    parsed_hours.extend(day_hours)
                if parsed_hours:
                    return True, parsed_hours
            # Try fallback parsing
            return self._fallback_hours_parsing(hours_data)
        except Exception as e:
            logger.exception("Error parsing business hours")
            return False, []

    def _parse_day_hours(
        self, match: tuple, pattern: str
    ) -> list[dict]:  # noqa: ARG002
        """Parse hours for specific day(s) from regex match.
        Args:
            match: Regex match groups
            pattern: Pattern that was matched
        Returns:
            List of parsed hour dictionaries
        """
        try:
            if len(match) == 1 and match[0].lower() in [
                "daily",
                "24 hours",
                "open 24 hours",
            ]:
                return [{"day": "daily", "start": time(0, 0), "end": time(23, 59)}]
            # Handle different patterns
            if len(match) >= 7:  # Full day format
                day = match[0]
                start_hour = int(match[1])
                start_minute = int(match[2])
                start_ampm = match[3]
                end_hour = int(match[4])
                end_minute = int(match[5])
                end_ampm = match[6]
                start_time = self._time_from_components(
                    str(start_hour),
                    str(start_minute),
                    start_ampm,
                )
                end_time = self._time_from_components(
                    str(end_hour),
                    str(end_minute),
                    end_ampm,
                )
                return [{"day": day.lower(), "start": start_time, "end": end_time}]
        except Exception as e:
            logger.exception("Error parsing day hours")
        return []

    def _time_from_components(self, hour: str, minute: str, ampm: str) -> time:
        """Convert hour, minute, and AM/PM to time object.
        Args:
            hour: Hour string
            minute: Minute string
            ampm: AM/PM string
        Returns:
            Time object
        """
        h = int(hour)
        m = int(minute) if minute else 0
        if ampm.upper() == "PM" and h != 12:
            h += 12
        elif ampm.upper() == "AM" and h == 12:
            h = 0
        return time(h, m)

    def _get_days_between(self, start_day: str, end_day: str) -> list[str]:
        """Get list of days between start and end day.
        Args:
            start_day: Start day abbreviation
            end_day: End day abbreviation
        Returns:
            List of day abbreviations
        """
        days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        start_idx = days.index(start_day.lower())
        end_idx = days.index(end_day.lower())
        if start_idx <= end_idx:
            return days[start_idx : end_idx + 1]
        return days[start_idx:] + days[: end_idx + 1]

    def _fallback_hours_parsing(self, hours_data: str) -> tuple[bool, list[dict]]:
        """Fallback parsing for business hours.
        Args:
            hours_data: Business hours string
        Returns:
            Tuple of (success, parsed_hours_list)
        """
        try:
            # Simple pattern matching for common formats
            if "24" in hours_data.lower() or "daily" in hours_data.lower():
                start_time = time(0, 0)
                end_time = time(23, 59)
                return True, [{"day": "daily", "start": start_time, "end": end_time}]
        except Exception as e:
            logger.exception("Error in fallback hours parsing")
        return False, []

    def _check_if_open(
        self,
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> tuple[bool, datetime | None, str]:
        """Check if restaurant is currently open based on parsed hours.
        Args:
            parsed_hours: List of parsed business hours
            current_time: Current time in restaurant's timezone
        Returns:
            Tuple of (is_open, next_open_time, status_reason)
        """
        try:
            current_day = current_time.strftime("%A").lower()
            current_time_obj = current_time.time()
            # Find today's hours
            today_hours = None
            for hours in parsed_hours:
                if hours["day"] == current_day:
                    today_hours = hours
                    break
            if not today_hours:
                # Calculate next open time
                next_open = self._calculate_next_open_time(parsed_hours, current_time)
                return False, next_open, "Closed today"
            # Check if currently open
            if (
                today_hours["open_time"]
                <= current_time_obj
                <= today_hours["close_time"]
            ):
                return True, None, "Currently open"
            else:
                # Calculate next open time
                next_open = self._calculate_next_open_time(parsed_hours, current_time)
                return False, next_open, "Currently closed"
        except Exception as e:
            logger.error("Error checking if restaurant is open: %s", str(e))
            return False, None, f"Error checking status: {str(e)}"

    def _calculate_next_open_time(
        self,
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> datetime | None:
        """Calculate the next time the restaurant will open.
        Args:
            parsed_hours: List of parsed business hours
            current_time: Current time in restaurant's timezone
        Returns:
            Next open time or None if no hours available
        """
        try:
            days_ahead = 0
            max_days_to_check = 7
            while days_ahead < max_days_to_check:
                # Calculate target date
                target_date = current_time.date() + timedelta(days=days_ahead)
                target_day = target_date.strftime("%A").lower()
                # Find hours for target day
                for hours in parsed_hours:
                    if hours["day"] == target_day:
                        open_time = hours["open_time"]
                        # Create datetime for opening time
                        if days_ahead == 0:
                            # Today - check if already passed
                            if open_time > current_time.time():
                                return datetime.combine(target_date, open_time)
                        else:
                            # Future day
                            return datetime.combine(target_date, open_time)
                days_ahead += 1
            return None
        except Exception as e:
            logger.error("Error calculating next open time: %s", str(e))
            return None


def get_restaurant_status(restaurant_data: dict) -> dict[str, any]:
    """Get restaurant status using the calculator.
    Args:
        restaurant_data: Restaurant data dictionary
    Returns:
        Status information dictionary
    """
    calculator = RestaurantStatusCalculator()
    return calculator.get_restaurant_status(restaurant_data)


def is_restaurant_open(restaurant_data: dict) -> bool:
    """Check if restaurant is currently open.
    Args:
        restaurant_data: Restaurant data dictionary
    Returns:
        True if restaurant is open, False otherwise
    """
    status_info = get_restaurant_status(restaurant_data)
    return status_info.get("is_open", False)
