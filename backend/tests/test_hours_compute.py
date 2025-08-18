import pytest
from datetime import datetime, date, time
from unittest.mock import patch

    from services.hours_compute import HoursCompute, hours_compute
    import sys
    import os
    from services.hours_compute import HoursCompute, hours_compute






#!/usr/bin/env python3
"""Tests for Hours Compute Service."""

# Import the service
try:
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
class TestHoursCompute:
    """Test cases for HoursCompute service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.compute = HoursCompute()
        self.timezone = "America/New_York"
        
        # Sample hours document
        self.sample_hours = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}],
                "thu": [{"open": "09:00", "close": "17:00"}],
                "fri": [{"open": "09:00", "close": "17:00"}],
                "sat": [{"open": "10:00", "close": "15:00"}],
                "sun": []
            },
            "exceptions": [
                {"date": "2025-12-25", "type": "closed", "note": "Christmas"}
            ],
            "source": {"manual": {"updated_by": "test"}}
        }
    
    def test_is_open_now_open(self):
        """Test is_open_now when restaurant should be open."""
        # Mock current time to be during business hours (Monday 2 PM)
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 19, 0)  # Monday 2 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(self.sample_hours)
            assert result == True
    
    def test_is_open_now_closed(self):
        """Test is_open_now when restaurant should be closed."""
        # Mock current time to be outside business hours (Monday 8 PM)
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 1, 0)  # Monday 8 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(self.sample_hours)
            assert result == False
    
    def test_is_open_now_sunday_closed(self):
        """Test is_open_now on Sunday when restaurant is closed."""
        # Mock current time to be Sunday
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 5, 19, 0)  # Sunday 2 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(self.sample_hours)
            assert result == False
    
    def test_is_open_now_exception_closed(self):
        """Test is_open_now on exception date when restaurant is closed."""
        # Mock current time to be Christmas
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 12, 25, 19, 0)  # Christmas 2 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(self.sample_hours)
            assert result == False
    
    def test_is_open_now_overnight_hours(self):
        """Test is_open_now with overnight hours."""
        overnight_hours = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "22:00", "close": "02:00"}],  # 10 PM to 2 AM
                "tue": [{"open": "22:00", "close": "02:00"}],
                "wed": [{"open": "22:00", "close": "02:00"}],
                "thu": [{"open": "22:00", "close": "02:00"}],
                "fri": [{"open": "22:00", "close": "02:00"}],
                "sat": [{"open": "22:00", "close": "02:00"}],
                "sun": [{"open": "22:00", "close": "02:00"}]
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        # Test during overnight hours (11 PM)
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 4, 0)  # Monday 11 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(overnight_hours)
            assert result == True
        
        # Test during closed hours (3 PM)
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 20, 0)  # Monday 3 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(overnight_hours)
            assert result == False
    
    def test_next_transition_open(self):
        """Test next_transition when restaurant is currently open."""
        # Mock current time to be during business hours
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 19, 0)  # Monday 2 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.next_transition(self.sample_hours)
            
            assert result is not None
            assert result["type"] == "close"
            assert "at" in result
            assert "local_time" in result
            assert "day" in result
    
    def test_next_transition_closed(self):
        """Test next_transition when restaurant is currently closed."""
        # Mock current time to be outside business hours
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 1, 0)  # Monday 8 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.next_transition(self.sample_hours)
            
            assert result is not None
            assert result["type"] == "open"
            assert "at" in result
            assert "local_time" in result
            assert "day" in result
    
    def test_todays_ranges_weekday(self):
        """Test todays_ranges for a weekday."""
        # Test Monday
        test_date = date(2025, 1, 6)  # Monday
        result = self.compute.todays_ranges(self.sample_hours, test_date)
        
        assert result == [{"open": "09:00", "close": "17:00"}]
    
    def test_todays_ranges_weekend(self):
        """Test todays_ranges for a weekend."""
        # Test Saturday
        test_date = date(2025, 1, 4)  # Saturday
        result = self.compute.todays_ranges(self.sample_hours, test_date)
        
        assert result == [{"open": "10:00", "close": "15:00"}]
    
    def test_todays_ranges_sunday(self):
        """Test todays_ranges for Sunday (closed)."""
        # Test Sunday
        test_date = date(2025, 1, 5)  # Sunday
        result = self.compute.todays_ranges(self.sample_hours, test_date)
        
        assert result == []
    
    def test_todays_ranges_exception_closed(self):
        """Test todays_ranges for exception date when closed."""
        # Test Christmas
        test_date = date(2025, 12, 25)  # Christmas
        result = self.compute.todays_ranges(self.sample_hours, test_date)
        
        assert result == []
    
    def test_todays_ranges_exception_hours(self):
        """Test todays_ranges for exception date with different hours."""
        hours_with_exception = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}],
                "thu": [{"open": "09:00", "close": "17:00"}],
                "fri": [{"open": "09:00", "close": "17:00"}],
                "sat": [{"open": "10:00", "close": "15:00"}],
                "sun": []
            },
            "exceptions": [
                {
                    "date": "2025-12-24",
                    "type": "hours",
                    "ranges": [{"open": "09:00", "close": "12:00"}],
                    "note": "Christmas Eve"
                }
            ],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        # Test Christmas Eve
        test_date = date(2025, 12, 24)  # Christmas Eve
        result = self.compute.todays_ranges(hours_with_exception, test_date)
        
        assert result == [{"open": "09:00", "close": "12:00"}]
    
    def test_get_weekly_hours(self):
        """Test get_weekly_hours."""
        result = self.compute.get_weekly_hours(self.sample_hours)
        
        assert result == self.sample_hours["weekly"]
    
    def test_get_exceptions(self):
        """Test get_exceptions."""
        # Mock current time
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 12, 20, 12, 0)  # Before Christmas
            mock_datetime.strptime = datetime.strptime
            
            result = self.compute.get_exceptions(self.sample_hours, days_ahead=14)
            
            assert len(result) == 1
            assert result[0]["date"] == "2025-12-25"
            assert result[0]["type"] == "closed"
    
    def test_format_hours_for_display(self):
        """Test format_hours_for_display."""
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 19, 0)  # Monday 2 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.format_hours_for_display(self.sample_hours)
            
            assert "timezone" in result
            assert "weekly" in result
            assert "exceptions" in result
            assert "status" in result
            assert "today" in result
            
            # Check status
            assert "open_now" in result["status"]
            assert "next" in result["status"]
            
            # Check today's ranges
            assert len(result["today"]) > 0
    
    def test_format_hours_for_display_empty(self):
        """Test format_hours_for_display with empty hours."""
        result = self.compute.format_hours_for_display({})
        
        assert result["timezone"] == "America/New_York"
        assert result["weekly"] == {}
        assert result["exceptions"] == []
        assert result["status"]["open_now"] == False
        assert result["today"] == []
    
    def test_is_time_between_same_day(self):
        """Test _is_time_between for same-day hours."""
        current = time(14, 0)  # 2 PM
        start = time(9, 0)     # 9 AM
        end = time(17, 0)      # 5 PM
        
        result = self.compute._is_time_between(current, start, end)
        assert result == True
        
        # Test outside hours
        current = time(8, 0)   # 8 AM
        result = self.compute._is_time_between(current, start, end)
        assert result == False
    
    def test_is_time_between_overnight(self):
        """Test _is_time_between for overnight hours."""
        # Overnight: 10 PM to 2 AM
        start = time(22, 0)  # 10 PM
        end = time(2, 0)     # 2 AM
        
        # Test during overnight hours
        current = time(23, 0)  # 11 PM
        result = self.compute._is_time_between(current, start, end)
        assert result == True
        
        current = time(1, 0)   # 1 AM
        result = self.compute._is_time_between(current, start, end)
        assert result == True
        
        # Test outside overnight hours
        current = time(15, 0)  # 3 PM
        result = self.compute._is_time_between(current, start, end)
        assert result == False
    
    def test_parse_time(self):
        """Test _parse_time."""
        assert self.compute._parse_time("09:00") == time(9, 0)
        assert self.compute._parse_time("23:59") == time(23, 59)
        assert self.compute._parse_time("00:00") == time(0, 0)
        
        # Test invalid format
        assert self.compute._parse_time("invalid") == time(0, 0)
    
    def test_format_time_for_display(self):
        """Test _format_time_for_display."""
        assert self.compute._format_time_for_display("09:00") == "9:00 AM"
        assert self.compute._format_time_for_display("12:00") == "12:00 PM"
        assert self.compute._format_time_for_display("13:30") == "1:30 PM"
        assert self.compute._format_time_for_display("00:00") == "12:00 AM"
        assert self.compute._format_time_for_display("23:59") == "11:59 PM"


class TestHoursComputeEdgeCases:
    """Test edge cases for HoursCompute service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.compute = HoursCompute()
    
    def test_empty_hours_document(self):
        """Test with empty hours document."""
        result = self.compute.is_open_now({})
        assert result == False
        
        result = self.compute.next_transition({})
        assert result is None
        
        result = self.compute.todays_ranges({}, date.today())
        assert result == []
    
    def test_missing_timezone(self):
        """Test with missing timezone."""
        hours_no_tz = {
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        result = self.compute.is_open_now(hours_no_tz)
        assert result == False
    
    def test_invalid_timezone(self):
        """Test with invalid timezone."""
        hours_invalid_tz = {
            "timezone": "Invalid/Timezone",
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        # Should handle gracefully
        result = self.compute.is_open_now(hours_invalid_tz)
        assert result == False
    
    def test_multiple_ranges_per_day(self):
        """Test with multiple time ranges per day."""
        hours_multiple_ranges = {
            "timezone": "America/New_York",
            "weekly": {
                "mon": [
                    {"open": "09:00", "close": "12:00"},
                    {"open": "13:00", "close": "17:00"}
                ],
                "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        # Test during first range
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 19, 0)  # Monday 10 AM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(hours_multiple_ranges)
            assert result == True
        
        # Test during second range
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 22, 0)  # Monday 3 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(hours_multiple_ranges)
            assert result == True
        
        # Test during closed period
        with patch('services.hours_compute.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2025, 1, 6, 20, 0)  # Monday 12:30 PM EST
            mock_datetime.combine = datetime.combine
            mock_datetime.time = time
            
            result = self.compute.is_open_now(hours_multiple_ranges)
            assert result == False


if __name__ == "__main__":
    pytest.main([__file__])
