# Admin API Guide (Next.js)

This document covers the Admin API endpoints implemented in the Next.js frontend, CSRF requirements, RBAC, and examples. It supersedes UI assumptions that previously called Flask endpoints.

## CSRF Model

- Admin CSRF token is either generated in `app/admin/layout.tsx` and exposed via `window.__CSRF_TOKEN__`, or fetched from `GET /api/admin/csrf`.
- Clients must include `x-csrf-token: window.__CSRF_TOKEN__` on all state-changing requests (POST/PUT/PATCH/DELETE). The server validates with `validateSignedCSRFToken(adminUser.id)`.
- Tokens are stateless (HMAC) with a 1-hour TTL. The hook `useAdminCsrf()` schedules an automatic refresh every ~50 minutes to avoid expiry. Consider a central fetch wrapper to auto-retry once on HTTP 419 by first refreshing `/api/admin/csrf`.

## RBAC Summary

- Server enforces RBAC via `requireAdmin(request)` which loads the admin role from Supabase and grants permissions via `ROLE_PERMISSIONS`.
- Admin roles are stored in Supabase `admin_roles` table with Row Level Security (RLS) policies.
- Middleware verifies authentication and applies security headers only; it does not require any `admin_role` cookie. All RBAC checks happen in the route handlers via `requireAdmin()`. Admin layout redirects unauthenticated users to `/auth/signin?redirectTo=/admin&message=admin_access_required` to reduce flicker.

### Recommended RLS Policies (for middleware lookups)

While middleware now fails open to route-level RBAC if role lookups fail (e.g., due to RLS restrictions), you can enable reliable middleware role checks by adding the following RLS policies in Supabase:

```sql
-- Allow authenticated users to read their own admin flags
alter table public.users enable row level security;
create policy users_self_select on public.users
  for select using (auth.uid() = id);

-- Allow authenticated users to read their own active admin_roles rows
alter table public.admin_roles enable row level security;
create policy admin_roles_self_select on public.admin_roles
  for select using (auth.uid() = user_id);

-- Optionally allow super admins to read all
create policy admin_roles_super_read on public.admin_roles
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.issuperadmin = true
    )
  );
```

If you prefer not to add these policies, keep the default fail-open middleware and rely on the route-level RBAC enforced by `requireAdmin()` and permission checks.

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
- Export: `POST /api/admin/users/export` (Permission: `DATA_EXPORT`).

### Images (Restaurant Images)

- CRUD analogous to restaurants with permissions `IMAGE_VIEW`, `IMAGE_EDIT`, `IMAGE_DELETE`.
- Export: `POST /api/admin/images/export` (Permission: `DATA_EXPORT`).

### Kosher Places and Synagogues

- Listing endpoints exist for admin browsing. SQL is parameterized using Prisma `sql` templates with strict ORDER BY allowlists; `ORDER BY` uses `Prisma.raw` fed by a whitelisted column and direction.
- Exports:
  - `POST /api/admin/kosher-places/export` (Permission: `DATA_EXPORT`)
  - `POST /api/admin/synagogues/export` (Permission: `DATA_EXPORT`)

### Restaurants Moderation

- `POST /api/admin/restaurants/[id]/approve`
- `POST /api/admin/restaurants/[id]/reject` (body: `{ reason?: string }`)
  - Permission: `RESTAURANT_APPROVE`
  - Requires CSRF header
  - Handler signature: `export async function POST(request, { params }: { params: { id: string } })`

### Submissions (Moderation Feed)

- `GET /api/admin/submissions/restaurants`
  - Purpose: Server-driven moderation list for restaurant submissions
  - Query: `page`, `pageSize`, `search`, `status` (pending_approval|approved|rejected|all), `sortBy` (e.g., `submission_date`), `sortOrder`
  - Permission: `RESTAURANT_VIEW`

### Data Export (Summary)

All export endpoints return CSV (`text/csv`) and enforce:
- Authentication via `requireAdmin()`
- Permission: `DATA_EXPORT` plus the entity read permission when applicable
- CSRF header: `x-csrf-token`
- Optional filters via query or JSON body: `search`, entity-specific filters (e.g., `status`, `city`, `state`, `restaurantId`), `sortBy`, `sortOrder`

## UI Tables and Pagination

- Admin data tables default to server-driven pagination. Page size options are limited to 10, 20, and 50 for performance. Use CSV exports for large datasets.

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
- Admin submissions page now lists via `GET /api/admin/submissions/restaurants` and moderates via the approve/reject endpoints above.
