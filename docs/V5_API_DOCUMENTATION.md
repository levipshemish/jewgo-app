# V5 API Documentation

## 🚀 V5 API Overview

The JewGo V5 API provides enhanced endpoints with improved performance, advanced filtering capabilities, and comprehensive restaurant management features.

### Base URL
- **Production**: `https://api.jewgo.app/api/v5`
- **Development**: `http://localhost:5000/api/v5`

### Authentication
The V5 API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All V5 API responses follow a consistent JSON format with enhanced metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "next_cursor": "page_2",
    "prev_cursor": null,
    "total_count": 150
  },
  "filterOptions": {
    "agencies": [...],
    "cities": [...],
    "kosherCategories": [...],
    "kosherDetails": [...],
    "listingTypes": [...],
    "hoursOptions": ["openNow", "morning", "afternoon", "evening", "lateNight"]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🍽️ Restaurant Endpoints (V5)

### GET /api/v5/restaurants
Get list of restaurants with advanced filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `cursor` (optional): Cursor for pagination
- `latitude` (optional): User latitude for distance sorting
- `longitude` (optional): User longitude for distance sorting
- `radius` (optional): Search radius in kilometers (default: 160km)
- `sort` (optional): Sort order (`distance_asc`, `distance_desc`, `created_at_desc`, `name_asc`)
- `include_filter_options` (optional): Include available filter options (default: false)

**Filter Parameters:**
- `search` (optional): Search term for restaurant name/description
- `agency` (optional): Kosher supervision agency
- `city` (optional): City name
- `kosher_category` (optional): Kosher category (Meat, Dairy, Pareve)
- `kosher_detail` (optional): Kosher detail (Chalav Yisroel, Chalav Stam, Pas Yisroel, etc.)
- `listing_type` (optional): Listing type (Restaurant, Caterer, etc.)
- `hoursFilter` (optional): Hours filter (`openNow`, `morning`, `afternoon`, `evening`, `lateNight`)

**Example Request:**
```
GET /api/v5/restaurants?latitude=25.7617&longitude=-80.1918&radius=10&hoursFilter=openNow&kosher_category=Dairy&include_filter_options=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rest_123",
      "name": "Kosher Pizza Palace",
      "address": "123 Main St, Miami, FL",
      "phone": "+13055551234",
      "website": "https://kosherpizza.com",
      "latitude": 25.7617,
      "longitude": -80.1918,
      "distance_km": 2.5,
      "kosher_category": "Dairy",
      "kosher_details": ["Chalav Yisroel", "Pas Yisroel"],
      "agency": "Kosher Miami",
      "rating": 4.5,
      "review_count": 127,
      "hours_json": {
        "open_now": true,
        "periods": [
          {
            "open": {"day": 0, "time": "1100"},
            "close": {"day": 0, "time": "2200"}
          }
        ],
        "weekday_text": [
          "Monday: 11:00 AM – 10:00 PM",
          "Tuesday: 11:00 AM – 10:00 PM"
        ]
      },
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "page_2",
    "prev_cursor": null,
    "total_count": 25
  },
  "filterOptions": {
    "agencies": ["Kosher Miami", "OU"],
    "cities": ["Miami", "Aventura", "Boca Raton"],
    "kosherCategories": ["Meat", "Dairy", "Pareve"],
    "kosherDetails": ["Chalav Yisroel", "Chalav Stam", "Pas Yisroel"],
    "listingTypes": ["Restaurant", "Caterer", "Bakery"],
    "hoursOptions": ["openNow", "morning", "afternoon", "evening", "lateNight"]
  }
}
```

## 🕒 Hours Filtering

The V5 API supports advanced hours-based filtering using JSONB queries for optimal performance.

### Available Hours Filters

- **`openNow`**: Restaurants currently open
- **`morning`**: Restaurants open during morning hours (6 AM - 12 PM)
- **`afternoon`**: Restaurants open during afternoon hours (12 PM - 6 PM)
- **`evening`**: Restaurants open during evening hours (6 PM - 10 PM)
- **`lateNight`**: Restaurants open during late night hours (10 PM - 6 AM)

### Hours Data Structure

Restaurant hours are stored in JSONB format with the following structure:

```json
{
  "open_now": true,
  "periods": [
    {
      "open": {"day": 0, "time": "1100"},
      "close": {"day": 0, "time": "2200"}
    },
    {
      "open": {"day": 1, "time": "1100"},
      "close": {"day": 1, "time": "2200"}
    }
  ],
  "weekday_text": [
    "Monday: 11:00 AM – 10:00 PM",
    "Tuesday: 11:00 AM – 10:00 PM"
  ]
}
```

**Field Descriptions:**
- `open_now`: Boolean indicating if the restaurant is currently open
- `periods`: Array of opening periods with day (0=Sunday, 6=Saturday) and time (HHMM format)
- `weekday_text`: Human-readable opening hours for each day

### Hours Filter Examples

**Find restaurants open now:**
```
GET /api/v5/restaurants?hoursFilter=openNow
```

**Find restaurants open in the morning:**
```
GET /api/v5/restaurants?hoursFilter=morning
```

**Combine hours filter with other filters:**
```
GET /api/v5/restaurants?hoursFilter=evening&kosher_category=Dairy&city=Miami
```

## 🔍 Advanced Filtering

### Distance-Based Filtering
When `latitude` and `longitude` are provided, the API automatically sorts by distance and applies radius filtering:

```
GET /api/v5/restaurants?latitude=25.7617&longitude=-80.1918&radius=5&sort=distance_asc
```

### Multiple Filter Combinations
You can combine multiple filters for precise results:

```
GET /api/v5/restaurants?kosher_category=Meat&agency=OU&hoursFilter=openNow&city=Miami&radius=10
```

## 📊 Filter Options

The `include_filter_options=true` parameter returns available filter values based on current data:

```json
{
  "filterOptions": {
    "agencies": ["Kosher Miami", "OU", "Star-K"],
    "cities": ["Miami", "Aventura", "Boca Raton", "Hollywood"],
    "kosherCategories": ["Meat", "Dairy", "Pareve"],
    "kosherDetails": ["Chalav Yisroel", "Chalav Stam", "Pas Yisroel", "Glatt"],
    "listingTypes": ["Restaurant", "Caterer", "Bakery", "Deli"],
    "hoursOptions": ["openNow", "morning", "afternoon", "evening", "lateNight"]
  }
}
```

## 🚀 Performance Features

### Cursor-Based Pagination
The V5 API uses cursor-based pagination for better performance with large datasets:

```json
{
  "pagination": {
    "next_cursor": "page_2",
    "prev_cursor": null,
    "total_count": 150
  }
}
```

### JSONB Optimization
Hours filtering uses PostgreSQL JSONB for optimal query performance:
- Indexed JSONB queries for fast filtering
- Efficient boolean and array operations
- Optimized for real-time hours checking

### Caching
Filter options are cached for 1 hour to improve response times:
- Dynamic generation based on current data
- Automatic cache invalidation
- Reduced database load

## 🔧 Error Handling

The V5 API provides detailed error responses:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILTER",
    "message": "Invalid hours filter value",
    "details": {
      "field": "hoursFilter",
      "value": "invalid_value",
      "valid_values": ["openNow", "morning", "afternoon", "evening", "lateNight"]
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 📝 Usage Examples

### Complete Restaurant Search with Hours Filter
```bash
curl -X GET "https://api.jewgo.app/api/v5/restaurants?latitude=25.7617&longitude=-80.1918&radius=10&hoursFilter=openNow&kosher_category=Dairy&include_filter_options=true" \
  -H "Accept: application/json"
```

### Get Filter Options Only
```bash
curl -X GET "https://api.jewgo.app/api/v5/restaurants?include_filter_options=true&limit=1" \
  -H "Accept: application/json"
```

### Find Late Night Restaurants
```bash
curl -X GET "https://api.jewgo.app/api/v5/restaurants?hoursFilter=lateNight&city=Miami" \
  -H "Accept: application/json"
```

## 🔄 Migration from V4

If migrating from V4 API, note these key changes:

1. **Base URL**: Change from `/api/restaurants` to `/api/v5/restaurants`
2. **Response Format**: Enhanced with `pagination` and `filterOptions`
3. **Hours Filtering**: New `hoursFilter` parameter with JSONB optimization
4. **Cursor Pagination**: Replace page-based with cursor-based pagination
5. **Enhanced Filtering**: More filter options and better performance

## 📈 Monitoring

The V5 API includes comprehensive monitoring:
- Request/response logging
- Performance metrics
- Error tracking
- Filter usage analytics

For detailed monitoring information, see the [Monitoring Documentation](./MONITORING_ENDPOINTS_UPDATE.md).
