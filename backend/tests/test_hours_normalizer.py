import json
import pytest
from datetime import datetime
from unittest.mock import patch

    from services.hours_normalizer import HoursNormalizer, hours_normalizer
    import sys
    import os
    from services.hours_normalizer import HoursNormalizer, hours_normalizer






#!/usr/bin/env python3
"""Tests for Hours Normalizer Service."""

# Import the service
try:
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
class TestHoursNormalizer:
    """Test cases for HoursNormalizer service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.normalizer = HoursNormalizer()
        self.timezone = "America/New_York"
    
    def test_normalize_from_google_valid_data(self):
        """Test normalizing valid Google Places hours data."""
        google_hours = {
            "periods": [
                {
                    "open": {"day": 1, "time": "0900"},  # Monday 9:00 AM
                    "close": {"day": 1, "time": "1700"}  # Monday 5:00 PM
                },
                {
                    "open": {"day": 2, "time": "0900"},  # Tuesday 9:00 AM
                    "close": {"day": 2, "time": "1700"}  # Tuesday 5:00 PM
                }
            ],
            "place_id": "test_place_id"
        }
        
        result = self.normalizer.normalize_from_google(google_hours, self.timezone)
        
        assert result["timezone"] == self.timezone
        assert result["weekly"]["mon"] == [{"open": "09:00", "close": "17:00"}]
        assert result["weekly"]["tue"] == [{"open": "09:00", "close": "17:00"}]
        assert result["weekly"]["wed"] == []
        assert result["source"]["google_places"]["place_id"] == "test_place_id"
    
    def test_normalize_from_google_overnight_hours(self):
        """Test normalizing Google hours with overnight spans."""
        google_hours = {
            "periods": [
                {
                    "open": {"day": 5, "time": "2200"},  # Friday 10:00 PM
                    "close": {"day": 6, "time": "0200"}  # Saturday 2:00 AM
                }
            ]
        }
        
        result = self.normalizer.normalize_from_google(google_hours, self.timezone)
        
        # Should split overnight hours across days
        assert result["weekly"]["fri"] == [{"open": "22:00", "close": "23:59"}]
        assert result["weekly"]["sat"] == [{"open": "00:00", "close": "02:00"}]
    
    def test_normalize_from_google_empty_data(self):
        """Test normalizing empty Google hours data."""
        result = self.normalizer.normalize_from_google({}, self.timezone)
        
        assert result["timezone"] == self.timezone
        assert all(day == [] for day in result["weekly"].values())
        assert result["exceptions"] == []
    
    def test_normalize_from_orb_valid_string(self):
        """Test normalizing ORB hours from string."""
        orb_hours = "Mon-Fri: 9AM-5PM, Sat: 10AM-3PM"
        
        result = self.normalizer.normalize_from_orb(orb_hours, self.timezone)
        
        assert result["timezone"] == self.timezone
        # Should parse the hours correctly
        assert len(result["weekly"]["mon"]) > 0
        assert len(result["weekly"]["sat"]) > 0
    
    def test_normalize_from_orb_dict_data(self):
        """Test normalizing ORB hours from dictionary."""
        orb_data = {
            "hours": "Mon-Fri: 9AM-5PM",
            "cert_url": "https://example.com/cert"
        }
        
        result = self.normalizer.normalize_from_orb(orb_data, self.timezone)
        
        assert result["timezone"] == self.timezone
        assert result["source"]["orb"]["cert_url"] == "https://example.com/cert"
    
    def test_normalize_from_manual_valid_data(self):
        """Test normalizing manually entered hours data."""
        manual_data = {
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}]
            },
            "exceptions": [
                {"date": "2025-12-25", "type": "closed", "note": "Christmas"}
            ]
        }
        
        result = self.normalizer.normalize_from_manual(manual_data, self.timezone, "admin@test.com")
        
        assert result["timezone"] == self.timezone
        assert result["weekly"]["mon"] == [{"open": "09:00", "close": "17:00"}]
        assert result["exceptions"] == [{"date": "2025-12-25", "type": "closed", "note": "Christmas"}]
        assert result["source"]["manual"]["updated_by"] == "admin@test.com"
    
    def test_merge_hours_prefer_incoming(self):
        """Test merging hours with prefer-incoming strategy."""
        base = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}]
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "base"}}
        }
        
        incoming = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "10:00", "close": "18:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}]
            },
            "exceptions": [{"date": "2025-12-25", "type": "closed"}],
            "source": {"manual": {"updated_by": "incoming"}}
        }
        
        result = self.normalizer.merge_hours(base, incoming, "prefer-incoming")
        
        # Should use incoming data for mon and wed, keep base for tue
        assert result["weekly"]["mon"] == [{"open": "10:00", "close": "18:00"}]
        assert result["weekly"]["tue"] == [{"open": "09:00", "close": "17:00"}]
        assert result["weekly"]["wed"] == [{"open": "09:00", "close": "17:00"}]
        assert len(result["exceptions"]) == 1
    
    def test_validate_hours_valid_data(self):
        """Test validating valid hours data."""
        valid_hours = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}],
                "thu": [{"open": "09:00", "close": "17:00"}],
                "fri": [{"open": "09:00", "close": "17:00"}],
                "sat": [],
                "sun": []
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        # Should not raise an exception
        self.normalizer.validate_hours(valid_hours)
    
    def test_validate_hours_invalid_timezone(self):
        """Test validating hours with invalid timezone."""
        invalid_hours = {
            "timezone": "",  # Empty timezone
            "weekly": {"mon": [], "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []},
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        with pytest.raises(ValueError, match="Invalid timezone"):
            self.normalizer.validate_hours(invalid_hours)
    
    def test_validate_hours_invalid_time_format(self):
        """Test validating hours with invalid time format."""
        invalid_hours = {
            "timezone": self.timezone,
            "weekly": {
                "mon": [{"open": "25:00", "close": "17:00"}],  # Invalid hour
                "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []
            },
            "exceptions": [],
            "source": {"manual": {"updated_by": "test"}}
        }
        
        with pytest.raises(ValueError, match="Invalid open time format"):
            self.normalizer.validate_hours(invalid_hours)
    
    def test_parse_hours_string_24_7(self):
        """Test parsing 'Open 24/7' hours string."""
        hours_str = "Open 24/7"
        result = self.normalizer._parse_hours_string(hours_str)
        
        for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]:
            assert result[day] == [{"open": "00:00", "close": "23:59"}]
    
    def test_parse_hours_string_mon_fri(self):
        """Test parsing 'Mon-Fri: 9AM-5PM' hours string."""
        hours_str = "Mon-Fri: 9AM-5PM"
        result = self.normalizer._parse_hours_string(hours_str)
        
        # Should have hours for Mon-Fri
        for day in ["mon", "tue", "wed", "thu", "fri"]:
            assert len(result[day]) > 0
        
        # Should be empty for weekend
        assert result["sat"] == []
        assert result["sun"] == []
    
    def test_parse_hours_string_complex(self):
        """Test parsing complex hours string."""
        hours_str = "Mon-Fri: 9AM-5PM, Sat: 10AM-3PM, Sun: Closed"
        result = self.normalizer._parse_hours_string(hours_str)
        
        # Weekdays should have hours
        for day in ["mon", "tue", "wed", "thu", "fri"]:
            assert len(result[day]) > 0
        
        # Saturday should have hours
        assert len(result["sat"]) > 0
        
        # Sunday should be empty (closed)
        assert result["sun"] == []
    
    def test_is_valid_time_format(self):
        """Test time format validation."""
        assert self.normalizer._is_valid_time_format("09:00") == True
        assert self.normalizer._is_valid_time_format("23:59") == True
        assert self.normalizer._is_valid_time_format("00:00") == True
        
        assert self.normalizer._is_valid_time_format("25:00") == False  # Invalid hour
        assert self.normalizer._is_valid_time_format("09:60") == False  # Invalid minute
        assert self.normalizer._is_valid_time_format("9:00") == False   # Wrong format
        assert self.normalizer._is_valid_time_format("") == False       # Empty
    
    def test_create_empty_hours(self):
        """Test creating empty hours structure."""
        result = self.normalizer._create_empty_hours(self.timezone, "test_source", "test error")
        
        assert result["timezone"] == self.timezone
        assert all(day == [] for day in result["weekly"].values())
        assert result["exceptions"] == []
        assert result["source"]["test_source"]["error"] == "test error"


class TestHoursNormalizerIntegration:
    """Integration tests for hours normalizer."""
    
    def test_end_to_end_google_normalization(self):
        """Test complete Google hours normalization workflow."""
        normalizer = HoursNormalizer()
        
        # Simulate Google Places API response
        google_response = {
            "periods": [
                {"open": {"day": 1, "time": "0900"}, "close": {"day": 1, "time": "1700"}},
                {"open": {"day": 2, "time": "0900"}, "close": {"day": 2, "time": "1700"}},
                {"open": {"day": 3, "time": "0900"}, "close": {"day": 3, "time": "1700"}},
                {"open": {"day": 4, "time": "0900"}, "close": {"day": 4, "time": "1700"}},
                {"open": {"day": 5, "time": "0900"}, "close": {"day": 5, "time": "1700"}},
                {"open": {"day": 6, "time": "1000"}, "close": {"day": 6, "time": "1500"}}
            ],
            "place_id": "test_place"
        }
        
        # Normalize
        normalized = normalizer.normalize_from_google(google_response, "America/New_York")
        
        # Validate
        normalizer.validate_hours(normalized)
        
        # Check structure
        assert normalized["timezone"] == "America/New_York"
        assert normalized["weekly"]["mon"] == [{"open": "09:00", "close": "17:00"}]
        assert normalized["weekly"]["sat"] == [{"open": "10:00", "close": "15:00"}]
        assert normalized["weekly"]["sun"] == []  # Sunday not in Google data
        assert normalized["source"]["google_places"]["place_id"] == "test_place"
    
    def test_end_to_end_orb_normalization(self):
        """Test complete ORB hours normalization workflow."""
        normalizer = HoursNormalizer()
        
        # Simulate ORB hours string
        orb_hours = "Monday-Friday: 9:00 AM - 5:00 PM, Saturday: 10:00 AM - 3:00 PM"
        
        # Normalize
        normalized = normalizer.normalize_from_orb(orb_hours, "America/New_York")
        
        # Validate
        normalizer.validate_hours(normalized)
        
        # Check structure
        assert normalized["timezone"] == "America/New_York"
        assert len(normalized["weekly"]["mon"]) > 0
        assert len(normalized["weekly"]["sat"]) > 0
        assert normalized["weekly"]["sun"] == []  # Sunday not mentioned
        assert "orb" in normalized["source"]
    
    def test_merge_strategies(self):
        """Test different merge strategies."""
        normalizer = HoursNormalizer()
        
        base = {
            "timezone": "America/New_York",
            "weekly": {
                "mon": [{"open": "09:00", "close": "17:00"}],
                "tue": [{"open": "09:00", "close": "17:00"}]
            },
            "exceptions": [{"date": "2025-01-01", "type": "closed"}],
            "source": {"manual": {"updated_by": "base"}}
        }
        
        incoming = {
            "timezone": "America/New_York",
            "weekly": {
                "mon": [{"open": "10:00", "close": "18:00"}],
                "wed": [{"open": "09:00", "close": "17:00"}]
            },
            "exceptions": [{"date": "2025-12-25", "type": "closed"}],
            "source": {"manual": {"updated_by": "incoming"}}
        }
        
        # Test prefer-incoming
        result1 = normalizer.merge_hours(base, incoming, "prefer-incoming")
        assert result1["weekly"]["mon"] == [{"open": "10:00", "close": "18:00"}]
        assert result1["weekly"]["tue"] == [{"open": "09:00", "close": "17:00"}]
        assert len(result1["exceptions"]) == 2
        
        # Test prefer-base
        result2 = normalizer.merge_hours(base, incoming, "prefer-base")
        assert result2["weekly"]["mon"] == [{"open": "09:00", "close": "17:00"}]
        assert result2["weekly"]["wed"] == [{"open": "09:00", "close": "17:00"}]
        assert len(result2["exceptions"]) == 2


if __name__ == "__main__":
    pytest.main([__file__])
