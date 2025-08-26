# URL Validation and Normalization System

## Overview

The URL validation and normalization system provides a flexible, user-friendly approach to handling website URLs in the JewGo application. This system allows users to enter URLs in various formats while automatically normalizing them for consistent database storage.

## Key Features

### 🎯 **Flexible Input Formats**
Users can enter URLs in multiple formats:
- `example.com`
- `www.example.com`
- `https://example.com`
- `http://example.com`
- `example.com/path`
- `example.com:8080/path?param=value`

### 🔧 **Automatic Normalization**
The system automatically:
- Adds `https://` protocol if none is specified
- Converts to lowercase
- Removes default ports (80, 443)
- Strips tracking parameters (utm_*, gclid, fbclid, etc.)
- Sorts query parameters for consistency
- Removes fragments (#)
- Normalizes path slashes

### 🛡️ **Smart Validation**
- Validates URL syntax
- Checks for common fake/test domains
- Ensures proper hostname format
- Supports international domain names (IDN)

## Implementation Details

### URL Normalization Utility

**File:** `frontend/lib/utils/url-normalize.ts`

```typescript
export function normalizeUrl(input: string, opts: NormalizeOptions = {}): string
```

**Options:**
- `allowHttp`: Allow HTTP protocol (default: true)
- `stripTrailingSlash`: Remove trailing slashes (default: true)
- `dropTrackingParams`: Remove tracking parameters (default: true)
- `allowedProtocols`: Allowed protocols (default: ['http:', 'https:'])

### Form Integration

**File:** `frontend/lib/validations/restaurant-form-schema.ts`

The URL schema integrates with Zod validation:

```typescript
const urlSchema = z.string()
  .refine((url) => {
    if (!url) return true; // Allow empty
    try {
      normalizeUrl(url);
      return true;
    } catch {
      return false;
    }
  }, 'Please enter a valid website URL')
  .transform((url) => {
    if (!url) return url;
    try {
      return normalizeUrl(url);
    } catch {
      return url; // Return original if normalization fails
    }
  })
  .refine((url) => {
    if (!url) return true; // Allow empty
    // Check for common fake URL patterns
    const fakePatterns = ['example.com', 'test.com', 'fake.com', 'placeholder.com'];
    return !fakePatterns.some(pattern => url.toLowerCase().includes(pattern));
  }, 'Please enter a real website URL')
  .optional()
  .or(z.literal(''));
```

### User Interface Updates

**File:** `frontend/components/forms/EnhancedAddEateryForm.tsx`

The form fields now provide:
- Flexible input type (`text` instead of `url`)
- Helpful placeholder text
- User guidance text
- Better error messages

```typescript
<input
  {...field}
  type="text"
  placeholder="example.com or https://www.example.com"
/>
<p className="text-xs text-gray-500 mt-1">
  Accepts: example.com, www.example.com, https://example.com, etc.
</p>
```

## Supported URL Fields

The following form fields use the new URL validation system:

1. **Website** - Main business website
2. **Google Listing URL** - Google Maps/My Business link
3. **Instagram Link** - Instagram profile/page
4. **Facebook Link** - Facebook page/profile
5. **TikTok Link** - TikTok profile

## Examples

### Input → Normalized Output

| Input | Normalized Output |
|-------|------------------|
| `Example.COM` | `https://example.com/` |
| `example.com:80/foo//bar/?b=2&a=1&utm_source=x` | `https://example.com/foo/bar?a=1&b=2` |
| `HTTP://EXAMPLE.COM:80/#frag` | `http://example.com/` |
| `http://example.com/` (with allowHttp: false) | `https://example.com/` |

### Tracking Parameter Removal

The system automatically removes common tracking parameters:
- `utm_source`, `utm_medium`, `utm_campaign`
- `gclid`, `fbclid`, `msclkid`
- `mc_cid`, `mc_eid`, `mkt_tok`
- `igshid`, `ref`, `ref_src`

## Error Handling

### Validation Errors
- **Invalid URL syntax**: "Please enter a valid website URL"
- **Fake/test domains**: "Please enter a real website URL"
- **Empty URLs**: Allowed (optional fields)

### Normalization Failures
- If normalization fails, the original URL is preserved
- Validation continues to work with the original input
- No data loss occurs during processing

## Database Storage

### Normalized URLs
- All URLs are stored in normalized form
- Consistent format for deduplication
- Optimized for database queries

### Example Database Record
```sql
INSERT INTO restaurants (website, google_listing_url, instagram_link) 
VALUES (
  'https://example.com/',
  'https://maps.google.com/maps?cid=123456',
  'https://instagram.com/restaurantname'
);
```

## Benefits

### For Users
- ✅ **Easier input** - No need to remember exact URL format
- ✅ **Flexible entry** - Accepts various URL formats
- ✅ **Clear guidance** - Helpful placeholder text and instructions
- ✅ **Better UX** - Less validation errors

### For Developers
- ✅ **Consistent data** - All URLs normalized to same format
- ✅ **Reduced duplicates** - Same URL in different formats treated as one
- ✅ **Better analytics** - Clean data for reporting
- ✅ **Maintainable code** - Centralized URL handling

### For Data Quality
- ✅ **Clean URLs** - Removes tracking parameters and fragments
- ✅ **Validated data** - Ensures proper URL syntax
- ✅ **Deduplication** - Prevents duplicate entries
- ✅ **Analytics ready** - Clean data for business intelligence

## Testing

### Unit Tests
```typescript
// Test URL normalization
expect(normalizeUrl('Example.COM')).toBe('https://example.com/');
expect(normalizeUrl('example.com:80/foo?utm_source=x')).toBe('https://example.com/foo');
```

### Integration Tests
- Form submission with various URL formats
- Validation error handling
- Database storage verification

## Future Enhancements

### Planned Features
- [ ] URL reachability checking (server-side)
- [ ] Domain reputation scoring
- [ ] Automatic screenshot generation
- [ ] Link preview functionality
- [ ] URL health monitoring

### Configuration Options
- [ ] Custom tracking parameter lists
- [ ] Domain allowlist/blocklist
- [ ] Protocol restrictions
- [ ] Path validation rules

## Related Files

- `frontend/lib/utils/url-normalize.ts` - Core normalization utility
- `frontend/lib/validations/restaurant-form-schema.ts` - Zod schema integration
- `frontend/components/forms/EnhancedAddEateryForm.tsx` - Form implementation
- `docs/features/` - Feature documentation

## Migration Notes

### From Previous System
- **Breaking Changes**: None
- **Data Migration**: Existing URLs will be normalized on next update
- **Backward Compatibility**: Fully maintained
- **Performance Impact**: Minimal (client-side processing)

### Deployment Considerations
- No database schema changes required
- No API changes required
- Frontend-only enhancement
- Gradual rollout possible
