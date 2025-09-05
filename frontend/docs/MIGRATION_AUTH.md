# Auth Migration Guide: Supabase → PostgreSQL Cookie Auth

This guide outlines the migration from a client-managed Supabase auth model to a backend-managed PostgreSQL authentication system using HttpOnly cookies, CSRF protection, refresh rotation, and server-side RBAC.

## Why Migrate
- Eliminate client-side token storage (no `localStorage` tokens)
- Use short-lived access tokens + rotating refresh tokens (family-based, reuse detection)
- Harden CSRF and cookie handling centrally in the backend
- Enforce RBAC server-side from Postgres roles

## High-Level Changes
- Tokens are issued and stored in HttpOnly cookies by the backend.
- CSRF is enforced on mutating auth endpoints via double-submit token.
- Refresh uses session “families” in Postgres (`auth_sessions`) with reuse detection and automatic revocation.
- Frontend fetches always use `credentials: 'include'`.
- Middleware validates via `/api/auth/me` and presence of `access_token` cookie.

---

## File Replacements (Before → After)

Frontend
- Old: `lib/supabase/server.ts`, `lib/supabase/client-secure.ts`
- New: `lib/auth/postgres-auth.ts` (cookie-mode client)

- Old: Client stored tokens in `localStorage` and attached `Authorization` headers
- New: Backend sets HttpOnly cookies; client sets `credentials: 'include'` and injects CSRF only

- Old: Supabase-based middleware
- New: `middleware.ts` checks `access_token` cookie and verifies via `/api/auth/me`

Backend
- New modules (all under `backend/services/auth/`):
  - `tokens.py`: HS256 mint/verify helpers
  - `cookies.py`: HttpOnly cookie helpers (`set_auth`, `clear_auth`)
  - `csrf.py`: double-submit token issue/validate/decorator
  - `sessions.py`: refresh rotation with families + reuse detection

- New endpoints (all under `backend/routes/auth_api.py`):
  - `GET /api/auth/csrf` — issue CSRF cookie + token
  - `POST /api/auth/login` — authenticate + set cookies
  - `POST /api/auth/refresh` — rotate + set cookies
  - `POST|GET /api/auth/logout` — revoke family + clear cookies (supports `returnTo`)
  - `GET /api/auth/me` — verify access cookie/authorization and return user info
  - `POST /api/auth/guest` — guest flow (shorter refresh TTL)

---

## Environment Variables

Required
- Frontend
  - `NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app`
  - (If using Google OAuth in frontend flows) `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (optional)
- Backend
  - `JWT_SECRET_KEY` (or `JWT_SECRET`)
  - `ACCESS_TTL_SECONDS` (default 900)
  - `REFRESH_TTL_SECONDS` (default 3888000)
  - `GUEST_REFRESH_TTL_SECONDS` (default 604800)
  - `REFRESH_PEPPER` (pepper for refresh hash)
  - `COOKIE_DOMAIN` (apex domain for cookies)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for OAuth)
  - `METRICS_ENABLED=true` (optional Prometheus endpoint)

Legacy (deprecated, safe to unset)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`

---

## Example Flows (Code + HTTP)

### 1) Login (Frontend)
```ts
// lib/auth/postgres-auth.ts (already implemented)
await postgresAuth.getCsrf(); // issues CSRF cookie and returns token
await postgresAuth.login({ email, password, recaptcha_token });
// Backend sets HttpOnly cookies; no client token storage
```

HTTP (Backend)
- `POST /api/auth/login`
  - Body: `{ email, password, recaptcha_token? }`
  - CSRF required in header `X-CSRF-Token`
  - Response: `{ user, tokens }` and cookies: `access_token`, `refresh_token`

### 2) Refresh (Frontend)
```ts
// lib/auth/postgres-auth.ts
await postgresAuth.getCsrf();
const { access_token } = await postgresAuth.refreshAccessToken();
```

HTTP (Backend)
- `POST /api/auth/refresh`
  - Body: `{}` (server reads refresh cookie)
  - CSRF required
  - Rotation: revokes old session, creates new one; family reuse → revoke

### 3) Logout (Frontend)
```ts
// app/api/auth/signout/route.ts
// Redirect browser to backend logout to clear cookies on backend domain
return NextResponse.redirect(
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout?returnTo=/`,
  302
);
```

HTTP (Backend)
- `POST|GET /api/auth/logout?returnTo=/`
  - Revokes session family if possible; clears auth cookies; redirects if provided

### 4) Middleware
```ts
// middleware.ts
const cookie = request.cookies.get('access_token');
if (!cookie) return redirect('/auth/signin');
const verify = await fetch(`${backendUrl}/api/auth/me`, {
  credentials: 'include',
  headers: { Authorization: `Bearer ${cookie.value}` },
});
if (!verify.ok) return redirect('/auth/signin');
```

---

## Server-Side RBAC
- `utils/rbac.py`: role hierarchy + decorators
- Middleware protects admin routes client-side; server-side RBAC enforces on API routes
- Typical checks:
  - `@require_auth`
  - `@require_role_level(10)` // admin

---

## Operational Notes
- Session Families: Stored in `auth_sessions` with `refresh_token_hash`, `family_id`, `rotated_from`, `revoked_at`
- Cleanup: Opportunistic cleanup on auth flows; consider a cron for expired session pruning
- Metrics: `/metrics` endpoint (if `METRICS_ENABLED=true`)
  - `auth_logins_total{result,method}`
  - `auth_refresh_total{result}`
  - `auth_refresh_latency_seconds`
  - `auth_guest_total{event}`
  - `auth_logout_total{result}`, `auth_oauth_total{step,result}`

---

## Migration Checklist
- [ ] Remove client token storage (localStorage/sessionStorage)
- [ ] Convert all fetch calls to `credentials: 'include'`
- [ ] Add CSRF calls for mutating requests to auth endpoints
- [ ] Update env vars on frontend/backend
- [ ] Update middleware to rely on cookies + `/api/auth/me`
- [ ] Disable legacy cookie checks: `NEXT_PUBLIC_LEGACY_AUTH_ENABLED=false`
- [ ] Remove legacy auth codepaths/scripts as they become unused

---

## References
- Backend: `backend/routes/auth_api.py`, `backend/services/auth/*`
- Frontend: `frontend/lib/auth/postgres-auth.ts`, `frontend/middleware.ts`
- Migration PRs: RBAC + rotation + metrics integrations
