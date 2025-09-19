# Eatery Distance Sort Investigation — Implementation Plan

## Objectives
- Audit distance-sorting execution path to confirm why PostGIS ordering is bypassed.
- Capture log evidence and code references demonstrating the fallback behavior.
- Summarize remediation options (e.g., re-enabling PostGIS expressions, reinstating geospatial filters) for follow-up implementation work.
- Outline the concrete implementation steps required to restore PostGIS-backed distance sorting.

## Steps
1. Trace backend flow from `RestaurantServiceV5.get_entities` into `EntityRepositoryV5.get_entities_with_cursor` with `sort_key='distance_asc'`.
2. Document all guard clauses or temporary bypasses affecting `_apply_geospatial_filter`, `_apply_sorting`, and `_get_entities_with_distance_pagination`.
3. Note any additional dependencies (PostGIS extension, indexes) required once ordering is restored.
4. Compile findings and next-step recommendations for re-enabling server-side distance sorting.
5. Implement the fix per "Proposed Implementation" below once approved.

## Proposed Implementation

1. **Restore server-side projection and sorting**
   - Remove the temporary short-circuit in `_apply_sorting` so `distance_asc` orders by `ST_Distance` with an `earthdistance` fallback (`backend/database/repositories/entity_repository_v5.py:1375-1420`).
   - Re-enable the PostGIS/earthdistance distance column projection blocks currently wrapped in temporary guards inside `_get_entities_with_cursor` and `_get_entities_with_page_pagination` (same file lines ~600-652, 430-465) to hydrate `distance` with database-computed values.
2. **Reinstate geospatial filtering**
   - Remove the temporary bypasses in `_get_entities_with_cursor`, `_get_entities_with_page_pagination`, and `_get_entities_with_distance_pagination` that skip `_apply_geospatial_filter` (`backend/database/repositories/entity_repository_v5.py:418-421`, `:589-606`, `:1041-1043`).
   - Ensure `_apply_geospatial_filter` leverages `ST_DWithin` with `earthdistance` fallback; confirm `_postgis_available` detection remains accurate.
3. **Tighten application-layer fallbacks**
   - In `_get_entities_with_distance_pagination`, remove the Python haversine fallback once PostGIS ordering is restored, leaving it only as a last-resort guard with explicit logging (`backend/database/repositories/entity_repository_v5.py:160-260`).
   - Maintain radius enforcement by using DB-side filtering; remove redundant `_radius_km` filtering when PostGIS succeeds.
4. **Add verification hooks**
   - Extend repository/service tests to cover distance ordering using representative fixtures and assert ascending distances.
   - Update logging to downgrade temporary "🚧" notices to regular debug entries once PostGIS paths are healthy.
5. **Frontend validation**
   - No code change needed; ensure tests confirm the FE relies on server ordering and does not resort client-side.

## Files to Review
- `backend/database/repositories/entity_repository_v5.py`
- `backend/database/services/restaurant_service_v5.py`
- `backend/routes/v5/api_v5.py`
- `frontend/lib/api/v5-api-client.ts`

## Test Strategy (for planned fix)
- Unit/integration coverage for repository distance queries using PostGIS-enabled test database.
- API contract test confirming `sort=distance_asc` response ordering matches expected distances.
- Frontend regression tests to ensure grid respects server ordering without client-side resorting.

## Rollback Considerations
- Reverting discovery artifacts not needed; any future code changes must include feature toggles or fallbacks to maintain query stability if PostGIS functions fail.
