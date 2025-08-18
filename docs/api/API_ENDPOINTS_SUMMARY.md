# JewGo API Endpoints Summary

## Overview

The JewGo API provides a comprehensive REST API for managing kosher restaurants, reviews, and related data. The API is built with Flask and follows RESTful conventions with proper error handling and response formatting.

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints are public, but some admin operations may require authentication in the future.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Endpoints

### Health & Status

#### GET `/health`
Check API health and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "database": "connected",
    "services": {
      "database": "healthy",
      "google_places": "healthy"
    }
  }
}
```

### Restaurants

#### GET `/api/restaurants`
Get all restaurants with optional filtering.

**Query Parameters:**
- `kosher_type` (string): Filter by kosher type (meat, dairy, pareve)
- `status` (string): Filter by status (active, inactive, pending)
- `limit` (integer): Number of results (default: 100, max: 1000)
- `offset` (integer): Number of results to skip (default: 0)
- `search` (string): Search by name or address
- `state` (string): Filter by state
- `city` (string): Filter by city

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Restaurant Name",
        "address": "123 Main St",
        "city": "Miami",
        "state": "FL",
        "phone_number": "+1-555-1234",
        "website": "https://example.com",
        "kosher_category": "dairy",
        "certifying_agency": "ORB",
        "image_url": "https://example.com/image.jpg",
        "google_rating": 4.5,
        "google_review_count": 150,
        "is_open": true,
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET `/api/restaurants/{id}`
Get a specific restaurant by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurant Name",
      "address": "123 Main St",
      "city": "Miami",
      "state": "FL",
      "zip_code": "33101",
      "phone_number": "+1-555-1234",
      "website": "https://example.com",
      "kosher_category": "dairy",
      "certifying_agency": "ORB",
      "listing_type": "Restaurant",
      "image_url": "https://example.com/image.jpg",
      "google_rating": 4.5,
      "google_review_count": 150,
      "google_reviews": [...],
      "specials": [...],
      "hours_of_operation": "Mon-Fri 9:00 AM-5:00 PM",
      "latitude": 25.7617,
      "longitude": -80.1918,
      "is_cholov_yisroel": true,
      "is_pas_yisroel": false,
      "cholov_stam": false,
      "is_open": true,
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### GET `/api/restaurants/search`
Search restaurants with advanced filtering.

**Query Parameters:**
- `q` (string): Search query
- `category` (string): Filter by category
- `state` (string): Filter by state
- `is_kosher` (boolean): Filter by kosher status
- `limit` (integer): Number of results (default: 50)
- `offset` (integer): Number of results to skip (default: 0)

#### GET `/api/restaurants/filter-options`
Get available filter options.

**Response:**
```json
{
  "success": true,
  "data": {
    "kosher_types": ["meat", "dairy", "pareve"],
    "states": ["FL", "NY", "CA"],
    "cities": ["Miami", "New York", "Los Angeles"],
    "certifying_agencies": ["ORB", "OU", "Kof-K"]
  }
}
```

#### GET `/api/restaurants/statistics`
Get restaurant statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_restaurants": 100,
    "active_restaurants": 95,
    "restaurants_with_images": 80,
    "restaurants_with_reviews": 75,
    "restaurants_with_websites": 90,
    "kosher_types": {
      "dairy": 50,
      "meat": 30,
      "pareve": 20
    },
    "states": {
      "FL": 60,
      "NY": 25,
      "CA": 15
    }
  }
}
```

### Reviews

#### GET `/api/reviews`
Get reviews with optional filtering.

**Query Parameters:**
- `restaurant_id` (integer): Filter by restaurant ID
- `status` (string): Filter by status (approved, pending, rejected)
- `limit` (integer): Number of results (default: 10)
- `offset` (integer): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_123",
        "restaurant_id": 1,
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "rating": 5,
        "title": "Great food!",
        "content": "Excellent kosher restaurant with amazing food.",
        "images": ["https://example.com/image1.jpg"],
        "status": "approved",
        "verified_purchase": true,
        "helpful_count": 5,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 50,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST `/api/reviews`
Create a new review.

**Request Body:**
```json
{
  "restaurant_id": 1,
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "rating": 5,
  "title": "Great food!",
  "content": "Excellent kosher restaurant with amazing food.",
  "images": ["https://example.com/image1.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "review": {
      "id": "review_123",
      "restaurant_id": 1,
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "rating": 5,
      "title": "Great food!",
      "content": "Excellent kosher restaurant with amazing food.",
      "images": ["https://example.com/image1.jpg"],
      "status": "pending",
      "verified_purchase": false,
      "helpful_count": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  },
  "message": "Review submitted successfully"
}
```

#### GET `/api/reviews/{id}`
Get a specific review by ID.

#### PUT `/api/reviews/{id}`
Update a review (admin only).

#### DELETE `/api/reviews/{id}`
Delete a review (admin only).

### Admin Operations

#### POST `/api/admin/google-reviews/fetch`
Fetch Google reviews for restaurants.

**Request Body:**
```json
{
  "restaurant_id": 1,
  "batch_size": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 10,
    "updated": 8,
    "errors": [],
    "details": [
      {
        "restaurant_id": 1,
        "name": "Restaurant Name",
        "status": "updated"
      }
    ]
  },
  "message": "Google reviews batch update completed"
}
```

#### GET `/api/admin/google-reviews/status`
Get Google reviews status.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_restaurants": 100,
    "with_reviews": 75,
    "without_reviews": 25,
    "coverage_percentage": 75.0,
    "recent_reviews_count": 10,
    "sample_restaurants": [
      {
        "name": "Restaurant Name",
        "review_count": 150,
        "overall_rating": 4.5
      }
    ]
  }
}
```

### Analytics

#### GET `/api/analytics`
Get analytics data.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_restaurants": 100,
    "total_reviews": 500,
    "average_rating": 4.2,
    "top_restaurants": [...],
    "recent_activity": [...],
    "growth_metrics": {
      "restaurants_added_this_month": 5,
      "reviews_added_this_month": 25
    }
  }
}
```

### Feedback

#### POST `/api/feedback`
Submit user feedback.

**Request Body:**
```json
{
  "type": "bug_report",
  "subject": "Issue with search",
  "message": "Search is not working properly",
  "user_email": "user@example.com",
  "user_agent": "Mozilla/5.0...",
  "page_url": "https://example.com/search"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback_id": "feedback_123",
    "status": "submitted"
  },
  "message": "Feedback submitted successfully"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Admin endpoints**: 50 requests per minute
- **Scraping endpoints**: 10 requests per minute

## Pagination

Endpoints that return lists support pagination:

- `limit`: Number of items per page (default: varies by endpoint)
- `offset`: Number of items to skip
- Response includes `total`, `limit`, and `offset` fields

## Filtering

Many endpoints support filtering:

- **Exact match**: `?status=active`
- **Multiple values**: `?kosher_type=meat&kosher_type=dairy`
- **Range**: `?rating_min=4&rating_max=5`
- **Search**: `?search=restaurant name`

## Sorting

Endpoints that support sorting use the `sort` parameter:

- `?sort=name` - Sort by name ascending
- `?sort=-name` - Sort by name descending
- `?sort=rating,-created_at` - Sort by rating ascending, then by creation date descending

## Data Types

### Restaurant Object
```json
{
  "id": "integer",
  "name": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zip_code": "string",
  "phone_number": "string",
  "website": "string|null",
  "kosher_category": "string (meat|dairy|pareve)",
  "certifying_agency": "string",
  "listing_type": "string",
  "image_url": "string|null",
  "google_rating": "number|null",
  "google_review_count": "integer|null",
  "google_reviews": "array|null",
  "specials": "array|null",
  "hours_of_operation": "string|null",
  "latitude": "number|null",
  "longitude": "number|null",
  "is_cholov_yisroel": "boolean|null",
  "is_pas_yisroel": "boolean|null",
  "cholov_stam": "boolean|null",
  "is_open": "boolean",
  "status": "string (active|inactive|pending)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Review Object
```json
{
  "id": "string",
  "restaurant_id": "integer",
  "user_name": "string",
  "user_email": "string|null",
  "rating": "integer (1-5)",
  "title": "string|null",
  "content": "string",
  "images": "array|null",
  "status": "string (approved|pending|rejected)",
  "verified_purchase": "boolean",
  "helpful_count": "integer",
  "report_count": "integer",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Versioning

The API version is included in the response headers:

```
X-API-Version: 1.0.0
```

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Restaurant management endpoints
- Review system
- Google Places integration
- Admin operations
- Analytics and feedback

## Support

For API support:
- Check the error messages for specific issues
- Verify request format and parameters
- Ensure proper authentication (if required)
- Check rate limiting if receiving 429 errors

## SDKs and Libraries

Official SDKs and libraries are available for:
- JavaScript/TypeScript
- Python
- Ruby
- PHP

See the [SDK documentation](../sdk/) for more details. 