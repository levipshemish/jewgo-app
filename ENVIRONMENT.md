# Environment Variables

This guide consolidates the active environment variables, where to define them, and key conventions. Do not publish real values anywhere in the repository or documentation.

## Sources of Truth
- Backend: define real values in the root `.env` (not committed) or your hosting provider’s secrets manager.
- Frontend: define real values in `frontend/.env.local` (not committed) or your hosting provider’s environment settings.
- Examples: use example templates only for keys and placeholders (e.g., `frontend/.env.example`).

## Frontend (.env.local)
See `frontend/.env.example` for the authoritative list. Common keys:
- NEXT_PUBLIC_URL: Base site URL (e.g., http://localhost:3000)
- NEXT_PUBLIC_APP_HOSTNAME: Hostname only (e.g., localhost)
- NEXT_PUBLIC_SUPABASE_URL: https://<PROJECT_ID>.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY: <YOUR_SUPABASE_ANON_KEY>
- SUPABASE_SERVICE_ROLE_KEY: <YOUR_SUPABASE_SERVICE_ROLE_KEY> (server only)
- NEXTAUTH_SECRET: <YOUR_NEXTAUTH_SECRET>
- NEXTAUTH_URL: https://<YOUR_VERCEL_APP>.vercel.app
- NEXT_PUBLIC_TURNSTILE_SITE_KEY: <YOUR_TURNSTILE_SITE_KEY>
- TURNSTILE_SECRET_KEY: <YOUR_TURNSTILE_SECRET_KEY>
- NEXT_PUBLIC_GA_MEASUREMENT_ID: <YOUR_GA_ID> (optional)
- SENTRY_DSN: <YOUR_SENTRY_DSN> (optional)
- UPSTASH_REDIS_REST_URL: https://<YOUR_UPSTASH_URL> (optional)
- UPSTASH_REDIS_REST_TOKEN: <YOUR_UPSTASH_TOKEN> (optional)

## Backend (.env)
Common keys (adjust to your deployment):
- DATABASE_URL: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB>
- ADMIN_TOKEN: <YOUR_ADMIN_TOKEN>
- SCRAPER_TOKEN: <YOUR_SCRAPER_TOKEN> (optional)
- SENTRY_DSN: <YOUR_SENTRY_DSN> (optional)
- GOOGLE_PLACES_API_KEY: <YOUR_GOOGLE_PLACES_API_KEY> (optional)
- CORS_ORIGINS: https://<YOUR_FRONTEND_DOMAIN>
- LOG_LEVEL: INFO

## Conventions
- Never commit real secrets. Use placeholders in docs and comments only.
- Prefer provider-managed secrets in production (Vercel/Render/GitHub).
- Keep `.env` and `.env.local` out of version control.
- Validate env consistency via `npm run env:check` (root) and frontend validation scripts as applicable.

Last updated: 2025-08-25

