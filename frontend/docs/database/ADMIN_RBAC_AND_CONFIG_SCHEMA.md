# Admin RBAC and Config Schema

This app’s admin features expect the following database objects to exist in your Postgres instance. Ensure these are present before deploying RBAC‑gated admin routes.

## 1) Function: get_user_admin_role

The server looks up a user’s role via an RPC named `get_user_admin_role(user_id_param uuid)`.

Recommended implementation:

```sql
create or replace function public.get_user_admin_role(user_id_param uuid)
returns text
language sql
security definer
set search_path = public
as $$
  with roles as (
    select r.role
    from admin_roles r
    where r.user_id = user_id_param
      and r.is_active = true
      and (r.expires_at is null or r.expires_at > now())
  )
  select coalesce(
    (select 'super_admin'::text from users u where u.id = user_id_param and u.issuperadmin = true),
    (select role from roles order by 
      case role when 'super_admin' then 4 when 'system_admin' then 3 when 'data_admin' then 2 when 'moderator' then 1 else 0 end
    desc limit 1),
    'moderator'
  );
$$;
```

Grant execute to your API role:

```sql
grant execute on function public.get_user_admin_role(uuid) to authenticated, anon;
```

Note: The application also contains a fallback that queries `users` and `admin_roles` directly if the function is absent, but you should create the function for best performance and security.

## 2) Tables: admin_roles and admin_config

The Prisma schema models these tables as:

- `admin_roles` (RBAC assignments)
  - `id serial primary key`
  - `user_id uuid references users(id)`
  - `role text` one of: `moderator | data_admin | system_admin | super_admin`
  - `assigned_by text` (optional)
  - `assigned_at timestamp with time zone default now()`
  - `expires_at timestamp with time zone` (nullable)
  - `is_active boolean default true`
  - `notes text` (optional)

- `admin_config` (simple key/value JSON config)
  - `key text primary key`
  - `value jsonb not null`
  - `updated_at timestamp with time zone`
  - `updated_by text`

Create statements (adjust types/domains to your environment):

```sql
create table if not exists public.admin_roles (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  assigned_by text,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  notes text
);

create index if not exists idx_admin_roles_user on public.admin_roles(user_id);

create table if not exists public.admin_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz,
  updated_by text
);
```

## 3) Row Level Security (RLS)

If RLS is enabled on these tables, ensure your server role used by Next.js API routes is allowed to read/write as needed. A simple approach during development is to disable RLS or grant permissive policies to the service role.

Example (adjust roles accordingly):

```sql
alter table public.admin_roles enable row level security;
create policy admin_roles_rw for authenticated using (true) with check (true);

alter table public.admin_config enable row level security;
create policy admin_config_rw for authenticated using (true) with check (true);
```

In production, prefer tighter policies limited to a dedicated service role, and avoid granting write permissions to anon/authenticated.

## 4) Prisma Schema Reference

See `frontend/prisma/schema.prisma` for the canonical model shapes used by the application.
