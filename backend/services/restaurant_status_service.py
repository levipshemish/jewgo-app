import logging
import re
from datetime import datetime, time, timedelta
import pytz
from .base_service import BaseService

"""Restaurant Status Service.
This service provides restaurant status calculation based on business hours
and current time, with proper timezone support.
"""
logger = logging.getLogger(__name__)


class RestaurantStatusService(BaseService):
    """Service for calculating restaurant open/closed status."""

    def __init__(self, db_manager=None, config=None) -> None:
        super().__init__(db_manager, config)
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
                "hours"
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
            logger.exception("Error calculating restaurant status", error=str(e))
            return {
                "is_open": False,
                "status": "unknown",
                "next_open_time": None,
                "current_time_local": datetime.now().isoformat(),
                "timezone": "UTC",
                "hours_parsed": False,
                "status_reason": f"Error: {e!s}",
            }

    def is_restaurant_open(self, restaurant_data: dict) -> bool:
        """Simple function to check if restaurant is currently open.
        Args:
            restaurant_data: Restaurant data dictionary
        Returns:
            True if restaurant is open, False otherwise
        """
        status_info = self.get_restaurant_status(restaurant_data)
        return status_info.get("is_open", False)

    def _get_timezone(
        self,
        latitude: float | None,
        longitude: float | None,
        city: str | None,
        state: str | None,
    ) -> str:
        """Determine timezone based on location coordinates or city/state."""
        # Priority: coordinates > city/state > default
        if latitude and longitude:
            try:
                # Use timezonefinder or similar for coordinate-based timezone
                # For now, use a simple mapping based on longitude
                if longitude < -100:
                    return "America/Denver"
                if longitude < -85:
                    return "America/Chicago"
                if longitude < -70:
                    return "America/New_York"
                return "America/Los_Angeles"
            except Exception:
                pass
        # Fallback to city/state mapping
        if city and state:
            timezone_mapping = {
                "FL": "America/New_York",
                "CA": "America/Los_Angeles",
                "NY": "America/New_York",
                "TX": "America/Chicago",
                "IL": "America/Chicago",
                "PA": "America/New_York",
                "OH": "America/New_York",
                "GA": "America/New_York",
                "NC": "America/New_York",
                "MI": "America/New_York",
                "NJ": "America/New_York",
                "VA": "America/New_York",
                "WA": "America/Los_Angeles",
                "AZ": "America/Phoenix",
                "CO": "America/Denver",
                "OR": "America/Los_Angeles",
                "NV": "America/Los_Angeles",
                "UT": "America/Denver",
                "ID": "America/Boise",
                "MT": "America/Denver",
                "WY": "America/Denver",
                "ND": "America/Chicago",
                "SD": "America/Chicago",
                "NE": "America/Chicago",
                "KS": "America/Chicago",
                "OK": "America/Chicago",
                "AR": "America/Chicago",
                "LA": "America/Chicago",
                "MS": "America/Chicago",
                "AL": "America/Chicago",
                "TN": "America/Chicago",
                "KY": "America/New_York",
                "IN": "America/New_York",
                "WI": "America/Chicago",
                "MN": "America/Chicago",
                "IA": "America/Chicago",
                "MO": "America/Chicago",
                "SC": "America/New_York",
                "WV": "America/New_York",
                "MD": "America/New_York",
                "DE": "America/New_York",
                "CT": "America/New_York",
                "RI": "America/New_York",
                "MA": "America/New_York",
                "VT": "America/New_York",
                "NH": "America/New_York",
                "ME": "America/New_York",
                "HI": "Pacific/Honolulu",
                "AK": "America/Anchorage",
            }
            return timezone_mapping.get(state.upper(), "America/New_York")
        # Default to Eastern Time
        return "America/New_York"

    def _get_current_time_in_timezone(self, timezone_str: str) -> datetime:
        """Get current time in the specified timezone."""
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz)
        except Exception:
            # Fallback to UTC
            return datetime.now(pytz.UTC)

    def _parse_business_hours(
        self,
        hours_data: str | None,
    ) -> tuple[bool, list[dict]]:
        """Parse business hours from various formats."""
        if not hours_data:
            return False, []
        # Common patterns for business hours
        patterns = [
            # Mon-Fri 9:00 AM-5:00 PM
            r"(\w{3})-(\w{3})\s+(\d{1,2}):(\d{2})\s*(AM|PM)-(\d{1,2}):(\d{2})\s*(AM|PM)",
            # Monday-Friday 9:00 AM-5:00 PM
            r"(\w+)-(\w+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)-(\d{1,2}):(\d{2})\s*(AM|PM)",
            # Mon 9:00 AM-5:00 PM, Tue 9:00 AM-5:00 PM
            r"(\w{3})\s+(\d{1,2}):(\d{2})\s*(AM|PM)-(\d{1,2}):(\d{2})\s*(AM|PM)",
        ]
        for pattern in patterns:
            matches = re.findall(pattern, hours_data, re.IGNORECASE)
            if matches:
                return True, self._parse_day_hours(matches, pattern)
        # Fallback parsing
        return self._fallback_hours_parsing(hours_data)

    def _parse_day_hours(self, matches: tuple, pattern: str) -> list[dict]:
        """Parse individual day hours from matches."""
        parsed_hours = []
        day_mapping = {
            "mon": "monday",
            "tue": "tuesday",
            "wed": "wednesday",
            "thu": "thursday",
            "fri": "friday",
            "sat": "saturday",
            "sun": "sunday",
        }
        for match in matches:
            if len(match) == 8:  # Range format (Mon-Fri)
                (
                    start_day,
                    end_day,
                    start_hour,
                    start_min,
                    start_ampm,
                    end_hour,
                    end_min,
                    end_ampm,
                ) = match
                days = self._get_days_between(start_day.lower(), end_day.lower())
            else:  # Single day format
                (
                    day,
                    start_hour,
                    start_min,
                    start_ampm,
                    end_hour,
                    end_min,
                    end_ampm,
                ) = match
                days = [day_mapping.get(day.lower(), day.lower())]
            start_time = self._time_from_components(start_hour, start_min, start_ampm)
            end_time = self._time_from_components(end_hour, end_min, end_ampm)
            for day in days:
                parsed_hours.append(
                    {
                        "day": day,
                        "open": start_time,
                        "close": end_time,
                    }
                )
        return parsed_hours

    def _time_from_components(self, hour: str, minute: str, ampm: str) -> time:
        """Convert time components to time object."""
        hour = int(hour)
        minute = int(minute)
        if ampm.upper() == "PM" and hour != 12:
            hour += 12
        elif ampm.upper() == "AM" and hour == 12:
            hour = 0
        return time(hour, minute)

    def _get_days_between(self, start_day: str, end_day: str) -> list[str]:
        """Get list of days between start and end day."""
        days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
        day_mapping = {
            "mon": "monday",
            "tue": "tuesday",
            "wed": "wednesday",
            "thu": "thursday",
            "fri": "friday",
            "sat": "saturday",
            "sun": "sunday",
        }
        start_day = day_mapping.get(start_day, start_day)
        end_day = day_mapping.get(end_day, end_day)
        try:
            start_idx = days.index(start_day)
            end_idx = days.index(end_day)
            if start_idx <= end_idx:
                return days[start_idx : end_idx + 1]
            return days[start_idx:] + days[: end_idx + 1]
        except ValueError:
            return [start_day]

    def _fallback_hours_parsing(self, hours_data: str) -> tuple[bool, list[dict]]:
        """Fallback parsing for non-standard hour formats."""
        # This is a simplified fallback - in production, you might want more sophisticated parsing
        logger.warning("Using fallback parsing for hours", hours_data=hours_data)
        return False, []

    def _check_if_open(
        self,
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> tuple[bool, datetime | None, str]:
        """Check if restaurant is currently open."""
        if not parsed_hours:
            return False, None, "No hours data available"
        current_day = current_time.strftime("%A").lower()
        current_time_obj = current_time.time()
        # Find today's hours
        today_hours = None
        for hours in parsed_hours:
            if hours["day"].lower() == current_day:
                today_hours = hours
                break
        if not today_hours:
            return False, None, f"Closed on {current_day}"
        # Check if current time is within open hours
        open_time = today_hours["open"]
        close_time = today_hours["close"]
        # Handle overnight hours (e.g., 11 PM - 2 AM)
        if close_time < open_time:
            if current_time_obj >= open_time or current_time_obj <= close_time:
                return True, None, "Open (overnight hours)"
            next_open = self._calculate_next_open_time(parsed_hours, current_time)
            return False, next_open, "Closed (overnight hours)"
        if open_time <= current_time_obj <= close_time:
            return True, None, "Open"
        next_open = self._calculate_next_open_time(parsed_hours, current_time)
        return False, next_open, "Closed"

    def _calculate_next_open_time(
        self,
        parsed_hours: list[dict],
        current_time: datetime,
    ) -> datetime | None:
        """Calculate the next time the restaurant will be open."""
        if not parsed_hours:
            return None
        current_day = current_time.strftime("%A").lower()
        days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
        # Find current day index
        try:
            current_day_idx = days.index(current_day)
        except ValueError:
            return None
        # Check next 7 days
        for i in range(7):
            check_day_idx = (current_day_idx + i) % 7
            check_day = days[check_day_idx]
            # Find hours for this day
            day_hours = None
            for hours in parsed_hours:
                if hours["day"].lower() == check_day:
                    day_hours = hours
                    break
            if day_hours:
                open_time = day_hours["open"]
                if i == 0:  # Today
                    if current_time.time() < open_time:
                        # Restaurant opens later today
                        return datetime.combine(
                            current_time.date(), open_time, tzinfo=current_time.tzinfo
                        )
                else:
                    # Future day
                    future_date = current_time.date() + timedelta(days=i)
                    return datetime.combine(
                        future_date, open_time, tzinfo=current_time.tzinfo
                    )
        return None
