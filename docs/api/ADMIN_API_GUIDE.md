# Admin API Guide (Next.js)

This document covers the Admin API endpoints implemented in the Next.js frontend, CSRF requirements, RBAC, and examples. It supersedes UI assumptions that previously called Flask endpoints.

## CSRF Model

- `app/admin/layout.tsx` sets a signed CSRF token bound to the admin user session and exposes it to the client:
  - httpOnly cookie: `admin_csrf` (signed, not readable)
  - readable cookie: `XSRF-TOKEN` (same signed value)
  - window variable: `window.__CSRF_TOKEN__` (same signed value)
- Clients must send the header `x-csrf-token: window.__CSRF_TOKEN__` on state-changing requests (POST/PUT/PATCH/DELETE). The server validates it with `validateSignedCSRFToken`.

## RBAC Summary

- Server enforces RBAC via `requireAdmin(request)` which loads the admin role from Supabase and grants permissions via `ROLE_PERMISSIONS`.
- Admin roles are stored in Supabase `admin_roles` table with Row Level Security (RLS) policies.
- Middleware no longer infers RBAC from `user.app_metadata`; it only verifies authentication. All RBAC checks happen in the route handlers.

## Endpoints

All routes live under `/api/admin/*`. All state-changing routes require `x-csrf-token` and appropriate permissions (see `ADMIN_PERMISSIONS`).

### Restaurants

- `GET /api/admin/restaurants`
  - Query: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, filters like `status`, `city`, `state`.
  - Permission: `RESTAURANT_VIEW`.

- `POST /api/admin/restaurants`
  - Body: restaurant payload (validated via zod in `validationUtils`).
  - Permission: `RESTAURANT_EDIT`.

- `PUT /api/admin/restaurants`
  - Body: `{ id, ...fields }`.
  - Permission: `RESTAURANT_EDIT`.

- `DELETE /api/admin/restaurants?id=123`
  - Soft delete.
  - Permission: `RESTAURANT_DELETE`.

- Moderation:
  - `POST /api/admin/restaurants/[id]/approve`
  - `POST /api/admin/restaurants/[id]/reject` (body: `{ reason?: string }`)
  - Permission: `RESTAURANT_APPROVE`.

- Export:
  - `POST /api/admin/restaurants/export`
  - Body: `{ search?, filters?, sortBy?, sortOrder?, fields? }`
  - Permission: `DATA_EXPORT`.

### Reviews

- CRUD analogous to restaurants with permissions `REVIEW_VIEW`, `REVIEW_MODERATE`, `REVIEW_DELETE`.
- Export: `POST /api/admin/reviews/export`.

### Users

- CRUD analogous to restaurants with permissions `USER_VIEW`, `USER_EDIT`, `USER_DELETE`.
  - Create: client-supplied `id` ignored; unique email enforced.
- Export: `POST /api/admin/users/export`.

### Images (Restaurant Images)

- CRUD analogous to restaurants with permissions `IMAGE_VIEW`, `IMAGE_EDIT`, `IMAGE_DELETE`.
- Export: `POST /api/admin/images/export`.

### Kosher Places and Synagogues

- Listing endpoints exist for admin browsing. SQL is parameterized using Prisma `sql` templates with strict ORDER BY allowlists.
- Exports:
  - `POST /api/admin/kosher-places/export`
  - `POST /api/admin/synagogues/export`

### Bulk Operations

- `POST /api/admin/bulk`
  - Body: `{ operation: 'create'|'update'|'delete', entityType: 'restaurant'|'review'|'user'|'restaurantImage', data: Array<Record<string, any>>, batchSize? }`
  - For delete from UI: `{ operation: 'delete', data: selectedIds.map(id => ({ id })) }`.
  - Permission: `BULK_OPERATIONS`.

### System/Settings

- `GET /api/admin/user` → current admin user profile (RBAC-resolved).

- `GET /api/admin/system/stats`
  - Returns counts for users/restaurants/reviews/synagogues/kosher-places, pending approvals, system info, and health checks.
  - If `HEALTHCHECK_NETWORK_PROBE_URL` is set, includes a HEAD probe status (`ok|error`).
  - Permission: `SYSTEM_VIEW`.

- `GET /api/admin/system/config`
  - Returns merged config from defaults and DB (`admin_config`).
  - Permission: `SYSTEM_VIEW`.

- `PUT /api/admin/system/config`
  - Body: subset of keys `{ maintenanceMode, debugMode, emailNotifications, auditLogging, rateLimiting, backupFrequency, sessionTimeout, maxFileSize }`.
  - Upserts into Supabase `admin_config` table with `updated_by`.
  - Permission: super_admin only.

- `GET /api/admin/roles` (paginated, `search` supported)
- `POST /api/admin/roles` `{ userId, role, expiresAt?, notes? }`
- `PUT /api/admin/roles` `{ id, isActive?, expiresAt?, notes? }`
- `DELETE /api/admin/roles?userId=...&role=...`
  - Permission: `SYSTEM_SETTINGS` or super_admin; assigning `super_admin` requires super_admin.
  - Backed by Supabase `admin_roles` table with RLS policies.

## Client Usage

- Always include `x-csrf-token: window.__CSRF_TOKEN__` for state-changing requests.
- Admin submissions page now lists via `GET /api/admin/restaurants` and moderates via the approve/reject endpoints above.

