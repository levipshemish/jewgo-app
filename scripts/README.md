# JewGo Scripts Directory

This directory contains all utility scripts for the JewGo application, organized by functionality.

## 📁 Directory Structure

### 🔧 **enhancement/**
Scripts for enhancing and improving data quality:
- `enhance_business_types_and_reviews.py` - Add business types and review snippets
- `enhance_restaurant_photos.py` - Enhance restaurant photo data
- `enhance_restaurant_descriptions.py` - Add restaurant descriptions
- `enhance_google_listing_urls_and_prices.py` - Add Google listing URLs and prices
- `enhance_google_ratings.py` - Enhance Google ratings data
- `expand_google_places_integration.py` - Expand Google Places integration
- `fetch_google_reviews.py` - Fetch Google reviews
- `enrich_google_reviews.py` - Enrich Google review data
- `scrape_more_restaurant_images.py` - Scrape additional restaurant images
- `discover_restaurant_images.py` - Discover restaurant images
- `hours_backfill.py` - Backfill hours data
- `upload_fallback_images.py` - Upload fallback images

### 🧹 **cleanup/**
Scripts for cleaning and fixing data issues:
- `cleanup_additional_images.py` - Clean up additional images
- `cleanup_main_images.py` - Clean up main images
- `cleanup_broken_images.py` - Clean up broken images
- `fix_problematic_image_urls.py` - Fix problematic image URLs
- `check_problematic_image_urls.py` - Check for problematic image URLs
- `fix_missing_coordinates.py` - Fix missing coordinates
- `remove_duplicates.py` - Remove duplicate entries
- `delete_invalid_categories.py` - Delete invalid categories

### 🗄️ **database/**
Scripts for database operations and migrations:
- `add_business_types_and_review_snippets_columns.py` - Add new database columns
- `add_user_email_column.py` - Add user email column
- `add_user_email_to_reviews.py` - Add user emails to reviews
- `apply_database_indexes.py` - Apply database indexes
- `deploy_reviews_migration.py` - Deploy reviews migration
- `check_database_images.py` - Check database images
- `check_duplicates.py` - Check for duplicates
- `check_cloudinary_images.py` - Check Cloudinary images
- `check_reviews_table.py` - Check reviews table
- `show_database_categories.py` - Show database categories
- `comprehensive_database_cleanup.py` - Comprehensive database cleanup

### 🛠️ **utils/**
Utility scripts and tools:
- `generate_admin_token.py` - Generate admin tokens
- `import_kosher_miami.py` - Import Kosher Miami data
- `jewgo-cli.py` - JewGo command-line interface

### 🔄 **maintenance/**
Ongoing maintenance scripts:
- Various maintenance scripts for regular upkeep

### 📊 **monitoring/**
Monitoring and health check scripts:
- `monitor_render_fixes.py` - Monitor Render fixes
- `monitor_render_deployment.py` - Monitor Render deployment
- `monitor_redis.py` - Monitor Redis

### 🚀 **deployment/**
Deployment and setup scripts:
- `test-and-commit.sh` - Test and commit script
- `deploy-to-production.sh` - Deploy to production
- `setup_redis.sh` - Setup Redis
- `apply_indexes.sh` - Apply database indexes
- `setup_keep_alive.sh` - Setup keep alive
- `health-check.sh` - Health check script
- `cleanup.sh` - Cleanup script

## 🚀 Quick Start

### Enhancement Scripts
```bash
# Enhance business types and reviews
python scripts/enhancement/enhance_business_types_and_reviews.py

# Enhance restaurant photos
python scripts/enhancement/enhance_restaurant_photos.py
```

### Cleanup Scripts
```bash
# Clean up broken images
python scripts/cleanup/cleanup_broken_images.py

# Fix missing coordinates
python scripts/cleanup/fix_missing_coordinates.py
```

### Database Scripts
```bash
# Apply database indexes
python scripts/database/apply_database_indexes.py

# Check database images
python scripts/database/check_database_images.py
```

### Utility Scripts
```bash
# Generate admin token
python scripts/utils/generate_admin_token.py

# Run JewGo CLI
python scripts/utils/jewgo-cli.py
```

## 📋 Usage Guidelines

### Before Running Scripts
1. **Activate virtual environment**: `source backend/venv_py311/bin/activate`
2. **Set environment variables**: Ensure all required environment variables are set
3. **Backup database**: Always backup before running database scripts
4. **Test in staging**: Test scripts in staging environment first

### Script Categories
- **Enhancement**: Add new data or improve existing data
- **Cleanup**: Fix data issues and remove problematic entries
- **Database**: Database operations, migrations, and maintenance
- **Utils**: General utility tools and helpers
- **Maintenance**: Ongoing maintenance tasks
- **Monitoring**: Health checks and monitoring
- **Deployment**: Deployment and setup automation

### Safety Measures
- All scripts include error handling and logging
- Database scripts include rollback capabilities
- Enhancement scripts include rate limiting for external APIs
- Cleanup scripts include verification steps

## 🔧 Development

### Adding New Scripts
1. Place scripts in appropriate subdirectory
2. Include proper error handling and logging
3. Add documentation in this README
4. Test thoroughly before deployment

### Script Standards
- Use consistent naming conventions
- Include proper docstrings and comments
- Implement logging for debugging
- Handle errors gracefully
- Include progress indicators for long-running scripts

## 📞 Support

For issues with scripts:
1. Check the script's error output
2. Review the logs for detailed information
3. Verify environment variables are set correctly
4. Test with a small dataset first
