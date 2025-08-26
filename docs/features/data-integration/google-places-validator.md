# Google Places Validator

## Overview

The Google Places Validator is a unified validation module that consolidates all Google Places related validation logic across the JewGo codebase. It eliminates code duplication and provides consistent, configurable validation for all Google Places data.

**Location**: `backend/utils/google_places_validator.py`

## 🎯 Purpose

This validator was created as part of the codebase duplication cleanup initiative (Task 1) to:

- **Eliminate Duplication**: Replace 4 different `validate_website_url()` implementations
- **Ensure Consistency**: Provide uniform validation behavior across all services
- **Enhance Maintainability**: Single source of truth for all Google Places validation
- **Improve Functionality**: Add comprehensive validation for all Google Places data types

## 🚀 Features

### Core Validation Methods

#### `validate_website_url(url, timeout=5, strict_mode=False, fallback_to_get=True)`
Validates website URLs with configurable parameters.

**Parameters**:
- `url` (str): URL to validate
- `timeout` (int): Request timeout in seconds (default: 5)
- `strict_mode` (bool): If True, only accept 200 status codes (default: False)
- `fallback_to_get` (bool): If True, fall back to GET request if HEAD fails (default: True)

**Returns**: `bool` - True if valid, False otherwise

**Usage Examples**:
```python
from utils.google_places_validator import GooglePlacesValidator

# Basic validation
is_valid = GooglePlacesValidator.validate_website_url("https://example.com")

# Strict validation (only 200 status codes)
is_valid = GooglePlacesValidator.validate_website_url(
    "https://example.com", 
    timeout=3, 
    strict_mode=True
)

# Validation with fallback to GET request
is_valid = GooglePlacesValidator.validate_website_url(
    "https://example.com", 
    timeout=5, 
    strict_mode=False, 
    fallback_to_get=True
)
```

#### `validate_google_places_api_key()`
Validates if Google Places API key is configured.

**Returns**: `bool` - True if API key is set, False otherwise

#### `validate_place_id(place_id)`
Validates Google Places place ID format.

**Parameters**:
- `place_id` (str): Place ID to validate

**Returns**: `bool` - True if valid format, False otherwise

**Example**:
```python
valid_place_id = "ChIJN1t_tDeuEmsRUsoyG83frY4"
is_valid = GooglePlacesValidator.validate_place_id(valid_place_id)
```

#### `validate_coordinates(lat, lng)`
Validates coordinate ranges.

**Parameters**:
- `lat` (float): Latitude (-90 to 90)
- `lng` (float): Longitude (-180 to 180)

**Returns**: `bool` - True if valid coordinates, False otherwise

**Example**:
```python
# NYC coordinates
is_valid = GooglePlacesValidator.validate_coordinates(40.7128, -74.0060)
```

#### `validate_phone_number(phone)`
Validates phone number format.

**Parameters**:
- `phone` (str): Phone number to validate

**Returns**: `bool` - True if valid format, False otherwise

**Example**:
```python
is_valid = GooglePlacesValidator.validate_phone_number("+1-555-123-4567")
```

#### `validate_rating(rating)`
Validates rating value range.

**Parameters**:
- `rating` (float): Rating value (0.0 to 5.0)

**Returns**: `bool` - True if valid rating, False otherwise

**Example**:
```python
is_valid = GooglePlacesValidator.validate_rating(4.5)
```

#### `validate_price_level(price_level)`
Validates price level range.

**Parameters**:
- `price_level` (int): Price level (0 to 4)

**Returns**: `bool` - True if valid price level, False otherwise

**Example**:
```python
is_valid = GooglePlacesValidator.validate_price_level(2)
```

## 🔧 Implementation Details

### Validation Logic

#### Website URL Validation
1. **Empty Check**: Returns False for empty or None URLs
2. **Scheme Normalization**: Adds "https://" if no scheme provided
3. **HEAD Request**: Attempts HEAD request first (more efficient)
4. **Status Code Check**: 
   - Strict mode: Only accepts 200
   - Non-strict mode: Accepts 2xx/3xx status codes
5. **GET Fallback**: Falls back to GET request if HEAD fails
6. **Error Handling**: Graceful handling of network errors

#### Coordinate Validation
- **Latitude**: Must be between -90 and 90 degrees
- **Longitude**: Must be between -180 and 180 degrees

#### Place ID Validation
- **Length**: Must be between 10 and 100 characters
- **Format**: Alphanumeric characters, hyphens, and underscores only

#### Phone Number Validation
- **Minimum Length**: At least 10 digits
- **Format Support**: International formats with +, (), -, and spaces

#### Rating Validation
- **Range**: 0.0 to 5.0 (Google Places standard)
- **Type**: Must be numeric

#### Price Level Validation
- **Range**: 0 to 4 (Google Places standard)
- **Type**: Must be integer

### Error Handling

The validator implements comprehensive error handling:

- **Network Errors**: Graceful fallback mechanisms
- **Invalid Inputs**: Proper validation of input parameters
- **Logging**: Structured logging with context information
- **Performance**: Configurable timeouts to prevent hanging

### Logging

All validation operations are logged using structlog:

```python
logger.debug(
    "Website HEAD validation",
    url=url,
    status_code=response.status_code,
    is_valid=is_valid,
    strict_mode=strict_mode
)
```

## 📊 Migration from Old Implementations

### Before (Duplicated Code)
```python
# backend/services/google_places_service.py
def validate_website_url(self, url: str) -> bool:
    if not url:
        return False
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code < 400
    except Exception:
        return False

# backend/utils/google_places_helper.py
def validate_website_url(url: str) -> bool:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        response = requests.head(url, timeout=3, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logger.debug("Website validation failed", url=url, error=str(e))
        return False

# backend/utils/google_places_manager.py
def validate_website_url(self, url: str) -> bool:
    try:
        if not url:
            return False
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        try:
            r = requests.head(url, timeout=5, allow_redirects=True)
            if r.status_code < 400:
                return True
        except Exception:
            pass
        try:
            r2 = requests.get(url, timeout=7, allow_redirects=True)
            return r2.status_code < 400
        except Exception as e:
            return False
    except Exception as e:
        return False

# scripts/maintenance/google_places_website_updater.py
def validate_website_url(self, url: str) -> bool:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Website validation failed for {url}: {e}")
        return False
```

### After (Unified Implementation)
```python
# All files now use the unified validator
from utils.google_places_validator import GooglePlacesValidator

def validate_website_url(self, url: str) -> bool:
    return GooglePlacesValidator.validate_website_url(url, timeout=5, strict_mode=False)
```

## 🧪 Testing

The validator includes comprehensive test coverage:

```python
# backend/tests/test_google_places_validator.py
class TestGooglePlacesValidator:
    def test_validate_website_url_empty_url(self):
        assert GooglePlacesValidator.validate_website_url("") is False
    
    def test_validate_website_url_strict_mode(self):
        # Tests strict vs non-strict validation
    
    def test_validate_website_url_head_failure_fallback_to_get(self):
        # Tests fallback mechanism
    
    def test_validate_coordinates_valid(self):
        # Tests coordinate validation
    
    # ... 20+ additional test cases
```

## 📈 Benefits

### Code Quality
- **Reduced Duplication**: 4 implementations → 1 unified module
- **Improved Maintainability**: Single source of truth
- **Enhanced Testing**: Comprehensive test coverage
- **Better Documentation**: Detailed docstrings and examples

### Performance
- **Configurable Timeouts**: Prevents hanging requests
- **Efficient Fallbacks**: HEAD requests with GET fallback
- **Structured Logging**: Better debugging and monitoring

### Functionality
- **Enhanced Validation**: More validation types than original implementations
- **Flexible Configuration**: Different validation modes for different use cases
- **Comprehensive Coverage**: All Google Places data types supported

## 🔄 Usage Across Codebase

The unified validator is now used in:

1. **Services**: `backend/services/google_places_service.py`
2. **Utilities**: `backend/utils/google_places_helper.py`
3. **Managers**: `backend/utils/google_places_manager.py`
4. **Scripts**: `scripts/maintenance/google_places_website_updater.py`

All implementations maintain their original behavior while using the unified validation logic.

## 🚀 Future Enhancements

Potential improvements for the validator:

1. **Caching**: Cache validation results to reduce API calls
2. **Async Support**: Async validation for better performance
3. **Rate Limiting**: Built-in rate limiting for external requests
4. **Validation Rules**: Configurable validation rules per use case
5. **Metrics**: Performance metrics and validation statistics

## 📝 Related Documentation

- [Website Data Management](website-data-management.md)
- [API Documentation](../api/README.md)
- [Development Guide](../development/README.md)
- [Codebase Duplication TODO](../../CODEBASE_DUPLICATION_TODO.md)
