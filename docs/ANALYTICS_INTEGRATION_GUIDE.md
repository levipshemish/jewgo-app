# Analytics Integration Guide

**Version**: 1.0  
**Date**: 2025-09-02  
**Status**: Production Ready

## Overview

The JewGo application now includes a comprehensive analytics system that provides:

- **Google Analytics Integration** - Full GA4 support with enhanced ecommerce
- **Custom Event Tracking** - Restaurant, marketplace, and user behavior tracking
- **Performance Monitoring** - Web Vitals and custom performance metrics
- **Error Tracking** - Comprehensive error monitoring and reporting
- **User Engagement Analytics** - Conversion tracking and goal completion
- **Real-time Analytics API** - Custom analytics endpoint for advanced use cases

## 🚀 Quick Start

### 1. Environment Configuration

Add these variables to your `.env.local`:

```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GA_ENABLED=true
NEXT_PUBLIC_GA_DEBUG_MODE=false

# Enhanced Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_PROVIDER=google_analytics
NEXT_PUBLIC_ANALYTICS_TRACK_USER_ID=true
NEXT_PUBLIC_ANALYTICS_TRACK_PERFORMANCE=true
NEXT_PUBLIC_ANALYTICS_TRACK_ERRORS=true
```

### 2. Basic Usage in Components

```tsx
import useAnalytics from '@/lib/hooks/useAnalytics';

export function MyComponent() {
  const { trackEvent, trackRestaurantView } = useAnalytics();

  const handleClick = () => {
    trackEvent('button_click', { button_name: 'example' });
  };

  const handleRestaurantView = () => {
    trackRestaurantView(123, 'Kosher Deli Plus');
  };

  return (
    <div>
      <button onClick={handleClick}>Track Click</button>
      <button onClick={handleRestaurantView}>View Restaurant</button>
    </div>
  );
}
```

## 📊 Available Tracking Functions

### Core Tracking

```tsx
const { trackEvent, trackPageView } = useAnalytics();

// Custom event
trackEvent('custom_action', { 
  category: 'user_engagement',
  value: 10 
});

// Page view
trackPageView('/restaurants', { 
  title: 'Restaurant List',
  category: 'restaurant' 
});
```

### Restaurant Tracking

```tsx
const { 
  trackRestaurantView, 
  trackRestaurantSearch, 
  trackRestaurantFavorite,
  trackRestaurantReview 
} = useAnalytics();

// Track restaurant view
trackRestaurantView(123, 'Restaurant Name', {
  rating: 4.5,
  cuisine: 'kosher'
});

// Track search
trackRestaurantSearch('kosher deli', 25, {
  filters: { cuisine: 'deli', location: 'current' }
});

// Track favorite
trackRestaurantFavorite(123, 'add', 'Restaurant Name');

// Track review
trackRestaurantReview(123, 5, 150);
```

### Marketplace Tracking

```tsx
const { 
  trackMarketplaceListingView, 
  trackMarketplacePurchase 
} = useAnalytics();

// Track listing view
trackMarketplaceListingView('mp_001', 'Vintage Menorah', 'Judaica');

// Track purchase
trackMarketplacePurchase('mp_001', 75, 'USD');
```

### User Engagement

```tsx
const { 
  trackUserEngagement, 
  trackUserSignup, 
  trackUserLogin 
} = useAnalytics();

// Track engagement
trackUserEngagement('feature_click', {
  feature_name: 'favorites',
  page: '/restaurants'
});

// Track signup/login
trackUserSignup('email', 'google_search');
trackUserLogin('email', 'direct');
```

### Performance Tracking

```tsx
const { trackPerformance } = useAnalytics();

// Track custom performance metrics
trackPerformance('api_response_time', 150);
trackPerformance('image_load_time', 200);
trackPerformance('database_query_time', 50);
```

### Error Tracking

```tsx
const { trackError } = useAnalytics();

// Track errors
try {
  // Some operation
} catch (error) {
  trackError(error, {
    context: 'user_action',
    component: 'SearchForm'
  });
}

// Track string errors
trackError('Validation failed', {
  error_type: 'validation',
  field: 'email'
});
```

### Conversion Tracking

```tsx
const { trackConversion } = useAnalytics();

// Track goal completion
trackConversion('first_search', 10, {
  source: 'google',
  medium: 'cpc',
  campaign: 'kosher_restaurants'
});
```

### Ecommerce Tracking

```tsx
const { trackPurchase } = useAnalytics();

// Track purchase
trackPurchase('order_123', 150, [
  {
    id: 'item_001',
    name: 'Kosher Meal',
    price: 150,
    quantity: 1
  }
], 'USD');
```

## 🔧 Configuration Options

### Analytics Configuration

```typescript
import { getAnalyticsConfig } from '@/lib/utils/analytics-config';

const config = getAnalyticsConfig();

// Check if analytics is enabled
if (config.enabled) {
  // Analytics is active
}

// Check Google Analytics status
if (config.gaEnabled && config.gaMeasurementId) {
  // GA is configured
}
```

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | - | Google Analytics measurement ID |
| `NEXT_PUBLIC_GA_ENABLED` | `true` | Enable Google Analytics |
| `NEXT_PUBLIC_GA_DEBUG_MODE` | `false` | Enable GA debug mode |
| `NEXT_PUBLIC_GA_ENHANCED_ECOMMERCE` | `true` | Enable enhanced ecommerce |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` | Enable analytics system |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `google_analytics` | Analytics provider |
| `NEXT_PUBLIC_ANALYTICS_TRACK_USER_ID` | `true` | Track user IDs |
| `NEXT_PUBLIC_ANALYTICS_TRACK_PERFORMANCE` | `true` | Track performance metrics |
| `NEXT_PUBLIC_ANALYTICS_TRACK_ERRORS` | `true` | Track errors |
| `NEXT_PUBLIC_ANALYTICS_BATCH_SIZE` | `10` | Events per batch |
| `NEXT_PUBLIC_ANALYTICS_FLUSH_INTERVAL` | `30000` | Flush interval (ms) |

## 📈 Google Analytics Integration

### Automatic Tracking

The system automatically tracks:

- **Page Views** - All route changes
- **User Properties** - User ID, email, signup date
- **Performance Metrics** - Core Web Vitals
- **Error Events** - JavaScript errors and unhandled rejections

### Enhanced Ecommerce

Enable enhanced ecommerce tracking:

```typescript
// Track product views
trackMarketplaceListingView('prod_123', 'Product Name', 'Category');

// Track purchases
trackMarketplacePurchase('prod_123', 100, 'USD');

// Track add to cart
trackEvent('add_to_cart', {
  items: [{ id: 'prod_123', name: 'Product', price: 100, quantity: 1 }]
});
```

### Custom Dimensions

Set up custom dimensions in Google Analytics:

```typescript
// User type dimension
trackEvent('user_property', {
  user_type: 'premium',
  signup_date: '2025-01-01'
});

// Content category dimension
trackEvent('content_view', {
  content_category: 'kosher_restaurants',
  content_type: 'listing'
});
```

## 🔍 Analytics API

### Endpoint

```
POST /api/analytics
```

### Request Format

```json
{
  "events": [
    {
      "event": "user_action",
      "properties": {
        "action": "click",
        "button": "search"
      },
      "timestamp": 1640995200000
    }
  ],
  "batch_size": 1,
  "timestamp": 1640995200000
}
```

### Response Format

```json
{
  "success": true,
  "processed_events": 1,
  "batch_id": 1640995200000,
  "message": "Batch events processed successfully"
}
```

### Configuration Endpoint

```
GET /api/analytics
```

Returns current analytics configuration and status.

## 📱 Mobile and PWA Support

### Service Worker Integration

Analytics events are cached when offline and sent when connection is restored.

### Mobile Performance

- Optimized for mobile devices
- Reduced payload sizes
- Efficient batching and flushing

## 🧪 Testing and Development

### Development Mode

In development, analytics events are logged to console and sent to the local API endpoint.

### Testing Analytics

```tsx
// Mock analytics for testing
jest.mock('@/lib/hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => ({
    trackEvent: jest.fn(),
    trackRestaurantView: jest.fn(),
    // ... other methods
  })
}));
```

### Analytics Examples

See `frontend/components/analytics/AnalyticsExamples.tsx` for comprehensive examples of all tracking functions.

## 📊 Dashboard Integration

### Admin Analytics Dashboard

Access analytics data at `/admin/analytics` (requires `data_admin` role or higher).

### Real-time Metrics

- User engagement rates
- Restaurant view counts
- Search performance
- Error rates
- Performance metrics

## 🔒 Privacy and Compliance

### Data Anonymization

- User emails are hashed before tracking
- Sensitive data is automatically filtered
- IP addresses are not stored

### GDPR Compliance

- User consent tracking
- Data deletion support
- Privacy policy integration

### Cookie Management

- Respects user cookie preferences
- Minimal cookie usage
- Clear cookie policy

## 🚨 Troubleshooting

### Common Issues

1. **Analytics not working**
   - Check environment variables
   - Verify Google Analytics configuration
   - Check browser console for errors

2. **Events not appearing in GA**
   - Verify measurement ID
   - Check GA property settings
   - Ensure enhanced ecommerce is enabled

3. **Performance issues**
   - Reduce batch size
   - Increase flush interval
   - Check network connectivity

### Debug Mode

Enable debug mode to see detailed analytics logs:

```bash
NEXT_PUBLIC_GA_DEBUG_MODE=true
```

### Support

For analytics issues:

1. Check the `/api/analytics` endpoint status
2. Review browser console logs
3. Verify environment configuration
4. Check Google Analytics real-time reports

## 🔄 Migration Guide

### From Old Analytics System

1. Replace `analytics.track()` calls with `useAnalytics()` hook
2. Update event names to match new system
3. Migrate custom properties to new format
4. Test all tracking functions

### Example Migration

**Old:**
```tsx
import { analytics } from '@/lib/utils/analytics';

analytics.track('restaurant_view', { id: 123 });
```

**New:**
```tsx
import useAnalytics from '@/lib/hooks/useAnalytics';

const { trackRestaurantView } = useAnalytics();
trackRestaurantView(123, 'Restaurant Name');
```

## 📚 Additional Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Enhanced Ecommerce Guide](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [Custom Dimensions Guide](https://support.google.com/analytics/answer/2709828)
- [Privacy Best Practices](https://developers.google.com/analytics/devguides/collection/ga4/privacy)

---

**Last Updated**: 2025-09-02  
**Next Review**: 2025-09-09
