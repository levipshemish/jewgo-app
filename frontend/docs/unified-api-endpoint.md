# Unified API Endpoint Specification

## Overview
To reduce API calls and improve performance, we need a unified backend endpoint that combines restaurant data, filter options, and pagination in a single response.

## Endpoint
```
GET /api/v4/restaurants/unified
```

## Parameters
All existing restaurant API parameters are supported:
- `limit` (number): Number of restaurants to return (default: 24)
- `offset` (number): Number of restaurants to skip (default: 0)
- `search` (string): Search query
- `city` (string): Filter by city
- `state` (string): Filter by state
- `certifying_agency` (string): Filter by kosher certifying agency
- `kosher_category` (string): Filter by kosher category
- `is_cholov_yisroel` (boolean): Filter for Cholov Yisroel
- `listing_type` (string): Filter by listing type
- `price_min` (number): Minimum price range
- `price_max` (number): Maximum price range
- `min_rating` (number): Minimum rating
- `has_reviews` (boolean): Filter for restaurants with reviews
- `open_now` (boolean): Filter for currently open restaurants
- `status` (string): Filter by status
- `lat` (number): User latitude for distance calculation
- `lng` (number): User longitude for distance calculation
- `max_distance_mi` (number): Maximum distance in miles
- `sortBy` (string): Sort by distance, name, or rating
- `dietary` (array): Multiple dietary restrictions

## Response Format
```json
{
  "success": true,
  "restaurants": [
    {
      "id": 1,
      "name": "Restaurant Name",
      "address": "123 Main St",
      "phone_number": "+1234567890",
      "website": "https://example.com",
      "kosher_category": "Dairy",
      "certifying_agency": "ORB",
      "rating": 4.5,
      "price_range": "$$",
      "image_url": "https://example.com/image.jpg",
      "latitude": 25.7617,
      "longitude": -80.1918,
      "distance": 2.5,
      "is_open": true
    }
  ],
  "filterOptions": {
    "agencies": ["ORB", "Kosher Miami", "Other"],
    "kosherCategories": ["Dairy", "Meat", "Pareve"],
    "listingTypes": ["Restaurant", "Catering", "Food Truck"],
    "priceRanges": ["$", "$$", "$$$", "$$$$"],
    "cities": ["Miami", "Aventura", "Boca Raton"],
    "states": ["FL"],
    "counts": {
      "agencies": {
        "ORB": 45,
        "Kosher Miami": 23,
        "Other": 12
      },
      "kosherCategories": {
        "Dairy": 35,
        "Meat": 28,
        "Pareve": 17
      },
      "listingTypes": {
        "Restaurant": 65,
        "Catering": 12,
        "Food Truck": 3
      },
      "priceRanges": {
        "$": 15,
        "$$": 35,
        "$$$": 25,
        "$$$$": 5
      },
      "total": 80
    }
  },
  "total": 80,
  "hasMore": true,
  "message": "Unified data retrieved successfully"
}
```

## Benefits
1. **Reduced API Calls**: Single request instead of 2-3 separate calls
2. **Better Performance**: Less network overhead and faster loading
3. **Consistent Data**: All data comes from the same query, ensuring consistency
4. **Reduced Server Load**: Fewer database queries and API requests
5. **Better Caching**: Single response can be cached more effectively

## Implementation Notes
- The endpoint should return both restaurant data and filter options in a single response
- Filter options should be calculated based on the current filter parameters
- Pagination should work the same as existing endpoints
- All existing filtering and sorting logic should be preserved
- The response should be cacheable for 2-5 minutes

## Fallback
If the unified endpoint is not available, the frontend will fall back to making separate calls to:
- `/api/restaurants-with-images` for restaurant data
- `/api/restaurants/filter-options` for filter options

This ensures backward compatibility while the unified endpoint is being implemented.
