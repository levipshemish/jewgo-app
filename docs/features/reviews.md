# Reviews Feature Documentation

## Overview

The reviews feature allows users to submit, view, edit, and delete reviews for kosher restaurants. The system includes moderation capabilities, helpful voting, and flagging functionality.

## Architecture

### Frontend Components
- **ReviewsSection**: Main component for displaying reviews on restaurant pages
- **ReviewForm**: Form for submitting and editing reviews
- **ReviewCard**: Individual review display component
- **ReviewsModal**: Modal for viewing all reviews for a restaurant

### Backend Services
- **ReviewServiceV4**: Service layer for review business logic
- **DatabaseManagerV4**: Database operations for reviews
- **API v4 Routes**: RESTful endpoints for review operations

### API Endpoints

#### Public Reviews (API v4)
- `GET /api/v4/reviews` - Get reviews with filtering and pagination
- `POST /api/v4/reviews` - Create a new review
- `GET /api/v4/reviews/{review_id}` - Get a specific review
- `PUT /api/v4/reviews/{review_id}` - Update a review
- `DELETE /api/v4/reviews/{review_id}` - Delete a review

#### User Reviews (Authenticated)
- `GET /api/user/reviews` - Get current user's reviews
- `POST /api/user/reviews/{restaurant_id}` - Create review for restaurant
- `PUT /api/user/reviews/{review_id}` - Update user's review
- `DELETE /api/user/reviews/{review_id}` - Delete user's review

#### Frontend Proxy
- `GET /api/reviews` - Frontend proxy to backend reviews endpoint
- `POST /api/reviews` - Frontend proxy for creating reviews

## Database Schema

### Reviews Table
```sql
CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id),
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT NOT NULL,
    images TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    helpful_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT FALSE,
    moderator_notes TEXT
);
```

### Review Flags Table
```sql
CREATE TABLE review_flags (
    id VARCHAR(50) PRIMARY KEY,
    review_id VARCHAR(50) REFERENCES reviews(id),
    user_id VARCHAR(50) NOT NULL,
    flag_type VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(50),
    resolution_notes TEXT
);
```

## Feature Flags

### API v4 Reviews Flag
- **Flag Name**: `api_v4_reviews`
- **Environment Variable**: `API_V4_REVIEWS=true`
- **Default**: `false` (disabled)
- **Stage**: `DISABLED`

### Enabling Reviews
1. **Temporary**: Bypass feature flag in `backend/utils/feature_flags_v4.py`
2. **Permanent**: Set `API_V4_REVIEWS=true` in environment variables

## Review Statuses

- **pending**: Review submitted, awaiting moderation
- **approved**: Review approved and visible
- **rejected**: Review rejected by moderator
- **flagged**: Review flagged for review

## Moderation Features

### Automatic Moderation
- Content filtering for inappropriate language
- Spam detection
- Duplicate review detection

### Manual Moderation
- Admin approval/rejection workflow
- Flag resolution
- Moderator notes

### Flag Categories
- Inappropriate Content
- Spam
- Fake Reviews
- Offensive Language
- Irrelevant
- Other

## User Experience

### Review Submission
1. User navigates to restaurant page
2. Clicks "Write a Review" button
3. Fills out review form (rating, title, content, images)
4. Submits review (status: pending)
5. Review appears after moderation approval

### Review Display
1. Reviews displayed in chronological order
2. Pagination for large review sets
3. Filtering by rating and date
4. Helpful voting system
5. Flagging inappropriate content

### Review Management
1. Users can edit their own reviews
2. Users can delete their own reviews
3. Users can view their review history
4. Users can flag other users' reviews

## Security Considerations

### Input Validation
- Rating: 1-5 stars
- Title: Max 255 characters
- Content: Min 10, Max 2000 characters
- Images: Valid URL array
- User data: Sanitized and validated

### Access Control
- Users can only edit/delete their own reviews
- Admin can moderate all reviews
- Public read access to approved reviews

### Rate Limiting
- Review submission: 5 reviews per hour per user
- Review editing: 10 edits per hour per user
- Flagging: 10 flags per hour per user

## Performance Considerations

### Caching
- Review lists cached for 5 minutes
- Individual reviews cached for 10 minutes
- Cache invalidation on review updates

### Database Optimization
- Indexes on `restaurant_id`, `user_id`, `status`, `created_at`
- Pagination for large result sets
- Efficient query patterns

### Frontend Optimization
- Lazy loading of review images
- Virtual scrolling for large review lists
- Debounced search and filtering

## Error Handling

### Common Errors
- **400**: Invalid input data
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Review not found
- **429**: Rate limit exceeded
- **500**: Server error

### Error Responses
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Review content must be at least 10 characters",
  "details": {
    "field": "content",
    "min_length": 10
  }
}
```

## Testing

### Unit Tests
- Review service methods
- Validation logic
- Database operations

### Integration Tests
- API endpoint functionality
- Authentication flows
- Moderation workflows

### End-to-End Tests
- Complete review submission flow
- Moderation approval process
- User interaction scenarios

## Monitoring

### Metrics
- Review submission rate
- Moderation queue size
- Flag frequency by type
- Average review rating
- Review completion rate

### Alerts
- High flag rate
- Moderation queue backlog
- Failed review submissions
- Database performance issues

## Future Enhancements

### Planned Features
- Review helpfulness scoring
- Review sentiment analysis
- Photo moderation
- Review response from restaurant owners
- Review verification badges

### Technical Improvements
- Real-time review updates
- Advanced search and filtering
- Review analytics dashboard
- Automated moderation improvements
- Mobile app integration

## Troubleshooting

### Common Issues

#### Reviews Not Loading
1. Check feature flag status
2. Verify API endpoints are accessible
3. Check database connection
4. Review server logs

#### Review Submission Fails
1. Validate input data
2. Check rate limiting
3. Verify user authentication
4. Check database constraints

#### Moderation Issues
1. Check admin permissions
2. Verify moderation queue
3. Check flag resolution workflow
4. Review moderation logs

### Debug Commands
```bash
# Check feature flag status
curl http://localhost:8082/api/v4/feature-flags

# Test reviews endpoint
curl http://localhost:8082/api/v4/reviews?restaurantId=1

# Check database connection
curl http://localhost:8082/debug/db-test
```

---

*Last Updated: August 28, 2024*
