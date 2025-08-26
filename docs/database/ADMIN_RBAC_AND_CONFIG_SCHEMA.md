# Admin RBAC and Config Schema

This document describes the database schema for Admin RBAC and System Config, how RBAC is resolved, and how to run migrations and seeds.

## Tables

### admin_roles (RBAC)

- Purpose: Assigns elevated roles to users.
- Columns:
  - `id` SERIAL PRIMARY KEY
  - `user_id` VARCHAR(50) REFERENCES public.users(id) ON DELETE CASCADE
  - `role` VARCHAR(50) IN ('moderator','data_admin','system_admin','super_admin')
  - `assigned_by` VARCHAR(50)
  - `assigned_at` TIMESTAMP(6) DEFAULT NOW()
  - `expires_at` TIMESTAMP(6) NULL
  - `is_active` BOOLEAN DEFAULT TRUE
  - `notes` TEXT NULL
- Indexes:
  - `idx_admin_roles_user` on `user_id`
- Migration: `frontend/prisma/migrations/20250826_add_admin_roles/migration.sql`

### admin_config (Key/Value Config)

- Purpose: Persist system configuration in the DB.
- Columns:
  - `key` VARCHAR(100) PRIMARY KEY
  - `value` JSONB NOT NULL
  - `updated_at` TIMESTAMP(6)
  - `updated_by` VARCHAR(50)
- Migration: `frontend/prisma/migrations/20250826_add_admin_config/migration.sql`

## RBAC Resolution

`requireAdmin(request)` resolves the admin role and permissions with the following precedence:

1. If `users.issuperadmin` is true → `super_admin` (full permissions).
2. Else read `admin_roles` for `user_id` where `is_active = true` and `expires_at IS NULL OR expires_at > NOW()`.
   - If multiple roles exist, the highest precedence wins: super_admin > system_admin > data_admin > moderator.
3. Else attempt `SELECT get_user_admin_role(userId)` if the function exists.
4. If the function is missing and `ADMIN_RBAC_FAIL_CLOSED=true`, deny access; otherwise default to `moderator`.

Permissions are granted via `ROLE_PERMISSIONS` in `frontend/lib/admin/types.ts`.

## Config CRUD

- GET `/api/admin/system/config` merges defaults with DB values in `admin_config`.
- PUT `/api/admin/system/config` upserts allowed keys:
  - `maintenanceMode, debugMode, emailNotifications, auditLogging, rateLimiting, backupFrequency, sessionTimeout, maxFileSize`
  - Requires super_admin + CSRF.

## Migrations and Seed

### Supabase Migrations

The admin RBAC and config system uses Supabase for consistency with the authentication system.

**Apply Supabase migrations:**
```bash
# Apply all migrations
supabase db push

# Or apply specific migrations
supabase db push --include-all
```

**Migration files:**
- `supabase/migrations/20250101000006_create_admin_roles_table.sql` - Admin roles table with RLS
- `supabase/migrations/20250101000007_create_admin_config_table.sql` - Admin config table with RLS

### Seed Super Admin

Seed a super admin role for an existing user:

```bash
cd frontend && ADMIN_SEED_SUPERADMIN_EMAIL="admin@example.com" npm run db:seed
```

**Requirements:**
- User must exist in Supabase `auth.users` table
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set
- File: `frontend/prisma/seed.ts` (uses Supabase client)

### Legacy Prisma Migrations (Deprecated)

The previous Prisma-based admin system has been migrated to Supabase. The old migrations are kept for reference:

- `frontend/prisma/migrations/20250826_add_admin_roles/migration.sql`
- `frontend/prisma/migrations/20250826_add_admin_config/migration.sql`

## Health Checks and Diagnostics

- `/api/admin/system/stats` prints DB/table metrics and a healthStatus object with `database`, and, if configured, `supabaseConfigured`, `redisConfigured`, and a `network` probe result.
- Optional: set `HEALTHCHECK_NETWORK_PROBE_URL` to enable a HEAD network probe.

## CSRF and Middleware Notes

- Admin CSRF uses a signed token exposed via `window.__CSRF_TOKEN__`; send `x-csrf-token` on mutating endpoints.
- Middleware no longer enforces RBAC via `app_metadata`; server routes handle RBAC via DB lookups.

