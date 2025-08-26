# Website Data Management System

## Overview

The Website Data Management System provides comprehensive tools for managing restaurant website links in the JewGo database. This system ensures data integrity, prevents duplicates, and automatically fetches missing website links using Google Places API.

## Features

### 1. Automated Website Fetching
- **Google Places API Integration**: Automatically fetches website links for restaurants that don't have them
- **Rate Limiting**: Respects API rate limits with 200ms delays between requests
- **Validation**: Validates website URLs for accessibility and proper formatting
- **Batch Processing**: Processes restaurants in configurable batches

### 2. Data Validation & Quality Control
- **URL Validation**: Checks if websites are accessible and properly formatted
- **Duplicate Detection**: Identifies and manages duplicate website entries
- **Data Cleaning**: Fixes common URL formatting issues (missing http/https)

### 3. Comprehensive Reporting
- **Statistics Dashboard**: Real-time website coverage statistics
- **Validation Reports**: Detailed reports on website accessibility
- **Duplicate Analysis**: Reports on duplicate website entries
- **CSV Export**: Generates comprehensive reports in CSV format

### 4. Backup & Recovery
- **Data Backup**: Creates JSON backups of all website data
- **Restore Capability**: Can restore website data from backups
- **Audit Trail**: Tracks all changes with timestamps

## System Components

### 1. Backend API Endpoint
**Location**: `backend/app.py`
**Endpoint**: `POST /api/restaurants/fetch-missing-websites`

**Features**:
- Rate limited to 10 requests per hour
- Supports dry-run mode for testing
- Configurable batch sizes (1-50 restaurants)
- Comprehensive error handling and logging

**Usage**:
```bash
curl -X POST https://jewgo.onrender.com/api/restaurants/fetch-missing-websites \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "dry_run": false}'
```

### 2. Google Places Validator (Unified)
**Location**: `backend/utils/google_places_validator.py`

**Features**:
- Unified validation utilities for Google Places integration
- Configurable website URL validation with timeout and strict mode options
- Comprehensive validation for place IDs, coordinates, phone numbers, ratings, and price levels
- Fallback mechanisms for different validation scenarios
- Structured logging and error handling

**Key Methods**:
- `validate_website_url()`: Unified website validation with configurable parameters
- `validate_google_places_api_key()`: API key configuration validation
- `validate_place_id()`: Google Places place ID format validation
- `validate_coordinates()`: Latitude/longitude range validation
- `validate_phone_number()`: Phone number format validation
- `validate_rating()`: Rating value range validation
- `validate_price_level()`: Price level range validation

### 3. Google Places Manager
**Location**: `backend/utils/google_places_manager.py`

**Features**:
- Google Places API integration
- Place search and details retrieval
- Website URL validation (uses unified validator)
- Database update operations
- Comprehensive error handling

**Key Methods**:
- `search_place()`: Find restaurant in Google Places
- `get_place_details()`: Retrieve detailed place information
- `validate_website_url()`: Validate website accessibility (unified)
- `update_restaurant_website()`: Update database with website URL

### 4. Website Data Manager
**Location**: `scripts/maintenance/website_data_manager.py`

**Features**:
- Command-line interface for website management
- Comprehensive statistics and reporting
- Duplicate detection and cleanup
- Data validation and fixing
- Backup and restore operations

**Usage**:
```bash
# Show statistics
python3 scripts/maintenance/website_data_manager.py

# Fetch missing websites
python3 scripts/maintenance/website_data_manager.py
# Choose option 5 and follow prompts

# Generate report
python3 scripts/maintenance/website_data_manager.py
# Choose option 7
```

## Current Status

### Website Coverage Statistics
- **Total Restaurants**: 207
- **With Websites**: 67 (32.37%)
- **Without Websites**: 140 (67.63%)
- **HTTP Coverage**: 100% (all websites have proper http/https)

### Data Quality
- **Valid Websites**: All fetched websites are validated for accessibility
- **No Duplicates**: Duplicate detection prevents data redundancy
- **Proper Formatting**: All URLs include proper http/https prefixes

## Implementation Details

### Database Schema
The website data is stored in the `restaurants` table:
```sql
website VARCHAR(500) -- Website URL
updated_at TIMESTAMP -- Last update timestamp
```

### API Rate Limits
- Google Places API: 200ms delay between requests
- Backend endpoint: 10 requests per hour
- Validation requests: 3-second timeout

### Error Handling
- Network timeouts and connection errors
- Invalid API responses
- Database connection issues
- Malformed URLs

### Logging
- Structured logging with structlog
- JSON format for easy parsing
- Different log levels (INFO, WARNING, ERROR)
- Request tracking and performance metrics

## Usage Examples

### 1. Using the Unified Google Places Validator
```python
from utils.google_places_validator import GooglePlacesValidator

# Basic website validation
is_valid = GooglePlacesValidator.validate_website_url("https://example.com")
print(f"Website valid: {is_valid}")

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

# Validate other Google Places data
place_id_valid = GooglePlacesValidator.validate_place_id("ChIJN1t_tDeuEmsRUsoyG83frY4")
coords_valid = GooglePlacesValidator.validate_coordinates(40.7128, -74.0060)
phone_valid = GooglePlacesValidator.validate_phone_number("+1-555-123-4567")
rating_valid = GooglePlacesValidator.validate_rating(4.5)
price_valid = GooglePlacesValidator.validate_price_level(2)
```

### 2. Fetch Missing Websites
```python
from scripts.maintenance.website_data_manager import WebsiteDataManager

manager = WebsiteDataManager()
results = manager.fetch_missing_websites(limit=10, dry_run=False)
print(f"Updated {results['updated']} restaurants")
```

### 2. Generate Report
```python
from scripts.maintenance.website_data_manager import WebsiteDataManager

manager = WebsiteDataManager()
report_file = manager.generate_website_report()
print(f"Report generated: {report_file}")
```

### 3. Validate All Websites
```python
from scripts.maintenance.website_data_manager import WebsiteDataManager

manager = WebsiteDataManager()
validation = manager.validate_all_websites(limit=50)
print(f"Valid: {validation['valid']}, Invalid: {validation['invalid']}")
```

## Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db
GOOGLE_PLACES_API_KEY=your_api_key_here

# Optional
LOG_LEVEL=INFO
```

### API Configuration
- **Google Places API**: Requires billing-enabled project
- **Rate Limits**: 200ms between requests
- **Timeout**: 10 seconds for API calls, 3 seconds for validation

## Monitoring & Maintenance

### Regular Tasks
1. **Weekly**: Run website validation to check accessibility
2. **Monthly**: Generate comprehensive reports
3. **Quarterly**: Backup website data
4. **As Needed**: Fetch missing websites for new restaurants

### Performance Metrics
- Website coverage percentage
- Validation success rate
- API response times
- Error rates and types

### Troubleshooting
- **API Errors**: Check Google Places API key and billing
- **Database Errors**: Verify database connection and permissions
- **Validation Failures**: Check network connectivity and website status

## Future Enhancements

### Planned Features
1. **Multiple Data Sources**: Integrate with other APIs (Yelp, Foursquare)
2. **Machine Learning**: Predict website availability based on restaurant characteristics
3. **Automated Monitoring**: Continuous website accessibility monitoring
4. **Advanced Analytics**: Website performance and user engagement metrics

### Technical Improvements
1. **Caching**: Cache API responses to reduce API calls
2. **Parallel Processing**: Process multiple restaurants simultaneously
3. **Web Interface**: Admin dashboard for website management
4. **API Versioning**: Support for multiple API versions

## Security Considerations

### Data Protection
- API keys stored in environment variables
- Database credentials encrypted
- No sensitive data in logs
- Rate limiting to prevent abuse

### Access Control
- Admin-only access to website management tools
- Audit logging for all changes
- Backup verification procedures

## Support & Documentation

### Getting Help
- Check logs for detailed error messages
- Review API documentation for rate limits
- Contact development team for technical issues

### Documentation
- API documentation in `/docs/api/`
- Database schema in `/docs/database/`
- Deployment guides in `/docs/deployment/`

---

**Last Updated**: August 5, 2024
**Version**: 1.0
**Status**: Active Development 