# Admin Dashboard & Store Support Schema — Migration Notes

Date: 2025-09-02

Scope: Create tables needed to fully enable admin dashboards and store-admin metrics.

## Summary

Adds the following Postgres tables (app DB):
- `admin_roles` — user→role assignments for RBAC.
- `admin_config` — small key/value store for admin UI/config.
- `audit_logs` — action audit trail for admin operations.
- `marketplace_orders` — basic order aggregates for store metrics.
- `marketplace_messages` — inbox counts for store metrics.
- `vendor_admins` — mapping of vendors to admin users (scoping).

File: `backend/database/migrations/create_admin_and_store_support_tables.py`

## Rationale

- Global Admin Metrics require reliable counts and future drill-downs (roles, audits).
- Store Admin Dashboard needs product/order/message aggregates and vendor scoping.
- Tables align with `frontend/prisma/schema.prisma` to keep types and queries consistent.

## Backward Compatibility (G-DB-3)

- Additive only; no changes to existing tables.
- Existing features continue to work without relying on these new tables until wired in.

## Rollback (G-DB-2)

Run the migration `downgrade()` which drops the six created tables and indexes:
- Drop `vendor_admins`, `marketplace_messages`, `marketplace_orders`, `audit_logs`, `admin_config`, `admin_roles`.

## Supabase (Auth) Side

For live user metrics and vendor scoping via Supabase:

- Create a secure RPC for admin metrics:
  - `public.rpc_admin_dashboard_metrics()` that returns `total_users` from `auth.users`, plus optional 7-day signup counts. Restrict execution to admin roles via RLS.

- Optional helper RPC:
  - `public.rpc_vendor_admins_for_user(uid uuid)` returning vendor IDs assigned to the caller, if you manage vendors in Supabase.

Note: Keep RLS enabled and use `SECURITY DEFINER` cautiously with explicit checks.

## Next Steps

- Wire `frontend/app/api/admin/dashboard/metrics/route.ts` to real queries:
  - totalUsers → Supabase RPC (`rpc_admin_dashboard_metrics`).
  - restaurants/reviews/pending → app DB counts.
- Wire `frontend/app/api/admin/store/metrics/route.ts` to new tables for orders/messages and `vendor_admins` for scoping.

