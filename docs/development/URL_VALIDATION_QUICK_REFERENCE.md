# URL Validation Quick Reference

## 🚀 Quick Start

### Basic Usage

```typescript
import { normalizeUrl } from '@/lib/utils/url-normalize';

// Normalize a URL
const normalized = normalizeUrl('Example.COM');
// Result: 'https://example.com/'
```

### Form Integration

```typescript
import { z } from 'zod';
import { normalizeUrl } from '@/lib/utils/url-normalize';

const urlSchema = z.string()
  .refine((url) => {
    if (!url) return true;
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
      return url;
    }
  });
```

## 📝 Common Patterns

### Input Examples

| Input | Output | Notes |
|-------|--------|-------|
| `example.com` | `https://example.com/` | Adds https:// |
| `www.example.com` | `https://www.example.com/` | Preserves www |
| `https://example.com` | `https://example.com/` | No change |
| `http://example.com` | `http://example.com/` | Preserves http |
| `example.com:80` | `https://example.com/` | Removes default port |
| `example.com/path` | `https://example.com/path` | Preserves path |
| `example.com?utm_source=x` | `https://example.com/` | Removes tracking params |

### Configuration Options

```typescript
const options = {
  allowHttp: false,           // Force HTTPS
  stripTrailingSlash: true,   // Remove trailing slashes
  dropTrackingParams: true,   // Remove UTM parameters
  allowedProtocols: ['https:'] // Only allow HTTPS
};

const normalized = normalizeUrl('http://example.com', options);
// Result: 'https://example.com/'
```

## 🔧 Integration Examples

### React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { urlSchema } from '@/lib/validations/restaurant-form-schema';

const form = useForm({
  resolver: zodResolver(urlSchema),
  defaultValues: {
    website: ''
  }
});
```

### Form Component

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

## 🛠️ Error Handling

### Validation Errors

```typescript
try {
  const normalized = normalizeUrl(input);
  // Success
} catch (error) {
  // Handle validation error
  console.error('Invalid URL:', error.message);
}
```

### Common Error Messages

- `"URL must be a non-empty string."` - Empty or null input
- `"Invalid URL syntax."` - Malformed URL
- `"Unsupported protocol: ftp:"` - Unallowed protocol
- `"Missing hostname."` - No domain name

## 📊 Testing

### Unit Tests

```typescript
import { normalizeUrl } from '@/lib/utils/url-normalize';

describe('URL Normalization', () => {
  test('adds https protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
  });

  test('removes tracking parameters', () => {
    expect(normalizeUrl('example.com?utm_source=x')).toBe('https://example.com/');
  });

  test('normalizes case', () => {
    expect(normalizeUrl('Example.COM')).toBe('https://example.com/');
  });
});
```

### Integration Tests

```typescript
test('form submission with normalized URLs', async () => {
  const form = render(<EnhancedAddEateryForm />);
  
  await user.type(form.getByLabelText('Website'), 'Example.COM');
  await user.click(form.getByText('Submit'));
  
  // Verify normalized URL is submitted
  expect(mockSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      website: 'https://example.com/'
    })
  );
});
```

## 🔍 Debugging

### Enable Debug Logging

```typescript
// In development mode
if (process.env.NODE_ENV === 'development') {
  console.log('Input URL:', input);
  console.log('Normalized URL:', normalized);
}
```

### Common Issues

1. **URL not normalizing**: Check if input is empty or null
2. **Protocol not changing**: Verify `allowHttp` option
3. **Tracking params not removed**: Check `dropTrackingParams` option
4. **Validation errors**: Ensure proper error handling in form

## 📚 Related Documentation

- [Full URL Validation Documentation](../features/URL_VALIDATION_AND_NORMALIZATION.md)
- [Form Validation Schema](../lib/validations/restaurant-form-schema.ts)
- [URL Normalization Utility](../lib/utils/url-normalize.ts)

## 🚀 Best Practices

1. **Always handle errors** - URL normalization can fail
2. **Provide user feedback** - Show helpful error messages
3. **Use consistent options** - Same normalization across your app
4. **Test edge cases** - International domains, special characters
5. **Document custom options** - If you modify default behavior

## 🔄 Migration Guide

### From Strict URL Validation

**Before:**
```typescript
const urlSchema = z.string().url('Please enter a valid URL');
```

**After:**
```typescript
const urlSchema = z.string()
  .refine((url) => {
    if (!url) return true;
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
      return url;
    }
  });
```

### Benefits of Migration

- ✅ **Better UX** - Users can enter URLs in any format
- ✅ **Cleaner data** - Consistent URL format in database
- ✅ **Reduced errors** - Fewer validation failures
- ✅ **Analytics ready** - Clean URLs for reporting
