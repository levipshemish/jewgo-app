# Eatery Distance Sort Investigation — Design Notes

## Current Flow Summary
1. Frontend uses the v5 API client (`frontend/lib/api/v5-api-client.ts`) to call `/api/v5/restaurants` with `sort=distance_asc` when user coordinates are available.
2. The API route in `backend/routes/v5/api_v5.py` forwards the request to `RestaurantServiceV5.get_entities`, which calls `EntityRepositoryV5.get_entities_with_cursor`.
3. Within `EntityRepositoryV5`, distance sorting should rely on PostGIS via `_apply_sorting` and `_apply_geospatial_filter` but contains temporary fallbacks disabling these paths.

## Key Components to Inspect
- `frontend/lib/api/v5-api-client.ts`: ensures `sort=distance_asc` and lat/lng params are set.
- `backend/routes/v5/api_v5.py`: parsing of filters/pagination and logging around distance sorting.
- `backend/database/services/restaurant_service_v5.py`: orchestration layer for fetching restaurants.
- `backend/database/repositories/entity_repository_v5.py`: actual query builder, cursor pagination, and sort/filter logic.

## Diagnostic Approach
- Verify repository initialization of `_postgis_available` and whether detection succeeds.
- Review `_get_entities_with_distance_pagination`, `_apply_geospatial_filter`, and `_apply_sorting` for any guards or temporary toggles bypassing PostGIS expressions.
- Check log statements and comments that indicate intentional disabling of PostGIS and earthdistance ordering.

## Risks & Considerations
- Multiple "TEMPORARY" bypasses may exist; need to ensure findings cover all affected code paths, not just primary sort.
- Re-enabling PostGIS may interact with cursor pagination; document any assumptions the current implementation makes.
- Frontend caching or client-side merging could mask server-side fixes; confirm request/response contract when recommending remediation.
