import pytest
from unittest.mock import patch, Mock
from utils.google_places_validator import GooglePlacesValidator






#!/usr/bin/env python3
"""Tests for Google Places Validator."""

class TestGooglePlacesValidator:
    """Test cases for GooglePlacesValidator."""

    def test_validate_website_url_empty_url(self):
        """Test validation with empty URL."""
        assert GooglePlacesValidator.validate_website_url("") is False
        assert GooglePlacesValidator.validate_website_url(None) is False

    def test_validate_website_url_without_scheme(self):
        """Test validation with URL without scheme."""
        with patch('requests.head') as mock_head:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_head.return_value = mock_response
            
            result = GooglePlacesValidator.validate_website_url("example.com")
            assert result is True
            mock_head.assert_called_once_with("https://example.com", timeout=5, allow_redirects=True)

    def test_validate_website_url_with_https(self):
        """Test validation with HTTPS URL."""
        with patch('requests.head') as mock_head:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_head.return_value = mock_response
            
            result = GooglePlacesValidator.validate_website_url("https://example.com")
            assert result is True
            mock_head.assert_called_once_with("https://example.com", timeout=5, allow_redirects=True)

    def test_validate_website_url_strict_mode(self):
        """Test validation in strict mode (only 200 accepted)."""
        with patch('requests.head') as mock_head:
            mock_response = Mock()
            mock_response.status_code = 301  # Redirect
            mock_head.return_value = mock_response
            
            result = GooglePlacesValidator.validate_website_url("https://example.com", strict_mode=True)
            assert result is False

    def test_validate_website_url_non_strict_mode(self):
        """Test validation in non-strict mode (accepts 2xx/3xx)."""
        with patch('requests.head') as mock_head:
            mock_response = Mock()
            mock_response.status_code = 301  # Redirect
            mock_head.return_value = mock_response
            
            result = GooglePlacesValidator.validate_website_url("https://example.com", strict_mode=False)
            assert result is True

    def test_validate_website_url_head_failure_fallback_to_get(self):
        """Test fallback to GET when HEAD fails."""
        with patch('requests.head') as mock_head:
            mock_head.side_effect = Exception("Connection error")
            
            with patch('requests.get') as mock_get:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_get.return_value = mock_response
                
                result = GooglePlacesValidator.validate_website_url("https://example.com")
                assert result is True
                mock_get.assert_called_once_with("https://example.com", timeout=7, allow_redirects=True)

    def test_validate_website_url_no_fallback(self):
        """Test behavior when fallback is disabled."""
        with patch('requests.head') as mock_head:
            mock_head.side_effect = Exception("Connection error")
            
            result = GooglePlacesValidator.validate_website_url("https://example.com", fallback_to_get=False)
            assert result is False

    def test_validate_google_places_api_key_set(self):
        """Test API key validation when key is set."""
        with patch.dict('os.environ', {'GOOGLE_PLACES_API_KEY': 'test_key'}):
            assert GooglePlacesValidator.validate_google_places_api_key() is True

    def test_validate_google_places_api_key_not_set(self):
        """Test API key validation when key is not set."""
        with patch.dict('os.environ', {}, clear=True):
            assert GooglePlacesValidator.validate_google_places_api_key() is False

    def test_validate_place_id_valid(self):
        """Test place ID validation with valid ID."""
        valid_place_id = "ChIJN1t_tDeuEmsRUsoyG83frY4"
        assert GooglePlacesValidator.validate_place_id(valid_place_id) is True

    def test_validate_place_id_invalid(self):
        """Test place ID validation with invalid ID."""
        invalid_place_ids = ["", "short", "a" * 101, "invalid@place#id"]
        for place_id in invalid_place_ids:
            assert GooglePlacesValidator.validate_place_id(place_id) is False

    def test_validate_coordinates_valid(self):
        """Test coordinate validation with valid coordinates."""
        assert GooglePlacesValidator.validate_coordinates(40.7128, -74.0060) is True  # NYC
        assert GooglePlacesValidator.validate_coordinates(0, 0) is True  # Prime meridian/equator
        assert GooglePlacesValidator.validate_coordinates(-90, -180) is True  # Edge cases
        assert GooglePlacesValidator.validate_coordinates(90, 180) is True  # Edge cases

    def test_validate_coordinates_invalid(self):
        """Test coordinate validation with invalid coordinates."""
        assert GooglePlacesValidator.validate_coordinates(91, 0) is False  # Latitude too high
        assert GooglePlacesValidator.validate_coordinates(-91, 0) is False  # Latitude too low
        assert GooglePlacesValidator.validate_coordinates(0, 181) is False  # Longitude too high
        assert GooglePlacesValidator.validate_coordinates(0, -181) is False  # Longitude too low

    def test_validate_phone_number_valid(self):
        """Test phone number validation with valid numbers."""
        valid_numbers = [
            "+1-555-123-4567",
            "(555) 123-4567",
            "555-123-4567",
            "5551234567",
            "+44 20 7946 0958"
        ]
        for phone in valid_numbers:
            assert GooglePlacesValidator.validate_phone_number(phone) is True

    def test_validate_phone_number_invalid(self):
        """Test phone number validation with invalid numbers."""
        invalid_numbers = ["", "123", "abc", "555-123"]  # Too short
        for phone in invalid_numbers:
            assert GooglePlacesValidator.validate_phone_number(phone) is False

    def test_validate_rating_valid(self):
        """Test rating validation with valid ratings."""
        assert GooglePlacesValidator.validate_rating(0.0) is True
        assert GooglePlacesValidator.validate_rating(2.5) is True
        assert GooglePlacesValidator.validate_rating(5.0) is True

    def test_validate_rating_invalid(self):
        """Test rating validation with invalid ratings."""
        assert GooglePlacesValidator.validate_rating(None) is False
        assert GooglePlacesValidator.validate_rating(-0.1) is False
        assert GooglePlacesValidator.validate_rating(5.1) is False

    def test_validate_price_level_valid(self):
        """Test price level validation with valid levels."""
        for level in range(5):  # 0-4
            assert GooglePlacesValidator.validate_price_level(level) is True

    def test_validate_price_level_invalid(self):
        """Test price level validation with invalid levels."""
        assert GooglePlacesValidator.validate_price_level(None) is False
        assert GooglePlacesValidator.validate_price_level(-1) is False
        assert GooglePlacesValidator.validate_price_level(5) is False
