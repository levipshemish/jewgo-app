# Google Places Image Scraping

This feature automatically scrapes restaurant images from Google Places API and uploads them to Cloudinary, replacing placeholder images in the JewGo app.

## Overview

The image scraping system consists of several components:

1. **Google Places Image Scraper** - Fetches restaurant photos from Google Places API
2. **Cloudinary Uploader** - Uploads images to Cloudinary with proper transformations
3. **Enhanced Importer** - Integrates image scraping into the restaurant import process
4. **Maintenance Script** - Scrapes images for existing restaurants without images

## Features

- ✅ Automatic image scraping from Google Places API
- ✅ Cloudinary integration with optimized transformations
- ✅ Rate limiting to respect API quotas
- ✅ Error handling and logging
- ✅ Support for both new imports and existing restaurants
- ✅ Dry-run mode for testing
- ✅ Comprehensive test suite

## Setup

### 1. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Install Dependencies

The system requires the `cloudinary` package. It's already added to `backend/requirements.txt`:

```bash
pip install cloudinary==1.36.0
```

### 3. Google Places API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Set up billing (required for Places API)
6. Configure API key restrictions for security

### 4. Cloudinary Setup

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Get your cloud name, API key, and API secret from the dashboard
3. Create an upload preset named `jewgo_restaurants` (optional, for frontend uploads)

## Usage

### 1. Test the Setup

Run the test script to verify everything is working:

```bash
cd scripts/testing
python test_image_scraping.py
```

This will test:
- Google Places API connectivity
- Cloudinary upload functionality
- Full integration workflow

### 2. Scrape Images for Existing Restaurants

Use the maintenance script to add images to restaurants that don't have them:

```bash
# Scrape images for all restaurants without images
cd scripts/maintenance
python scrape_restaurant_images.py

# Limit to first 10 restaurants
python scrape_restaurant_images.py --limit 10

# Dry run (test without updating database)
python scrape_restaurant_images.py --dry-run

# Scrape image for specific restaurant
python scrape_restaurant_images.py --restaurant-id 123
```

### 3. Enhanced Import with Images

Use the enhanced importer for new restaurant imports:

```python
from utils.kosher_miami.image_enhanced_importer import ImageEnhancedKosherMiamiImporter

# Initialize with image scraping enabled
importer = ImageEnhancedKosherMiamiImporter(enable_image_scraping=True)

# Import restaurants (images will be scraped automatically)
results = importer.import_restaurants(restaurant_data)
print(f"Images uploaded: {results['images_uploaded']}")
```

### 4. Manual Image Scraping

You can also use the components individually:

```python
from utils.google_places_image_scraper import GooglePlacesImageScraper
from utils.cloudinary_uploader import CloudinaryUploader

# Initialize components
scraper = GooglePlacesImageScraper()
uploader = CloudinaryUploader()

# Scrape image from Google Places
result = scraper.get_best_restaurant_photo("Restaurant Name", "123 Main St, Miami, FL")
if result:
    photo_bytes, metadata = result
    
    # Upload to Cloudinary
    image_url = uploader.upload_restaurant_image(
        image_bytes=photo_bytes,
        restaurant_name="Restaurant Name"
    )
    print(f"Image uploaded: {image_url}")
```

## API Rate Limits

The system includes built-in rate limiting to respect API quotas:

- **Google Places API**: 0.5 second delay between requests
- **Cloudinary**: No rate limiting (handled by Cloudinary SDK)

### Google Places API Quotas

- **Text Search**: 1,000 requests per day (free tier)
- **Place Details**: 1,000 requests per day (free tier)
- **Place Photos**: 1,000 requests per day (free tier)

For production use, consider upgrading to a paid Google Cloud account for higher quotas.

## Image Processing

### Cloudinary Transformations

Images are automatically processed with these transformations:

- **Width**: 800px
- **Height**: 600px
- **Crop**: Fill (maintains aspect ratio)
- **Quality**: Auto (optimized)
- **Format**: Auto (best format for browser)

### File Organization

Images are organized in Cloudinary with this structure:

```
jewgo/restaurants/
├── restaurant_name_1/
├── restaurant_name_2/
└── restaurant_name_3/
```

## Error Handling

The system includes comprehensive error handling:

- **API failures**: Logged and skipped, process continues
- **Network timeouts**: Retried with exponential backoff
- **Invalid images**: Skipped with warning
- **Database errors**: Logged and reported

## Monitoring

### Logs

All operations are logged with structured logging:

```python
import structlog
logger = structlog.get_logger()

# Example log entries
logger.info("Scraping image for restaurant", restaurant="Pita Plus")
logger.warning("No image found for restaurant", restaurant="Unknown Restaurant")
logger.error("Failed to upload image", error="Network timeout")
```

### Metrics

The scraping process provides detailed metrics:

```python
results = {
    'total_processed': 100,
    'images_scraped': 85,
    'images_uploaded': 80,
    'images_updated': 80,
    'failed_scrapes': 5,
    'failed_uploads': 5,
    'failed_updates': 0,
    'errors': []
}
```

## Troubleshooting

### Common Issues

1. **"GOOGLE_PLACES_API_KEY not set"**
   - Check environment variables
   - Verify API key is valid and has proper permissions

2. **"No place found"**
   - Restaurant name/address might not match Google Places data
   - Try different search variations
   - Check if restaurant exists on Google Maps

3. **"Failed to upload to Cloudinary"**
   - Verify Cloudinary credentials
   - Check network connectivity
   - Ensure Cloudinary account has sufficient storage

4. **"Import error"**
   - Check database connection
   - Verify all required packages are installed
   - Check Python path configuration

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

## Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables for all credentials
   - Set up API key restrictions in Google Cloud Console

2. **Rate Limiting**
   - Respect API quotas to avoid service disruption
   - Monitor usage to stay within limits

3. **Image Validation**
   - All images are validated before upload
   - Invalid or corrupted images are skipped

## Performance Optimization

1. **Batch Processing**
   - Process multiple restaurants in batches
   - Use appropriate delays between API calls

2. **Caching**
   - Consider implementing image caching for frequently accessed restaurants
   - Cache place_id lookups to reduce API calls

3. **Parallel Processing**
   - For large datasets, consider parallel processing
   - Be mindful of API rate limits

## Future Enhancements

Potential improvements for the image scraping system:

1. **Image Quality Selection**
   - Implement smarter photo selection based on content
   - Prefer exterior/interior shots over logos

2. **Multiple Images**
   - Support for multiple images per restaurant
   - Image gallery functionality

3. **Image Updates**
   - Periodic image refresh for existing restaurants
   - Detect and replace outdated images

4. **Alternative Sources**
   - Integration with other image sources (Yelp, TripAdvisor)
   - Fallback image providers

## Support

For issues or questions about the image scraping system:

1. Check the troubleshooting section above
2. Review logs for detailed error information
3. Run the test script to verify setup
4. Contact the development team with specific error messages 