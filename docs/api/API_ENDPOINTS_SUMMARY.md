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
    "restaurants": [...],
    "pagination": {
      "total": 107,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### GET `/api/restaurants/search`
Search restaurants by query.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurants": [...],
    "query": "kosher",
    "total": 25,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST `/api/restaurants`
Submit a new restaurant for review.

**Request Body:**
```json
{
  "name": "New Restaurant",
  "short_description": "Brief description",
  "description": "Detailed description",
  "certifying_agency": "ORB",
  "kosher_category": "dairy",
  "is_cholov_yisroel": true,
  "is_pas_yisroel": false,
  "phone": "(555) 123-4567",
  "email": "info@restaurant.com",
  "address": "123 Main St",
  "city": "Miami",
  "state": "FL",
  "zip_code": "33101",
  "website": "https://restaurant.com",
  "google_listing_url": "https://maps.google.com",
  "hours_open": "Mon-Fri: 11AM-9PM",
  "price_range": "$$",
  "business_images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "is_owner_submission": true,
  "owner_name": "Owner Name",
  "owner_email": "owner@restaurant.com",
  "owner_phone": "(555) 987-6543",
  "business_license": "LIC123456",
  "tax_id": "TAX123456",
  "years_in_business": 5,
  "seating_capacity": 50,
  "delivery_available": true,
  "takeout_available": true,
  "catering_available": false,
  "preferred_contact_method": "email",
  "preferred_contact_time": "afternoon",
  "contact_notes": "Additional contact information",
  "instagram_link": "https://instagram.com/restaurant",
  "facebook_link": "https://facebook.com/restaurant",
  "tiktok_link": "https://tiktok.com/@restaurant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant submitted successfully for review",
  "data": {
    "id": 108,
    "name": "New Restaurant",
    "submission_status": "pending_approval"
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
    "id": 1,
    "name": "Restaurant Name",
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "phone_number": "(555) 123-4567",
    "website": "https://restaurant.com",
    "kosher_category": "dairy",
    "certifying_agency": "ORB",
    "is_cholov_yisroel": true,
    "submission_status": "approved"
  }
}
```

#### PUT `/api/restaurants/{id}`
Update a restaurant.

**Request Body:**
```json
{
  "name": "Updated Restaurant Name",
  "address": "456 New St",
  "phone_number": "(555) 987-6543"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Restaurant Name"
  }
}
```

#### DELETE `/api/restaurants/{id}`
Delete a restaurant.

**Response:**
```json
{
  "success": true,
  "message": "Restaurant deleted successfully",
  "data": {
    "restaurant_id": 1
  }
}
```

### Enhanced Add Eatery Workflow Endpoints

#### PUT `/api/restaurants/{id}/approve`
Approve a restaurant submission (Admin only).

**Request Body:**
```json
{
  "status": "approved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant approved successfully",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurant Name",
      "submission_status": "approved",
      "approval_date": "2024-01-01T00:00:00Z",
      "approved_by": "admin"
    },
    "status": "approved"
  }
}
```

#### PUT `/api/restaurants/{id}/reject`
Reject a restaurant submission (Admin only).

**Request Body:**
```json
{
  "status": "rejected",
  "reason": "Incomplete information provided"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant rejected successfully",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurant Name",
      "submission_status": "rejected",
      "rejection_reason": "Incomplete information provided",
      "approval_date": "2024-01-01T00:00:00Z",
      "approved_by": "admin"
    },
    "status": "rejected",
    "reason": "Incomplete information provided"
  }
}
```

#### GET `/api/restaurants/filter-options`
Get filter options for restaurant forms and search.

**Response:**
```json
{
  "success": true,
  "data": {
    "agencies": ["ORB", "OU", "Star-K", "CRC", "Kof-K", "OK Kosher"],
    "kosherCategories": ["meat", "dairy", "pareve"],
    "listingTypes": ["restaurant", "bakery", "catering", "cafe", "deli"],
    "priceRanges": ["$", "$$", "$$$", "$$$$"],
    "cities": ["Miami", "Miami Beach", "Boca Raton"],
    "states": ["FL", "NY", "CA"]
  }
}
```

### Filter Options
```http
GET /api/restaurants/filter-options
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cities": ["Miami", "Miami Beach", "Boca Raton"],
    "states": ["FL", "NY", "CA"],
    "agencies": ["ORB", "KM", "Star-K", "CRC"],
    "listingTypes": ["restaurant", "bakery", "catering"],
    "priceRanges": ["$", "$$", "$$$", "$$$$"],
    "kosherCategories": ["meat", "dairy", "pareve"]
  }
}
```

### Statistics
```http
GET /api/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_restaurants": 107,
    "dairy_restaurants": 99,
    "pareve_restaurants": 8,
    "chalav_yisroel": 104,
    "pas_yisroel": 22,
    "states": ["FL", "NY", "CA"],
    "cities": ["Miami", "New York", "Los Angeles"]
  }
}
```

### Kosher Types
```http
GET /api/kosher-types
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kosher_types": {
      "dairy": 99,
      "meat": 8,
      "pareve": 0
    },
    "chalav_yisroel": 104,
    "chalav_stam": 3,
    "pas_yisroel": 22
  }
}
```

## 🔍 Frontend API Routes

### Restaurant Management
```http
GET /api/restaurants/{id}/approve
POST /api/restaurants/{id}/approve
POST /api/restaurants/{id}/reject
```

### Authentication
```http
GET /api/auth/[...nextauth]
```

## 📊 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field error"
  }
}
```

### Common Error Codes
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `422`: Unprocessable Entity - Validation errors
- `500`: Internal Server Error - Server error

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Input validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Restaurant name is required"
    },
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🔧 Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Admin endpoints**: 5000 requests per minute

## 📝 Request/Response Examples

### Search Example
```bash
curl "https://jewgo.onrender.com/api/restaurants?search=kosher&city=Miami&limit=10"
```

### Filter Example
```bash
curl "https://jewgo.onrender.com/api/restaurants?certifying_agency=ORB&kosher_category=dairy&is_cholov_yisroel=true"
```

### Submit Restaurant Example
```bash
curl -X POST "https://jewgo.onrender.com/api/restaurants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Kosher Restaurant",
    "short_description": "Authentic kosher cuisine",
    "certifying_agency": "ORB",
    "kosher_category": "dairy",
    "is_cholov_yisroel": true,
    "phone": "(555) 123-4567",
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "zip_code": "33101",
    "is_owner_submission": true,
    "owner_name": "Owner Name",
    "owner_email": "owner@restaurant.com",
    "owner_phone": "(555) 987-6543"
  }'
```

### Approve Restaurant Example
```bash
curl -X PUT "https://jewgo.onrender.com/api/restaurants/1/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"status": "approved"}'
```

### Reject Restaurant Example
```bash
curl -X PUT "https://jewgo.onrender.com/api/restaurants/1/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "status": "rejected",
    "reason": "Incomplete business information"
  }'
```

## 🔒 Security Considerations

### Admin Endpoints
- Restaurant approval/rejection endpoints require admin authentication
- Use `Authorization: Bearer YOUR_ADMIN_TOKEN` header
- Admin token should be kept secure and rotated regularly

### Input Validation
- All endpoints validate input data
- Enhanced add eatery workflow includes comprehensive validation
- Conditional validation based on kosher category and owner submission status

### Rate Limiting
- Admin endpoints have higher rate limits
- Public endpoints are rate-limited to prevent abuse
- Monitor for unusual activity patterns

## 📈 Performance Considerations

### Caching
- Filter options are cached for performance
- Restaurant data is cached with appropriate TTL
- Use cache headers for static data

### Pagination
- Large result sets are paginated
- Use `limit` and `offset` parameters
- Include pagination metadata in responses

### Database Optimization
- Use indexes on frequently queried fields
- Optimize queries for common filter combinations
- Monitor query performance

---

*Last Updated: August 25, 2024* 