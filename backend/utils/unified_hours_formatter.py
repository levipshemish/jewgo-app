#!/usr/bin/env python3
"""
Unified Hours Formatter
=======================

Centralized hours formatting functionality to eliminate code duplication.
This module consolidates all hours formatting logic that was previously duplicated.

Author: JewGo Development Team
Version: 1.0
"""

import datetime
from typing import Any, Dict, List, Optional

from .logging_config import get_logger

logger = get_logger(__name__)


class UnifiedHoursFormatter:
    """Unified hours formatting functionality."""

    # Day name mappings
    DAY_NAMES = {
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }

    SHORT_DAY_NAMES = {
        "mon": "Mon",
        "tue": "Tue",
        "wed": "Wed",
        "thu": "Thu",
        "fri": "Fri",
        "sat": "Sat",
        "sun": "Sun",
    }

    @staticmethod
    def _get_day_abbreviation(day_name: str) -> str:
        """Convert day name to abbreviation."""
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

    @staticmethod
    def format_for_dropdown(hours_json: Dict[str, Any]) -> List[Dict[str, str]]:
        """Format hours for dropdown display."""
        result = []

        if "hours" not in hours_json:
            return result

        for day_abbr, day_name in UnifiedHoursFormatter.SHORT_DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                hours_str = f"{day_hours['open']} - {day_hours['close']}"
            else:
                hours_str = "Closed"

            result.append(
                {
                    "day": day_name,
                    "hours": hours_str,
                    "is_open": day_hours.get("is_open", False),
                }
            )

        return result

    @staticmethod
    def format_compact(hours_json: Dict[str, Any]) -> str:
        """Format hours in compact string format."""
        if "hours" not in hours_json:
            return "Hours not available"

        parts = []
        for day_abbr, day_name in UnifiedHoursFormatter.SHORT_DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                hours_str = f"{day_hours['open']}-{day_hours['close']}"
            else:
                hours_str = "Closed"

            parts.append(f"{day_name} {hours_str}")

        return ", ".join(parts)

    @staticmethod
    def format_detailed(hours_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format hours in detailed format with additional info."""
        result = []

        if "hours" not in hours_json:
            return result

        for day_abbr, day_name in UnifiedHoursFormatter.DAY_NAMES.items():
            day_hours = hours_json["hours"].get(day_abbr, {})

            result.append(
                {
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
                }
            )

        return result

    @staticmethod
    def format_today(hours_json: Dict[str, Any]) -> Dict[str, Any]:
        """Format today's hours specifically."""
        try:
            today = datetime.datetime.now().strftime("%A").lower()
            day_abbr = UnifiedHoursFormatter._get_day_abbreviation(today)

            if "hours" not in hours_json:
                return {"is_open": False, "hours": "Hours not available"}

            day_hours = hours_json["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                return {
                    "is_open": True,
                    "hours": f"{day_hours['open']} - {day_hours['close']}",
                    "open": day_hours["open"],
                    "close": day_hours["close"],
                }
            else:
                return {"is_open": False, "hours": "Closed"}

        except Exception as e:
            logger.exception("Error formatting today's hours", error=str(e))
            return {"is_open": False, "hours": "Hours not available"}

    @staticmethod
    def format_weekly_hours(hours_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format weekly hours for display."""
        result = []

        if "hours" not in hours_data:
            return result

        for day_abbr, day_name in UnifiedHoursFormatter.DAY_NAMES.items():
            day_hours = hours_data["hours"].get(day_abbr, {})

            if day_hours.get("is_open", False):
                hours_display = f"{day_hours['open']} - {day_hours['close']}"
            else:
                hours_display = "Closed"

            result.append(
                {
                    "day": day_name,
                    "day_abbr": day_abbr,
                    "hours": hours_display,
                    "is_open": day_hours.get("is_open", False),
                    "open": day_hours.get("open", ""),
                    "close": day_hours.get("close", ""),
                }
            )

        return result

    @staticmethod
    def format_from_places_api(opening_hours: Dict[str, Any]) -> str:
        """Format hours from Google Places API format."""
        if not opening_hours or "periods" not in opening_hours:
            return "Hours not available"

        try:
            periods = opening_hours["periods"]
            formatted_hours = []

            for period in periods:
                open_info = period.get("open", {})
                close_info = period.get("close", {})

                day = open_info.get("day", 0)
                open_time = open_info.get("time", "")
                close_time = close_info.get("time", "")

                # Convert day number to day name
                day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                day_name = day_names[day] if 0 <= day < 7 else "Unknown"

                # Format time (HHMM to HH:MM)
                open_formatted = (
                    f"{open_time[:2]}:{open_time[2:]}"
                    if len(open_time) == 4
                    else open_time
                )
                close_formatted = (
                    f"{close_time[:2]}:{close_time[2:]}"
                    if len(close_time) == 4
                    else close_time
                )

                formatted_hours.append(f"{day_name} {open_formatted}-{close_formatted}")

            return ", ".join(formatted_hours)

        except Exception as e:
            logger.exception("Error formatting Places API hours", error=str(e))
            return "Hours not available"

    @staticmethod
    def format_for_ui(hours_json: Dict[str, Any], format_type: str = "detailed") -> Any:
        """Format hours for UI display based on type."""
        if format_type == "dropdown":
            return UnifiedHoursFormatter.format_for_dropdown(hours_json)
        elif format_type == "compact":
            return UnifiedHoursFormatter.format_compact(hours_json)
        elif format_type == "detailed":
            return UnifiedHoursFormatter.format_detailed(hours_json)
        elif format_type == "today":
            return UnifiedHoursFormatter.format_today(hours_json)
        elif format_type == "weekly":
            return UnifiedHoursFormatter.format_weekly_hours(hours_json)
        else:
            logger.warning(f"Unknown format type: {format_type}, using detailed")
            return UnifiedHoursFormatter.format_detailed(hours_json)

    @staticmethod
    def validate_hours_format(hours_data: Any) -> Dict[str, Any]:
        """Validate hours data format."""
        if not isinstance(hours_data, dict):
            return {"valid": False, "error": "Hours data must be a dictionary"}

        if "hours" not in hours_data:
            return {"valid": False, "error": "Missing 'hours' key in hours data"}

        hours = hours_data["hours"]
        if not isinstance(hours, dict):
            return {"valid": False, "error": "Hours must be a dictionary"}

        # Validate each day's hours
        for day_abbr, day_hours in hours.items():
            if not isinstance(day_hours, dict):
                return {"valid": False, "error": f"Invalid format for day {day_abbr}"}

            if "is_open" not in day_hours:
                return {
                    "valid": False,
                    "error": f"Missing 'is_open' for day {day_abbr}",
                }

            if day_hours["is_open"]:
                if "open" not in day_hours or "close" not in day_hours:
                    return {
                        "valid": False,
                        "error": f"Missing open/close times for day {day_abbr}",
                    }

        return {"valid": True, "error": None}


# Convenience functions for backward compatibility
def format_hours_for_dropdown(hours_json: Dict[str, Any]) -> List[Dict[str, str]]:
    """Convenience function for dropdown formatting."""
    return UnifiedHoursFormatter.format_for_dropdown(hours_json)


def format_hours_compact(hours_json: Dict[str, Any]) -> str:
    """Convenience function for compact formatting."""
    return UnifiedHoursFormatter.format_compact(hours_json)


def format_hours_detailed(hours_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convenience function for detailed formatting."""
    return UnifiedHoursFormatter.format_detailed(hours_json)


def format_hours_today(hours_json: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for today's hours formatting."""
    return UnifiedHoursFormatter.format_today(hours_json)


def format_hours_from_places_api(opening_hours: Dict[str, Any]) -> str:
    """Convenience function for Places API formatting."""
    return UnifiedHoursFormatter.format_from_places_api(opening_hours)


def validate_hours_format(hours_data: Any) -> Dict[str, Any]:
    """Convenience function for hours validation."""
    return UnifiedHoursFormatter.validate_hours_format(hours_data)
