# Frontend Docs Changelog

Date: 2025-08-27

- Security/Middleware: Admin RBAC gate now fails closed on lookup errors or missing role. In development, you can temporarily allow fail-open by setting `ADMIN_RBAC_FAIL_OPEN=true`. Also fixed RBAC filter to use `expires_at.is.null,expires_at.gt.{nowISO}`.
- Admin API: `/api/admin/audit` POST now supports `{"format":"json"}` to return JSON; default remains CSV. Invalid `format` returns 400.
- Admin API: `/api/admin/restaurants` GET no longer performs explicit `prisma.$connect()`/`$disconnect()` to avoid serverless connection churn; relies on Prisma singleton.
- Admin Database Pages: Fixed `searchParams` type to non-Promise and removed unnecessary `await` in page components.

Notes:
- Dev override applies only when `NODE_ENV=development`.
- CSV export remains the default to preserve existing UI behavior.

