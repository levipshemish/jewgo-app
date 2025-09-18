# Restaurant Interaction Tracking Feature

## Overview

The Restaurant Interaction Tracking feature enables real-time tracking and display of user interactions with restaurant listings, including views, shares, and favorites. This feature provides accurate engagement metrics and enhances user experience with responsive UI feedback.

## Features

### 1. View Tracking
- **Automatic tracking**: Page views are tracked automatically when users visit restaurant pages
- **Session-based**: Prevents duplicate view tracking within the same session
- **Real-time updates**: View counts update immediately in the database
- **Display**: View count is shown in the restaurant header with a eye icon

### 2. Share Tracking
- **Manual tracking**: Triggered when users click the share button
- **Native sharing**: Uses browser's native share API when available
- **Fallback support**: Clipboard copy functionality for unsupported browsers
- **Real-time updates**: Share counts increment immediately
- **Display**: Share count is shown with a share icon

### 3. Favorite Tracking
- **Toggle functionality**: Users can like/unlike restaurants
- **Bidirectional**: Supports both increment (like) and decrement (unlike) operations
- **Visual feedback**: Heart icon changes color and animation based on state
- **Real-time updates**: Favorite counts update immediately
- **Persistent state**: Favorite status is maintained across sessions

## Technical Implementation

### Backend Components

#### Database Schema
- **Table**: `restaurants`
- **New Fields**:
  - `view_count` (Integer, default: 0)
  - `share_count` (Integer, default: 0) 
  - `favorite_count` (Integer, default: 0)
- **Indexes**: Added for performance on count fields

#### API Endpoints
- `POST /api/v5/restaurants/{id}/view` - Track page view
- `POST /api/v5/restaurants/{id}/share` - Track share action
- `POST /api/v5/restaurants/{id}/favorite` - Add to favorites
- `POST /api/v5/restaurants/{id}/unfavorite` - Remove from favorites

#### Service Layer
- **Restaurant Service V5**: Enhanced with interaction tracking methods
- **Cache Management**: Automatic cache invalidation after count updates
- **Response Format**: Includes both direct fields and stats object for compatibility

### Frontend Components

#### ListingHeader Component
- **Interactive buttons**: Share, favorite/unfavorite with real-time feedback
- **State management**: Smart internal state that prevents stale data overwrites
- **API integration**: Direct calls to backend tracking endpoints
- **Visual effects**: Animations, haptic feedback, and particle effects
- **Error handling**: Graceful fallbacks and user feedback

#### Data Flow
1. **Page Load**: Restaurant details API returns current counts
2. **User Interaction**: Button click triggers API call
3. **API Response**: Backend returns updated count
4. **State Update**: Frontend updates internal state with new count
5. **Cache Invalidation**: Backend clears cache for fresh data
6. **Stale Data Protection**: Frontend ignores outdated prop updates

## Key Features

### Smart State Management
- **Initial Load**: Counts initialized from API data
- **User Interactions**: Internal state updates immediately
- **Stale Data Protection**: Incoming props with lower counts are ignored
- **Fresh Data Acceptance**: Higher counts from API are accepted
- **Race Condition Prevention**: Debouncing prevents multiple rapid clicks

### Performance Optimizations
- **Client-side Rate Limiting**: 150ms minimum interval between requests
- **Request Deduplication**: Prevents duplicate API calls
- **Cache Invalidation**: Targeted cache clearing for affected restaurants
- **Optimized Queries**: Database operations use indexes for performance

### Error Handling
- **API Failures**: Graceful fallbacks with user notifications
- **Network Issues**: Retry logic with exponential backoff
- **State Recovery**: Automatic reversion on failed operations
- **User Feedback**: Toast notifications for all actions

## Usage Examples

### Basic Usage
```typescript
<ListingHeader
  restaurantId={1577}
  viewCount={766}
  shareCount={25}
  favoriteCount={17}
  isFavorited={false}
  onFavorite={() => toggleFavorite(restaurant)}
  onShared={() => showShareSuccess()}
/>
```

### With Custom Handlers
```typescript
<ListingHeader
  restaurantId={restaurantId}
  viewCount={restaurant.stats.view_count}
  shareCount={restaurant.stats.share_count}
  favoriteCount={restaurant.stats.favorite_count}
  isFavorited={favorites.has(restaurant.id)}
  onFavorite={() => handleFavoriteToggle(restaurant)}
  onShared={() => analytics.trackShare(restaurant)}
  onReport={() => openReportModal(restaurant)}
/>
```

## API Response Format

### Restaurant Details Response
```json
{
  "data": {
    "id": 1577,
    "name": "Restaurant Name",
    "view_count": 766,
    "share_count": 25,
    "favorite_count": 17,
    "stats": {
      "view_count": 766,
      "share_count": 25,
      "favorite_count": 17
    }
  }
}
```

### Interaction Tracking Response
```json
{
  "data": {
    "restaurant_id": 1577,
    "restaurant_name": "Restaurant Name",
    "share_count": 26,
    "share_count_before": 25,
    "increment": 1
  },
  "success": true
}
```

## Configuration

### Rate Limiting
- **Share tracking**: 30 requests per minute per user
- **Favorite tracking**: 60 requests per minute per user
- **View tracking**: 100 requests per minute per user
- **Client-side**: 150ms minimum interval between requests

### Caching
- **Restaurant Details**: Cache disabled for fresh interaction counts
- **Cache Invalidation**: Automatic after each interaction
- **TTL**: No caching for interaction endpoints

### Security
- **CSRF Exempt**: Interaction tracking endpoints exempt from CSRF protection
- **Optional Auth**: Works for both authenticated and anonymous users
- **Input Validation**: All inputs validated and sanitized

## Monitoring

### Metrics Tracked
- **Interaction Rates**: Views, shares, favorites per restaurant
- **API Performance**: Response times and error rates
- **User Engagement**: Interaction patterns and trends
- **Error Monitoring**: Failed requests and recovery actions

### Health Checks
- **Database Connectivity**: Verified through interaction endpoints
- **Cache Performance**: Monitored through invalidation success
- **API Availability**: Continuous monitoring of all endpoints

## Troubleshooting

### Common Issues
1. **Stale Counts**: Ensure cache invalidation is working
2. **Missing Increments**: Check API endpoint responses
3. **State Resets**: Verify smart state management logic
4. **Rate Limiting**: Monitor request frequency and limits

### Debug Information
- **Backend Logs**: Check restaurant service logs for API calls
- **Frontend State**: Monitor internal state vs props in browser console
- **API Responses**: Verify correct data format and values
- **Cache Status**: Check Redis cache invalidation

## Migration Notes

### Database Migration
- **Migration File**: `backend/database/migrations/add_interaction_counts.py`
- **Rollback**: Supported through standard Alembic procedures
- **Data Integrity**: All new fields have default values and constraints

### API Compatibility
- **Backward Compatible**: Existing restaurant API unchanged
- **New Endpoints**: All interaction endpoints are additive
- **Response Format**: Maintains existing structure with stats enhancement

## Future Enhancements

### Potential Improvements
- **Aggregate Analytics**: Daily/weekly/monthly interaction summaries
- **User Preferences**: Personalized interaction history
- **Social Features**: Share to specific platforms
- **Recommendation Engine**: Use interaction data for recommendations

### Performance Optimizations
- **Batch Updates**: Group multiple interactions for efficiency
- **Background Processing**: Async handling of non-critical updates
- **CDN Integration**: Cache interaction counts at edge locations
- **Real-time Sync**: WebSocket updates for live count changes

---

## Implementation Timeline

✅ **Phase 1**: Database schema and backend API (Completed)  
✅ **Phase 2**: Frontend integration and state management (Completed)  
✅ **Phase 3**: Cache optimization and error handling (Completed)  
✅ **Phase 4**: Testing and debugging (Completed)  
✅ **Phase 5**: Production deployment and monitoring (Completed)  

**Status**: Feature is fully implemented and production-ready.
