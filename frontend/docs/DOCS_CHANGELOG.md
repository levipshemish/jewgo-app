# Frontend Docs Changelog

- Auth UI Polish: Sign-in, sign-up, forgot-password, and reset-password now use shared UI primitives (Card, Input, Button, Alert) for consistent styling and better accessibility. Added password visibility toggles where applicable. All existing flows are unchanged (magic link modal, guest continue, Google button, reCAPTCHA).

Date: 2025-09-03

- Eatery Filters: Modern filter popup now uses responsive sizing. Bottom sheet on mobile; centered modal on larger screens with width scaling by breakpoint (sm→lg→xl). Improves usability across devices without changing filter behavior. Also raised modal z-index above bottom navigation and added safe-area bottom padding to prevent cutoff on mobile.

Date: 2025-09-02

- **Backend Testing & CI/CD**: Successfully resolved all test authentication issues and created CI-ready test suite. Core functionality verified with 12/12 tests passing, 15% test coverage established, and performance validated (<1s response times). CI/CD pipeline now ready for production deployment. See `backend/CI_READINESS_REPORT.md` for complete details.

Date: 2025-08-27

- Security/Middleware: Admin RBAC gate now fails closed on lookup errors or missing role. In development, you can temporarily allow fail-open by setting `ADMIN_RBAC_FAIL_OPEN=true`. Also fixed RBAC filter to use `expires_at.is.null,expires_at.gt.{nowISO}`.
- Admin API: `/api/admin/audit` POST now supports `{"format":"json"}` to return JSON; default remains CSV. Invalid `format` returns 400.
- Admin API: `/api/admin/restaurants` GET no longer performs explicit `prisma.$connect()`/`$disconnect()` to avoid serverless connection churn; relies on Prisma singleton.
- Admin Database Pages: Fixed `searchParams` type to non-Promise and removed unnecessary `await` in page components.

Additional updates:
- Admin Moderation: Implemented submissions endpoints used by `/admin/restaurants`:
  - `GET /api/admin/submissions/restaurants` with pagination, search, and `status` filter
  - `POST /api/admin/restaurants/[id]/approve` and `.../reject` (RBAC + CSRF)
- Admin Settings APIs: Implemented `/api/admin/user`, `/api/admin/system/stats`, `/api/admin/system/config`, and `/api/admin/roles` with RBAC + CSRF and audit logging.
 - Store Metrics API: Added `/api/admin/store/metrics` (RBAC: `store:analytics`, role ≥ store_admin). Uses Prisma marketplace data; orders/messages pending schema.
 - Dashboard Metrics Health: Metrics API now uses pluggable `getSystemHealth()` provider (`lib/server/system-health.ts`).
    - Providers: `HEALTH_PROVIDER` supports `sentry`, `datadog`, `upstash`.
    - Env vars (examples):
      - Sentry: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_API_TOKEN`
      - Datadog: `DATADOG_API_KEY`, `DATADOG_APP_KEY`
      - Upstash: `UPSTASH_HEALTH_URL` (and optional `UPSTASH_HEALTH_TOKEN`)
 - RBAC Validation (dev): Added `/api/admin/rbac/validate` (development only; super_admin) to surface mapping drift via `validateRolePermissions()`.
 - Audit SSE: Added `/api/admin/audit/stream` (server-sent events) for live recent activity; supports optional `roleScope=self|store`.
 - Audit Filters: `/api/admin/audit` now accepts `roleScope=self|store` for simple server-side scoping.
 - Vendor Scoping: Store metrics enforce `vendorId` for `store_admin`; higher roles may query without vendor scope.
 - Redis Caching: Added cache helper `lib/server/cache.ts` and wired caching for `/api/admin/dashboard/metrics` and `/api/admin/store/metrics` with invalidation helpers.
 - DB Draft: Added Prisma models for `marketplace_orders`, `marketplace_messages`, and `vendor_admins` plus a draft migration sketch with rollback in `frontend/prisma/migrations/20250902_add_marketplace_entities/README.md`.
- CSRF: Added `GET /api/admin/csrf` to fetch a signed stateless token. Route applies strict security + CORS headers.
- Users API: Removed unsupported `provider` filter; rejects unknown filters; added `userUpdateSchema` to allow partial updates.
- Synagogues Export: Implemented `POST /api/admin/synagogues/export` (CSV) with RBAC + CSRF.
- Middleware: RBAC lookups now fail-open to route-level RBAC on RLS errors; documented recommended RLS policies in Admin API Guide.
- Validation: Synced Zod limits with DB (`kosher_category` 20, `certifying_agency` 100, `price_range` 20) under a shared `FIELD_LIMITS` map.
- Logging Standards: Introduced `adminLogger` for admin API routes and `appLogger` for app pages/actions. Replaced console usage in admin APIs and key app pages; re-enabled `no-console`.
- Testing: Raised Jest coverage thresholds (85% global) and focused collection on core libs. Added unit tests for CSRF, SQL ordering, logger, DTO mappers, validation, and security headers.

Notes:
- Dev override applies only when `NODE_ENV=development`.
- CSV export remains the default to preserve existing UI behavior.
