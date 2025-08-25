# Supabase Environment Variables Fix Guide

## Issue Description

The build is failing with the following error:

```
TypeError: Invalid URL
input: 'NEXT_PUBLIC_SUPABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres/'
```

## Root Cause

The `NEXT_PUBLIC_SUPABASE_URL` environment variable is incorrectly set to a **database connection string** instead of the **Supabase project URL**.

### What's Wrong

- **Current (Incorrect)**: `postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres/`
- **Should Be**: `https://<PROJECT_ID>.supabase.co`

## The Problem

The `NEXT_PUBLIC_SUPABASE_URL` is being used by the Supabase client to connect to the Supabase API, not the database directly. When it's set to a database connection string, the Supabase client tries to create a URL object from it, which fails because it's not a valid HTTP/HTTPS URL.

## Solution

### Step 1: Fix Vercel Environment Variables

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `jewgo-app`
3. Go to **Settings** > **Environment Variables**
4. Find `NEXT_PUBLIC_SUPABASE_URL` and update it to your project URL:
   ```
   https://<PROJECT_ID>.supabase.co
   ```
5. Make sure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to your anon key:
   ```
   <YOUR_SUPABASE_ANON_KEY>
   ```

### Step 2: Alternative - Use Vercel CLI

If you prefer using the command line:

```bash
# Set the correct Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://<PROJECT_ID>.supabase.co

# Set the correct Supabase anon key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: <YOUR_SUPABASE_ANON_KEY>
```

### Step 3: Redeploy

After fixing the environment variables, redeploy your project:

```bash
vercel --prod
```

## Environment Variables Reference

### Correct Configuration (Placeholders Only)

```bash
# Supabase Configuration (for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>

# Database Configuration (for backend/database operations)
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres
```

### What Each Variable Is For

| Variable | Purpose | Used By |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for API calls | Frontend Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for Supabase API | Frontend Supabase client |
| `DATABASE_URL` | Direct database connection | Prisma, backend services |

## Prevention Measures

> Environment variable values must never be published in documentation. Use `.env` (root) and `.env.local` (frontend) to define real values locally or via your deployment provider’s secrets manager.

### 1. Environment Validation

We've added validation scripts that will catch this issue during build:

- `scripts/validate-supabase-env.js` - Validates Supabase environment variables
- Updated Supabase client files with validation logic

### 2. Build Process Validation

The build process now includes validation:

```json
{
  "scripts": {
    "validate-env": "node scripts/validate-env.js && node scripts/validate-supabase-env.js"
  }
}
```

### 3. Client-Side Validation

All Supabase client files now include validation:

- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

## Testing the Fix

### 1. Local Testing

```bash
cd frontend
npm run validate-env
```

### 2. Build Testing

```bash
cd frontend
npm run build
```

### 3. Deployment Testing

After fixing the environment variables, the build should succeed and the Supabase authentication pages should work correctly.

## Common Mistakes to Avoid

1. **Don't use DATABASE_URL for NEXT_PUBLIC_SUPABASE_URL**
2. **Don't use the service role key for NEXT_PUBLIC_SUPABASE_ANON_KEY**
3. **Don't include database credentials in frontend environment variables**
4. **Don't use localhost URLs in production environment variables**

## Troubleshooting

### If the issue persists:

1. Check all environment variables in Vercel dashboard
2. Ensure no conflicting environment variables are set
3. Clear Vercel cache and redeploy
4. Check for any `.env` files that might be overriding the settings

### Validation Commands

```bash
# Check environment variables
npm run validate-env

# Check Supabase configuration specifically
node scripts/validate-supabase-env.js

# Test Supabase connection
npm run supabase:test
```

## Related Files

- `frontend/lib/supabase/client.ts` - Browser client with validation
- `frontend/lib/supabase/server.ts` - Server client with validation
- `frontend/lib/supabase/middleware.ts` - Middleware client with validation
- `frontend/scripts/validate-supabase-env.js` - Environment validation script
- `scripts/fix-vercel-env.js` - Vercel environment fix script

## Support

If you continue to have issues after following this guide, check:

1. Vercel environment variables are correctly set
2. No conflicting environment variables exist
3. The Supabase project is active and accessible
4. The anon key is valid and has the correct permissions
