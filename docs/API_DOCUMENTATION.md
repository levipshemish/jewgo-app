# JewGo API Documentation

## 🚀 API Overview

The JewGo API provides comprehensive endpoints for managing kosher restaurants, synagogues, user authentication, and marketplace functionality.

### Base URL
- **Production**: `https://api.jewgo.app`
- **Development**: `http://localhost:5000`

### Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow a consistent JSON format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2025-01-15T10:30:00Z"
    },
    "token": "jwt-token-here"
  }
}
```

### POST /auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token-here",
    "expires_in": 86400
  }
}
```

### POST /auth/refresh
Refresh JWT token.

**Headers:**
```
Authorization: Bearer <current-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token-here",
    "expires_in": 86400
  }
}
```

### POST /auth/logout
Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## 🍽️ Restaurant Endpoints

### GET /api/restaurants
Get list of restaurants with optional filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `cuisine` (optional): Cuisine type filter
- `kosher_level` (optional): Kosher certification level
- `lat` (optional): Latitude for location-based search
- `lng` (optional): Longitude for location-based search
- `radius` (optional): Search radius in miles (default: 10)

**Example Request:**
```
GET /api/restaurants?search=pizza&cuisine=italian&lat=25.7617&lng=-80.1918&radius=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": "rest_123",
        "name": "Kosher Pizza Palace",
        "address": "123 Main St, Miami, FL",
        "phone": "+13055551234",
        "cuisine": "Italian",
        "kosher_level": "Glatt Kosher",
        "rating": 4.5,
        "review_count": 127,
        "hours": {
          "monday": "11:00-22:00",
          "tuesday": "11:00-22:00",
          "wednesday": "11:00-22:00",
          "thursday": "11:00-22:00",
          "friday": "11:00-15:00",
          "saturday": "Closed",
          "sunday": "11:00-22:00"
        },
        "coordinates": {
          "lat": 25.7617,
          "lng": -80.1918
        },
        "images": [
          "https://api.jewgo.app/images/rest_123_1.jpg"
        ],
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### GET /api/restaurants/{id}
Get detailed information about a specific restaurant.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rest_123",
    "name": "Kosher Pizza Palace",
    "description": "Authentic kosher Italian cuisine in the heart of Miami",
    "address": "123 Main St, Miami, FL 33101",
    "phone": "+13055551234",
    "website": "https://kosherpizzapalace.com",
    "cuisine": "Italian",
    "kosher_level": "Glatt Kosher",
    "kosher_authority": "OU",
    "rating": 4.5,
    "review_count": 127,
    "price_range": "$$",
    "hours": {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00",
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-15:00",
      "saturday": "Closed",
      "sunday": "11:00-22:00"
    },
    "coordinates": {
      "lat": 25.7617,
      "lng": -80.1918
    },
    "images": [
      "https://api.jewgo.app/images/rest_123_1.jpg",
      "https://api.jewgo.app/images/rest_123_2.jpg"
    ],
    "amenities": [
      "WiFi",
      "Parking",
      "Takeout",
      "Delivery"
    ],
    "reviews": [
      {
        "id": "rev_123",
        "user": {
          "id": "user_456",
          "name": "Sarah M.",
          "avatar": "https://api.jewgo.app/avatars/user_456.jpg"
        },
        "rating": 5,
        "comment": "Amazing pizza! The crust is perfect and the toppings are fresh.",
        "created_at": "2025-01-14T15:30:00Z"
      }
    ],
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### POST /api/restaurants
Create a new restaurant (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Kosher Restaurant",
  "description": "Description of the restaurant",
  "address": "456 Oak St, Miami, FL 33101",
  "phone": "+13055559876",
  "website": "https://newkosherrestaurant.com",
  "cuisine": "Mediterranean",
  "kosher_level": "Kosher",
  "kosher_authority": "OU",
  "price_range": "$$$",
  "hours": {
    "monday": "11:00-22:00",
    "tuesday": "11:00-22:00",
    "wednesday": "11:00-22:00",
    "thursday": "11:00-22:00",
    "friday": "11:00-15:00",
    "saturday": "Closed",
    "sunday": "11:00-22:00"
  },
  "coordinates": {
    "lat": 25.7617,
    "lng": -80.1918
  },
  "amenities": ["WiFi", "Parking", "Takeout"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rest_456",
    "name": "New Kosher Restaurant",
    "status": "pending_approval",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "Restaurant submitted for approval"
}
```

### PUT /api/restaurants/{id}
Update restaurant information (requires authentication and ownership).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Restaurant Name",
  "description": "Updated description",
  "phone": "+13055551234",
  "hours": {
    "monday": "10:00-23:00",
    "tuesday": "10:00-23:00",
    "wednesday": "10:00-23:00",
    "thursday": "10:00-23:00",
    "friday": "10:00-16:00",
    "saturday": "Closed",
    "sunday": "10:00-23:00"
  }
}
```

### DELETE /api/restaurants/{id}
Delete a restaurant (requires authentication and ownership).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant deleted successfully"
}
```

## 🏛️ Synagogue Endpoints

### GET /api/synagogues
Get list of synagogues with optional filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `denomination` (optional): Jewish denomination filter
- `lat` (optional): Latitude for location-based search
- `lng` (optional): Longitude for location-based search
- `radius` (optional): Search radius in miles (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "synagogues": [
      {
        "id": "syn_123",
        "name": "Temple Beth Shalom",
        "address": "789 Pine St, Miami, FL 33101",
        "phone": "+13055551234",
        "denomination": "Conservative",
        "rabbi": "Rabbi David Cohen",
        "services": {
          "friday_night": "18:30",
          "saturday_morning": "09:00",
          "saturday_afternoon": "18:00"
        },
        "coordinates": {
          "lat": 25.7617,
          "lng": -80.1918
        },
        "website": "https://templebethshalom.com",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### GET /api/synagogues/{id}
Get detailed information about a specific synagogue.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "syn_123",
    "name": "Temple Beth Shalom",
    "description": "A welcoming Conservative synagogue serving the Miami community",
    "address": "789 Pine St, Miami, FL 33101",
    "phone": "+13055551234",
    "email": "info@templebethshalom.com",
    "website": "https://templebethshalom.com",
    "denomination": "Conservative",
    "rabbi": "Rabbi David Cohen",
    "cantor": "Cantor Sarah Levy",
    "services": {
      "friday_night": "18:30",
      "saturday_morning": "09:00",
      "saturday_afternoon": "18:00",
      "sunday_morning": "09:00"
    },
    "programs": [
      "Hebrew School",
      "Adult Education",
      "Youth Group",
      "Senior Programs"
    ],
    "coordinates": {
      "lat": 25.7617,
      "lng": -80.1918
    },
    "images": [
      "https://api.jewgo.app/images/syn_123_1.jpg"
    ],
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

## ⭐ Review Endpoints

### GET /api/restaurants/{id}/reviews
Get reviews for a specific restaurant.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_123",
        "user": {
          "id": "user_456",
          "name": "Sarah M.",
          "avatar": "https://api.jewgo.app/avatars/user_456.jpg"
        },
        "rating": 5,
        "comment": "Amazing pizza! The crust is perfect and the toppings are fresh.",
        "images": [
          "https://api.jewgo.app/images/review_123_1.jpg"
        ],
        "created_at": "2025-01-14T15:30:00Z",
        "updated_at": "2025-01-14T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 127,
      "pages": 13
    }
  }
}
```

### POST /api/restaurants/{id}/reviews
Create a new review for a restaurant (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent food and service! Highly recommended.",
  "images": [
    "https://api.jewgo.app/images/review_456_1.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rev_456",
    "rating": 5,
    "comment": "Excellent food and service! Highly recommended.",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "Review created successfully"
}
```

### PUT /api/reviews/{id}
Update a review (requires authentication and ownership).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated review comment"
}
```

### DELETE /api/reviews/{id}
Delete a review (requires authentication and ownership).

**Headers:**
```
Authorization: Bearer <token>
```

## 👤 User Profile Endpoints

### GET /api/users/profile
Get current user's profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "avatar": "https://api.jewgo.app/avatars/user_123.jpg",
    "preferences": {
      "cuisine_types": ["Italian", "Mediterranean"],
      "kosher_level": "Glatt Kosher",
      "notifications": true
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### PUT /api/users/profile
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "preferences": {
    "cuisine_types": ["Italian", "Mediterranean", "Asian"],
    "kosher_level": "Kosher",
    "notifications": false
  }
}
```

### POST /api/users/avatar
Upload user avatar (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
avatar: <image-file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avatar_url": "https://api.jewgo.app/avatars/user_123.jpg"
  },
  "message": "Avatar uploaded successfully"
}
```

## 🛒 Marketplace Endpoints

### GET /api/marketplace/stores
Get list of marketplace stores.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `category` (optional): Store category filter

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "store_123",
        "name": "Kosher Market",
        "description": "Fresh kosher groceries and products",
        "owner": {
          "id": "user_456",
          "name": "Sarah M."
        },
        "category": "Groceries",
        "rating": 4.8,
        "review_count": 45,
        "status": "active",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
  }
}
```

### GET /api/marketplace/stores/{id}/products
Get products from a specific store.

**Response:**
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "store_123",
      "name": "Kosher Market"
    },
    "products": [
      {
        "id": "prod_123",
        "name": "Kosher Challah Bread",
        "description": "Fresh baked challah bread",
        "price": 4.99,
        "currency": "USD",
        "images": [
          "https://api.jewgo.app/images/prod_123_1.jpg"
        ],
        "in_stock": true,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

## 🔧 Health Check Endpoints

### GET /health
Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "2.0.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "storage": "available"
    }
  }
}
```

### GET /health/db
Check database connectivity.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "database": "app_db",
    "response_time_ms": 15
  }
}
```

### GET /health/redis
Check Redis connectivity.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "response_time_ms": 2
  }
}
```

## 📊 Rate Limiting

The API implements rate limiting to ensure fair usage:

- **General API**: 10 requests per second per IP
- **Authentication**: 1 request per second per IP
- **File Uploads**: 5 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1642248000
```

## 🔒 Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `AUTHENTICATION_REQUIRED` | Missing or invalid authentication |
| `AUTHORIZATION_DENIED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_SERVER_ERROR` | Server error |

## 📝 Examples

### Complete Restaurant Search Example
```bash
curl -X GET "https://api.jewgo.app/api/restaurants?search=pizza&cuisine=italian&lat=25.7617&lng=-80.1918&radius=5&page=1&limit=10" \
  -H "Accept: application/json"
```

### Create Restaurant with Authentication
```bash
curl -X POST "https://api.jewgo.app/api/restaurants" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Kosher Restaurant",
    "address": "456 Oak St, Miami, FL 33101",
    "phone": "+13055559876",
    "cuisine": "Mediterranean",
    "kosher_level": "Kosher"
  }'
```

### Upload User Avatar
```bash
curl -X POST "https://api.jewgo.app/api/users/avatar" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "avatar=@/path/to/avatar.jpg"
```

---

**Last Updated**: January 2025  
**API Version**: 2.0.0  
**Status**: Production Ready ✅
