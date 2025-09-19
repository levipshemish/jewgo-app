Distance Utilities (DB-backed)

Purpose
- Provide consistent, accurate distance calculations using PostGIS/eartdistance.
- Replace all Python-side Haversine logic to comply with project rules and to leverage DB indexes.

API
- `distance_km(lat1, lon1, lat2, lon2, session=None) -> float`
  - Returns kilometers as float. `float('inf')` on failure.
  - Optional `session` allows reusing an existing SQLAlchemy session to avoid per-call session overhead.
- `distance_miles(lat1, lon1, lat2, lon2, session=None) -> float`
  - Returns miles as float. `float('inf')` on failure.

Behavior
- Uses `earth_distance(ll_to_earth(...))` when the `cube` and `earthdistance` extensions are available.
- Falls back to `ST_Distance` on `geography` if `earthdistance` is unavailable.
- Logs warnings and returns `inf` on errors to keep callers resilient.

Usage Examples
```
from utils.distance import distance_km, distance_miles

# Simple call (opens/closes its own session under the hood)
km = distance_km(25.7617, -80.1918, 26.1224, -80.1373)

# With an existing session (preferred inside repository/services loops)
with connection_manager.get_session() as session:
    miles = distance_miles(25.7617, -80.1918, 26.1224, -80.1373, session=session)
```

Batch Computations
- For bulk computations inside repositories, prefer a single SQL query over per-entity calls.
- See `EntityRepositoryV5._bulk_distance_miles()` for an example of computing distances for a list of IDs with one query.

Notes
- Prefer computing distance directly in SQL query projections where feasible.
- Ensure spatial indexes and extensions are installed in production.

