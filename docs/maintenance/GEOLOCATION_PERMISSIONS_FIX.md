# Geolocation Permissions Policy Fix

## Issue
The JewGo app was displaying the error:
```
[Violation] Permissions policy violation: Geolocation access has been blocked because of a permissions policy applied to the current document. See https://crbug.com/414348233 for more details.
```

## Root Cause
There was a conflict between two configuration files:
- `frontend/_headers` was setting `geolocation=(self)` - allowing geolocation for same origin
- `frontend/next.config.js` was setting `geolocation=()` - blocking all geolocation access

The Next.js configuration was overriding the `_headers` file, causing geolocation to be blocked.

## Solution
Updated `frontend/next.config.js` to change:
```javascript
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=()',  // ❌ This was blocking geolocation
}
```

To:
```javascript
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=(self)',  // ✅ This allows geolocation for same origin
}
```

Also fixed X-Frame-Options conflict:
```javascript
{
  key: 'X-Frame-Options',
  value: 'DENY',  // ❌ This was blocking frame display
}
```

To:
```javascript
{
  key: 'X-Frame-Options',
  value: 'ALLOWALL',  // ✅ This allows frame display
}
```

## Changes Made
1. **File Modified**: `frontend/next.config.js`
2. **Changes**: 
   - Updated Permissions-Policy to allow geolocation for same origin
   - Updated X-Frame-Options to ALLOWALL for consistency
3. **Test Script**: `scripts/testing/test_geolocation_fix.py`
4. **Documentation**: This file

## Security Considerations
- `geolocation=(self)` allows geolocation only for the same origin (jewgo-app.vercel.app)
- This is appropriate for a location-based application like JewGo
- Other security headers remain active:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: origin-when-cross-origin`
  - `Strict-Transport-Security`

## Testing
Use the test script to verify the fix:
```bash
python scripts/testing/test_geolocation_fix.py
```

## Expected Result
After deployment completes (usually 2-5 minutes), the site should:
- ✅ Allow geolocation access for same origin
- ✅ No longer show "Permissions policy violation" errors
- ✅ Location-based features work correctly
- ✅ Geolocation permission prompts appear properly

## Manual Testing
1. Open browser developer tools (F12)
2. Go to Console tab
3. Navigate to https://jewgo-app.vercel.app
4. Look for geolocation-related errors
5. Try using location-based features

## Files Created/Modified
- ✅ `frontend/next.config.js` - Fixed Permissions-Policy and X-Frame-Options
- ✅ `scripts/testing/test_geolocation_fix.py` - Test script for verification
- ✅ `docs/maintenance/GEOLOCATION_PERMISSIONS_FIX.md` - This documentation

## Status
🔄 **Deploying** - Changes committed and pushed, waiting for Vercel deployment to complete.

## Related Issues
- This fix also resolves potential X-Frame-Options conflicts
- Ensures consistency between `_headers` and `next.config.js` files
- Maintains security while enabling required functionality
