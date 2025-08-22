# Analytics & User Feedback System

## Overview

The JewGo application implements a comprehensive analytics and user feedback system to understand user behavior, track engagement, and collect valuable feedback for continuous improvement.

## 🎯 **Analytics System**

### **Privacy-Focused Analytics**

#### **Privacy-First Approach**
- **No Cookies**: Analytics system doesn't use cookies, ensuring GDPR compliance
- **No Personal Data**: No personal information is collected or stored
- **Lightweight**: Minimal impact on page load times
- **Transparent**: Clear data collection practices

#### **Configuration**

##### **Environment Variables**
```bash
# Frontend
NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com

# Backend
ADMIN_TOKEN=your_admin_token
```

#### **Event Tracking**

##### **Restaurant-Specific Events**
```typescript
// Track restaurant views
analytics.trackRestaurantView(restaurantId, restaurantName, category);

// Track restaurant searches
analytics.trackRestaurantSearch(query, resultsCount, filters);

// Track restaurant filters
analytics.trackRestaurantFilter(filterType, filterValue, activeFilters);

// Track restaurant actions
analytics.trackRestaurantAction('phone_call', restaurantId, restaurantName);
analytics.trackRestaurantAction('website_visit', restaurantId, restaurantName);
analytics.trackRestaurantAction('get_directions', restaurantId, restaurantName);
```

##### **User Engagement Events**
```typescript
// Track user engagement
analytics.trackUserEngagement('scroll_depth', { depth: 75 });
analytics.trackUserEngagement('time_on_page', { time_seconds: 120 });

// Track map interactions
analytics.trackMapInteraction('zoom', { zoom_level: 15 });
analytics.trackMapInteraction('pan', { direction: 'north' });
```

##### **Performance Tracking**
```typescript
// Track performance metrics
analytics.trackPerformance('page_load_time', 1200);
analytics.trackPerformance('api_response_time', 150);

// Track Core Web Vitals
analytics.trackPerformance('LCP', 2.5);
analytics.trackPerformance('FID', 45);
analytics.trackPerformance('CLS', 0.1);
```

##### **Error Tracking**
```typescript
// Track errors
analytics.trackError('api_error', 'Failed to fetch restaurants', {
  endpoint: '/api/restaurants',
  status_code: 500
});
```

#### **API Integration**

##### **Frontend API Route**
```typescript
// frontend/app/api/analytics/route.ts
export async function POST(request: NextRequest) {
  const event = await request.json();
  
  // Store event in database
  await storeAnalyticsEvent(enrichedEvent);
  
  return NextResponse.json({ success: true });
}
```

##### **Backend Analytics Storage**
```python
# Store analytics events in database
class AnalyticsManager:
    def store_event(self, event_data):
        # Store in PostgreSQL for analysis
        pass
    
    def get_analytics_data(self, filters):
        # Retrieve and aggregate analytics data
        pass
```

### **Analytics Dashboard**

#### **Key Metrics**
- **Page Views**: Track which pages users visit most
- **User Engagement**: Time on page, scroll depth, interactions
- **Restaurant Views**: Most viewed restaurants and categories
- **Search Analytics**: Popular search terms and filters
- **Performance Metrics**: Page load times, API response times
- **Error Rates**: Track and monitor application errors

#### **Custom Reports**
```sql
-- Most viewed restaurants
SELECT restaurant_name, COUNT(*) as views
FROM analytics_events
WHERE event_name = 'restaurant_view'
GROUP BY restaurant_name
ORDER BY views DESC
LIMIT 10;

-- Popular search terms
SELECT props->>'query' as search_term, COUNT(*) as searches
FROM analytics_events
WHERE event_name = 'restaurant_search'
GROUP BY search_term
ORDER BY searches DESC
LIMIT 20;
```

## 📝 **User Feedback System**

### **Feedback Types**

#### **1. Corrections**
- **Incorrect Hours**: Wrong opening/closing times
- **Wrong Address**: Incorrect location information
- **Wrong Phone**: Incorrect contact number
- **Wrong Website**: Broken or incorrect website link
- **Wrong Kosher Status**: Incorrect kosher certification
- **Wrong Category**: Incorrect restaurant category
- **Closed Restaurant**: Restaurant is permanently closed
- **Duplicate Listing**: Multiple entries for same restaurant

#### **2. Suggestions**
- **Add Restaurant**: Suggest new restaurant to add
- **Add Photos**: Request additional restaurant photos
- **Add Specials**: Suggest adding special offers
- **Add Reviews**: Request review system
- **Improve Description**: Better restaurant descriptions
- **Add Menu**: Request menu information

#### **3. General Feedback**
- **Bug Report**: Report application bugs
- **Feature Request**: Request new features
- **General Feedback**: General comments and suggestions
- **Partnership Inquiry**: Business partnership requests

### **Feedback Form Component**

#### **Features**
- **Dynamic Categories**: Categories change based on feedback type
- **File Attachments**: Support for images and documents
- **Priority Levels**: Low, medium, high priority classification
- **Contact Information**: Optional email for follow-up
- **Validation**: Comprehensive form validation
- **Analytics Integration**: Track feedback submissions

#### **Usage**
```tsx
import FeedbackForm from '@/components/feedback/FeedbackForm';

<FeedbackForm
  restaurantId={123}
  restaurantName="Kosher Delight"
  onClose={() => setShowFeedback(false)}
  onSubmit={(data) => console.log('Feedback submitted:', data)}
/>
```

### **Feedback Button Component**

#### **Variants**
- **Floating**: Fixed position floating button
- **Inline**: Inline button within content
- **Minimal**: Minimal icon-only button

#### **Usage**
```tsx
import FeedbackButton from '@/components/feedback/FeedbackButton';

// Floating feedback button
<FeedbackButton variant="floating" />

// Restaurant-specific feedback
<FeedbackButton
  restaurantId={123}
  restaurantName="Kosher Delight"
  variant="minimal"
/>
```

### **Backend Feedback Management**

#### **Database Schema**
```sql
CREATE TABLE feedback (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- correction, suggestion, general
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',  -- low, medium, high
    restaurant_id INTEGER REFERENCES restaurants(id),
    restaurant_name VARCHAR(255),
    contact_email VARCHAR(255),
    attachments TEXT,  -- JSON array
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, in_progress, resolved, closed
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(45),
    referrer TEXT,
    admin_notes TEXT,
    assigned_to VARCHAR(100)
);
```

#### **Feedback Manager**
```python
class FeedbackManager:
    def submit_feedback(self, data):
        """Submit new feedback."""
        pass
    
    def get_feedback(self, filters):
        """Get feedback with filters."""
        pass
    
    def update_feedback(self, feedback_id, data):
        """Update feedback status and notes."""
        pass
    
    def get_feedback_stats(self, start_date, end_date):
        """Get feedback statistics."""
        pass
```

### **API Endpoints**

#### **Submit Feedback**
```http
POST /api/feedback
Content-Type: multipart/form-data

{
  "type": "correction",
  "category": "incorrect_hours",
  "description": "Restaurant closes at 9 PM, not 8 PM",
  "priority": "medium",
  "restaurantId": 123,
  "restaurantName": "Kosher Delight",
  "contactEmail": "user@example.com",
  "attachments": [file1, file2]
}
```

#### **Get Feedback (Admin)**
```http
GET /api/feedback?status=pending&priority=high&limit=50
Authorization: Bearer <admin_token>
```

#### **Update Feedback (Admin)**
```http
PUT /api/feedback/feedback_123
Authorization: Bearer <admin_token>

{
  "status": "in_progress",
  "admin_notes": "Investigating hours discrepancy",
  "assigned_to": "admin@jewgo.app"
}
```

#### **Feedback Statistics**
```http
GET /api/feedback/stats?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <admin_token>
```

### **Admin Dashboard**

#### **Feedback Management**
- **View All Feedback**: List all feedback submissions
- **Filter by Status**: Pending, in progress, resolved, closed
- **Filter by Priority**: Low, medium, high priority
- **Filter by Type**: Corrections, suggestions, general
- **Search and Sort**: Advanced filtering capabilities

#### **Feedback Actions**
- **Mark as Resolved**: Close feedback items
- **Add Admin Notes**: Internal comments and notes
- **Assign to Team**: Assign feedback to team members
- **Update Priority**: Change priority levels
- **Delete Feedback**: Remove inappropriate submissions

#### **Statistics and Reports**
- **Feedback Volume**: Total submissions over time
- **Response Times**: Time to resolution
- **Category Breakdown**: Most common feedback types
- **Priority Distribution**: High vs low priority items
- **Restaurant-Specific**: Feedback per restaurant

## 🔧 **Implementation Guide**

### **Setup Instructions**

#### **1. Environment Configuration**
```bash
# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com

# Backend (.env)
ADMIN_TOKEN=your_admin_token
```

#### **2. Database Migration**
```bash
# Run feedback table migration
cd backend
alembic upgrade head
```

#### **3. Initialize Analytics**
```typescript
// In your app layout or main component
import { initAnalytics } from '@/lib/analytics';

initAnalytics({
  trackOutboundLinks: true,
  trackFileDownloads: true,
  enableAutoPageviews: true,
});
```

#### **4. Add Feedback Components**
```tsx
// Add floating feedback button to layout
import FeedbackButton from '@/components/feedback/FeedbackButton';

<FeedbackButton variant="floating" />

// Add restaurant-specific feedback to cards
<FeedbackButton
  restaurantId={restaurant.id}
  restaurantName={restaurant.name}
  variant="minimal"
/>
```

### **Usage Examples**

#### **Track Restaurant View**
```tsx
import { getAnalytics } from '@/lib/analytics';

const analytics = getAnalytics();
analytics?.trackRestaurantView(restaurant.id, restaurant.name, restaurant.kosher_category);
```

#### **Track Search**
```tsx
const handleSearch = (query: string, results: Restaurant[]) => {
  const analytics = getAnalytics();
  analytics?.trackRestaurantSearch(query, results.length, activeFilters);
};
```

#### **Track User Engagement**
```tsx
const handleScroll = () => {
  const scrollPercentage = calculateScrollPercentage();
  if (scrollPercentage >= 75) {
    const analytics = getAnalytics();
    analytics?.trackUserEngagement('scroll_depth', { depth: 75 });
  }
};
```

### **Best Practices**

#### **Analytics Best Practices**
- **Respect Privacy**: Only track necessary data
- **Performance**: Ensure analytics don't impact page load
- **Error Handling**: Don't let analytics failures break the app
- **Consistent Naming**: Use consistent event naming conventions
- **Documentation**: Document all tracked events

#### **Feedback Best Practices**
- **Clear Categories**: Make feedback categories intuitive
- **Validation**: Validate all form inputs
- **File Limits**: Set reasonable file size and type limits
- **Response Times**: Aim to respond to feedback within 24-48 hours
- **Follow-up**: Send confirmation emails for feedback submissions

#### **Security Considerations**
- **Rate Limiting**: Prevent spam feedback submissions
- **File Validation**: Validate all uploaded files
- **Admin Access**: Secure admin endpoints with proper authentication
- **Data Privacy**: Don't store unnecessary personal information

## 📊 **Monitoring and Maintenance**

### **Analytics Monitoring**
- **Event Volume**: Monitor analytics event volume
- **Error Rates**: Track analytics collection errors
- **Performance Impact**: Monitor analytics impact on page load
- **Data Quality**: Ensure data accuracy and completeness

### **Feedback Monitoring**
- **Submission Volume**: Track feedback submission rates
- **Response Times**: Monitor time to resolution
- **User Satisfaction**: Track feedback resolution satisfaction
- **Trend Analysis**: Identify common feedback patterns

### **Regular Maintenance**
- **Data Cleanup**: Archive old analytics and feedback data
- **Performance Optimization**: Optimize database queries
- **Security Updates**: Keep dependencies updated
- **Feature Updates**: Add new analytics and feedback features

---

This comprehensive analytics and feedback system provides valuable insights into user behavior while maintaining privacy and collecting actionable feedback for continuous improvement of the JewGo application. 