# Authentication Integration Guide

This document describes the integrated authentication system that connects the frontend Supabase authentication with the backend Flask API.

## Overview

The authentication system has been unified to provide a seamless experience between the frontend and backend:

- **Frontend**: Uses Supabase for user authentication (email/password, OAuth)
- **Backend**: Validates Supabase JWT tokens and provides user-specific API endpoints
- **Integration**: Frontend automatically includes JWT tokens in API requests

## Architecture

### Frontend Authentication Flow

1. **User Sign-in**: User authenticates via Supabase (email/password, Google, Apple)
2. **Session Management**: Supabase manages sessions with secure httpOnly cookies
3. **Token Access**: Frontend retrieves JWT tokens from Supabase session
4. **API Requests**: Frontend includes JWT tokens in Authorization headers
5. **State Management**: useAuth hook manages authentication state with useReducer

### Backend Authentication Flow

1. **Token Validation**: Backend validates JWT tokens using Supabase's public keys
2. **User Context**: Validated user information is added to request context
3. **Authorization**: Role-based access control for different endpoints
4. **Error Handling**: Proper error responses for authentication failures

## Components

### Frontend Components

#### useAuth Hook (`frontend/hooks/useAuth.ts`)

Refactored to use `useReducer` for better state management:

```typescript
const { user, isLoading, error, isAnonymous, signOut, signInAnonymously } = useAuth();
```

**Features:**
- Centralized state management with useReducer
- Race condition prevention for anonymous sign-in
- Automatic token rotation verification
- Proper error handling and loading states

#### User API Client (`frontend/lib/api/user-api.ts`)

Provides a clean interface for backend API calls:

```typescript
const userApi = useUserApi();

// Get user profile
const profile = await userApi.profile.get();

// Update profile
await userApi.profile.update({ display_name: 'John Doe' });

// Manage favorites
await userApi.favorites.add('restaurant-id');
await userApi.favorites.remove('restaurant-id');
```

**Features:**
- Automatic JWT token inclusion
- Error handling and retry logic
- Type-safe API calls
- Consistent error responses

#### Middleware (`frontend/middleware.ts`)

Simplified and improved:

**Improvements:**
- Removed inefficient RBAC caching
- Separated concerns for different user types
- Better error handling with specific responses
- Cleaner code structure

### Backend Components

#### Supabase Auth Manager (`backend/utils/supabase_auth.py`)

Handles JWT token validation and user authentication:

```python
@require_user_auth
def get_user_profile():
    user = get_current_user()
    return jsonify(user)

@require_user_role('admin')
def admin_only_endpoint():
    return jsonify({'message': 'Admin access granted'})
```

**Features:**
- JWT token validation using Supabase public keys
- Role-based access control
- User context injection
- Graceful fallback for missing configuration

#### User API Routes (`backend/routes/user_api.py`)

Provides user-specific endpoints:

- **Profile Management**: Get/update user profile
- **Favorites**: Manage favorite restaurants
- **Reviews**: Create, read, update, delete reviews
- **Activity**: View user activity history
- **Statistics**: Get user statistics

## API Endpoints

### User Profile

```
GET  /api/user/profile          - Get current user's profile
PUT  /api/user/profile          - Update user profile
```

### Favorites

```
GET    /api/user/favorites           - Get user's favorites
POST   /api/user/favorites/{id}      - Add restaurant to favorites
DELETE /api/user/favorites/{id}      - Remove restaurant from favorites
```

### Reviews

```
GET    /api/user/reviews             - Get user's reviews
POST   /api/user/reviews/{id}        - Create review for restaurant
PUT    /api/user/reviews/{id}        - Update review
DELETE /api/user/reviews/{id}        - Delete review
```

### Activity & Stats

```
GET /api/user/activity              - Get user activity history
GET /api/user/stats                 - Get user statistics
```

## Usage Examples

### Frontend Component Example

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useUserApi } from '@/lib/api/user-api';

function MyComponent() {
  const { user, isLoading } = useAuth();
  const userApi = useUserApi();

  const handleAddFavorite = async (restaurantId: string) => {
    try {
      await userApi.favorites.add(restaurantId);
      // Show success message
    } catch (error) {
      // Handle error
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      {/* Component content */}
    </div>
  );
}
```

### Backend Route Example

```python
from utils.supabase_auth import require_user_auth, get_current_user

@app.route('/api/user/custom-endpoint')
@require_user_auth
def custom_endpoint():
    user = get_current_user()
    user_id = user.get('id')
    
    # Your business logic here
    return jsonify({'message': f'Hello {user_id}'})
```

## Security Features

### Token Validation

- JWT tokens are validated using Supabase's public keys
- Automatic token expiration handling
- Secure token extraction from Authorization headers

### Role-Based Access Control

```python
@require_user_role('admin')      # Admin only
@require_user_role('moderator')  # Moderator or higher
@optional_user_auth             # Optional authentication
```

### Error Handling

- Proper HTTP status codes (401, 403, 500)
- Consistent error response format
- Detailed logging for debugging

## Configuration

### Environment Variables

**Frontend:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_BACKEND_URL=your-backend-url
```

**Backend:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret  # Optional, for enhanced security
```

## Migration Guide

### From Previous System

1. **Update useAuth Hook**: Replace old useState-based hook with new useReducer version
2. **Update API Calls**: Use new userApi client instead of direct fetch calls
3. **Update Middleware**: New middleware handles authentication more efficiently
4. **Add Backend Routes**: Register new user API routes in app factory

### Testing

1. **Frontend Tests**: Test useAuth hook with different authentication states
2. **API Tests**: Test user API endpoints with valid/invalid tokens
3. **Integration Tests**: Test complete authentication flow

## Troubleshooting

### Common Issues

1. **Token Validation Fails**
   - Check Supabase configuration
   - Verify JWT secret is correct
   - Check token expiration

2. **CORS Errors**
   - Ensure backend CORS configuration includes frontend domain
   - Check Authorization header is included in CORS allowed headers

3. **Authentication State Issues**
   - Verify useAuth hook is properly initialized
   - Check Supabase session is valid
   - Clear browser storage if needed

### Debug Mode

Enable debug logging:

```bash
# Frontend
NEXT_PUBLIC_DEBUG_AUTH=true

# Backend
LOG_LEVEL=DEBUG
```

## Performance Considerations

1. **Token Caching**: JWT tokens are cached in Supabase session
2. **API Optimization**: Use pagination for large data sets
3. **Error Handling**: Implement retry logic for transient failures
4. **Loading States**: Show appropriate loading indicators

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Caching**: Redis-based caching for frequently accessed data
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Audit Logging**: Track user actions for security monitoring
