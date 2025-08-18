# Playwright Deployment Fix

## Issue Summary

**Date**: August 11, 2025  
**Error**: `ModuleNotFoundError: No module named 'playwright'`  
**Impact**: Restaurant hours API endpoint failing in production

## Root Cause

The production deployment was missing several critical dependencies that are required by the scraper service:

1. **Missing Dependencies in `requirements.txt`**:
   - `playwright>=1.44.0` - Web automation framework
   - `beautifulsoup4>=4.12.2` - HTML parsing
   - `lxml>=4.9.3` - XML/HTML processing
   - `marshmallow>=3.20.1` - Data serialization
   - `Pillow>=10.0.0` - Image processing
   - `cloudinary>=1.36.0` - Cloud image hosting

2. **Missing Playwright Browser Installation**:
   - The `Procfile` was not installing Playwright browsers
   - Playwright requires browser binaries to be installed separately

## Solution Implemented

### 1. Updated `requirements.txt`

Added missing dependencies to the root `requirements.txt` file:

```txt
# Web scraping and automation
playwright>=1.44.0
beautifulsoup4>=4.12.2
lxml>=4.9.3

# Image processing
Pillow>=10.0.0
cloudinary>=1.36.0

# Validation and serialization
marshmallow>=3.20.1
```

### 2. Updated `Procfile`

Modified the Procfile to install Playwright browsers before starting the application:

```bash
web: cd backend && playwright install chromium --with-deps && gunicorn --config config/gunicorn.conf.py app:app
```

## Files Modified

- `requirements.txt` - Added missing dependencies
- `Procfile` - Added Playwright browser installation

## Verification

After deployment, the following endpoints should work correctly:
- `/api/restaurants/{id}/hours` - Restaurant hours fetching
- Any endpoints that use the scraper service

## Prevention

To prevent similar issues in the future:

1. **Dependency Management**: Ensure all dependencies from `backend/pyproject.toml` are also in the root `requirements.txt`
2. **Testing**: Test scraping functionality in staging environment before production deployment
3. **Documentation**: Keep deployment requirements up to date

## Related Services

The scraper service is used by:
- Restaurant hours fetching
- Google Places integration
- Kosher Miami data scraping
- ORB Kosher data scraping

## Deployment Status

✅ **FIXED** - Changes deployed successfully on August 11, 2025
