# Shuls Coordinates Management

This directory contains scripts for managing latitude and longitude coordinates for synagogues (shuls) in the JewGo database.

## Overview

The shuls table already has `latitude` and `longitude` fields defined, but they need to be populated based on address information using Google Geocoding API.

## Scripts

### 1. `check_shuls_coordinates.py`
**Purpose**: Check the current status of coordinates in the shuls table.

**Usage**:
```bash
cd backend/scripts
python check_shuls_coordinates.py
```

**Output**: Provides a comprehensive report showing:
- Total number of shuls
- How many have coordinates vs. missing coordinates
- Breakdown by city
- Sample of shuls missing coordinates
- Recommendations for next steps

### 2. `populate_shuls_coordinates.py`
**Purpose**: Populate missing coordinates for existing shuls using Google Geocoding API.

**Prerequisites**:
- `DATABASE_URL` environment variable set
- `GOOGLE_PLACES_API_KEY` environment variable set

**Usage**:
```bash
cd backend/scripts
python populate_shuls_coordinates.py
```

**Features**:
- Automatically finds shuls missing coordinates
- Geocodes addresses using Google API
- Rate limiting (0.1s delay between requests)
- Comprehensive error handling and logging
- Progress reporting

### 3. `import_synagogues.py` (Modified)
**Purpose**: Import synagogues from CSV with automatic geocoding.

**Changes Made**:
- Added `latitude` and `longitude` fields to the data structure
- Integrated geocoding during import process
- Rate limiting for API calls

**Usage**:
```bash
cd backend/scripts
python import_synagogues.py
```

## Utility Module

### `backend/utils/geocoding.py`
**Purpose**: Reusable geocoding service for the entire application.

**Features**:
- `GeocodingService` class for batch operations
- `geocode_address()` convenience function
- `reverse_geocode()` for coordinate-to-address conversion
- Rate limiting and error handling
- Environment variable configuration

**Usage in Code**:
```python
from backend.utils.geocoding import geocode_address, GeocodingService

# Quick geocoding
coordinates = geocode_address("123 Main St", "Miami", "FL", "33101")

# Service for batch operations
service = GeocodingService()
coordinates = service.geocode_address("123 Main St", "Miami", "FL", "33101")
```

## Environment Variables

Required environment variables:

```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Google API for geocoding
GOOGLE_PLACES_API_KEY=your_google_api_key_here
```

## Workflow

### For New Imports:
1. Ensure `GOOGLE_PLACES_API_KEY` is set
2. Run `import_synagogues.py` - coordinates will be populated automatically

### For Existing Data:
1. Run `check_shuls_coordinates.py` to see current status
2. If coordinates are missing, run `populate_shuls_coordinates.py`
3. Verify completion with `check_shuls_coordinates.py` again

### For Ongoing Maintenance:
1. Use the `GeocodingService` class in your application code
2. Implement coordinate updates when addresses change
3. Monitor coordinate coverage with the check script

## API Rate Limits

- Google Geocoding API: 0.1 second delay between requests
- Respects Google's usage limits
- Batch processing available for large datasets

## Error Handling

All scripts include comprehensive error handling:
- Database connection failures
- API rate limiting
- Invalid addresses
- Network timeouts
- Data validation errors

## Performance Considerations

- Coordinates are indexed for fast queries
- Batch processing available for large datasets
- Progress reporting for long-running operations
- Transaction safety for database updates

## Troubleshooting

### Common Issues:

1. **"No Google API key available"**
   - Set `GOOGLE_PLACES_API_KEY` environment variable

2. **"DATABASE_URL environment variable is required"**
   - Set `DATABASE_URL` environment variable

3. **Geocoding failures**
   - Check address data quality
   - Verify Google API key validity
   - Check API quota limits

4. **Slow performance**
   - Reduce rate limiting delay (but respect API limits)
   - Use batch processing for large datasets

## Monitoring

After running coordinate population:
- Check the status report
- Verify coordinate accuracy on a map
- Monitor API usage and costs
- Update addresses if coordinates seem incorrect

## Future Enhancements

- Alternative geocoding services (OpenStreetMap, MapBox)
- Coordinate validation and quality scoring
- Automatic address correction suggestions
- Integration with mapping services
- Coordinate caching for performance
