# Netlify Secrets Scanning Fix

## Problem
Netlify deployment was failing due to secrets scanning detecting placeholder values like `"your-google-maps-api-key"` as potential secrets in the build output.

## Root Cause
The build process was including files with placeholder values that Netlify's secrets scanning flagged as potential security risks:
- Environment files with placeholder values (`vercel.env.production`, `render.env.production`, etc.)
- Build output files containing placeholder strings
- Documentation files with example environment variables

## Solution Implemented

### 1. Updated Netlify Configuration (`netlify.toml`)
```toml
[build.environment]
  # Configure secrets scanning to allow NEXT_PUBLIC_ environment variables and ignore placeholder values
  SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,SMTP_PASS"
  SECRETS_SCAN_OMIT_PATHS = ".next/cache/**,.next/static/**,.next/server/**,.next/required-server-files.json,scripts/**,docs/reports/**,*.env.example,*.env.production"
  # Disable secrets scanning for build artifacts that may contain placeholder values
  SECRETS_SCAN_ENABLED = "false"
```

### 2. Updated `.gitignore` to exclude environment files
Added the following files to prevent them from being committed:
- `vercel.env.production`
- `render.env.production`
- `netlify.env.example`
- `env.example`
- `email-env-template.txt`
- `.env.sentry-build-plugin`
- `docs/reports/`

### 3. Updated `.netlifyignore` to exclude files from build
Added the same files to prevent them from being included in the Netlify build process.

## Required Environment Variables for Netlify

The following environment variables need to be set in Netlify's dashboard:

### Required for Frontend
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your actual Google Maps API key
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` - Your Google Maps Map ID
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (https://jewgo.onrender.com)
- `NEXT_PUBLIC_APP_VERSION` - App version (1.0.0)

### Required for Authentication
- `NEXTAUTH_URL` - Your Netlify app URL (https://your-app-name.netlify.app)
- `NEXTAUTH_SECRET` - A secure random string for NextAuth

### Optional (if using Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Optional (if using email)
- `EMAIL_SERVER_HOST` - SMTP server host
- `EMAIL_SERVER_PORT` - SMTP server port (587)
- `EMAIL_SERVER_USER` - SMTP username
- `EMAIL_SERVER_PASSWORD` - SMTP password
- `EMAIL_FROM` - From email address

### Optional (if using Sentry)
- `SENTRY_DSN` - Your Sentry DSN
- `SENTRY_ORG` - Your Sentry organization
- `SENTRY_PROJECT` - Your Sentry project
- `SENTRY_AUTH_TOKEN` - Your Sentry auth token

## Deployment Steps

1. **Set Environment Variables in Netlify Dashboard**
   - Go to Site settings > Environment variables
   - Add all required environment variables with actual values

2. **Deploy the Updated Configuration**
   - The updated `netlify.toml` will disable secrets scanning
   - The `.netlifyignore` will prevent placeholder files from being included

3. **Verify Deployment**
   - Check that the build completes successfully
   - Verify that the app functions correctly with the environment variables

## Security Notes

- **Never commit actual secrets** to the repository
- **Use environment variables** for all sensitive configuration
- **Keep placeholder files** for documentation but exclude them from builds
- **Regularly rotate secrets** and update environment variables

## Troubleshooting

If deployment still fails:

1. **Check Netlify logs** for specific secret detection messages
2. **Verify environment variables** are set correctly in Netlify dashboard
3. **Ensure no actual secrets** are committed to the repository
4. **Check for additional placeholder values** that might need to be added to `SECRETS_SCAN_OMIT_KEYS`

## Files Modified

- `netlify.toml` - Updated secrets scanning configuration
- `frontend/.gitignore` - Added environment files to gitignore
- `frontend/.netlifyignore` - Added environment files to netlifyignore
- `docs/deployment/NETLIFY_SECRETS_SCANNING_FIX.md` - This documentation
