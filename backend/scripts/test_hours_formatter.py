#!/usr/bin/env python3
"""Test script for HoursFormatter functionality."""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.hours_formatter import HoursFormatter

def test_from_google_places():
    """Test the from_google_places method."""
    print("Testing from_google_places method...")
    
    # Test case 1: Normal Google Places format
    opening_hours = {
        "weekday_text": [
            "Monday: 11:00 AM – 10:00 PM",
            "Tuesday: 11:00 AM – 10:00 PM",
            "Wednesday: 11:00 AM – 10:00 PM",
            "Thursday: 11:00 AM – 10:00 PM",
            "Friday: 11:00 AM – 11:00 PM",
            "Saturday: 12:00 PM – 11:00 PM",
            "Sunday: 12:00 PM – 9:00 PM"
        ]
    }
    
    result = HoursFormatter.from_google_places(opening_hours)
    expected = "Mon 11:00 AM – 10:00 PM, Tue 11:00 AM – 10:00 PM, Wed 11:00 AM – 10:00 PM, Thu 11:00 AM – 10:00 PM, Fri 11:00 AM – 11:00 PM, Sat 12:00 PM – 11:00 PM, Sun 12:00 PM – 9:00 PM"
    
    print(f"Result: {result}")
    print(f"Expected: {expected}")
    print(f"✅ Test passed: {result == expected}")
    
    # Test case 2: Empty input
    result2 = HoursFormatter.from_google_places({})
    print(f"Empty input result: '{result2}'")
    print(f"✅ Test passed: {result2 == ''}")
    
    # Test case 3: Missing weekday_text
    result3 = HoursFormatter.from_google_places({"other_field": "value"})
    print(f"Missing weekday_text result: '{result3}'")
    print(f"✅ Test passed: {result3 == ''}")

def test_to_text():
    """Test the to_text method."""
    print("\nTesting to_text method...")
    
    opening_hours = {
        "weekday_text": [
            "Monday: 11:00 AM – 10:00 PM",
            "Tuesday: 11:00 AM – 10:00 PM",
            "Wednesday: 11:00 AM – 10:00 PM"
        ]
    }
    
    result = HoursFormatter.to_text(opening_hours)
    expected = "Monday: 11:00 AM – 10:00 PM\nTuesday: 11:00 AM – 10:00 PM\nWednesday: 11:00 AM – 10:00 PM"
    
    print(f"Result:\n{result}")
    print(f"Expected:\n{expected}")
    print(f"✅ Test passed: {result == expected}")

def test_for_ui():
    """Test the for_ui method."""
    print("\nTesting for_ui method...")
    
    # Test hours JSON format
    hours_json = {
        "hours": {
            "mon": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "tue": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "wed": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "thu": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "fri": {"open": "11:00 AM", "close": "11:00 PM", "is_open": True},
            "sat": {"open": "12:00 PM", "close": "11:00 PM", "is_open": True},
            "sun": {"open": "", "close": "", "is_open": False}
        }
    }
    
    # Test dropdown format
    dropdown_result = HoursFormatter.for_ui(hours_json, "dropdown")
    print(f"Dropdown format: {len(dropdown_result)} items")
    print(f"✅ Test passed: {len(dropdown_result) == 7}")
    
    # Test compact format
    compact_result = HoursFormatter.for_ui(hours_json, "compact")
    print(f"Compact format: {compact_result}")
    print(f"✅ Test passed: {len(compact_result) > 0}")
    
    # Test today format
    today_result = HoursFormatter.for_ui(hours_json, "today")
    print(f"Today format: {today_result}")
    print(f"✅ Test passed: {isinstance(today_result, dict)}")

def test_for_display():
    """Test the for_display method."""
    print("\nTesting for_display method...")
    
    hours_doc = {
        "hours": {
            "mon": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "tue": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "wed": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "thu": {"open": "11:00 AM", "close": "10:00 PM", "is_open": True},
            "fri": {"open": "11:00 AM", "close": "11:00 PM", "is_open": True},
            "sat": {"open": "12:00 PM", "close": "11:00 PM", "is_open": True},
            "sun": {"open": "", "close": "", "is_open": False}
        },
        "timezone": "America/New_York",
        "last_updated": "2024-01-15T10:30:00Z"
    }
    
    result = HoursFormatter.for_display(hours_doc)
    
    print(f"Display format keys: {list(result.keys())}")
    expected_keys = ["status", "is_open", "message", "today_hours", "formatted_hours", "timezone", "last_updated"]
    print(f"✅ Test passed: {all(key in result for key in expected_keys)}")
    
    # Test empty input
    empty_result = HoursFormatter.for_display({})
    print(f"Empty input result: {empty_result}")
    print(f"✅ Test passed: {empty_result['status'] == 'unknown'}")

def test_edge_cases():
    """Test edge cases and error handling."""
    print("\nTesting edge cases...")
    
    # Test None input
    result1 = HoursFormatter.from_google_places(None)
    print(f"None input result: '{result1}'")
    print(f"✅ Test passed: {result1 == ''}")
    
    # Test malformed input
    result2 = HoursFormatter.from_google_places({"weekday_text": ["Invalid format"]})
    print(f"Malformed input result: '{result2}'")
    print(f"✅ Test passed: {result2 == ''}")
    
    # Test empty weekday_text
    result3 = HoursFormatter.from_google_places({"weekday_text": []})
    print(f"Empty weekday_text result: '{result3}'")
    print(f"✅ Test passed: {result3 == ''}")

def main():
    """Run all tests."""
    print("🧪 Testing HoursFormatter functionality...\n")
    
    try:
        test_from_google_places()
        test_to_text()
        test_for_ui()
        test_for_display()
        test_edge_cases()
        
        print("\n🎉 All tests completed successfully!")
        print("✅ HoursFormatter is working correctly")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
