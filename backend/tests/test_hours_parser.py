import pytest
from utils.hours_parser import parse_hours_blob, _normalize_hours_text, validate_hours_format






#!/usr/bin/env python3
"""Hours Parser Tests for JewGo Backend.
======================================

Tests for robust hours parsing from various formats including JSON and human-readable text.

Author: JewGo Development Team
Version: 1.0
"""

def test_parse_json_hours():
    """Test parsing JSON hours format."""
    blob = '{"Monday":["09:00-17:00"],"Tuesday":["10:00-18:00"]}'
    out = parse_hours_blob(blob)
    assert out["Monday"] == ["09:00-17:00"]
    assert out["Tuesday"] == ["10:00-18:00"]


def test_parse_human_readable_hours():
    """Test parsing human-readable hours format."""
    blob = """Monday: 5:00 – 11:00 PM
Tuesday: 5:00 – 11:00 PM
Friday: 6:30 – 10:00 PM
Saturday: 11:30 AM – 2:00 PM"""
    
    out = parse_hours_blob(blob)
    assert "Monday" in out and out["Monday"]
    assert "Tuesday" in out and out["Tuesday"]
    assert "Friday" in out and out["Friday"]
    assert "Saturday" in out and out["Saturday"]


def test_parse_hours_with_unicode_characters():
    """Test parsing hours with Unicode characters."""
    blob = """Monday: 5:00\u202f–\u200911:00 PM
Tuesday: 5:00\u00a0–\u200a11:00 PM"""
    
    out = parse_hours_blob(blob)
    assert "Monday" in out and out["Monday"]
    assert "Tuesday" in out and out["Tuesday"]


def test_parse_hours_with_multiple_ranges():
    """Test parsing hours with multiple time ranges per day."""
    blob = """Monday: 9:00 AM - 2:00 PM, 5:00 PM - 10:00 PM
Tuesday: 9:00 AM - 2:00 PM"""
    
    out = parse_hours_blob(blob)
    assert len(out["Monday"]) == 2
    assert len(out["Tuesday"]) == 1


def test_parse_empty_hours():
    """Test parsing empty hours data."""
    out = parse_hours_blob("")
    assert out == {}
    
    out = parse_hours_blob(None)
    assert out == {}


def test_parse_invalid_json():
    """Test parsing invalid JSON falls back to text parsing."""
    blob = "Monday: 9:00 AM - 5:00 PM"
    out = parse_hours_blob(blob)
    assert "Monday" in out and out["Monday"]


def test_parse_malformed_text():
    """Test parsing malformed text returns empty dict."""
    blob = "Invalid hours format"
    out = parse_hours_blob(blob)
    assert out == {}


def test_normalize_hours_text():
    """Test Unicode normalization in hours text."""
    # Test Unicode spaces
    text = "Monday:\u00a09:00\u202fAM\u2009–\u200a5:00\u2007PM"
    normalized = _normalize_hours_text(text)
    assert "\u00a0" not in normalized
    assert "\u202f" not in normalized
    assert "\u2009" not in normalized
    assert "\u2007" not in normalized
    assert "Monday: 9:00 AM - 5:00 PM" in normalized
    
    # Test Unicode dashes
    text = "Monday: 9:00 AM\u2013 5:00 PM"
    normalized = _normalize_hours_text(text)
    assert "\u2013" not in normalized
    assert "Monday: 9:00 AM - 5:00 PM" in normalized


def test_validate_hours_format_json():
    """Test validation of JSON hours format."""
    hours_data = '{"Monday":["09:00-17:00"]}'
    result = validate_hours_format(hours_data)
    assert result["valid"] is True
    assert result["format"] == "json"
    assert "Monday" in result["data"]


def test_validate_hours_format_text():
    """Test validation of text hours format."""
    hours_data = "Monday: 9:00 AM - 5:00 PM"
    result = validate_hours_format(hours_data)
    assert result["valid"] is True
    assert result["format"] == "text"
    assert "Monday" in result["data"]


def test_validate_hours_format_dict():
    """Test validation of dict hours format."""
    hours_data = {"Monday": ["09:00-17:00"]}
    result = validate_hours_format(hours_data)
    assert result["valid"] is True
    assert result["format"] == "dict"
    assert "Monday" in result["data"]


def test_validate_hours_format_invalid():
    """Test validation of invalid hours format."""
    hours_data = "Invalid format"
    result = validate_hours_format(hours_data)
    assert result["valid"] is False
    assert "error" in result


def test_validate_hours_format_empty():
    """Test validation of empty hours data."""
    result = validate_hours_format("")
    assert result["valid"] is False
    assert "No hours data provided" in result["error"]


def test_validate_hours_format_wrong_type():
    """Test validation of wrong data type."""
    result = validate_hours_format(123)
    assert result["valid"] is False
    assert "Unsupported data type" in result["error"]


def test_parse_hours_case_insensitive():
    """Test that day names are case insensitive."""
    blob = """monday: 9:00 AM - 5:00 PM
TUESDAY: 10:00 AM - 6:00 PM
Wednesday: 11:00 AM - 7:00 PM"""
    
    out = parse_hours_blob(blob)
    assert "Monday" in out and out["Monday"]
    assert "Tuesday" in out and out["Tuesday"]
    assert "Wednesday" in out and out["Wednesday"]


def test_parse_hours_with_extra_whitespace():
    """Test parsing hours with extra whitespace."""
    blob = """  Monday  :  9:00 AM  -  5:00 PM  
  Tuesday  :  10:00 AM  -  6:00 PM  """
    
    out = parse_hours_blob(blob)
    assert "Monday" in out and out["Monday"]
    assert "Tuesday" in out and out["Tuesday"]
