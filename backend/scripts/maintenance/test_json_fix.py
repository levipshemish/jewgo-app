#!/usr/bin/env python3
"""Test JSON Parsing Fix.
======================

This script tests the enhanced _safe_json_loads method to ensure it can handle
both JSON and Python literal formats.

Author: JewGo Development Team
Version: 1.0
"""

import ast
import json
from typing import Any, Optional


def _safe_json_loads(json_str: Optional[str], default_value: Any) -> Any:
    """Safely parse JSON string or Python literal with fallback to default value."""
    if not json_str:
        return default_value

    # Handle non-string inputs (e.g., already parsed JSON objects)
    if not isinstance(json_str, str):
        # If it's already a list, dict, or other JSON-compatible type, return as is
        if isinstance(json_str, (list, dict, int, float, bool)) or json_str is None:
            return json_str
        print(f"Non-string JSON input: {type(json_str)}, using default value")
        return default_value

    # Remove leading/trailing whitespace
    json_str = json_str.strip()

    # Handle empty strings
    if not json_str:
        return default_value

    # First try to parse as JSON
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        # If JSON parsing fails, try to parse as Python literal (handles single quotes)
        try:
            parsed_data = ast.literal_eval(json_str)
            return parsed_data
        except (ValueError, SyntaxError) as e:
            # Log the specific error and the problematic string (truncated)
            json_preview = json_str[:100] + "..." if len(json_str) > 100 else json_str
            print(
                f"Failed to parse JSON or Python literal: {e}, using default value. JSON preview: {json_preview}"
            )
            return default_value


def test_json_parsing():
    """Test the enhanced JSON parsing function."""

    # Test cases based on the actual error messages
    test_cases = [
        # Python dict strings (single quotes) - these were causing the warnings
        (
            "{'reviews': [{'google_review_id': 1751326235, 'author_name': 'Anthony Goon', 'author_url': 'https://...'}]}",
            "Python dict with single quotes",
        ),
        (
            "{'reviews': [{'google_review_id': 1751588673, 'author_name': 'Steven Marks', 'author_url': 'https://...'}]}",
            "Python dict with single quotes 2",
        ),
        # Proper JSON strings (double quotes)
        (
            '{"reviews": [{"google_review_id": 1751326235, "author_name": "Anthony Goon", "author_url": "https://..."}]}',
            "Proper JSON with double quotes",
        ),
        # Empty or None values
        (None, "None value"),
        ("", "Empty string"),
        ("   ", "Whitespace only"),
        # Already parsed objects
        ({"test": "value"}, "Already parsed dict"),
        ([1, 2, 3], "Already parsed list"),
        # Invalid strings
        ("invalid json string", "Invalid JSON string"),
    ]

    print("Testing enhanced JSON parsing function...")
    print("=" * 50)

    success_count = 0
    total_count = len(test_cases)

    for test_data, description in test_cases:
        try:
            result = _safe_json_loads(test_data, [])
            print(f"✅ {description}: {type(result)} = {result}")
            success_count += 1
        except Exception as e:
            print(f"❌ {description}: Error - {e}")

    print("=" * 50)
    print(
        f"Success rate: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)"
    )

    if success_count == total_count:
        print("🎉 All test cases passed! The JSON parsing fix is working correctly.")
    else:
        print("⚠️  Some test cases failed. Please review the implementation.")

    return success_count == total_count


if __name__ == "__main__":
    test_json_parsing()
