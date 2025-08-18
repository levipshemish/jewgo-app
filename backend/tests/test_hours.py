#!/usr/bin/env python3
"""Unit tests for hours parsing functionality."""

from datetime import datetime, time

import pytest
import pytz

from utils.hours import HoursParser, StatusCalculator, TimezoneHelper

class TestHoursParser:
    """Test cases for HoursParser class."""

    def setup_method(self) -> None:
        """Set up test fixtures."""
        self.parser = HoursParser()

    def test_parse_structured_hours(self) -> None:
        """Test parsing structured hours format."""
        hours_data = "Mon-Fri: 9:00 AM - 10:00 PM\nSat-Sun: 10:00 AM - 11:00 PM"
        success, parsed = self.parser.parse_hours(hours_data)

        assert success is True
        assert len(parsed) > 0

        # Check that we have hours for weekdays and weekends
        weekdays = [
            h for h in parsed if h["day"] in ["mon", "tue", "wed", "thu", "fri"]
        ]
        weekends = [h for h in parsed if h["day"] in ["sat", "sun"]]

        assert len(weekdays) == 5
        assert len(weekends) == 2

    def test_parse_daily_hours(self) -> None:
        """Test parsing daily hours format."""
        hours_data = "Daily: 9:00 AM - 10:00 PM"
        success, parsed = self.parser.parse_hours(hours_data)

        assert success is True
        assert len(parsed) == 7  # All days of the week

        # Check that all days have the same hours
        for day_hours in parsed:
            assert day_hours["start"] == time(9, 0)
            assert day_hours["end"] == time(22, 0)

    def test_parse_time_formats(self) -> None:
        """Test parsing various time formats."""
        # Test 12-hour format
        time_str = "9:30 AM"
        parsed_time = self.parser._parse_time(time_str)
        assert parsed_time == time(9, 30)

        # Test 24-hour format
        time_str = "14:30"
        parsed_time = self.parser._parse_time(time_str)
        assert parsed_time == time(14, 30)

        # Test PM format
        time_str = "3:45 PM"
        parsed_time = self.parser._parse_time(time_str)
        assert parsed_time == time(15, 45)

    def test_parse_days(self) -> None:
        """Test parsing day specifications."""
        # Test single day
        days = self.parser._parse_days("Monday")
        assert days == ["mon"]

        # Test multiple days
        days = self.parser._parse_days("Mon, Tue, Wed")
        assert days == ["mon", "tue", "wed"]

        # Test daily
        days = self.parser._parse_days("Daily")
        assert len(days) == 7
        assert "mon" in days
        assert "sun" in days

    def test_get_days_between(self) -> None:
        """Test getting days between two days."""
        # Test normal range
        days = self.parser._get_days_between("Mon", "Fri")
        assert days == ["mon", "tue", "wed", "thu", "fri"]

        # Test wraparound
        days = self.parser._get_days_between("Sat", "Mon")
        assert days == ["sat", "sun", "mon"]

    def test_invalid_hours(self) -> None:
        """Test handling of invalid hours data."""
        # Test empty string
        success, parsed = self.parser.parse_hours("")
        assert success is False
        assert parsed == []

        # Test None
        success, parsed = self.parser.parse_hours(None)
        assert success is False
        assert parsed == []

        # Test malformed data
        success, parsed = self.parser.parse_hours("Invalid hours format")
        assert success is False
        assert parsed == []


class TestTimezoneHelper:
    """Test cases for TimezoneHelper class."""

    def test_get_timezone_florida(self) -> None:
        """Test timezone detection for Florida."""
        # Miami coordinates
        tz = TimezoneHelper.get_timezone(25.7617, -80.1918, "Miami", "FL")
        assert tz == "America/New_York"

        # Boca Raton coordinates
        tz = TimezoneHelper.get_timezone(26.3683, -80.1289, "Boca Raton", "FL")
        assert tz == "America/New_York"

    def test_get_timezone_fallback(self) -> None:
        """Test timezone fallback when coordinates are missing."""
        tz = TimezoneHelper.get_timezone(None, None, "Miami", "FL")
        assert tz == "America/New_York"

        tz = TimezoneHelper.get_timezone(None, None, "Unknown", "FL")
        assert tz == "America/New_York"

    def test_get_current_time_in_timezone(self) -> None:
        """Test getting current time in timezone."""
        current_time = TimezoneHelper.get_current_time_in_timezone("America/New_York")
        assert isinstance(current_time, datetime)
        assert current_time.tzinfo is not None

        # Should be in Eastern Time
        assert "America/New_York" in str(current_time.tzinfo)


class TestStatusCalculator:
    """Test cases for StatusCalculator class."""

    def setup_method(self) -> None:
        """Set up test fixtures."""
        self.calculator = StatusCalculator()
        self.eastern_tz = pytz.timezone("America/New_York")

        # Sample hours for testing
        self.sample_hours = [
            {"day": "mon", "start": time(9, 0), "end": time(22, 0)},
            {"day": "tue", "start": time(9, 0), "end": time(22, 0)},
            {"day": "wed", "start": time(9, 0), "end": time(22, 0)},
            {"day": "thu", "start": time(9, 0), "end": time(22, 0)},
            {"day": "fri", "start": time(9, 0), "end": time(22, 0)},
            {"day": "sat", "start": time(10, 0), "end": time(23, 0)},
            {"day": "sun", "start": time(10, 0), "end": time(23, 0)},
        ]

    def test_is_open_now_weekday_open(self) -> None:
        """Test status when restaurant is open on weekday."""
        # Create a Monday at 2 PM
        test_time = datetime(2024, 1, 1, 14, 0, tzinfo=self.eastern_tz)  # Monday 2 PM

        is_open, next_open, reason = StatusCalculator.is_open_now(
            self.sample_hours,
            test_time,
        )

        assert is_open is True
        assert next_open is None
        assert "Open" in reason

    def test_is_open_now_weekday_closed(self) -> None:
        """Test status when restaurant is closed on weekday."""
        # Create a Monday at 11 PM
        test_time = datetime(2024, 1, 1, 23, 0, tzinfo=self.eastern_tz)  # Monday 11 PM

        is_open, next_open, reason = StatusCalculator.is_open_now(
            self.sample_hours,
            test_time,
        )

        assert is_open is False
        assert next_open is not None
        assert "Closed" in reason

    def test_is_open_now_weekend_open(self) -> None:
        """Test status when restaurant is open on weekend."""
        # Create a Saturday at 2 PM
        test_time = datetime(2024, 1, 6, 14, 0, tzinfo=self.eastern_tz)  # Saturday 2 PM

        is_open, next_open, reason = StatusCalculator.is_open_now(
            self.sample_hours,
            test_time,
        )

        assert is_open is True
        assert next_open is None
        assert "Open" in reason

    def test_no_hours_available(self) -> None:
        """Test status when no hours are available."""
        test_time = datetime(2024, 1, 1, 14, 0, tzinfo=self.eastern_tz)

        is_open, next_open, reason = StatusCalculator.is_open_now([], test_time)

        assert is_open is False
        assert next_open is None
        assert "No business hours available" in reason

    def test_overnight_hours(self) -> None:
        """Test overnight hours (e.g., 10 PM - 2 AM)."""
        overnight_hours = [
            {"day": "mon", "start": time(22, 0), "end": time(2, 0)},  # 10 PM - 2 AM
        ]

        # Test during overnight hours (11 PM)
        test_time = datetime(2024, 1, 1, 23, 0, tzinfo=self.eastern_tz)  # Monday 11 PM
        is_open, next_open, reason = StatusCalculator.is_open_now(
            overnight_hours,
            test_time,
        )
        assert is_open is True

        # Test after overnight hours (3 AM)
        test_time = datetime(2024, 1, 2, 3, 0, tzinfo=self.eastern_tz)  # Tuesday 3 AM
        is_open, next_open, reason = StatusCalculator.is_open_now(
            overnight_hours,
            test_time,
        )
        assert is_open is False


# Integration tests
class TestHoursIntegration:
    """Integration tests for hours functionality."""

    def test_full_hours_workflow(self) -> None:
        """Test the complete hours parsing and status calculation workflow."""
        from utils.hours import (
            get_current_time_in_timezone,
            get_timezone,
            is_restaurant_open,
            parse_business_hours,
        )

        # Sample restaurant data
        hours_data = "Mon-Fri: 9:00 AM - 10:00 PM\nSat-Sun: 10:00 AM - 11:00 PM"

        # Parse hours
        success, parsed_hours = parse_business_hours(hours_data)
        assert success is True
        assert len(parsed_hours) > 0

        # Get timezone
        timezone = get_timezone(25.7617, -80.1918, "Miami", "FL")
        assert timezone == "America/New_York"

        # Get current time
        current_time = get_current_time_in_timezone(timezone)
        assert current_time is not None

        # Check status
        is_open, next_open, reason = is_restaurant_open(parsed_hours, current_time)
        assert isinstance(is_open, bool)
        assert reason is not None


if __name__ == "__main__":
    pytest.main([__file__])
