# Backend v4 Endpoints (frontend alignment)

Context: The Flask backend registers restaurant routes under the `/api/v4` prefix (see `backend/routes/api_v4.py:163`). Frontend API routes must call the v4 paths to avoid 404s observed when pointing to `/api/restaurants/*`.

Changes in this patch:

- Frontend `restaurants-with-images` now calls `GET `${BACKEND_URL}/api/v4/restaurants` instead of `.../api/restaurants`.
- Frontend `filter-options` now calls `GET `${BACKEND_URL}/api/v4/restaurants/filter-options`.

- Server-side `transformSupabaseUser` now honors `includeRoles` + `userToken`, enabling admin role checks during SSR.

Why:

- Logs showed `404 NOT FOUND` for `http://localhost:8082/api/restaurants?...` while backend exposes v4: `/api/v4/restaurants...`.
- Admin SSR was missing roles because the server transform always stripped role fetching. This blocked `/admin` and caused redirects.

Env expectation:

- `NEXT_PUBLIC_BACKEND_URL` should point at the backend base (e.g., `http://localhost:8082` or `https://api.jewgo.app`). No trailing slash.

Rollback notes:

- If the backend ever moves back to non-v4 paths, revert the two call sites:
  - `frontend/app/api/restaurants-with-images/route.ts`
  - `frontend/app/api/restaurants/filter-options/route.ts`

Security note:

- No secrets are introduced or changed. Paths only.
