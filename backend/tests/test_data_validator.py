#!/usr/bin/env python3
"""Test Data Validator Unification.
==============================

Tests for unified data validation patterns to ensure consistency
across all validation functions.

Author: JewGo Development Team
Version: 1.0
"""

import json
from typing import Any, Dict

import pytest
from utils.data_validator import (
    DataValidator,
    sanitize_string,
    validate_email,
    validate_phone_number,
    validate_restaurant_data,
    validate_review_data,
    validate_url,
    validate_user_data,
)
from utils.error_handler import ValidationError


class TestDataValidatorClass:
    """Test the core DataValidator class."""

    def test_validate_required_fields_success(self):
        """Test successful required fields validation."""
        data = {"name": "Test", "email": "test@example.com"}
        required_fields = ["name", "email"]

        # Should not raise an exception
        DataValidator.validate_required_fields(data, required_fields)

    def test_validate_required_fields_missing(self):
        """Test required fields validation with missing fields."""
        data = {"name": "Test"}
        required_fields = ["name", "email"]

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_required_fields(data, required_fields)

        assert "Missing required fields" in str(exc_info.value)
        assert "email" in exc_info.value.details["missing_fields"]

    def test_validate_required_fields_empty_string(self):
        """Test required fields validation with empty string."""
        data = {"name": "Test", "email": ""}
        required_fields = ["name", "email"]

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_required_fields(data, required_fields)

        assert "email" in exc_info.value.details["missing_fields"]

    def test_validate_field_types_success(self):
        """Test successful field types validation."""
        data = {"name": "Test", "age": 25}
        field_types = {"name": str, "age": int}

        # Should not raise an exception
        DataValidator.validate_field_types(data, field_types)

    def test_validate_field_types_mismatch(self):
        """Test field types validation with type mismatch."""
        data = {"name": "Test", "age": "25"}
        field_types = {"name": str, "age": int}

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_field_types(data, field_types)

        assert "Type validation failed" in str(exc_info.value)
        assert "age: expected int" in exc_info.value.details["type_errors"][0]


class TestEmailValidation:
    """Test email validation functions."""

    def test_validate_email_valid(self):
        """Test valid email addresses."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "123@example.com",
        ]

        for email in valid_emails:
            assert DataValidator.validate_email(email) is True
            assert validate_email(email) is True

    def test_validate_email_invalid(self):
        """Test invalid email addresses."""
        invalid_emails = [
            "",
            "invalid-email",
            "@example.com",
            "test@",
            "test..test@example.com",
            "test@.com",
            None,
            123,
        ]

        for email in invalid_emails:
            assert DataValidator.validate_email(email) is False
            assert validate_email(email) is False

    def test_validate_email_edge_cases(self):
        """Test email validation edge cases."""
        # Whitespace should be handled
        assert DataValidator.validate_email("  test@example.com  ") is True

        # Very long email
        long_email = "a" * 50 + "@" + "b" * 50 + ".com"
        assert DataValidator.validate_email(long_email) is True


class TestPhoneNumberValidation:
    """Test phone number validation functions."""

    def test_validate_phone_number_valid(self):
        """Test valid phone numbers."""
        valid_phones = [
            "1234567890",
            "+1234567890",
            "+1-234-567-8900",
            "(234) 567-8900",
            "234.567.8900",
            "+44 20 7946 0958",
        ]

        for phone in valid_phones:
            assert DataValidator.validate_phone_number(phone) is True
            assert validate_phone_number(phone) is True

    def test_validate_phone_number_invalid(self):
        """Test invalid phone numbers."""
        invalid_phones = ["", "123", "abcdefghij", "123-456-789", None, 1234567890]

        for phone in invalid_phones:
            assert DataValidator.validate_phone_number(phone) is False
            assert validate_phone_number(phone) is False


class TestURLValidation:
    """Test URL validation functions."""

    def test_validate_url_valid(self):
        """Test valid URLs."""
        valid_urls = [
            "https://example.com",
            "http://example.com",
            "https://www.example.com/path",
            "https://example.com:8080",
            "http://localhost:3000",
            "https://sub.domain.example.com",
        ]

        for url in valid_urls:
            assert DataValidator.validate_url(url) is True
            assert validate_url(url) is True

    def test_validate_url_invalid(self):
        """Test invalid URLs."""
        invalid_urls = ["", "not-a-url", "ftp://example.com", "example.com", None, 123]

        for url in invalid_urls:
            assert DataValidator.validate_url(url) is False
            assert validate_url(url) is False

    def test_validate_url_require_https(self):
        """Test URL validation with HTTPS requirement."""
        assert (
            DataValidator.validate_url("https://example.com", require_https=True)
            is True
        )
        assert (
            DataValidator.validate_url("http://example.com", require_https=True)
            is False
        )


class TestKosherCategoryValidation:
    """Test kosher category validation."""

    def test_validate_kosher_category_valid(self):
        """Test valid kosher categories."""
        valid_categories = ["meat", "dairy", "pareve", "MEAT", "Dairy", "PAREVE"]

        for category in valid_categories:
            assert DataValidator.validate_kosher_category(category) is True

    def test_validate_kosher_category_invalid(self):
        """Test invalid kosher categories."""
        invalid_categories = ["", "invalid", "fish", "vegetarian", None, 123]

        for category in invalid_categories:
            assert DataValidator.validate_kosher_category(category) is False


class TestRestaurantDataValidation:
    """Test restaurant data validation."""

    def test_validate_restaurant_data_valid(self):
        """Test valid restaurant data."""
        valid_data = {
            "name": "Test Restaurant",
            "address": "123 Main St",
            "city": "Miami",
            "state": "FL",
            "zip_code": "33101",
            "phone_number": "305-555-1234",
            "kosher_category": "dairy",
            "listing_type": "restaurant",
            "email": "test@example.com",
            "website": "https://example.com",
        }

        result = DataValidator.validate_restaurant_data(valid_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

        # Test convenience function
        result = validate_restaurant_data(valid_data)
        assert result["valid"] is True

    def test_validate_restaurant_data_missing_required(self):
        """Test restaurant data validation with missing required fields."""
        invalid_data = {
            "name": "Test Restaurant",
            "address": "123 Main St"
            # Missing required fields
        }

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_restaurant_data(invalid_data)

        assert "Restaurant validation failed" in str(exc_info.value)
        assert "city" in exc_info.value.details["errors"]
        assert "state" in exc_info.value.details["errors"]

    def test_validate_restaurant_data_invalid_fields(self):
        """Test restaurant data validation with invalid field values."""
        invalid_data = {
            "name": "Test Restaurant",
            "address": "123 Main St",
            "city": "Miami",
            "state": "FL",
            "zip_code": "33101",
            "phone_number": "305-555-1234",
            "kosher_category": "dairy",
            "listing_type": "restaurant",
            "email": "invalid-email",
            "website": "not-a-url",
            "rating": 6.0,  # Invalid rating
        }

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_restaurant_data(invalid_data)

        assert "Invalid email format" in exc_info.value.details["errors"]
        assert "Invalid website URL" in exc_info.value.details["errors"]
        assert "Rating must be between 0 and 5" in exc_info.value.details["errors"]

    def test_validate_restaurant_data_strict_mode(self):
        """Test restaurant data validation in strict mode."""
        data = {
            "name": "Test Restaurant",
            "address": "123 Main St",
            "city": "Miami",
            "state": "FL",
            "zip_code": "33101",
            "phone_number": "305-555-1234",
            "kosher_category": "dairy",
            "listing_type": "restaurant"
            # Missing optional fields
        }

        result = DataValidator.validate_restaurant_data(data, strict=True)
        assert result["valid"] is True
        assert len(result["warnings"]) > 0
        assert "Short description is recommended" in result["warnings"]


class TestReviewDataValidation:
    """Test review data validation."""

    def test_validate_review_data_valid(self):
        """Test valid review data."""
        valid_data = {
            "restaurant_id": 123,
            "rating": 5,
            "content": "This is a great restaurant with excellent food and service.",
            "user_email": "user@example.com",
            "title": "Great Experience",
            "images": ["https://example.com/image1.jpg"],
        }

        result = DataValidator.validate_review_data(valid_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

        # Test convenience function
        result = validate_review_data(valid_data)
        assert result["valid"] is True

    def test_validate_review_data_invalid(self):
        """Test review data validation with invalid data."""
        invalid_data = {
            "restaurant_id": 0,  # Invalid ID
            "rating": 6,  # Invalid rating
            "content": "Short",  # Too short
            "user_email": "invalid-email",
            "images": ["not-a-url"],
        }

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_review_data(invalid_data)

        assert "Invalid restaurant ID" in exc_info.value.details["errors"]
        assert "Rating must be between 1 and 5" in exc_info.value.details["errors"]
        assert (
            "Review content must be at least 10 characters"
            in exc_info.value.details["errors"]
        )
        assert "Invalid email format" in exc_info.value.details["errors"]
        assert "Invalid image URL" in exc_info.value.details["errors"]


class TestUserDataValidation:
    """Test user data validation."""

    def test_validate_user_data_valid(self):
        """Test valid user data."""
        valid_data = {
            "email": "user@example.com",
            "name": "John Doe",
            "phone": "305-555-1234",
            "role": "user",
        }

        result = DataValidator.validate_user_data(valid_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

        # Test convenience function
        result = validate_user_data(valid_data)
        assert result["valid"] is True

    def test_validate_user_data_invalid(self):
        """Test user data validation with invalid data."""
        invalid_data = {
            "email": "invalid-email",
            "name": "A",  # Too short
            "phone": "invalid-phone",
            "role": "invalid-role",
        }

        with pytest.raises(ValidationError) as exc_info:
            DataValidator.validate_user_data(invalid_data)

        assert "Invalid email format" in exc_info.value.details["errors"]
        assert "Name must be at least 2 characters" in exc_info.value.details["errors"]
        assert "Invalid phone number format" in exc_info.value.details["errors"]
        assert "Invalid role" in exc_info.value.details["errors"]


class TestHoursValidation:
    """Test hours validation."""

    def test_validate_hours_format_json(self):
        """Test hours validation with JSON format."""
        hours_json = json.dumps(
            {
                "hours": {
                    "mon": {"open": "09:00", "close": "17:00", "is_open": True},
                    "tue": {"open": "09:00", "close": "17:00", "is_open": True},
                }
            }
        )

        result = DataValidator.validate_hours_format(hours_json)
        assert result["valid"] is True
        assert result["format"] == "json"

    def test_validate_hours_format_text(self):
        """Test hours validation with text format."""
        hours_text = "Monday: 9:00 AM - 5:00 PM, Tuesday: 9:00 AM - 5:00 PM"

        result = DataValidator.validate_hours_format(hours_text)
        assert result["valid"] is True
        assert result["format"] == "text"

    def test_validate_hours_format_dict(self):
        """Test hours validation with dictionary format."""
        hours_dict = {
            "hours": {"mon": {"open": "09:00", "close": "17:00", "is_open": True}}
        }

        result = DataValidator.validate_hours_format(hours_dict)
        assert result["valid"] is True
        assert result["format"] == "dict"

    def test_validate_hours_format_invalid(self):
        """Test hours validation with invalid format."""
        invalid_hours = "Invalid hours format"

        with pytest.raises(ValidationError):
            DataValidator.validate_hours_format(invalid_hours)


class TestCoordinateValidation:
    """Test coordinate validation."""

    def test_validate_coordinates_valid(self):
        """Test valid coordinates."""
        valid_coords = [
            (0, 0),
            (90, 180),
            (-90, -180),
            (25.7617, -80.1918),  # Miami coordinates
            (40.7128, -74.0060),  # NYC coordinates
        ]

        for lat, lng in valid_coords:
            assert DataValidator.validate_coordinates(lat, lng) is True

    def test_validate_coordinates_invalid(self):
        """Test invalid coordinates."""
        invalid_coords = [
            (91, 0),  # Latitude too high
            (-91, 0),  # Latitude too low
            (0, 181),  # Longitude too high
            (0, -181),  # Longitude too low
            ("25.7617", -80.1918),  # Wrong type
            (None, 0),  # None value
        ]

        for lat, lng in invalid_coords:
            assert DataValidator.validate_coordinates(lat, lng) is False


class TestRatingValidation:
    """Test rating validation."""

    def test_validate_rating_valid(self):
        """Test valid ratings."""
        valid_ratings = [0, 1, 2.5, 3, 4.7, 5]

        for rating in valid_ratings:
            assert DataValidator.validate_rating(rating) is True

    def test_validate_rating_invalid(self):
        """Test invalid ratings."""
        invalid_ratings = [-1, 5.1, 6, "5", None, "invalid"]

        for rating in invalid_ratings:
            assert DataValidator.validate_rating(rating) is False


class TestPriceLevelValidation:
    """Test price level validation."""

    def test_validate_price_level_valid(self):
        """Test valid price levels."""
        valid_levels = [1, 2, 3, 4]

        for level in valid_levels:
            assert DataValidator.validate_price_level(level) is True

    def test_validate_price_level_invalid(self):
        """Test invalid price levels."""
        invalid_levels = [0, 5, 1.5, "2", None, "invalid"]

        for level in invalid_levels:
            assert DataValidator.validate_price_level(level) is False


class TestSanitization:
    """Test data sanitization functions."""

    def test_sanitize_string_basic(self):
        """Test basic string sanitization."""
        assert sanitize_string("  test  ") == "test"
        assert sanitize_string("test\n\r\t") == "test"
        assert sanitize_string("") == ""
        assert sanitize_string(None) == ""

    def test_sanitize_string_max_length(self):
        """Test string sanitization with max length."""
        long_string = "a" * 100
        assert len(sanitize_string(long_string, max_length=50)) == 50

    def test_sanitize_restaurant_data(self):
        """Test restaurant data sanitization."""
        data = {
            "name": "  Test Restaurant  ",
            "address": "123 Main St\n",
            "city": "Miami\r",
            "phone_number": "305-555-1234",
            "rating": 4.5,  # Non-string should be preserved
        }

        sanitized = DataValidator.sanitize_restaurant_data(data)

        assert sanitized["name"] == "Test Restaurant"
        assert sanitized["address"] == "123 Main St"
        assert sanitized["city"] == "Miami"
        assert sanitized["phone_number"] == "305-555-1234"
        assert sanitized["rating"] == 4.5


class TestValidationIntegration:
    """Test validation integration scenarios."""

    def test_restaurant_creation_workflow(self):
        """Test complete restaurant creation validation workflow."""
        # Step 1: Raw data
        raw_data = {
            "name": "  New Restaurant  ",
            "address": "456 Oak St\n",
            "city": "Miami",
            "state": "FL",
            "zip_code": "33102",
            "phone_number": "305-555-5678",
            "kosher_category": "meat",
            "listing_type": "restaurant",
            "email": "  contact@newrestaurant.com  ",
            "website": "https://newrestaurant.com",
            "rating": 4.2,
            "latitude": 25.7617,
            "longitude": -80.1918,
        }

        # Step 2: Sanitize
        sanitized_data = DataValidator.sanitize_restaurant_data(raw_data)

        # Step 3: Validate
        result = DataValidator.validate_restaurant_data(sanitized_data)

        assert result["valid"] is True
        assert sanitized_data["name"] == "New Restaurant"
        assert sanitized_data["email"] == "contact@newrestaurant.com"

    def test_review_submission_workflow(self):
        """Test complete review submission validation workflow."""
        raw_data = {
            "restaurant_id": 123,
            "rating": 5,
            "content": "  Excellent food and service!  ",
            "user_email": "  reviewer@example.com  ",
            "title": "Great Experience",
            "images": ["https://example.com/image.jpg"],
        }

        # Sanitize string fields
        sanitized_data = raw_data.copy()
        sanitized_data["content"] = sanitize_string(raw_data["content"])
        sanitized_data["user_email"] = sanitize_string(raw_data["user_email"])

        # Validate
        result = DataValidator.validate_review_data(sanitized_data)

        assert result["valid"] is True
        assert sanitized_data["content"] == "Excellent food and service!"
        assert sanitized_data["user_email"] == "reviewer@example.com"


if __name__ == "__main__":
    pytest.main([__file__])
