# API Endpoints Documentation

## Overview

The JewGo app uses a v5 API architecture with entity-specific endpoints for restaurants, synagogues, and mikvahs. All endpoints support filtering, pagination, and location-based queries.

## Base URL

- **Production**: `https://api.jewgo.app`
- **Development**: `http://localhost:3000`

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Common Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `cursor` - Cursor for pagination

### Location
- `latitude` - User's latitude
- `longitude` - User's longitude
- `radius` - Search radius in miles (default: 25)

### Filtering
- `include_filter_options` - Include available filter options in response

## Entity Endpoints

### Restaurants

#### Get Restaurants
```
GET /api/v5/restaurants
```

**Query Parameters:**
- `kosher_category` - Meat, Dairy, Pareve
- `agency` - Certifying agency
- `price_range` - $, $$, $$$, $$$$
- `rating_min` - Minimum rating
- `hours_filter` - openNow, morning, afternoon, evening, lateNight
- `city` - City name
- `state` - State abbreviation

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Restaurant Name",
      "address": "123 Main St",
      "kosher_category": "Meat",
      "rating": 4.5,
      "latitude": 25.7617,
      "longitude": -80.1918
    }
  ],
  "filter_options": {
    "agencies": ["Kosher Miami", "ORB"],
    "kosherCategories": ["Meat", "Dairy", "Pareve"],
    "cities": ["Miami", "Fort Lauderdale"],
    "states": ["FL"]
  },
  "total_count": 150,
  "next_cursor": "...",
  "prev_cursor": "..."
}
```

### Synagogues

#### Get Synagogues
```
GET /api/v5/synagogues
```

**Query Parameters:**
- `denomination` - orthodox, conservative, reform, reconstructionist
- `shul_type` - traditional, chabad, orthodox, sephardic
- `shul_category` - ashkenazi, chabad, sephardic
- `city` - City name
- `state` - State abbreviation
- `rating_min` - Minimum rating

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Synagogue Name",
      "address": "123 Main St",
      "denomination": "orthodox",
      "shul_type": "traditional",
      "rating": 4.0,
      "has_daily_minyan": true,
      "has_parking": true
    }
  ],
  "filter_options": {
    "denominations": ["orthodox", "conservative"],
    "shulTypes": ["traditional", "chabad"],
    "shulCategories": ["ashkenazi", "sephardic"],
    "cities": ["Miami", "Fort Lauderdale"],
    "states": ["FL"]
  },
  "total_count": 149
}
```

### Mikvahs

#### Get Mikvahs
```
GET /api/v5/mikvahs
```

**Query Parameters:**
- `appointment_required` - true, false
- `status` - active, inactive, pending
- `city` - City name
- `contact_person` - Contact person name

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Mikvah Name",
      "address": "123 Main St",
      "appointment_required": true,
      "status": "active",
      "contact_person": "Rabbi Smith"
    }
  ],
  "filter_options": {
    "appointmentRequired": ["true", "false"],
    "statuses": ["active", "inactive"],
    "cities": ["Miami", "Fort Lauderdale"],
    "contactPersons": ["Rabbi Smith", "Rabbi Cohen"]
  },
  "total_count": 20
}
```

## Filter Options Endpoints

### Get Restaurant Filter Options
```
GET /api/restaurants/filter-options
```

### Get Synagogue Filter Options
```
GET /api/v5/synagogues/filter-options
```

### Get Mikvah Filter Options
```
GET /api/v5/mikvahs/filter-options
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agencies": ["Kosher Miami", "ORB"],
    "kosherCategories": ["Meat", "Dairy", "Pareve"],
    "cities": ["Miami", "Fort Lauderdale"],
    "states": ["FL"],
    "ratings": [5.0, 4.5, 4.0, 3.5, 3.0]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": "latitude and longitude are required for location-based queries"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Rate Limiting

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour
- **Filter options**: 100 requests per hour

## Caching

- **Filter options**: Cached for 1 hour
- **Entity lists**: Cached for 5 minutes
- **Individual entities**: Cached for 10 minutes

## Examples

### Search Restaurants Near Location
```bash
curl "https://api.jewgo.app/api/v5/restaurants?latitude=25.7617&longitude=-80.1918&radius=10&kosher_category=Meat&limit=20"
```

### Get Synagogue Filter Options
```bash
curl "https://api.jewgo.app/api/v5/synagogues/filter-options"
```

### Search Mikvahs by Status
```bash
curl "https://api.jewgo.app/api/v5/mikvahs?status=active&appointment_required=true"
```

## SDK Usage

### JavaScript/TypeScript
```typescript
import { apiClient } from '@/lib/api/index-v5';

// Get restaurants with filters
const restaurants = await apiClient.getEntities('restaurants', {
  kosher_category: 'Meat',
  city: 'Miami'
}, {
  limit: 20,
  includeFilterOptions: true
});

// Get filter options
const filterOptions = await apiClient.getEntities('synagogues', {}, {
  limit: 1,
  includeFilterOptions: true
});
```

## Webhooks

The API supports webhooks for real-time updates:

- `entity.created` - New entity added
- `entity.updated` - Entity modified
- `entity.deleted` - Entity removed

## Versioning

- Current version: v5
- Version specified in URL path
- Backward compatibility maintained for 2 versions
- Deprecation notices in response headers
